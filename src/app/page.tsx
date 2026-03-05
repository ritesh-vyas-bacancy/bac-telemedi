import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function Home() {
  const hasSupabaseEnv = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );

  let userEmail: string | null = null;

  if (hasSupabaseEnv) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    userEmail = user?.email ?? null;
  }

  return (
    <main className="prototype-bg min-h-screen px-4 py-6 sm:px-8 sm:py-10">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <section className="rounded-3xl border border-white/60 bg-white/85 p-6 shadow-[0_20px_80px_-40px_rgba(8,60,80,0.55)] backdrop-blur">
          <p className="text-xs font-semibold tracking-[0.18em] text-cyan-700">
            BAC TELEMEDI PROJECT
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900 sm:text-4xl">
            Design + Development Workspace
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-700 sm:text-base">
            Supabase integration is active. The complete clickable design prototype for patient,
            provider, and admin flows is ready for review.
          </p>
          <div className="mt-4">
            <div className="flex flex-wrap gap-2">
              <Link
                href="/prototype"
                className="inline-flex rounded-xl bg-gradient-to-r from-cyan-600 to-teal-600 px-5 py-3 text-sm font-semibold text-white shadow transition hover:-translate-y-0.5"
              >
                Open Complete Prototype Journey
              </Link>
              <Link
                href="/workspace"
                className="inline-flex rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:bg-slate-50"
              >
                Open Development Workspace
              </Link>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-white/60 bg-white/85 p-6 shadow-[0_20px_80px_-40px_rgba(8,60,80,0.55)] backdrop-blur">
          <p className="font-semibold text-slate-900">Environment Status</p>
          <p className="mt-2 text-sm text-slate-700">
          {hasSupabaseEnv
            ? "Supabase environment variables detected."
            : "Supabase environment variables missing. Copy .env.example to .env.local and set values."}
          </p>
          {hasSupabaseEnv ? (
            <p className="mt-1 text-sm text-slate-700">
              {userEmail ? `Signed in user: ${userEmail}` : "No active user session."}
            </p>
          ) : null}
        </section>
      </div>
    </main>
  );
}
