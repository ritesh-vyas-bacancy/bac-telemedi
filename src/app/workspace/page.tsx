import Link from "next/link";
import { PERSONAS, WORKSPACE_CONFIG } from "@/lib/workspace/config";

export default function WorkspaceHomePage() {
  return (
    <main className="prototype-bg min-h-screen px-4 py-6 sm:px-8 sm:py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <section className="rounded-3xl border border-white/60 bg-white/85 p-6 shadow-[0_20px_80px_-40px_rgba(8,60,80,0.55)] backdrop-blur">
          <p className="text-xs font-semibold tracking-[0.18em] text-cyan-700">DEVELOPMENT WORKSPACE</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900 sm:text-4xl">Telemedicine MVP Build Start</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-700 sm:text-base">
            Route-based development workspace for each user type. Select a persona to begin
            implementation-focused screen development.
          </p>
          <div className="mt-4">
            <Link
              href="/prototype"
              className="inline-flex rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Open Design Prototype
            </Link>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {PERSONAS.map((persona) => {
            const config = WORKSPACE_CONFIG[persona];
            return (
              <article
                key={persona}
                className="rounded-2xl border border-white/70 bg-white/90 p-5 shadow-[0_18px_60px_-45px_rgba(2,8,20,0.75)]"
              >
                <div className={`inline-flex rounded-lg bg-gradient-to-r px-3 py-1 text-xs font-semibold text-white ${config.accent}`}>
                  {config.label}
                </div>
                <p className="mt-3 text-sm text-slate-600">{config.subtitle}</p>
                <p className="mt-2 text-xs text-slate-500">{config.modules.length} modules ready for implementation</p>
                <div className="mt-4 flex flex-col gap-2">
                  {config.modules.slice(0, 3).map((module) => (
                    <span key={module.slug} className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700">
                      {module.title}
                    </span>
                  ))}
                </div>
                <Link
                  href={`/workspace/${persona}`}
                  className="mt-4 inline-flex rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white"
                >
                  Open {config.label}
                </Link>
              </article>
            );
          })}
        </section>
      </div>
    </main>
  );
}
