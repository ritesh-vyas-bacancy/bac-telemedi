-- BAC Telemedicine Phase A Clinical Core + foundation entities
-- Run after 0001_mvp_schema.sql

do $$
begin
  create type public.consultation_status as enum (
    'scheduled',
    'checked_in',
    'ready',
    'in_consult',
    'completed',
    'cancelled'
  );
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.encounter_note_status as enum ('draft', 'signed');
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.care_order_status as enum ('open', 'completed', 'cancelled');
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.billing_status as enum ('pending', 'paid', 'failed', 'refunded');
exception
  when duplicate_object then null;
end
$$;

create table if not exists public.consultation_sessions (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null unique references public.appointments (id) on delete cascade,
  patient_id uuid not null references public.profiles (id) on delete cascade,
  provider_id uuid not null references public.profiles (id) on delete cascade,
  status public.consultation_status not null default 'scheduled',
  room_name text,
  patient_ready_at timestamptz,
  provider_ready_at timestamptz,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (patient_id <> provider_id)
);

create table if not exists public.encounter_notes (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null unique references public.appointments (id) on delete cascade,
  consultation_session_id uuid references public.consultation_sessions (id) on delete set null,
  patient_id uuid not null references public.profiles (id) on delete cascade,
  provider_id uuid not null references public.profiles (id) on delete cascade,
  subjective text not null default '',
  objective text not null default '',
  assessment text not null default '',
  plan text not null default '',
  status public.encounter_note_status not null default 'draft',
  signed_at timestamptz,
  signed_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.care_orders (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments (id) on delete cascade,
  patient_id uuid not null references public.profiles (id) on delete cascade,
  provider_id uuid not null references public.profiles (id) on delete cascade,
  order_type text not null check (order_type in ('lab', 'imaging', 'follow_up', 'lifestyle', 'other')),
  title text not null,
  details text,
  due_date date,
  status public.care_order_status not null default 'open',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.billing_invoices (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid references public.appointments (id) on delete set null,
  patient_id uuid not null references public.profiles (id) on delete cascade,
  provider_id uuid references public.profiles (id) on delete set null,
  amount numeric(10, 2) not null check (amount >= 0),
  currency text not null default 'INR',
  status public.billing_status not null default 'pending',
  paid_at timestamptz,
  gateway_reference text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_consultation_sessions_appointment on public.consultation_sessions (appointment_id);
create index if not exists idx_consultation_sessions_provider on public.consultation_sessions (provider_id, status, updated_at desc);
create index if not exists idx_consultation_sessions_patient on public.consultation_sessions (patient_id, status, updated_at desc);

create index if not exists idx_encounter_notes_provider on public.encounter_notes (provider_id, updated_at desc);
create index if not exists idx_encounter_notes_patient on public.encounter_notes (patient_id, updated_at desc);
create index if not exists idx_encounter_notes_status on public.encounter_notes (status, updated_at desc);

create index if not exists idx_care_orders_provider on public.care_orders (provider_id, status, created_at desc);
create index if not exists idx_care_orders_patient on public.care_orders (patient_id, status, created_at desc);
create index if not exists idx_care_orders_appointment on public.care_orders (appointment_id, created_at desc);

create index if not exists idx_billing_invoices_patient on public.billing_invoices (patient_id, status, created_at desc);
create index if not exists idx_billing_invoices_provider on public.billing_invoices (provider_id, status, created_at desc);
create index if not exists idx_billing_invoices_appointment on public.billing_invoices (appointment_id);

drop trigger if exists set_consultation_sessions_updated_at on public.consultation_sessions;
create trigger set_consultation_sessions_updated_at
before update on public.consultation_sessions
for each row execute function public.set_updated_at();

drop trigger if exists set_encounter_notes_updated_at on public.encounter_notes;
create trigger set_encounter_notes_updated_at
before update on public.encounter_notes
for each row execute function public.set_updated_at();

drop trigger if exists set_care_orders_updated_at on public.care_orders;
create trigger set_care_orders_updated_at
before update on public.care_orders
for each row execute function public.set_updated_at();

drop trigger if exists set_billing_invoices_updated_at on public.billing_invoices;
create trigger set_billing_invoices_updated_at
before update on public.billing_invoices
for each row execute function public.set_updated_at();

insert into public.consultation_sessions (appointment_id, patient_id, provider_id, status, started_at, ended_at)
select
  a.id,
  a.patient_id,
  a.provider_id,
  case
    when a.status = 'in_progress' then 'in_consult'::public.consultation_status
    when a.status = 'completed' then 'completed'::public.consultation_status
    when a.status in ('cancelled', 'no_show') then 'cancelled'::public.consultation_status
    else 'scheduled'::public.consultation_status
  end as status,
  case when a.status = 'in_progress' then a.updated_at else null end as started_at,
  case when a.status = 'completed' then a.updated_at else null end as ended_at
from public.appointments a
on conflict (appointment_id) do nothing;

insert into public.billing_invoices (appointment_id, patient_id, provider_id, amount, currency, status, paid_at, gateway_reference)
select
  a.id,
  a.patient_id,
  a.provider_id,
  499.00::numeric(10, 2) as amount,
  'INR'::text as currency,
  case
    when a.status = 'completed' then 'paid'::public.billing_status
    when a.status = 'cancelled' then 'failed'::public.billing_status
    when a.status = 'no_show' then 'failed'::public.billing_status
    else 'pending'::public.billing_status
  end as status,
  case when a.status = 'completed' then a.updated_at else null end as paid_at,
  case when a.status = 'completed' then 'AUTO_SEEDED' else null end as gateway_reference
from public.appointments a
where not exists (
  select 1
  from public.billing_invoices bi
  where bi.appointment_id = a.id
);

alter table public.consultation_sessions enable row level security;
alter table public.encounter_notes enable row level security;
alter table public.care_orders enable row level security;
alter table public.billing_invoices enable row level security;

drop policy if exists "consultation_sessions_select_owner_or_admin" on public.consultation_sessions;
create policy "consultation_sessions_select_owner_or_admin"
on public.consultation_sessions
for select
to authenticated
using (
  auth.uid() = patient_id
  or auth.uid() = provider_id
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

drop policy if exists "consultation_sessions_insert_provider_or_admin" on public.consultation_sessions;
create policy "consultation_sessions_insert_provider_or_admin"
on public.consultation_sessions
for insert
to authenticated
with check (
  auth.uid() = provider_id
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

drop policy if exists "consultation_sessions_update_owner_or_admin" on public.consultation_sessions;
create policy "consultation_sessions_update_owner_or_admin"
on public.consultation_sessions
for update
to authenticated
using (
  auth.uid() = patient_id
  or auth.uid() = provider_id
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
)
with check (
  auth.uid() = patient_id
  or auth.uid() = provider_id
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

drop policy if exists "consultation_sessions_delete_admin_only" on public.consultation_sessions;
create policy "consultation_sessions_delete_admin_only"
on public.consultation_sessions
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

drop policy if exists "encounter_notes_select_owner_or_admin" on public.encounter_notes;
create policy "encounter_notes_select_owner_or_admin"
on public.encounter_notes
for select
to authenticated
using (
  auth.uid() = patient_id
  or auth.uid() = provider_id
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

drop policy if exists "encounter_notes_insert_provider_or_admin" on public.encounter_notes;
create policy "encounter_notes_insert_provider_or_admin"
on public.encounter_notes
for insert
to authenticated
with check (
  auth.uid() = provider_id
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

drop policy if exists "encounter_notes_update_provider_or_admin" on public.encounter_notes;
create policy "encounter_notes_update_provider_or_admin"
on public.encounter_notes
for update
to authenticated
using (
  auth.uid() = provider_id
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
)
with check (
  auth.uid() = provider_id
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

drop policy if exists "encounter_notes_delete_admin_only" on public.encounter_notes;
create policy "encounter_notes_delete_admin_only"
on public.encounter_notes
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

drop policy if exists "care_orders_select_owner_or_admin" on public.care_orders;
create policy "care_orders_select_owner_or_admin"
on public.care_orders
for select
to authenticated
using (
  auth.uid() = patient_id
  or auth.uid() = provider_id
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

drop policy if exists "care_orders_insert_provider_or_admin" on public.care_orders;
create policy "care_orders_insert_provider_or_admin"
on public.care_orders
for insert
to authenticated
with check (
  auth.uid() = provider_id
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

drop policy if exists "care_orders_update_provider_or_admin" on public.care_orders;
create policy "care_orders_update_provider_or_admin"
on public.care_orders
for update
to authenticated
using (
  auth.uid() = provider_id
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
)
with check (
  auth.uid() = provider_id
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

drop policy if exists "care_orders_delete_admin_only" on public.care_orders;
create policy "care_orders_delete_admin_only"
on public.care_orders
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

drop policy if exists "billing_invoices_select_owner_or_admin" on public.billing_invoices;
create policy "billing_invoices_select_owner_or_admin"
on public.billing_invoices
for select
to authenticated
using (
  auth.uid() = patient_id
  or auth.uid() = provider_id
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

drop policy if exists "billing_invoices_insert_owner_or_admin" on public.billing_invoices;
create policy "billing_invoices_insert_owner_or_admin"
on public.billing_invoices
for insert
to authenticated
with check (
  auth.uid() = patient_id
  or auth.uid() = provider_id
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

drop policy if exists "billing_invoices_update_owner_or_admin" on public.billing_invoices;
create policy "billing_invoices_update_owner_or_admin"
on public.billing_invoices
for update
to authenticated
using (
  auth.uid() = patient_id
  or auth.uid() = provider_id
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
)
with check (
  auth.uid() = patient_id
  or auth.uid() = provider_id
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

drop policy if exists "billing_invoices_delete_admin_only" on public.billing_invoices;
create policy "billing_invoices_delete_admin_only"
on public.billing_invoices
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

grant select, insert, update, delete on table public.consultation_sessions to authenticated;
grant select, insert, update, delete on table public.encounter_notes to authenticated;
grant select, insert, update, delete on table public.care_orders to authenticated;
grant select, insert, update, delete on table public.billing_invoices to authenticated;
