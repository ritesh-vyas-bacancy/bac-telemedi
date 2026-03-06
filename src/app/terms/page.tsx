import Link from "next/link";
import { MarketingShell } from "@/components/marketing/marketing-shell";

export default function TermsPage() {
  return (
    <MarketingShell>
      <section className="mx-auto w-full max-w-[1120px] px-4 pt-10 sm:px-6">
        <article className="marketing-panel p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-700">Terms of Service</p>
          <h1 className="mt-2 text-4xl font-bold text-slate-900">Platform Usage Terms</h1>
          <div className="mt-4 space-y-3 text-sm text-slate-700">
            <p>
              By using BAC Telemedicine, users agree to role-based platform usage for patient care, provider workflows,
              and operational governance.
            </p>
            <p>
              Users are responsible for account credentials, lawful usage, and data accuracy entered in consultation or
              operational modules.
            </p>
            <p>
              BAC Telemedicine reserves the right to update service logic, workflows, and security controls to maintain
              quality and compliance.
            </p>
            <p>
              These terms should be reviewed periodically. Continued usage indicates acceptance of the latest published
              version.
            </p>
          </div>
          <div className="mt-6">
            <Link href="/" className="rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-2 text-sm font-semibold text-cyan-900">
              Back To Homepage
            </Link>
          </div>
        </article>
      </section>
    </MarketingShell>
  );
}

