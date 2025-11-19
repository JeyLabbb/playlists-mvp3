-- Ensure users table has expected columns and defaults; backfill plan/max_uses; create username index.
begin;

alter table public.users
  add column if not exists username text;

alter table public.users
  add column if not exists plan text;

alter table public.users
  add column if not exists usage_count integer default 0;

alter table public.users
  add column if not exists max_uses integer default 5;

alter table public.users
  add column if not exists terms_accepted_at timestamptz;

alter table public.users
  add column if not exists marketing_opt_in boolean default false;

update public.users
set plan = coalesce(plan, case when coalesce(is_founder, false) then 'founder' else 'free' end)
where plan is null
   or plan = '';

update public.users
set plan = 'founder'
where coalesce(is_founder, false) = true
  and plan <> 'founder';

update public.users
set plan = 'free'
where coalesce(is_founder, false) = false
  and plan is distinct from 'founder';

update public.users
set max_uses = 5
where plan = 'free'
  and (max_uses is null or max_uses <= 0);

alter table public.users
  alter column usage_count set default 0;

alter table public.users
  alter column max_uses set default 5;

alter table public.users
  alter column plan set default 'free';

update public.users
set marketing_opt_in = coalesce(marketing_opt_in, false);

update public.users
set terms_accepted_at = terms_accepted_at;

create unique index if not exists users_username_unique_ci
  on public.users (lower(username))
  where username is not null;

commit;


