# Daftari Full-Stack Audit and Remediation

**Audit date:** 15 August 2026  
**Scope:** Connected GitHub repository, live Supabase project, and connected Cloudflare account.

## Executive Summary

The audit identified a **production activation-key defect** and several high-impact **database API hardening gaps** in the Supabase project. The key claim procedure normalized user input to lowercase while the key generator persisted uppercase identifiers, which made valid generated keys fail lookup. The same live database exposed multiple `SECURITY DEFINER` helper functions to both anonymous and authenticated callers, used a mutable function search path, and served a financial debt view as a definer view that could bypass base-table tenant policies.

All verified production fixes were implemented in the repository and applied to the live Supabase project. The production dependency audit is now clean. The app passes the added database-security regression check, TypeScript validation, and a Vite production build.

## Scope and Environment

| Area | Evidence | Result |
|---|---|---|
| GitHub | `rtxuser41/daftari`, `main` branch | Source reviewed and corrected locally. |
| Supabase | Project `Daftari` (`dceotrjrayffafvjlcmh`), `eu-west-3`, active | Live schema, RLS policies, functions, migrations, and advisors reviewed. |
| Cloudflare | Connected account inventory | No Workers and no zones were present, so no Daftari deployment configuration existed to alter. |

## Verified Findings and Resolutions

| Severity | Finding | Evidence | Resolution |
|---|---|---|---|
| Critical functional | Activation-key redemption compared `lower(key_input)` with uppercase generated keys. | The live `claim_activation_key` definition and checked-in schema used lowercase lookup while `generate_activation_keys` creates uppercase values. | Canonicalized claims with `upper(btrim(key_input))` in client paths, canonical schema, legacy hardening migration, and live migration. |
| High security | The debt summary view used the default definer behavior, risking bypass of base-table RLS for financial data. | Supabase advisor reported `student_debt_summary` as a `SECURITY DEFINER` view; base tables have tenant policies based on `auth.uid() = teacher_id`. | Applied `ALTER VIEW public.student_debt_summary SET (security_invoker = true)`. |
| High security | Seven privileged functions had a mutable search path and were executable by anonymous and authenticated roles. | Supabase advisor reported the exposed functions and live verification showed `anon=t; authenticated=t`. | Set `search_path = pg_catalog, public, pg_temp`; revoked privileged helper access; retained authenticated access only for `claim_activation_key(text)`. |
| Medium correctness | The older hardening migration used invalid `UPDATE ... FOR UPDATE` syntax. | The canonical schema contained the valid `SELECT ... FOR UPDATE` implementation, while `migrations/001_security_hardening.sql` did not. | Replaced the invalid path with a locked `SELECT id ... FOR UPDATE` followed by an ID-scoped update. |
| Medium build hygiene | A dynamic import of the shared Supabase client could not split a module that is also statically imported elsewhere. | Vite emitted a dynamic-import warning in the baseline build. | Replaced it with a static import in `Dashboard.tsx`; the warning no longer appears. |
| Dependency risk | Six high-severity production dependency advisories were present before remediation. | `npm audit --omit=dev` baseline. | Applied non-breaking lockfile updates; the production audit now reports zero vulnerabilities. |

## Applied Database Migration

`migrations/002_database_api_security_and_activation_key_fix.sql` is recorded in the source repository and was applied successfully to Supabase as `database_api_security_and_activation_key_fix`.

The migration intentionally leaves `activation_keys` and `security_audit_log` as **RLS-enabled, deny-all tables without client policies**. This is a deliberate safety posture: neither table should be directly available through the client API. Supabase reports these as informational “RLS Enabled No Policy” notices, not access grants. The only intended client path is the authenticated `claim_activation_key(text)` RPC.

## Validation Results

| Check | Result |
|---|---|
| Static SQL regression check | Passed: canonical uppercase handling, fixed row lock strategy, restricted grants, protected search paths, and security-invoker view are asserted. |
| TypeScript check | Passed: `npm run lint`. |
| Production build | Passed: `npm run build`. |
| Production dependency audit | Passed: `npm audit --omit=dev --audit-level=high` reports **0 vulnerabilities**. |
| Live Supabase verification | Passed: helper RPCs are inaccessible to `anon` and `authenticated`; `claim_activation_key` is authenticated-only; all protected functions have the fixed search path; the debt view has `security_invoker=true`. |
| Post-remediation Supabase advisor | The prior error-level debt-view finding and helper-function warnings are resolved. One warning remains for the intentionally authenticated-only activation RPC, plus two informational deny-all RLS notices. |

## Remaining Risks and Recommended Follow-Up

The Vite output remains approximately **1.04 MB before compression**, which is above the default chunk warning threshold. This is a performance concern rather than a build failure. A focused code-splitting pass should separate route-level pages and heavyweight dependencies after user flows are covered by automated tests.

The full development dependency audit still reports a high and critical advisory in the Capacitor CLI dependency chain. The only automated remediation requires a breaking upgrade to Capacitor CLI 8, while this codebase currently uses Capacitor 6. This upgrade was not forced because it requires a separate compatibility pass, native sync verification, and release testing. It does not appear in the production-only dependency audit.

Cloudflare currently contains no zones or Workers for this account. If Daftari is later deployed through Cloudflare, the next review should cover custom domain DNS, HTTPS, Worker route bindings, cache rules, and any secrets or environment bindings before launch.

## Reference

Supabase’s advisor findings link to the relevant [database linter guidance](https://supabase.com/docs/guides/database/database-linter) and were re-run after the migration.
