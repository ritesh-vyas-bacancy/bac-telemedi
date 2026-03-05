import Link from "next/link";
import { signOutAction } from "@/app/auth/actions";
import { requireProfile } from "@/lib/auth/session";
import { getDefaultModuleByRole } from "@/lib/workspace/config";

type WorkspaceLayoutProps = {
  children: React.ReactNode;
};

export default async function WorkspaceLayout({ children }: WorkspaceLayoutProps) {
  const { profile } = await requireProfile("/workspace");

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-4 py-3">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold tracking-[0.14em] text-slate-600">TELEMEDICINE MVP</p>
            <p className="text-sm font-semibold text-slate-900">
              {profile.full_name ?? "User"} ({profile.role})
            </p>
          </div>
          <div className="flex items-center gap-2">
            {profile.role === "admin" ? (
              <Link
                href="/workspace"
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
              >
                Workspaces
              </Link>
            ) : (
              <Link
                href={`/workspace/${profile.role}/${getDefaultModuleByRole(profile.role)}`}
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
              >
                My Workspace
              </Link>
            )}
            <form action={signOutAction}>
              <button
                type="submit"
                className="rounded-md bg-slate-900 px-3 py-2 text-xs font-semibold text-white"
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
