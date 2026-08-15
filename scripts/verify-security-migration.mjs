import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const repair = read("../migrations/002_database_api_security_and_activation_key_fix.sql");
const originalMigration = read("../migrations/001_security_hardening.sql");
const canonicalSchema = read("../supabase-schema.sql");
const activationClients = [
  read("../src/repositories/TeacherRepository.ts"),
  read("../src/services/dbService.ts"),
].join("\n");

assert.match(repair, /v_normalized_key TEXT := upper\(btrim\(key_input\)\)/);
assert.match(repair, /SET search_path = pg_catalog, public, pg_temp/);
assert.match(repair, /REVOKE EXECUTE ON FUNCTION public\.generate_activation_keys\(INTEGER\) FROM PUBLIC, anon, authenticated/);
assert.match(repair, /GRANT EXECUTE ON FUNCTION public\.claim_activation_key\(TEXT\) TO authenticated/);
assert.match(repair, /ALTER VIEW public\.student_debt_summary SET \(security_invoker = true\)/);
assert.doesNotMatch(`${originalMigration}\n${canonicalSchema}`, /trim\(lower\(key_input\)\)/);
assert.doesNotMatch(originalMigration, /UPDATE activation_keys[\s\S]*FOR UPDATE;/);
assert.match(activationClients, /key_input: [a-zA-Z]+\.trim\(\)\.toUpperCase\(\)/);

console.log("Security migration checks passed.");
