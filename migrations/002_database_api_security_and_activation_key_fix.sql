-- MIGRATION 002: DATABASE API SECURITY + ACTIVATION KEY CANONICALIZATION
--
-- Repair the externally exposed database API without changing application data.
-- The repository generates activation keys in uppercase, so claims must use the
-- same canonical form. This migration also closes public EXECUTE access to
-- trigger/admin helpers and makes the debt view respect caller RLS policies.

BEGIN;

CREATE OR REPLACE FUNCTION public.claim_activation_key(key_input TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_teacher_id UUID := auth.uid();
  v_locked BOOLEAN;
  v_key_id UUID;
  v_normalized_key TEXT := upper(btrim(key_input));
BEGIN
  IF v_teacher_id IS NULL THEN
    RAISE EXCEPTION 'غير مسجل الدخول';
  END IF;

  IF v_normalized_key !~ '^[A-Z0-9]{16}$' THEN
    RAISE EXCEPTION 'مفتاح التفعيل غير صالح أو تم استخدامه مسبقاً';
  END IF;

  v_locked := pg_try_advisory_xact_lock(hashtext('claim:' || v_normalized_key));
  IF NOT v_locked THEN
    RAISE EXCEPTION 'يرجى إعادة المحاولة بعد لحظات';
  END IF;

  SELECT id INTO v_key_id
  FROM public.activation_keys
  WHERE key = v_normalized_key
    AND is_used = FALSE
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

  UPDATE public.activation_keys
  SET is_used = TRUE,
      used_by = v_teacher_id,
      used_at = NOW()
  WHERE id = v_key_id;

  UPDATE public.teachers
  SET is_pro = TRUE
  WHERE id = v_teacher_id;

  PERFORM public.insert_audit_log(
    'key_claimed',
    v_teacher_id,
    v_key_id,
    jsonb_build_object('teacher_id', v_teacher_id)
  );
END;
$$;

ALTER FUNCTION public.audit_is_pro_change() SET search_path = pg_catalog, public, pg_temp;
ALTER FUNCTION public.check_free_tier_limits() SET search_path = pg_catalog, public, pg_temp;
ALTER FUNCTION public.generate_activation_keys(INTEGER) SET search_path = pg_catalog, public, pg_temp;
ALTER FUNCTION public.handle_new_user() SET search_path = pg_catalog, public, pg_temp;
ALTER FUNCTION public.insert_audit_log(TEXT, UUID, UUID, JSONB) SET search_path = pg_catalog, public, pg_temp;
ALTER FUNCTION public.prevent_is_pro_update() SET search_path = pg_catalog, public, pg_temp;

-- Trigger/admin helpers do not need a public RPC surface. Keep only the
-- authenticated activation claim callable by signed-in teachers.
REVOKE EXECUTE ON FUNCTION public.audit_is_pro_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_free_tier_limits() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_activation_keys(INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.insert_audit_log(TEXT, UUID, UUID, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_is_pro_update() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.claim_activation_key(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_activation_key(TEXT) TO authenticated;

-- Views are SECURITY DEFINER by default. This view contains student financial
-- data, so it must evaluate the caller's existing tenant RLS policies.
ALTER VIEW public.student_debt_summary SET (security_invoker = true);

COMMIT;
