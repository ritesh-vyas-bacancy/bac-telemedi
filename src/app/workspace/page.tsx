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
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_right,_#e0f2fe_0%,_transparent_35%),radial-gradient(circle_at_bottom_left,_#dcfce7_0%,_transparent_42%),#f8fafc] px-4 py-6 sm:px-8 sm:py-10">
      <div className="mx-auto w-full max-w-7xl">
        <section className="rounded-3xl border border-white/80 bg-white/85 p-6 shadow-[0_20px_70px_-40px_rgba(15,23,42,0.5)] backdrop-blur">
          <p className="text-xs font-semibold tracking-[0.16em] text-slate-600">TELEMEDICINE MVP V2</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900 sm:text-4xl">Role Workspaces</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600 sm:text-base">
            Open patient, provider, or admin modules to test live flows with production-like UI.
          </p>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          {PERSONAS.map((persona) => {
            const config = WORKSPACE_CONFIG[persona];
            const defaultModule = getDefaultModuleByRole(persona);
            return (
              <article
                key={persona}
                className="rounded-2xl border border-white/70 bg-white/90 p-5 shadow-[0_16px_50px_-35px_rgba(2,8,20,0.75)]"
              >
                <span className={`inline-flex rounded-lg bg-gradient-to-r px-3 py-1 text-xs font-semibold text-white ${config.accent}`}>
                  {config.label}
                </span>
                <div className="mt-4 space-y-2">
                  {config.modules.map((module) => (
                    <div key={module.slug} className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
                      <p className="text-sm font-semibold text-slate-900">{module.title}</p>
                      <p className="text-xs text-slate-600">{module.description}</p>
                    </div>
                  ))}
                </div>
                <Link
                  href={`/workspace/${persona}/${defaultModule}`}
                  className="mt-4 inline-flex rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white"
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
