-- Fix usage limits for free plan and introduce username index on users

begin;

-- Ensure username column exists on users table
alter table if exists public.users
  add column if not exists username text;

-- Backfill free-plan users that were missing max_uses (should default to 5)
update public.users
  set max_uses = 5
where plan = 'free'
  and (max_uses is null or max_uses <= 0);

-- Set default max_uses for new free-plan users
alter table if exists public.users
  alter column max_uses set default 5;

-- Add a check constraint so free users always have a finite limit
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'users_max_uses_free_not_null'
  ) then
    alter table public.users
      add constraint users_max_uses_free_not_null
      check (
        case
          when plan = 'free' then max_uses is not null
          else true
        end
      );
  end if;
end
$$;

-- Create a case-insensitive unique index for usernames
create unique index if not exists users_username_unique_ci
  on public.users (lower(username))
  where username is not null;

commit;


