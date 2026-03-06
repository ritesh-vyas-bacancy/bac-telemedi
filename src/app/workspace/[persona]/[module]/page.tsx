
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  addAvailabilityAction,
  bookAppointmentAction,
  createComplianceEventAction,
  createCareOrderAction,
  createIncidentReportAction,
  issuePrescriptionAction,
  markNotificationReadAction,
  markInvoicePaidAction,
  patientCheckInAction,
  saveEncounterNoteAction,
  sendNotificationAction,
  submitClaimAction,
  signEncounterNoteAction,
  updateClaimStatusAction,
  updateIncidentReportAction,
  updateConsultationStatusAction,
  updateAppointmentStatusAction,
  upsertRolePermissionAction,
  resolveComplianceEventAction,
} from "@/app/workspace/actions";
import { requireProfile } from "@/lib/auth/session";
import {
  type Persona,
  getDefaultModuleByRole,
  getModuleConfig,
  getPersonaConfig,
} from "@/lib/workspace/config";

type PageProps = {
  params: Promise<{ persona: string; module: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type ProfileRow = {
  id: string;
  role: Persona;
  full_name: string | null;
};

type AppointmentRow = {
  id: string;
  patient_id: string;
  provider_id: string;
  scheduled_at: string;
  duration_minutes: number;
  reason: string | null;
  status: string;
  meeting_url: string | null;
  notes: string | null;
};

type MessageRow = {
  id: string;
  appointment_id: string;
  sender_id: string;
  recipient_id: string;
  body: string;
  read_at: string | null;
  created_at: string;
};

type AvailabilityRow = {
  id: string;
  provider_id: string;
  weekday: number;
  start_time: string;
  end_time: string;
  timezone: string;
  slot_minutes: number;
  is_active: boolean;
};

type PrescriptionRow = {
  id: string;
  appointment_id: string;
  patient_id: string;
  provider_id: string;
  medication_name: string;
  dosage: string;
  instructions: string | null;
  status: string;
  issued_at: string;
};

type AuditLogRow = {
  id: string;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

type ConsultationSessionRow = {
  id: string;
  appointment_id: string;
  patient_id: string;
  provider_id: string;
  status: string;
  room_name: string | null;
  patient_ready_at: string | null;
  provider_ready_at: string | null;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
  updated_at: string;
};

type EncounterNoteRow = {
  id: string;
  appointment_id: string;
  patient_id: string;
  provider_id: string;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  status: string;
  signed_at: string | null;
  signed_by: string | null;
  updated_at: string;
};

type CareOrderRow = {
  id: string;
  appointment_id: string;
  patient_id: string;
  provider_id: string;
  order_type: string;
  title: string;
  details: string | null;
  due_date: string | null;
  status: string;
  created_at: string;
};

type InvoiceRow = {
  id: string;
  appointment_id: string | null;
  patient_id: string;
  provider_id: string | null;
  amount: number;
  currency: string;
  status: string;
  paid_at: string | null;
  created_at: string;
};

type ClaimSubmissionRow = {
  id: string;
  appointment_id: string;
  patient_id: string;
  provider_id: string;
  payer_name: string;
  amount_claimed: number;
  status: string;
  claim_reference: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  settled_at: string | null;
  review_notes: string | null;
  created_at: string;
  updated_at: string;
};

type NotificationEventRow = {
  id: string;
  recipient_id: string;
  sender_id: string | null;
  appointment_id: string | null;
  title: string;
  message: string;
  channel: string;
  status: string;
  scheduled_for: string;
  sent_at: string | null;
  read_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

type ComplianceEventRow = {
  id: string;
  actor_id: string | null;
  patient_id: string | null;
  appointment_id: string | null;
  event_type: string;
  risk_level: string;
  details: string | null;
  is_resolved: boolean;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
};

type IncidentReportRow = {
  id: string;
  title: string;
  description: string;
  severity: string;
  status: string;
  opened_by: string | null;
  assigned_to: string | null;
  appointment_id: string | null;
  opened_at: string;
  resolved_at: string | null;
  resolution_notes: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

type RolePermissionRow = {
  id: string;
  role: Persona;
  permission_key: string;
  description: string | null;
  created_at: string;
};

type StatusSummary = {
  booked: number;
  in_progress: number;
  completed: number;
  cancelled: number;
  no_show: number;
};

const STATUS_ORDER = [
  "booked",
  "in_progress",
  "completed",
  "cancelled",
  "no_show",
] as const;

type AppointmentStatus = (typeof STATUS_ORDER)[number];

const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

function asString(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function isMissingRelationError(message: string) {
  const lowered = message.toLowerCase();
  return lowered.includes("could not find the table") || lowered.includes("does not exist");
}

function isAppointmentStatus(value: string): value is AppointmentStatus {
  return STATUS_ORDER.includes(value as AppointmentStatus);
}

function statusSummaryFromAppointments(rows: AppointmentRow[]): StatusSummary {
  return rows.reduce<StatusSummary>(
    (acc, row) => {
      if (isAppointmentStatus(row.status)) {
        acc[row.status] += 1;
      }
      return acc;
    },
    {
      booked: 0,
      in_progress: 0,
      completed: 0,
      cancelled: 0,
      no_show: 0,
    },
  );
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(value: string) {
  const raw = value.length >= 5 ? value.slice(0, 5) : value;
  const date = new Date(`1970-01-01T${raw}:00`);
  if (Number.isNaN(date.getTime())) return raw;
  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function formatCurrency(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount}`;
  }
}

function dateTimeLocalNow() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  const local = new Date(now.getTime() - offset);
  return local.toISOString().slice(0, 16);
}

function statusBadgeClass(status: string) {
  if (status === "booked") {
    return "border-cyan-200 bg-cyan-50 text-cyan-800";
  }
  if (status === "in_progress") {
    return "border-indigo-200 bg-indigo-50 text-indigo-800";
  }
  if (status === "checked_in") {
    return "border-blue-200 bg-blue-50 text-blue-800";
  }
  if (status === "ready") {
    return "border-violet-200 bg-violet-50 text-violet-800";
  }
  if (status === "in_consult") {
    return "border-indigo-200 bg-indigo-50 text-indigo-800";
  }
  if (status === "completed") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }
  if (status === "cancelled") {
    return "border-rose-200 bg-rose-50 text-rose-800";
  }
  if (status === "no_show") {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }
  if (status === "submitted") {
    return "border-blue-200 bg-blue-50 text-blue-800";
  }
  if (status === "under_review" || status === "in_progress") {
    return "border-indigo-200 bg-indigo-50 text-indigo-800";
  }
  if (status === "approved" || status === "paid" || status === "sent" || status === "read") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }
  if (status === "rejected" || status === "failed" || status === "critical") {
    return "border-rose-200 bg-rose-50 text-rose-800";
  }
  if (status === "high") {
    return "border-orange-200 bg-orange-50 text-orange-800";
  }
  if (status === "medium" || status === "queued") {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }
  if (status === "low" || status === "open") {
    return "border-cyan-200 bg-cyan-50 text-cyan-800";
  }
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function statusLabel(value: string) {
  return value.replace(/_/g, " ");
}

function shortId(value: string) {
  return value.slice(0, 8);
}

function scoreWidth(value: number, total: number) {
  if (total <= 0) return 0;
  return Math.max(6, Math.round((value / total) * 100));
}

export default async function ModuleWorkspacePage({
  params,
  searchParams,
}: PageProps) {
  const { persona, module } = await params;
  const query = await searchParams;

  const success = asString(query.success);
  const error = asString(query.error);
  const currentPath = `/workspace/${persona}/${module}`;

  const { supabase, user, profile } = await requireProfile(currentPath);

  const personaConfig = getPersonaConfig(persona);
  const moduleConfig = getModuleConfig(persona, module);

  if (!personaConfig || !moduleConfig) {
    notFound();
  }

  if (profile.role !== "admin" && profile.role !== persona) {
    redirect(`/workspace/${profile.role}/${getDefaultModuleByRole(profile.role)}`);
  }

  let dbError = "";

  let providers: ProfileRow[] = [];
  let appointments: AppointmentRow[] = [];
  let messages: MessageRow[] = [];
  let availability: AvailabilityRow[] = [];
  let prescriptions: PrescriptionRow[] = [];
  let auditLogs: AuditLogRow[] = [];
  let consultationSessions: ConsultationSessionRow[] = [];
  let encounterNotes: EncounterNoteRow[] = [];
  let careOrders: CareOrderRow[] = [];
  let invoices: InvoiceRow[] = [];
  let claims: ClaimSubmissionRow[] = [];
  let notifications: NotificationEventRow[] = [];
  let complianceEvents: ComplianceEventRow[] = [];
  let incidents: IncidentReportRow[] = [];
  let rolePermissions: RolePermissionRow[] = [];

  let providerCount = 0;
  let patientCount = 0;
  let activeSessions = 0;
  let todayAppointments: AppointmentRow[] = [];
  let unresolvedComplianceCount = 0;
  let openIncidentCount = 0;
  if (persona === "patient") {
    if (module === "booking") {
      const [
        { data: providerRows, error: providerError },
        { data: appointmentRows, error: appointmentError },
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select("id,role,full_name")
          .eq("role", "provider")
          .order("created_at", { ascending: true })
          .limit(40),
        supabase
          .from("appointments")
          .select(
            "id,patient_id,provider_id,scheduled_at,duration_minutes,reason,status,meeting_url,notes",
          )
          .eq("patient_id", user.id)
          .order("scheduled_at", { ascending: true })
          .limit(40),
      ]);

      providers = (providerRows as ProfileRow[] | null) ?? [];
      appointments = (appointmentRows as AppointmentRow[] | null) ?? [];
      dbError =
        providerError?.message ??
        appointmentError?.message ??
        dbError;
    }

    if (module === "visits") {
      const [
        { data: appointmentRows, error: appointmentError },
        { data: prescriptionRows, error: prescriptionError },
        { data: sessionRows, error: sessionError },
        { data: careOrderRows, error: careOrderError },
        { data: invoiceRows, error: invoiceError },
      ] = await Promise.all([
        supabase
          .from("appointments")
          .select(
            "id,patient_id,provider_id,scheduled_at,duration_minutes,reason,status,meeting_url,notes",
          )
          .eq("patient_id", user.id)
          .order("scheduled_at", { ascending: false })
          .limit(60),
        supabase
          .from("prescriptions")
          .select(
            "id,appointment_id,patient_id,provider_id,medication_name,dosage,instructions,status,issued_at",
          )
          .eq("patient_id", user.id)
          .order("issued_at", { ascending: false })
          .limit(60),
        supabase
          .from("consultation_sessions")
          .select(
            "id,appointment_id,patient_id,provider_id,status,room_name,patient_ready_at,provider_ready_at,started_at,ended_at,created_at,updated_at",
          )
          .eq("patient_id", user.id)
          .order("updated_at", { ascending: false })
          .limit(80),
        supabase
          .from("care_orders")
          .select("id,appointment_id,patient_id,provider_id,order_type,title,details,due_date,status,created_at")
          .eq("patient_id", user.id)
          .order("created_at", { ascending: false })
          .limit(80),
        supabase
          .from("billing_invoices")
          .select("id,appointment_id,patient_id,provider_id,amount,currency,status,paid_at,created_at")
          .eq("patient_id", user.id)
          .order("created_at", { ascending: false })
          .limit(80),
      ]);

      appointments = (appointmentRows as AppointmentRow[] | null) ?? [];
      prescriptions = (prescriptionRows as PrescriptionRow[] | null) ?? [];
      consultationSessions = (sessionRows as ConsultationSessionRow[] | null) ?? [];
      careOrders = (careOrderRows as CareOrderRow[] | null) ?? [];
      invoices = (invoiceRows as InvoiceRow[] | null) ?? [];
      dbError =
        appointmentError?.message ??
        prescriptionError?.message ??
        sessionError?.message ??
        careOrderError?.message ??
        invoiceError?.message ??
        dbError;
    }

    if (module === "inbox") {
      const [
        { data: messageRows, error: messageError },
        { data: notificationRows, error: notificationError },
      ] = await Promise.all([
        supabase
          .from("messages")
          .select(
            "id,appointment_id,sender_id,recipient_id,body,read_at,created_at",
          )
          .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
          .order("created_at", { ascending: false })
          .limit(80),
        supabase
          .from("notification_events")
          .select(
            "id,recipient_id,sender_id,appointment_id,title,message,channel,status,scheduled_for,sent_at,read_at,metadata,created_at,updated_at",
          )
          .eq("recipient_id", user.id)
          .order("created_at", { ascending: false })
          .limit(120),
      ]);

      messages = (messageRows as MessageRow[] | null) ?? [];
      notifications = (notificationRows as NotificationEventRow[] | null) ?? [];
      dbError = messageError?.message ?? notificationError?.message ?? dbError;
    }
  }

  if (persona === "provider") {
    if (module === "dashboard") {
      const [
        { data: appointmentRows, error: appointmentError },
        { data: sessionRows, error: sessionError },
        { data: invoiceRows, error: invoiceError },
        { data: claimRows, error: claimError },
        { data: notificationRows, error: notificationError },
      ] = await Promise.all([
        supabase
          .from("appointments")
          .select(
            "id,patient_id,provider_id,scheduled_at,duration_minutes,reason,status,meeting_url,notes",
          )
          .eq("provider_id", user.id)
          .order("scheduled_at", { ascending: true })
          .limit(80),
        supabase
          .from("consultation_sessions")
          .select(
            "id,appointment_id,patient_id,provider_id,status,room_name,patient_ready_at,provider_ready_at,started_at,ended_at,created_at,updated_at",
          )
          .eq("provider_id", user.id)
          .order("updated_at", { ascending: false })
          .limit(120),
        supabase
          .from("billing_invoices")
          .select("id,appointment_id,patient_id,provider_id,amount,currency,status,paid_at,created_at")
          .eq("provider_id", user.id)
          .order("created_at", { ascending: false })
          .limit(80),
        supabase
          .from("claim_submissions")
          .select(
            "id,appointment_id,patient_id,provider_id,payer_name,amount_claimed,status,claim_reference,submitted_at,reviewed_at,settled_at,review_notes,created_at,updated_at",
          )
          .eq("provider_id", user.id)
          .order("created_at", { ascending: false })
          .limit(100),
        supabase
          .from("notification_events")
          .select(
            "id,recipient_id,sender_id,appointment_id,title,message,channel,status,scheduled_for,sent_at,read_at,metadata,created_at,updated_at",
          )
          .or(`recipient_id.eq.${user.id},sender_id.eq.${user.id}`)
          .order("created_at", { ascending: false })
          .limit(120),
      ]);

      appointments = (appointmentRows as AppointmentRow[] | null) ?? [];
      consultationSessions = (sessionRows as ConsultationSessionRow[] | null) ?? [];
      invoices = (invoiceRows as InvoiceRow[] | null) ?? [];
      claims = (claimRows as ClaimSubmissionRow[] | null) ?? [];
      notifications = (notificationRows as NotificationEventRow[] | null) ?? [];
      dbError =
        appointmentError?.message ??
        sessionError?.message ??
        invoiceError?.message ??
        claimError?.message ??
        notificationError?.message ??
        dbError;
    }

    if (module === "schedule") {
      const { data: availabilityRows, error: availabilityError } = await supabase
        .from("provider_availability")
        .select(
          "id,provider_id,weekday,start_time,end_time,timezone,slot_minutes,is_active",
        )
        .eq("provider_id", user.id)
        .order("weekday", { ascending: true })
        .order("start_time", { ascending: true })
        .limit(100);

      availability = (availabilityRows as AvailabilityRow[] | null) ?? [];
      dbError = availabilityError?.message ?? dbError;
    }

    if (module === "patients") {
      const [
        { data: appointmentRows, error: appointmentError },
        { data: prescriptionRows, error: prescriptionError },
        { data: sessionRows, error: sessionError },
        { data: noteRows, error: noteError },
        { data: careOrderRows, error: careOrderError },
      ] = await Promise.all([
        supabase
          .from("appointments")
          .select(
            "id,patient_id,provider_id,scheduled_at,duration_minutes,reason,status,meeting_url,notes",
          )
          .eq("provider_id", user.id)
          .order("scheduled_at", { ascending: false })
          .limit(120),
        supabase
          .from("prescriptions")
          .select(
            "id,appointment_id,patient_id,provider_id,medication_name,dosage,instructions,status,issued_at",
          )
          .eq("provider_id", user.id)
          .order("issued_at", { ascending: false })
          .limit(120),
        supabase
          .from("consultation_sessions")
          .select(
            "id,appointment_id,patient_id,provider_id,status,room_name,patient_ready_at,provider_ready_at,started_at,ended_at,created_at,updated_at",
          )
          .eq("provider_id", user.id)
          .order("updated_at", { ascending: false })
          .limit(120),
        supabase
          .from("encounter_notes")
          .select(
            "id,appointment_id,patient_id,provider_id,subjective,objective,assessment,plan,status,signed_at,signed_by,updated_at",
          )
          .eq("provider_id", user.id)
          .order("updated_at", { ascending: false })
          .limit(120),
        supabase
          .from("care_orders")
          .select("id,appointment_id,patient_id,provider_id,order_type,title,details,due_date,status,created_at")
          .eq("provider_id", user.id)
          .order("created_at", { ascending: false })
          .limit(120),
      ]);

      appointments = (appointmentRows as AppointmentRow[] | null) ?? [];
      prescriptions = (prescriptionRows as PrescriptionRow[] | null) ?? [];
      consultationSessions = (sessionRows as ConsultationSessionRow[] | null) ?? [];
      encounterNotes = (noteRows as EncounterNoteRow[] | null) ?? [];
      careOrders = (careOrderRows as CareOrderRow[] | null) ?? [];
      dbError =
        appointmentError?.message ??
        prescriptionError?.message ??
        sessionError?.message ??
        noteError?.message ??
        careOrderError?.message ??
        dbError;
    }
  }

  if (persona === "admin") {
    if (module === "pulse") {
      const dayStart = new Date();
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const [
        { data: todayRows, error: todayError },
        { count: activeCount, error: activeError },
        { count: providerTotal, error: providerError },
        { count: patientTotal, error: patientError },
        { data: sessionRows, error: sessionError },
        { data: invoiceRows, error: invoiceError },
        { count: openIncidents, error: incidentCountError },
        { count: unresolvedCompliance, error: complianceCountError },
        { data: claimRows, error: claimError },
      ] = await Promise.all([
        supabase
          .from("appointments")
          .select(
            "id,patient_id,provider_id,scheduled_at,duration_minutes,reason,status,meeting_url,notes",
          )
          .gte("scheduled_at", dayStart.toISOString())
          .lt("scheduled_at", dayEnd.toISOString())
          .order("scheduled_at", { ascending: true }),
        supabase
          .from("appointments")
          .select("id", { count: "exact", head: true })
          .eq("status", "in_progress"),
        supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("role", "provider"),
        supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("role", "patient"),
        supabase
          .from("consultation_sessions")
          .select(
            "id,appointment_id,patient_id,provider_id,status,room_name,patient_ready_at,provider_ready_at,started_at,ended_at,created_at,updated_at",
          )
          .order("updated_at", { ascending: false })
          .limit(160),
        supabase
          .from("billing_invoices")
          .select("id,appointment_id,patient_id,provider_id,amount,currency,status,paid_at,created_at")
          .order("created_at", { ascending: false })
          .limit(160),
        supabase
          .from("incident_reports")
          .select("id", { count: "exact", head: true })
          .neq("status", "closed"),
        supabase
          .from("compliance_events")
          .select("id", { count: "exact", head: true })
          .eq("is_resolved", false),
        supabase
          .from("claim_submissions")
          .select(
            "id,appointment_id,patient_id,provider_id,payer_name,amount_claimed,status,claim_reference,submitted_at,reviewed_at,settled_at,review_notes,created_at,updated_at",
          )
          .order("created_at", { ascending: false })
          .limit(160),
      ]);

      todayAppointments = (todayRows as AppointmentRow[] | null) ?? [];
      activeSessions = activeCount ?? 0;
      providerCount = providerTotal ?? 0;
      patientCount = patientTotal ?? 0;
      consultationSessions = (sessionRows as ConsultationSessionRow[] | null) ?? [];
      invoices = (invoiceRows as InvoiceRow[] | null) ?? [];
      claims = (claimRows as ClaimSubmissionRow[] | null) ?? [];
      openIncidentCount = openIncidents ?? 0;
      unresolvedComplianceCount = unresolvedCompliance ?? 0;

      dbError =
        todayError?.message ??
        activeError?.message ??
        providerError?.message ??
        patientError?.message ??
        sessionError?.message ??
        invoiceError?.message ??
        incidentCountError?.message ??
        complianceCountError?.message ??
        claimError?.message ??
        dbError;
    }

    if (module === "operations") {
      const [
        { data: appointmentRows, error: appointmentError },
        { data: providerRows, error: providerError },
        { data: sessionRows, error: sessionError },
        { data: invoiceRows, error: invoiceError },
        { data: claimRows, error: claimError },
        { data: notificationRows, error: notificationError },
        { data: complianceRows, error: complianceError },
        { data: incidentRows, error: incidentError },
        { data: permissionRows, error: permissionError },
      ] = await Promise.all([
        supabase
          .from("appointments")
          .select(
            "id,patient_id,provider_id,scheduled_at,duration_minutes,reason,status,meeting_url,notes",
          )
          .order("scheduled_at", { ascending: false })
          .limit(120),
        supabase
          .from("profiles")
          .select("id,role,full_name")
          .eq("role", "provider")
          .order("created_at", { ascending: true }),
        supabase
          .from("consultation_sessions")
          .select(
            "id,appointment_id,patient_id,provider_id,status,room_name,patient_ready_at,provider_ready_at,started_at,ended_at,created_at,updated_at",
          )
          .order("updated_at", { ascending: false })
          .limit(160),
        supabase
          .from("billing_invoices")
          .select("id,appointment_id,patient_id,provider_id,amount,currency,status,paid_at,created_at")
          .order("created_at", { ascending: false })
          .limit(160),
        supabase
          .from("claim_submissions")
          .select(
            "id,appointment_id,patient_id,provider_id,payer_name,amount_claimed,status,claim_reference,submitted_at,reviewed_at,settled_at,review_notes,created_at,updated_at",
          )
          .order("created_at", { ascending: false })
          .limit(160),
        supabase
          .from("notification_events")
          .select(
            "id,recipient_id,sender_id,appointment_id,title,message,channel,status,scheduled_for,sent_at,read_at,metadata,created_at,updated_at",
          )
          .order("created_at", { ascending: false })
          .limit(180),
        supabase
          .from("compliance_events")
          .select(
            "id,actor_id,patient_id,appointment_id,event_type,risk_level,details,is_resolved,resolved_by,resolved_at,created_at,updated_at",
          )
          .order("created_at", { ascending: false })
          .limit(180),
        supabase
          .from("incident_reports")
          .select(
            "id,title,description,severity,status,opened_by,assigned_to,appointment_id,opened_at,resolved_at,resolution_notes,metadata,created_at,updated_at",
          )
          .order("created_at", { ascending: false })
          .limit(180),
        supabase
          .from("role_permissions")
          .select("id,role,permission_key,description,created_at")
          .order("role", { ascending: true })
          .order("permission_key", { ascending: true })
          .limit(220),
      ]);

      appointments = (appointmentRows as AppointmentRow[] | null) ?? [];
      providers = (providerRows as ProfileRow[] | null) ?? [];
      consultationSessions = (sessionRows as ConsultationSessionRow[] | null) ?? [];
      invoices = (invoiceRows as InvoiceRow[] | null) ?? [];
      claims = (claimRows as ClaimSubmissionRow[] | null) ?? [];
      notifications = (notificationRows as NotificationEventRow[] | null) ?? [];
      complianceEvents = (complianceRows as ComplianceEventRow[] | null) ?? [];
      incidents = (incidentRows as IncidentReportRow[] | null) ?? [];
      rolePermissions = (permissionRows as RolePermissionRow[] | null) ?? [];
      unresolvedComplianceCount = complianceEvents.filter((item) => !item.is_resolved).length;
      openIncidentCount = incidents.filter((item) => item.status === "open" || item.status === "in_progress").length;
      dbError =
        appointmentError?.message ??
        providerError?.message ??
        sessionError?.message ??
        invoiceError?.message ??
        claimError?.message ??
        notificationError?.message ??
        complianceError?.message ??
        incidentError?.message ??
        permissionError?.message ??
        dbError;
    }

    if (module === "audit") {
      const { data: auditRows, error: auditError } = await supabase
        .from("audit_logs")
        .select("id,actor_id,action,entity_type,entity_id,metadata,created_at")
        .order("created_at", { ascending: false })
        .limit(120);

      auditLogs = (auditRows as AuditLogRow[] | null) ?? [];
      dbError = auditError?.message ?? dbError;
    }
  }

  let migrationWarning = "";
  if (dbError && isMissingRelationError(dbError)) {
    const loweredError = dbError.toLowerCase();
    const phaseBTableMentioned =
      loweredError.includes("claim_submissions") ||
      loweredError.includes("notification_events") ||
      loweredError.includes("compliance_events") ||
      loweredError.includes("incident_reports") ||
      loweredError.includes("role_permissions");
    migrationWarning = phaseBTableMentioned
      ? "Advanced operations modules are ready in code. Run supabase/migrations/0003_phase_bcd_foundations.sql to enable claims, notifications, compliance, incidents, and permissions."
      : "Advanced clinical and billing modules are ready in code. Run supabase/migrations/0002_phase_a_clinical_core.sql to enable them.";
    dbError = "";
  }

  const profileIds = new Set<string>();

  providers.forEach((item) => profileIds.add(item.id));
  appointments.forEach((item) => {
    profileIds.add(item.patient_id);
    profileIds.add(item.provider_id);
  });
  todayAppointments.forEach((item) => {
    profileIds.add(item.patient_id);
    profileIds.add(item.provider_id);
  });
  messages.forEach((item) => {
    profileIds.add(item.sender_id);
    profileIds.add(item.recipient_id);
  });
  prescriptions.forEach((item) => {
    profileIds.add(item.patient_id);
    profileIds.add(item.provider_id);
  });
  invoices.forEach((item) => {
    profileIds.add(item.patient_id);
    if (item.provider_id) {
      profileIds.add(item.provider_id);
    }
  });
  consultationSessions.forEach((item) => {
    profileIds.add(item.patient_id);
    profileIds.add(item.provider_id);
  });
  encounterNotes.forEach((item) => {
    profileIds.add(item.patient_id);
    profileIds.add(item.provider_id);
    if (item.signed_by) {
      profileIds.add(item.signed_by);
    }
  });
  claims.forEach((item) => {
    profileIds.add(item.patient_id);
    profileIds.add(item.provider_id);
  });
  notifications.forEach((item) => {
    profileIds.add(item.recipient_id);
    if (item.sender_id) {
      profileIds.add(item.sender_id);
    }
  });
  complianceEvents.forEach((item) => {
    if (item.actor_id) {
      profileIds.add(item.actor_id);
    }
    if (item.patient_id) {
      profileIds.add(item.patient_id);
    }
    if (item.resolved_by) {
      profileIds.add(item.resolved_by);
    }
  });
  incidents.forEach((item) => {
    if (item.opened_by) {
      profileIds.add(item.opened_by);
    }
    if (item.assigned_to) {
      profileIds.add(item.assigned_to);
    }
  });
  auditLogs.forEach((item) => {
    if (item.actor_id) {
      profileIds.add(item.actor_id);
    }
  });

  let profileDirectory = new Map<string, ProfileRow>();

  if (profileIds.size > 0) {
    const { data: profileRows, error: profileError } = await supabase
      .from("profiles")
      .select("id,role,full_name")
      .in("id", [...profileIds]);

    if (profileError) {
      dbError = dbError || profileError.message;
    } else {
      profileDirectory = new Map(
        ((profileRows as ProfileRow[] | null) ?? []).map((item) => [item.id, item]),
      );
    }
  }

  const resolveName = (id: string) => {
    const row = profileDirectory.get(id);
    if (!row) return `User ${shortId(id)}`;
    return row.full_name ?? `${row.role} ${shortId(id)}`;
  };

  const activeAppointments = persona === "admin" && module === "pulse"
    ? todayAppointments
    : appointments;

  const summary = statusSummaryFromAppointments(activeAppointments);
  const consultationInProgressCount = consultationSessions.filter((item) => item.status === "in_consult").length;
  const consultationCheckedInCount = consultationSessions.filter((item) => item.status === "checked_in").length;
  const paidInvoiceCount = invoices.filter((item) => item.status === "paid").length;
  const pendingInvoiceCount = invoices.filter((item) => item.status === "pending").length;
  const billedRevenue = invoices
    .filter((item) => item.status === "paid")
    .reduce((acc, item) => acc + item.amount, 0);

  const sessionByAppointment = new Map<string, ConsultationSessionRow>(
    consultationSessions.map((item) => [item.appointment_id, item]),
  );
  const noteByAppointment = new Map<string, EncounterNoteRow>(
    encounterNotes.map((item) => [item.appointment_id, item]),
  );

  const invoicesByAppointment = new Map<string, InvoiceRow[]>();
  invoices.forEach((item) => {
    const key = item.appointment_id ?? "unassigned";
    const bucket = invoicesByAppointment.get(key) ?? [];
    bucket.push(item);
    invoicesByAppointment.set(key, bucket);
  });

  const careOrdersByAppointment = new Map<string, CareOrderRow[]>();
  careOrders.forEach((item) => {
    const bucket = careOrdersByAppointment.get(item.appointment_id) ?? [];
    bucket.push(item);
    careOrdersByAppointment.set(item.appointment_id, bucket);
  });

  const claimsByAppointment = new Map<string, ClaimSubmissionRow[]>();
  claims.forEach((item) => {
    const bucket = claimsByAppointment.get(item.appointment_id) ?? [];
    bucket.push(item);
    claimsByAppointment.set(item.appointment_id, bucket);
  });

  const notificationsUnreadCount = notifications.filter((item) => item.status !== "read").length;
  const claimPendingCount = claims.filter(
    (item) => item.status === "submitted" || item.status === "under_review",
  ).length;
  const claimPaidCount = claims.filter((item) => item.status === "paid").length;
  const providerPatientOptions = Array.from(new Set(appointments.map((item) => item.patient_id)));

  const patientInsights = new Map<
    string,
    { id: string; total: number; open: number; lastVisit: string }
  >();

  if (persona === "provider" && module === "patients") {
    appointments.forEach((item) => {
      const existing = patientInsights.get(item.patient_id);
      const isOpen = item.status === "booked" || item.status === "in_progress";

      if (!existing) {
        patientInsights.set(item.patient_id, {
          id: item.patient_id,
          total: 1,
          open: isOpen ? 1 : 0,
          lastVisit: item.scheduled_at,
        });
        return;
      }

      existing.total += 1;
      if (isOpen) {
        existing.open += 1;
      }
      if (new Date(item.scheduled_at).getTime() > new Date(existing.lastVisit).getTime()) {
        existing.lastVisit = item.scheduled_at;
      }
    });
  }

  const providerOps = new Map<
    string,
    {
      id: string;
      total: number;
      completed: number;
      in_progress: number;
      booked: number;
      cancelled: number;
      no_show: number;
    }
  >();

  if (persona === "admin" && module === "operations") {
    appointments.forEach((row) => {
      const current = providerOps.get(row.provider_id) ?? {
        id: row.provider_id,
        total: 0,
        completed: 0,
        in_progress: 0,
        booked: 0,
        cancelled: 0,
        no_show: 0,
      };

      current.total += 1;
      if (isAppointmentStatus(row.status)) {
        current[row.status] += 1;
      }
      providerOps.set(row.provider_id, current);
    });
  }

  return (
    <main className="prototype-bg workspace-main min-h-[calc(100vh-60px)] px-3 py-5 sm:px-6 sm:py-8">
      <div className="mx-auto w-full max-w-[1600px] space-y-5 animate-rise">
        <section className="rounded-3xl border border-cyan-100/80 bg-white/88 p-5 shadow-[0_26px_74px_-52px_rgba(2,8,20,0.9)] backdrop-blur sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span
                className={`inline-flex rounded-xl bg-gradient-to-r px-3 py-1 text-xs font-semibold tracking-wide text-white ${personaConfig.accent}`}
              >
                {personaConfig.label} Journey
              </span>
              <h1 className="mt-3 text-2xl font-bold text-slate-900 sm:text-3xl">
                {moduleConfig.title}
              </h1>
              <p className="mt-1 max-w-3xl text-sm text-slate-600 sm:text-base">
                {moduleConfig.description}
              </p>
            </div>
            <div className="rounded-2xl border border-cyan-100 bg-white/95 px-4 py-3 text-right shadow-[0_16px_40px_-32px_rgba(8,145,178,0.85)]">
              <p className="text-xs font-semibold tracking-[0.12em] text-cyan-700">
                ACTIVE USER
              </p>
              <p className="text-sm font-semibold text-slate-900">
                {profile.full_name ?? "Unnamed user"}
              </p>
              <p className="text-xs text-slate-500">{profile.role}</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {personaConfig.modules.map((item) => (
              <Link
                key={item.slug}
                href={`/workspace/${persona}/${item.slug}`}
                className={
                  item.slug === module
                    ? "rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 px-3 py-2 text-xs font-semibold text-white shadow-[0_12px_28px_-16px_rgba(8,145,178,0.95)]"
                    : "rounded-lg border border-cyan-200 bg-white px-3 py-2 text-xs font-semibold text-cyan-800 hover:border-cyan-300"
                }
              >
                {item.title}
              </Link>
            ))}
          </div>
        </section>

        {success ? (
          <section className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            {success}
          </section>
        ) : null}
        {error ? (
          <section className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
            {error}
          </section>
        ) : null}
        {dbError ? (
          <section className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {dbError}
          </section>
        ) : null}
        {migrationWarning ? (
          <section className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
            {migrationWarning}
          </section>
        ) : null}
        {persona === "patient" && module === "booking" ? (
          <section className="grid gap-4 lg:grid-cols-[1.05fr_1fr]">
            <article className="rounded-2xl border border-white/70 bg-white/92 p-5 shadow-[0_16px_45px_-35px_rgba(15,23,42,0.85)]">
              <h2 className="text-lg font-semibold text-slate-900">
                Reserve Consultation Slot
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Book in under 30 seconds. The visit appears immediately in your timeline.
              </p>
              <form action={bookAppointmentAction} className="mt-4 grid gap-3">
                <input type="hidden" name="return_to" value={currentPath} />
                <label className="grid gap-1">
                  <span className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-600">
                    Provider
                  </span>
                  <select
                    name="provider_id"
                    required
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                  >
                    <option value="">Choose provider</option>
                    {providers.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.full_name ?? `Provider ${shortId(item.id)}`}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1">
                  <span className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-600">
                    Date & Time
                  </span>
                  <input
                    type="datetime-local"
                    name="scheduled_at"
                    min={dateTimeLocalNow()}
                    required
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                  />
                </label>
                <label className="grid gap-1">
                  <span className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-600">
                    Reason
                  </span>
                  <textarea
                    name="reason"
                    rows={4}
                    placeholder="Share symptoms or purpose"
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                  />
                </label>
                <label className="grid gap-1">
                  <span className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-600">
                    Consultation Fee (Demo)
                  </span>
                  <input
                    type="number"
                    name="invoice_amount"
                    min={0}
                    step="0.01"
                    defaultValue={499}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                  />
                </label>
                <button
                  type="submit"
                  className="mt-1 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_12px_30px_-18px_rgba(8,145,178,0.95)]"
                >
                  Confirm Appointment
                </button>
              </form>
            </article>

            <article className="space-y-4">
              <div className="rounded-2xl border border-white/70 bg-white/92 p-5 shadow-[0_16px_45px_-35px_rgba(15,23,42,0.85)]">
                <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-slate-600">
                  Available Providers
                </h3>
                <div className="mt-3 space-y-2">
                  {providers.length === 0 ? (
                    <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                      No provider profiles found.
                    </p>
                  ) : (
                    providers.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                      >
                        <p className="text-sm font-semibold text-slate-900">
                          {item.full_name ?? `Provider ${shortId(item.id)}`}
                        </p>
                        <p className="text-xs text-slate-600">ID: {shortId(item.id)}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div className="rounded-2xl border border-white/70 bg-white/92 p-5 shadow-[0_16px_45px_-35px_rgba(15,23,42,0.85)]">
                <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-slate-600">
                  My Upcoming Visits
                </h3>
                <div className="mt-3 space-y-2">
                  {appointments.length === 0 ? (
                    <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                      No visits booked yet.
                    </p>
                  ) : (
                    appointments.slice(0, 8).map((item) => (
                      <div
                        key={item.id}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2"
                      >
                        <p className="text-sm font-semibold text-slate-900">
                          {formatDateTime(item.scheduled_at)}
                        </p>
                        <p className="text-xs text-slate-600">
                          Provider: {resolveName(item.provider_id)}
                        </p>
                        <span
                          className={`mt-1 inline-flex rounded-md border px-2 py-0.5 text-xs font-semibold ${statusBadgeClass(item.status)}`}
                        >
                          {statusLabel(item.status)}
                        </span>
                        <Link
                          href={`/workspace/call/${item.id}`}
                          className="mt-2 inline-flex rounded-md border border-cyan-300 bg-cyan-50 px-2 py-0.5 text-xs font-semibold text-cyan-800"
                        >
                          Join Video Room
                        </Link>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </article>
          </section>
        ) : null}

        {persona === "patient" && module === "visits" ? (
          <section className="grid gap-4 lg:grid-cols-[1.45fr_1fr]">
            <article className="rounded-2xl border border-white/70 bg-white/92 p-5 shadow-[0_16px_45px_-35px_rgba(15,23,42,0.85)]">
              <div className="mb-3 flex flex-wrap gap-2">
                {STATUS_ORDER.map((item) => (
                  <span
                    key={item}
                    className={`inline-flex rounded-md border px-2.5 py-1 text-xs font-semibold ${statusBadgeClass(item)}`}
                  >
                    {statusLabel(item)}: {summary[item]}
                  </span>
                ))}
              </div>
              <div className="space-y-2">
                {appointments.length === 0 ? (
                  <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                    No appointments recorded.
                  </p>
                ) : (
                  appointments.map((item) => {
                    const session = sessionByAppointment.get(item.id);
                    const appointmentInvoices = invoicesByAppointment.get(item.id) ?? [];
                    const appointmentOrders = careOrdersByAppointment.get(item.id) ?? [];

                    return (
                      <div
                        key={item.id}
                        className="rounded-xl border border-slate-200 bg-slate-50/90 p-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-slate-900">
                            {formatDateTime(item.scheduled_at)}
                          </p>
                          <span
                            className={`inline-flex rounded-md border px-2 py-0.5 text-xs font-semibold ${statusBadgeClass(item.status)}`}
                          >
                            {statusLabel(item.status)}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-600">
                          Provider: {resolveName(item.provider_id)}
                        </p>
                        <p className="mt-1 text-sm text-slate-700">
                          {item.reason ?? "No reason added"}
                        </p>
                        {item.notes ? (
                          <p className="mt-1 text-xs text-slate-500">Notes: {item.notes}</p>
                        ) : null}

                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span
                            className={`inline-flex rounded-md border px-2 py-0.5 text-xs font-semibold ${statusBadgeClass(session?.status ?? "scheduled")}`}
                          >
                            Consultation: {statusLabel(session?.status ?? "scheduled")}
                          </span>
                          {session?.started_at ? (
                            <span className="text-xs text-slate-500">
                              Started: {formatDateTime(session.started_at)}
                            </span>
                          ) : null}
                          <Link
                            href={`/workspace/call/${item.id}`}
                            className="inline-flex rounded-md border border-cyan-300 bg-cyan-50 px-2 py-0.5 text-xs font-semibold text-cyan-800"
                          >
                            Join Video Room
                          </Link>
                        </div>

                        {(item.status === "booked" || session?.status === "scheduled" || session?.status === "ready") ? (
                          <form action={patientCheckInAction} className="mt-2">
                            <input type="hidden" name="return_to" value={currentPath} />
                            <input type="hidden" name="appointment_id" value={item.id} />
                            <button
                              type="submit"
                              className="rounded-md bg-cyan-700 px-2.5 py-1 text-xs font-semibold text-white"
                            >
                              Check In For Visit
                            </button>
                          </form>
                        ) : null}

                        {appointmentInvoices.length > 0 ? (
                          <div className="mt-2 space-y-1">
                            {appointmentInvoices.map((invoice) => (
                              <div key={invoice.id} className="rounded-md border border-slate-200 bg-white px-2.5 py-2">
                                <p className="text-xs font-semibold text-slate-700">
                                  Invoice {formatCurrency(invoice.amount, invoice.currency)}
                                </p>
                                <div className="mt-1 flex flex-wrap items-center gap-2">
                                  <span
                                    className={`inline-flex rounded-md border px-2 py-0.5 text-[11px] font-semibold ${statusBadgeClass(invoice.status)}`}
                                  >
                                    {statusLabel(invoice.status)}
                                  </span>
                                  {invoice.status !== "paid" ? (
                                    <form action={markInvoicePaidAction}>
                                      <input type="hidden" name="return_to" value={currentPath} />
                                      <input type="hidden" name="invoice_id" value={invoice.id} />
                                      <button
                                        type="submit"
                                        className="rounded-md border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800"
                                      >
                                        Pay Now (Demo)
                                      </button>
                                    </form>
                                  ) : (
                                    <span className="text-[11px] text-slate-500">
                                      Paid at {invoice.paid_at ? formatDateTime(invoice.paid_at) : "N/A"}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : null}

                        {appointmentOrders.length > 0 ? (
                          <div className="mt-2 rounded-md border border-slate-200 bg-white px-2.5 py-2">
                            <p className="text-xs font-semibold text-slate-700">Care Orders</p>
                            <div className="mt-1 space-y-1">
                              {appointmentOrders.slice(0, 3).map((order) => (
                                <p key={order.id} className="text-[11px] text-slate-600">
                                  {order.title} ({statusLabel(order.status)})
                                  {order.due_date ? ` | Due ${formatDate(order.due_date)}` : ""}
                                </p>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    );
                  })
                )}
              </div>
            </article>
            <div className="space-y-4">
              <article className="rounded-2xl border border-white/70 bg-white/92 p-5 shadow-[0_16px_45px_-35px_rgba(15,23,42,0.85)]">
                <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-slate-600">
                  Prescriptions
                </h3>
                <div className="mt-3 space-y-2">
                  {prescriptions.length === 0 ? (
                    <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                      No prescriptions found.
                    </p>
                  ) : (
                    prescriptions.slice(0, 12).map((item) => (
                      <div
                        key={item.id}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2"
                      >
                        <p className="text-sm font-semibold text-slate-900">
                          {item.medication_name}
                        </p>
                        <p className="text-xs text-slate-600">
                          {item.dosage} | {statusLabel(item.status)}
                        </p>
                        <p className="text-xs text-slate-500">
                          Issued: {formatDate(item.issued_at)}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </article>
              <article className="rounded-2xl border border-white/70 bg-white/92 p-5 shadow-[0_16px_45px_-35px_rgba(15,23,42,0.85)]">
                <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-slate-600">
                  Care Plans and Orders
                </h3>
                <div className="mt-3 space-y-2">
                  {careOrders.length === 0 ? (
                    <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                      No care orders shared yet.
                    </p>
                  ) : (
                    careOrders.slice(0, 10).map((order) => (
                      <div key={order.id} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                        <p className="text-sm font-semibold text-slate-900">{order.title}</p>
                        <p className="text-xs text-slate-600">
                          {statusLabel(order.order_type)} | {statusLabel(order.status)}
                        </p>
                        {order.details ? (
                          <p className="text-xs text-slate-500">{order.details}</p>
                        ) : null}
                        {order.due_date ? (
                          <p className="text-xs text-slate-500">Due: {formatDate(order.due_date)}</p>
                        ) : null}
                      </div>
                    ))
                  )}
                </div>
              </article>
            </div>
          </section>
        ) : null}

        {persona === "patient" && module === "inbox" ? (
          <section className="grid gap-4 lg:grid-cols-[1fr_1.15fr]">
            <article className="rounded-2xl border border-white/70 bg-white/92 p-5 shadow-[0_16px_45px_-35px_rgba(15,23,42,0.85)]">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-lg font-semibold text-slate-900">Notifications</h2>
                <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-semibold text-slate-700">
                  Unread: {notificationsUnreadCount}
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-600">
                Claim updates, reminders, and compliance messages are shown here.
              </p>
              <div className="mt-4 space-y-2">
                {notifications.length === 0 ? (
                  <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                    No notifications yet.
                  </p>
                ) : (
                  notifications.slice(0, 24).map((item) => (
                    <div key={item.id} className="rounded-lg border border-slate-200 bg-white p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                        <span
                          className={`inline-flex rounded-md border px-2 py-0.5 text-xs font-semibold ${statusBadgeClass(item.status)}`}
                        >
                          {statusLabel(item.status)}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-700">{item.message}</p>
                      <p className="mt-1 text-[11px] text-slate-500">
                        Channel: {statusLabel(item.channel)} |{" "}
                        {item.sent_at ? `Sent ${formatDateTime(item.sent_at)}` : `Created ${formatDateTime(item.created_at)}`}
                      </p>
                      {item.appointment_id ? (
                        <p className="mt-1 text-[11px] text-slate-500">
                          Appointment #{shortId(item.appointment_id)}
                        </p>
                      ) : null}
                      {item.status !== "read" ? (
                        <form action={markNotificationReadAction} className="mt-2">
                          <input type="hidden" name="return_to" value={currentPath} />
                          <input type="hidden" name="notification_id" value={item.id} />
                          <button
                            type="submit"
                            className="rounded-md border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-800"
                          >
                            Mark as read
                          </button>
                        </form>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            </article>
            <article className="rounded-2xl border border-white/70 bg-white/92 p-5 shadow-[0_16px_45px_-35px_rgba(15,23,42,0.85)]">
              <h2 className="text-lg font-semibold text-slate-900">Care Communication Thread</h2>
              <p className="mt-1 text-sm text-slate-600">
                Read-only MVP stream of provider-patient communication from your records.
              </p>
              <div className="mt-4 space-y-3">
                {messages.length === 0 ? (
                  <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                    No messages yet.
                  </p>
                ) : (
                  messages.map((item) => {
                    const fromMe = item.sender_id === user.id;
                    return (
                      <div
                        key={item.id}
                        className={
                          fromMe
                            ? "ml-auto max-w-2xl rounded-xl border border-cyan-200 bg-cyan-50 p-3"
                            : "mr-auto max-w-2xl rounded-xl border border-slate-200 bg-white p-3"
                        }
                      >
                        <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                          <span>
                            {fromMe ? "You" : resolveName(item.sender_id)} to{" "}
                            {fromMe ? resolveName(item.recipient_id) : "You"}
                          </span>
                          <span>{formatDateTime(item.created_at)}</span>
                        </div>
                        <p className="mt-1 text-sm text-slate-800">{item.body}</p>
                        <p className="mt-1 text-[11px] text-slate-500">
                          Appointment #{shortId(item.appointment_id)}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>
            </article>
          </section>
        ) : null}
        {persona === "provider" && module === "dashboard" ? (
          <section className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
              {STATUS_ORDER.map((item) => (
                <article
                  key={item}
                  className="rounded-xl border border-white/70 bg-white/90 p-3 shadow-sm"
                >
                  <p className="text-xs uppercase tracking-[0.08em] text-slate-500">
                    {statusLabel(item)}
                  </p>
                  <p className="mt-1 text-2xl font-semibold text-slate-900">
                    {summary[item]}
                  </p>
                </article>
              ))}
              <article className="rounded-xl border border-white/70 bg-white/90 p-3 shadow-sm">
                <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Pending Claims</p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">{claimPendingCount}</p>
              </article>
              <article className="rounded-xl border border-white/70 bg-white/90 p-3 shadow-sm">
                <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Paid Claims</p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">{claimPaidCount}</p>
              </article>
            </div>

            <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
              <article className="rounded-2xl border border-white/70 bg-white/92 p-5 shadow-[0_16px_45px_-35px_rgba(15,23,42,0.85)]">
                <h2 className="text-lg font-semibold text-slate-900">Today&apos;s Queue</h2>
                <div className="mt-4 space-y-3">
                  {appointments.length === 0 ? (
                    <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                      No patient queue for now.
                    </p>
                  ) : (
                    appointments.map((item) => {
                      const session = sessionByAppointment.get(item.id);
                      const appointmentInvoices = invoicesByAppointment.get(item.id) ?? [];
                      const appointmentClaims = claimsByAppointment.get(item.id) ?? [];
                      const consultationState = session?.status ?? "scheduled";

                      return (
                        <div
                          key={item.id}
                          className="rounded-xl border border-slate-200 bg-white p-3"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-slate-900">
                              {resolveName(item.patient_id)}
                            </p>
                            <span
                              className={`inline-flex rounded-md border px-2 py-0.5 text-xs font-semibold ${statusBadgeClass(item.status)}`}
                            >
                              {statusLabel(item.status)}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-slate-600">
                            {formatDateTime(item.scheduled_at)} | {item.duration_minutes} mins
                          </p>
                          <p className="mt-1 text-sm text-slate-700">
                            {item.reason ?? "No reason shared"}
                          </p>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span
                              className={`inline-flex rounded-md border px-2 py-0.5 text-xs font-semibold ${statusBadgeClass(consultationState)}`}
                            >
                              Consultation: {statusLabel(consultationState)}
                            </span>
                            {session?.patient_ready_at ? (
                              <span className="text-xs text-slate-500">
                                Patient ready: {formatDateTime(session.patient_ready_at)}
                              </span>
                            ) : null}
                            <Link
                              href={`/workspace/call/${item.id}`}
                              className="inline-flex rounded-md border border-indigo-300 bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-800"
                            >
                              Open Teleconsult
                            </Link>
                          </div>

                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {["ready", "in_consult", "completed", "cancelled"].map((state) => (
                              <form key={state} action={updateConsultationStatusAction}>
                                <input type="hidden" name="return_to" value={currentPath} />
                                <input type="hidden" name="appointment_id" value={item.id} />
                                <input type="hidden" name="status" value={state} />
                                <button
                                  type="submit"
                                  className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:border-slate-400"
                                >
                                  Consultation {statusLabel(state)}
                                </button>
                              </form>
                            ))}
                          </div>

                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {["in_progress", "completed", "cancelled", "no_show"].map((state) => (
                              <form key={state} action={updateAppointmentStatusAction}>
                                <input type="hidden" name="return_to" value={currentPath} />
                                <input type="hidden" name="appointment_id" value={item.id} />
                                <input type="hidden" name="status" value={state} />
                                <button
                                  type="submit"
                                  className="rounded-md border border-slate-300 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:border-slate-400"
                                >
                                  Mark {statusLabel(state)}
                                </button>
                              </form>
                            ))}
                          </div>

                          {appointmentInvoices.length > 0 ? (
                            <div className="mt-2 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-2">
                              {appointmentInvoices.slice(0, 2).map((invoice) => (
                                <p key={invoice.id} className="text-xs text-slate-600">
                                  Billing: {formatCurrency(invoice.amount, invoice.currency)} |{" "}
                                  {statusLabel(invoice.status)}
                                </p>
                              ))}
                            </div>
                          ) : null}

                          <div className="mt-2 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-2">
                            {appointmentClaims.length === 0 ? (
                              <form action={submitClaimAction} className="flex flex-wrap items-center gap-2">
                                <input type="hidden" name="return_to" value={currentPath} />
                                <input type="hidden" name="appointment_id" value={item.id} />
                                <input type="hidden" name="payer_name" value="Self-pay" />
                                <input type="hidden" name="amount_claimed" value={appointmentInvoices[0]?.amount ?? 499} />
                                <button
                                  type="submit"
                                  className="rounded-md border border-sky-300 bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-800"
                                >
                                  Submit Claim
                                </button>
                              </form>
                            ) : (
                              appointmentClaims.slice(0, 2).map((claim) => (
                                <p key={claim.id} className="text-xs text-slate-700">
                                  Claim {formatCurrency(claim.amount_claimed, "INR")} |{" "}
                                  <span
                                    className={`inline-flex rounded-md border px-2 py-0.5 text-[11px] font-semibold ${statusBadgeClass(claim.status)}`}
                                  >
                                    {statusLabel(claim.status)}
                                  </span>
                                </p>
                              ))
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </article>

              <article className="space-y-4">
                <div className="rounded-2xl border border-white/70 bg-white/92 p-5 shadow-[0_16px_45px_-35px_rgba(15,23,42,0.85)]">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-slate-600">
                    Send Notification
                  </h3>
                  <form action={sendNotificationAction} className="mt-3 grid gap-2">
                    <input type="hidden" name="return_to" value={currentPath} />
                    <select
                      name="recipient_id"
                      required
                      className="rounded-md border border-slate-300 bg-white px-2.5 py-2 text-xs text-slate-800"
                    >
                      <option value="">Select patient</option>
                      {providerPatientOptions.map((patientId) => (
                        <option key={patientId} value={patientId}>
                          {resolveName(patientId)}
                        </option>
                      ))}
                    </select>
                    <select
                      name="channel"
                      defaultValue="in_app"
                      className="rounded-md border border-slate-300 bg-white px-2.5 py-2 text-xs text-slate-800"
                    >
                      <option value="in_app">In App</option>
                      <option value="email">Email</option>
                      <option value="sms">SMS</option>
                      <option value="whatsapp">WhatsApp</option>
                    </select>
                    <input
                      name="title"
                      placeholder="Notification title"
                      required
                      className="rounded-md border border-slate-300 bg-white px-2.5 py-2 text-xs text-slate-800"
                    />
                    <textarea
                      name="message"
                      rows={3}
                      placeholder="Message"
                      required
                      className="rounded-md border border-slate-300 bg-white px-2.5 py-2 text-xs text-slate-800"
                    />
                    <button
                      type="submit"
                      className="rounded-md bg-gradient-to-r from-cyan-600 to-blue-600 px-3 py-1.5 text-xs font-semibold text-white"
                    >
                      Send
                    </button>
                  </form>
                </div>
                <div className="rounded-2xl border border-white/70 bg-white/92 p-5 shadow-[0_16px_45px_-35px_rgba(15,23,42,0.85)]">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-slate-600">
                    Recent Notifications
                  </h3>
                  <div className="mt-3 space-y-2">
                    {notifications.length === 0 ? (
                      <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                        No notification events yet.
                      </p>
                    ) : (
                      notifications.slice(0, 12).map((item) => (
                        <div key={item.id} className="rounded-lg border border-slate-200 bg-white p-2.5">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                            <span
                              className={`inline-flex rounded-md border px-2 py-0.5 text-[11px] font-semibold ${statusBadgeClass(item.status)}`}
                            >
                              {statusLabel(item.status)}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600">{item.message}</p>
                          <p className="text-[11px] text-slate-500">
                            {item.sender_id === user.id ? "Sent by you" : "Received"} |{" "}
                            {formatDateTime(item.created_at)}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </article>
            </div>
          </section>
        ) : null}

        {persona === "provider" && module === "schedule" ? (
          <section className="grid gap-4 lg:grid-cols-[0.95fr_1.2fr]">
            <article className="rounded-2xl border border-white/70 bg-white/92 p-5 shadow-[0_16px_45px_-35px_rgba(15,23,42,0.85)]">
              <h2 className="text-lg font-semibold text-slate-900">Add Availability Slot</h2>
              <form action={addAvailabilityAction} className="mt-4 grid gap-3">
                <input type="hidden" name="return_to" value={currentPath} />
                <label className="grid gap-1">
                  <span className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-600">
                    Weekday
                  </span>
                  <select
                    name="weekday"
                    required
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                  >
                    {WEEKDAYS.map((item, index) => (
                      <option key={item} value={index}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1">
                  <span className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-600">
                    Start Time
                  </span>
                  <input
                    type="time"
                    name="start_time"
                    required
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                  />
                </label>
                <label className="grid gap-1">
                  <span className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-600">
                    End Time
                  </span>
                  <input
                    type="time"
                    name="end_time"
                    required
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                  />
                </label>
                <label className="grid gap-1">
                  <span className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-600">
                    Slot Minutes
                  </span>
                  <input
                    type="number"
                    name="slot_minutes"
                    min={10}
                    max={240}
                    defaultValue={30}
                    required
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                  />
                </label>
                <label className="grid gap-1">
                  <span className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-600">
                    Timezone
                  </span>
                  <input
                    type="text"
                    name="timezone"
                    defaultValue="Asia/Kolkata"
                    required
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                  />
                </label>
                <button
                  type="submit"
                  className="rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_12px_30px_-18px_rgba(8,145,178,0.95)]"
                >
                  Save Slot
                </button>
              </form>
            </article>

            <article className="rounded-2xl border border-white/70 bg-white/92 p-5 shadow-[0_16px_45px_-35px_rgba(15,23,42,0.85)]">
              <h2 className="text-lg font-semibold text-slate-900">Active Schedule</h2>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {availability.length === 0 ? (
                  <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 sm:col-span-2">
                    No availability slots found.
                  </p>
                ) : (
                  availability.map((slot) => (
                    <div
                      key={slot.id}
                      className="rounded-lg border border-slate-200 bg-white p-3"
                    >
                      <p className="text-sm font-semibold text-slate-900">
                        {WEEKDAYS[slot.weekday] ?? `Day ${slot.weekday}`}
                      </p>
                      <p className="text-xs text-slate-600">
                        {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                      </p>
                      <p className="text-xs text-slate-500">
                        {slot.slot_minutes} mins | {slot.timezone}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </article>
          </section>
        ) : null}

        {persona === "provider" && module === "patients" ? (
          <section className="grid gap-4 xl:grid-cols-[0.9fr_1.5fr]">
            <article className="rounded-2xl border border-white/70 bg-white/92 p-5 shadow-[0_16px_45px_-35px_rgba(15,23,42,0.85)]">
              <h2 className="text-lg font-semibold text-slate-900">Patient Panel</h2>
              <div className="mt-3 space-y-2">
                {Array.from(patientInsights.values()).length === 0 ? (
                  <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                    No patients linked yet.
                  </p>
                ) : (
                  Array.from(patientInsights.values())
                    .sort(
                      (a, b) =>
                        new Date(b.lastVisit).getTime() -
                        new Date(a.lastVisit).getTime(),
                    )
                    .map((item) => (
                      <div
                        key={item.id}
                        className="rounded-lg border border-slate-200 bg-white p-3"
                      >
                        <p className="text-sm font-semibold text-slate-900">
                          {resolveName(item.id)}
                        </p>
                        <p className="text-xs text-slate-600">
                          Last visit: {formatDateTime(item.lastVisit)}
                        </p>
                        <p className="text-xs text-slate-600">
                          Total visits: {item.total} | Open: {item.open}
                        </p>
                      </div>
                    ))
                )}
              </div>
            </article>
            <article className="space-y-4">
              <div className="rounded-2xl border border-white/70 bg-white/92 p-5 shadow-[0_16px_45px_-35px_rgba(15,23,42,0.85)]">
                <h2 className="text-lg font-semibold text-slate-900">Clinical Workbench</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Complete SOAP notes, prescriptions, and care orders per appointment.
                </p>
                <div className="mt-3 space-y-3">
                  {appointments.length === 0 ? (
                    <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                      No appointments in provider panel.
                    </p>
                  ) : (
                    appointments.slice(0, 8).map((item) => {
                      const note = noteByAppointment.get(item.id);
                      const session = sessionByAppointment.get(item.id);
                      const orders = careOrdersByAppointment.get(item.id) ?? [];

                      return (
                        <div key={item.id} className="rounded-lg border border-slate-200 bg-white p-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-slate-900">
                              {resolveName(item.patient_id)} | {formatDateTime(item.scheduled_at)}
                            </p>
                            <div className="flex flex-wrap gap-1">
                              <span
                                className={`inline-flex rounded-md border px-2 py-0.5 text-xs font-semibold ${statusBadgeClass(item.status)}`}
                              >
                                {statusLabel(item.status)}
                              </span>
                              <span
                                className={`inline-flex rounded-md border px-2 py-0.5 text-xs font-semibold ${statusBadgeClass(session?.status ?? "scheduled")}`}
                              >
                                {statusLabel(session?.status ?? "scheduled")}
                              </span>
                              <span
                                className={`inline-flex rounded-md border px-2 py-0.5 text-xs font-semibold ${statusBadgeClass(note?.status ?? "draft")}`}
                              >
                                Note {statusLabel(note?.status ?? "draft")}
                              </span>
                            </div>
                          </div>

                          <div className="mt-2 grid gap-2 xl:grid-cols-2">
                            <form action={saveEncounterNoteAction} className="grid gap-2 rounded-md border border-slate-200 bg-slate-50 p-2.5">
                              <input type="hidden" name="return_to" value={currentPath} />
                              <input type="hidden" name="appointment_id" value={item.id} />
                              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-600">SOAP Note</p>
                              <textarea
                                name="subjective"
                                rows={2}
                                defaultValue={note?.subjective ?? ""}
                                placeholder="Subjective"
                                className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-800"
                              />
                              <textarea
                                name="objective"
                                rows={2}
                                defaultValue={note?.objective ?? ""}
                                placeholder="Objective"
                                className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-800"
                              />
                              <textarea
                                name="assessment"
                                rows={2}
                                defaultValue={note?.assessment ?? ""}
                                placeholder="Assessment"
                                className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-800"
                              />
                              <textarea
                                name="plan"
                                rows={2}
                                defaultValue={note?.plan ?? ""}
                                placeholder="Plan"
                                className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-800"
                              />
                              <button
                                type="submit"
                                className="rounded-md bg-gradient-to-r from-cyan-600 to-blue-600 px-2.5 py-1 text-xs font-semibold text-white"
                              >
                                Save Draft
                              </button>
                            </form>

                            <div className="grid gap-2">
                              <form action={issuePrescriptionAction} className="grid gap-2 rounded-md border border-slate-200 bg-slate-50 p-2.5">
                                <input type="hidden" name="return_to" value={currentPath} />
                                <input type="hidden" name="appointment_id" value={item.id} />
                                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-600">Issue Prescription</p>
                                <input
                                  name="medication_name"
                                  placeholder="Medication name"
                                  required
                                  className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-800"
                                />
                                <input
                                  name="dosage"
                                  placeholder="Dosage"
                                  required
                                  className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-800"
                                />
                                <textarea
                                  name="instructions"
                                  rows={2}
                                  placeholder="Instructions"
                                  className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-800"
                                />
                                <button
                                  type="submit"
                                  className="rounded-md bg-emerald-700 px-2.5 py-1 text-xs font-semibold text-white"
                                >
                                  Issue Rx
                                </button>
                              </form>

                              <form action={createCareOrderAction} className="grid gap-2 rounded-md border border-slate-200 bg-slate-50 p-2.5">
                                <input type="hidden" name="return_to" value={currentPath} />
                                <input type="hidden" name="appointment_id" value={item.id} />
                                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-600">Create Care Order</p>
                                <select
                                  name="order_type"
                                  defaultValue="follow_up"
                                  className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-800"
                                >
                                  <option value="follow_up">Follow Up</option>
                                  <option value="lab">Lab</option>
                                  <option value="imaging">Imaging</option>
                                  <option value="lifestyle">Lifestyle</option>
                                  <option value="other">Other</option>
                                </select>
                                <input
                                  name="title"
                                  placeholder="Order title"
                                  required
                                  className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-800"
                                />
                                <textarea
                                  name="details"
                                  rows={2}
                                  placeholder="Details"
                                  className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-800"
                                />
                                <input
                                  type="date"
                                  name="due_date"
                                  className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-800"
                                />
                                <button
                                  type="submit"
                                  className="rounded-md bg-indigo-700 px-2.5 py-1 text-xs font-semibold text-white"
                                >
                                  Add Order
                                </button>
                              </form>
                            </div>
                          </div>

                          <div className="mt-2 flex flex-wrap gap-1.5">
                            <form action={signEncounterNoteAction}>
                              <input type="hidden" name="return_to" value={currentPath} />
                              <input type="hidden" name="appointment_id" value={item.id} />
                              <button
                                type="submit"
                                className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700"
                              >
                                Sign Note & Complete Visit
                              </button>
                            </form>
                          </div>

                          {orders.length > 0 ? (
                            <div className="mt-2 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-2">
                              {orders.slice(0, 3).map((order) => (
                                <p key={order.id} className="text-xs text-slate-600">
                                  {order.title} ({statusLabel(order.status)})
                                </p>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
              <div className="rounded-2xl border border-white/70 bg-white/92 p-5 shadow-[0_16px_45px_-35px_rgba(15,23,42,0.85)]">
                <h2 className="text-lg font-semibold text-slate-900">
                  Recent Prescriptions Issued
                </h2>
                <div className="mt-3 space-y-2">
                  {prescriptions.length === 0 ? (
                    <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                      No prescriptions in your queue.
                    </p>
                  ) : (
                    prescriptions.slice(0, 20).map((item) => (
                      <div
                        key={item.id}
                        className="rounded-lg border border-slate-200 bg-white p-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-slate-900">
                            {item.medication_name}
                          </p>
                          <span
                            className={`inline-flex rounded-md border px-2 py-0.5 text-xs font-semibold ${statusBadgeClass(item.status)}`}
                          >
                            {statusLabel(item.status)}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600">{item.dosage}</p>
                        <p className="text-xs text-slate-500">
                          Patient: {resolveName(item.patient_id)} | Issued:{" "}
                          {formatDate(item.issued_at)}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </article>
          </section>
        ) : null}
        {persona === "admin" && module === "pulse" ? (
          <section className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-8">
              <article className="rounded-xl border border-white/70 bg-white/92 p-4 shadow-sm">
                <p className="text-xs uppercase tracking-[0.08em] text-slate-500">
                  Active Sessions
                </p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">{activeSessions}</p>
              </article>
              <article className="rounded-xl border border-white/70 bg-white/92 p-4 shadow-sm">
                <p className="text-xs uppercase tracking-[0.08em] text-slate-500">
                  Providers
                </p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">{providerCount}</p>
              </article>
              <article className="rounded-xl border border-white/70 bg-white/92 p-4 shadow-sm">
                <p className="text-xs uppercase tracking-[0.08em] text-slate-500">
                  Patients
                </p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">{patientCount}</p>
              </article>
              <article className="rounded-xl border border-white/70 bg-white/92 p-4 shadow-sm">
                <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Today Visits</p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">
                  {todayAppointments.length}
                </p>
              </article>
              <article className="rounded-xl border border-white/70 bg-white/92 p-4 shadow-sm">
                <p className="text-xs uppercase tracking-[0.08em] text-slate-500">
                  Booked Queue
                </p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">{summary.booked}</p>
              </article>
              <article className="rounded-xl border border-white/70 bg-white/92 p-4 shadow-sm">
                <p className="text-xs uppercase tracking-[0.08em] text-slate-500">
                  Checked In
                </p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">{consultationCheckedInCount}</p>
              </article>
              <article className="rounded-xl border border-white/70 bg-white/92 p-4 shadow-sm">
                <p className="text-xs uppercase tracking-[0.08em] text-slate-500">
                  In Consult
                </p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">{consultationInProgressCount}</p>
              </article>
              <article className="rounded-xl border border-white/70 bg-white/92 p-4 shadow-sm">
                <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Paid Invoices</p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">{paidInvoiceCount}</p>
              </article>
              <article className="rounded-xl border border-white/70 bg-white/92 p-4 shadow-sm">
                <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Pending Invoices</p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">{pendingInvoiceCount}</p>
              </article>
              <article className="rounded-xl border border-white/70 bg-white/92 p-4 shadow-sm">
                <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Pending Claims</p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">{claimPendingCount}</p>
              </article>
              <article className="rounded-xl border border-white/70 bg-white/92 p-4 shadow-sm">
                <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Open Incidents</p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">{openIncidentCount}</p>
              </article>
              <article className="rounded-xl border border-white/70 bg-white/92 p-4 shadow-sm">
                <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Compliance Open</p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">{unresolvedComplianceCount}</p>
              </article>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
              <article className="rounded-2xl border border-white/70 bg-white/92 p-5 shadow-[0_16px_45px_-35px_rgba(15,23,42,0.85)]">
                <h2 className="text-lg font-semibold text-slate-900">Status Distribution</h2>
                <div className="mt-4 space-y-2">
                  {STATUS_ORDER.map((item) => (
                    <div key={item}>
                      <div className="mb-1 flex items-center justify-between text-xs font-semibold text-slate-600">
                        <span>{statusLabel(item)}</span>
                        <span>{summary[item]}</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100">
                        <div
                          style={{
                            width: `${scoreWidth(summary[item], todayAppointments.length)}%`,
                          }}
                          className={
                            item === "completed"
                              ? "h-2 rounded-full bg-emerald-500"
                              : item === "in_progress"
                                ? "h-2 rounded-full bg-indigo-500"
                                : item === "booked"
                                  ? "h-2 rounded-full bg-cyan-500"
                                  : item === "cancelled"
                                    ? "h-2 rounded-full bg-rose-500"
                                    : "h-2 rounded-full bg-amber-500"
                          }
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-xs font-semibold text-slate-600">
                  Collected Revenue (Demo): {formatCurrency(billedRevenue, "INR")}
                </p>
              </article>

              <article className="rounded-2xl border border-white/70 bg-white/92 p-5 shadow-[0_16px_45px_-35px_rgba(15,23,42,0.85)]">
                <h2 className="text-lg font-semibold text-slate-900">Today&apos;s Queue</h2>
                <div className="mt-3 space-y-2">
                  {todayAppointments.length === 0 ? (
                    <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                      No appointments scheduled today.
                    </p>
                  ) : (
                    todayAppointments.slice(0, 18).map((item) => (
                      <div
                        key={item.id}
                        className="rounded-lg border border-slate-200 bg-white p-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-slate-900">
                            {resolveName(item.patient_id)} with {resolveName(item.provider_id)}
                          </p>
                          <span
                            className={`inline-flex rounded-md border px-2 py-0.5 text-xs font-semibold ${statusBadgeClass(item.status)}`}
                          >
                            {statusLabel(item.status)}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600">
                          {formatDateTime(item.scheduled_at)}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </article>
            </div>
          </section>
        ) : null}

        {persona === "admin" && module === "operations" ? (
          <section className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
            <article className="rounded-2xl border border-white/70 bg-white/92 p-5 shadow-[0_16px_45px_-35px_rgba(15,23,42,0.85)]">
              <h2 className="text-lg font-semibold text-slate-900">Appointments Control Desk</h2>
              <div className="mt-4 space-y-3">
                {appointments.length === 0 ? (
                  <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                    No appointments found.
                  </p>
                ) : (
                  appointments.slice(0, 35).map((item) => {
                    const session = sessionByAppointment.get(item.id);
                    const appointmentInvoices = invoicesByAppointment.get(item.id) ?? [];

                    return (
                      <div
                        key={item.id}
                        className="rounded-xl border border-slate-200 bg-white p-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-slate-900">
                            {resolveName(item.patient_id)} and {resolveName(item.provider_id)}
                          </p>
                          <span
                            className={`inline-flex rounded-md border px-2 py-0.5 text-xs font-semibold ${statusBadgeClass(item.status)}`}
                          >
                            {statusLabel(item.status)}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-600">
                          {formatDateTime(item.scheduled_at)} | Appointment #{shortId(item.id)}
                        </p>
                        <p className="mt-1 text-sm text-slate-700">
                          {item.reason ?? "No reason entered"}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span
                            className={`inline-flex rounded-md border px-2 py-0.5 text-xs font-semibold ${statusBadgeClass(session?.status ?? "scheduled")}`}
                          >
                            Consultation {statusLabel(session?.status ?? "scheduled")}
                          </span>
                          {session?.updated_at ? (
                            <span className="text-xs text-slate-500">
                              Updated {formatDateTime(session.updated_at)}
                            </span>
                          ) : null}
                          <Link
                            href={`/workspace/call/${item.id}`}
                            className="inline-flex rounded-md border border-cyan-300 bg-cyan-50 px-2 py-0.5 text-xs font-semibold text-cyan-800"
                          >
                            Video Room
                          </Link>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {["ready", "in_consult", "completed", "cancelled"].map((state) => (
                            <form key={state} action={updateConsultationStatusAction}>
                              <input type="hidden" name="return_to" value={currentPath} />
                              <input type="hidden" name="appointment_id" value={item.id} />
                              <input type="hidden" name="status" value={state} />
                              <button
                                type="submit"
                                className="rounded-md border border-slate-300 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:border-slate-400"
                              >
                                Consult {statusLabel(state)}
                              </button>
                            </form>
                          ))}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {STATUS_ORDER.map((state) => (
                            <form key={state} action={updateAppointmentStatusAction}>
                              <input type="hidden" name="return_to" value={currentPath} />
                              <input type="hidden" name="appointment_id" value={item.id} />
                              <input type="hidden" name="status" value={state} />
                              <button
                                type="submit"
                                className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:border-slate-400"
                              >
                                {statusLabel(state)}
                              </button>
                            </form>
                          ))}
                        </div>
                        {appointmentInvoices.length > 0 ? (
                          <div className="mt-2 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-2">
                            {appointmentInvoices.slice(0, 2).map((invoice) => (
                              <p key={invoice.id} className="text-xs text-slate-600">
                                {formatCurrency(invoice.amount, invoice.currency)} | {statusLabel(invoice.status)}
                              </p>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    );
                  })
                )}
              </div>
            </article>

            <article className="space-y-4">
              <div className="rounded-2xl border border-white/70 bg-white/92 p-5 shadow-[0_16px_45px_-35px_rgba(15,23,42,0.85)]">
                <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-slate-600">
                  Provider Throughput
                </h3>
                <div className="mt-3 space-y-2">
                  {Array.from(providerOps.values()).length === 0 ? (
                    <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                      Throughput data unavailable.
                    </p>
                  ) : (
                    Array.from(providerOps.values())
                      .sort((a, b) => b.total - a.total)
                      .slice(0, 10)
                      .map((row) => (
                        <div
                          key={row.id}
                          className="rounded-lg border border-slate-200 bg-white p-3"
                        >
                          <p className="text-sm font-semibold text-slate-900">
                            {resolveName(row.id)}
                          </p>
                          <p className="text-xs text-slate-600">
                            Total: {row.total} | Completed: {row.completed} | In Progress:{" "}
                            {row.in_progress}
                          </p>
                        </div>
                      ))
                  )}
                </div>
              </div>
              <div className="rounded-2xl border border-white/70 bg-white/92 p-5 shadow-[0_16px_45px_-35px_rgba(15,23,42,0.85)]">
                <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-slate-600">
                  Registered Providers
                </h3>
                <div className="mt-3 space-y-2">
                  {providers.length === 0 ? (
                    <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                      Provider list unavailable.
                    </p>
                  ) : (
                    providers.slice(0, 12).map((item) => (
                      <div
                        key={item.id}
                        className="rounded-lg border border-slate-200 bg-white p-2.5"
                      >
                        <p className="text-sm font-semibold text-slate-900">
                          {item.full_name ?? `Provider ${shortId(item.id)}`}
                        </p>
                        <p className="text-xs text-slate-500">ID: {shortId(item.id)}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div className="rounded-2xl border border-white/70 bg-white/92 p-5 shadow-[0_16px_45px_-35px_rgba(15,23,42,0.85)]">
                <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-slate-600">
                  Billing Overview
                </h3>
                <div className="mt-3 space-y-2">
                  {invoices.length === 0 ? (
                    <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                      No invoices available.
                    </p>
                  ) : (
                    invoices.slice(0, 12).map((invoice) => (
                      <div key={invoice.id} className="rounded-lg border border-slate-200 bg-white p-2.5">
                        <p className="text-sm font-semibold text-slate-900">
                          {formatCurrency(invoice.amount, invoice.currency)}
                        </p>
                        <p className="text-xs text-slate-600">
                          {statusLabel(invoice.status)} | Patient {resolveName(invoice.patient_id)}
                        </p>
                        <p className="text-xs text-slate-500">
                          {invoice.paid_at ? `Paid ${formatDateTime(invoice.paid_at)}` : `Created ${formatDateTime(invoice.created_at)}`}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div className="rounded-2xl border border-white/70 bg-white/92 p-5 shadow-[0_16px_45px_-35px_rgba(15,23,42,0.85)]">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-slate-600">
                    Claims Queue
                  </h3>
                  <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-semibold text-slate-700">
                    Pending: {claimPendingCount}
                  </span>
                </div>
                <div className="mt-3 space-y-2">
                  {claims.length === 0 ? (
                    <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                      No claims available.
                    </p>
                  ) : (
                    claims.slice(0, 8).map((claim) => (
                      <div key={claim.id} className="rounded-lg border border-slate-200 bg-white p-2.5">
                        <p className="text-sm font-semibold text-slate-900">
                          {resolveName(claim.patient_id)} | {formatCurrency(claim.amount_claimed, "INR")}
                        </p>
                        <p className="text-xs text-slate-600">
                          {statusLabel(claim.status)} | Provider {resolveName(claim.provider_id)}
                        </p>
                        <form action={updateClaimStatusAction} className="mt-2 flex gap-1.5">
                          <input type="hidden" name="return_to" value={currentPath} />
                          <input type="hidden" name="claim_id" value={claim.id} />
                          <select
                            name="status"
                            defaultValue={claim.status}
                            className="rounded-md border border-slate-300 bg-white px-2 py-0.5 text-[11px] text-slate-800"
                          >
                            <option value="draft">Draft</option>
                            <option value="submitted">Submitted</option>
                            <option value="under_review">Under Review</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                            <option value="paid">Paid</option>
                          </select>
                          <button
                            type="submit"
                            className="rounded-md border border-slate-300 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-700"
                          >
                            Update
                          </button>
                        </form>
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div className="rounded-2xl border border-white/70 bg-white/92 p-5 shadow-[0_16px_45px_-35px_rgba(15,23,42,0.85)]">
                <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-slate-600">
                  Compliance and Incidents
                </h3>
                <form action={createComplianceEventAction} className="mt-3 grid gap-2">
                  <input type="hidden" name="return_to" value={currentPath} />
                  <input
                    name="event_type"
                    placeholder="Compliance event type"
                    required
                    className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-800"
                  />
                  <select
                    name="risk_level"
                    defaultValue="medium"
                    className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-800"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                  <button
                    type="submit"
                    className="rounded-md bg-gradient-to-r from-cyan-600 to-blue-600 px-2.5 py-1.5 text-xs font-semibold text-white"
                  >
                    Create Compliance Event
                  </button>
                </form>
                <form action={createIncidentReportAction} className="mt-3 grid gap-2">
                  <input type="hidden" name="return_to" value={currentPath} />
                  <input
                    name="title"
                    placeholder="Incident title"
                    required
                    className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-800"
                  />
                  <textarea
                    name="description"
                    rows={2}
                    placeholder="Incident description"
                    required
                    className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-800"
                  />
                  <button
                    type="submit"
                    className="rounded-md border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700"
                  >
                    Create Incident
                  </button>
                </form>
                <div className="mt-3 space-y-1.5">
                  {complianceEvents.slice(0, 2).map((event) => (
                    <div key={event.id} className="rounded-md border border-slate-200 bg-white p-2">
                      <p className="text-xs font-semibold text-slate-900">
                        {event.event_type} ({statusLabel(event.risk_level)})
                      </p>
                      {!event.is_resolved ? (
                        <form action={resolveComplianceEventAction} className="mt-1">
                          <input type="hidden" name="return_to" value={currentPath} />
                          <input type="hidden" name="compliance_event_id" value={event.id} />
                          <button
                            type="submit"
                            className="rounded-md border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800"
                          >
                            Resolve
                          </button>
                        </form>
                      ) : null}
                    </div>
                  ))}
                  {incidents.slice(0, 2).map((incident) => (
                    <div key={incident.id} className="rounded-md border border-slate-200 bg-white p-2">
                      <p className="text-xs font-semibold text-slate-900">
                        {incident.title} ({statusLabel(incident.status)})
                      </p>
                      <form action={updateIncidentReportAction} className="mt-1 flex gap-1.5">
                        <input type="hidden" name="return_to" value={currentPath} />
                        <input type="hidden" name="incident_id" value={incident.id} />
                        <select
                          name="status"
                          defaultValue={incident.status}
                          className="rounded-md border border-slate-300 bg-white px-2 py-0.5 text-[11px] text-slate-800"
                        >
                          <option value="open">Open</option>
                          <option value="in_progress">In Progress</option>
                          <option value="resolved">Resolved</option>
                          <option value="closed">Closed</option>
                        </select>
                        <button
                          type="submit"
                          className="rounded-md border border-slate-300 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-700"
                        >
                          Update
                        </button>
                      </form>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl border border-white/70 bg-white/92 p-5 shadow-[0_16px_45px_-35px_rgba(15,23,42,0.85)]">
                <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-slate-600">
                  Permissions and Notifications
                </h3>
                <form action={upsertRolePermissionAction} className="mt-3 grid gap-2">
                  <input type="hidden" name="return_to" value={currentPath} />
                  <select
                    name="role"
                    defaultValue="provider"
                    className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-800"
                  >
                    <option value="patient">Patient</option>
                    <option value="provider">Provider</option>
                    <option value="admin">Admin</option>
                  </select>
                  <input
                    name="permission_key"
                    placeholder="permission.key"
                    required
                    className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-800"
                  />
                  <button
                    type="submit"
                    className="rounded-md bg-gradient-to-r from-cyan-600 to-blue-600 px-2.5 py-1.5 text-xs font-semibold text-white"
                  >
                    Save Permission
                  </button>
                </form>
                <div className="mt-3 space-y-1.5">
                  {rolePermissions.slice(0, 6).map((permission) => (
                    <div key={permission.id} className="rounded-md border border-slate-200 bg-white p-2">
                      <p className="text-xs font-semibold text-slate-900">{permission.permission_key}</p>
                      <p className="text-[11px] text-slate-600">{permission.role}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-3 space-y-1.5">
                  {notifications.slice(0, 4).map((item) => (
                    <div key={item.id} className="rounded-md border border-slate-200 bg-white p-2">
                      <p className="text-xs font-semibold text-slate-900">{item.title}</p>
                      <p className="text-[11px] text-slate-500">
                        To {resolveName(item.recipient_id)} | {statusLabel(item.status)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </article>
          </section>
        ) : null}
        {persona === "admin" && module === "audit" ? (
          <section className="rounded-2xl border border-white/70 bg-white/92 p-5 shadow-[0_16px_45px_-35px_rgba(15,23,42,0.85)]">
            <h2 className="text-lg font-semibold text-slate-900">Audit Stream</h2>
            <p className="mt-1 text-sm text-slate-600">
              Full event trail for appointment, availability, and workflow updates.
            </p>
            <div className="mt-4 space-y-2">
              {auditLogs.length === 0 ? (
                <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                  No audit entries captured yet.
                </p>
              ) : (
                auditLogs.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-slate-200 bg-white p-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-900">{item.action}</p>
                      <p className="text-xs text-slate-500">{formatDateTime(item.created_at)}</p>
                    </div>
                    <p className="mt-1 text-xs text-slate-600">
                      Actor:{" "}
                      {item.actor_id ? resolveName(item.actor_id) : "System"} | Entity:{" "}
                      {item.entity_type}
                      {item.entity_id ? ` (${shortId(item.entity_id)})` : ""}
                    </p>
                    <pre className="mt-2 overflow-x-auto rounded-lg bg-slate-950/95 p-2 text-[11px] leading-relaxed text-slate-100">
                      {JSON.stringify(item.metadata ?? {}, null, 2)}
                    </pre>
                  </div>
                ))
              )}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
