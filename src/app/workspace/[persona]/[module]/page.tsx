import Link from "next/link";
import { notFound } from "next/navigation";
import { bookAppointmentAction, updateAppointmentStatusAction } from "@/app/workspace/actions";
import { requireProfile } from "@/lib/auth/session";
import { getModuleConfig, getPersonaConfig } from "@/lib/workspace/config";

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
  const { supabase, user } = await requireProfile(currentPath);

  const personaConfig = getPersonaConfig(persona);
  const moduleConfig = getModuleConfig(persona, module);

  if (!personaConfig || !moduleConfig) {
    notFound();
  }

  const index = personaConfig.modules.findIndex((item) => item.slug === module);
  const prevModule = index > 0 ? personaConfig.modules[index - 1] : null;
  const nextModule = index < personaConfig.modules.length - 1 ? personaConfig.modules[index + 1] : null;

  let dbError = "";

  let bookingProviders: SimpleProvider[] = [];
  let patientAppointments: AppointmentRow[] = [];

  if (persona === "patient" && module === "booking") {
    const [{ data: providers, error: providersError }, { data: appointments, error: appointmentsError }] =
      await Promise.all([
        supabase.from("profiles").select("id,full_name").eq("role", "provider").order("created_at").limit(30),
        supabase
          .from("appointments")
          .select("id,patient_id,provider_id,scheduled_at,reason,status")
          .eq("patient_id", user.id)
          .order("scheduled_at", { ascending: true })
          .limit(20),
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
      .limit(25);

    providerQueue = (queue as AppointmentRow[] | null) ?? [];

    if (queueError) {
      dbError = queueError.message;
    } else if (providerQueue.length > 0) {
      const patientIds = [...new Set(providerQueue.map((item) => item.patient_id))];
      const { data: patientProfiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id,full_name")
        .in("id", patientIds);

      if (profilesError) {
        dbError = profilesError.message;
      } else {
        patientMap = Object.fromEntries(
          ((patientProfiles as SimpleProvider[] | null) ?? []).map((item) => [item.id, item.full_name ?? "Patient"]),
        );
      }
    }
  }

  let adminPulse: AdminPulseMetrics | null = null;

  if (persona === "admin" && module === "pulse") {
    const nowIso = new Date().toISOString();
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const [
      { data: todaysAppointments, error: todayError },
      { count: activeSessions, error: activeError },
      { count: providerCount, error: providerError },
      { count: patientCount, error: patientError },
    ] = await Promise.all([
      supabase
        .from("appointments")
        .select("id,patient_id,provider_id,scheduled_at,reason,status")
        .gte("scheduled_at", dayStart.toISOString())
        .lt("scheduled_at", dayEnd.toISOString()),
      supabase.from("appointments").select("id", { count: "exact", head: true }).eq("status", "in_progress"),
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "provider"),
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "patient"),
    ]);

    if (todayError || activeError || providerError || patientError) {
      dbError =
        todayError?.message ??
        activeError?.message ??
        providerError?.message ??
        patientError?.message ??
        "Database query error.";
    } else {
      const rows = (todaysAppointments as AppointmentRow[] | null) ?? [];
      const statusSummary = rows.reduce<AppointmentStatusSummary>(
        (acc, row) => {
          if (row.status === "booked") acc.booked += 1;
          if (row.status === "in_progress") acc.in_progress += 1;
          if (row.status === "completed") acc.completed += 1;
          if (row.status === "cancelled") acc.cancelled += 1;
          if (row.status === "no_show") acc.no_show += 1;
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

      const overdueQueue = rows.filter((row) => row.status === "booked" && row.scheduled_at < nowIso).length;

      adminPulse = {
        activeSessions: activeSessions ?? 0,
        providers: providerCount ?? 0,
        patients: patientCount ?? 0,
        totalToday: rows.length,
        overdueQueue,
        status: statusSummary,
      };
    }
  }

  return (
    <main className="prototype-bg min-h-screen px-4 py-6 sm:px-8 sm:py-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-5">
        <header className="rounded-3xl border border-white/60 bg-white/90 p-6 shadow-[0_20px_80px_-40px_rgba(8,60,80,0.55)] backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold tracking-[0.18em] text-slate-600">{personaConfig.label.toUpperCase()}</p>
              <h1 className="mt-1 text-3xl font-bold text-slate-900">{moduleConfig.title}</h1>
              <p className="mt-1 text-sm text-slate-600">{moduleConfig.summary}</p>
            </div>
            <div className="flex gap-2">
              <span className={`rounded-lg bg-gradient-to-r px-3 py-2 text-xs font-semibold text-white ${personaConfig.accent}`}>
                Stage {index + 1} / {personaConfig.modules.length}
              </span>
              <Link
                href={`/workspace/${persona}`}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
              >
                Back to Modules
              </Link>
            </div>
          </div>
        </header>

        {success ? (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">{success}</p>
        ) : null}
        {error ? (
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-800">{error}</p>
        ) : null}
        {dbError ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
            Database warning: {dbError}. Run `supabase/migrations/0001_mvp_schema.sql` in Supabase SQL editor.
          </p>
        ) : null}

        <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <article className="rounded-3xl border border-white/60 bg-white/92 p-6 shadow-[0_20px_80px_-45px_rgba(2,8,20,0.7)]">
            <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-600">Implementation Checklist</h2>
            <ul className="mt-3 space-y-2 text-sm text-slate-700">
              {moduleConfig.checklist.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-1 h-2 w-2 rounded-full bg-emerald-500" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            {persona === "patient" && module === "booking" ? (
              <section className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-600">Live Booking Form</h3>
                <form action={bookAppointmentAction} className="mt-3 grid gap-3">
                  <input type="hidden" name="return_to" value={currentPath} />
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold text-slate-700">Provider</span>
                    <select name="provider_id" required className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800">
                      <option value="">Select provider</option>
                      {bookingProviders.map((provider) => (
                        <option key={provider.id} value={provider.id}>
                          {provider.full_name ?? provider.id}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold text-slate-700">Schedule Time</span>
                    <input
                      type="datetime-local"
                      name="scheduled_at"
                      required
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold text-slate-700">Reason</span>
                    <textarea
                      name="reason"
                      rows={3}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
                      placeholder="Brief symptoms or reason for visit"
                    />
                  </label>
                  <button type="submit" className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white">
                    Book Appointment
                  </button>
                </form>

                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">Upcoming Appointments</p>
                  <div className="mt-2 space-y-2 text-sm text-slate-700">
                    {patientAppointments.length === 0 ? (
                      <p className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs">No appointments yet.</p>
                    ) : (
                      patientAppointments.map((appointment) => (
                        <p key={appointment.id} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs">
                          {formatDate(appointment.scheduled_at)} - {appointment.status} - {appointment.reason ?? "No reason"}
                        </p>
                      ))
                    )}
                  </div>
                </div>
              </section>
            ) : null}

            {persona === "provider" && module === "dashboard" ? (
              <section className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-600">Live Provider Queue</h3>
                <div className="mt-3 space-y-2 text-sm text-slate-700">
                  {providerQueue.length === 0 ? (
                    <p className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs">No appointments assigned yet.</p>
                  ) : (
                    providerQueue.map((appointment) => (
                      <div key={appointment.id} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs">
                        <p className="font-semibold text-slate-900">
                          {patientMap[appointment.patient_id] ?? "Patient"} - {formatDate(appointment.scheduled_at)}
                        </p>
                        <p className="mt-1 text-slate-600">Status: {appointment.status}</p>
                        <p className="text-slate-600">Reason: {appointment.reason ?? "No reason"}</p>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {(["in_progress", "completed", "cancelled"] as const).map((status) => (
                            <form key={status} action={updateAppointmentStatusAction}>
                              <input type="hidden" name="return_to" value={currentPath} />
                              <input type="hidden" name="appointment_id" value={appointment.id} />
                              <input type="hidden" name="status" value={status} />
                              <button
                                type="submit"
                                className="rounded border border-slate-300 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700"
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
              <section className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-600">Live Operations Pulse</h3>
                {adminPulse ? (
                  <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    <p className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700">
                      Active sessions: <span className="font-semibold text-slate-900">{adminPulse.activeSessions}</span>
                    </p>
                    <p className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700">
                      Providers onboarded: <span className="font-semibold text-slate-900">{adminPulse.providers}</span>
                    </p>
                    <p className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700">
                      Patients onboarded: <span className="font-semibold text-slate-900">{adminPulse.patients}</span>
                    </p>
                    <p className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700">
                      Today appointments: <span className="font-semibold text-slate-900">{adminPulse.totalToday}</span>
                    </p>
                    <p className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700">
                      Overdue queue: <span className="font-semibold text-slate-900">{adminPulse.overdueQueue}</span>
                    </p>
                  </div>
                ) : (
                  <p className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700">
                    Metrics will appear after database setup.
                  </p>
                )}

                {adminPulse ? (
                  <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                    {[
                      { label: "Booked", value: adminPulse.status.booked },
                      { label: "In Progress", value: adminPulse.status.in_progress },
                      { label: "Completed", value: adminPulse.status.completed },
                      { label: "Cancelled", value: adminPulse.status.cancelled },
                      { label: "No Show", value: adminPulse.status.no_show },
                    ].map((item) => (
                      <p
                        key={item.label}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-center text-xs text-slate-700"
                      >
                        <span className="block font-semibold text-slate-900">{item.value}</span>
                        <span>{item.label}</span>
                      </p>
                    ))}
                  </div>
                ) : null}
              </section>
            ) : null}
          </article>

          <aside className="rounded-3xl border border-white/60 bg-white/92 p-6 shadow-[0_20px_80px_-45px_rgba(2,8,20,0.7)]">
            <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-600">System Readouts</h2>
            <ul className="mt-3 space-y-2 text-sm text-slate-700">
              {moduleConfig.systemReadouts.map((item) => (
                <li key={item} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  {item}
                </li>
              ))}
            </ul>

            <h3 className="mt-6 text-sm font-semibold uppercase tracking-[0.14em] text-slate-600">Primary Actions</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {moduleConfig.primaryActions.map((action, actionIndex) => (
                <button
                  key={action}
                  type="button"
                  className={`rounded-lg px-3 py-2 text-xs font-semibold ${
                    actionIndex === 0 ? "bg-slate-900 text-white" : "border border-slate-300 bg-white text-slate-700"
                  }`}
                >
                  {action}
                </button>
              ))}
            </div>

            <h3 className="mt-6 text-sm font-semibold uppercase tracking-[0.14em] text-slate-600">Stage Navigation</h3>
            <div className="mt-3 flex flex-col gap-2">
              {prevModule ? (
                <Link
                  href={`/workspace/${persona}/${prevModule.slug}`}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
                >
                  Previous: {prevModule.title}
                </Link>
              ) : (
                <span className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
                  No previous stage
                </span>
              )}
              {nextModule ? (
                <Link
                  href={`/workspace/${persona}/${nextModule.slug}`}
                  className={`rounded-lg bg-gradient-to-r px-3 py-2 text-xs font-semibold text-white ${personaConfig.accent}`}
                >
                  Next: {nextModule.title}
                </Link>
              ) : (
                <span className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
                  Final stage in this persona flow
                </span>
              )}
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
