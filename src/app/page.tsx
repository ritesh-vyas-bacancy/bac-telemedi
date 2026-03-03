import { createClient } from "@/lib/supabase/server";

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
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-4 px-6 py-16">
      <h1 className="text-3xl font-semibold">bac-telemedi</h1>
      <p className="text-zinc-600">
        Next.js + Supabase integration is ready in this project.
      </p>

      <div className="rounded-lg border border-zinc-200 bg-white p-4">
        <p className="font-medium">Status</p>
        <p className="mt-2 text-sm text-zinc-700">
          {hasSupabaseEnv
            ? "Supabase environment variables detected."
            : "Supabase environment variables missing. Copy .env.example to .env.local and set values."}
        </p>
        {hasSupabaseEnv ? (
          <p className="mt-1 text-sm text-zinc-700">
            {userEmail ? `Signed in user: ${userEmail}` : "No active user session."}
          </p>
        ) : null}
      </div>
    </main>
  );
}
