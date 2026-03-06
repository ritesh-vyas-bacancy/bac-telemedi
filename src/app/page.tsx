import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth/session";
import { getDefaultModuleByRole } from "@/lib/workspace/config";
import { HeroSlider, type HeroSlide } from "@/components/marketing/hero-slider";
import { MarketingShell } from "@/components/marketing/marketing-shell";

const HERO_SLIDES: HeroSlide[] = [
  {
    id: "slide-1",
    badge: "WELCOME BANNER",
    title: "A Smooth, Enterprise-Grade Telemedicine Experience",
    description:
      "A modern one-page website plus role-based platform for hospitals, providers, and patients to run care operations in one flow.",
    metricLabel: "Role Journeys",
    metricValue: "3",
    bullets: [
      "Patient onboarding, booking, and visit tracking",
      "Provider queue, notes, and prescriptions",
      "Admin operations, compliance, and governance",
      "Design system aligned for 2026 product demos",
    ],
    gradient: "from-cyan-600 via-blue-600 to-indigo-700",
  },
  {
    id: "slide-2",
    badge: "HOW IT WORKS",
    title: "From Booking to Audit Trail, Every Step Connected",
    description:
      "The product covers consultation lifecycle, billing visibility, claim actions, incident handling, and real-time notifications.",
    metricLabel: "Core Modules",
    metricValue: "10+",
    bullets: [
      "Consultation state machine with traceability",
      "Claims and notification operations desk",
      "Structured data model with role security",
      "Ready for demo and stakeholder walkthroughs",
    ],
    gradient: "from-emerald-600 via-teal-600 to-cyan-700",
  },
  {
    id: "slide-3",
    badge: "HOSPITAL OPERATIONS",
    title: "Business + Clinical Visibility In One Control Layer",
    description:
      "Clinical actions, operational workflows, and governance controls are surfaced with clean visual hierarchy for enterprise adoption.",
    metricLabel: "Operational View",
    metricValue: "360",
    bullets: [
      "Track incidents, compliance, and role permissions",
      "Control appointment and consultation statuses",
      "Review immutable audit stream for accountability",
      "Modern UX with gradients, glass depth, and motion",
    ],
    gradient: "from-blue-700 via-indigo-700 to-sky-700",
  },
];

const PLATFORM_PANELS = [
  {
    title: "Patient Platform",
    subtitle: "Simple, guided digital care path",
    points: [
      "Book appointments and view schedule",
      "Check consultation state and join video room",
      "Read prescriptions, care orders, and invoices",
      "Track reminders in a unified inbox timeline",
    ],
    glow: "from-cyan-500/25 to-blue-600/20",
  },
  {
    title: "Provider Workspace",
    subtitle: "Clinical execution without clutter",
    points: [
      "Manage queue and readiness status in one board",
      "Create SOAP notes, prescriptions, and care orders",
      "Submit and update claim lifecycle details",
      "Send patient notifications by selected channels",
    ],
    glow: "from-indigo-500/25 to-blue-600/20",
  },
  {
    title: "Admin Command Center",
    subtitle: "Operational control and governance",
    points: [
      "Monitor throughput, revenue, and active sessions",
      "Control appointment and consultation status updates",
      "Track incidents, compliance events, and permissions",
      "Review audit logs for complete accountability",
    ],
    glow: "from-emerald-500/25 to-teal-600/20",
  },
];

const JOURNEY_STEPS = [
  {
    step: "01",
    title: "Choose Role and Onboard",
    detail: "Patient and provider users can sign up from the public website with role-preselected journeys.",
  },
  {
    step: "02",
    title: "Start Care Workflow",
    detail: "Booking, check-in, consultation progress, and documentation are managed inside persona dashboards.",
  },
  {
    step: "03",
    title: "Operate and Resolve",
    detail: "Claims, notifications, incidents, and compliance workflows are controlled in operations modules.",
  },
  {
    step: "04",
    title: "Monitor and Govern",
    detail: "Admins review KPIs, resolve events, and maintain policy-level visibility via audit and permissions.",
  },
];

const CMS_BLOCKS = [
  "Hero campaigns and announcement ribbons",
  "Service specialization blocks and outcome stories",
  "Care journey explainers with CTA rails",
  "Trust, compliance, and accreditation panels",
  "FAQ and knowledge-center style sections",
  "Case studies, testimonials, and conversion blocks",
];

const FAQS = [
  {
    question: "Is this platform suitable for enterprise hospital demos?",
    answer:
      "Yes. The UX and workflows are designed for enterprise walkthroughs across patient care, provider execution, and admin operations.",
  },
  {
    question: "Can patient and provider signup be separated from the homepage?",
    answer:
      "Yes. Dedicated role-specific signup links are already wired from this page and can be routed from campaigns or partner portals.",
  },
  {
    question: "Does this include legal pages and policy navigation?",
    answer:
      "Yes. About, Terms, and Privacy pages are now available from the top navigation and footer CMS links.",
  },
  {
    question: "Is contact and office address available on the site?",
    answer:
      "Yes. Footer includes company address, support email, and phone details for customer-facing communication.",
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
    <MarketingShell showSectionLinks>
      <section className="mx-auto w-full max-w-[1480px] px-4 pt-8 sm:px-6 sm:pt-10">
        <div className="grid gap-6 xl:grid-cols-[1.1fr_1fr]">
          <article className="marketing-panel relative overflow-hidden p-6 sm:p-8">
            <div className="absolute -left-14 -top-14 h-44 w-44 rounded-full bg-cyan-300/35 blur-3xl" />
            <div className="absolute -bottom-20 right-8 h-56 w-56 rounded-full bg-blue-300/30 blur-3xl" />

            <div className="relative z-10">
              <p className="inline-flex rounded-full border border-cyan-200/80 bg-cyan-50/90 px-3 py-1 text-xs font-semibold tracking-[0.14em] text-cyan-800">
                ENTERPRISE TELEMEDICINE WEBSITE
              </p>
              <h1 className="mt-4 max-w-3xl text-4xl font-extrabold leading-tight text-slate-900 sm:text-6xl">
                Trendy One-Page Experience For Modern Healthcare Brands
              </h1>
              <p className="mt-4 max-w-2xl text-sm text-slate-700 sm:text-base">
                Smooth scrolling sections, shaped visual panels, animated directional cues, and clear CMS-level navigation
                for About, Terms, Privacy, and platform workflows.
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {[
                  ["Visual Style", "Gradient depth with glass motion cards"],
                  ["User Flow", "Clear top-to-bottom storytelling"],
                  ["Conversion", "Role-based signup and login actions"],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-2xl border border-slate-200/90 bg-white/90 p-3 shadow-[0_16px_34px_-28px_rgba(15,23,42,0.9)]">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.11em] text-cyan-700">{label}</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-7 flex flex-wrap gap-2">
                <Link
                  href="/auth/sign-up?role=patient&next=/workspace/patient/booking"
                  className="rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_20px_38px_-25px_rgba(8,145,178,1)]"
                >
                  Start Patient Journey
                </Link>
                <Link
                  href="/auth/sign-up?role=provider&next=/workspace/provider/dashboard"
                  className="rounded-xl border border-indigo-300 bg-indigo-50 px-4 py-2.5 text-sm font-semibold text-indigo-900"
                >
                  Start Provider Journey
                </Link>
                <Link
                  href="/auth/sign-in?next=/workspace"
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700"
                >
                  Existing User Login
                </Link>
              </div>

              <a href="#platform" className="mt-8 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
                Scroll For Full Journey
                <span className="marketing-arrow-down">↓</span>
              </a>
            </div>
          </article>

          <HeroSlider slides={HERO_SLIDES} />
        </div>

        <div className="pointer-events-none mt-5 hidden justify-center lg:flex">
          <div className="flex flex-col items-center gap-1 text-cyan-700/80">
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em]">Flow</span>
            <span className="h-9 w-px bg-cyan-300" />
            <span className="marketing-arrow-down">↓</span>
            <span className="h-9 w-px bg-cyan-300" />
          </div>
        </div>
      </section>

      <section id="platform" className="mx-auto mt-8 w-full max-w-[1480px] px-4 sm:px-6">
        <div className="marketing-panel p-6 sm:p-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-cyan-700">Platform Panels</p>
              <h2 className="mt-1 text-3xl font-bold text-slate-900">Role-Based Experience With Distinct Visual Identity</h2>
            </div>
            <p className="max-w-2xl text-sm text-slate-600">
              Each persona panel is designed for clear action hierarchy and intuitive outcomes, avoiding the old-school box
              layout feel.
            </p>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            {PLATFORM_PANELS.map((panel) => (
              <article
                key={panel.title}
                className={`group relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_22px_56px_-38px_rgba(15,23,42,0.9)] transition hover:-translate-y-0.5 hover:shadow-[0_28px_70px_-38px_rgba(15,23,42,0.95)]`}
              >
                <div className={`absolute -right-14 -top-16 h-44 w-44 rounded-full bg-gradient-to-br ${panel.glow} blur-3xl`} />
                <div className="relative z-10">
                  <p className="text-lg font-bold text-slate-900">{panel.title}</p>
                  <p className="mt-1 text-sm text-slate-600">{panel.subtitle}</p>
                  <div className="mt-4 space-y-2">
                    {panel.points.map((point) => (
                      <p key={point} className="rounded-xl border border-slate-200 bg-slate-50/85 px-3 py-2 text-sm text-slate-700">
                        {point}
                      </p>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="journey" className="mx-auto mt-8 w-full max-w-[1480px] px-4 sm:px-6">
        <div className="grid gap-4 xl:grid-cols-[1fr_1.05fr]">
          <article className="marketing-panel p-6 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-cyan-700">How It Works</p>
            <h2 className="mt-1 text-3xl font-bold text-slate-900">Guided Step Flow With Directional Motion Cues</h2>
            <p className="mt-2 text-sm text-slate-600">
              The section below uses top-to-bottom flow language and motion cues so users always understand where to move next.
            </p>
            <div className="mt-5 space-y-3">
              {JOURNEY_STEPS.map((item, index) => (
                <div key={item.step}>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_14px_34px_-28px_rgba(15,23,42,0.85)]">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-cyan-100 text-xs font-bold text-cyan-800">
                        {item.step}
                      </span>
                      <p className="text-base font-semibold text-slate-900">{item.title}</p>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">{item.detail}</p>
                  </div>
                  {index < JOURNEY_STEPS.length - 1 ? (
                    <div className="flex justify-center py-1.5">
                      <span className="marketing-arrow-down text-cyan-700">↓</span>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </article>

          <article id="cms" className="marketing-panel p-6 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-cyan-700">CMS Block Sections</p>
            <h2 className="mt-1 text-3xl font-bold text-slate-900">Website Content Blocks Built For Product Marketing</h2>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {CMS_BLOCKS.map((item) => (
                <div key={item} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700">
                  {item}
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-2xl border border-cyan-200 bg-cyan-50/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.11em] text-cyan-800">CMS Navigation Ready</p>
              <p className="mt-1 text-sm text-cyan-900">
                About, Terms, and Privacy are available from top menu and footer so legal and trust content is always one click away.
              </p>
            </div>
          </article>
        </div>
      </section>

      <section id="faq" className="mx-auto mt-8 w-full max-w-[1480px] px-4 sm:px-6">
        <div className="marketing-panel p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-cyan-700">FAQs</p>
          <h2 className="mt-1 text-3xl font-bold text-slate-900">Frequently Asked Questions</h2>
          <div className="mt-5 space-y-2">
            {FAQS.map((item) => (
              <details key={item.question} className="group rounded-2xl border border-slate-200 bg-white p-4 open:border-cyan-200 open:bg-cyan-50/40">
                <summary className="cursor-pointer list-none text-sm font-semibold text-slate-900">{item.question}</summary>
                <p className="mt-2 text-sm text-slate-700">{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto mt-8 w-full max-w-[1480px] px-4 sm:px-6">
        <div className="relative overflow-hidden rounded-[30px] border border-cyan-200 bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-700 p-6 text-white shadow-[0_34px_90px_-54px_rgba(14,116,144,1)] sm:p-8">
          <div className="absolute -left-8 -top-12 h-44 w-44 rounded-full bg-white/25 blur-2xl" />
          <div className="absolute -bottom-10 right-4 h-52 w-52 rounded-full bg-white/15 blur-2xl" />
          <div className="relative z-10">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/90">Ready For Demo</p>
            <h2 className="mt-2 text-3xl font-bold">Launch Signup and Start Telemedicine Journeys</h2>
            <p className="mt-2 max-w-3xl text-sm text-white/90 sm:text-base">
              Modern visual style, smooth navigation, legal pages, and complete contact footer are now integrated for customer-ready sharing.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link
                href="/auth/sign-up?role=patient&next=/workspace/patient/booking"
                className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-cyan-900"
              >
                Signup Patient
              </Link>
              <Link
                href="/auth/sign-up?role=provider&next=/workspace/provider/dashboard"
                className="rounded-xl border border-white/45 bg-white/12 px-4 py-2.5 text-sm font-semibold text-white"
              >
                Signup Provider
              </Link>
              <Link
                href="/auth/sign-in?next=/workspace"
                className="rounded-xl border border-white/45 bg-white/12 px-4 py-2.5 text-sm font-semibold text-white"
              >
                Login
              </Link>
            </div>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}

