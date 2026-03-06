import Link from "next/link";
import { signInAction } from "@/app/auth/actions";

type SignInPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function asString(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const params = await searchParams;
  const next = asString(params.next) || "/";
  const message = asString(params.message);
  const error = asString(params.error);

  return (
    <main className="prototype-bg flex min-h-screen items-center px-4 py-8 sm:px-8 sm:py-12">
      <div className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[1fr_0.9fr]">
        <section className="telemed-glass hidden rounded-3xl p-8 text-slate-900 lg:block">
          <p className="text-xs font-semibold tracking-[0.2em] text-cyan-700">BAC TELEMEDICINE</p>
          <h1 className="mt-4 text-4xl font-bold leading-tight">
            Clinical care operations,
            <br />
            one live workspace.
          </h1>
          <p className="mt-4 max-w-lg text-sm text-slate-700">
            Patient, provider, and admin journeys run on one secure platform with booking, consultation, clinical notes,
            claims, and governance modules.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {[
              ["3 Personas", "Patient, Provider, Admin"],
              ["Live Workflow", "Booking to audit trail"],
              ["Secure", "Role + RLS enforcement"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-cyan-100 bg-white/75 p-3">
                <p className="text-xs font-semibold tracking-wide text-cyan-700">{label}</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="telemed-glass rounded-3xl p-6 sm:p-8">
          <p className="text-xs font-semibold tracking-[0.18em] text-cyan-700">AUTHENTICATION</p>
          <h2 className="mt-2 text-3xl font-bold text-slate-900">Sign In</h2>
          <p className="mt-1 text-sm text-slate-600">Access your telemedicine workspace.</p>

          {message ? (
            <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              {message}
            </p>
          ) : null}
          {error ? (
            <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
              {error}
            </p>
          ) : null}

          <form action={signInAction} className="mt-5 space-y-4">
            <input type="hidden" name="next" value={next} />
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-slate-700">Email</span>
              <input
                type="email"
                name="email"
                required
                className="w-full rounded-xl border border-cyan-200 bg-white/95 px-3 py-2.5 text-sm text-slate-800 outline-none ring-cyan-500 transition focus:ring-2"
                placeholder="you@example.com"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-slate-700">Password</span>
              <input
                type="password"
                name="password"
                required
                className="w-full rounded-xl border border-cyan-200 bg-white/95 px-3 py-2.5 text-sm text-slate-800 outline-none ring-cyan-500 transition focus:ring-2"
                placeholder="********"
              />
            </label>
            <button
              type="submit"
              className="w-full rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_16px_40px_-24px_rgba(8,145,178,0.95)]"
            >
              Sign In
            </button>
          </form>

          <p className="mt-4 text-sm text-slate-600">
            New user?{" "}
            <Link href={`/auth/sign-up?next=${encodeURIComponent(next)}`} className="font-semibold text-cyan-700">
              Create account
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}

