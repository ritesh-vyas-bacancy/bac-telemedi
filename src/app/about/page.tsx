import Link from "next/link";
import { MarketingShell } from "@/components/marketing/marketing-shell";

export default function AboutPage() {
  return (
    <MarketingShell>
      <section className="mx-auto w-full max-w-[1120px] px-4 pt-10 sm:px-6">
        <article className="marketing-panel p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-700">About BAC Telemedicine</p>
          <h1 className="mt-2 text-4xl font-bold text-slate-900">Building Reliable Digital Care Infrastructure</h1>
          <p className="mt-4 text-sm text-slate-700 sm:text-base">
            BAC Telemedicine is focused on enterprise-ready virtual care operations. Our product combines patient care
            experiences, provider workflows, and administrative controls in a single role-based system.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-sm font-semibold text-slate-900">Clinical Workflow Focus</p>
              <p className="mt-1 text-sm text-slate-600">
                Appointment lifecycle, consultation management, notes, prescriptions, and care orders.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-sm font-semibold text-slate-900">Operational Governance Focus</p>
              <p className="mt-1 text-sm text-slate-600">
                Claims, notifications, incident and compliance tracking, permissions, and audit visibility.
              </p>
            </div>
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

