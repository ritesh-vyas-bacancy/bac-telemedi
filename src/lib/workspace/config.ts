export type Persona = "patient" | "provider" | "admin";

export type ModuleDefinition = {
  slug: string;
  title: string;
  summary: string;
  checklist: string[];
  systemReadouts: string[];
  primaryActions: string[];
};

export type PersonaDefinition = {
  id: Persona;
  label: string;
  subtitle: string;
  accent: string;
  modules: ModuleDefinition[];
};

const PATIENT_MODULES: ModuleDefinition[] = [
  {
    slug: "onboarding",
    title: "Onboarding and Consent",
    summary: "Identity verification, profile setup, and legal consent capture.",
    checklist: [
      "Account verified with email and phone OTP",
      "HIPAA and telehealth consent accepted",
      "Insurance profile added or cash-pay selected",
    ],
    systemReadouts: [
      "Profile completion: 42%",
      "Consent version captured: v2.1",
      "Risk scan: low",
    ],
    primaryActions: ["Complete Profile", "Review Consent", "Continue to Triage"],
  },
  {
    slug: "triage",
    title: "Symptom Triage",
    summary: "Adaptive symptom flow that routes patient to appropriate urgency and specialty.",
    checklist: [
      "Symptom onset and severity submitted",
      "Red-flag safety prompts completed",
      "Clinical context attached (medications/allergies)",
    ],
    systemReadouts: ["Triage score: moderate", "Route recommendation: same day", "Emergency flag: no"],
    primaryActions: ["Edit Symptoms", "Attach Reports", "View Provider Matches"],
  },
  {
    slug: "discovery",
    title: "Provider Discovery",
    summary: "Marketplace comparison by availability, pricing, language, and trust signals.",
    checklist: [
      "Provider shortlist created",
      "Price and slot transparency reviewed",
      "Preferred provider selected",
    ],
    systemReadouts: [
      "Matched providers: 16",
      "Earliest slot: 15 min",
      "Coverage compatible providers: 9",
    ],
    primaryActions: ["Compare Providers", "Save Favorite", "Proceed to Booking"],
  },
  {
    slug: "booking",
    title: "Booking and Checkout",
    summary: "Slot lock with pricing breakdown and secure payment confirmation.",
    checklist: [
      "Appointment slot selected",
      "Cost breakdown acknowledged",
      "Payment method validated",
    ],
    systemReadouts: ["Slot lock timer: 1:47", "Amount due: $21.17", "Receipt state: pending"],
    primaryActions: ["Confirm and Pay", "Change Slot", "Cancel Booking"],
  },
  {
    slug: "waiting-room",
    title: "Virtual Waiting Room",
    summary: "Pre-consult diagnostics, readiness checklist, and countdown monitoring.",
    checklist: [
      "Camera/mic test passed",
      "Pre-visit checklist completed",
      "Join signal enabled",
    ],
    systemReadouts: ["Session starts in: 02:45", "Connection quality: excellent", "Queue position: next"],
    primaryActions: ["Join Session", "Retest Device", "Contact Support"],
  },
  {
    slug: "consultation",
    title: "Live Consultation",
    summary: "Video session with secure chat, artifact sharing, and care-plan discussion.",
    checklist: [
      "Clinical interview completed",
      "Required data shared during call",
      "Treatment intent agreed",
    ],
    systemReadouts: ["Call quality: HD stable", "Duration: 18:22", "Audit events: recording"],
    primaryActions: ["Send Message", "Review Draft Plan", "End Consultation"],
  },
  {
    slug: "continuity",
    title: "Post-Visit Continuity",
    summary: "Prescription tracking, diagnostic orders, follow-up loop, and retention signals.",
    checklist: [
      "Prescription routed to pharmacy",
      "Orders and instructions delivered",
      "Follow-up reminder scheduled",
    ],
    systemReadouts: ["Prescription status: sent", "Orders active: 1", "Follow-up window: 7 days"],
    primaryActions: ["View Summary", "Book Follow-up", "Message Provider"],
  },
];

const PROVIDER_MODULES: ModuleDefinition[] = [
  {
    slug: "activation",
    title: "Credentialing Activation",
    summary: "Licensure, profile, compliance checks, and go-live readiness.",
    checklist: [
      "Credential documents submitted",
      "Profile and fee settings configured",
      "2FA and policy acceptance complete",
    ],
    systemReadouts: ["Readiness: 86%", "Verification checks: 5/6", "Status: pending approval"],
    primaryActions: ["Upload Missing Doc", "Submit for Approval", "Preview Profile"],
  },
  {
    slug: "dashboard",
    title: "Daily Command Center",
    summary: "Today's schedule, queue states, and urgent provider tasks.",
    checklist: [
      "Queue triaged by urgency",
      "Pending notes and messages reviewed",
      "Next consult selected",
    ],
    systemReadouts: ["Appointments today: 8", "Avg session: 21 min", "Unread messages: 5"],
    primaryActions: ["Start Consult", "Open Queue", "Open Analytics"],
  },
  {
    slug: "snapshot",
    title: "Clinical Snapshot",
    summary: "Patient chart pre-read with history, meds, allergies, and vitals trend.",
    checklist: [
      "Chart history reviewed",
      "Safety alerts acknowledged",
      "SOAP template initialized",
    ],
    systemReadouts: ["Last visit: 3 months", "Risk alerts: 1 high", "Vitals trend: stable"],
    primaryActions: ["Pin Safety Alert", "Open Prior Note", "Join Consultation"],
  },
  {
    slug: "consultation",
    title: "Consultation Suite",
    summary: "Unified workspace for video, documentation, chat, and quick clinical actions.",
    checklist: [
      "SOAP capture in progress",
      "In-call tools available",
      "Treatment plan draft prepared",
    ],
    systemReadouts: ["Autosave: every 30s", "Call telemetry: healthy", "Coding assistant: active"],
    primaryActions: ["Create Orders", "Send Rx", "End Visit"],
  },
  {
    slug: "documentation",
    title: "Documentation and Coding",
    summary: "Encounter validation, ICD/CPT selection, and final sign-off workflow.",
    checklist: [
      "Documentation completeness checked",
      "Coding mapped to note",
      "Digital signature captured",
    ],
    systemReadouts: ["Validation issues: 1", "Coding state: prefilled", "Lock state: pending sign"],
    primaryActions: ["Resolve Validation", "Sign Encounter", "Send to Billing"],
  },
  {
    slug: "treatment",
    title: "Prescription and Orders",
    summary: "Medication routing, safety checks, diagnostics ordering, and notifications.",
    checklist: [
      "Medication instructions set",
      "Allergy/interaction checks passed",
      "Lab/referral orders generated",
    ],
    systemReadouts: ["Prescription: ready", "Safety checks: clean", "Orders: 1 active"],
    primaryActions: ["Transmit Rx", "Add Lab Order", "Notify Patient"],
  },
  {
    slug: "continuity",
    title: "Claims and Follow-up Hub",
    summary: "Claim queue, patient inbox, refill actions, and provider KPI trend.",
    checklist: [
      "Claim packet submitted",
      "Follow-up inbox triaged",
      "Weekly KPI review complete",
    ],
    systemReadouts: ["Claims submitted: 7", "Inbox SLA: healthy", "CSAT: 4.8/5"],
    primaryActions: ["Approve Claim", "Reply Inbox", "Review Performance"],
  },
];

const ADMIN_MODULES: ModuleDefinition[] = [
  {
    slug: "pulse",
    title: "Marketplace Pulse",
    summary: "Real-time operations wall for sessions, wait-time, and critical alerts.",
    checklist: [
      "Live KPI stream monitored",
      "Critical alerts prioritized",
      "Immediate actions assigned",
    ],
    systemReadouts: ["Active sessions: 23", "Avg wait: 4.2 min", "Critical alerts: 3"],
    primaryActions: ["Open Alerts", "Assign Owner", "Escalate Incident"],
  },
  {
    slug: "verification",
    title: "Provider Verification Queue",
    summary: "Credentialing decisions with policy checks and full auditability.",
    checklist: [
      "Applicant documents reviewed",
      "Compliance checks executed",
      "Approval decision recorded",
    ],
    systemReadouts: ["Pending applicants: 12", "Ready to approve: 5", "Blocked: 3"],
    primaryActions: ["Approve Selected", "Request Corrections", "Export Audit"],
  },
  {
    slug: "capacity",
    title: "Supply-Demand Planner",
    summary: "Forecast demand spikes and trigger interventions to protect SLA.",
    checklist: [
      "Gap windows identified",
      "Intervention strategy selected",
      "Impact tracking enabled",
    ],
    systemReadouts: ["Demand spike: 6-10 PM", "Gap regions: 2", "Mitigation: active"],
    primaryActions: ["Trigger Boost", "Enable Overflow", "Review Impact"],
  },
  {
    slug: "finance",
    title: "Revenue and Settlements",
    summary: "Payout batch control, financial exceptions, and reconciliation.",
    checklist: [
      "Revenue streams reconciled",
      "Exception queue resolved",
      "Settlement batch approved",
    ],
    systemReadouts: ["Today revenue: $12,450", "Payout batch: 47 providers", "Exceptions: 3"],
    primaryActions: ["Approve Batch", "Resolve Exceptions", "Download Report"],
  },
  {
    slug: "governance",
    title: "Governance and Audit",
    summary: "PHI access timeline, policy violation review, and evidence vault generation.",
    checklist: [
      "Audit events filtered and reviewed",
      "Violations assigned to owner",
      "Evidence package generated",
    ],
    systemReadouts: ["PHI events: 1,248", "Violations: 1 high", "Compliance score: 96/100"],
    primaryActions: ["Open Investigation", "Assign Remediation", "Generate Audit Pack"],
  },
  {
    slug: "incident",
    title: "Incident Response Room",
    summary: "Security containment, stakeholder communication, and forensic timeline.",
    checklist: [
      "Incident severity declared",
      "Containment controls executed",
      "Postmortem draft created",
    ],
    systemReadouts: ["Severity: high", "Containment: active", "Resolution ETA: 35 min"],
    primaryActions: ["Execute Playbook", "Notify Stakeholders", "Open Postmortem"],
  },
  {
    slug: "strategy",
    title: "Growth and Executive Reporting",
    summary: "Campaign outcomes, SLO trend, and board-level strategic dashboard.",
    checklist: [
      "Campaign performance reviewed",
      "SLO warning actions applied",
      "Executive deck exported",
    ],
    systemReadouts: ["Campaign CTR: 18%", "SLO warning: 1", "MRR: $540K"],
    primaryActions: ["Launch Campaign", "Apply Mitigation", "Export Board Pack"],
  },
];

export const WORKSPACE_CONFIG: Record<Persona, PersonaDefinition> = {
  patient: {
    id: "patient",
    label: "Patient Workspace",
    subtitle: "From onboarding to care continuity",
    accent: "from-cyan-600 to-teal-600",
    modules: PATIENT_MODULES,
  },
  provider: {
    id: "provider",
    label: "Provider Workspace",
    subtitle: "From activation to claims and continuity",
    accent: "from-indigo-600 to-sky-600",
    modules: PROVIDER_MODULES,
  },
  admin: {
    id: "admin",
    label: "Admin Workspace",
    subtitle: "Operations, compliance, and strategy control",
    accent: "from-emerald-600 to-lime-600",
    modules: ADMIN_MODULES,
  },
};

export const PERSONAS: Persona[] = ["patient", "provider", "admin"];

export function getPersonaConfig(persona: string) {
  return WORKSPACE_CONFIG[persona as Persona] ?? null;
}

export function getModuleConfig(persona: string, module: string) {
  const personaConfig = getPersonaConfig(persona);
  if (!personaConfig) return null;
  return personaConfig.modules.find((item) => item.slug === module) ?? null;
}
