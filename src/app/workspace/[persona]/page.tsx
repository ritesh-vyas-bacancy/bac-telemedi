import Link from "next/link";
import { notFound } from "next/navigation";
import { getPersonaConfig } from "@/lib/workspace/config";

type PageProps = {
  params: Promise<{ persona: string }>;
};

export default async function PersonaWorkspacePage({ params }: PageProps) {
  const { persona } = await params;
  const config = getPersonaConfig(persona);

  if (!config) {
    notFound();
  }

  return (
    <main className="prototype-bg min-h-screen px-4 py-6 sm:px-8 sm:py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-5">
        <section className="rounded-3xl border border-white/60 bg-white/88 p-6 shadow-[0_20px_80px_-40px_rgba(8,60,80,0.55)] backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold tracking-[0.18em] text-slate-600">PERSONA WORKSPACE</p>
              <h1 className="mt-1 text-3xl font-bold text-slate-900">{config.label}</h1>
              <p className="mt-1 text-sm text-slate-600">{config.subtitle}</p>
            </div>
            <div className="flex gap-2">
              <Link
                href="/workspace"
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
              >
                All Personas
              </Link>
              <Link
                href="/prototype"
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
              >
                Design Prototype
              </Link>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          {config.modules.map((module, index) => (
            <article
              key={module.slug}
              className="rounded-2xl border border-white/70 bg-white/92 p-5 shadow-[0_18px_60px_-45px_rgba(2,8,20,0.7)]"
            >
              <div className="flex items-center justify-between gap-2">
                <span className={`rounded-lg bg-gradient-to-r px-2 py-1 text-[11px] font-semibold text-white ${config.accent}`}>
                  Stage {index + 1}
                </span>
                <span className="text-xs text-slate-500">{module.slug}</span>
              </div>
              <h2 className="mt-3 text-lg font-bold text-slate-900">{module.title}</h2>
              <p className="mt-1 text-sm text-slate-600">{module.summary}</p>

              <ul className="mt-3 space-y-1.5 text-xs text-slate-700">
                {module.checklist.slice(0, 2).map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-slate-500" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <Link
                href={`/workspace/${persona}/${module.slug}`}
                className="mt-4 inline-flex rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white"
              >
                Open Module Screen
              </Link>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
