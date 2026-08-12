-- ==========================================
-- RLS VERIFICATION SCRIPT
-- ==========================================
-- Run in the Supabase SQL Editor to verify that every table in the `public`
-- schema has Row Level Security enabled.
--
-- What it does:
--  1. Lists every table in public together with its relrowsecurity state.
--  2. Prints the rows so the DBA can review them.
--  3. RAISEs an EXCEPTION (failing the statement) if any table has
--     RLS disabled, so this check can be used in CI or pre-deploy reviews.
--
-- NOTE: `security_audit_log` MUST also have RLS enabled (deliberately no
-- policies, so only SECURITY DEFINER functions can write to it).

DO $$
DECLARE
  rec RECORD;
  v_disabled integer := 0;
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
  ELSE
    RAISE NOTICE 'RLS check PASSED: all public tables have RLS enabled.';
  END IF;
END $$;
