import Link from "next/link";
import { signUpAction } from "@/app/auth/actions";

type SignUpPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function asString(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const params = await searchParams;
  const next = asString(params.next) || "/";
  const message = asString(params.message);
  const error = asString(params.error);

  return (
    <main className="prototype-bg flex min-h-screen items-center px-4 py-8 sm:px-8 sm:py-12">
      <div className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[1fr_0.95fr]">
        <section className="telemed-glass hidden rounded-3xl p-8 text-slate-900 lg:block">
          <p className="text-xs font-semibold tracking-[0.2em] text-cyan-700">ENTERPRISE SETUP</p>
          <h1 className="mt-4 text-4xl font-bold leading-tight">
            Launch your role-based
            <br />
            care workspace.
          </h1>
          <p className="mt-4 max-w-lg text-sm text-slate-700">
            Create a secure account for patient onboarding, provider operations, or admin command center access.
          </p>
          <div className="mt-6 space-y-3">
            {[
              "Patient: booking, visits, invoices, inbox",
              "Provider: queue, SOAP notes, prescriptions, claims",
              "Admin: operations pulse, compliance, audit stream",
            ].map((item) => (
              <div key={item} className="rounded-xl border border-cyan-100 bg-white/75 px-3 py-2 text-sm text-slate-700">
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="telemed-glass rounded-3xl p-6 sm:p-8">
          <p className="text-xs font-semibold tracking-[0.18em] text-cyan-700">AUTHENTICATION</p>
          <h2 className="mt-2 text-3xl font-bold text-slate-900">Create Account</h2>
          <p className="mt-1 text-sm text-slate-600">Set up access for patient, provider, or admin workspace.</p>

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

          <form action={signUpAction} className="mt-5 space-y-4">
            <input type="hidden" name="next" value={next} />
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-slate-700">Full Name</span>
              <input
                type="text"
                name="full_name"
                required
                className="w-full rounded-xl border border-cyan-200 bg-white/95 px-3 py-2.5 text-sm text-slate-800 outline-none ring-cyan-500 transition focus:ring-2"
                placeholder="Jane Doe"
              />
            </label>
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
                minLength={8}
                className="w-full rounded-xl border border-cyan-200 bg-white/95 px-3 py-2.5 text-sm text-slate-800 outline-none ring-cyan-500 transition focus:ring-2"
                placeholder="Minimum 8 characters"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-slate-700">Role</span>
              <select
                name="role"
                defaultValue="patient"
                className="w-full rounded-xl border border-cyan-200 bg-white/95 px-3 py-2.5 text-sm text-slate-800 outline-none ring-cyan-500 transition focus:ring-2"
              >
                <option value="patient">Patient</option>
                <option value="provider">Provider</option>
                <option value="admin">Admin</option>
              </select>
            </label>
            <button
              type="submit"
              className="w-full rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_16px_40px_-24px_rgba(8,145,178,0.95)]"
            >
              Create Account
            </button>
          </form>

          <p className="mt-4 text-sm text-slate-600">
            Already have an account?{" "}
            <Link href={`/auth/sign-in?next=${encodeURIComponent(next)}`} className="font-semibold text-cyan-700">
              Sign in
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
