import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadLocalEnvFile() {
  const envPath = resolve(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;

  const content = readFileSync(envPath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#")) continue;
    const index = line.indexOf("=");
    if (index <= 0) continue;
    const key = line.slice(0, index).trim();
    const value = line.slice(index + 1).trim();
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadLocalEnvFile();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.");
}

function isMissingRelationError(error) {
  if (!error) return false;
  const msg = String(error.message || "").toLowerCase();
  return msg.includes("could not find the table") || msg.includes("does not exist");
}

function qaClient() {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

async function signIn(email, password, label) {
  const client = qaClient();
  const result = await client.auth.signInWithPassword({ email, password });
  if (result.error || !result.data.user) {
    throw new Error(`${label} sign-in failed: ${result.error?.message ?? "unknown error"}`);
  }
  return client;
}

async function runReadCheck(client, label, table, queryBuilder) {
  const { data, error } = await queryBuilder(client.from(table));
  if (error) {
    if (isMissingRelationError(error)) {
      return { label, table, status: "warn", message: `${table} not found (migration pending)` };
    }
    throw new Error(`${label} check failed on ${table}: ${error.message}`);
  }
  return { label, table, status: "pass", rows: (data || []).length };
}

async function runPersonaChecks(label, client) {
  if (label === "patient") {
    return Promise.all([
      runReadCheck(client, label, "appointments", (q) => q.select("id,status").limit(5)),
      runReadCheck(client, label, "prescriptions", (q) => q.select("id,status").limit(5)),
      runReadCheck(client, label, "billing_invoices", (q) => q.select("id,status").limit(5)),
      runReadCheck(client, label, "consultation_sessions", (q) => q.select("id,status").limit(5)),
    ]);
  }

  if (label === "provider") {
    return Promise.all([
      runReadCheck(client, label, "appointments", (q) => q.select("id,status").limit(5)),
      runReadCheck(client, label, "provider_availability", (q) => q.select("id,weekday").limit(5)),
      runReadCheck(client, label, "encounter_notes", (q) => q.select("id,status").limit(5)),
      runReadCheck(client, label, "care_orders", (q) => q.select("id,status").limit(5)),
    ]);
  }

  return Promise.all([
    runReadCheck(client, label, "profiles", (q) => q.select("id,role").limit(10)),
    runReadCheck(client, label, "appointments", (q) => q.select("id,status").limit(10)),
    runReadCheck(client, label, "audit_logs", (q) => q.select("id,action").limit(10)),
    runReadCheck(client, label, "billing_invoices", (q) => q.select("id,status").limit(10)),
  ]);
}

async function main() {
  const patientEmail = process.env.MVP_QA_PATIENT_EMAIL;
  const providerEmail = process.env.MVP_QA_PROVIDER_EMAIL;
  const adminEmail = process.env.MVP_QA_ADMIN_EMAIL;
  const qaPassword = process.env.MVP_QA_PASSWORD;

  if (!patientEmail || !providerEmail || !adminEmail || !qaPassword) {
    console.log(
      JSON.stringify(
        {
          ok: true,
          skipped: true,
          message:
            "Set MVP_QA_PATIENT_EMAIL, MVP_QA_PROVIDER_EMAIL, MVP_QA_ADMIN_EMAIL, and MVP_QA_PASSWORD to run authenticated smoke tests.",
        },
        null,
        2,
      ),
    );
    return;
  }

  const patientClient = await signIn(patientEmail, qaPassword, "patient");
  const providerClient = await signIn(providerEmail, qaPassword, "provider");
  const adminClient = await signIn(adminEmail, qaPassword, "admin");

  const [patientChecks, providerChecks, adminChecks] = await Promise.all([
    runPersonaChecks("patient", patientClient),
    runPersonaChecks("provider", providerClient),
    runPersonaChecks("admin", adminClient),
  ]);

  const allChecks = [...patientChecks, ...providerChecks, ...adminChecks];
  const warnings = allChecks.filter((item) => item.status === "warn");
  const passes = allChecks.filter((item) => item.status === "pass");

  console.log(
    JSON.stringify(
      {
        ok: true,
        skipped: false,
        summary: {
          passed: passes.length,
          warnings: warnings.length,
          total: allChecks.length,
        },
        checks: allChecks,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: String(error.message || error) }, null, 2));
  process.exit(1);
});
