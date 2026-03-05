# Telemedicine MVP Scope and Workflow (Customer Share)

## 1) MVP objective

Deliver a functional telemedicine MVP that proves core platform viability across three roles:
- Patient
- Provider
- Admin

This MVP demonstrates secure access, role-based workflows, and live appointment operations.

## 2) Business model (MVP-level)

### Core value
- Faster patient access to virtual consultation
- Efficient provider queue management
- Real-time operations visibility for admin team

### Commercial model direction
- Consultation-based revenue (per appointment)
- Provider-side service enablement (workflow tooling)
- Operational reporting foundation for scaling

### MVP business outcomes validated
- A patient can discover provider availability context and book appointments.
- A provider can manage queue and update encounter state.
- An admin can monitor top-level system pulse.

## 3) Tech stack

- Frontend:
  - Next.js 16 (App Router)
  - React 19
  - TypeScript
  - Tailwind CSS 4
- Backend and data:
  - Supabase Auth
  - Supabase Postgres
  - Row Level Security (RLS)
  - SQL migration-driven schema
- Security model:
  - Role-based route protection
  - Row-level policies by user role and ownership

## 4) MVP modules covered

| User | Module | Coverage in MVP | Notes |
|---|---|---|---|
| Shared | Authentication (Sign up / Sign in / Sign out) | Live | Supabase Auth integration with role metadata |
| Shared | Role-based route protection | Live | Patient/provider/admin path guarding |
| Patient | Booking and checkout foundation | Live | Select provider, choose schedule, book appointment |
| Patient | Appointment visibility | Live | Upcoming appointments list shown |
| Provider | Daily queue dashboard | Live | Queue read from appointments table |
| Provider | Queue status update | Live | Update to in-progress/completed/cancelled |
| Admin | Marketplace pulse dashboard | Live | Aggregate counts and status distribution |
| Shared | Multi-screen journey visualization | Prototype | Full UX journey available under `/prototype` |

## 5) Module workflows (flow-level)

## 5.1 Authentication and role onboarding

1. User signs up with email, password, name, role.
2. Auth user is created in Supabase.
3. Profile is created/synced in `public.profiles`.
4. Route access is controlled by role:
   - `/workspace/patient/*`
   - `/workspace/provider/*`
   - `/workspace/admin/*`

## 5.2 Patient booking workflow

1. Patient enters booking screen.
2. Providers are loaded from `profiles` where role=`provider`.
3. Patient submits provider + schedule + reason.
4. New row inserted into `appointments` with status=`booked`.
5. Audit log entry is created.
6. Appointment appears in patient’s upcoming list.

## 5.3 Provider queue workflow

1. Provider opens dashboard.
2. Queue loads all appointments assigned to that provider.
3. Provider updates status through quick actions.
4. Update is persisted and logged in audit table.

## 5.4 Admin pulse workflow

1. Admin opens pulse module.
2. System computes:
   - active sessions
   - total provider count
   - total patient count
   - appointment status distribution
3. Admin gets live operational snapshot for decision support.

## 6) Data model covered in MVP

Core tables:
- `profiles`
- `provider_availability`
- `appointments`
- `messages`
- `prescriptions`
- `audit_logs`

Schema and policies:
- `supabase/migrations/0001_mvp_schema.sql`

## 7) Security and compliance baseline

- Role-aware route checks in app layer
- RLS policies in database layer
- Audit trail for key appointment actions
- Auth-linked profile ownership model

## 8) Out of scope in this MVP

- Live video/WebRTC consultation engine
- Full SOAP notes and clinical documentation suite
- Payment gateway and settlement flows
- Insurance/claims processing
- Advanced notifications and campaign system
- Production-grade observability and scaling automation

## 9) Demo summary for customer

This MVP is production-style in architecture but scoped for validation:
- Core user journeys are operational and testable.
- Security foundation is in place.
- Data model is extensible for next phases.
- Remaining features are planned in phased delivery.

