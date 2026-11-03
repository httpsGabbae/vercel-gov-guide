-- ====================================================================
-- GovGuide PH: Auth & Citizen Profiles Schema Migration
-- Migration: 20261031000002_auth_and_profiles.sql
-- Description: Configures Supabase auth user synchronization, profiles
--              table extensions for citizen details, and RLS policies.
-- ====================================================================

-- 1. Ensure public.profiles table exists with base columns
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('citizen', 'agency_admin', 'platform_admin')) default 'citizen',
  agency_id uuid references public.agencies(id) on delete set null,
  full_name text not null default '',
  email text not null default '',
  phone text,
  consent_settings jsonb default '{"ephemeral_biometrics": true, "audit_logging": true, "ai_assisted": true}'::jsonb not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- 2. Add citizen identity & demographic columns to public.profiles
alter table public.profiles add column if not exists first_name text;
alter table public.profiles add column if not exists middle_name text;
alter table public.profiles add column if not exists last_name text;
alter table public.profiles add column if not exists suffix text;
alter table public.profiles add column if not exists birth_date text;
alter table public.profiles add column if not exists civil_status text;
alter table public.profiles add column if not exists barangay text;
alter table public.profiles add column if not exists city text;
alter table public.profiles add column if not exists category text;
alter table public.profiles add column if not exists maiden_name text;
alter table public.profiles add column if not exists father_name text;
alter table public.profiles add column if not exists mother_maiden_name text;
alter table public.profiles add column if not exists id_records jsonb default '[]'::jsonb;
alter table public.profiles add column if not exists metadata jsonb default '{}'::jsonb;

-- 3. Automatic Profile Creation on User Signup (auth.users trigger)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_full_name text;
  v_first_name text;
  v_last_name text;
  v_role text;
begin
  -- Extract full_name or construct from first/last
  v_first_name := coalesce(new.raw_user_meta_data->>'first_name', '');
  v_last_name  := coalesce(new.raw_user_meta_data->>'last_name', '');
  v_full_name  := coalesce(
    new.raw_user_meta_data->>'full_name',
    nullif(trim(v_first_name || ' ' || v_last_name), ''),
    new.raw_user_meta_data->>'name',
    split_part(coalesce(new.email, 'citizen'), '@', 1)
  );

  v_role := coalesce(new.raw_user_meta_data->>'role', 'citizen');
  if v_role not in ('citizen', 'agency_admin', 'platform_admin') then
    v_role := 'citizen';
  end if;

  insert into public.profiles (
    id,
    role,
    full_name,
    first_name,
    last_name,
    email,
    phone,
    consent_settings,
    created_at,
    updated_at
  )
  values (
    new.id,
    v_role,
    v_full_name,
    nullif(v_first_name, ''),
    nullif(v_last_name, ''),
    coalesce(new.email, ''),
    coalesce(new.phone, new.raw_user_meta_data->>'phone'),
    '{"ephemeral_biometrics": true, "audit_logging": true, "ai_assisted": true}'::jsonb,
    now(),
    now()
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = case when public.profiles.full_name = '' then excluded.full_name else public.profiles.full_name end,
    updated_at = now();

  return new;
end;
$$;

-- 4. Bind trigger to auth.users table
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 5. Row-Level Security Policies for Profiles
alter table public.profiles enable row level security;

drop policy if exists "Citizens read own profile" on public.profiles;
create policy "Citizens read own profile"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "Citizens insert own profile" on public.profiles;
create policy "Citizens insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "Citizens update own profile" on public.profiles;
create policy "Citizens update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "Admins full access to profiles" on public.profiles;
create policy "Admins full access to profiles"
  on public.profiles for all
  using (
    coalesce(
      (select role from public.profiles where id = auth.uid()),
      'citizen'
    ) in ('agency_admin', 'platform_admin')
  );

-- 6. Helper RPC Function to get authenticated user's own profile safely
create or replace function public.get_my_profile()
returns setof public.profiles
language sql
security definer
stable
set search_path = public
as $$
  select * from public.profiles where id = auth.uid() limit 1;
$$;
