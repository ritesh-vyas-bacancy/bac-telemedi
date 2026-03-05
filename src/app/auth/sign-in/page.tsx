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
  const next = asString(params.next) || "/workspace";
  const message = asString(params.message);
  const error = asString(params.error);

  return (
    <main className="prototype-bg min-h-screen px-4 py-8 sm:px-8 sm:py-12">
      <div className="mx-auto w-full max-w-lg rounded-3xl border border-white/70 bg-white/92 p-6 shadow-[0_24px_90px_-52px_rgba(8,60,80,0.6)]">
        <p className="text-xs font-semibold tracking-[0.18em] text-cyan-700">AUTHENTICATION</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">Sign In</h1>
        <p className="mt-1 text-sm text-slate-600">Access the telemedicine workspace.</p>

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
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none ring-cyan-500 transition focus:ring-2"
              placeholder="you@example.com"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-slate-700">Password</span>
            <input
              type="password"
              name="password"
              required
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none ring-cyan-500 transition focus:ring-2"
              placeholder="********"
            />
          </label>
          <button
            type="submit"
            className="w-full rounded-xl bg-gradient-to-r from-cyan-600 to-teal-600 px-4 py-2.5 text-sm font-semibold text-white"
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
      </div>
    </main>
  );
}

