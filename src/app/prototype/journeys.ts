export type Persona = "patient" | "provider" | "admin";

export type StepState = "info" | "success" | "warning";

export type JourneyStep = {
  id: string;
  stage: string;
  title: string;
  screen: string;
  goal: string;
  highlights: Array<{
    label: string;
    detail: string;
    state: StepState;
  }>;
  actions: string[];
  events: string[];
  done: string[];
};

export const PERSONA_META: Record<
  Persona,
  { label: string; subtitle: string; badge: string; tone: string }
> = {
  patient: {
    label: "Patient Journey",
    subtitle: "Symptom to treatment to follow-up",
    badge: "P",
    tone: "from-cyan-500 to-teal-500",
  },
  provider: {
    label: "Provider Journey",
    subtitle: "Consultation workflow and closure",
    badge: "D",
    tone: "from-indigo-500 to-sky-500",
  },
  admin: {
    label: "Admin Journey",
    subtitle: "Marketplace, compliance, and reliability",
    badge: "A",
    tone: "from-emerald-500 to-lime-500",
  },
};

const patient: JourneyStep[] = [
  {
    id: "p1",
    stage: "Step 1",
    title: "Onboarding and Consent",
    screen: "Welcome Gate",
    goal: "Patient creates account and completes legal consent before clinical actions.",
    highlights: [
      {
        label: "Identity",
        detail: "Email/phone verification and profile basics",
        state: "info",
      },
      {
        label: "Consent",
        detail: "HIPAA, telehealth policy, and terms accepted",
        state: "warning",
      },
      {
        label: "Coverage",
        detail: "Insurance card upload or cash-pay mode",
        state: "success",
      },
    ],
    actions: ["Create account", "Verify OTP", "Accept consent bundle", "Set reminders"],
    events: [
      "Consent versions saved with timestamp",
      "Profile completeness score initialized",
      "Risk and fraud checks executed",
    ],
    done: ["Verified identity", "Mandatory consent captured", "Discovery unlocked"],
  },
  {
    id: "p2",
    stage: "Step 2",
    title: "Symptom Intake and Triage",
    screen: "Smart Intake",
    goal: "Collect symptom severity and route patient to urgent, same-day, or routine care.",
    highlights: [
      {
        label: "Timeline",
        detail: "Onset, severity, and impact questionnaire",
        state: "info",
      },
      {
        label: "Red Flags",
        detail: "Emergency prompts for critical symptoms",
        state: "warning",
      },
      {
        label: "Route",
        detail: "Specialty and urgency recommendation",
        state: "success",
      },
    ],
    actions: ["Answer triage prompts", "Add meds/allergies", "Upload prior reports"],
    events: [
      "Priority score calculated",
      "Provider search pre-filtered",
      "Emergency advisory shown if needed",
    ],
    done: ["Triage complete", "Route selected", "Provider results ready"],
  },
  {
    id: "p3",
    stage: "Step 3",
    title: "Provider Discovery and Compare",
    screen: "Marketplace Explorer",
    goal: "Patient compares providers with transparent pricing and next available slots.",
    highlights: [
      {
        label: "Provider Cards",
        detail: "Rating, fee, language, and earliest slot",
        state: "info",
      },
      {
        label: "Filters",
        detail: "Specialty, gender, insurance, and wait-time",
        state: "info",
      },
      {
        label: "Trust Signals",
        detail: "Verified license and credential badges",
        state: "success",
      },
    ],
    actions: ["Search and filter", "Compare top options", "Select provider profile"],
    events: [
      "Ranking refreshes on each filter change",
      "Availability sync updates every few seconds",
      "Recommendation model captures intent",
    ],
    done: ["Provider chosen", "Intent confirmed", "Booking started"],
  },
  {
    id: "p4",
    stage: "Step 4",
    title: "Slot Booking and Payment",
    screen: "Checkout Scheduler",
    goal: "Patient locks a slot, reviews cost breakdown, and confirms payment.",
    highlights: [
      {
        label: "Calendar",
        detail: "Live slots with timezone-safe display",
        state: "info",
      },
      {
        label: "Cost Summary",
        detail: "Consult fee, copay estimate, taxes/fees",
        state: "warning",
      },
      {
        label: "Payment",
        detail: "Card, wallet, HSA/FSA, or insurance flow",
        state: "success",
      },
    ],
    actions: ["Pick slot", "Confirm policy", "Complete checkout"],
    events: [
      "Temporary lock prevents double booking",
      "Payment intent confirmed",
      "Reminders queued for 24h, 2h, 15m",
    ],
    done: ["Appointment booked", "Receipt generated", "Waiting room enabled"],
  },
  {
    id: "p5",
    stage: "Step 5",
    title: "Virtual Waiting Room",
    screen: "Pre-Visit Readiness",
    goal: "Reduce consult friction with diagnostics and prep checklist.",
    highlights: [
      {
        label: "Device Check",
        detail: "Camera, mic, speaker, and network quality",
        state: "info",
      },
      {
        label: "Checklist",
        detail: "ID, medication list, questions for provider",
        state: "warning",
      },
      {
        label: "Countdown",
        detail: "Live provider join status and timer",
        state: "success",
      },
    ],
    actions: ["Run test", "Complete checklist", "Join session"],
    events: [
      "Tech issue warnings raised early",
      "Patient readiness status published",
      "Session token generated securely",
    ],
    done: ["Ready marked", "Session started", "Consult timeline running"],
  },
  {
    id: "p6",
    stage: "Step 6",
    title: "Consultation and Clinical Plan",
    screen: "Live Video Visit",
    goal: "Patient completes video visit and confirms treatment plan.",
    highlights: [
      {
        label: "Video Stage",
        detail: "Adaptive stream and in-call chat",
        state: "info",
      },
      {
        label: "Shared Content",
        detail: "Patient can upload photos/files during call",
        state: "info",
      },
      {
        label: "Plan Draft",
        detail: "Diagnosis and next steps summarized",
        state: "success",
      },
    ],
    actions: ["Discuss symptoms", "Share files", "Confirm pharmacy and follow-up"],
    events: [
      "Clinical events logged for audit",
      "Provider documentation auto-saved",
      "Prescription checks executed",
    ],
    done: ["Visit completed", "Plan approved", "Post-visit actions prepared"],
  },
  {
    id: "p7",
    stage: "Step 7",
    title: "Prescription, Labs, Follow-up",
    screen: "Care Continuity",
    goal: "Patient receives orders, tracks medications, and schedules follow-up from one timeline.",
    highlights: [
      {
        label: "Prescription",
        detail: "Dose instructions and pharmacy status tracking",
        state: "success",
      },
      {
        label: "Orders",
        detail: "Labs/imaging tasks with prep instructions",
        state: "info",
      },
      {
        label: "Follow-up Loop",
        detail: "Secure messaging and one-click rebook",
        state: "warning",
      },
    ],
    actions: ["Review visit summary", "Complete tasks", "Book follow-up if needed"],
    events: [
      "Outcome reminders triggered",
      "Adherence nudges personalized",
      "NPS request sent after resolution window",
    ],
    done: ["Orders acknowledged", "Plan accepted", "Journey closed"],
  },
];

const provider: JourneyStep[] = [
  {
    id: "d1",
    stage: "Step 1",
    title: "Credentialing Onboarding",
    screen: "Provider Activation",
    goal: "Collect licenses, credentials, and compliance proofs before go-live.",
    highlights: [
      {
        label: "License Pack",
        detail: "State license, NPI, DEA, malpractice documents",
        state: "warning",
      },
      {
        label: "Profile Setup",
        detail: "Bio, specialty, fees, languages, consultation modes",
        state: "info",
      },
      {
        label: "Readiness",
        detail: "Compliance checklist with completion score",
        state: "success",
      },
    ],
    actions: ["Upload documents", "Complete profile", "Set weekly availability"],
    events: [
      "Verification queue entry created",
      "Missing fields auto-flagged",
      "Provider status: pending approval",
    ],
    done: ["Docs submitted", "Profile complete", "Awaiting admin review"],
  },
  {
    id: "d2",
    stage: "Step 2",
    title: "Daily Command Center",
    screen: "Provider Dashboard",
    goal: "Provider sees today's schedule, queue health, and urgent tasks in one workspace.",
    highlights: [
      {
        label: "Schedule Rail",
        detail: "Upcoming visits with live status badges",
        state: "info",
      },
      {
        label: "Task Stack",
        detail: "Unread messages, pending notes, refill tasks",
        state: "warning",
      },
      {
        label: "Performance Tile",
        detail: "Visits today, earnings, avg consult time",
        state: "success",
      },
    ],
    actions: ["Review queue", "Open patient context", "Start consultation"],
    events: [
      "Late/no-show risk shown in real time",
      "Patient summary preloaded automatically",
      "Quick action recommendations generated",
    ],
    done: ["Visit selected", "Context ready", "Consult suite open"],
  },
  {
    id: "d3",
    stage: "Step 3",
    title: "Pre-Consult Chart Review",
    screen: "Clinical Snapshot",
    goal: "Review history, meds, allergies, and prior notes before patient join.",
    highlights: [
      {
        label: "History",
        detail: "Problem list, prior consults, chronic conditions",
        state: "info",
      },
      {
        label: "Safety Banner",
        detail: "Allergy and contraindication alerts",
        state: "warning",
      },
      {
        label: "Vitals Trend",
        detail: "Recent clinical markers and fluctuations",
        state: "success",
      },
    ],
    actions: ["Check previous notes", "Pin safety alerts", "Prime SOAP template"],
    events: [
      "Suggested note template loaded",
      "Potential ICD/CPT hints prepared",
      "Risk indicators highlighted",
    ],
    done: ["Snapshot reviewed", "Template ready", "Patient joined"],
  },
  {
    id: "d4",
    stage: "Step 4",
    title: "Consultation Workspace",
    screen: "Live Care Suite",
    goal: "Run visit with video, documentation, and in-call orders without context switching.",
    highlights: [
      {
        label: "Video Stage",
        detail: "Patient focus view + provider PIP",
        state: "info",
      },
      {
        label: "SOAP Dock",
        detail: "Voice dictation + autosave every 30 sec",
        state: "success",
      },
      {
        label: "In-call Toolkit",
        detail: "Chat, files, location request, quick actions",
        state: "warning",
      },
    ],
    actions: ["Conduct assessment", "Record findings", "Define treatment intent"],
    events: [
      "Stream quality monitored continuously",
      "Clinical log trail captured",
      "Coding suggestions update in real time",
    ],
    done: ["Consult ended", "Draft note complete", "Treatment ready"],
  },
  {
    id: "d5",
    stage: "Step 5",
    title: "Documentation and Coding",
    screen: "Encounter Finalization",
    goal: "Finalize note, validate coding, and lock encounter for billing.",
    highlights: [
      {
        label: "Coding Assistant",
        detail: "ICD/CPT suggestions mapped to SOAP content",
        state: "info",
      },
      {
        label: "Validation Engine",
        detail: "Missing fields and modifier gaps flagged",
        state: "warning",
      },
      {
        label: "Signature Control",
        detail: "Provider sign-off and immutable lock",
        state: "success",
      },
    ],
    actions: ["Review suggestions", "Fix validation errors", "Sign encounter note"],
    events: [
      "Claim payload pre-assembled",
      "Note lock timer enforced",
      "Audit signature event stored",
    ],
    done: ["Note signed", "Coding complete", "Billing packet ready"],
  },
  {
    id: "d6",
    stage: "Step 6",
    title: "Prescription and Orders",
    screen: "Treatment Fulfillment",
    goal: "Transmit eRx and diagnostics with safety checks and patient confirmation.",
    highlights: [
      {
        label: "Medication Builder",
        detail: "Dose, frequency, refills, and formulary checks",
        state: "info",
      },
      {
        label: "Safety Checks",
        detail: "Interaction, allergy, duplicate therapy warnings",
        state: "warning",
      },
      {
        label: "Order Queue",
        detail: "Lab/referral orders with trackable status",
        state: "success",
      },
    ],
    actions: ["Select pharmacy", "Send prescription", "Create lab/referral orders"],
    events: [
      "Prescription status tracking activated",
      "Patient notification dispatched",
      "Post-visit tasks synced to patient timeline",
    ],
    done: ["Treatment transmitted", "Patient informed", "Case closure enabled"],
  },
  {
    id: "d7",
    stage: "Step 7",
    title: "Claims, Follow-up, Insights",
    screen: "Provider Continuity Panel",
    goal: "Submit billing, handle follow-up inbox, and review provider performance.",
    highlights: [
      {
        label: "Claim Queue",
        detail: "Submission status and denial guard insights",
        state: "warning",
      },
      {
        label: "Care Inbox",
        detail: "Patient follow-up messages and refill requests",
        state: "info",
      },
      {
        label: "KPI Board",
        detail: "CSAT, response SLA, utilization, and earnings",
        state: "success",
      },
    ],
    actions: ["Approve claim", "Triage follow-up", "Review weekly performance"],
    events: [
      "Settlement estimates generated",
      "SLA reminders on pending threads",
      "Benchmark insights against peer cohort",
    ],
    done: ["Claim submitted", "Inbox healthy", "Provider loop complete"],
  },
];

const admin: JourneyStep[] = [
  {
    id: "a1",
    stage: "Step 1",
    title: "Marketplace Pulse",
    screen: "Ops Overview",
    goal: "Track live sessions, wait-time trends, and high-priority alerts.",
    highlights: [
      {
        label: "Live KPI Wall",
        detail: "Active calls, average wait, booking conversion",
        state: "info",
      },
      {
        label: "Alert Queue",
        detail: "Clinical, operational, and security alerts",
        state: "warning",
      },
      {
        label: "Service Health",
        detail: "Core service uptime and error rate snapshot",
        state: "success",
      },
    ],
    actions: ["Review incidents", "Prioritize operations", "Assign owners"],
    events: [
      "KPI refresh every 15 seconds",
      "Alert severity ranking applied",
      "Escalation rules activated",
    ],
    done: ["Ops picture clear", "Priorities assigned", "Action queue started"],
  },
  {
    id: "a2",
    stage: "Step 2",
    title: "Provider Verification Queue",
    screen: "Credentialing Review",
    goal: "Approve providers safely and quickly to maintain network quality.",
    highlights: [
      {
        label: "Applicant Pipeline",
        detail: "Pending, changes requested, approved buckets",
        state: "info",
      },
      {
        label: "Compliance Checks",
        detail: "License, malpractice, sanctions, and document validity",
        state: "warning",
      },
      {
        label: "Activation Controls",
        detail: "Approve/reject with auditable reason",
        state: "success",
      },
    ],
    actions: ["Inspect documentation", "Run verification", "Approve or request fix"],
    events: [
      "Review action logged with timestamp",
      "Applicant notified automatically",
      "Approved profile published to marketplace",
    ],
    done: ["Queue processed", "Decisions documented", "Provider quality enforced"],
  },
  {
    id: "a3",
    stage: "Step 3",
    title: "Capacity and Availability Control",
    screen: "Supply-Demand Planner",
    goal: "Prevent long waits by balancing provider supply against patient demand.",
    highlights: [
      {
        label: "Demand Forecast",
        detail: "Predicted demand by specialty and hour",
        state: "info",
      },
      {
        label: "Coverage Gaps",
        detail: "Shortfall alerts by geography and language",
        state: "warning",
      },
      {
        label: "Intervention Panel",
        detail: "Boost shifts, notify standby providers, reroute intake",
        state: "success",
      },
    ],
    actions: ["Inspect gap windows", "Trigger mitigation", "Track wait-time impact"],
    events: [
      "Forecast model updates continuously",
      "Provider outreach automations launched",
      "SLA breach risk recalculated",
    ],
    done: ["Coverage improved", "Wait-time stabilized", "SLA protected"],
  },
  {
    id: "a4",
    stage: "Step 4",
    title: "Finance and Settlements",
    screen: "Revenue Operations",
    goal: "Manage transactions, provider payouts, refunds, and exceptions.",
    highlights: [
      {
        label: "Revenue Stream",
        detail: "Cash-pay, insurance, subscription, transaction fees",
        state: "success",
      },
      {
        label: "Settlement Queue",
        detail: "Payout batches with approval controls",
        state: "info",
      },
      {
        label: "Exception Tray",
        detail: "Failed payments, chargebacks, and refund holds",
        state: "warning",
      },
    ],
    actions: ["Validate payout batch", "Resolve payment exceptions", "Export ledger"],
    events: [
      "Double-entry reconciliation run",
      "Anomaly checks on payout amounts",
      "Finance audit report generated",
    ],
    done: ["Batch approved", "Critical exceptions resolved", "Ledger closed"],
  },
  {
    id: "a5",
    stage: "Step 5",
    title: "Compliance and Audit Control",
    screen: "Governance Center",
    goal: "Inspect PHI access trails, policy breaches, and remediation progress.",
    highlights: [
      {
        label: "Audit Timeline",
        detail: "Who accessed what PHI and when",
        state: "info",
      },
      {
        label: "Violation Panel",
        detail: "Policy exceptions by severity and owner",
        state: "warning",
      },
      {
        label: "Evidence Vault",
        detail: "Export-ready records for internal or external audits",
        state: "success",
      },
    ],
    actions: ["Investigate event", "Assign remediation", "Build audit package"],
    events: [
      "Immutable log snapshots captured",
      "Breach response timers started if required",
      "Compliance score updated",
    ],
    done: ["Evidence complete", "Actions assigned", "Compliance posture improved"],
  },
  {
    id: "a6",
    stage: "Step 6",
    title: "Incident Response Room",
    screen: "Security War-Room",
    goal: "Contain incidents quickly, coordinate stakeholders, and preserve evidence.",
    highlights: [
      {
        label: "Incident Board",
        detail: "Severity, timeline, blast radius, owner",
        state: "warning",
      },
      {
        label: "Containment Controls",
        detail: "Token revoke, forced logout, key rotation",
        state: "success",
      },
      {
        label: "Communication Hub",
        detail: "Ops, legal, compliance, leadership updates",
        state: "info",
      },
    ],
    actions: ["Declare severity", "Execute playbook", "Track containment SLA"],
    events: [
      "Pager escalation auto-triggered",
      "Forensic snapshots taken",
      "RCA template prefilled",
    ],
    done: ["Incident contained", "Notifications complete", "Postmortem planned"],
  },
  {
    id: "a7",
    stage: "Step 7",
    title: "Growth, Reliability, Executive Reporting",
    screen: "Strategy Console",
    goal: "Run campaigns, monitor SLOs, and deliver leadership-level outcome reports.",
    highlights: [
      {
        label: "Campaign Studio",
        detail: "Segmented outreach with compliance filters",
        state: "info",
      },
      {
        label: "Reliability Board",
        detail: "Uptime, latency, API error budgets, mitigations",
        state: "warning",
      },
      {
        label: "Executive Deck",
        detail: "MRR, retention, quality, compliance, growth outcomes",
        state: "success",
      },
    ],
    actions: ["Launch campaign", "Mitigate reliability risk", "Export board report"],
    events: [
      "Attribution metrics update in real time",
      "SLO breach predictors refreshed",
      "Quarterly strategy actions tracked",
    ],
    done: ["Growth loop active", "SLO protected", "Leadership decisions supported"],
  },
];

export const JOURNEYS: Record<Persona, JourneyStep[]> = {
  patient,
  provider,
  admin,
};

export const PERSONAS: Persona[] = ["patient", "provider", "admin"];
