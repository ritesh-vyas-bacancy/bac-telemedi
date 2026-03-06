"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth/session";
import { buildMeetingRoom, buildMeetingUrl } from "@/lib/telemedicine/meeting";

const APPOINTMENT_STATUS = ["booked", "in_progress", "completed", "cancelled", "no_show"] as const;
type AppointmentStatus = (typeof APPOINTMENT_STATUS)[number];

const CONSULTATION_STATUS = [
  "scheduled",
  "checked_in",
  "ready",
  "in_consult",
  "completed",
  "cancelled",
] as const;
type ConsultationStatus = (typeof CONSULTATION_STATUS)[number];

const CARE_ORDER_TYPES = ["lab", "imaging", "follow_up", "lifestyle", "other"] as const;
type CareOrderType = (typeof CARE_ORDER_TYPES)[number];

const CLAIM_STATUS = ["draft", "submitted", "under_review", "approved", "rejected", "paid"] as const;
type ClaimStatus = (typeof CLAIM_STATUS)[number];

const NOTIFICATION_CHANNEL = ["in_app", "email", "sms", "whatsapp"] as const;
type NotificationChannel = (typeof NOTIFICATION_CHANNEL)[number];

const COMPLIANCE_RISK = ["low", "medium", "high", "critical"] as const;
type ComplianceRisk = (typeof COMPLIANCE_RISK)[number];

const INCIDENT_SEVERITY = ["low", "medium", "high", "critical"] as const;
type IncidentSeverity = (typeof INCIDENT_SEVERITY)[number];

const INCIDENT_STATUS = ["open", "in_progress", "resolved", "closed"] as const;
type IncidentStatus = (typeof INCIDENT_STATUS)[number];

function isAppointmentStatus(value: string): value is AppointmentStatus {
  return APPOINTMENT_STATUS.includes(value as AppointmentStatus);
}

function isConsultationStatus(value: string): value is ConsultationStatus {
  return CONSULTATION_STATUS.includes(value as ConsultationStatus);
}

function isCareOrderType(value: string): value is CareOrderType {
  return CARE_ORDER_TYPES.includes(value as CareOrderType);
}

function isClaimStatus(value: string): value is ClaimStatus {
  return CLAIM_STATUS.includes(value as ClaimStatus);
}

function isNotificationChannel(value: string): value is NotificationChannel {
  return NOTIFICATION_CHANNEL.includes(value as NotificationChannel);
}

function isComplianceRisk(value: string): value is ComplianceRisk {
  return COMPLIANCE_RISK.includes(value as ComplianceRisk);
}

function isIncidentSeverity(value: string): value is IncidentSeverity {
  return INCIDENT_SEVERITY.includes(value as IncidentSeverity);
}

function isIncidentStatus(value: string): value is IncidentStatus {
  return INCIDENT_STATUS.includes(value as IncidentStatus);
}

function safePath(path: string | null) {
  if (!path || !path.startsWith("/")) return "/workspace";
  return path;
}

function safeAmount(value: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.round(parsed * 100) / 100;
}

function safeWeekday(value: string) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 6) return null;
  return parsed;
}

function safeText(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text.length > 0 ? text : null;
}

function appointmentStatusFromConsultation(nextStatus: ConsultationStatus): AppointmentStatus {
  if (nextStatus === "in_consult") return "in_progress";
  if (nextStatus === "completed") return "completed";
  if (nextStatus === "cancelled") return "cancelled";
  return "booked";
}

async function getScopedAppointment(
  appointmentId: string,
  returnTo: string,
  role: "patient" | "provider" | "admin",
) {
  const { supabase, user, profile } = await requireProfile(returnTo);

  const { data: appointment, error } = await supabase
    .from("appointments")
    .select("id,patient_id,provider_id,status")
    .eq("id", appointmentId)
    .single();

  if (error || !appointment) {
    redirect(`${returnTo}?error=${encodeURIComponent(error?.message ?? "Appointment not found.")}`);
  }

  if (profile.role !== "admin") {
    if (role === "patient" && appointment.patient_id !== user.id) {
      redirect(`${returnTo}?error=${encodeURIComponent("You cannot access this appointment.")}`);
    }
    if (role === "provider" && appointment.provider_id !== user.id) {
      redirect(`${returnTo}?error=${encodeURIComponent("You cannot access this appointment.")}`);
    }
  }

  return { supabase, user, profile, appointment };
}

export async function bookAppointmentAction(formData: FormData) {
  const returnTo = safePath(String(formData.get("return_to") ?? "/workspace/patient/booking"));
  const providerId = String(formData.get("provider_id") ?? "");
  const scheduledAt = String(formData.get("scheduled_at") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  const amount = safeAmount(String(formData.get("invoice_amount") ?? "499"));

  const { supabase, user, profile } = await requireProfile(returnTo);

  if (profile.role !== "patient" && profile.role !== "admin") {
    redirect(`${returnTo}?error=${encodeURIComponent("Only patient role can book appointments.")}`);
  }

  if (!providerId || !scheduledAt) {
    redirect(`${returnTo}?error=${encodeURIComponent("Provider and appointment time are required.")}`);
  }

  const { data: appointment, error } = await supabase
    .from("appointments")
    .insert({
      patient_id: user.id,
      provider_id: providerId,
      scheduled_at: new Date(scheduledAt).toISOString(),
      duration_minutes: 30,
      reason: reason || null,
      status: "booked",
    })
    .select("id")
    .single();

  if (error || !appointment) {
    redirect(
      `${returnTo}?error=${encodeURIComponent(
        error?.message ?? "Could not create appointment. Check database schema/policies.",
      )}`,
    );
  }

  const meetingUrl = buildMeetingUrl(appointment.id);

  await supabase
    .from("appointments")
    .update({ meeting_url: meetingUrl })
    .eq("id", appointment.id);

  await supabase.from("consultation_sessions").upsert(
    {
      appointment_id: appointment.id,
      patient_id: user.id,
      provider_id: providerId,
      status: "scheduled",
      room_name: buildMeetingRoom(appointment.id),
    },
    { onConflict: "appointment_id" },
  );

  if (amount !== null) {
    await supabase.from("billing_invoices").insert({
      appointment_id: appointment.id,
      patient_id: user.id,
      provider_id: providerId,
      amount,
      currency: "INR",
      status: "pending",
    });
  }

  await supabase.from("audit_logs").insert({
    actor_id: user.id,
    action: "appointment.booked",
    entity_type: "appointments",
    entity_id: appointment.id,
    metadata: {
      provider_id: providerId,
      scheduled_at: scheduledAt,
      meeting_url: meetingUrl,
    },
  });

  revalidatePath(returnTo);
  redirect(`${returnTo}?success=${encodeURIComponent("Appointment booked successfully.")}`);
}

export async function patientCheckInAction(formData: FormData) {
  const returnTo = safePath(String(formData.get("return_to") ?? "/workspace/patient/visits"));
  const appointmentId = String(formData.get("appointment_id") ?? "");

  if (!appointmentId) {
    redirect(`${returnTo}?error=${encodeURIComponent("Appointment id is required.")}`);
  }

  const { supabase, user, profile, appointment } = await getScopedAppointment(appointmentId, returnTo, "patient");

  if (profile.role !== "patient" && profile.role !== "admin") {
    redirect(`${returnTo}?error=${encodeURIComponent("Only patient role can check in.")}`);
  }

  const nowIso = new Date().toISOString();

  const { error: upsertError } = await supabase.from("consultation_sessions").upsert(
    {
      appointment_id: appointment.id,
      patient_id: appointment.patient_id,
      provider_id: appointment.provider_id,
      status: "checked_in",
      patient_ready_at: nowIso,
    },
    { onConflict: "appointment_id" },
  );

  if (upsertError) {
    redirect(`${returnTo}?error=${encodeURIComponent(upsertError.message)}`);
  }

  await supabase.from("audit_logs").insert({
    actor_id: user.id,
    action: "consultation.patient_checked_in",
    entity_type: "consultation_sessions",
    entity_id: appointment.id,
    metadata: {
      appointment_id: appointment.id,
      checked_in_at: nowIso,
    },
  });

  revalidatePath(returnTo);
  redirect(`${returnTo}?success=${encodeURIComponent("You are checked in. Please wait for provider.")}`);
}

export async function updateAppointmentStatusAction(formData: FormData) {
  const returnTo = safePath(String(formData.get("return_to") ?? "/workspace/provider/dashboard"));
  const appointmentId = String(formData.get("appointment_id") ?? "");
  const nextStatus = String(formData.get("status") ?? "");

  const { supabase, user, profile } = await requireProfile(returnTo);

  if (profile.role !== "provider" && profile.role !== "admin") {
    redirect(`${returnTo}?error=${encodeURIComponent("Only provider role can update appointment status.")}`);
  }

  if (!appointmentId || !isAppointmentStatus(nextStatus)) {
    redirect(`${returnTo}?error=${encodeURIComponent("Invalid appointment update request.")}`);
  }

  const baseQuery = supabase
    .from("appointments")
    .update({ status: nextStatus })
    .eq("id", appointmentId);

  const scopedQuery = profile.role === "provider" ? baseQuery.eq("provider_id", user.id) : baseQuery;

  const { data: updated, error } = await scopedQuery.select("id").single();

  if (error || !updated) {
    redirect(
      `${returnTo}?error=${encodeURIComponent(
        error?.message ?? "Could not update appointment status. Check permissions.",
      )}`,
    );
  }

  await supabase.from("audit_logs").insert({
    actor_id: user.id,
    action: "appointment.status_updated",
    entity_type: "appointments",
    entity_id: appointmentId,
    metadata: {
      status: nextStatus,
    },
  });

  revalidatePath(returnTo);
  redirect(`${returnTo}?success=${encodeURIComponent(`Appointment status updated to ${nextStatus}.`)}`);
}

export async function updateConsultationStatusAction(formData: FormData) {
  const returnTo = safePath(String(formData.get("return_to") ?? "/workspace/provider/dashboard"));
  const appointmentId = String(formData.get("appointment_id") ?? "");
  const nextStatus = String(formData.get("status") ?? "");

  if (!appointmentId || !isConsultationStatus(nextStatus)) {
    redirect(`${returnTo}?error=${encodeURIComponent("Invalid consultation status update request.")}`);
  }

  const { supabase, user, profile, appointment } = await getScopedAppointment(appointmentId, returnTo, "provider");

  if (profile.role !== "provider" && profile.role !== "admin") {
    redirect(`${returnTo}?error=${encodeURIComponent("Only provider role can update consultation status.")}`);
  }

  const nowIso = new Date().toISOString();

  const payload: {
    appointment_id: string;
    patient_id: string;
    provider_id: string;
    status: ConsultationStatus;
    patient_ready_at?: string | null;
    provider_ready_at?: string | null;
    started_at?: string | null;
    ended_at?: string | null;
  } = {
    appointment_id: appointment.id,
    patient_id: appointment.patient_id,
    provider_id: appointment.provider_id,
    status: nextStatus,
  };

  if (nextStatus === "ready") {
    payload.provider_ready_at = nowIso;
  }
  if (nextStatus === "in_consult") {
    payload.provider_ready_at = nowIso;
    payload.started_at = nowIso;
  }
  if (nextStatus === "completed" || nextStatus === "cancelled") {
    payload.ended_at = nowIso;
  }

  const { error: consultationError } = await supabase
    .from("consultation_sessions")
    .upsert(payload, { onConflict: "appointment_id" });

  if (consultationError) {
    redirect(`${returnTo}?error=${encodeURIComponent(consultationError.message)}`);
  }

  const mappedAppointmentStatus = appointmentStatusFromConsultation(nextStatus);

  const { error: appointmentError } = await supabase
    .from("appointments")
    .update({ status: mappedAppointmentStatus })
    .eq("id", appointment.id);

  if (appointmentError) {
    redirect(`${returnTo}?error=${encodeURIComponent(appointmentError.message)}`);
  }

  await supabase.from("audit_logs").insert({
    actor_id: user.id,
    action: "consultation.status_updated",
    entity_type: "consultation_sessions",
    entity_id: appointment.id,
    metadata: {
      appointment_id: appointment.id,
      consultation_status: nextStatus,
      appointment_status: mappedAppointmentStatus,
    },
  });

  revalidatePath(returnTo);
  redirect(`${returnTo}?success=${encodeURIComponent(`Consultation moved to ${nextStatus}.`)}`);
}

export async function addAvailabilityAction(formData: FormData) {
  const returnTo = safePath(String(formData.get("return_to") ?? "/workspace/provider/schedule"));
  const weekday = safeWeekday(String(formData.get("weekday") ?? ""));
  const startTime = String(formData.get("start_time") ?? "");
  const endTime = String(formData.get("end_time") ?? "");
  const slotMinutes = Number(formData.get("slot_minutes") ?? "30");
  const timezone = String(formData.get("timezone") ?? "Asia/Kolkata");

  const { supabase, user, profile } = await requireProfile(returnTo);

  if (profile.role !== "provider" && profile.role !== "admin") {
    redirect(`${returnTo}?error=${encodeURIComponent("Only provider role can manage availability.")}`);
  }

  if (weekday === null || !startTime || !endTime || !Number.isFinite(slotMinutes)) {
    redirect(`${returnTo}?error=${encodeURIComponent("Invalid availability input.")}`);
  }

  const payload = {
    provider_id: profile.role === "admin" ? String(formData.get("provider_id") ?? user.id) : user.id,
    weekday,
    start_time: startTime,
    end_time: endTime,
    slot_minutes: slotMinutes,
    timezone,
    is_active: true,
  };

  const { error } = await supabase.from("provider_availability").insert(payload);

  if (error) {
    redirect(`${returnTo}?error=${encodeURIComponent(error.message)}`);
  }

  await supabase.from("audit_logs").insert({
    actor_id: user.id,
    action: "provider.availability_added",
    entity_type: "provider_availability",
    metadata: payload,
  });

  revalidatePath(returnTo);
  redirect(`${returnTo}?success=${encodeURIComponent("Availability slot added.")}`);
}

export async function saveEncounterNoteAction(formData: FormData) {
  const returnTo = safePath(String(formData.get("return_to") ?? "/workspace/provider/patients"));
  const appointmentId = String(formData.get("appointment_id") ?? "");
  const subjective = String(formData.get("subjective") ?? "").trim();
  const objective = String(formData.get("objective") ?? "").trim();
  const assessment = String(formData.get("assessment") ?? "").trim();
  const plan = String(formData.get("plan") ?? "").trim();

  if (!appointmentId) {
    redirect(`${returnTo}?error=${encodeURIComponent("Appointment id is required.")}`);
  }

  const { supabase, user, profile, appointment } = await getScopedAppointment(appointmentId, returnTo, "provider");

  if (profile.role !== "provider" && profile.role !== "admin") {
    redirect(`${returnTo}?error=${encodeURIComponent("Only provider role can save clinical notes.")}`);
  }

  const { data: existingNote } = await supabase
    .from("encounter_notes")
    .select("id,status")
    .eq("appointment_id", appointment.id)
    .maybeSingle();

  if (existingNote?.status === "signed") {
    redirect(`${returnTo}?error=${encodeURIComponent("Signed notes are locked. Create a new encounter.")}`);
  }

  const { data: session } = await supabase
    .from("consultation_sessions")
    .select("id")
    .eq("appointment_id", appointment.id)
    .maybeSingle();

  const { error } = await supabase.from("encounter_notes").upsert(
    {
      appointment_id: appointment.id,
      consultation_session_id: session?.id ?? null,
      patient_id: appointment.patient_id,
      provider_id: appointment.provider_id,
      subjective,
      objective,
      assessment,
      plan,
      status: "draft",
      signed_at: null,
      signed_by: null,
    },
    { onConflict: "appointment_id" },
  );

  if (error) {
    redirect(`${returnTo}?error=${encodeURIComponent(error.message)}`);
  }

  await supabase.from("audit_logs").insert({
    actor_id: user.id,
    action: "encounter.note_saved",
    entity_type: "encounter_notes",
    entity_id: appointment.id,
    metadata: {
      appointment_id: appointment.id,
    },
  });

  revalidatePath(returnTo);
  redirect(`${returnTo}?success=${encodeURIComponent("Clinical note saved as draft.")}`);
}

export async function signEncounterNoteAction(formData: FormData) {
  const returnTo = safePath(String(formData.get("return_to") ?? "/workspace/provider/patients"));
  const appointmentId = String(formData.get("appointment_id") ?? "");

  if (!appointmentId) {
    redirect(`${returnTo}?error=${encodeURIComponent("Appointment id is required.")}`);
  }

  const { supabase, user, profile, appointment } = await getScopedAppointment(appointmentId, returnTo, "provider");

  if (profile.role !== "provider" && profile.role !== "admin") {
    redirect(`${returnTo}?error=${encodeURIComponent("Only provider role can sign clinical notes.")}`);
  }

  const nowIso = new Date().toISOString();

  const { data: note, error: noteError } = await supabase
    .from("encounter_notes")
    .select("id,status")
    .eq("appointment_id", appointment.id)
    .maybeSingle();

  if (noteError || !note) {
    redirect(`${returnTo}?error=${encodeURIComponent(noteError?.message ?? "No draft note found to sign.")}`);
  }

  if (note.status === "signed") {
    redirect(`${returnTo}?error=${encodeURIComponent("Encounter note is already signed.")}`);
  }

  const { error } = await supabase
    .from("encounter_notes")
    .update({
      status: "signed",
      signed_at: nowIso,
      signed_by: user.id,
    })
    .eq("id", note.id);

  if (error) {
    redirect(`${returnTo}?error=${encodeURIComponent(error.message)}`);
  }

  await supabase.from("consultation_sessions").upsert(
    {
      appointment_id: appointment.id,
      patient_id: appointment.patient_id,
      provider_id: appointment.provider_id,
      status: "completed",
      ended_at: nowIso,
    },
    { onConflict: "appointment_id" },
  );

  await supabase
    .from("appointments")
    .update({ status: "completed" })
    .eq("id", appointment.id);

  await supabase.from("audit_logs").insert({
    actor_id: user.id,
    action: "encounter.note_signed",
    entity_type: "encounter_notes",
    entity_id: note.id,
    metadata: {
      appointment_id: appointment.id,
      signed_at: nowIso,
    },
  });

  revalidatePath(returnTo);
  redirect(`${returnTo}?success=${encodeURIComponent("Encounter note signed and consultation completed.")}`);
}

export async function issuePrescriptionAction(formData: FormData) {
  const returnTo = safePath(String(formData.get("return_to") ?? "/workspace/provider/patients"));
  const appointmentId = String(formData.get("appointment_id") ?? "");
  const medicationName = String(formData.get("medication_name") ?? "").trim();
  const dosage = String(formData.get("dosage") ?? "").trim();
  const instructions = String(formData.get("instructions") ?? "").trim();

  if (!appointmentId || !medicationName || !dosage) {
    redirect(`${returnTo}?error=${encodeURIComponent("Appointment, medication name, and dosage are required.")}`);
  }

  const { supabase, user, profile, appointment } = await getScopedAppointment(appointmentId, returnTo, "provider");

  if (profile.role !== "provider" && profile.role !== "admin") {
    redirect(`${returnTo}?error=${encodeURIComponent("Only provider role can issue prescriptions.")}`);
  }

  const { data: prescription, error } = await supabase
    .from("prescriptions")
    .insert({
      appointment_id: appointment.id,
      patient_id: appointment.patient_id,
      provider_id: appointment.provider_id,
      medication_name: medicationName,
      dosage,
      instructions: instructions || null,
      status: "sent",
    })
    .select("id")
    .single();

  if (error || !prescription) {
    redirect(`${returnTo}?error=${encodeURIComponent(error?.message ?? "Unable to issue prescription.")}`);
  }

  await supabase.from("audit_logs").insert({
    actor_id: user.id,
    action: "prescription.issued",
    entity_type: "prescriptions",
    entity_id: prescription.id,
    metadata: {
      appointment_id: appointment.id,
      medication_name: medicationName,
    },
  });

  revalidatePath(returnTo);
  redirect(`${returnTo}?success=${encodeURIComponent("Prescription issued successfully.")}`);
}

export async function createCareOrderAction(formData: FormData) {
  const returnTo = safePath(String(formData.get("return_to") ?? "/workspace/provider/patients"));
  const appointmentId = String(formData.get("appointment_id") ?? "");
  const orderType = String(formData.get("order_type") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const details = String(formData.get("details") ?? "").trim();
  const dueDate = String(formData.get("due_date") ?? "").trim();

  if (!appointmentId || !isCareOrderType(orderType) || !title) {
    redirect(`${returnTo}?error=${encodeURIComponent("Appointment, order type, and title are required.")}`);
  }

  const { supabase, user, profile, appointment } = await getScopedAppointment(appointmentId, returnTo, "provider");

  if (profile.role !== "provider" && profile.role !== "admin") {
    redirect(`${returnTo}?error=${encodeURIComponent("Only provider role can create care orders.")}`);
  }

  const { data: order, error } = await supabase
    .from("care_orders")
    .insert({
      appointment_id: appointment.id,
      patient_id: appointment.patient_id,
      provider_id: appointment.provider_id,
      order_type: orderType,
      title,
      details: details || null,
      due_date: dueDate || null,
      status: "open",
    })
    .select("id")
    .single();

  if (error || !order) {
    redirect(`${returnTo}?error=${encodeURIComponent(error?.message ?? "Unable to create care order.")}`);
  }

  await supabase.from("audit_logs").insert({
    actor_id: user.id,
    action: "care_order.created",
    entity_type: "care_orders",
    entity_id: order.id,
    metadata: {
      appointment_id: appointment.id,
      order_type: orderType,
      title,
    },
  });

  revalidatePath(returnTo);
  redirect(`${returnTo}?success=${encodeURIComponent("Care order created successfully.")}`);
}

export async function markInvoicePaidAction(formData: FormData) {
  const returnTo = safePath(String(formData.get("return_to") ?? "/workspace/patient/visits"));
  const invoiceId = String(formData.get("invoice_id") ?? "");

  if (!invoiceId) {
    redirect(`${returnTo}?error=${encodeURIComponent("Invoice id is required.")}`);
  }

  const { supabase, user, profile } = await requireProfile(returnTo);

  const { data: invoice, error: invoiceError } = await supabase
    .from("billing_invoices")
    .select("id,patient_id,status")
    .eq("id", invoiceId)
    .single();

  if (invoiceError || !invoice) {
    redirect(`${returnTo}?error=${encodeURIComponent(invoiceError?.message ?? "Invoice not found.")}`);
  }

  if (profile.role !== "admin" && invoice.patient_id !== user.id) {
    redirect(`${returnTo}?error=${encodeURIComponent("You cannot update this invoice.")}`);
  }

  const nowIso = new Date().toISOString();

  const { error } = await supabase
    .from("billing_invoices")
    .update({
      status: "paid",
      paid_at: nowIso,
      gateway_reference: `SIMULATED_${Date.now()}`,
    })
    .eq("id", invoice.id);

  if (error) {
    redirect(`${returnTo}?error=${encodeURIComponent(error.message)}`);
  }

  await supabase.from("audit_logs").insert({
    actor_id: user.id,
    action: "billing.invoice_paid",
    entity_type: "billing_invoices",
    entity_id: invoice.id,
    metadata: {
      paid_at: nowIso,
      previous_status: invoice.status,
    },
  });

  revalidatePath(returnTo);
  redirect(`${returnTo}?success=${encodeURIComponent("Payment marked successful (demo mode).")}`);
}

export async function submitClaimAction(formData: FormData) {
  const returnTo = safePath(String(formData.get("return_to") ?? "/workspace/provider/dashboard"));
  const appointmentId = String(formData.get("appointment_id") ?? "");
  const payerName = String(formData.get("payer_name") ?? "Self-pay").trim() || "Self-pay";
  const amountClaimed = safeAmount(String(formData.get("amount_claimed") ?? ""));
  const claimReference = safeText(formData.get("claim_reference"));

  if (!appointmentId || amountClaimed === null) {
    redirect(`${returnTo}?error=${encodeURIComponent("Appointment and amount are required for claim submission.")}`);
  }

  const { supabase, user, profile, appointment } = await getScopedAppointment(appointmentId, returnTo, "provider");

  if (profile.role !== "provider" && profile.role !== "admin") {
    redirect(`${returnTo}?error=${encodeURIComponent("Only provider role can submit claims.")}`);
  }

  const nowIso = new Date().toISOString();

  const { data: claim, error } = await supabase
    .from("claim_submissions")
    .upsert(
      {
        appointment_id: appointment.id,
        patient_id: appointment.patient_id,
        provider_id: appointment.provider_id,
        payer_name: payerName,
        amount_claimed: amountClaimed,
        status: "submitted",
        claim_reference: claimReference,
        submitted_at: nowIso,
      },
      { onConflict: "appointment_id" },
    )
    .select("id,status")
    .single();

  if (error || !claim) {
    redirect(`${returnTo}?error=${encodeURIComponent(error?.message ?? "Unable to submit claim.")}`);
  }

  await supabase.from("notification_events").insert({
    recipient_id: appointment.patient_id,
    sender_id: user.id,
    appointment_id: appointment.id,
    title: "Claim submitted",
    message: `Claim has been submitted for your consultation (${payerName}).`,
    channel: "in_app",
    status: "sent",
    sent_at: nowIso,
    metadata: {
      claim_id: claim.id,
      amount_claimed: amountClaimed,
    },
  });

  await supabase.from("audit_logs").insert({
    actor_id: user.id,
    action: "claim.submitted",
    entity_type: "claim_submissions",
    entity_id: claim.id,
    metadata: {
      appointment_id: appointment.id,
      amount_claimed: amountClaimed,
      payer_name: payerName,
    },
  });

  revalidatePath(returnTo);
  redirect(`${returnTo}?success=${encodeURIComponent("Claim submitted successfully.")}`);
}

export async function updateClaimStatusAction(formData: FormData) {
  const returnTo = safePath(String(formData.get("return_to") ?? "/workspace/admin/operations"));
  const claimId = String(formData.get("claim_id") ?? "");
  const nextStatus = String(formData.get("status") ?? "");
  const reviewNotes = safeText(formData.get("review_notes"));

  const { supabase, user, profile } = await requireProfile(returnTo);

  if (!claimId || !isClaimStatus(nextStatus)) {
    redirect(`${returnTo}?error=${encodeURIComponent("Invalid claim update request.")}`);
  }

  const { data: claim, error: claimError } = await supabase
    .from("claim_submissions")
    .select("id,appointment_id,patient_id,provider_id,status")
    .eq("id", claimId)
    .single();

  if (claimError || !claim) {
    redirect(`${returnTo}?error=${encodeURIComponent(claimError?.message ?? "Claim not found.")}`);
  }

  if (profile.role !== "admin" && claim.provider_id !== user.id) {
    redirect(`${returnTo}?error=${encodeURIComponent("You cannot update this claim.")}`);
  }

  const nowIso = new Date().toISOString();
  const updatePayload: {
    status: ClaimStatus;
    review_notes: string | null;
    reviewed_at: string | null;
    settled_at: string | null;
  } = {
    status: nextStatus,
    review_notes: reviewNotes,
    reviewed_at: null,
    settled_at: null,
  };

  if (nextStatus === "approved" || nextStatus === "rejected" || nextStatus === "paid") {
    updatePayload.reviewed_at = nowIso;
  }
  if (nextStatus === "paid") {
    updatePayload.settled_at = nowIso;
  }

  const { error } = await supabase
    .from("claim_submissions")
    .update(updatePayload)
    .eq("id", claim.id);

  if (error) {
    redirect(`${returnTo}?error=${encodeURIComponent(error.message)}`);
  }

  await supabase.from("notification_events").insert({
    recipient_id: claim.patient_id,
    sender_id: user.id,
    appointment_id: claim.appointment_id,
    title: "Claim status updated",
    message: `Your claim is now ${nextStatus.replaceAll("_", " ")}.`,
    channel: "in_app",
    status: "sent",
    sent_at: nowIso,
    metadata: {
      claim_id: claim.id,
      previous_status: claim.status,
      next_status: nextStatus,
    },
  });

  await supabase.from("audit_logs").insert({
    actor_id: user.id,
    action: "claim.status_updated",
    entity_type: "claim_submissions",
    entity_id: claim.id,
    metadata: {
      previous_status: claim.status,
      next_status: nextStatus,
      review_notes: reviewNotes,
    },
  });

  revalidatePath(returnTo);
  redirect(`${returnTo}?success=${encodeURIComponent(`Claim status updated to ${nextStatus}.`)}`);
}

export async function sendNotificationAction(formData: FormData) {
  const returnTo = safePath(String(formData.get("return_to") ?? "/workspace/provider/dashboard"));
  const recipientId = String(formData.get("recipient_id") ?? "");
  const appointmentId = safeText(formData.get("appointment_id"));
  const title = String(formData.get("title") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();
  const channel = String(formData.get("channel") ?? "in_app");

  const { supabase, user, profile } = await requireProfile(returnTo);

  if ((profile.role !== "provider" && profile.role !== "admin") || !recipientId) {
    redirect(`${returnTo}?error=${encodeURIComponent("Only provider/admin can send notifications.")}`);
  }
  if (!title || !message || !isNotificationChannel(channel)) {
    redirect(`${returnTo}?error=${encodeURIComponent("Notification title, message, and channel are required.")}`);
  }

  const nowIso = new Date().toISOString();

  const { data: notification, error } = await supabase
    .from("notification_events")
    .insert({
      recipient_id: recipientId,
      sender_id: user.id,
      appointment_id: appointmentId,
      title,
      message,
      channel,
      status: "sent",
      sent_at: nowIso,
    })
    .select("id")
    .single();

  if (error || !notification) {
    redirect(`${returnTo}?error=${encodeURIComponent(error?.message ?? "Unable to send notification.")}`);
  }

  await supabase.from("audit_logs").insert({
    actor_id: user.id,
    action: "notification.sent",
    entity_type: "notification_events",
    entity_id: notification.id,
    metadata: {
      recipient_id: recipientId,
      channel,
      appointment_id: appointmentId,
    },
  });

  revalidatePath(returnTo);
  redirect(`${returnTo}?success=${encodeURIComponent("Notification sent successfully.")}`);
}

export async function markNotificationReadAction(formData: FormData) {
  const returnTo = safePath(String(formData.get("return_to") ?? "/workspace/patient/inbox"));
  const notificationId = String(formData.get("notification_id") ?? "");

  if (!notificationId) {
    redirect(`${returnTo}?error=${encodeURIComponent("Notification id is required.")}`);
  }

  const { supabase, user, profile } = await requireProfile(returnTo);

  const { data: notification, error: notificationError } = await supabase
    .from("notification_events")
    .select("id,recipient_id,status")
    .eq("id", notificationId)
    .single();

  if (notificationError || !notification) {
    redirect(`${returnTo}?error=${encodeURIComponent(notificationError?.message ?? "Notification not found.")}`);
  }

  if (profile.role !== "admin" && notification.recipient_id !== user.id) {
    redirect(`${returnTo}?error=${encodeURIComponent("You cannot update this notification.")}`);
  }

  const nowIso = new Date().toISOString();

  const { error } = await supabase
    .from("notification_events")
    .update({
      status: "read",
      read_at: nowIso,
    })
    .eq("id", notification.id);

  if (error) {
    redirect(`${returnTo}?error=${encodeURIComponent(error.message)}`);
  }

  await supabase.from("audit_logs").insert({
    actor_id: user.id,
    action: "notification.read",
    entity_type: "notification_events",
    entity_id: notification.id,
    metadata: {
      previous_status: notification.status,
      read_at: nowIso,
    },
  });

  revalidatePath(returnTo);
  redirect(`${returnTo}?success=${encodeURIComponent("Notification marked as read.")}`);
}

export async function createComplianceEventAction(formData: FormData) {
  const returnTo = safePath(String(formData.get("return_to") ?? "/workspace/admin/operations"));
  const patientId = safeText(formData.get("patient_id"));
  const appointmentId = safeText(formData.get("appointment_id"));
  const eventType = String(formData.get("event_type") ?? "").trim();
  const riskLevel = String(formData.get("risk_level") ?? "medium");
  const details = safeText(formData.get("details"));

  const { supabase, user, profile } = await requireProfile(returnTo);

  if (profile.role !== "provider" && profile.role !== "admin") {
    redirect(`${returnTo}?error=${encodeURIComponent("Only provider/admin can create compliance events.")}`);
  }
  if (!eventType || !isComplianceRisk(riskLevel)) {
    redirect(`${returnTo}?error=${encodeURIComponent("Event type and risk level are required.")}`);
  }

  const { data: complianceEvent, error } = await supabase
    .from("compliance_events")
    .insert({
      actor_id: user.id,
      patient_id: patientId,
      appointment_id: appointmentId,
      event_type: eventType,
      risk_level: riskLevel,
      details,
    })
    .select("id")
    .single();

  if (error || !complianceEvent) {
    redirect(`${returnTo}?error=${encodeURIComponent(error?.message ?? "Unable to create compliance event.")}`);
  }

  if (patientId) {
    await supabase.from("notification_events").insert({
      recipient_id: patientId,
      sender_id: user.id,
      appointment_id: appointmentId,
      title: "Compliance follow-up",
      message: `A ${riskLevel} risk compliance event has been logged for your care journey.`,
      channel: "in_app",
      status: "sent",
      sent_at: new Date().toISOString(),
      metadata: {
        compliance_event_id: complianceEvent.id,
      },
    });
  }

  await supabase.from("audit_logs").insert({
    actor_id: user.id,
    action: "compliance.event_created",
    entity_type: "compliance_events",
    entity_id: complianceEvent.id,
    metadata: {
      event_type: eventType,
      risk_level: riskLevel,
      appointment_id: appointmentId,
      patient_id: patientId,
    },
  });

  revalidatePath(returnTo);
  redirect(`${returnTo}?success=${encodeURIComponent("Compliance event created.")}`);
}

export async function resolveComplianceEventAction(formData: FormData) {
  const returnTo = safePath(String(formData.get("return_to") ?? "/workspace/admin/operations"));
  const complianceEventId = String(formData.get("compliance_event_id") ?? "");
  const resolutionNotes = safeText(formData.get("resolution_notes"));

  if (!complianceEventId) {
    redirect(`${returnTo}?error=${encodeURIComponent("Compliance event id is required.")}`);
  }

  const { supabase, user, profile } = await requireProfile(returnTo);

  if (profile.role !== "admin") {
    redirect(`${returnTo}?error=${encodeURIComponent("Only admin can resolve compliance events.")}`);
  }

  const { data: complianceEvent, error: eventError } = await supabase
    .from("compliance_events")
    .select("id,patient_id,event_type,details,is_resolved")
    .eq("id", complianceEventId)
    .single();

  if (eventError || !complianceEvent) {
    redirect(`${returnTo}?error=${encodeURIComponent(eventError?.message ?? "Compliance event not found.")}`);
  }

  const nowIso = new Date().toISOString();
  const mergedDetails = resolutionNotes
    ? [complianceEvent.details, `Resolution: ${resolutionNotes}`].filter(Boolean).join("\n\n")
    : complianceEvent.details;

  const { error } = await supabase
    .from("compliance_events")
    .update({
      is_resolved: true,
      resolved_by: user.id,
      resolved_at: nowIso,
      details: mergedDetails,
    })
    .eq("id", complianceEvent.id);

  if (error) {
    redirect(`${returnTo}?error=${encodeURIComponent(error.message)}`);
  }

  if (complianceEvent.patient_id) {
    await supabase.from("notification_events").insert({
      recipient_id: complianceEvent.patient_id,
      sender_id: user.id,
      title: "Compliance event resolved",
      message: `Compliance event "${complianceEvent.event_type}" has been resolved.`,
      channel: "in_app",
      status: "sent",
      sent_at: nowIso,
      metadata: {
        compliance_event_id: complianceEvent.id,
      },
    });
  }

  await supabase.from("audit_logs").insert({
    actor_id: user.id,
    action: "compliance.event_resolved",
    entity_type: "compliance_events",
    entity_id: complianceEvent.id,
    metadata: {
      resolved_at: nowIso,
      previously_resolved: complianceEvent.is_resolved,
      resolution_notes: resolutionNotes,
    },
  });

  revalidatePath(returnTo);
  redirect(`${returnTo}?success=${encodeURIComponent("Compliance event resolved.")}`);
}

export async function createIncidentReportAction(formData: FormData) {
  const returnTo = safePath(String(formData.get("return_to") ?? "/workspace/admin/operations"));
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const severity = String(formData.get("severity") ?? "medium");
  const appointmentId = safeText(formData.get("appointment_id"));
  const assignedTo = safeText(formData.get("assigned_to"));

  const { supabase, user, profile } = await requireProfile(returnTo);

  if (profile.role !== "provider" && profile.role !== "admin") {
    redirect(`${returnTo}?error=${encodeURIComponent("Only provider/admin can report incidents.")}`);
  }
  if (!title || !description || !isIncidentSeverity(severity)) {
    redirect(`${returnTo}?error=${encodeURIComponent("Incident title, description, and severity are required.")}`);
  }

  const nowIso = new Date().toISOString();

  const { data: incident, error } = await supabase
    .from("incident_reports")
    .insert({
      title,
      description,
      severity,
      status: "open",
      opened_by: user.id,
      assigned_to: assignedTo,
      appointment_id: appointmentId,
      opened_at: nowIso,
    })
    .select("id")
    .single();

  if (error || !incident) {
    redirect(`${returnTo}?error=${encodeURIComponent(error?.message ?? "Unable to create incident report.")}`);
  }

  if (assignedTo && assignedTo !== user.id) {
    await supabase.from("notification_events").insert({
      recipient_id: assignedTo,
      sender_id: user.id,
      appointment_id: appointmentId,
      title: "Incident assigned",
      message: `You have been assigned incident "${title}".`,
      channel: "in_app",
      status: "sent",
      sent_at: nowIso,
      metadata: {
        incident_id: incident.id,
      },
    });
  }

  await supabase.from("audit_logs").insert({
    actor_id: user.id,
    action: "incident.created",
    entity_type: "incident_reports",
    entity_id: incident.id,
    metadata: {
      severity,
      appointment_id: appointmentId,
      assigned_to: assignedTo,
    },
  });

  revalidatePath(returnTo);
  redirect(`${returnTo}?success=${encodeURIComponent("Incident report created.")}`);
}

export async function updateIncidentReportAction(formData: FormData) {
  const returnTo = safePath(String(formData.get("return_to") ?? "/workspace/admin/operations"));
  const incidentId = String(formData.get("incident_id") ?? "");
  const nextStatus = String(formData.get("status") ?? "");
  const assignedTo = safeText(formData.get("assigned_to"));
  const resolutionNotes = safeText(formData.get("resolution_notes"));

  const { supabase, user, profile } = await requireProfile(returnTo);

  if (!incidentId || !isIncidentStatus(nextStatus)) {
    redirect(`${returnTo}?error=${encodeURIComponent("Invalid incident update request.")}`);
  }

  const { data: incident, error: incidentError } = await supabase
    .from("incident_reports")
    .select("id,title,opened_by,assigned_to,status,resolution_notes,resolved_at")
    .eq("id", incidentId)
    .single();

  if (incidentError || !incident) {
    redirect(`${returnTo}?error=${encodeURIComponent(incidentError?.message ?? "Incident not found.")}`);
  }

  if (
    profile.role !== "admin" &&
    incident.opened_by !== user.id &&
    incident.assigned_to !== user.id
  ) {
    redirect(`${returnTo}?error=${encodeURIComponent("You cannot update this incident.")}`);
  }

  const nowIso = new Date().toISOString();
  const shouldSetResolvedAt = nextStatus === "resolved" || nextStatus === "closed";
  const nextResolutionNotes = resolutionNotes ?? incident.resolution_notes;

  const { error } = await supabase
    .from("incident_reports")
    .update({
      status: nextStatus,
      assigned_to: assignedTo,
      resolution_notes: nextResolutionNotes,
      resolved_at: shouldSetResolvedAt ? nowIso : null,
    })
    .eq("id", incident.id);

  if (error) {
    redirect(`${returnTo}?error=${encodeURIComponent(error.message)}`);
  }

  if (incident.opened_by && incident.opened_by !== user.id) {
    await supabase.from("notification_events").insert({
      recipient_id: incident.opened_by,
      sender_id: user.id,
      title: "Incident updated",
      message: `Incident "${incident.title}" moved to ${nextStatus.replaceAll("_", " ")}.`,
      channel: "in_app",
      status: "sent",
      sent_at: nowIso,
      metadata: {
        incident_id: incident.id,
        previous_status: incident.status,
        next_status: nextStatus,
      },
    });
  }

  await supabase.from("audit_logs").insert({
    actor_id: user.id,
    action: "incident.updated",
    entity_type: "incident_reports",
    entity_id: incident.id,
    metadata: {
      previous_status: incident.status,
      next_status: nextStatus,
      assigned_to: assignedTo,
      resolution_notes: resolutionNotes,
    },
  });

  revalidatePath(returnTo);
  redirect(`${returnTo}?success=${encodeURIComponent(`Incident updated to ${nextStatus}.`)}`);
}

export async function upsertRolePermissionAction(formData: FormData) {
  const returnTo = safePath(String(formData.get("return_to") ?? "/workspace/admin/operations"));
  const role = String(formData.get("role") ?? "");
  const permissionKey = String(formData.get("permission_key") ?? "").trim();
  const description = safeText(formData.get("description"));

  const { supabase, user, profile } = await requireProfile(returnTo);

  if (profile.role !== "admin") {
    redirect(`${returnTo}?error=${encodeURIComponent("Only admin can manage role permissions.")}`);
  }

  if (!["patient", "provider", "admin"].includes(role) || !permissionKey) {
    redirect(`${returnTo}?error=${encodeURIComponent("Role and permission key are required.")}`);
  }

  const { error } = await supabase
    .from("role_permissions")
    .upsert(
      {
        role,
        permission_key: permissionKey,
        description,
      },
      { onConflict: "role,permission_key" },
    );

  if (error) {
    redirect(`${returnTo}?error=${encodeURIComponent(error.message)}`);
  }

  await supabase.from("audit_logs").insert({
    actor_id: user.id,
    action: "permissions.upserted",
    entity_type: "role_permissions",
    metadata: {
      role,
      permission_key: permissionKey,
      description,
    },
  });

  revalidatePath(returnTo);
  redirect(`${returnTo}?success=${encodeURIComponent("Role permission updated.")}`);
}
