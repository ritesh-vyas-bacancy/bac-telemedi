-- BAC Telemedicine MVP schema
-- Run this script in Supabase SQL Editor or via Supabase migrations.

create extension if not exists pgcrypto;

do $$
begin
  create type public.app_role as enum ('patient', 'provider', 'admin');
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.appointment_status as enum ('booked', 'in_progress', 'completed', 'cancelled', 'no_show');
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.prescription_status as enum ('draft', 'sent', 'cancelled');
exception
  when duplicate_object then null;
end
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.app_role not null default 'patient',
  full_name text,
  phone text,
  avatar_url text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.provider_availability (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.profiles (id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null,
  timezone text not null default 'UTC',
  slot_minutes integer not null default 30 check (slot_minutes > 0 and slot_minutes <= 240),
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (start_time < end_time)
);

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles (id) on delete restrict,
  provider_id uuid not null references public.profiles (id) on delete restrict,
  scheduled_at timestamptz not null,
  duration_minutes integer not null default 30 check (duration_minutes > 0 and duration_minutes <= 240),
  reason text,
  status public.appointment_status not null default 'booked',
  meeting_url text,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (length(trim(body)) > 0),
  read_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (sender_id <> recipient_id)
);

create table if not exists public.prescriptions (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments (id) on delete cascade,
  patient_id uuid not null references public.profiles (id) on delete cascade,
  provider_id uuid not null references public.profiles (id) on delete cascade,
  medication_name text not null,
  dosage text not null,
  instructions text,
  status public.prescription_status not null default 'draft',
  issued_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_profiles_role on public.profiles (role);

create index if not exists idx_provider_availability_provider on public.provider_availability (provider_id);
create index if not exists idx_provider_availability_weekday on public.provider_availability (weekday, is_active);

create index if not exists idx_appointments_patient on public.appointments (patient_id, scheduled_at desc);
create index if not exists idx_appointments_provider on public.appointments (provider_id, scheduled_at desc);
create index if not exists idx_appointments_status on public.appointments (status, scheduled_at);

create index if not exists idx_messages_appointment on public.messages (appointment_id, created_at);
create index if not exists idx_messages_recipient on public.messages (recipient_id, read_at);

create index if not exists idx_prescriptions_patient on public.prescriptions (patient_id, issued_at desc);
create index if not exists idx_prescriptions_provider on public.prescriptions (provider_id, issued_at desc);

create index if not exists idx_audit_logs_actor on public.audit_logs (actor_id, created_at desc);
create index if not exists idx_audit_logs_entity on public.audit_logs (entity_type, entity_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_provider_availability_updated_at on public.provider_availability;
create trigger set_provider_availability_updated_at
before update on public.provider_availability
for each row execute function public.set_updated_at();

drop trigger if exists set_appointments_updated_at on public.appointments;
create trigger set_appointments_updated_at
before update on public.appointments
for each row execute function public.set_updated_at();

drop trigger if exists set_messages_updated_at on public.messages;
create trigger set_messages_updated_at
before update on public.messages
for each row execute function public.set_updated_at();

drop trigger if exists set_prescriptions_updated_at on public.prescriptions;
create trigger set_prescriptions_updated_at
before update on public.prescriptions
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta_role text;
  user_role public.app_role := 'patient';
begin
  meta_role := coalesce(new.raw_user_meta_data ->> 'role', '');

  if meta_role in ('patient', 'provider', 'admin') then
    user_role := meta_role::public.app_role;
  end if;

  insert into public.profiles (id, role, full_name)
  values (
    new.id,
    user_role,
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), '')
  )
  on conflict (id) do update
  set
    role = excluded.role,
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    updated_at = timezone('utc', now());

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

insert into public.profiles (id, role, full_name)
select
  u.id,
  case
    when coalesce(u.raw_user_meta_data ->> 'role', '') in ('patient', 'provider', 'admin')
      then (u.raw_user_meta_data ->> 'role')::public.app_role
    else 'patient'::public.app_role
  end as role,
  nullif(trim(coalesce(u.raw_user_meta_data ->> 'full_name', '')), '') as full_name
from auth.users u
on conflict (id) do nothing;

alter table public.profiles enable row level security;
alter table public.provider_availability enable row level security;
alter table public.appointments enable row level security;
alter table public.messages enable row level security;
alter table public.prescriptions enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists "profiles_select_authenticated" on public.profiles;
create policy "profiles_select_authenticated"
on public.profiles
for select
to authenticated
using (true);

drop policy if exists "profiles_insert_self" on public.profiles;
create policy "profiles_insert_self"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "provider_availability_select_authenticated" on public.provider_availability;
create policy "provider_availability_select_authenticated"
on public.provider_availability
for select
to authenticated
using (true);

drop policy if exists "provider_availability_insert_owner_or_admin" on public.provider_availability;
create policy "provider_availability_insert_owner_or_admin"
on public.provider_availability
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

drop policy if exists "provider_availability_update_owner_or_admin" on public.provider_availability;
create policy "provider_availability_update_owner_or_admin"
on public.provider_availability
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

drop policy if exists "provider_availability_delete_owner_or_admin" on public.provider_availability;
create policy "provider_availability_delete_owner_or_admin"
on public.provider_availability
for delete
to authenticated
using (
  auth.uid() = provider_id
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

drop policy if exists "appointments_select_owner_or_admin" on public.appointments;
create policy "appointments_select_owner_or_admin"
on public.appointments
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

drop policy if exists "appointments_insert_patient_or_admin" on public.appointments;
create policy "appointments_insert_patient_or_admin"
on public.appointments
for insert
to authenticated
with check (
  auth.uid() = patient_id
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

drop policy if exists "appointments_update_owner_or_admin" on public.appointments;
create policy "appointments_update_owner_or_admin"
on public.appointments
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

drop policy if exists "appointments_delete_admin_only" on public.appointments;
create policy "appointments_delete_admin_only"
on public.appointments
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

drop policy if exists "messages_select_owner_or_admin" on public.messages;
create policy "messages_select_owner_or_admin"
on public.messages
for select
to authenticated
using (
  auth.uid() = sender_id
  or auth.uid() = recipient_id
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

drop policy if exists "messages_insert_sender_or_admin" on public.messages;
create policy "messages_insert_sender_or_admin"
on public.messages
for insert
to authenticated
with check (
  auth.uid() = sender_id
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

drop policy if exists "messages_update_recipient_or_admin" on public.messages;
create policy "messages_update_recipient_or_admin"
on public.messages
for update
to authenticated
using (
  auth.uid() = recipient_id
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
)
with check (
  auth.uid() = recipient_id
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

drop policy if exists "messages_delete_sender_or_admin" on public.messages;
create policy "messages_delete_sender_or_admin"
on public.messages
for delete
to authenticated
using (
  auth.uid() = sender_id
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

drop policy if exists "prescriptions_select_owner_or_admin" on public.prescriptions;
create policy "prescriptions_select_owner_or_admin"
on public.prescriptions
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

drop policy if exists "prescriptions_insert_provider_or_admin" on public.prescriptions;
create policy "prescriptions_insert_provider_or_admin"
on public.prescriptions
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

drop policy if exists "prescriptions_update_provider_or_admin" on public.prescriptions;
create policy "prescriptions_update_provider_or_admin"
on public.prescriptions
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

drop policy if exists "prescriptions_delete_admin_only" on public.prescriptions;
create policy "prescriptions_delete_admin_only"
on public.prescriptions
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

drop policy if exists "audit_logs_select_actor_or_admin" on public.audit_logs;
create policy "audit_logs_select_actor_or_admin"
on public.audit_logs
for select
to authenticated
using (
  auth.uid() = actor_id
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

drop policy if exists "audit_logs_insert_actor_or_admin" on public.audit_logs;
create policy "audit_logs_insert_actor_or_admin"
on public.audit_logs
for insert
to authenticated
with check (
  auth.uid() = actor_id
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

grant usage on schema public to authenticated;

grant select, insert, update on table public.profiles to authenticated;
grant select, insert, update, delete on table public.provider_availability to authenticated;
grant select, insert, update, delete on table public.appointments to authenticated;
grant select, insert, update, delete on table public.messages to authenticated;
grant select, insert, update, delete on table public.prescriptions to authenticated;
grant select, insert on table public.audit_logs to authenticated;
