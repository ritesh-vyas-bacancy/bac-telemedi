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
- Provider queue dashboard with status updates (`in_progress`, `completed`, `cancelled`)
- Admin pulse dashboard with live system counts
