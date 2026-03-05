
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  addAvailabilityAction,
  bookAppointmentAction,
  updateAppointmentStatusAction,
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
  if (status === "completed") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }
  if (status === "cancelled") {
    return "border-rose-200 bg-rose-50 text-rose-800";
  }
  if (status === "no_show") {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function statusLabel(value: string) {
  return value.replace("_", " ");
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

  let providerCount = 0;
  let patientCount = 0;
  let activeSessions = 0;
  let todayAppointments: AppointmentRow[] = [];
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
      ]);

      appointments = (appointmentRows as AppointmentRow[] | null) ?? [];
      prescriptions = (prescriptionRows as PrescriptionRow[] | null) ?? [];
      dbError =
        appointmentError?.message ??
        prescriptionError?.message ??
        dbError;
    }

    if (module === "inbox") {
      const { data: messageRows, error: messageError } = await supabase
        .from("messages")
        .select(
          "id,appointment_id,sender_id,recipient_id,body,read_at,created_at",
        )
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order("created_at", { ascending: false })
        .limit(80);

      messages = (messageRows as MessageRow[] | null) ?? [];
      dbError = messageError?.message ?? dbError;
    }
  }

  if (persona === "provider") {
    if (module === "dashboard") {
      const { data: appointmentRows, error: appointmentError } = await supabase
        .from("appointments")
        .select(
          "id,patient_id,provider_id,scheduled_at,duration_minutes,reason,status,meeting_url,notes",
        )
        .eq("provider_id", user.id)
        .order("scheduled_at", { ascending: true })
        .limit(80);

      appointments = (appointmentRows as AppointmentRow[] | null) ?? [];
      dbError = appointmentError?.message ?? dbError;
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
      ]);

      appointments = (appointmentRows as AppointmentRow[] | null) ?? [];
      prescriptions = (prescriptionRows as PrescriptionRow[] | null) ?? [];
      dbError =
        appointmentError?.message ??
        prescriptionError?.message ??
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
      ]);

      todayAppointments = (todayRows as AppointmentRow[] | null) ?? [];
      activeSessions = activeCount ?? 0;
      providerCount = providerTotal ?? 0;
      patientCount = patientTotal ?? 0;

      dbError =
        todayError?.message ??
        activeError?.message ??
        providerError?.message ??
        patientError?.message ??
        dbError;
    }

    if (module === "operations") {
      const [
        { data: appointmentRows, error: appointmentError },
        { data: providerRows, error: providerError },
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
      ]);

      appointments = (appointmentRows as AppointmentRow[] | null) ?? [];
      providers = (providerRows as ProfileRow[] | null) ?? [];
      dbError =
        appointmentError?.message ??
        providerError?.message ??
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
    <main className="prototype-bg min-h-[calc(100vh-60px)] px-4 py-5 sm:px-8 sm:py-8">
      <div className="mx-auto w-full max-w-7xl space-y-5 animate-rise">
        <section className="rounded-3xl border border-white/80 bg-white/85 p-5 shadow-[0_22px_65px_-45px_rgba(2,8,20,0.9)] backdrop-blur sm:p-7">
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
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-right shadow-sm">
              <p className="text-xs font-semibold tracking-[0.12em] text-slate-500">
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
                    ? "rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white"
                    : "rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:border-slate-400"
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
                <button
                  type="submit"
                  className="mt-1 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white"
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
                  appointments.map((item) => (
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
                    </div>
                  ))
                )}
              </div>
            </article>
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
          </section>
        ) : null}

        {persona === "patient" && module === "inbox" ? (
          <section className="rounded-2xl border border-white/70 bg-white/92 p-5 shadow-[0_16px_45px_-35px_rgba(15,23,42,0.85)]">
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
          </section>
        ) : null}
        {persona === "provider" && module === "dashboard" ? (
          <section className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
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
            </div>

            <article className="rounded-2xl border border-white/70 bg-white/92 p-5 shadow-[0_16px_45px_-35px_rgba(15,23,42,0.85)]">
              <h2 className="text-lg font-semibold text-slate-900">Today&apos;s Queue</h2>
              <div className="mt-4 space-y-3">
                {appointments.length === 0 ? (
                  <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                    No patient queue for now.
                  </p>
                ) : (
                  appointments.map((item) => (
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
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {["in_progress", "completed", "cancelled", "no_show"].map((state) => (
                          <form key={state} action={updateAppointmentStatusAction}>
                            <input type="hidden" name="return_to" value={currentPath} />
                            <input type="hidden" name="appointment_id" value={item.id} />
                            <input type="hidden" name="status" value={state} />
                            <button
                              type="submit"
                              className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:border-slate-400"
                            >
                              Mark {statusLabel(state)}
                            </button>
                          </form>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </article>
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
                  className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white"
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
          <section className="grid gap-4 lg:grid-cols-[1.05fr_1.2fr]">
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
            <article className="rounded-2xl border border-white/70 bg-white/92 p-5 shadow-[0_16px_45px_-35px_rgba(15,23,42,0.85)]">
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
            </article>
          </section>
        ) : null}
        {persona === "admin" && module === "pulse" ? (
          <section className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
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
                  appointments.slice(0, 35).map((item) => (
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
                    </div>
                  ))
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
