import { notFound, redirect } from "next/navigation";
import { bookAppointmentAction, updateAppointmentStatusAction } from "@/app/workspace/actions";
import { requireProfile } from "@/lib/auth/session";
import { getDefaultModuleByRole, getModuleConfig, getPersonaConfig } from "@/lib/workspace/config";

type PageProps = {
  params: Promise<{ persona: string; module: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type SimpleProvider = {
  id: string;
  full_name: string | null;
};

type AppointmentRow = {
  id: string;
  patient_id: string;
  provider_id: string;
  scheduled_at: string;
  reason: string | null;
  status: string;
};

type AppointmentStatusSummary = {
  booked: number;
  in_progress: number;
  completed: number;
  cancelled: number;
  no_show: number;
};

type AdminPulseMetrics = {
  activeSessions: number;
  providers: number;
  patients: number;
  totalToday: number;
  overdueQueue: number;
  status: AppointmentStatusSummary;
};

function asString(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function formatDate(value: string) {
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export default async function ModuleWorkspacePage({ params, searchParams }: PageProps) {
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

  let bookingProviders: SimpleProvider[] = [];
  let patientAppointments: AppointmentRow[] = [];

  if (persona === "patient" && module === "booking") {
    const [{ data: providers, error: providersError }, { data: appointments, error: appointmentsError }] =
      await Promise.all([
        supabase.from("profiles").select("id,full_name").eq("role", "provider").order("created_at").limit(50),
        supabase
          .from("appointments")
          .select("id,patient_id,provider_id,scheduled_at,reason,status")
          .eq("patient_id", user.id)
          .order("scheduled_at", { ascending: true })
          .limit(30),
      ]);

    bookingProviders = (providers as SimpleProvider[] | null) ?? [];
    patientAppointments = (appointments as AppointmentRow[] | null) ?? [];

    if (providersError || appointmentsError) {
      dbError = providersError?.message ?? appointmentsError?.message ?? "Database query error.";
    }
  }

  let providerQueue: AppointmentRow[] = [];
  let patientMap: Record<string, string> = {};

  if (persona === "provider" && module === "dashboard") {
    const { data: queue, error: queueError } = await supabase
      .from("appointments")
      .select("id,patient_id,provider_id,scheduled_at,reason,status")
      .eq("provider_id", user.id)
      .order("scheduled_at", { ascending: true })
      .limit(40);

    providerQueue = (queue as AppointmentRow[] | null) ?? [];

    if (queueError) {
      dbError = queueError.message;
    } else if (providerQueue.length > 0) {
      const patientIds = [...new Set(providerQueue.map((item) => item.patient_id))];
      const { data: patientProfiles, error: patientProfilesError } = await supabase
        .from("profiles")
        .select("id,full_name")
        .in("id", patientIds);

      if (patientProfilesError) {
        dbError = patientProfilesError.message;
      } else {
        patientMap = Object.fromEntries(
          ((patientProfiles as SimpleProvider[] | null) ?? []).map((item) => [item.id, item.full_name ?? "Patient"]),
        );
      }
    }
  }

  let adminPulse: AdminPulseMetrics | null = null;
  let adminRecentAppointments: AppointmentRow[] = [];

  if (persona === "admin" && module === "pulse") {
    const nowIso = new Date().toISOString();
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const [
      { data: todayAppointments, error: todayError },
      { count: activeSessions, error: activeError },
      { count: providerCount, error: providerError },
      { count: patientCount, error: patientError },
      { data: recentAppointments, error: recentError },
    ] = await Promise.all([
      supabase
        .from("appointments")
        .select("id,patient_id,provider_id,scheduled_at,reason,status")
        .gte("scheduled_at", dayStart.toISOString())
        .lt("scheduled_at", dayEnd.toISOString()),
      supabase.from("appointments").select("id", { count: "exact", head: true }).eq("status", "in_progress"),
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "provider"),
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "patient"),
      supabase
        .from("appointments")
        .select("id,patient_id,provider_id,scheduled_at,reason,status")
        .order("scheduled_at", { ascending: false })
        .limit(20),
    ]);

    adminRecentAppointments = (recentAppointments as AppointmentRow[] | null) ?? [];

    if (todayError || activeError || providerError || patientError || recentError) {
      dbError =
        todayError?.message ??
        activeError?.message ??
        providerError?.message ??
        patientError?.message ??
        recentError?.message ??
        "Database query error.";
    } else {
      const rows = (todayAppointments as AppointmentRow[] | null) ?? [];

      const status = rows.reduce<AppointmentStatusSummary>(
        (acc, item) => {
          if (item.status === "booked") acc.booked += 1;
          if (item.status === "in_progress") acc.in_progress += 1;
          if (item.status === "completed") acc.completed += 1;
          if (item.status === "cancelled") acc.cancelled += 1;
          if (item.status === "no_show") acc.no_show += 1;
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

      const overdueQueue = rows.filter((item) => item.status === "booked" && item.scheduled_at < nowIso).length;

      adminPulse = {
        activeSessions: activeSessions ?? 0,
        providers: providerCount ?? 0,
        patients: patientCount ?? 0,
        totalToday: rows.length,
        overdueQueue,
        status,
      };
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto w-full max-w-7xl">
        <header className="mb-4">
          <h1 className="text-2xl font-bold text-slate-900">{moduleConfig.title}</h1>
          <p className="text-sm text-slate-600">{moduleConfig.description}</p>
        </header>

        {success ? (
          <p className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            {success}
          </p>
        ) : null}

        {error ? (
          <p className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p>
        ) : null}

        {dbError ? (
          <p className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            {dbError}
          </p>
        ) : null}

        {persona === "patient" && module === "booking" ? (
          <section className="grid gap-4 lg:grid-cols-2">
            <article className="rounded-xl border border-slate-200 bg-white p-4">
              <h2 className="text-lg font-semibold text-slate-900">Book Appointment</h2>
              <form action={bookAppointmentAction} className="mt-4 grid gap-3">
                <input type="hidden" name="return_to" value={currentPath} />
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">Provider</span>
                  <select
                    name="provider_id"
                    required
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                  >
                    <option value="">Select provider</option>
                    {bookingProviders.map((provider) => (
                      <option key={provider.id} value={provider.id}>
                        {provider.full_name ?? provider.id}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">Date and Time</span>
                  <input
                    type="datetime-local"
                    name="scheduled_at"
                    required
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">Reason</span>
                  <textarea
                    name="reason"
                    rows={3}
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                    placeholder="Brief symptoms or reason for visit"
                  />
                </label>
                <button type="submit" className="rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white">
                  Book
                </button>
              </form>
            </article>

            <article className="rounded-xl border border-slate-200 bg-white p-4">
              <h2 className="text-lg font-semibold text-slate-900">Upcoming Appointments</h2>
              <div className="mt-3 space-y-2">
                {patientAppointments.length === 0 ? (
                  <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                    No appointments yet.
                  </p>
                ) : (
                  patientAppointments.map((item) => (
                    <div key={item.id} className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                      <p className="font-semibold text-slate-900">{formatDate(item.scheduled_at)}</p>
                      <p className="text-slate-700">Status: {item.status}</p>
                      <p className="text-slate-700">Reason: {item.reason ?? "No reason"}</p>
                    </div>
                  ))
                )}
              </div>
            </article>
          </section>
        ) : null}

        {persona === "provider" && module === "dashboard" ? (
          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="text-lg font-semibold text-slate-900">Assigned Queue</h2>
            <div className="mt-3 space-y-2">
              {providerQueue.length === 0 ? (
                <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                  No appointments assigned.
                </p>
              ) : (
                providerQueue.map((item) => (
                  <div key={item.id} className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                    <p className="font-semibold text-slate-900">
                      {patientMap[item.patient_id] ?? "Patient"} - {formatDate(item.scheduled_at)}
                    </p>
                    <p className="text-slate-700">Status: {item.status}</p>
                    <p className="text-slate-700">Reason: {item.reason ?? "No reason"}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {(["in_progress", "completed", "cancelled"] as const).map((status) => (
                        <form key={status} action={updateAppointmentStatusAction}>
                          <input type="hidden" name="return_to" value={currentPath} />
                          <input type="hidden" name="appointment_id" value={item.id} />
                          <input type="hidden" name="status" value={status} />
                          <button
                            type="submit"
                            className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700"
                          >
                            {status}
                          </button>
                        </form>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        ) : null}

        {persona === "admin" && module === "pulse" ? (
          <section className="grid gap-4 lg:grid-cols-[1fr_1fr]">
            <article className="rounded-xl border border-slate-200 bg-white p-4">
              <h2 className="text-lg font-semibold text-slate-900">Live Metrics</h2>
              {!adminPulse ? (
                <p className="mt-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                  Metrics unavailable.
                </p>
              ) : (
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                    Active sessions: <span className="font-semibold">{adminPulse.activeSessions}</span>
                  </p>
                  <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                    Providers: <span className="font-semibold">{adminPulse.providers}</span>
                  </p>
                  <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                    Patients: <span className="font-semibold">{adminPulse.patients}</span>
                  </p>
                  <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                    Today&apos;s appointments: <span className="font-semibold">{adminPulse.totalToday}</span>
                  </p>
                  <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                    Overdue queue: <span className="font-semibold">{adminPulse.overdueQueue}</span>
                  </p>
                </div>
              )}
            </article>

            <article className="rounded-xl border border-slate-200 bg-white p-4">
              <h2 className="text-lg font-semibold text-slate-900">Recent Appointments</h2>
              <div className="mt-3 space-y-2">
                {adminRecentAppointments.length === 0 ? (
                  <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                    No appointments found.
                  </p>
                ) : (
                  adminRecentAppointments.map((item) => (
                    <div key={item.id} className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                      <p className="font-semibold text-slate-900">{formatDate(item.scheduled_at)}</p>
                      <p className="text-slate-700">Status: {item.status}</p>
                      <p className="text-slate-700">Reason: {item.reason ?? "No reason"}</p>
                    </div>
                  ))
                )}
              </div>
            </article>
          </section>
        ) : null}
      </div>
    </main>
  );
}
