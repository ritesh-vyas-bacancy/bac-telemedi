import { type Persona } from "./journeys";

type Tone = "neutral" | "info" | "success" | "warning";

type Metric = { label: string; value: string; meta: string };
type Block = { title: string; tone?: Tone; items: string[] };
type StageConfig = {
  app: string;
  section: string;
  title: string;
  subtitle: string;
  nav: string[];
  metrics: Metric[];
  left: Block[];
  right: Block[];
  actions: string[];
};

function toneClass(tone: Tone = "neutral") {
  if (tone === "info") return "border-cyan-200 bg-cyan-50";
  if (tone === "success") return "border-emerald-200 bg-emerald-50";
  if (tone === "warning") return "border-amber-200 bg-amber-50";
  return "border-slate-200 bg-white";
}

function BlockView({ title, tone = "neutral", items }: Block) {
  return (
    <section className={`rounded-2xl border p-4 ${toneClass(tone)}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-700">{title}</p>
      <ul className="mt-2 space-y-1.5 text-sm text-slate-700">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2">
            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-slate-500" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function AppFrame({ accent, config }: { accent: string; config: StageConfig }) {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-slate-100 shadow-[0_30px_90px_-55px_rgba(2,8,20,0.9)]">
      <header className={`bg-gradient-to-r ${accent} px-5 py-4 text-white sm:px-6`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/90">{config.app}</p>
            <p className="text-lg font-bold">{config.title}</p>
            <p className="text-sm text-white/90">{config.subtitle}</p>
          </div>
          <div className="rounded-xl bg-white/20 px-3 py-2 text-right text-xs">
            <p className="font-semibold">{config.section}</p>
            <p>Full Screen Preview</p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {config.nav.map((item, idx) => (
            <span key={item} className={`rounded-lg px-2 py-1 text-xs ${idx === 0 ? "bg-white text-slate-900" : "bg-white/20 text-white"}`}>
              {item}
            </span>
          ))}
        </div>
      </header>

      <main className="flex-1 overflow-auto p-4 sm:p-6">
        <div className="grid gap-3 sm:grid-cols-3">
          {config.metrics.map((metric) => (
            <div key={metric.label} className="rounded-xl border border-slate-200 bg-white p-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600">{metric.label}</p>
              <p className="mt-1 text-xl font-bold text-slate-900">{metric.value}</p>
              <p className="text-xs text-slate-600">{metric.meta}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-3">{config.left.map((b) => <BlockView key={b.title} {...b} />)}</div>
          <div className="space-y-3">{config.right.map((b) => <BlockView key={b.title} {...b} />)}</div>
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white px-4 py-3 sm:px-6">
        <div className="flex flex-wrap gap-2">
          {config.actions.map((action, idx) => (
            <button
              key={action}
              type="button"
              className={`rounded-lg px-3 py-2 text-xs font-semibold ${idx === 0 ? "bg-slate-900 text-white" : "border border-slate-300 bg-white text-slate-700"}`}
            >
              {action}
            </button>
          ))}
        </div>
      </footer>
    </div>
  );
}

const PATIENT: Record<string, StageConfig> = {
  p1: {
    app: "Patient App",
    section: "Onboarding",
    title: "Account and Consent Setup",
    subtitle: "Identity, insurance, and legal acceptance",
    nav: ["Profile", "Insurance", "Consent", "Reminders"],
    metrics: [
      { label: "Progress", value: "42%", meta: "3 of 7 sections" },
      { label: "Verification", value: "Passed", meta: "Email + phone verified" },
      { label: "Readiness", value: "Pending", meta: "1 consent incomplete" },
    ],
    left: [
      { title: "Identity Form", tone: "info", items: ["Name, DOB, contact", "Emergency contact", "Timezone and address"] },
      { title: "Consent Bundle", tone: "warning", items: ["HIPAA authorization", "Telehealth disclaimer", "Terms and privacy"] },
    ],
    right: [
      { title: "Insurance Intake", tone: "success", items: ["Card upload", "Policy check", "Copay estimate"] },
      { title: "System Events", items: ["Audit timestamp", "Fraud check", "Profile score updated"] },
    ],
    actions: ["Save and Continue", "Upload ID", "Review Consent"],
  },
  p2: {
    app: "Patient App",
    section: "Triage",
    title: "Smart Symptom Intake",
    subtitle: "Adaptive question path with safety checks",
    nav: ["Symptoms", "Severity", "Red Flags", "Route"],
    metrics: [
      { label: "Question", value: "8 / 12", meta: "Adaptive flow" },
      { label: "Priority", value: "Moderate", meta: "No emergency signal" },
      { label: "Recommendation", value: "Same Day", meta: "Family medicine" },
    ],
    left: [
      { title: "Clinical Inputs", tone: "info", items: ["Onset timeline", "Pain scale", "Medication and allergy list"] },
      { title: "Safety Screening", tone: "warning", items: ["Chest pain check", "Breathing check", "Neuro red flags"] },
    ],
    right: [
      { title: "Route Outcome", tone: "success", items: ["Specialty pre-filter", "Urgency assigned", "Booking unlocked"] },
      { title: "Data Capture", items: ["Attachment support", "History merge", "Visit reason draft"] },
    ],
    actions: ["Continue Triage", "Attach Report", "See Providers"],
  },
  p3: {
    app: "Patient App",
    section: "Discovery",
    title: "Provider Marketplace",
    subtitle: "Find and compare verified doctors",
    nav: ["Search", "Filters", "Cards", "Shortlist"],
    metrics: [
      { label: "Matches", value: "16", meta: "Based on triage" },
      { label: "Earliest Slot", value: "15 Min", meta: "Urgent provider" },
      { label: "Price Range", value: "$45-$95", meta: "Before coverage" },
    ],
    left: [
      { title: "Search and Filters", tone: "info", items: ["Specialty and language", "Insurance and gender", "Sort by rating and wait"] },
      { title: "Trust Signals", tone: "success", items: ["License verified", "Experience years", "Recent patient rating"] },
    ],
    right: [
      { title: "Selected Provider", items: ["Dr. Sarah Martinez", "4.9 rating", "Available in 15 min"] },
      { title: "System Assist", items: ["Realtime availability", "Intent ranking", "Shortlist persistence"] },
    ],
    actions: ["Select Provider", "Compare Top 3", "Continue to Booking"],
  },
  p4: {
    app: "Patient App",
    section: "Booking",
    title: "Schedule and Checkout",
    subtitle: "Slot lock, pricing, and payment",
    nav: ["Calendar", "Pricing", "Payment", "Confirm"],
    metrics: [
      { label: "Slot", value: "Thu 4:30 PM", meta: "Timezone adjusted" },
      { label: "Lock Timer", value: "01:47", meta: "Reservation active" },
      { label: "Amount Due", value: "$21.17", meta: "After coverage" },
    ],
    left: [
      { title: "Appointment Summary", tone: "info", items: ["New consult 30 min", "Provider details", "Reminder preferences"] },
      { title: "Cost Breakdown", tone: "warning", items: ["Consult fee", "Coverage estimate", "Platform and tax"] },
    ],
    right: [
      { title: "Payment", tone: "success", items: ["Card ending 0452", "HSA/FSA supported", "Instant receipt"] },
      { title: "Booking Events", items: ["Double-book prevention", "Payment intent validation", "Reminder jobs created"] },
    ],
    actions: ["Confirm and Pay", "Change Slot", "Cancel Booking"],
  },
  p5: {
    app: "Patient App",
    section: "Waiting Room",
    title: "Pre-Visit Readiness",
    subtitle: "Countdown and device diagnostics",
    nav: ["Countdown", "Device", "Checklist", "Join"],
    metrics: [
      { label: "Starts In", value: "02:45", meta: "Doctor in previous session" },
      { label: "Connection", value: "Excellent", meta: "24 Mbps stable" },
      { label: "Checklist", value: "3/4", meta: "One item pending" },
    ],
    left: [
      { title: "Device Check", tone: "info", items: ["Camera pass", "Microphone pass", "Audio pass"] },
      { title: "Preparation", tone: "warning", items: ["ID ready", "Medication list", "Questions list pending"] },
    ],
    right: [
      { title: "Provider Presence", tone: "success", items: ["Doctor online", "Queue position", "Auto-admit signal"] },
      { title: "Accessibility", items: ["Large text", "High contrast", "Keyboard navigation"] },
    ],
    actions: ["Join Session", "Retest Devices", "Open Help"],
  },
  p6: {
    app: "Patient App",
    section: "Consultation",
    title: "Live Video Consultation",
    subtitle: "Video call with secure chat and shared files",
    nav: ["Video", "Chat", "Files", "Plan"],
    metrics: [
      { label: "Quality", value: "HD Stable", meta: "Adaptive stream" },
      { label: "Duration", value: "18:22", meta: "Current elapsed" },
      { label: "Status", value: "In Progress", meta: "Provider documenting" },
    ],
    left: [
      { title: "Session Workspace", tone: "info", items: ["Main video + PiP", "Live transcript", "Secure in-call chat"] },
      { title: "Shared Artifacts", items: ["headache-log.jpg uploaded", "Medication list reviewed", "Allergy reconfirmed"] },
    ],
    right: [
      { title: "Draft Care Plan", tone: "success", items: ["Assessment captured", "Medication suggestion", "Follow-up intent"] },
      { title: "Audit and Safety", tone: "warning", items: ["Clinical events logged", "Quality telemetry", "Retention policy"] },
    ],
    actions: ["End Call", "Send Message", "Review Summary"],
  },
  p7: {
    app: "Patient App",
    section: "Post Visit",
    title: "Care Continuity Timeline",
    subtitle: "Prescription, orders, and follow-up",
    nav: ["Summary", "Medication", "Orders", "Follow-up"],
    metrics: [
      { label: "Prescription", value: "Sent", meta: "CVS acknowledged" },
      { label: "Lab Order", value: "1 Active", meta: "CBC pending" },
      { label: "Check-In", value: "7 Days", meta: "Reminder scheduled" },
    ],
    left: [
      { title: "Visit Summary", tone: "success", items: ["Diagnosis overview", "Care instructions", "Warning signs"] },
      { title: "Medication and Orders", tone: "info", items: ["Dosage guide", "Lab prep instructions", "Status tracking"] },
    ],
    right: [
      { title: "Follow-up Loop", tone: "warning", items: ["Secure thread open", "One-click rebook", "Symptom check automation"] },
      { title: "Retention Signals", items: ["Adherence nudges", "Outcome timer", "NPS trigger"] },
    ],
    actions: ["Book Follow-up", "Message Provider", "Download Summary"],
  },
};

const PROVIDER: Record<string, StageConfig> = {
  d1: {
    app: "Provider Portal",
    section: "Activation",
    title: "Credentialing Workspace",
    subtitle: "Onboarding and compliance readiness",
    nav: ["Licenses", "Profile", "Availability", "Compliance"],
    metrics: [
      { label: "Readiness", value: "86%", meta: "One required doc missing" },
      { label: "Checks", value: "5/6", meta: "DEA + NPI verified" },
      { label: "Status", value: "Pending", meta: "Awaiting admin approval" },
    ],
    left: [
      { title: "Credentials", tone: "warning", items: ["State license", "Malpractice", "Sanctions screening"] },
      { title: "Profile Setup", tone: "info", items: ["Specialty and fee", "Languages", "Consultation modes"] },
    ],
    right: [
      { title: "Security Readiness", tone: "success", items: ["2FA enabled", "Policy accepted", "Calendar initialized"] },
      { title: "Audit Events", items: ["Document expiry checks", "Webhook verification", "Approval log"] },
    ],
    actions: ["Submit for Review", "Upload Missing Doc", "Preview Profile"],
  },
  d2: {
    app: "Provider Portal",
    section: "Operations",
    title: "Daily Command Center",
    subtitle: "Schedule, queue, and urgent tasks",
    nav: ["Today", "Queue", "Messages", "Analytics"],
    metrics: [
      { label: "Appointments", value: "8", meta: "6 complete, 2 upcoming" },
      { label: "Avg Session", value: "21 Min", meta: "Improved this week" },
      { label: "Unread", value: "5", meta: "1 urgent" },
    ],
    left: [
      { title: "Live Queue", tone: "info", items: ["2:00 Sarah checked in", "2:30 Michael waiting", "3:00 Emma upcoming"] },
      { title: "Pending Work", tone: "warning", items: ["2 notes pending", "1 refill waiting", "1 follow-up overdue"] },
    ],
    right: [
      { title: "Productivity", tone: "success", items: ["Utilization 76%", "No-show 8%", "Revenue +12%"] },
      { title: "Automation", items: ["Late alerting", "Context preload", "Suggested actions"] },
    ],
    actions: ["Start Consultation", "Open Queue", "View Analytics"],
  },
  d3: {
    app: "Provider Portal",
    section: "Clinical Prep",
    title: "Patient Clinical Snapshot",
    subtitle: "History and risk review before consult",
    nav: ["History", "Meds", "Allergies", "Vitals"],
    metrics: [
      { label: "Last Visit", value: "3 Months", meta: "Follow-up recommended" },
      { label: "Risk Alerts", value: "1 High", meta: "Penicillin allergy" },
      { label: "Vitals", value: "Stable", meta: "No acute drift" },
    ],
    left: [
      { title: "Chart Overview", tone: "info", items: ["Problem list", "Prior assessment", "Family history"] },
      { title: "Safety Banner", tone: "warning", items: ["Allergy contraindications", "Interaction pre-check", "Critical note pinning"] },
    ],
    right: [
      { title: "Clinical Insights", tone: "success", items: ["Template recommendation", "Coding context", "Follow-up rationale"] },
      { title: "Session Readiness", items: ["SOAP primed", "Vitals loaded", "Join call action"] },
    ],
    actions: ["Open Consultation", "Pin Alerts", "Review Last Note"],
  },
  d4: {
    app: "Provider Portal",
    section: "Live Consult",
    title: "Consultation Suite",
    subtitle: "Video, SOAP, and in-call actions",
    nav: ["Video", "SOAP", "Orders", "Chat"],
    metrics: [
      { label: "Call Health", value: "Good", meta: "Latency in target" },
      { label: "Autosave", value: "30 Sec", meta: "Continuous sync" },
      { label: "Assistant", value: "Active", meta: "ICD hints enabled" },
    ],
    left: [
      { title: "Consult Workspace", tone: "info", items: ["Patient focus + PiP", "Voice dictation", "Secure chat"] },
      { title: "In-call Toolkit", items: ["File sharing", "Location request", "Quick clinical actions"] },
    ],
    right: [
      { title: "Clinical Capture", tone: "success", items: ["SOAP complete", "Assessment checks", "Plan draft ready"] },
      { title: "Safety Telemetry", tone: "warning", items: ["Event logging", "Quality monitor", "Consent enforcement"] },
    ],
    actions: ["Send Rx", "Create Order", "End Visit"],
  },
  d5: {
    app: "Provider Portal",
    section: "Documentation",
    title: "Encounter Finalization",
    subtitle: "Coding validation and sign-off",
    nav: ["SOAP", "ICD/CPT", "Validation", "Signature"],
    metrics: [
      { label: "Validation", value: "1 Issue", meta: "Duration field required" },
      { label: "Coding", value: "Pre-filled", meta: "ICD + CPT suggested" },
      { label: "Lock State", value: "Pending", meta: "Awaiting signature" },
    ],
    left: [
      { title: "Coding Assistant", tone: "info", items: ["R51.9 and G44.209", "Modifier suggestions", "Claim score"] },
      { title: "Rule Checks", tone: "warning", items: ["Missing required field", "Modifier mismatch scan", "Denial risk estimate"] },
    ],
    right: [
      { title: "Sign-off", tone: "success", items: ["Digital signature", "Immutable note lock", "Audit hash"] },
      { title: "Output", items: ["Billing payload", "Patient summary", "Post-visit workflow"] },
    ],
    actions: ["Fix Validation", "Sign Encounter", "Send to Billing"],
  },
  d6: {
    app: "Provider Portal",
    section: "Treatment",
    title: "Prescription and Orders",
    subtitle: "Medication routing with safety checks",
    nav: ["Medication", "Formulary", "Labs", "Referrals"],
    metrics: [
      { label: "Prescription", value: "Ready", meta: "Ibuprofen configured" },
      { label: "Safety", value: "No Conflicts", meta: "Checks passed" },
      { label: "Orders", value: "1 Lab", meta: "CBC requested" },
    ],
    left: [
      { title: "Medication Builder", tone: "info", items: ["Dose and frequency", "Refills", "Pharmacy routing"] },
      { title: "Safety Checks", tone: "warning", items: ["Allergy + interaction", "Policy gate", "Duplicate therapy"] },
    ],
    right: [
      { title: "Fulfillment", tone: "success", items: ["Rx transmitted", "Patient notified", "Status tracking"] },
      { title: "Diagnostics", items: ["Lab order", "Referral support", "Result callback"] },
    ],
    actions: ["Transmit Rx", "Order Labs", "Send Care Plan"],
  },
  d7: {
    app: "Provider Portal",
    section: "Continuity",
    title: "Claims and Follow-up Hub",
    subtitle: "Billing status, inbox, and KPI trend",
    nav: ["Claims", "Inbox", "Refills", "Performance"],
    metrics: [
      { label: "Claims", value: "7 Submitted", meta: "1 pending" },
      { label: "Inbox SLA", value: "Healthy", meta: "Urgent < 2h" },
      { label: "CSAT", value: "4.8 / 5", meta: "This week" },
    ],
    left: [
      { title: "Claim Queue", tone: "warning", items: ["Submission status", "Denial risk", "Payout ETA"] },
      { title: "Follow-up Inbox", tone: "info", items: ["Patient questions", "Refill requests", "Escalation tags"] },
    ],
    right: [
      { title: "Performance", tone: "success", items: ["Utilization trend", "Response SLA", "Revenue trend"] },
      { title: "Optimization", items: ["Schedule hints", "Template insights", "Peer benchmarks"] },
    ],
    actions: ["Approve Claim", "Reply to Patient", "Review Weekly Report"],
  },
};

const ADMIN: Record<string, StageConfig> = {
  a1: {
    app: "Admin Console",
    section: "Live Ops",
    title: "Marketplace Pulse",
    subtitle: "Sessions, queue health, and critical alerts",
    nav: ["Pulse", "Alerts", "Capacity", "Reliability"],
    metrics: [
      { label: "Active Sessions", value: "23", meta: "Live now" },
      { label: "Avg Wait", value: "4.2 Min", meta: "Within SLA" },
      { label: "Critical Alerts", value: "3", meta: "Needs response" },
    ],
    left: [
      { title: "Ops Wall", tone: "info", items: ["Volume by specialty", "Wait-time trend", "No-show risk"] },
      { title: "Alert Queue", tone: "warning", items: ["Capacity shortage", "Provider issue", "Service degradation"] },
    ],
    right: [
      { title: "Service Health", tone: "success", items: ["Auth healthy", "Booking healthy", "Video healthy"] },
      { title: "Actions", items: ["Assign owner", "Escalate", "Apply mitigation"] },
    ],
    actions: ["Open Alerts", "Rebalance Capacity", "View Reliability"],
  },
  a2: {
    app: "Admin Console",
    section: "Network Quality",
    title: "Provider Verification Queue",
    subtitle: "Credentialing decisions and auditability",
    nav: ["Applicants", "Checks", "Approvals", "Audit"],
    metrics: [
      { label: "Pending", value: "12", meta: "Awaiting review" },
      { label: "Ready", value: "5", meta: "All checks passed" },
      { label: "Blocked", value: "3", meta: "Needs correction" },
    ],
    left: [
      { title: "Applicant Pipeline", tone: "info", items: ["Pending bucket", "Correction bucket", "Approved bucket"] },
      { title: "Verification Checks", tone: "warning", items: ["License status", "Malpractice validity", "Sanctions screening"] },
    ],
    right: [
      { title: "Activation Controls", tone: "success", items: ["Approve", "Request changes", "Reject with reason"] },
      { title: "Audit Trail", items: ["Reviewer identity", "Decision timestamp", "Evidence link"] },
    ],
    actions: ["Approve Selected", "Request Correction", "Export Audit"],
  },
  a3: {
    app: "Admin Console",
    section: "Capacity",
    title: "Supply-Demand Planner",
    subtitle: "Forecast demand and close coverage gaps",
    nav: ["Forecast", "Gaps", "Interventions", "Results"],
    metrics: [
      { label: "Demand Spike", value: "6-10 PM", meta: "Mental health surge" },
      { label: "Gap Count", value: "2 Regions", meta: "Urgent-care shortfall" },
      { label: "Mitigation", value: "Active", meta: "Standby providers pinged" },
    ],
    left: [
      { title: "Forecast Engine", tone: "info", items: ["Hourly demand", "Specialty heatmap", "Regional projection"] },
      { title: "Risk Signals", tone: "warning", items: ["SLA breach probability", "Queue growth", "At-risk segments"] },
    ],
    right: [
      { title: "Intervention Tools", tone: "success", items: ["Shift boost", "Incentive trigger", "Overflow routing"] },
      { title: "Impact Tracking", items: ["Wait-time recovery", "Coverage gain", "Utilization change"] },
    ],
    actions: ["Trigger Boost", "Enable Overflow", "Review Impact"],
  },
  a4: {
    app: "Admin Console",
    section: "Finance Ops",
    title: "Revenue and Settlements",
    subtitle: "Payout cycles and exception management",
    nav: ["Revenue", "Payouts", "Exceptions", "Recon"],
    metrics: [
      { label: "Revenue", value: "$12,450", meta: "Today" },
      { label: "Payout Batch", value: "47 Providers", meta: "Friday run" },
      { label: "Exceptions", value: "3", meta: "Needs manual action" },
    ],
    left: [
      { title: "Revenue Streams", tone: "success", items: ["Cash-pay", "Insurance", "Subscriptions + fees"] },
      { title: "Exception Tray", tone: "warning", items: ["Failed payout", "Chargeback", "Refund hold"] },
    ],
    right: [
      { title: "Settlement Controls", tone: "info", items: ["Batch validation", "Approval workflow", "Provider statements"] },
      { title: "Reconciliation", items: ["Ledger sync", "Anomaly detection", "Audit export"] },
    ],
    actions: ["Approve Batch", "Resolve Exceptions", "Download Finance"],
  },
  a5: {
    app: "Admin Console",
    section: "Compliance",
    title: "Governance and Audit Center",
    subtitle: "PHI access review and policy enforcement",
    nav: ["Audit Logs", "Violations", "Policies", "Evidence"],
    metrics: [
      { label: "PHI Events", value: "1,248", meta: "Today" },
      { label: "Violations", value: "1 High", meta: "Pending investigation" },
      { label: "Compliance Score", value: "96/100", meta: "Weekly benchmark" },
    ],
    left: [
      { title: "Audit Timeline", tone: "info", items: ["Record access trail", "User and IP metadata", "Filter by event type"] },
      { title: "Policy Exceptions", tone: "warning", items: ["Unauthorized export", "Access window violation", "Owner assignment"] },
    ],
    right: [
      { title: "Evidence Vault", tone: "success", items: ["Immutable snapshots", "Signed review notes", "Regulator-ready pack"] },
      { title: "Response Workflow", items: ["Containment checklist", "Notification timeline", "Post-incident plan"] },
    ],
    actions: ["Open Investigation", "Assign Remediation", "Generate Audit Pack"],
  },
  a6: {
    app: "Admin Console",
    section: "Security",
    title: "Incident Response Room",
    subtitle: "Containment and stakeholder communication",
    nav: ["Incident", "Containment", "Comms", "Postmortem"],
    metrics: [
      { label: "Severity", value: "High", meta: "Potential token misuse" },
      { label: "Containment", value: "Active", meta: "Session revoke complete" },
      { label: "Resolution ETA", value: "35 Min", meta: "Target" },
    ],
    left: [
      { title: "Incident Timeline", tone: "warning", items: ["Detection event", "Escalation", "Containment actions"] },
      { title: "Controls", tone: "success", items: ["Token revocation", "Forced logout", "Key rotation"] },
    ],
    right: [
      { title: "Stakeholder Comms", tone: "info", items: ["Security team", "Compliance/legal", "Leadership brief"] },
      { title: "Forensics", items: ["Evidence snapshot", "Access graph", "Root-cause draft"] },
    ],
    actions: ["Execute Playbook", "Notify Stakeholders", "Open Postmortem"],
  },
  a7: {
    app: "Admin Console",
    section: "Strategy",
    title: "Growth and Executive Reporting",
    subtitle: "Campaign outcomes, SLO watch, board-level insights",
    nav: ["Campaigns", "SLOs", "Forecast", "Board Deck"],
    metrics: [
      { label: "Campaign CTR", value: "18%", meta: "Reactivation run" },
      { label: "SLO Status", value: "1 Warning", meta: "Regional latency" },
      { label: "MRR", value: "$540K", meta: "Month to date" },
    ],
    left: [
      { title: "Growth Studio", tone: "info", items: ["Segment targeting", "Channel orchestration", "Attribution"] },
      { title: "Reliability Board", tone: "warning", items: ["Latency hotspot", "Error budget", "Mitigation progress"] },
    ],
    right: [
      { title: "Executive Deck", tone: "success", items: ["MRR and retention", "Clinical quality", "Compliance outcomes"] },
      { title: "Action Register", items: ["Owner initiatives", "Quarter targets", "What-if planning"] },
    ],
    actions: ["Launch Campaign", "Apply Mitigation", "Export Board Pack"],
  },
};

export function ScreenPreview({ persona, stepId }: { persona: Persona; stepId: string }) {
  const config =
    persona === "patient"
      ? PATIENT[stepId]
      : persona === "provider"
        ? PROVIDER[stepId]
        : ADMIN[stepId];

  if (!config) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
        Screen configuration not found.
      </div>
    );
  }

  const accent =
    persona === "patient"
      ? "from-cyan-600 to-teal-600"
      : persona === "provider"
        ? "from-indigo-600 to-sky-600"
        : "from-emerald-600 to-lime-600";

  return <AppFrame accent={accent} config={config} />;
}
