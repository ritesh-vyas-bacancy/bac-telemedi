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
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#dbeafe_0%,_transparent_35%),radial-gradient(circle_at_bottom_right,_#dcfce7_0%,_transparent_40%),#f8fafc] px-4 py-6 sm:px-8 sm:py-10">
      <div className="mx-auto w-full max-w-6xl">
        <section className="rounded-3xl border border-white/80 bg-white/88 p-6 shadow-[0_20px_70px_-40px_rgba(15,23,42,0.4)]">
          <span className={`inline-flex rounded-lg bg-gradient-to-r px-3 py-1 text-xs font-semibold text-white ${config.accent}`}>
            {config.label}
          </span>
          <h1 className="mt-3 text-3xl font-bold text-slate-900">{config.label} Workspace</h1>
          <p className="mt-1 text-sm text-slate-600">Open modules below to continue the functional MVP flow.</p>
        </section>

        <section className="mt-5 grid gap-4 md:grid-cols-3">
          {config.modules.map((module) => (
            <article key={module.slug} className="rounded-2xl border border-white/70 bg-white/92 p-5 shadow-[0_16px_50px_-35px_rgba(2,8,20,0.75)]">
              <h2 className="text-lg font-semibold text-slate-900">{module.title}</h2>
              <p className="mt-1 text-sm text-slate-600">{module.description}</p>
              <Link
                href={`/workspace/${persona}/${module.slug}`}
                className="mt-4 inline-flex rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white"
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
