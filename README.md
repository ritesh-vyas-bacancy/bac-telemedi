# bac-telemedi

Enterprise telemedicine platform built with Next.js App Router + Supabase.

## Prerequisites

- Node.js 20+
- A Supabase project

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create env file:

```bash
cp .env.example .env.local
```

3. Set your Supabase values in `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Optional external notification providers
RESEND_API_KEY=...
NOTIFY_FROM_EMAIL=care@your-domain.com
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_FROM_SMS=...
TWILIO_FROM_WHATSAPP=...
```

4. Run the app:

```bash
npm run dev
```

Open `http://localhost:3000`.

5. Apply database schema:

Use Supabase SQL Editor and run:

`supabase/migrations/0001_mvp_schema.sql`
`supabase/migrations/0002_phase_a_clinical_core.sql`
`supabase/migrations/0003_phase_bcd_foundations.sql`

## Supabase Helpers

- Browser client: `src/lib/supabase/client.ts`
- Server client: `src/lib/supabase/server.ts`
- Middleware session refresh: `src/lib/supabase/middleware.ts`
- Next proxy entry: `src/proxy.ts`

## Platform Features

- Auth: Sign up, sign in, sign out with Supabase Auth
- Role-aware workspaces: patient, provider, admin
- Route protection by auth + role
- Patient booking flow backed by live `appointments` data
- Embedded teleconsult room journey (`/workspace/call/[appointmentId]`)
- Provider queue dashboard with consultation lifecycle controls
- Provider clinical workbench: SOAP notes, prescriptions, care orders
- Provider claim submission and patient notification dispatch (in-app, email, SMS, WhatsApp)
- Notification queue dispatch and retry controls for provider/admin
- Patient visits center: check-in, billing, care updates
- Patient inbox with notification center and read acknowledgements
- Admin pulse dashboard with appointment + consultation + billing metrics
- Admin operations desk for claim review, compliance events, incidents, and role permissions

## Seed and QA Helpers

- Seed platform users/data:
  - `node scripts/seed-mvp-data.mjs`
- Authenticated smoke QA:
  - `npm run qa:smoke`

## Customer Documents

- Test guide: `docs/MVP_Test_Guide.md`
- Scope and workflow: `docs/MVP_Scope_Workflow.md`
