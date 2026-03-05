# Supabase Setup

## Apply MVP Schema

1. Open your Supabase project dashboard.
2. Go to `SQL Editor`.
3. Open [0001_mvp_schema.sql](./migrations/0001_mvp_schema.sql).
4. Run the full script once.

This creates:
- Auth-linked `profiles` table with role support (`patient`, `provider`, `admin`)
- Core MVP tables (`appointments`, `provider_availability`, `messages`, `prescriptions`, `audit_logs`)
- Triggers for `updated_at` and automatic profile creation on auth sign-up
- RLS policies for role-safe access

## Verify Quickly

After running the migration:
- Sign up one patient and one provider user in the app.
- Patient can book from `/workspace/patient/booking`.
- Provider can see and update queue at `/workspace/provider/dashboard`.
- Admin can see live system counts at `/workspace/admin/pulse`.
