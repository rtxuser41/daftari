-- Non-destructive access hardening for existing Daftari installations.
-- Do not apply this automatically to production; review and run through the project's migration process.

BEGIN;

ALTER VIEW public.student_debt_summary SET (security_invoker = true);

ALTER FUNCTION public.prevent_is_pro_update() SET search_path = pg_catalog, public, auth;
ALTER FUNCTION public.handle_new_user() SET search_path = pg_catalog, public, auth;
ALTER FUNCTION public.claim_activation_key(text) SET search_path = pg_catalog, public, auth;
ALTER FUNCTION public.insert_audit_log(text, uuid, uuid, jsonb) SET search_path = pg_catalog, public, auth;
ALTER FUNCTION public.audit_is_pro_change() SET search_path = pg_catalog, public, auth;
ALTER FUNCTION public.generate_activation_keys(integer) SET search_path = pg_catalog, public, auth;
ALTER FUNCTION public.check_free_tier_limits() SET search_path = pg_catalog, public, auth;

CREATE OR REPLACE FUNCTION public.claim_activation_key(key_input TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
  v_teacher_id UUID;
  v_key_id UUID;
BEGIN
  v_teacher_id := auth.uid();
  IF v_teacher_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT pg_try_advisory_xact_lock(hashtext('claim:' || upper(trim(key_input)))) THEN
    RAISE EXCEPTION 'Please retry shortly';
  END IF;

  SELECT id INTO v_key_id
  FROM public.activation_keys
  WHERE key = upper(trim(key_input)) AND is_used = FALSE
  FOR UPDATE
  LIMIT 1;

  IF v_key_id IS NULL THEN
    PERFORM public.insert_audit_log('key_claim_failed', v_teacher_id, NULL, jsonb_build_object('reason', 'not_found_or_used'));
    RAISE EXCEPTION 'Invalid or already used activation key';
  END IF;

  UPDATE public.activation_keys
  SET is_used = TRUE, used_by = v_teacher_id, used_at = NOW()
  WHERE id = v_key_id;

  UPDATE public.teachers SET is_pro = TRUE WHERE id = v_teacher_id;
  PERFORM public.insert_audit_log('key_claimed', v_teacher_id, v_key_id, jsonb_build_object('teacher_id', v_teacher_id));
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_activation_keys(n integer DEFAULT 1)
RETURNS TEXT[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
  v_keys TEXT[] := '{}';
  v_candidate TEXT;
  v_caller_role TEXT;
  i integer;
BEGIN
  v_caller_role := COALESCE(NULLIF(current_setting('role', true), 'none'), session_user::text);
  IF v_caller_role NOT IN ('postgres', 'supabase_admin', 'service_role') THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
  END IF;
  IF n < 1 OR n > 100 THEN
    RAISE EXCEPTION 'Count must be between 1 and 100';
  END IF;

  FOR i IN 1..n LOOP
    LOOP
      v_candidate := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 16));
      INSERT INTO public.activation_keys (key) VALUES (v_candidate)
      ON CONFLICT (key) DO NOTHING
      RETURNING key INTO v_candidate;
      EXIT WHEN FOUND;
    END LOOP;
    v_keys := array_append(v_keys, v_candidate);
  END LOOP;

  PERFORM public.insert_audit_log('key_generated', NULL, NULL, jsonb_build_object('count', array_length(v_keys, 1)));
  RETURN v_keys;
END;
$$;

REVOKE ALL ON FUNCTION public.generate_activation_keys(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.generate_activation_keys(integer) TO service_role;
REVOKE ALL ON FUNCTION public.claim_activation_key(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_activation_key(text) TO authenticated;
REVOKE ALL ON FUNCTION public.insert_audit_log(text, uuid, uuid, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.prevent_is_pro_update() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.audit_is_pro_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.check_free_tier_limits() FROM PUBLIC, anon, authenticated;

COMMIT;
