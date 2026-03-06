# Telemedicine Product Roadmap and Sprint Plan

## Current status snapshot (March 6, 2026)

| Phase | Status in this build | Notes |
|---|---|---|
| Phase A: Clinical Core | Implemented baseline | Consultation lifecycle, SOAP notes, care orders, Rx issuing, note signing |
| Phase B: Commerce and Engagement | Implemented foundation | Billing + claims + notification event engine wired in live flows |
| Phase C: Admin and Compliance Hardening | Implemented foundation | Compliance events, incidents, and role-permission matrix live for admin |
| Phase D: Production Readiness | In progress | Lint/build gates, smoke script, customer docs updated |

## Planning assumptions

- Sprint length: 2 weeks
- Team model: 1 full-stack engineer, 1 frontend engineer, 1 QA engineer
- Priority order: clinical reliability -> monetization -> compliance -> scale

## Phase A: Clinical Core (Delivered baseline)

Goal: Full consultation workflow for day-to-day clinical execution.

| Sprint | Objective | Scope | Deliverables | Exit criteria |
|---|---|---|---|---|
| A1 | Consultation lifecycle | Session state machine (`scheduled` -> `checked_in` -> `ready` -> `in_consult` -> `completed`) | Consultation dashboard controls | Provider can run end-to-end consultation lifecycle |
| A2 | Clinical documentation | SOAP notes save/sign, encounter timeline | `encounter_notes` workflow in provider panel | Signed notes lock completed consultation |
| A3 | Orders and prescriptions | Prescription issue + care orders | Rx + care order creation and patient visibility | Patient receives provider-issued plan in app |

## Phase B: Commerce and Engagement

Goal: Add monetization and engagement workflows.

| Sprint | Objective | Scope | Deliverables | Exit criteria |
|---|---|---|---|---|
| B1 | Payments foundation | Invoice model, payment simulation, admin billing view | `billing_invoices` table + patient/admin UI | Paid/pending lifecycle verified in demo |
| B2 | Claims and settlement | Claim packet and settlement queue | Claims module and status model | Admin can process claim status pipeline |
| B3 | Engagement automation | Reminder and follow-up automation | Notification service with templates | Scheduled reminders trigger reliably |

## Phase C: Admin and Compliance Hardening

Goal: Strengthen governance and operational controls.

| Sprint | Objective | Scope | Deliverables | Exit criteria |
|---|---|---|---|---|
| C1 | Compliance controls | PHI access monitoring and exception queues | Compliance dashboard | High-risk access becomes traceable |
| C2 | Incident response | Security timeline and escalation workflows | Incident workspace + runbooks | Mock incident run completed under SLA |
| C3 | Access governance | Permission matrix and privileged action controls | Policy management UI + logs | Internal permission audit passes |

## Phase D: Production Readiness and Launch

Goal: Achieve launch-grade reliability and operational readiness.

| Sprint | Objective | Scope | Deliverables | Exit criteria |
|---|---|---|---|---|
| D1 | Quality and regression | Authenticated smoke automation + regression packs | QA scripts and CI gates | Critical journey pass rate >95% |
| D2 | Performance and reliability | Query/index tuning, load profile, caching strategy | Performance benchmark report | Target latency and throughput met |
| D3 | Observability and release | Dashboards, alerts, backup/restore, release checklists | Production runbook and launch checklist | Go-live sign-off complete |

## Governance cadence

- Weekly: sprint health and blockers
- Bi-weekly: stakeholder demo and acceptance
- Monthly: KPI review (conversion, consultation completion, provider productivity, SLA)

## Major risks and mitigation

| Risk | Impact | Mitigation |
|---|---|---|
| Network/media reliability variance | Consultation drop-offs | Reconnection + fallback strategy |
| Compliance requirement changes | Rework and delay | Policy-as-code + compliance checkpoints |
| Payment/claims complexity | Delayed monetization | Adapter-based staged integrations |
| Scope creep | Delivery slippage | Strict sprint gate and change control |

## Release recommendation

- Keep a stable demo branch and phase-delivery branch strategy
- Release each phase to staging with acceptance demos
- Promote to production after Phase D exit criteria are complete
