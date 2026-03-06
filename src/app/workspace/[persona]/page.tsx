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
      <div className="mx-auto w-full max-w-[1600px]">
        <section className="telemed-glass rounded-3xl p-6 sm:p-8">
          <span className={`inline-flex rounded-lg bg-gradient-to-r px-3 py-1 text-xs font-semibold text-white ${config.accent}`}>
            {config.label}
          </span>
          <h1 className="mt-3 text-3xl font-bold text-slate-900">{config.label} Workspace</h1>
          <p className="mt-1 text-sm text-slate-600">Open modules below to continue the functional MVP flow.</p>
        </section>

        <section className="mt-5 grid gap-4 md:grid-cols-3">
          {config.modules.map((module, index) => (
            <article key={module.slug} className="rounded-2xl border border-cyan-100/80 bg-white/88 p-5 shadow-[0_18px_54px_-36px_rgba(2,8,20,0.85)] backdrop-blur">
              <p className="text-[11px] font-semibold tracking-[0.15em] text-cyan-700">MODULE {index + 1}</p>
              <h2 className="text-lg font-semibold text-slate-900">{module.title}</h2>
              <p className="mt-1 text-sm text-slate-600">{module.description}</p>
              <Link
                href={`/workspace/${persona}/${module.slug}`}
                className="mt-4 inline-flex rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-[0_12px_28px_-16px_rgba(8,145,178,0.95)]"
              >
                Open Module
              </Link>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
