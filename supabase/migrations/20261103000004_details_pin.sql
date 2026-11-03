-- Secondary access gate. No PIN hashes or unlock grants are exposed through RLS.
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

create table public.citizen_details_pins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  pin_hash text not null,
  failed_attempts integer not null default 0,
  locked_until timestamptz,
  created_at timestamptz not null default now()
);
create table public.citizen_details_unlocks (
  token_hash text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null
);
create index on public.citizen_details_unlocks(user_id);
alter table public.citizen_details_pins enable row level security;
alter table public.citizen_details_unlocks enable row level security;
revoke all on public.citizen_details_pins, public.citizen_details_unlocks from anon, authenticated;

-- Called only by the server after verifying the Supabase access token.
-- Row locking serializes attempts across tabs and server instances.
create or replace function public.details_pin_gate(
  p_user_id uuid, p_action text, p_pin text default null, p_token_hash text default null
) returns jsonb language plpgsql security definer
set search_path = pg_catalog, public, extensions
as $$
declare
  pin_row public.citizen_details_pins%rowtype;
  expiry timestamptz;
begin
  if p_action = 'status' then
    return jsonb_build_object('configured', exists(select 1 from public.citizen_details_pins where user_id = p_user_id));
  end if;
  if p_action = 'validate' then
    return jsonb_build_object('ok', exists(select 1 from public.citizen_details_unlocks
      where user_id = p_user_id and token_hash = p_token_hash and expires_at > clock_timestamp()));
  end if;
  if p_action = 'lock' then
    delete from public.citizen_details_unlocks where user_id = p_user_id and token_hash = p_token_hash;
    return jsonb_build_object('ok', true);
  end if;
  if p_action not in ('setup', 'unlock') or p_pin is null or p_pin !~ '^[0-9]{4}$'
    or p_token_hash is null or p_token_hash !~ '^[a-f0-9]{64}$' then
    return jsonb_build_object('ok', false, 'code', 'INVALID_INPUT');
  end if;
  if p_action = 'setup' then
    insert into public.citizen_details_pins(user_id, pin_hash)
      values(p_user_id, crypt(p_pin, gen_salt('bf', 10))) on conflict do nothing;
    if not found then
      return jsonb_build_object('ok', false, 'code', 'ALREADY_CONFIGURED');
    end if;
  else
    select * into pin_row from public.citizen_details_pins where user_id = p_user_id for update;
    if not found then return jsonb_build_object('ok', false, 'code', 'SETUP_REQUIRED'); end if;
    if pin_row.locked_until > clock_timestamp() then
      return jsonb_build_object('ok', false, 'code', 'LOCKED', 'retryAfter',
        ceil(extract(epoch from (pin_row.locked_until - clock_timestamp()))));
    end if;
    if pin_row.locked_until is not null then pin_row.failed_attempts := 0; end if;
    if crypt(p_pin, pin_row.pin_hash) <> pin_row.pin_hash then
      update public.citizen_details_pins set failed_attempts = pin_row.failed_attempts + 1,
        locked_until = case when pin_row.failed_attempts + 1 >= 5 then clock_timestamp() + interval '15 minutes' else null end
        where user_id = p_user_id;
      if pin_row.failed_attempts + 1 >= 5 then
        return jsonb_build_object('ok', false, 'code', 'LOCKED', 'retryAfter', 900);
      end if;
      return jsonb_build_object('ok', false, 'code', 'WRONG_PIN');
    end if;
    update public.citizen_details_pins set failed_attempts = 0, locked_until = null where user_id = p_user_id;
  end if;
  expiry := clock_timestamp() + interval '15 minutes';
  delete from public.citizen_details_unlocks where user_id = p_user_id and expires_at <= clock_timestamp();
  insert into public.citizen_details_unlocks(token_hash, user_id, expires_at) values(p_token_hash, p_user_id, expiry);
  return jsonb_build_object('ok', true, 'expiresAt', expiry);
end;
$$;
revoke all on function public.details_pin_gate(uuid,text,text,text) from public, anon, authenticated;
grant execute on function public.details_pin_gate(uuid,text,text,text) to service_role;
