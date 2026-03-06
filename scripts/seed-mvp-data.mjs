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
const DEMO_TAG = process.env.MVP_SEED_TAG || "enterprise";

const VISIT_REASONS = [
  "Eye consultation for screen fatigue",
  "Follow-up for migraine management",
  "General physician review for seasonal flu",
  "Diabetes medication adjustment",
  "Skin allergy assessment",
  "Pediatric wellness check",
];

const DEMO_USERS = [
  {
    role: "patient",
    email: process.env.MVP_PATIENT_EMAIL || `patient.${DEMO_TAG}@bac-telemedi.demo`,
    fullName: "Riya Mehta",
    phone: "+91 98765 41001",
    avatarUrl: "https://images.unsplash.com/photo-1544723795-3fb6469f5b39?auto=format&fit=crop&w=200&q=80",
  },
  {
    role: "provider",
    email: process.env.MVP_PROVIDER_EMAIL || `provider.${DEMO_TAG}@bac-telemedi.demo`,
    fullName: "Dr. Arjun Rao",
    phone: "+91 98765 42002",
    avatarUrl: "https://images.unsplash.com/photo-1612531385446-f7b6b8f5a2f4?auto=format&fit=crop&w=200&q=80",
  },
  {
    role: "admin",
    email: process.env.MVP_ADMIN_EMAIL || `admin.${DEMO_TAG}@bac-telemedi.demo`,
    fullName: "Ananya Singh",
    phone: "+91 98765 43003",
    avatarUrl: "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&w=200&q=80",
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

async function getAuthedClient({ email, role, fullName, phone, avatarUrl, password }) {
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
      `signIn failed for ${email}: ${signInResult.error.message}. If email confirmation is enabled, disable it in Supabase Auth or confirm the user manually.`,
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
    phone,
    avatar_url: avatarUrl,
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

function buildMeetingUrl(appointmentId) {
  const room = `bac-telemedi-${String(appointmentId).replaceAll("-", "").slice(0, 16)}`;
  return `https://meet.jit.si/${room}`;
}

async function ensureSeedAppointments(patientClient, patientId, providerId) {
  const existing = await patientClient
    .from("appointments")
    .select("id,status,reason")
    .eq("patient_id", patientId)
    .eq("provider_id", providerId)
    .ilike("reason", "Enterprise Seed%")
    .order("created_at", { ascending: false })
    .limit(8);

  if (existing.error) {
    throw new Error(`appointments select failed: ${existing.error.message}`);
  }

  const rows = existing.data || [];
  if (rows.length < 6) {
    const needed = 6 - rows.length;
    const toInsert = Array.from({ length: needed }).map((_, idx) => ({
      patient_id: patientId,
      provider_id: providerId,
      scheduled_at: buildFutureIso(2 + idx * 2),
      duration_minutes: 30,
      reason: `Enterprise Seed ${rows.length + idx + 1}: ${VISIT_REASONS[(rows.length + idx) % VISIT_REASONS.length]}`,
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
    .ilike("reason", "Enterprise Seed%")
    .order("created_at", { ascending: false })
    .limit(10);

  if (seedRows.error) {
    throw new Error(`seed appointments re-read failed: ${seedRows.error.message}`);
  }

  return seedRows.data || [];
}

async function updateProviderQueueStates(providerClient, providerId, seedAppointments) {
  const ordered = [...seedAppointments].sort(
    (a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime(),
  );
  const targetStatuses = ["in_progress", "completed", "cancelled", "booked", "completed", "in_progress"];
  const updates = ordered.map((row, index) => ({
    row,
    status: targetStatuses[index % targetStatuses.length],
  }));

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
    .select("id,status,reason,scheduled_at,patient_id,provider_id,meeting_url")
    .eq("patient_id", patientId)
    .eq("provider_id", providerId)
    .ilike("reason", "Enterprise Seed%")
    .order("scheduled_at", { ascending: true })
    .limit(20);

  if (seedRows.error) {
    throw new Error(`seed appointments read failed: ${seedRows.error.message}`);
  }

  return seedRows.data || [];
}

async function ensureMeetingLinks(providerClient, providerId, appointments) {
  for (const appointment of appointments) {
    if (appointment.meeting_url) continue;
    const update = await providerClient
      .from("appointments")
      .update({ meeting_url: buildMeetingUrl(appointment.id) })
      .eq("id", appointment.id)
      .eq("provider_id", providerId);
    if (update.error) {
      throw new Error(`appointments meeting_url update failed: ${update.error.message}`);
    }
  }
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

  const orderedAppointments = [...appointments].sort(
    (a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime(),
  );
  const noteTemplates = [
    {
      subjective: "Patient reports persistent eye strain after prolonged laptop sessions.",
      objective: "No redness. Mild dryness observed.",
      assessment: "Digital eye strain with sleep disruption.",
      plan: "Screen-break routine, lubricating drops, and blue-light hygiene.",
    },
    {
      subjective: "Patient follows up for recurring migraine episodes.",
      objective: "Vitals stable. No focal neurological deficit.",
      assessment: "Migraine without aura, stress-triggered.",
      plan: "Hydration, trigger journal, rescue medication plan.",
    },
    {
      subjective: "Patient reports sore throat and low-grade fever for 2 days.",
      objective: "Mild throat congestion, oxygen saturation normal.",
      assessment: "Upper respiratory tract infection.",
      plan: "Symptomatic treatment and red-flag guidance.",
    },
    {
      subjective: "Patient requests review for long-term diabetes medication response.",
      objective: "Home sugar chart reviewed, fasting trend elevated.",
      assessment: "Suboptimal glycemic control.",
      plan: "Dose adjustment and nutrition follow-up in one week.",
    },
  ];

  for (const [index, appointment] of orderedAppointments.slice(0, 6).entries()) {
    const template = noteTemplates[index % noteTemplates.length];
    const noteStatus = appointment.status === "completed" ? "signed" : "draft";
    const noteUpsert = await providerClient.from("encounter_notes").upsert(
      {
        appointment_id: appointment.id,
        patient_id: patientId,
        provider_id: providerId,
        ...template,
        status: noteStatus,
      },
      { onConflict: "appointment_id" },
    );

    if (noteUpsert.error) {
      throw new Error(`encounter_notes upsert failed: ${noteUpsert.error.message}`);
    }
  }

  const completedAppointment = orderedAppointments.find((item) => item.status === "completed") || orderedAppointments[0];
  const activeAppointment =
    orderedAppointments.find((item) => item.status === "in_progress" || item.status === "booked") ||
    orderedAppointments[1] ||
    orderedAppointments[0];

  const prescriptionTargets = Array.from(new Set([completedAppointment?.id, activeAppointment?.id].filter(Boolean)));
  for (const appointmentId of prescriptionTargets) {
    const existingRx = await providerClient
      .from("prescriptions")
      .select("id")
      .eq("appointment_id", appointmentId)
      .limit(1);

    if (existingRx.error) {
      throw new Error(`prescriptions read failed: ${existingRx.error.message}`);
    }

    if ((existingRx.data || []).length === 0) {
      const isCompleted = appointmentId === completedAppointment?.id;
      const rxInsert = await providerClient.from("prescriptions").insert({
        appointment_id: appointmentId,
        patient_id: patientId,
        provider_id: providerId,
        medication_name: isCompleted ? "Paracetamol 650mg" : "Cetirizine 10mg",
        dosage: isCompleted ? "1 tablet twice daily for 3 days" : "1 tablet at bedtime for 5 days",
        instructions: isCompleted
          ? "Take after food and maintain hydration."
          : "Avoid driving if drowsy. Review if symptoms persist.",
        status: "sent",
      });

      if (rxInsert.error) {
        throw new Error(`prescriptions insert failed: ${rxInsert.error.message}`);
      }
    }
  }

  const orderTargets = Array.from(new Set([completedAppointment?.id, activeAppointment?.id].filter(Boolean)));
  for (const appointmentId of orderTargets) {
    const existingOrder = await providerClient
      .from("care_orders")
      .select("id")
      .eq("appointment_id", appointmentId)
      .limit(1);

    if (existingOrder.error) {
      throw new Error(`care_orders read failed: ${existingOrder.error.message}`);
    }

    if ((existingOrder.data || []).length === 0) {
      const isCompleted = appointmentId === completedAppointment?.id;
      const orderInsert = await providerClient.from("care_orders").insert({
        appointment_id: appointmentId,
        patient_id: patientId,
        provider_id: providerId,
        order_type: isCompleted ? "follow_up" : "lab",
        title: isCompleted ? "Follow-up consultation" : "CBC and CRP panel",
        details: isCompleted
          ? "Reassess symptoms and adherence in 3 days."
          : "Complete lab before next consult and upload report.",
        due_date: new Date(Date.now() + (isCompleted ? 3 : 2) * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
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

async function ensureOperationsArtifacts(
  providerClient,
  adminClient,
  patientId,
  providerId,
  adminId,
  appointments,
) {
  const nowIso = new Date().toISOString();

  for (const appointment of appointments) {
    const claimStatus =
      appointment.status === "completed"
        ? "paid"
        : appointment.status === "cancelled" || appointment.status === "no_show"
          ? "rejected"
          : appointment.status === "in_progress"
            ? "under_review"
            : "submitted";

    const claimUpsert = await providerClient.from("claim_submissions").upsert(
      {
        appointment_id: appointment.id,
        patient_id: patientId,
        provider_id: providerId,
        payer_name: "Self-pay",
        amount_claimed: 499,
        status: claimStatus,
        claim_reference: `ENT-CLAIM-${appointment.id.slice(0, 8).toUpperCase()}`,
        submitted_at: nowIso,
        reviewed_at: claimStatus === "rejected" || claimStatus === "paid" ? nowIso : null,
        settled_at: claimStatus === "paid" ? nowIso : null,
        review_notes:
          claimStatus === "rejected"
            ? "Enterprise seed: cancelled appointment not eligible."
            : claimStatus === "paid"
              ? "Enterprise seed: paid in full."
              : null,
      },
      { onConflict: "appointment_id" },
    );

    if (claimUpsert.error) {
      throw new Error(`claim_submissions upsert failed: ${claimUpsert.error.message}`);
    }
  }

  const existingPatientNotifications = await providerClient
    .from("notification_events")
    .select("id")
    .eq("recipient_id", patientId)
    .ilike("title", "Enterprise Seed:%")
    .limit(8);

  if (existingPatientNotifications.error) {
    throw new Error(`notification_events read failed: ${existingPatientNotifications.error.message}`);
  }

  if ((existingPatientNotifications.data || []).length === 0) {
    const providerToPatient = await providerClient.from("notification_events").insert([
      {
        recipient_id: patientId,
        sender_id: providerId,
        appointment_id: appointments[0]?.id ?? null,
        title: "Enterprise Seed: Visit reminder",
        message: "Your consultation is on schedule. Please check in 10 minutes early.",
        channel: "in_app",
        status: "sent",
        scheduled_for: nowIso,
        sent_at: nowIso,
        metadata: {
          destination: null,
          provider_reference: null,
        },
      },
      {
        recipient_id: patientId,
        sender_id: providerId,
        appointment_id: appointments[1]?.id ?? null,
        title: "Enterprise Seed: Claim update",
        message: "Your claim is currently under review.",
        channel: "email",
        status: "read",
        scheduled_for: nowIso,
        sent_at: nowIso,
        read_at: nowIso,
        metadata: {
          destination: DEMO_USERS[0].email,
          provider_reference: "MAIL_SEED_01",
        },
      },
      {
        recipient_id: patientId,
        sender_id: providerId,
        appointment_id: appointments[2]?.id ?? null,
        title: "Enterprise Seed: Lab reminder",
        message: "Please complete your diagnostic lab panel before next consult.",
        channel: "sms",
        status: "queued",
        scheduled_for: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        metadata: {
          destination: "+919876543210",
          failure_reason: "Scheduled for dispatch by operations scheduler.",
        },
      },
      {
        recipient_id: patientId,
        sender_id: providerId,
        appointment_id: appointments[3]?.id ?? null,
        title: "Enterprise Seed: Prescription pickup",
        message: "Your medication is ready. Confirm pickup from your pharmacy.",
        channel: "whatsapp",
        status: "failed",
        scheduled_for: nowIso,
        metadata: {
          destination: "whatsapp:+919876543210",
          failure_reason: "Sample provider delivery failure for retry testing.",
        },
      },
    ]);

    if (providerToPatient.error) {
      throw new Error(`notification_events provider insert failed: ${providerToPatient.error.message}`);
    }
  }

  const adminNotification = await adminClient
    .from("notification_events")
    .select("id")
    .eq("recipient_id", providerId)
    .ilike("title", "Enterprise Seed: Admin%")
    .limit(1);

  if (adminNotification.error) {
    throw new Error(`notification_events admin read failed: ${adminNotification.error.message}`);
  }

  if ((adminNotification.data || []).length === 0) {
    const adminInsert = await adminClient.from("notification_events").insert({
      recipient_id: providerId,
      sender_id: adminId,
      appointment_id: appointments[0]?.id ?? null,
      title: "Enterprise Seed: Admin follow-up",
      message: "Please review claim queue and compliance items.",
      channel: "in_app",
      status: "sent",
      sent_at: nowIso,
    });

    if (adminInsert.error) {
      throw new Error(`notification_events admin insert failed: ${adminInsert.error.message}`);
    }
  }

  const complianceExisting = await providerClient
    .from("compliance_events")
    .select("id")
    .eq("actor_id", providerId)
    .ilike("event_type", "Enterprise Seed:%")
    .limit(4);

  if (complianceExisting.error) {
    throw new Error(`compliance_events read failed: ${complianceExisting.error.message}`);
  }

  if ((complianceExisting.data || []).length === 0) {
    const complianceInsert = await providerClient.from("compliance_events").insert([
      {
        actor_id: providerId,
        patient_id: patientId,
        appointment_id: appointments[0]?.id ?? null,
        event_type: "Enterprise Seed: Identity confirmation",
        risk_level: "medium",
        details: "Patient ID validated at check-in.",
        is_resolved: true,
        resolved_by: adminId,
        resolved_at: nowIso,
      },
      {
        actor_id: providerId,
        patient_id: patientId,
        appointment_id: appointments[1]?.id ?? null,
        event_type: "Enterprise Seed: Follow-up risk",
        risk_level: "high",
        details: "Follow-up pending provider review.",
        is_resolved: false,
      },
      {
        actor_id: providerId,
        patient_id: patientId,
        appointment_id: appointments[2]?.id ?? null,
        event_type: "Enterprise Seed: Controlled substance check",
        risk_level: "critical",
        details: "Manual approval required before refill authorization.",
        is_resolved: false,
      },
    ]);

    if (complianceInsert.error) {
      throw new Error(`compliance_events insert failed: ${complianceInsert.error.message}`);
    }
  }

  const incidentExisting = await adminClient
    .from("incident_reports")
    .select("id")
    .ilike("title", "Enterprise Seed:%")
    .limit(4);

  if (incidentExisting.error) {
    throw new Error(`incident_reports read failed: ${incidentExisting.error.message}`);
  }

  if ((incidentExisting.data || []).length === 0) {
    const incidentInsert = await adminClient.from("incident_reports").insert([
      {
        title: "Enterprise Seed: Delayed consult join",
        description: "Provider joined consultation room with a short delay.",
        severity: "low",
        status: "resolved",
        opened_by: adminId,
        assigned_to: providerId,
        appointment_id: appointments[0]?.id ?? null,
        opened_at: nowIso,
        resolved_at: nowIso,
        resolution_notes: "Resolved after route health verification.",
      },
      {
        title: "Enterprise Seed: Notification dispatch lag",
        description: "One notification dispatched with delay for test scenario.",
        severity: "medium",
        status: "in_progress",
        opened_by: adminId,
        assigned_to: providerId,
        appointment_id: appointments[1]?.id ?? null,
        opened_at: nowIso,
      },
      {
        title: "Enterprise Seed: Billing reconciliation mismatch",
        description: "Invoice and claim status mismatch detected in periodic audit.",
        severity: "high",
        status: "open",
        opened_by: adminId,
        assigned_to: providerId,
        appointment_id: appointments[2]?.id ?? null,
        opened_at: nowIso,
      },
    ]);

    if (incidentInsert.error) {
      throw new Error(`incident_reports insert failed: ${incidentInsert.error.message}`);
    }
  }

  const permissionUpsert = await adminClient.from("role_permissions").upsert(
    {
      role: "admin",
      permission_key: "release.manage",
      description: "Manage staged release promotion",
    },
    { onConflict: "role,permission_key" },
  );

  if (permissionUpsert.error) {
    throw new Error(`role_permissions upsert failed: ${permissionUpsert.error.message}`);
  }

  const existingMessages = await providerClient
    .from("messages")
    .select("id")
    .eq("sender_id", providerId)
    .eq("recipient_id", patientId)
    .limit(8);

  if (existingMessages.error) {
    throw new Error(`messages read failed: ${existingMessages.error.message}`);
  }

  if ((existingMessages.data || []).length === 0) {
    const messageInsert = await providerClient.from("messages").insert([
      {
        appointment_id: appointments[0]?.id ?? appointments[1]?.id,
        sender_id: providerId,
        recipient_id: patientId,
        body: "Please complete pre-visit checklist 15 minutes before your consult.",
      },
      {
        appointment_id: appointments[1]?.id ?? appointments[0]?.id,
        sender_id: providerId,
        recipient_id: patientId,
        body: "I reviewed your latest symptom timeline and medication list before consult.",
      },
      {
        appointment_id: appointments[2]?.id ?? appointments[0]?.id,
        sender_id: providerId,
        recipient_id: patientId,
        body: "Lab order added. Upload reports in portal once available.",
      },
    ]);

    if (messageInsert.error) {
      throw new Error(`messages insert failed: ${messageInsert.error.message}`);
    }
  }

  const existingAudit = await adminClient
    .from("audit_logs")
    .select("id")
    .ilike("action", "seed.%")
    .limit(5);

  if (existingAudit.error) {
    throw new Error(`audit_logs read failed: ${existingAudit.error.message}`);
  }

  if ((existingAudit.data || []).length === 0) {
    const auditInsert = await adminClient.from("audit_logs").insert([
      {
        actor_id: adminId,
        action: "seed.data_initialized",
        entity_type: "seed",
        metadata: { total_seed_appointments: appointments.length },
      },
      {
        actor_id: providerId,
        action: "seed.provider_reviewed_queue",
        entity_type: "appointments",
        entity_id: appointments[0]?.id ?? null,
        metadata: { queue_status: "reviewed" },
      },
      {
        actor_id: patientId,
        action: "seed.patient_checked_notifications",
        entity_type: "notification_events",
        metadata: { unread_remaining: 2 },
      },
    ]);

    if (auditInsert.error) {
      throw new Error(`audit_logs insert failed: ${auditInsert.error.message}`);
    }
  }
}

async function verifyPatientFlow(patientClient, patientId) {
  const [providers, appointments, sessions, invoices, claims, notifications, messages] = await Promise.all([
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
    patientClient
      .from("claim_submissions")
      .select("id,appointment_id,status,amount_claimed")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false })
      .limit(20),
    patientClient
      .from("notification_events")
      .select("id,status,title,created_at")
      .eq("recipient_id", patientId)
      .order("created_at", { ascending: false })
      .limit(30),
    patientClient
      .from("messages")
      .select("id,appointment_id,body,created_at")
      .or(`sender_id.eq.${patientId},recipient_id.eq.${patientId}`)
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  if (providers.error) throw new Error(`patient providers read failed: ${providers.error.message}`);
  if (appointments.error) throw new Error(`patient appointments read failed: ${appointments.error.message}`);
  if (sessions.error && !isMissingRelationError(sessions.error)) {
    throw new Error(`patient sessions read failed: ${sessions.error.message}`);
  }
  if (invoices.error && !isMissingRelationError(invoices.error)) {
    throw new Error(`patient invoices read failed: ${invoices.error.message}`);
  }
  if (claims.error && !isMissingRelationError(claims.error)) {
    throw new Error(`patient claims read failed: ${claims.error.message}`);
  }
  if (notifications.error && !isMissingRelationError(notifications.error)) {
    throw new Error(`patient notifications read failed: ${notifications.error.message}`);
  }
  if (messages.error && !isMissingRelationError(messages.error)) {
    throw new Error(`patient messages read failed: ${messages.error.message}`);
  }

  const sessionData = sessions.error ? [] : sessions.data || [];
  const invoiceData = invoices.error ? [] : invoices.data || [];
  const claimData = claims.error ? [] : claims.data || [];
  const notificationData = notifications.error ? [] : notifications.data || [];
  const messageData = messages.error ? [] : messages.data || [];

  return {
    providerCount: (providers.data || []).length,
    appointmentCount: (appointments.data || []).length,
    consultationCount: sessionData.length,
    invoiceCount: invoiceData.length,
    claimCount: claimData.length,
    notificationCount: notificationData.length,
    messageCount: messageData.length,
    sampleAppointments: (appointments.data || []).slice(0, 5),
    sampleConsultations: sessionData.slice(0, 5),
    sampleInvoices: invoiceData.slice(0, 3),
    sampleClaims: claimData.slice(0, 3),
    sampleNotifications: notificationData.slice(0, 3),
    sampleMessages: messageData.slice(0, 3),
  };
}

async function verifyProviderFlow(providerClient, providerId) {
  const [queue, sessions, notes, careOrders, claims, notifications, incidents, messages] = await Promise.all([
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
    providerClient
      .from("claim_submissions")
      .select("id,appointment_id,status,amount_claimed")
      .eq("provider_id", providerId)
      .order("created_at", { ascending: false })
      .limit(20),
    providerClient
      .from("notification_events")
      .select("id,status,title,recipient_id,created_at")
      .or(`sender_id.eq.${providerId},recipient_id.eq.${providerId}`)
      .order("created_at", { ascending: false })
      .limit(30),
    providerClient
      .from("incident_reports")
      .select("id,status,severity,title")
      .or(`opened_by.eq.${providerId},assigned_to.eq.${providerId}`)
      .order("created_at", { ascending: false })
      .limit(20),
    providerClient
      .from("messages")
      .select("id,appointment_id,body,created_at")
      .or(`sender_id.eq.${providerId},recipient_id.eq.${providerId}`)
      .order("created_at", { ascending: false })
      .limit(30),
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
  if (claims.error && !isMissingRelationError(claims.error)) {
    throw new Error(`provider claims read failed: ${claims.error.message}`);
  }
  if (notifications.error && !isMissingRelationError(notifications.error)) {
    throw new Error(`provider notifications read failed: ${notifications.error.message}`);
  }
  if (incidents.error && !isMissingRelationError(incidents.error)) {
    throw new Error(`provider incidents read failed: ${incidents.error.message}`);
  }
  if (messages.error && !isMissingRelationError(messages.error)) {
    throw new Error(`provider messages read failed: ${messages.error.message}`);
  }

  const sessionData = sessions.error ? [] : sessions.data || [];
  const noteData = notes.error ? [] : notes.data || [];
  const careOrderData = careOrders.error ? [] : careOrders.data || [];
  const claimData = claims.error ? [] : claims.data || [];
  const notificationData = notifications.error ? [] : notifications.data || [];
  const incidentData = incidents.error ? [] : incidents.data || [];
  const messageData = messages.error ? [] : messages.data || [];

  return {
    queueCount: (queue.data || []).length,
    consultationCount: sessionData.length,
    noteCount: noteData.length,
    careOrderCount: careOrderData.length,
    claimCount: claimData.length,
    notificationCount: notificationData.length,
    incidentCount: incidentData.length,
    messageCount: messageData.length,
    sampleQueue: (queue.data || []).slice(0, 5),
    sampleConsultations: sessionData.slice(0, 5),
    sampleNotes: noteData.slice(0, 3),
    sampleClaims: claimData.slice(0, 3),
    sampleNotifications: notificationData.slice(0, 3),
    sampleMessages: messageData.slice(0, 3),
  };
}

async function verifyAdminFlow(adminClient) {
  const [profiles, appointments, sessions, notes, invoices, claims, compliance, incidents, permissions, notifications] = await Promise.all([
    adminClient.from("profiles").select("id,role", { count: "exact" }),
    adminClient.from("appointments").select("id,status", { count: "exact" }),
    adminClient.from("consultation_sessions").select("id,status", { count: "exact" }),
    adminClient.from("encounter_notes").select("id,status", { count: "exact" }),
    adminClient.from("billing_invoices").select("id,status,amount", { count: "exact" }),
    adminClient.from("claim_submissions").select("id,status,amount_claimed", { count: "exact" }),
    adminClient.from("compliance_events").select("id,risk_level,is_resolved", { count: "exact" }),
    adminClient.from("incident_reports").select("id,status,severity", { count: "exact" }),
    adminClient.from("role_permissions").select("id,role,permission_key", { count: "exact" }),
    adminClient.from("notification_events").select("id,status,channel", { count: "exact" }),
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
  if (claims.error && !isMissingRelationError(claims.error)) {
    throw new Error(`admin claims read failed: ${claims.error.message}`);
  }
  if (compliance.error && !isMissingRelationError(compliance.error)) {
    throw new Error(`admin compliance read failed: ${compliance.error.message}`);
  }
  if (incidents.error && !isMissingRelationError(incidents.error)) {
    throw new Error(`admin incidents read failed: ${incidents.error.message}`);
  }
  if (permissions.error && !isMissingRelationError(permissions.error)) {
    throw new Error(`admin role permissions read failed: ${permissions.error.message}`);
  }
  if (notifications.error && !isMissingRelationError(notifications.error)) {
    throw new Error(`admin notifications read failed: ${notifications.error.message}`);
  }

  const sessionData = sessions.error ? [] : sessions.data || [];
  const noteData = notes.error ? [] : notes.data || [];
  const invoiceData = invoices.error ? [] : invoices.data || [];
  const claimData = claims.error ? [] : claims.data || [];
  const complianceData = compliance.error ? [] : compliance.data || [];
  const incidentData = incidents.error ? [] : incidents.data || [];
  const permissionData = permissions.error ? [] : permissions.data || [];
  const notificationData = notifications.error ? [] : notifications.data || [];

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

  const claimStatusCounts = claimData.reduce(
    (acc, row) => {
      const status = row.status || "unknown";
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    },
    {},
  );

  const openComplianceCount = complianceData.filter((row) => !row.is_resolved).length;
  const openIncidentCount = incidentData.filter(
    (row) => row.status === "open" || row.status === "in_progress",
  ).length;
  const unreadNotifications = notificationData.filter((row) => row.status !== "read").length;

  return {
    totalProfiles: profiles.count || (profiles.data || []).length,
    totalAppointments: appointments.count || (appointments.data || []).length,
    totalConsultations: sessions.error ? 0 : sessions.count || sessionData.length,
    totalEncounterNotes: notes.error ? 0 : notes.count || noteData.length,
    totalInvoices: invoices.error ? 0 : invoices.count || invoiceData.length,
    totalClaims: claims.error ? 0 : claims.count || claimData.length,
    totalComplianceEvents: compliance.error ? 0 : compliance.count || complianceData.length,
    totalIncidents: incidents.error ? 0 : incidents.count || incidentData.length,
    totalRolePermissions: permissions.error ? 0 : permissions.count || permissionData.length,
    totalNotifications: notifications.error ? 0 : notifications.count || notificationData.length,
    roleCounts,
    appointmentStatusCounts,
    consultationStatusCounts,
    invoiceStatusCounts,
    claimStatusCounts,
    openComplianceCount,
    openIncidentCount,
    unreadNotifications,
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
  await ensureMeetingLinks(provider.client, provider.user.id, seedAppointments);
  let clinicalSeeded = true;
  let clinicalWarning = null;
  try {
    await ensureClinicalArtifacts(provider.client, patient.user.id, provider.user.id, seedAppointments);
  } catch (error) {
    if (isMissingRelationError(error)) {
      clinicalSeeded = false;
      clinicalWarning =
        "Clinical tables are not present yet. Run supabase/migrations/0002_phase_a_clinical_core.sql and rerun seed.";
    } else {
      throw error;
    }
  }

  let operationsSeeded = true;
  let operationsWarning = null;
  try {
    await ensureOperationsArtifacts(
      provider.client,
      admin.client,
      patient.user.id,
      provider.user.id,
      admin.user.id,
      seedAppointments,
    );
  } catch (error) {
    if (isMissingRelationError(error)) {
      operationsSeeded = false;
      operationsWarning =
        "Operations tables are not present yet. Run supabase/migrations/0003_phase_bcd_foundations.sql and rerun seed.";
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
        clinical: {
          seeded: clinicalSeeded,
          warning: clinicalWarning,
        },
        operations: {
          seeded: operationsSeeded,
          warning: operationsWarning,
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
