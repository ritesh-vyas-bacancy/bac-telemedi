import Link from "next/link";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth/session";
import { PERSONAS, WORKSPACE_CONFIG, getDefaultModuleByRole } from "@/lib/workspace/config";

export default async function WorkspaceHomePage() {
  const { profile } = await requireProfile("/workspace");

  if (profile.role !== "admin") {
    redirect(`/workspace/${profile.role}/${getDefaultModuleByRole(profile.role)}`);
  }

  return (
    <main className="prototype-bg min-h-screen px-4 py-6 sm:px-8 sm:py-10">
      <div className="mx-auto w-full max-w-[1600px]">
        <section className="telemed-glass rounded-3xl p-6 sm:p-8">
          <p className="text-xs font-semibold tracking-[0.16em] text-cyan-700">TELEMEDICINE COMMAND CENTER</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900 sm:text-4xl">Role Workspaces</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600 sm:text-base">
            Open patient, provider, or admin modules to test live flows with production-like UI.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-cyan-100 bg-white/75 p-3">
              <p className="text-xs font-semibold tracking-[0.12em] text-cyan-700">PATIENT EXPERIENCE</p>
              <p className="mt-1 text-sm text-slate-700">Booking, visits, invoices, and care inbox.</p>
            </div>
            <div className="rounded-xl border border-indigo-100 bg-white/75 p-3">
              <p className="text-xs font-semibold tracking-[0.12em] text-indigo-700">PROVIDER OPERATIONS</p>
              <p className="mt-1 text-sm text-slate-700">Queue, consultation controls, notes, claims.</p>
            </div>
            <div className="rounded-xl border border-emerald-100 bg-white/75 p-3">
              <p className="text-xs font-semibold tracking-[0.12em] text-emerald-700">ADMIN GOVERNANCE</p>
              <p className="mt-1 text-sm text-slate-700">Pulse metrics, incidents, permissions, audit.</p>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          {PERSONAS.map((persona) => {
            const config = WORKSPACE_CONFIG[persona];
            const defaultModule = getDefaultModuleByRole(persona);
            return (
              <article
                key={persona}
                className="rounded-2xl border border-cyan-100/80 bg-white/88 p-5 shadow-[0_20px_60px_-40px_rgba(2,8,20,0.8)] backdrop-blur"
              >
                <span className={`inline-flex rounded-lg bg-gradient-to-r px-3 py-1 text-xs font-semibold text-white ${config.accent}`}>
                  {config.label}
                </span>
                <div className="mt-4 space-y-2">
                  {config.modules.map((module) => (
                    <div key={module.slug} className="rounded-lg border border-cyan-100 bg-cyan-50/55 p-2.5">
                      <p className="text-sm font-semibold text-slate-900">{module.title}</p>
                      <p className="text-xs text-slate-600">{module.description}</p>
                    </div>
                  ))}
                </div>
                <Link
                  href={`/workspace/${persona}/${defaultModule}`}
                  className="mt-4 inline-flex rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-[0_12px_28px_-16px_rgba(8,145,178,0.95)]"
                >
                  Open {config.label} Journey
                </Link>
              </article>
            );
          })}
        </section>
      </div>
    </main>
  );
}
