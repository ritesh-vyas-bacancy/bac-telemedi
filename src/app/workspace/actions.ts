"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth/session";

const APPOINTMENT_STATUS = ["booked", "in_progress", "completed", "cancelled", "no_show"] as const;
type AppointmentStatus = (typeof APPOINTMENT_STATUS)[number];

function isAppointmentStatus(value: string): value is AppointmentStatus {
  return APPOINTMENT_STATUS.includes(value as AppointmentStatus);
}

function safePath(path: string | null) {
  if (!path || !path.startsWith("/")) return "/workspace";
  return path;
}

function safeWeekday(value: string) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 6) return null;
  return parsed;
}

export async function bookAppointmentAction(formData: FormData) {
  const returnTo = safePath(String(formData.get("return_to") ?? "/workspace/patient/booking"));
  const providerId = String(formData.get("provider_id") ?? "");
  const scheduledAt = String(formData.get("scheduled_at") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();

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
