import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth/session";
import { getDefaultModuleByRole } from "@/lib/workspace/config";
import { HeroSlider, type HeroSlide } from "@/components/marketing/hero-slider";

const HERO_SLIDES: HeroSlide[] = [
  {
    id: "slide-1",
    badge: "WELCOME BANNER",
    title: "Enterprise Telemedicine For Hospitals, Clinics, and Care Networks",
    description:
      "Run consultations, care plans, billing, and operations in one secure, role-based cloud platform.",
    metricLabel: "Active Journey Paths",
    metricValue: "3",
    gradient: "from-cyan-600 via-sky-600 to-blue-700",
  },
  {
    id: "slide-2",
    badge: "CARE WORKFLOW",
    title: "From Booking To Resolution, Every Step Is Connected",
    description:
      "Patients book and pay, providers complete clinical workflows, and admins monitor governance in real time.",
    metricLabel: "Core Workflow Modules",
    metricValue: "10+",
    gradient: "from-emerald-600 via-teal-600 to-cyan-700",
  },
  {
    id: "slide-3",
    badge: "OPS + COMPLIANCE",
    title: "Claims, Notifications, Incidents, and Audit-Ready Logs",
    description:
      "Built for operational control with compliance-ready tracking and health-system visibility.",
    metricLabel: "Operational Visibility",
    metricValue: "360°",
    gradient: "from-blue-700 via-indigo-700 to-cyan-700",
  },
];

const ROLE_PANELS = [
  {
    title: "Patient Experience",
    color: "from-cyan-500 to-sky-600",
    points: [
      "Appointment booking and check-in",
      "Consultation history and prescriptions",
      "Invoice tracking and payment status",
      "Inbox notifications and communication timeline",
    ],
  },
  {
    title: "Provider Command Center",
    color: "from-indigo-500 to-blue-600",
    points: [
      "Queue and consultation state control",
      "SOAP notes, prescriptions, and care orders",
      "Claim submission and status updates",
      "Targeted patient notifications",
    ],
  },
  {
    title: "Admin Control Tower",
    color: "from-emerald-500 to-green-600",
    points: [
      "Operations pulse and throughput metrics",
      "Appointment, claims, and compliance oversight",
      "Incident management and role permissions",
      "Centralized audit stream and governance",
    ],
  },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Onboard Role",
    detail: "User signs up as Patient or Provider and enters role-specific workspace instantly.",
  },
  {
    step: "02",
    title: "Run Consultation Flow",
    detail: "Appointments move through consultation states with clinical and billing updates.",
  },
  {
    step: "03",
    title: "Handle Operations",
    detail: "Claims, notifications, and incident/compliance actions are tracked in one desk.",
  },
  {
    step: "04",
    title: "Govern and Scale",
    detail: "Admin views full audit logs, KPIs, permissions, and platform-wide operational health.",
  },
];

const CMS_BLOCKS = [
  {
    title: "Hero + Banner Block",
    description: "Show campaign messaging, seasonal care programs, or hospital announcements.",
  },
  {
    title: "Service Module Blocks",
    description: "Highlight specialties like General Medicine, Pediatrics, Mental Health, and Follow-up Care.",
  },
  {
    title: "Trust + Compliance Blocks",
    description: "Display security statements, certifications, and patient-first governance highlights.",
  },
  {
    title: "Testimonials + Case Blocks",
    description: "Show outcomes, provider testimonials, and implementation success snapshots.",
  },
  {
    title: "FAQ + Knowledge Blocks",
    description: "Answer common onboarding, consultation, payment, and support questions.",
  },
  {
    title: "CTA Conversion Blocks",
    description: "Drive users to sign in, sign up, book demo, or contact hospital operations.",
  },
];

const FAQS = [
  {
    question: "Can hospitals run multiple provider teams on this platform?",
    answer:
      "Yes. The system is designed for enterprise usage with provider-level workflows, role control, and admin oversight.",
  },
  {
    question: "Does it support both clinical and operational workflows?",
    answer:
      "Yes. It covers consultations, prescriptions, care orders, billing, claims, notifications, incidents, and audit logs.",
  },
  {
    question: "How are access controls handled?",
    answer:
      "Role-based access plus Supabase Row Level Security policies are used so each user sees only permitted records.",
  },
  {
    question: "Can patients and providers register directly?",
    answer:
      "Yes. Public sign-up buttons can preselect Patient or Provider and send users directly into their role journey.",
  },
];

export default async function Home() {
  const { user, profile } = await getAuthContext();

  if (user && profile) {
    redirect(`/workspace/${profile.role}/${getDefaultModuleByRole(profile.role)}`);
  }

  if (user && !profile) {
    redirect("/auth/sign-up");
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_10%_10%,rgba(34,211,238,0.2),transparent_32%),radial-gradient(circle_at_88%_12%,rgba(16,185,129,0.18),transparent_36%),radial-gradient(circle_at_52%_95%,rgba(59,130,246,0.16),transparent_40%),linear-gradient(170deg,#f5fcff_0%,#ecf8ff_52%,#e9fbf3_100%)] pb-16 text-slate-900">
      <header className="sticky top-0 z-50 border-b border-white/70 bg-white/84 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-[1480px] items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border border-cyan-200 bg-white">
              <Image src="/brand/logo-mark.svg" alt="BAC Telemedicine" width={32} height={32} />
            </span>
            <span>
              <span className="block text-[11px] font-semibold tracking-[0.17em] text-cyan-700">BAC TELEMEDICINE</span>
              <span className="block text-sm font-semibold text-slate-900">Enterprise Virtual Care</span>
            </span>
          </Link>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/auth/sign-in?next=/workspace"
              className="rounded-lg border border-cyan-200 bg-white px-3 py-2 text-xs font-semibold text-cyan-800 transition hover:border-cyan-300 hover:bg-cyan-50"
            >
              Login
            </Link>
            <Link
              href="/auth/sign-up?role=patient&next=/workspace/patient/booking"
              className="rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs font-semibold text-cyan-900 transition hover:bg-cyan-100"
            >
              Patient Signup
            </Link>
            <Link
              href="/auth/sign-up?role=provider&next=/workspace/provider/dashboard"
              className="rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 px-3 py-2 text-xs font-semibold text-white shadow-[0_14px_30px_-18px_rgba(8,145,178,0.95)]"
            >
              Provider Signup
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[1480px] space-y-7 px-4 pt-6 sm:px-6 sm:pt-8">
        <section className="grid gap-5 xl:grid-cols-[1.1fr_1fr]">
          <article className="rounded-3xl border border-white/75 bg-white/88 p-6 shadow-[0_34px_90px_-55px_rgba(2,8,20,0.9)] backdrop-blur sm:p-8">
            <span className="inline-flex rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold tracking-[0.14em] text-cyan-800">
              PLATFORM OVERVIEW
            </span>
            <h1 className="mt-4 text-3xl font-bold leading-tight text-slate-900 sm:text-5xl">
              One Platform To Design, Run, and Scale Telemedicine Operations.
            </h1>
            <p className="mt-4 max-w-2xl text-sm text-slate-700 sm:text-base">
              This enterprise telemedicine solution supports complete patient, provider, and admin journeys with modern
              UX, structured workflows, and operational governance.
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {[
                ["3 Role Workspaces", "Patient, Provider, Admin"],
                ["Clinical + Ops", "Consultation to claims and incidents"],
                ["Production Ready", "Secure auth, RLS, and audit history"],
              ].map(([title, value]) => (
                <div key={title} className="rounded-2xl border border-slate-200 bg-white p-3">
                  <p className="text-xs font-semibold tracking-wide text-cyan-700">{title}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              <Link
                href="/auth/sign-up?role=patient&next=/workspace/patient/booking"
                className="rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_16px_36px_-22px_rgba(8,145,178,0.95)]"
              >
                Start As Patient
              </Link>
              <Link
                href="/auth/sign-up?role=provider&next=/workspace/provider/dashboard"
                className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-semibold text-indigo-900"
              >
                Start As Provider
              </Link>
              <Link
                href="/auth/sign-in?next=/workspace"
                className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700"
              >
                Existing User Login
              </Link>
            </div>
          </article>

          <HeroSlider slides={HERO_SLIDES} />
        </section>

        <section className="rounded-3xl border border-white/75 bg-white/90 p-6 shadow-[0_28px_82px_-55px_rgba(2,8,20,0.9)]">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold tracking-[0.14em] text-cyan-700">ROLE MODULES</p>
              <h2 className="mt-1 text-2xl font-bold text-slate-900">User-Wise Panels Covered In This Platform</h2>
            </div>
            <p className="max-w-xl text-sm text-slate-600">
              Purpose-built dashboards for each user persona, aligned to real telemedicine operational needs.
            </p>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            {ROLE_PANELS.map((panel) => (
              <article key={panel.title} className="group rounded-2xl border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-[0_22px_55px_-35px_rgba(15,23,42,0.95)]">
                <p className={`inline-flex rounded-full bg-gradient-to-r ${panel.color} px-3 py-1 text-xs font-semibold tracking-[0.1em] text-white`}>
                  {panel.title}
                </p>
                <div className="mt-3 space-y-2">
                  {panel.points.map((point) => (
                    <p key={point} className="rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2 text-sm text-slate-700">
                      {point}
                    </p>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[1fr_1.05fr]">
          <article className="rounded-3xl border border-white/75 bg-white/90 p-6 shadow-[0_24px_70px_-48px_rgba(2,8,20,0.95)]">
            <p className="text-xs font-semibold tracking-[0.14em] text-cyan-700">HOW IT WORKS</p>
            <h2 className="mt-1 text-2xl font-bold text-slate-900">Complete Journey In Four Stages</h2>
            <div className="mt-4 space-y-3">
              {HOW_IT_WORKS.map((item) => (
                <div key={item.step} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-cyan-100 text-xs font-bold text-cyan-800">
                      {item.step}
                    </span>
                    <p className="text-base font-semibold text-slate-900">{item.title}</p>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{item.detail}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-3xl border border-white/75 bg-white/90 p-6 shadow-[0_24px_70px_-48px_rgba(2,8,20,0.95)]">
            <p className="text-xs font-semibold tracking-[0.14em] text-cyan-700">CMS / CONTENT BLOCKS</p>
            <h2 className="mt-1 text-2xl font-bold text-slate-900">Front Website Sections You Can Manage</h2>
            <p className="mt-2 text-sm text-slate-600">
              The website uses reusable block-style panels so your content team can continuously update messaging.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {CMS_BLOCKS.map((block) => (
                <div key={block.title} className="rounded-2xl border border-slate-200 bg-white p-3">
                  <p className="text-sm font-semibold text-slate-900">{block.title}</p>
                  <p className="mt-1 text-xs text-slate-600">{block.description}</p>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="rounded-3xl border border-white/75 bg-white/92 p-6 shadow-[0_24px_70px_-48px_rgba(2,8,20,0.95)]">
          <p className="text-xs font-semibold tracking-[0.14em] text-cyan-700">FAQS</p>
          <h2 className="mt-1 text-2xl font-bold text-slate-900">Frequently Asked Questions</h2>
          <div className="mt-4 space-y-2">
            {FAQS.map((item) => (
              <details key={item.question} className="group rounded-2xl border border-slate-200 bg-white p-4 open:border-cyan-200 open:bg-cyan-50/40">
                <summary className="cursor-pointer list-none text-sm font-semibold text-slate-900">
                  {item.question}
                </summary>
                <p className="mt-2 text-sm text-slate-700">{item.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-cyan-200 bg-gradient-to-r from-cyan-600 to-blue-700 p-6 text-white shadow-[0_34px_92px_-52px_rgba(14,116,144,0.95)] sm:p-8">
          <p className="text-xs font-semibold tracking-[0.16em] text-white/90">READY TO USE</p>
          <h2 className="mt-2 text-3xl font-bold">Start Your Telemedicine Platform Journey</h2>
          <p className="mt-2 max-w-3xl text-sm text-white/90 sm:text-base">
            Use patient/provider onboarding links to begin immediately, or log in with existing credentials to access full
            role-based dashboards.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              href="/auth/sign-up?role=patient&next=/workspace/patient/booking"
              className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-cyan-800"
            >
              Signup Patient
            </Link>
            <Link
              href="/auth/sign-up?role=provider&next=/workspace/provider/dashboard"
              className="rounded-xl border border-white/40 bg-white/15 px-4 py-2.5 text-sm font-semibold text-white"
            >
              Signup Provider
            </Link>
            <Link
              href="/auth/sign-in?next=/workspace"
              className="rounded-xl border border-white/40 bg-white/15 px-4 py-2.5 text-sm font-semibold text-white"
            >
              Login
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

