"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth/session";

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

function isAppointmentStatus(value: string): value is AppointmentStatus {
  return APPOINTMENT_STATUS.includes(value as AppointmentStatus);
}

function isConsultationStatus(value: string): value is ConsultationStatus {
  return CONSULTATION_STATUS.includes(value as ConsultationStatus);
}

function isCareOrderType(value: string): value is CareOrderType {
  return CARE_ORDER_TYPES.includes(value as CareOrderType);
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

  await supabase.from("consultation_sessions").upsert(
    {
      appointment_id: appointment.id,
      patient_id: user.id,
      provider_id: providerId,
      status: "scheduled",
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
