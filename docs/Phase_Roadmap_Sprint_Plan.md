# Telemedicine Enterprise Capability Matrix

## Product status

This document records what is already delivered in the running enterprise build.

| Capability Group | Coverage | Status |
|---|---|---|
| Authentication and access control | Sign up, sign in, sign out, role routing, route protection | Live |
| Patient lifecycle | Booking, check-in, visits, prescriptions, care orders, invoices | Live |
| Provider lifecycle | Queue management, consultation state machine, notes, prescriptions, orders, claims | Live |
| Admin lifecycle | Pulse dashboard, operations desk, compliance events, incidents, permissions, audit stream | Live |
| Teleconsult experience | Embedded call room with meeting links and role-scoped access | Live |
| Billing and settlements | Invoice payment flow, gateway reference tracking, claim-to-invoice settlement sync | Live |
| Communications | In-app notifications, queue dispatch, retry controls, optional email/SMS/WhatsApp transport adapters | Live |
| Security baseline | RLS, ownership checks, audit logs for major actions | Live |
| QA baseline | Lint, build, seed, authenticated smoke automation | Live |

## Operational checklist

1. Database migrations applied:
   - `supabase/migrations/0001_mvp_schema.sql`
   - `supabase/migrations/0002_phase_a_clinical_core.sql`
   - `supabase/migrations/0003_phase_bcd_foundations.sql`
2. Seed run complete:
   - `node scripts/seed-mvp-data.mjs`
3. Automated checks passing:
   - `npm run lint`
   - `npm run build`
   - `npm run qa:smoke`
4. Production deployment active:
   - `https://bac-telemedi.vercel.app`

## Optional external provider credentials

The platform works without these, and uses in-app delivery and queued dispatch fallback.
Add these values to enable direct external transport for notifications:

- `RESEND_API_KEY`
- `NOTIFY_FROM_EMAIL`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_FROM_SMS`
- `TWILIO_FROM_WHATSAPP`

## Acceptance statement

The current release is a complete enterprise telemedicine product for demonstration and operational walkthrough across patient, provider, and admin personas.
