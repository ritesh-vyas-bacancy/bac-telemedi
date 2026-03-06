# Telemedicine Enterprise Test Guide

## 1) Test Targets

- Local: `http://localhost:3000`
- Production: `https://bac-telemedi.vercel.app`
- Key routes:
  - `/workspace/patient/booking`
  - `/workspace/patient/visits`
  - `/workspace/provider/dashboard`
  - `/workspace/provider/patients`
  - `/workspace/admin/pulse`
  - `/workspace/admin/operations`

## 2) Required Setup

1. Open terminal in project root: `C:\Users\Bacancy\bac-telemedi`
2. Install dependencies:
   - `npm install`
3. Ensure `.env.local` contains:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

4. Run database migrations in Supabase SQL editor:
   - `supabase/migrations/0001_mvp_schema.sql`
   - `supabase/migrations/0002_phase_a_clinical_core.sql`
   - `supabase/migrations/0003_phase_bcd_foundations.sql`
5. Seed demo users/data:
   - `node scripts/seed-mvp-data.mjs`
6. Start app:
   - `npm run dev`

## 3) Demo Credentials

Use the latest credentials printed by `scripts/seed-mvp-data.mjs`.

## 4) Persona Flow Checklist

### Patient

1. Book appointment in `/workspace/patient/booking`.
2. Go to `/workspace/patient/visits`.
3. Click `Check In For Visit` on booked visit.
4. Verify invoice appears and `Pay Now` works with payment method selection.
5. Verify prescriptions/care orders are visible.

### Provider

1. Open `/workspace/provider/dashboard`.
2. Move consultation state: `ready -> in_consult -> completed`.
3. Open `/workspace/provider/patients`.
4. Save SOAP note draft, issue prescription, create care order.
5. Click `Sign Note & Complete Visit`.
6. Submit claim and send a notification from `/workspace/provider/dashboard`.

### Admin

1. Open `/workspace/admin/pulse`.
2. Verify metrics include consultation and billing signals.
3. Open `/workspace/admin/operations`.
4. Verify appointment, consultation, invoice, and claims views update.
5. Validate compliance events, incidents, and permission matrix actions.
6. Validate audit stream in `/workspace/admin/audit`.

## 5) Automated QA Smoke

Optional authenticated smoke run:

```powershell
$env:MVP_QA_PATIENT_EMAIL="..."
$env:MVP_QA_PROVIDER_EMAIL="..."
$env:MVP_QA_ADMIN_EMAIL="..."
$env:MVP_QA_PASSWORD="..."
npm run qa:smoke
```

## 6) Troubleshooting

- If you see errors like `Could not find the table 'public.consultation_sessions'`:
  - Run `0002_phase_a_clinical_core.sql` migration.
- If you see errors like `Could not find the table 'public.claim_submissions'`:
  - Run `0003_phase_bcd_foundations.sql` migration.
- If sign-in fails with confirmation issue:
  - Disable confirm-email in Supabase Auth during demo.
- If role routing is wrong:
  - Check user role in `public.profiles`.
