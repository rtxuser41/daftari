-- ==========================================
-- SAAS ARCHITECTURE: DATABASE SCHEMA & RLS
-- ==========================================

-- Enable the UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TEACHERS TABLE (The main user account)
CREATE TABLE IF NOT EXISTS teachers (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    sex VARCHAR(10) NOT NULL CHECK (sex IN ('male', 'female')),
    subject VARCHAR(255) NOT NULL,
    phone_number VARCHAR(50) UNIQUE NOT NULL,
    is_pro BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. CLASSROOMS
CREATE TABLE IF NOT EXISTS classrooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    capacity INTEGER NOT NULL DEFAULT 30,
    monthly_rent DECIMAL(10, 2) DEFAULT 0,
    address TEXT,
    notes TEXT,
    color VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. GROUPS
CREATE TABLE IF NOT EXISTS groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    classroom_id UUID REFERENCES classrooms(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    level VARCHAR(255),
    educational_level VARCHAR(255),
    study_stream VARCHAR(255),
    color VARCHAR(50),
    capacity INTEGER,
    sessions_per_month INTEGER NOT NULL DEFAULT 4,
    price DECIMAL(10, 2) NOT NULL,
    timings JSONB DEFAULT '[]'::jsonb,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add missing columns to groups if they exist from an older schema
ALTER TABLE groups ADD COLUMN IF NOT EXISTS classroom_id UUID REFERENCES classrooms(id) ON DELETE SET NULL;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS level VARCHAR(255);
ALTER TABLE groups ADD COLUMN IF NOT EXISTS educational_level VARCHAR(255);
ALTER TABLE groups ADD COLUMN IF NOT EXISTS study_stream VARCHAR(255);
ALTER TABLE groups ADD COLUMN IF NOT EXISTS color VARCHAR(50);
ALTER TABLE groups ADD COLUMN IF NOT EXISTS capacity INTEGER;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 4. STUDENTS
CREATE TABLE IF NOT EXISTS students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(50),
    parent_phone VARCHAR(50),
    notes TEXT,
    custom_price DECIMAL(10, 2),
    joining_date TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add missing columns to students
ALTER TABLE students ADD COLUMN IF NOT EXISTS parent_phone VARCHAR(50);
ALTER TABLE students ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS custom_price DECIMAL(10, 2);
ALTER TABLE students ADD COLUMN IF NOT EXISTS joining_date TIMESTAMPTZ;
ALTER TABLE students ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE students ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 5. SESSIONS
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    date TIMESTAMPTZ NOT NULL,
    notes TEXT,
    confirmed_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. ATTENDANCE
CREATE TABLE IF NOT EXISTS attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL CHECK (status IN ('present', 'absent', 'excused')),
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(session_id, student_id)
);

ALTER TABLE attendance ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- 7. PAYMENTS
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    payment_cycle_sessions INTEGER NOT NULL,
    paid_at TIMESTAMPTZ NOT NULL,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. EXPENSES
CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    date TIMESTAMPTZ NOT NULL,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Teachers can only read and update their own profile
DROP POLICY IF EXISTS "Teachers can view own profile" ON teachers;
CREATE POLICY "Teachers can view own profile" ON teachers FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Teachers can update own profile" ON teachers;
CREATE POLICY "Teachers can update own profile" ON teachers FOR UPDATE USING (auth.uid() = id);

-- Prevent users from updating is_pro themselves
CREATE OR REPLACE FUNCTION public.prevent_is_pro_update()
RETURNS trigger AS $$
BEGIN
  IF current_setting('role') = 'authenticated' AND NEW.is_pro IS DISTINCT FROM OLD.is_pro THEN
    NEW.is_pro = OLD.is_pro;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_teacher_is_pro_update ON teachers;
CREATE TRIGGER on_teacher_is_pro_update
  BEFORE UPDATE ON teachers
  FOR EACH ROW EXECUTE PROCEDURE public.prevent_is_pro_update();

DROP POLICY IF EXISTS "Teachers can insert own profile" ON teachers;
CREATE POLICY "Teachers can insert own profile" ON teachers FOR INSERT WITH CHECK (auth.uid() = id);

-- Unified Tenant Isolation Policy: Teachers own all their child records
DROP POLICY IF EXISTS "Tenant isolation for classrooms" ON classrooms;
CREATE POLICY "Tenant isolation for classrooms" ON classrooms FOR ALL USING (auth.uid() = teacher_id);

DROP POLICY IF EXISTS "Tenant isolation for groups" ON groups;
CREATE POLICY "Tenant isolation for groups" ON groups FOR ALL USING (auth.uid() = teacher_id);

DROP POLICY IF EXISTS "Tenant isolation for students" ON students;
CREATE POLICY "Tenant isolation for students" ON students FOR ALL USING (auth.uid() = teacher_id);

DROP POLICY IF EXISTS "Tenant isolation for sessions" ON sessions;
CREATE POLICY "Tenant isolation for sessions" ON sessions FOR ALL USING (auth.uid() = teacher_id);

DROP POLICY IF EXISTS "Tenant isolation for attendance" ON attendance;
CREATE POLICY "Tenant isolation for attendance" ON attendance FOR ALL USING (auth.uid() = teacher_id);

DROP POLICY IF EXISTS "Tenant isolation for payments" ON payments;
CREATE POLICY "Tenant isolation for payments" ON payments FOR ALL USING (auth.uid() = teacher_id);

DROP POLICY IF EXISTS "Tenant isolation for expenses" ON expenses;
CREATE POLICY "Tenant isolation for expenses" ON expenses FOR ALL USING (auth.uid() = teacher_id);

-- Create a secure trigger to handle user profile creation upon signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.teachers (id, full_name, sex, subject, phone_number)
  VALUES (
    new.id, 
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'sex',
    new.raw_user_meta_data->>'subject',
    new.raw_user_meta_data->>'phone_number'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- 9. ACTIVATION KEYS
CREATE TABLE IF NOT EXISTS activation_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(16) UNIQUE NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    used_by UUID REFERENCES teachers(id) ON DELETE SET NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. SETTINGS
CREATE TABLE IF NOT EXISTS settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE UNIQUE,
    theme VARCHAR(20) DEFAULT 'light',
    language VARCHAR(10) DEFAULT 'ar',
    currency VARCHAR(10) DEFAULT 'DZD',
    default_payment_cycle INTEGER DEFAULT 4,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. STUDENT DEBT SUMMARY VIEW
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
JOIN groups g ON s.group_id = g.id;

ALTER TABLE activation_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant isolation for settings" ON settings;
CREATE POLICY "Tenant isolation for settings" ON settings FOR ALL USING (auth.uid() = teacher_id);

DROP POLICY IF EXISTS "Tenant isolation for notifications" ON notifications;
CREATE POLICY "Tenant isolation for notifications" ON notifications FOR ALL USING (auth.uid() = teacher_id);

-- Activation RPC
CREATE OR REPLACE FUNCTION claim_activation_key(key_input TEXT)
RETURNS void AS $$
DECLARE
  v_teacher_id UUID;
BEGIN
  v_teacher_id := auth.uid();
  IF v_teacher_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE activation_keys 
  SET is_used = TRUE, used_by = v_teacher_id, used_at = NOW() 
  WHERE key = key_input AND is_used = FALSE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or already used activation key';
  END IF;

  UPDATE teachers SET is_pro = TRUE WHERE id = v_teacher_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Allow reading keys for validation
-- Polices removed to prevent enumeration. Access is now via RPC claim_activation_key.

-- Seed initial premium keys (16 alphanumeric characters each)
INSERT INTO activation_keys (key) VALUES
('X7K9M2P4V8N5C1L3'),
('A4B9D2E8F1G7H3J6'),
('R2T5Y8U1I4O7P9A3'),
('Q1W8E5R2T9Y4U7I3')
ON CONFLICT (key) DO NOTHING;

-- ==========================================
-- SAAS LIMITS (PRO GUARD)
-- ==========================================
-- نموذج الفريميوم: مجموعة واحدة مجاناً (بعدد تلاميذ غير محدود داخلها).
-- الترقية إلى Pro (مجموعات غير محدودة) تتم عبر مفتاح تفعيل (claim_activation_key).
CREATE OR REPLACE FUNCTION public.check_free_tier_limits()
RETURNS trigger AS $$
DECLARE
  v_is_pro boolean;
  v_count integer;
BEGIN
  SELECT is_pro INTO v_is_pro FROM public.teachers WHERE id = NEW.teacher_id;

  IF v_is_pro = true THEN
    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'groups' THEN
    SELECT count(*) INTO v_count FROM public.groups WHERE teacher_id = NEW.teacher_id AND deleted_at IS NULL;
    IF v_count >= 1 THEN
      RAISE EXCEPTION 'لقد وصلت للحد الأقصى للمجموعات (1) في الخطة المجانية. قم بترقية حسابك للمتابعة.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS enforce_group_limit ON groups;
CREATE TRIGGER enforce_group_limit
  BEFORE INSERT ON groups
  FOR EACH ROW EXECUTE PROCEDURE public.check_free_tier_limits();

DROP TRIGGER IF EXISTS enforce_student_limit ON students;


-- ==========================================
-- SECURITY HARDENING (see migrations/001_security_hardening.sql)
-- ==========================================
-- The authoritative hardening changes live in the idempotent migration file.
-- The block below keeps supabase-schema.sql self-contained so that running it
-- fresh reproduces the same hardened state as the migration.

-- 9b. SECURITY AUDIT LOG TABLE
CREATE TABLE IF NOT EXISTS security_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    operation TEXT NOT NULL,
    actor_id UUID,
    target_id UUID,
    detail JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE security_audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Block all access to audit log" ON security_audit_log;

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

-- 9c. HARDENED ACTIVATION RPC (race-safe + audited)
CREATE OR REPLACE FUNCTION claim_activation_key(key_input TEXT)
RETURNS void AS $$
DECLARE
  v_teacher_id UUID;
  v_locked boolean;
  v_key_id UUID;
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

  -- Atomically lock and consume exactly one unused key.
  -- NOTE: PL/pgSQL parses the `FOR` of a cursor-style UPDATE ... FOR UPDATE as
  -- invalid syntax in some Postgres versions, so we lock with SELECT FOR UPDATE
  -- on the single candidate row instead (same serialization guarantee).
  SELECT id INTO v_key_id
  FROM activation_keys
  WHERE key = trim(lower(key_input)) AND is_used = FALSE
  FOR UPDATE
  LIMIT 1;

  IF v_key_id IS NULL THEN
    PERFORM public.insert_audit_log(
      'key_claim_failed',
      v_teacher_id,
      NULL,
      jsonb_build_object('reason', 'not_found_or_used')
    );
    RAISE EXCEPTION 'مفتاح التفعيل غير صالح أو تم استخدامه مسبقاً';
  END IF;

  UPDATE activation_keys
  SET is_used = TRUE,
      used_by = v_teacher_id,
      used_at = NOW()
  WHERE id = v_key_id;

  UPDATE teachers SET is_pro = TRUE WHERE id = v_teacher_id;

  PERFORM public.insert_audit_log(
    'key_claimed',
    v_teacher_id,
    v_key_id,
    jsonb_build_object('teacher_id', v_teacher_id)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9d. ADMIN: GENERATE ACTIVATION KEYS (owner/service_role only)
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

-- 9e. HARDENED FREE-TIER LIMIT CHECK (race-safe via per-teacher advisory lock)
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

DROP TRIGGER IF EXISTS enforce_group_limit ON groups;
CREATE TRIGGER enforce_group_limit
  BEFORE INSERT ON groups
  FOR EACH ROW EXECUTE PROCEDURE public.check_free_tier_limits();

-- 12b. DEBT VIEW: exclude soft-deleted students
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
