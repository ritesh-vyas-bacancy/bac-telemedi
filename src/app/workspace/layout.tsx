import Link from "next/link";
import { signOutAction } from "@/app/auth/actions";
import { requireProfile } from "@/lib/auth/session";

type WorkspaceLayoutProps = {
  children: React.ReactNode;
};

export default async function WorkspaceLayout({ children }: WorkspaceLayoutProps) {
  const { profile } = await requireProfile("/workspace");

  return (
    <div>
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/92 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold tracking-[0.16em] text-slate-600">TELEMEDICINE MVP</p>
            <p className="text-sm font-semibold text-slate-900">
              {profile.full_name ?? "User"} | {profile.role}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/workspace"
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
            >
              Workspace Home
            </Link>
            <Link
              href="/prototype"
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
            >
              Prototype
            </Link>
            <form action={signOutAction}>
              <button
                type="submit"
                className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white"
              >
                Sign Out
              </button>
            </form>
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}

