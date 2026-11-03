-- ====================================================================
-- GovGuide PH MVP Database Schema & Row-Level Security (RLS) Policies
-- Migration: 20261028000001_mvp_schema.sql
-- ====================================================================

-- 1. Enable Required Extensions
create extension if not exists "uuid-ossp";
create extension if not exists "vector";

-- 2. Agencies Table
create table if not exists public.agencies (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  description text,
  contact_email text,
  contact_phone text,
  hotline text,
  office_address text,
  created_at timestamptz default now() not null
);

-- 3. Services Table
create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid references public.agencies(id) on delete cascade not null,
  code text not null,
  name text not null,
  description text,
  is_active boolean default true not null,
  requirements jsonb default '[]'::jsonb not null,
  processing_fee numeric(10, 2) default 0.00 not null,
  processing_days integer default 1 not null,
  created_at timestamptz default now() not null,
  constraint services_agency_code_key unique (agency_id, code)
);

-- 4. Charter Chunks Table (RAG Vector Store)
create table if not exists public.charter_chunks (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid references public.agencies(id) on delete cascade not null,
  service_id uuid references public.services(id) on delete set null,
  title text not null,
  content text not null,
  metadata jsonb default '{}'::jsonb not null,
  embedding vector(768) not null,
  created_at timestamptz default now() not null
);

-- Create HNSW index for ultra-fast cosine similarity search
create index if not exists charter_chunks_embedding_idx 
  on public.charter_chunks 
  using hnsw (embedding vector_cosine_ops);

-- 5. User Profiles (Auth Extension)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('citizen', 'agency_admin', 'platform_admin')) default 'citizen',
  agency_id uuid references public.agencies(id) on delete set null,
  full_name text not null,
  email text not null,
  phone text,
  consent_settings jsonb default '{"ephemeral_biometrics": true, "audit_logging": true, "ai_assisted": true}'::jsonb not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- 6. Service Requests Table
create table if not exists public.service_requests (
  id uuid primary key default gen_random_uuid(),
  tracking_number text unique not null,
  citizen_id uuid references public.profiles(id) on delete cascade not null,
  service_id uuid references public.services(id) on delete restrict not null,
  status text not null check (status in ('draft', 'submitted', 'under_review', 'action_required', 'approved', 'rejected', 'completed')) default 'draft',
  form_data jsonb default '{}'::jsonb not null,
  counter_fee numeric(10, 2) default 0.00 not null,
  notes text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- 7. Pending Actions Table (Confirmation-Gated Safety)
create table if not exists public.pending_actions (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references public.service_requests(id) on delete cascade,
  citizen_id uuid references public.profiles(id) on delete cascade not null,
  action_type text not null,
  payload jsonb not null,
  payload_hash text not null,
  status text not null check (status in ('pending', 'confirmed', 'cancelled', 'expired')) default 'pending',
  expires_at timestamptz not null default (now() + interval '15 minutes'),
  created_at timestamptz default now() not null
);

-- 8. Appointment Slots Table
create table if not exists public.appointment_slots (
  id uuid primary key default gen_random_uuid(),
  service_id uuid references public.services(id) on delete cascade not null,
  slot_time timestamptz not null,
  capacity integer not null default 5,
  booked_count integer not null default 0,
  created_at timestamptz default now() not null,
  constraint appointment_slots_service_slot_time_key unique (service_id, slot_time)
);

-- 9. Appointments Table
create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references public.service_requests(id) on delete set null,
  citizen_id uuid references public.profiles(id) on delete cascade not null,
  slot_id uuid references public.appointment_slots(id) on delete restrict not null,
  slot_time timestamptz not null,
  status text not null check (status in ('confirmed', 'rescheduled', 'cancelled', 'attended')) default 'confirmed',
  created_at timestamptz default now() not null
);

-- 10. Notifications Table
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  citizen_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  body text not null,
  is_read boolean default false not null,
  metadata jsonb default '{}'::jsonb not null,
  created_at timestamptz default now() not null
);

-- 11. Audit Logs Table (Immutable Civic Activity Log)
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  actor_role text not null,
  action text not null,
  target_type text not null,
  target_id text not null,
  details jsonb default '{}'::jsonb not null,
  created_at timestamptz default now() not null
);

-- 12. Chat Unanswered Log Table
create table if not exists public.chat_unanswered (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  user_query text not null,
  reason text not null,
  metadata jsonb default '{}'::jsonb not null,
  created_at timestamptz default now() not null
);

-- ====================================================================
-- Helper Functions & RPCs
-- ====================================================================

-- Function: Get Current User Role
create or replace function public.current_user_role()
returns text
language sql
stable
security definer
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- Function: Get Current User Agency
create or replace function public.current_user_agency()
returns uuid
language sql
stable
security definer
as $$
  select agency_id from public.profiles where id = auth.uid();
$$;

-- RPC: Match Charter Chunks (Vector Similarity Search)
create or replace function public.match_charter_chunks (
  query_embedding vector(768),
  match_threshold float default 0.65,
  match_count int default 5,
  filter_agency_id uuid default null,
  filter_service_id uuid default null
)
returns table (
  id uuid,
  agency_id uuid,
  service_id uuid,
  title text,
  content text,
  metadata jsonb,
  similarity float
)
language plpgsql
stable
security definer
as $$
begin
  return query
  select
    c.id,
    c.agency_id,
    c.service_id,
    c.title,
    c.content,
    c.metadata,
    1 - (c.embedding <=> query_embedding) as similarity
  from public.charter_chunks c
  where (filter_agency_id is null or c.agency_id = filter_agency_id)
    and (filter_service_id is null or c.service_id = filter_service_id)
    and (1 - (c.embedding <=> query_embedding)) >= match_threshold
  order by c.embedding <=> query_embedding
  limit match_count;
end;
$$;

-- ====================================================================
-- Row-Level Security (RLS) Configuration
-- ====================================================================

alter table public.agencies enable row level security;
alter table public.services enable row level security;
alter table public.charter_chunks enable row level security;
alter table public.profiles enable row level security;
alter table public.service_requests enable row level security;
alter table public.pending_actions enable row level security;
alter table public.appointment_slots enable row level security;
alter table public.appointments enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;
alter table public.chat_unanswered enable row level security;

-- Policies: Agencies
create policy "Agencies are viewable by everyone"
  on public.agencies for select using (true);

create policy "Agencies manageable by platform admin"
  on public.agencies for all using (public.current_user_role() = 'platform_admin');

-- Policies: Services
create policy "Active services viewable by everyone"
  on public.services for select using (is_active = true or public.current_user_role() in ('agency_admin', 'platform_admin'));

create policy "Services manageable by platform admin or agency admin"
  on public.services for all using (
    public.current_user_role() = 'platform_admin' or
    (public.current_user_role() = 'agency_admin' and agency_id = public.current_user_agency())
  );

-- Policies: Charter Chunks (RAG)
create policy "Charter chunks readable by everyone"
  on public.charter_chunks for select using (true);

create policy "Charter chunks insertable by agency or platform admins"
  on public.charter_chunks for all using (
    public.current_user_role() = 'platform_admin' or
    (public.current_user_role() = 'agency_admin' and agency_id = public.current_user_agency())
  );

-- Policies: Profiles
create policy "Citizens read and update own profile"
  on public.profiles for all using (auth.uid() = id);

create policy "Platform admin full access to profiles"
  on public.profiles for all using (public.current_user_role() = 'platform_admin');

-- Policies: Service Requests
create policy "Citizens manage own service requests"
  on public.service_requests for all using (citizen_id = auth.uid());

create policy "Agency admin view and manage agency requests"
  on public.service_requests for all using (
    public.current_user_role() = 'agency_admin' and
    service_id in (select id from public.services where agency_id = public.current_user_agency())
  );

create policy "Platform admin full access to requests"
  on public.service_requests for all using (public.current_user_role() = 'platform_admin');

-- Policies: Pending Actions
create policy "Citizens manage own pending actions"
  on public.pending_actions for all using (citizen_id = auth.uid());

-- Policies: Appointment Slots
create policy "Appointment slots viewable by everyone"
  on public.appointment_slots for select using (true);

create policy "Appointment slots managed by agency or platform admin"
  on public.appointment_slots for all using (
    public.current_user_role() = 'platform_admin' or
    (public.current_user_role() = 'agency_admin' and
     service_id in (select id from public.services where agency_id = public.current_user_agency()))
  );

-- Policies: Appointments
create policy "Citizens manage own appointments"
  on public.appointments for all using (citizen_id = auth.uid());

create policy "Agency admin view agency appointments"
  on public.appointments for select using (
    public.current_user_role() = 'agency_admin' and
    slot_id in (select s.id from public.appointment_slots s 
                join public.services sv on s.service_id = sv.id 
                where sv.agency_id = public.current_user_agency())
  );

-- Policies: Notifications
create policy "Citizens read own notifications"
  on public.notifications for select using (citizen_id = auth.uid());

create policy "Citizens update own notifications (mark as read)"
  on public.notifications for update using (citizen_id = auth.uid());

-- Policies: Audit Logs
create policy "System and users can insert audit logs"
  on public.audit_logs for insert with check (true);

create policy "Audit logs viewable by agency and platform admins"
  on public.audit_logs for select using (
    public.current_user_role() in ('agency_admin', 'platform_admin')
  );

-- Policies: Chat Unanswered
create policy "Everyone can record unanswered chat"
  on public.chat_unanswered for insert with check (true);

create policy "Unanswered chat logs viewable by admins"
  on public.chat_unanswered for select using (
    public.current_user_role() in ('agency_admin', 'platform_admin')
  );
