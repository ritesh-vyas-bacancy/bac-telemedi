import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.");
}

const DEMO_PASSWORD = process.env.MVP_DEMO_PASSWORD || "DemoPass#2026";
const DEMO_TAG = process.env.MVP_SEED_TAG || String(Date.now());

const DEMO_USERS = [
  {
    role: "patient",
    email: `mvp.patient.${DEMO_TAG}@gmail.com`,
    fullName: "MVP Patient User",
  },
  {
    role: "provider",
    email: `mvp.provider.${DEMO_TAG}@gmail.com`,
    fullName: "MVP Provider User",
  },
  {
    role: "admin",
    email: `mvp.admin.${DEMO_TAG}@gmail.com`,
    fullName: "MVP Admin User",
  },
];

function isAlreadyRegisteredError(error) {
  if (!error) return false;
  const msg = String(error.message || "").toLowerCase();
  return msg.includes("already registered") || msg.includes("already been registered");
}

async function getAuthedClient({ email, role, fullName, password }) {
  const client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  const signUpResult = await client.auth.signUp({
    email,
    password,
    options: {
      data: {
        role,
        full_name: fullName,
      },
    },
  });

  if (signUpResult.error && !isAlreadyRegisteredError(signUpResult.error)) {
    throw new Error(`signUp failed for ${email}: ${signUpResult.error.message}`);
  }

  const signInResult = await client.auth.signInWithPassword({ email, password });
  if (signInResult.error) {
    throw new Error(
      `signIn failed for ${email}: ${signInResult.error.message}. If email confirmation is enabled, disable it for MVP or confirm the user manually.`,
    );
  }

  const user = signInResult.data.user;
  if (!user) {
    throw new Error(`No signed-in user for ${email}.`);
  }

  const upsertProfile = await client.from("profiles").upsert({
    id: user.id,
    role,
    full_name: fullName,
  });

  if (upsertProfile.error) {
    throw new Error(`profiles upsert failed for ${email}: ${upsertProfile.error.message}`);
  }

  return { client, user };
}

async function ensureProviderAvailability(providerClient, providerId) {
  const existing = await providerClient
    .from("provider_availability")
    .select("id")
    .eq("provider_id", providerId)
    .limit(1);

  if (existing.error) {
    throw new Error(`provider_availability select failed: ${existing.error.message}`);
  }

  if ((existing.data || []).length > 0) {
    return;
  }

  const slots = [1, 2, 3, 4, 5].map((weekday) => ({
    provider_id: providerId,
    weekday,
    start_time: "09:00:00",
    end_time: "17:00:00",
    timezone: "Asia/Kolkata",
    slot_minutes: 30,
    is_active: true,
  }));

  const inserted = await providerClient.from("provider_availability").insert(slots);
  if (inserted.error) {
    throw new Error(`provider_availability insert failed: ${inserted.error.message}`);
  }
}

function buildFutureIso(hoursAhead) {
  const d = new Date(Date.now() + hoursAhead * 60 * 60 * 1000);
  return d.toISOString();
}

async function ensureSeedAppointments(patientClient, patientId, providerId) {
  const existing = await patientClient
    .from("appointments")
    .select("id,status,reason")
    .eq("patient_id", patientId)
    .eq("provider_id", providerId)
    .ilike("reason", "MVP Seed%")
    .order("created_at", { ascending: false })
    .limit(3);

  if (existing.error) {
    throw new Error(`appointments select failed: ${existing.error.message}`);
  }

  const rows = existing.data || [];
  if (rows.length < 3) {
    const needed = 3 - rows.length;
    const toInsert = Array.from({ length: needed }).map((_, idx) => ({
      patient_id: patientId,
      provider_id: providerId,
      scheduled_at: buildFutureIso(2 + idx * 2),
      duration_minutes: 30,
      reason: `MVP Seed ${rows.length + idx + 1}`,
      status: "booked",
    }));

    const inserted = await patientClient.from("appointments").insert(toInsert);
    if (inserted.error) {
      throw new Error(`appointments insert failed: ${inserted.error.message}`);
    }
  }

  const seedRows = await patientClient
    .from("appointments")
    .select("id,status,reason,scheduled_at")
    .eq("patient_id", patientId)
    .eq("provider_id", providerId)
    .ilike("reason", "MVP Seed%")
    .order("created_at", { ascending: false })
    .limit(10);

  if (seedRows.error) {
    throw new Error(`seed appointments re-read failed: ${seedRows.error.message}`);
  }

  return seedRows.data || [];
}

async function updateProviderQueueStates(providerClient, providerId, seedAppointments) {
  const booked = seedAppointments.filter((a) => a.status === "booked");
  const updates = [
    { row: booked[0], status: "in_progress" },
    { row: booked[1], status: "completed" },
    { row: booked[2], status: "cancelled" },
  ].filter((x) => Boolean(x.row));

  for (const item of updates) {
    const result = await providerClient
      .from("appointments")
      .update({ status: item.status })
      .eq("id", item.row.id)
      .eq("provider_id", providerId);

    if (result.error) {
      throw new Error(`appointments status update failed (${item.status}): ${result.error.message}`);
    }
  }
}

async function verifyPatientFlow(patientClient, patientId) {
  const providers = await patientClient.from("profiles").select("id,full_name,role").eq("role", "provider").limit(10);
  if (providers.error) {
    throw new Error(`patient providers read failed: ${providers.error.message}`);
  }

  const appointments = await patientClient
    .from("appointments")
    .select("id,status,scheduled_at,reason,provider_id")
    .eq("patient_id", patientId)
    .order("scheduled_at", { ascending: true })
    .limit(20);

  if (appointments.error) {
    throw new Error(`patient appointments read failed: ${appointments.error.message}`);
  }

  return {
    providerCount: (providers.data || []).length,
    appointmentCount: (appointments.data || []).length,
    sampleAppointments: (appointments.data || []).slice(0, 5),
  };
}

async function verifyProviderFlow(providerClient, providerId) {
  const queue = await providerClient
    .from("appointments")
    .select("id,status,scheduled_at,reason,patient_id")
    .eq("provider_id", providerId)
    .order("scheduled_at", { ascending: true })
    .limit(20);

  if (queue.error) {
    throw new Error(`provider queue read failed: ${queue.error.message}`);
  }

  return {
    queueCount: (queue.data || []).length,
    sampleQueue: (queue.data || []).slice(0, 5),
  };
}

async function verifyAdminFlow(adminClient) {
  const [profiles, appointments] = await Promise.all([
    adminClient.from("profiles").select("id,role", { count: "exact" }),
    adminClient.from("appointments").select("id,status", { count: "exact" }),
  ]);

  if (profiles.error) {
    throw new Error(`admin profiles read failed: ${profiles.error.message}`);
  }
  if (appointments.error) {
    throw new Error(`admin appointments read failed: ${appointments.error.message}`);
  }

  const roleCounts = (profiles.data || []).reduce(
    (acc, row) => {
      if (row.role === "patient") acc.patient += 1;
      if (row.role === "provider") acc.provider += 1;
      if (row.role === "admin") acc.admin += 1;
      return acc;
    },
    { patient: 0, provider: 0, admin: 0 },
  );

  const appointmentStatusCounts = (appointments.data || []).reduce(
    (acc, row) => {
      const status = row.status || "unknown";
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    },
    {},
  );

  return {
    totalProfiles: profiles.count || (profiles.data || []).length,
    totalAppointments: appointments.count || (appointments.data || []).length,
    roleCounts,
    appointmentStatusCounts,
  };
}

async function main() {
  const withPassword = (user) => ({ ...user, password: DEMO_PASSWORD });

  const patient = await getAuthedClient(withPassword(DEMO_USERS[0]));
  const provider = await getAuthedClient(withPassword(DEMO_USERS[1]));
  const admin = await getAuthedClient(withPassword(DEMO_USERS[2]));

  await ensureProviderAvailability(provider.client, provider.user.id);

  const seedAppointments = await ensureSeedAppointments(patient.client, patient.user.id, provider.user.id);
  await updateProviderQueueStates(provider.client, provider.user.id, seedAppointments);

  const patientCheck = await verifyPatientFlow(patient.client, patient.user.id);
  const providerCheck = await verifyProviderFlow(provider.client, provider.user.id);
  const adminCheck = await verifyAdminFlow(admin.client);

  console.log(
    JSON.stringify(
      {
        ok: true,
        credentials: {
          patient: { email: DEMO_USERS[0].email, password: DEMO_PASSWORD },
          provider: { email: DEMO_USERS[1].email, password: DEMO_PASSWORD },
          admin: { email: DEMO_USERS[2].email, password: DEMO_PASSWORD },
        },
        verification: {
          patient: patientCheck,
          provider: providerCheck,
          admin: adminCheck,
        },
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
