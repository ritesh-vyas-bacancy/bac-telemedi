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

function isMissingRelationError(error) {
  if (!error) return false;
  const msg = String(error.message || "").toLowerCase();
  return msg.includes("could not find the table") || msg.includes("does not exist");
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

async function readSeedAppointments(patientClient, patientId, providerId) {
  const seedRows = await patientClient
    .from("appointments")
    .select("id,status,reason,scheduled_at,patient_id,provider_id")
    .eq("patient_id", patientId)
    .eq("provider_id", providerId)
    .ilike("reason", "MVP Seed%")
    .order("scheduled_at", { ascending: true })
    .limit(10);

  if (seedRows.error) {
    throw new Error(`seed appointments read failed: ${seedRows.error.message}`);
  }

  return seedRows.data || [];
}

async function ensureClinicalArtifacts(providerClient, patientId, providerId, appointments) {
  for (const appointment of appointments) {
    let consultationStatus = "scheduled";
    if (appointment.status === "in_progress") consultationStatus = "in_consult";
    if (appointment.status === "completed") consultationStatus = "completed";
    if (appointment.status === "cancelled" || appointment.status === "no_show") consultationStatus = "cancelled";

    const nowIso = new Date().toISOString();

    const sessionUpsert = await providerClient.from("consultation_sessions").upsert(
      {
        appointment_id: appointment.id,
        patient_id: patientId,
        provider_id: providerId,
        status: consultationStatus,
        patient_ready_at: consultationStatus === "scheduled" ? null : nowIso,
        provider_ready_at: consultationStatus === "in_consult" || consultationStatus === "completed" ? nowIso : null,
        started_at: consultationStatus === "in_consult" || consultationStatus === "completed" ? nowIso : null,
        ended_at: consultationStatus === "completed" ? nowIso : null,
      },
      { onConflict: "appointment_id" },
    );

    if (sessionUpsert.error) {
      throw new Error(`consultation_sessions upsert failed: ${sessionUpsert.error.message}`);
    }
  }

  const completedAppointment = appointments.find((item) => item.status === "completed") || appointments[0];
  if (completedAppointment) {
    const noteUpsert = await providerClient.from("encounter_notes").upsert(
      {
        appointment_id: completedAppointment.id,
        patient_id: patientId,
        provider_id: providerId,
        subjective: "Patient reports recurring headache for 3 days.",
        objective: "Vitals stable. No neurological deficit.",
        assessment: "Tension headache, mild dehydration.",
        plan: "Hydration, rest, analgesic PRN, follow-up in 3 days.",
        status: completedAppointment.status === "completed" ? "signed" : "draft",
      },
      { onConflict: "appointment_id" },
    );

    if (noteUpsert.error) {
      throw new Error(`encounter_notes upsert failed: ${noteUpsert.error.message}`);
    }

    const existingRx = await providerClient
      .from("prescriptions")
      .select("id")
      .eq("appointment_id", completedAppointment.id)
      .limit(1);

    if (existingRx.error) {
      throw new Error(`prescriptions read failed: ${existingRx.error.message}`);
    }

    if ((existingRx.data || []).length === 0) {
      const rxInsert = await providerClient.from("prescriptions").insert({
        appointment_id: completedAppointment.id,
        patient_id: patientId,
        provider_id: providerId,
        medication_name: "Paracetamol 650mg",
        dosage: "1 tablet twice daily for 3 days",
        instructions: "Take after food. Maintain hydration.",
        status: "sent",
      });

      if (rxInsert.error) {
        throw new Error(`prescriptions insert failed: ${rxInsert.error.message}`);
      }
    }

    const existingOrder = await providerClient
      .from("care_orders")
      .select("id")
      .eq("appointment_id", completedAppointment.id)
      .limit(1);

    if (existingOrder.error) {
      throw new Error(`care_orders read failed: ${existingOrder.error.message}`);
    }

    if ((existingOrder.data || []).length === 0) {
      const orderInsert = await providerClient.from("care_orders").insert({
        appointment_id: completedAppointment.id,
        patient_id: patientId,
        provider_id: providerId,
        order_type: "follow_up",
        title: "Follow-up consultation",
        details: "Reassess headache trend and hydration status.",
        due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        status: "open",
      });

      if (orderInsert.error) {
        throw new Error(`care_orders insert failed: ${orderInsert.error.message}`);
      }
    }
  }

  for (const appointment of appointments) {
    const existingInvoice = await providerClient
      .from("billing_invoices")
      .select("id,status")
      .eq("appointment_id", appointment.id)
      .limit(1);

    if (existingInvoice.error) {
      throw new Error(`billing_invoices read failed: ${existingInvoice.error.message}`);
    }

    const invoiceStatus = appointment.status === "completed" ? "paid" : "pending";
    const paidAt = invoiceStatus === "paid" ? new Date().toISOString() : null;

    if ((existingInvoice.data || []).length === 0) {
      const invoiceInsert = await providerClient.from("billing_invoices").insert({
        appointment_id: appointment.id,
        patient_id: patientId,
        provider_id: providerId,
        amount: 499,
        currency: "INR",
        status: invoiceStatus,
        paid_at: paidAt,
        gateway_reference: invoiceStatus === "paid" ? "SEED_PAYMENT" : null,
      });

      if (invoiceInsert.error) {
        throw new Error(`billing_invoices insert failed: ${invoiceInsert.error.message}`);
      }
    } else {
      const invoiceUpdate = await providerClient
        .from("billing_invoices")
        .update({
          status: invoiceStatus,
          paid_at: paidAt,
          gateway_reference: invoiceStatus === "paid" ? "SEED_PAYMENT" : null,
        })
        .eq("id", existingInvoice.data[0].id);

      if (invoiceUpdate.error) {
        throw new Error(`billing_invoices update failed: ${invoiceUpdate.error.message}`);
      }
    }
  }
}

async function verifyPatientFlow(patientClient, patientId) {
  const [providers, appointments, sessions, invoices] = await Promise.all([
    patientClient.from("profiles").select("id,full_name,role").eq("role", "provider").limit(10),
    patientClient
      .from("appointments")
      .select("id,status,scheduled_at,reason,provider_id")
      .eq("patient_id", patientId)
      .order("scheduled_at", { ascending: true })
      .limit(20),
    patientClient
      .from("consultation_sessions")
      .select("id,appointment_id,status")
      .eq("patient_id", patientId)
      .order("updated_at", { ascending: false })
      .limit(20),
    patientClient
      .from("billing_invoices")
      .select("id,appointment_id,status,amount,currency")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  if (providers.error) throw new Error(`patient providers read failed: ${providers.error.message}`);
  if (appointments.error) throw new Error(`patient appointments read failed: ${appointments.error.message}`);
  if (sessions.error && !isMissingRelationError(sessions.error)) {
    throw new Error(`patient sessions read failed: ${sessions.error.message}`);
  }
  if (invoices.error && !isMissingRelationError(invoices.error)) {
    throw new Error(`patient invoices read failed: ${invoices.error.message}`);
  }

  const sessionData = sessions.error ? [] : sessions.data || [];
  const invoiceData = invoices.error ? [] : invoices.data || [];

  return {
    providerCount: (providers.data || []).length,
    appointmentCount: (appointments.data || []).length,
    consultationCount: sessionData.length,
    invoiceCount: invoiceData.length,
    sampleAppointments: (appointments.data || []).slice(0, 5),
    sampleConsultations: sessionData.slice(0, 5),
    sampleInvoices: invoiceData.slice(0, 3),
  };
}

async function verifyProviderFlow(providerClient, providerId) {
  const [queue, sessions, notes, careOrders] = await Promise.all([
    providerClient
      .from("appointments")
      .select("id,status,scheduled_at,reason,patient_id")
      .eq("provider_id", providerId)
      .order("scheduled_at", { ascending: true })
      .limit(20),
    providerClient
      .from("consultation_sessions")
      .select("id,appointment_id,status")
      .eq("provider_id", providerId)
      .order("updated_at", { ascending: false })
      .limit(20),
    providerClient
      .from("encounter_notes")
      .select("id,appointment_id,status")
      .eq("provider_id", providerId)
      .order("updated_at", { ascending: false })
      .limit(20),
    providerClient
      .from("care_orders")
      .select("id,appointment_id,status,order_type")
      .eq("provider_id", providerId)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  if (queue.error) throw new Error(`provider queue read failed: ${queue.error.message}`);
  if (sessions.error && !isMissingRelationError(sessions.error)) {
    throw new Error(`provider sessions read failed: ${sessions.error.message}`);
  }
  if (notes.error && !isMissingRelationError(notes.error)) {
    throw new Error(`provider notes read failed: ${notes.error.message}`);
  }
  if (careOrders.error && !isMissingRelationError(careOrders.error)) {
    throw new Error(`provider care orders read failed: ${careOrders.error.message}`);
  }

  const sessionData = sessions.error ? [] : sessions.data || [];
  const noteData = notes.error ? [] : notes.data || [];
  const careOrderData = careOrders.error ? [] : careOrders.data || [];

  return {
    queueCount: (queue.data || []).length,
    consultationCount: sessionData.length,
    noteCount: noteData.length,
    careOrderCount: careOrderData.length,
    sampleQueue: (queue.data || []).slice(0, 5),
    sampleConsultations: sessionData.slice(0, 5),
    sampleNotes: noteData.slice(0, 3),
  };
}

async function verifyAdminFlow(adminClient) {
  const [profiles, appointments, sessions, notes, invoices] = await Promise.all([
    adminClient.from("profiles").select("id,role", { count: "exact" }),
    adminClient.from("appointments").select("id,status", { count: "exact" }),
    adminClient.from("consultation_sessions").select("id,status", { count: "exact" }),
    adminClient.from("encounter_notes").select("id,status", { count: "exact" }),
    adminClient.from("billing_invoices").select("id,status,amount", { count: "exact" }),
  ]);

  if (profiles.error) {
    throw new Error(`admin profiles read failed: ${profiles.error.message}`);
  }
  if (appointments.error) {
    throw new Error(`admin appointments read failed: ${appointments.error.message}`);
  }
  if (sessions.error && !isMissingRelationError(sessions.error)) {
    throw new Error(`admin sessions read failed: ${sessions.error.message}`);
  }
  if (notes.error && !isMissingRelationError(notes.error)) {
    throw new Error(`admin notes read failed: ${notes.error.message}`);
  }
  if (invoices.error && !isMissingRelationError(invoices.error)) {
    throw new Error(`admin invoices read failed: ${invoices.error.message}`);
  }

  const sessionData = sessions.error ? [] : sessions.data || [];
  const noteData = notes.error ? [] : notes.data || [];
  const invoiceData = invoices.error ? [] : invoices.data || [];

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

  const consultationStatusCounts = sessionData.reduce(
    (acc, row) => {
      const status = row.status || "unknown";
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    },
    {},
  );

  const invoiceStatusCounts = invoiceData.reduce(
    (acc, row) => {
      const status = row.status || "unknown";
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    },
    {},
  );

  const paidRevenue = invoiceData
    .filter((row) => row.status === "paid")
    .reduce((acc, row) => acc + Number(row.amount || 0), 0);

  return {
    totalProfiles: profiles.count || (profiles.data || []).length,
    totalAppointments: appointments.count || (appointments.data || []).length,
    totalConsultations: sessions.error ? 0 : sessions.count || sessionData.length,
    totalEncounterNotes: notes.error ? 0 : notes.count || noteData.length,
    totalInvoices: invoices.error ? 0 : invoices.count || invoiceData.length,
    roleCounts,
    appointmentStatusCounts,
    consultationStatusCounts,
    invoiceStatusCounts,
    paidRevenue,
  };
}

async function main() {
  const withPassword = (user) => ({ ...user, password: DEMO_PASSWORD });

  const patient = await getAuthedClient(withPassword(DEMO_USERS[0]));
  const provider = await getAuthedClient(withPassword(DEMO_USERS[1]));
  const admin = await getAuthedClient(withPassword(DEMO_USERS[2]));

  await ensureProviderAvailability(provider.client, provider.user.id);

  const initialSeedAppointments = await ensureSeedAppointments(patient.client, patient.user.id, provider.user.id);
  await updateProviderQueueStates(provider.client, provider.user.id, initialSeedAppointments);
  const seedAppointments = await readSeedAppointments(patient.client, patient.user.id, provider.user.id);
  let phaseASeeded = true;
  let phaseAWarning = null;
  try {
    await ensureClinicalArtifacts(provider.client, patient.user.id, provider.user.id, seedAppointments);
  } catch (error) {
    if (isMissingRelationError(error)) {
      phaseASeeded = false;
      phaseAWarning =
        "Phase A tables are not present yet. Run supabase/migrations/0002_phase_a_clinical_core.sql and rerun seed.";
    } else {
      throw error;
    }
  }

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
        phaseA: {
          seeded: phaseASeeded,
          warning: phaseAWarning,
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
