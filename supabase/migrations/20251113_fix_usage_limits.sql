-- Ensure free users have finite usage limits and defaults are enforced.

begin;

update public.users
  set max_uses = 5
where plan = 'free'
  and (max_uses is null or max_uses <= 0);

alter table if exists public.users
  alter column max_uses set default 5;

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

commit;


