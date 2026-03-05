import Link from "next/link";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth/session";
import { PERSONAS, WORKSPACE_CONFIG, getDefaultModuleByRole, type Persona } from "@/lib/workspace/config";

export default async function WorkspaceHomePage() {
  const { profile } = await requireProfile("/workspace");

  if (profile.role !== "admin") {
    redirect(`/workspace/${profile.role}/${getDefaultModuleByRole(profile.role)}`);
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto w-full max-w-5xl">
        <h1 className="text-2xl font-bold text-slate-900">MVP Workspaces</h1>
        <p className="mt-1 text-sm text-slate-600">Choose a role workspace to test live flows.</p>

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          {PERSONAS.map((persona) => {
            const config = WORKSPACE_CONFIG[persona];
            const defaultModule = getDefaultModuleByRole(persona as Persona);
            return (
              <article key={persona} className="rounded-xl border border-slate-200 bg-white p-4">
                <h2 className="text-lg font-semibold text-slate-900">{config.label}</h2>
                <p className="mt-1 text-sm text-slate-600">{config.modules[0]?.description}</p>
                <Link
                  href={`/workspace/${persona}/${defaultModule}`}
                  className="mt-4 inline-flex rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white"
                >
                  Open
                </Link>
              </article>
            );
          })}
        </section>
      </div>
    </main>
  );
}
