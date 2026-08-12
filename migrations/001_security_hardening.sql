-- ==========================================
-- MIGRATION 001: SECURITY & FREEMIUM HARDENING
-- ==========================================
-- This migration is idempotent and safe to re-run.
-- It adds:
--  1. Race-condition protection for free-tier limit checks and key claims
--  2. A security audit log for sensitive operations (is_pro changes, key usage)
--  3. An admin helper to generate activation keys (owner/service_role only)
--  4. A fix for the student debt view to exclude soft-deleted students
--
-- Run in the Supabase SQL Editor (or with psql using the service role).

-- -----------------------------------------------
-- 1. SECURITY AUDIT LOG TABLE
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS security_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    operation TEXT NOT NULL,            -- e.g. 'key_claimed', 'is_pro_changed', 'key_generated'
    actor_id UUID,                      -- teacher id of the acting user (null for admin ops)
    target_id UUID,                     -- the key or teacher affected (nullable)
    detail JSONB,                       -- extra context (ip-ish info, count, etc.)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE security_audit_log ENABLE ROW LEVEL SECURITY;

-- Ordinary authenticated users can NEVER read or write the audit log.
-- Management is exclusively through SECURITY DEFINER functions owned by
-- the migration owner / service_role, which bypass RLS by design.
DROP POLICY IF EXISTS "Block all access to audit log" ON security_audit_log;

-- -----------------------------------------------
-- 2. AUDIT HELPER (SECURITY DEFINER)
-- -----------------------------------------------
CREATE OR REPLACE FUNCTION public.insert_audit_log(
    p_operation TEXT,
    p_actor_id UUID DEFAULT NULL,
    p_target_id UUID DEFAULT NULL,
    p_detail JSONB DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  INSERT INTO public.security_audit_log (operation, actor_id, target_id, detail)
  VALUES (p_operation, p_actor_id, p_target_id, p_detail);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -----------------------------------------------
-- 3. HARDEN claim_activation_key AGAINST RACES
-- -----------------------------------------------
-- A malicious client could race two simultaneous claim requests against the
-- same unused key. The advisory lock serialises claims on the key's hash so
-- that only one transaction wins. The is_used flag is also re-checked while
-- the row is locked (FOR UPDATE), guaranteeing a key is consumed exactly once.
-- Each successful claim is recorded in the audit log.
CREATE OR REPLACE FUNCTION claim_activation_key(key_input TEXT)
RETURNS void AS $$
DECLARE
  v_teacher_id UUID;
  v_locked boolean;
BEGIN
  v_teacher_id := auth.uid();
  IF v_teacher_id IS NULL THEN
    RAISE EXCEPTION 'غير مسجل الدخول';
  END IF;

  -- Serialize all concurrent claims on this key
  v_locked := pg_try_advisory_xact_lock(hashtext('claim:' || trim(lower(key_input))));
  IF NOT v_locked THEN
    RAISE EXCEPTION 'يرجى إعادة المحاولة بعد لحظات';
  END IF;

  -- Atomically lock and consume exactly one unused key
  UPDATE activation_keys
  SET is_used = TRUE,
      used_by = v_teacher_id,
      used_at = NOW()
  WHERE key = trim(lower(key_input))
    AND is_used = FALSE
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'مفتاح التفعيل غير صالح أو تم استخدامه مسبقاً';
  END IF;

  UPDATE teachers SET is_pro = TRUE WHERE id = v_teacher_id;

  PERFORM public.insert_audit_log(
    'key_claimed',
    v_teacher_id,
    (SELECT id FROM activation_keys WHERE key = trim(lower(key_input)) AND used_by = v_teacher_id LIMIT 1),
    jsonb_build_object('teacher_id', v_teacher_id)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -----------------------------------------------
-- 4. HARDEN check_free_tier_limits AGAINST RACES
-- -----------------------------------------------
-- Concurrent INSERTs for the same teacher could both read the free-tier count
-- before either row was committed, letting a free teacher create >1 group.
-- We now take a per-teacher advisory lock (serialized within the transaction)
-- and re-count committed rows inside the lock before allowing the insert.
CREATE OR REPLACE FUNCTION public.check_free_tier_limits()
RETURNS trigger AS $$
DECLARE
  v_is_pro boolean;
  v_count integer;
BEGIN
  -- Serialize free-tier inserts for this teacher to eliminate the race
  PERFORM pg_advisory_xact_lock(hashtext('tier:' || NEW.teacher_id::text));

  SELECT is_pro INTO v_is_pro FROM public.teachers WHERE id = NEW.teacher_id FOR UPDATE;

  IF v_is_pro = true THEN
    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'groups' THEN
    SELECT count(*) INTO v_count
    FROM public.groups
    WHERE teacher_id = NEW.teacher_id AND deleted_at IS NULL;
    IF v_count >= 1 THEN
      RAISE EXCEPTION 'لقد وصلت للحد الأقصى للمجموعات (1) في الخطة المجانية. قم بترقية حسابك للمتابعة.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-attach triggers to use the hardened function (idempotent).
DROP TRIGGER IF EXISTS enforce_group_limit ON groups;
CREATE TRIGGER enforce_group_limit
  BEFORE INSERT ON groups
  FOR EACH ROW EXECUTE PROCEDURE public.check_free_tier_limits();

-- -----------------------------------------------
-- 5. AUDIT is_pro CHANGES
-- -----------------------------------------------
CREATE OR REPLACE FUNCTION public.audit_is_pro_change()
RETURNS trigger AS $$
BEGIN
  IF NEW.is_pro IS DISTINCT FROM OLD.is_pro THEN
    PERFORM public.insert_audit_log(
      'is_pro_changed',
      NEW.id,
      NULL,
      jsonb_build_object('old_value', OLD.is_pro, 'new_value', NEW.is_pro)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_teacher_is_pro_audit ON teachers;
CREATE TRIGGER on_teacher_is_pro_audit
  AFTER UPDATE ON teachers
  FOR EACH ROW EXECUTE PROCEDURE public.audit_is_pro_change();

-- -----------------------------------------------
-- 6. ADMIN: GENERATE ACTIVATION KEYS
-- -----------------------------------------------
-- Only callable by the database owner / service_role (never from the client).
-- Generates random 16-character uppercase alphanumeric keys, inserts them
-- atomically, audits the operation, and returns the generated keys.
CREATE OR REPLACE FUNCTION public.generate_activation_keys(
    n integer DEFAULT 1
)
RETURNS TEXT[] AS $$
DECLARE
  v_keys TEXT[] := '{}';
  v_candidate TEXT;
  i integer;
BEGIN
  -- Defense in depth: refuse invocation from ordinary authenticated users
  IF current_setting('role') = 'authenticated' THEN
    RAISE EXCEPTION 'هذه الدالة مخصصة للمسؤولين فقط';
  END IF;

  IF n < 1 OR n > 100 THEN
    RAISE EXCEPTION 'يجب أن يكون عدد المفاتيح بين 1 و 100';
  END IF;

  FOR i IN 1..n LOOP
    LOOP
      v_candidate := upper(array_to_string(ARRAY(
        SELECT chr((floor(random() * 36) + 48)::int + CASE WHEN (floor(random() * 36))::int < 10 THEN 0 ELSE 7 END)
        FROM generate_series(1, 16)
      ), ''));
      -- guarantee alphanumeric A-Z0-9 only
      IF v_candidate ~ '^[A-Z0-9]{16}$' THEN
        EXIT;
      END IF;
    END LOOP;
    INSERT INTO activation_keys (key) VALUES (v_candidate)
    ON CONFLICT (key) DO NOTHING
    RETURNING key INTO v_candidate;
    v_keys := array_append(v_keys, v_candidate);
  END LOOP;

  PERFORM public.insert_audit_log(
    'key_generated',
    NULL,
    NULL,
    jsonb_build_object('count', array_length(v_keys, 1))
  );

  RETURN v_keys;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -----------------------------------------------
-- 7. FIX DEBT VIEW: EXCLUDE SOFT-DELETED STUDENTS
-- -----------------------------------------------
CREATE OR REPLACE VIEW student_debt_summary AS
SELECT
    s.id as student_id,
    s.teacher_id,
    COALESCE(
        (SELECT COUNT(*) FROM attendance a
         WHERE a.student_id = s.id AND a.status = 'present' AND a.deleted_at IS NULL)
    , 0) as attended_sessions_count,
    COALESCE(
        (SELECT SUM(p.amount) FROM payments p
         WHERE p.student_id = s.id AND p.deleted_at IS NULL)
    , 0) as total_paid,
    COALESCE(
        (SELECT COUNT(*) FROM attendance a
         WHERE a.student_id = s.id AND a.status = 'present' AND a.deleted_at IS NULL)
        * COALESCE(s.custom_price, g.price)
        -
        COALESCE(
            (SELECT SUM(p.amount) FROM payments p
             WHERE p.student_id = s.id AND p.deleted_at IS NULL)
        , 0)
    , 0) as session_balance
FROM students s
JOIN groups g ON s.group_id = g.id
WHERE s.deleted_at IS NULL
  AND (s.is_deleted IS NULL OR s.is_deleted = FALSE);
