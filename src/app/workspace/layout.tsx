import Link from "next/link";
import Image from "next/image";
import { signOutAction } from "@/app/auth/actions";
import { requireProfile } from "@/lib/auth/session";
import { getDefaultModuleByRole } from "@/lib/workspace/config";

type WorkspaceLayoutProps = {
  children: React.ReactNode;
};

export default async function WorkspaceLayout({ children }: WorkspaceLayoutProps) {
  const { profile } = await requireProfile("/workspace");
  const roleEntry = `/workspace/${profile.role}/${getDefaultModuleByRole(profile.role)}`;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 border-b border-cyan-100 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-[1700px] items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border border-cyan-200 bg-white shadow-[0_12px_24px_-14px_rgba(8,145,178,0.95)]">
              <Image src="/brand/logo-mark.svg" alt="BAC Telemedicine" width={32} height={32} />
            </div>
            <div>
              <p className="text-[11px] font-semibold tracking-[0.16em] text-cyan-700">BAC TELEMEDICINE</p>
              <p className="text-sm font-semibold text-slate-900">{profile.full_name ?? "User"}</p>
            </div>
            <span className="rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-cyan-800">
              {profile.role}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={profile.role === "admin" ? "/workspace" : roleEntry}
              className="rounded-lg border border-cyan-200 bg-white px-3 py-2 text-xs font-semibold text-cyan-800 transition hover:border-cyan-300"
            >
              {profile.role === "admin" ? "Role Switch" : "My Dashboard"}
            </Link>
            <form action={signOutAction}>
              <button
                type="submit"
                className="rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 px-3 py-2 text-xs font-semibold text-white shadow-[0_12px_26px_-16px_rgba(8,145,178,0.9)]"
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
