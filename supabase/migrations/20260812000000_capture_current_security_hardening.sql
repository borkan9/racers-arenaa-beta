-- Capture the security posture already applied to the production database.

alter table public.users enable row level security;

drop policy if exists users_select_policy on public.users;
create policy users_select_policy
on public.users
for select
to anon, authenticated
using (true);

drop policy if exists users_insert_policy on public.users;
create policy users_insert_policy
on public.users
for insert
to authenticated
with check ((select auth.uid()) = id);

drop policy if exists users_update_policy on public.users;
create policy users_update_policy
on public.users
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

revoke insert, update, delete on table public.users from anon, authenticated;
grant insert (id, username, avatar, bio) on public.users to authenticated;
grant update (username, avatar, bio) on public.users to authenticated;
grant select on table public.users to anon, authenticated;
revoke insert, delete on table public.users from service_role;
grant select, update on table public.users to service_role;

do $$
declare
  policy_name text;
begin
  for policy_name in
    select policyname
    from pg_catalog.pg_policies
    where schemaname = 'public'
      and tablename = 'races'
      and cmd = 'INSERT'
  loop
    execute format('drop policy %I on public.races', policy_name);
  end loop;
end
$$;

revoke insert on table public.races from anon, authenticated;
grant select, insert, update on table public.races to service_role;

do $$
declare
  policy_name text;
begin
  for policy_name in
    select policyname
    from pg_catalog.pg_policies
    where schemaname = 'public'
      and tablename = 'leaderboard_entries'
      and cmd = 'INSERT'
  loop
    execute format('drop policy %I on public.leaderboard_entries', policy_name);
  end loop;
end
$$;

revoke insert on table public.leaderboard_entries from anon, authenticated;
grant select, insert, update, delete on table public.leaderboard_entries to service_role;
