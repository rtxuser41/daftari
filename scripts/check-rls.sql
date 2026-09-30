-- ==========================================
-- RLS VERIFICATION SCRIPT
-- ==========================================
-- Run in the Supabase SQL Editor to verify that every table in the `public`
-- schema has Row Level Security enabled.
--
-- What it does:
--  1. Lists public tables and checks that every table has RLS enabled.
--  2. Verifies privileged activation RPC grants and debt-view invoker security.
--  3. RAISEs an EXCEPTION if a table or function/view permission is unsafe.
--
-- NOTE: `security_audit_log` MUST also have RLS enabled (deliberately no
-- policies, so only SECURITY DEFINER functions can write to it).

DO $$
DECLARE
  rec RECORD;
  v_disabled integer := 0;
  v_privilege_issue boolean := false;
  v_view_is_invoker boolean := false;
BEGIN
  RAISE NOTICE '=== Row Level Security status for public tables ===';
  FOR rec IN
    SELECT t.table_name,
           CASE WHEN c.relrowsecurity THEN 'ENABLED ' ELSE 'DISABLED!' END AS rls_status
    FROM information_schema.tables t
    JOIN pg_class c ON c.relname = t.table_name
    JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = 'public'
    WHERE t.table_type = 'BASE TABLE'
    ORDER BY t.table_name
  LOOP
    RAISE NOTICE '% : %', rec.table_name, rec.rls_status;
    IF rec.rls_status = 'DISABLED!' THEN
      v_disabled := v_disabled + 1;
    END IF;
  END LOOP;

  IF v_disabled > 0 THEN
    RAISE EXCEPTION 'RLS check FAILED: % public table(s) have Row Level Security disabled.', v_disabled;
  END IF;

  IF has_function_privilege('anon', 'public.generate_activation_keys(integer)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.generate_activation_keys(integer)', 'EXECUTE')
     OR has_function_privilege('anon', 'public.claim_activation_key(text)', 'EXECUTE') THEN
    v_privilege_issue := true;
  END IF;
  IF v_privilege_issue THEN
    RAISE EXCEPTION 'RLS check FAILED: activation RPC privileges are too broad.';
  END IF;

  IF NOT has_function_privilege('authenticated', 'public.claim_activation_key(text)', 'EXECUTE')
     OR NOT has_function_privilege('service_role', 'public.generate_activation_keys(integer)', 'EXECUTE') THEN
    RAISE EXCEPTION 'RLS check FAILED: activation RPC grants are missing for the intended roles.';
  END IF;
  IF has_function_privilege('anon', 'public.insert_audit_log(text, uuid, uuid, jsonb)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.insert_audit_log(text, uuid, uuid, jsonb)', 'EXECUTE') THEN
    RAISE EXCEPTION 'RLS check FAILED: direct audit-log RPC execution is too broad.';
  END IF;

  SELECT COALESCE('security_invoker=true' = ANY(c.reloptions), false)
  INTO v_view_is_invoker
  FROM pg_class c
  WHERE c.oid = to_regclass('public.student_debt_summary');
  IF NOT v_view_is_invoker THEN
    RAISE EXCEPTION 'RLS check FAILED: student_debt_summary must use security_invoker.';
  END IF;

  RAISE NOTICE 'RLS check PASSED: table RLS, activation RPC grants, and debt-view security were verified.';
END $$;
