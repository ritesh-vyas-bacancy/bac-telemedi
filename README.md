# bac-telemedi

Next.js telemedicine MVP built with Next.js App Router + Supabase.

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

## MVP Features

- Auth: Sign up, sign in, sign out with Supabase Auth
- Role-aware workspaces: patient, provider, admin
- Route protection by auth + role
- Patient booking flow backed by live `appointments` data
- Provider queue dashboard with consultation lifecycle controls
- Provider clinical workbench: SOAP notes, prescriptions, care orders
- Provider claim submission and patient notification dispatch
- Patient visits center: check-in, billing simulation, care updates
- Patient inbox with notification center and read acknowledgements
- Admin pulse dashboard with appointment + consultation + billing metrics
- Admin operations desk for claim review, compliance events, incidents, and role permissions

## Seed and QA Helpers

- Seed demo users/data:
  - `node scripts/seed-mvp-data.mjs`
- Optional authenticated smoke QA:
  - `npm run qa:smoke`

## Customer Documents

- MVP test guide: `docs/MVP_Test_Guide.md`
- MVP scope and workflow: `docs/MVP_Scope_Workflow.md`
- Remaining phases sprint roadmap: `docs/Phase_Roadmap_Sprint_Plan.md`
