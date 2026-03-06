-- BAC Telemedicine Phase B/C foundations: claims, notifications, compliance, incidents, permissions
-- Run after 0002_phase_a_clinical_core.sql

do $$
begin
  create type public.claim_status as enum ('draft', 'submitted', 'under_review', 'approved', 'rejected', 'paid');
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.notification_channel as enum ('in_app', 'email', 'sms', 'whatsapp');
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.notification_status as enum ('queued', 'sent', 'failed', 'read');
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.incident_severity as enum ('low', 'medium', 'high', 'critical');
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.incident_status as enum ('open', 'in_progress', 'resolved', 'closed');
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.compliance_risk as enum ('low', 'medium', 'high', 'critical');
exception
  when duplicate_object then null;
end
$$;

create table if not exists public.claim_submissions (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null unique references public.appointments (id) on delete cascade,
  patient_id uuid not null references public.profiles (id) on delete cascade,
  provider_id uuid not null references public.profiles (id) on delete cascade,
  payer_name text not null default 'Self-pay',
  amount_claimed numeric(10, 2) not null check (amount_claimed >= 0),
  status public.claim_status not null default 'draft',
  claim_reference text,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  settled_at timestamptz,
  review_notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.notification_events (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  sender_id uuid references public.profiles (id) on delete set null,
  appointment_id uuid references public.appointments (id) on delete set null,
  title text not null,
  message text not null,
  channel public.notification_channel not null default 'in_app',
  status public.notification_status not null default 'queued',
  scheduled_for timestamptz not null default timezone('utc', now()),
  sent_at timestamptz,
  read_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.compliance_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id) on delete set null,
  patient_id uuid references public.profiles (id) on delete set null,
  appointment_id uuid references public.appointments (id) on delete set null,
  event_type text not null,
  risk_level public.compliance_risk not null default 'medium',
  details text,
  is_resolved boolean not null default false,
  resolved_by uuid references public.profiles (id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.incident_reports (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  severity public.incident_severity not null default 'medium',
  status public.incident_status not null default 'open',
  opened_by uuid references public.profiles (id) on delete set null,
  assigned_to uuid references public.profiles (id) on delete set null,
  appointment_id uuid references public.appointments (id) on delete set null,
  opened_at timestamptz not null default timezone('utc', now()),
  resolved_at timestamptz,
  resolution_notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.role_permissions (
  id uuid primary key default gen_random_uuid(),
  role public.app_role not null,
  permission_key text not null,
  description text,
  created_at timestamptz not null default timezone('utc', now()),
  unique (role, permission_key)
);

insert into public.role_permissions (role, permission_key, description)
values
  ('patient', 'appointments.book', 'Book own appointment'),
  ('patient', 'consultation.check_in', 'Check in for booked visit'),
  ('patient', 'invoices.pay', 'Pay own invoice'),
  ('provider', 'consultation.manage', 'Update consultation lifecycle'),
  ('provider', 'clinical.notes.write', 'Create and sign encounter notes'),
  ('provider', 'prescriptions.issue', 'Issue prescriptions'),
  ('provider', 'care_orders.manage', 'Create care orders'),
  ('provider', 'claims.submit', 'Submit claims'),
  ('admin', 'operations.override', 'Override appointment and consultation states'),
  ('admin', 'claims.review', 'Review and settle claims'),
  ('admin', 'compliance.resolve', 'Resolve compliance events'),
  ('admin', 'incident.manage', 'Manage incident lifecycle'),
  ('admin', 'permissions.manage', 'Manage role permission matrix')
on conflict (role, permission_key) do nothing;

create index if not exists idx_claim_submissions_provider on public.claim_submissions (provider_id, status, created_at desc);
create index if not exists idx_claim_submissions_patient on public.claim_submissions (patient_id, status, created_at desc);
create index if not exists idx_claim_submissions_status on public.claim_submissions (status, created_at desc);

create index if not exists idx_notification_events_recipient on public.notification_events (recipient_id, status, created_at desc);
create index if not exists idx_notification_events_sender on public.notification_events (sender_id, created_at desc);
create index if not exists idx_notification_events_appointment on public.notification_events (appointment_id, created_at desc);

create index if not exists idx_compliance_events_risk on public.compliance_events (risk_level, is_resolved, created_at desc);
create index if not exists idx_compliance_events_actor on public.compliance_events (actor_id, created_at desc);
create index if not exists idx_compliance_events_patient on public.compliance_events (patient_id, created_at desc);

create index if not exists idx_incident_reports_status on public.incident_reports (status, severity, created_at desc);
create index if not exists idx_incident_reports_assigned on public.incident_reports (assigned_to, status, created_at desc);
create index if not exists idx_incident_reports_opened_by on public.incident_reports (opened_by, created_at desc);

create index if not exists idx_role_permissions_role on public.role_permissions (role, permission_key);

drop trigger if exists set_claim_submissions_updated_at on public.claim_submissions;
create trigger set_claim_submissions_updated_at
before update on public.claim_submissions
for each row execute function public.set_updated_at();

drop trigger if exists set_notification_events_updated_at on public.notification_events;
create trigger set_notification_events_updated_at
before update on public.notification_events
for each row execute function public.set_updated_at();

drop trigger if exists set_compliance_events_updated_at on public.compliance_events;
create trigger set_compliance_events_updated_at
before update on public.compliance_events
for each row execute function public.set_updated_at();

drop trigger if exists set_incident_reports_updated_at on public.incident_reports;
create trigger set_incident_reports_updated_at
before update on public.incident_reports
for each row execute function public.set_updated_at();

alter table public.claim_submissions enable row level security;
alter table public.notification_events enable row level security;
alter table public.compliance_events enable row level security;
alter table public.incident_reports enable row level security;
alter table public.role_permissions enable row level security;

drop policy if exists "claim_submissions_select_owner_or_admin" on public.claim_submissions;
create policy "claim_submissions_select_owner_or_admin"
on public.claim_submissions
for select
to authenticated
using (
  auth.uid() = patient_id
  or auth.uid() = provider_id
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

drop policy if exists "claim_submissions_insert_provider_or_admin" on public.claim_submissions;
create policy "claim_submissions_insert_provider_or_admin"
on public.claim_submissions
for insert
to authenticated
with check (
  auth.uid() = provider_id
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

drop policy if exists "claim_submissions_update_provider_or_admin" on public.claim_submissions;
create policy "claim_submissions_update_provider_or_admin"
on public.claim_submissions
for update
to authenticated
using (
  auth.uid() = provider_id
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
)
with check (
  auth.uid() = provider_id
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

drop policy if exists "claim_submissions_delete_admin_only" on public.claim_submissions;
create policy "claim_submissions_delete_admin_only"
on public.claim_submissions
for delete
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

drop policy if exists "notification_events_select_owner_or_admin" on public.notification_events;
create policy "notification_events_select_owner_or_admin"
on public.notification_events
for select
to authenticated
using (
  auth.uid() = recipient_id
  or auth.uid() = sender_id
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

drop policy if exists "notification_events_insert_sender_or_admin" on public.notification_events;
create policy "notification_events_insert_sender_or_admin"
on public.notification_events
for insert
to authenticated
with check (
  auth.uid() = sender_id
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

drop policy if exists "notification_events_update_owner_or_admin" on public.notification_events;
create policy "notification_events_update_owner_or_admin"
on public.notification_events
for update
to authenticated
using (
  auth.uid() = recipient_id
  or auth.uid() = sender_id
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
)
with check (
  auth.uid() = recipient_id
  or auth.uid() = sender_id
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

drop policy if exists "notification_events_delete_admin_or_sender" on public.notification_events;
create policy "notification_events_delete_admin_or_sender"
on public.notification_events
for delete
to authenticated
using (
  auth.uid() = sender_id
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

drop policy if exists "compliance_events_select_owner_or_admin" on public.compliance_events;
create policy "compliance_events_select_owner_or_admin"
on public.compliance_events
for select
to authenticated
using (
  auth.uid() = actor_id
  or auth.uid() = patient_id
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

drop policy if exists "compliance_events_insert_actor_or_admin" on public.compliance_events;
create policy "compliance_events_insert_actor_or_admin"
on public.compliance_events
for insert
to authenticated
with check (
  auth.uid() = actor_id
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

drop policy if exists "compliance_events_update_admin_only" on public.compliance_events;
create policy "compliance_events_update_admin_only"
on public.compliance_events
for update
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

drop policy if exists "compliance_events_delete_admin_only" on public.compliance_events;
create policy "compliance_events_delete_admin_only"
on public.compliance_events
for delete
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

drop policy if exists "incident_reports_select_actor_or_admin" on public.incident_reports;
create policy "incident_reports_select_actor_or_admin"
on public.incident_reports
for select
to authenticated
using (
  auth.uid() = opened_by
  or auth.uid() = assigned_to
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

drop policy if exists "incident_reports_insert_actor_or_admin" on public.incident_reports;
create policy "incident_reports_insert_actor_or_admin"
on public.incident_reports
for insert
to authenticated
with check (
  auth.uid() = opened_by
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

drop policy if exists "incident_reports_update_actor_or_admin" on public.incident_reports;
create policy "incident_reports_update_actor_or_admin"
on public.incident_reports
for update
to authenticated
using (
  auth.uid() = opened_by
  or auth.uid() = assigned_to
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
)
with check (
  auth.uid() = opened_by
  or auth.uid() = assigned_to
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

drop policy if exists "incident_reports_delete_admin_only" on public.incident_reports;
create policy "incident_reports_delete_admin_only"
on public.incident_reports
for delete
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

drop policy if exists "role_permissions_select_authenticated" on public.role_permissions;
create policy "role_permissions_select_authenticated"
on public.role_permissions
for select
to authenticated
using (true);

drop policy if exists "role_permissions_write_admin_only" on public.role_permissions;
create policy "role_permissions_write_admin_only"
on public.role_permissions
for all
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

grant select, insert, update, delete on table public.claim_submissions to authenticated;
grant select, insert, update, delete on table public.notification_events to authenticated;
grant select, insert, update, delete on table public.compliance_events to authenticated;
grant select, insert, update, delete on table public.incident_reports to authenticated;
grant select, insert, update, delete on table public.role_permissions to authenticated;
