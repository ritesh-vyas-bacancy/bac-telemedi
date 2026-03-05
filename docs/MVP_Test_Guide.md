# Telemedicine MVP Test Guide

## 1) Where to test

- Local URL: `http://localhost:3000`
- Main pages:
  - `/` (project home)
  - `/workspace`
  - `/workspace/patient/booking`
  - `/workspace/provider/dashboard`
  - `/workspace/admin/pulse`
  - `/prototype` (full clickable design journey)

## 2) How to run

1. Open terminal in project root: `C:\Users\Bacancy\bac-telemedi`
2. Install dependencies:
   - `npm install`
3. Start app:
   - Dev: `npm run dev`
   - Or production mode: `npm run build` then `npm run start`
4. Open browser:
   - `http://localhost:3000`

## 3) Environment required

Your `.env.local` must include:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

Database schema already applied from:
- `supabase/migrations/0001_mvp_schema.sql`

## 4) Demo credentials (seeded)

- Patient:
  - Email: `mvp.patient.1772702607587@gmail.com`
  - Password: `DemoPass#2026`
- Provider:
  - Email: `mvp.provider.1772702607587@gmail.com`
  - Password: `DemoPass#2026`
- Admin:
  - Email: `mvp.admin.1772702607587@gmail.com`
  - Password: `DemoPass#2026`

## 5) Persona-wise test checklist

### Patient flow

1. Sign in as patient.
2. Open `/workspace/patient/booking`.
3. Verify provider dropdown is populated.
4. Book appointment with date/time + reason.
5. Verify success message and upcoming appointments list.

Expected:
- Appointment is created in Supabase.
- Appointment visible to same patient.

### Provider flow

1. Sign in as provider.
2. Open `/workspace/provider/dashboard`.
3. Verify queue cards are visible.
4. Update status using action buttons:
   - `in_progress`
   - `completed`
   - `cancelled`

Expected:
- Status updates persist.
- Provider can update only own assigned appointments.

### Admin flow

1. Sign in as admin.
2. Open `/workspace/admin/pulse`.
3. Verify live metrics:
   - Active sessions
   - Total providers/patients
   - Appointment status distribution

Expected:
- Admin sees aggregate operational data.

## 6) Troubleshooting

- `Email not confirmed` while testing:
  - In Supabase Auth settings, disable email confirmation for MVP demo.
- If role access redirects unexpectedly:
  - Confirm profile role in `public.profiles` table.
- If no booking data appears:
  - Verify migration executed and RLS policies are present.

