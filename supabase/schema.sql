-- Ardrix database setup. Run once in Supabase: SQL Editor > New query > paste all of this > Run.
-- Every table uses row level security, so each player can only ever see their own rows.

-- 1. Each player's progress, stored as one JSON document.
create table if not exists public.user_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.user_state enable row level security;
create policy "read own state"   on public.user_state for select using (auth.uid() = user_id);
create policy "insert own state" on public.user_state for insert with check (auth.uid() = user_id);
create policy "update own state" on public.user_state for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "delete own state" on public.user_state for delete using (auth.uid() = user_id);

-- 2. Devices that asked for reminders.
create table if not exists public.push_subs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  tz text not null default 'America/Chicago',
  times int[] not null default '{8,12,18}',
  enabled boolean not null default true,
  last_slot text,
  created_at timestamptz not null default now()
);
alter table public.push_subs enable row level security;
create policy "own subs" on public.push_subs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 3. Remembers which deadline and meeting alerts were already sent (only the server writes here).
create table if not exists public.sent_alerts (
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id text not null,
  kind text not null,
  sent_at timestamptz not null default now(),
  primary key (user_id, item_id, kind)
);
alter table public.sent_alerts enable row level security;

-- 4. "Delete my account": removes the signed-in user. Their rows above are deleted with them.
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
