# Telemedicine MVP v2 Scope and Workflow (Customer Share)

## 1) Product objective

Deliver a demo-ready telemedicine platform that validates real operational value across three personas.
This objective is completed in the current build:
- Patient
- Provider
- Admin

This version includes secure auth, role-based workflows, appointment operations, consultation lifecycle, core clinical documentation, and operations governance modules.

## 2) Business model (current build)

### Core value
- Faster patient access to virtual consultation
- Structured provider consultation execution
- Admin-level real-time operational and billing visibility

### Revenue direction
- Consultation fee per appointment (billing simulation in this build)
- Provider enablement through clinical workflow tooling
- Operations dashboard for scale and governance

## 3) Tech stack

- Frontend:
  - Next.js 16 (App Router)
  - React 19
  - TypeScript
  - Tailwind CSS 4
- Backend/data:
  - Supabase Auth
  - Supabase Postgres
  - SQL migration-driven schema
  - RLS policies for all domain tables
- Security:
  - Role-aware route checks
  - Row ownership enforcement
  - Audit logging

## 4) Modules covered

| Persona | Module | Coverage | Status |
|---|---|---|---|
| Shared | Auth and role routing | Sign up/sign in/sign out, route protection | Live |
| Patient | Booking | Provider selection, schedule, reason, invoice seed | Live |
| Patient | Visits | Appointment timeline, check-in, invoice pay simulation, care updates | Live |
| Provider | Dashboard | Queue + consultation state transitions + readiness view | Live |
| Provider | Claims + Notifications | Claim submission and patient communication events | Live |
| Provider | Patient Panel | SOAP notes, note signing, prescription issue, care orders | Live |
| Provider | Availability | Weekly consultation slot management | Live |
| Admin | Pulse | Appointment + consultation + billing KPI snapshot | Live |
| Admin | Operations | Appointment controls, claims review, compliance + incidents, permission matrix | Live |
| Admin | Audit | Action stream and metadata trail | Live |
| Shared | High-fidelity journey prototype | Full visual walkthrough | Live (`/prototype`) |

## 5) Workflow summary

### 5.1 Authentication and onboarding

1. User signs up with role metadata.
2. Auth profile is synced into `public.profiles`.
3. Role-specific workspaces are enforced by route + RLS.

### 5.2 Booking and billing initialization

1. Patient books appointment with provider and schedule.
2. Appointment row is created as `booked`.
3. Consultation shell is initialized (`consultation_sessions`).
4. Billing invoice is generated as `pending`.
5. Audit log records booking action.

### 5.3 Consultation lifecycle

1. Patient checks in from visit center.
2. Provider sets consultation state (`ready`, `in_consult`, `completed`).
3. Appointment state synchronizes with consultation progression.
4. Admin can monitor/override in operations desk.

### 5.4 Clinical documentation

1. Provider saves SOAP note draft (`encounter_notes`).
2. Provider issues prescription (`prescriptions`).
3. Provider adds care orders (`care_orders`).
4. Provider signs note to finalize encounter.

### 5.5 Admin control and oversight

1. Pulse dashboard aggregates utilization and financial signals.
2. Operations desk exposes per-appointment controls.
3. Audit stream captures workflow trail for traceability.

## 6) Data model delivered

Base schema:
- `profiles`
- `provider_availability`
- `appointments`
- `messages`
- `prescriptions`
- `audit_logs`

Clinical-core extensions:
- `consultation_sessions`
- `encounter_notes`
- `care_orders`
- `billing_invoices`

Operations/governance extensions:
- `claim_submissions`
- `notification_events`
- `compliance_events`
- `incident_reports`
- `role_permissions`

Migration files:
- `supabase/migrations/0001_mvp_schema.sql`
- `supabase/migrations/0002_phase_a_clinical_core.sql`
- `supabase/migrations/0003_phase_bcd_foundations.sql`

## 7) Security and compliance baseline

- Role-aware app routing
- RLS per table with patient/provider/admin scoping
- Ownership checks on write actions
- Audit logs for major state transitions

## 8) Optional enterprise extensions after MVP

- Managed real-time media stack (self-hosted WebRTC/SFU beyond current embedded teleconsult room)
- Deep payment gateway and clearing-house integrations (beyond current billing/claims workflow)
- Enterprise SRE stack (advanced observability, DR exercises, automated incident response)

## 9) Demo value summary

This build is suitable for business demo and customer walkthrough:
- Complete role journeys are functional
- Clinical flow is no longer superficial (notes + Rx + orders + lifecycle)
- Data and security foundation are extensible for full production roadmap
