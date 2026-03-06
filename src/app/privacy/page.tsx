import Link from "next/link";
import { MarketingShell } from "@/components/marketing/marketing-shell";

export default function PrivacyPage() {
  return (
    <MarketingShell>
      <section className="mx-auto w-full max-w-[1120px] px-4 pt-10 sm:px-6">
        <article className="marketing-panel p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-700">Privacy Policy</p>
          <h1 className="mt-2 text-4xl font-bold text-slate-900">Data and Privacy Commitments</h1>
          <div className="mt-4 space-y-3 text-sm text-slate-700">
            <p>
              BAC Telemedicine processes account and workflow data to deliver patient, provider, and admin platform
              capabilities.
            </p>
            <p>
              Access control is enforced with authentication, role authorization, and row-level security policies at
              the database layer.
            </p>
            <p>
              Audit records are maintained for important workflow actions to support governance, operations review, and
              compliance analysis.
            </p>
            <p>
              For privacy concerns, data correction requests, or support, contact support@bac-telemedi.demo.
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

