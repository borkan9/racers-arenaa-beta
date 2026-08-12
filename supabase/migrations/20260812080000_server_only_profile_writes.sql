begin;

-- Profile mutations are validated by /api/profile and executed server-side.
revoke insert, update, delete on table public.users from authenticated;
revoke insert, update, delete on table public.users from anon;

drop policy if exists users_insert_policy on public.users;
drop policy if exists users_update_policy on public.users;

-- Public profile discovery remains readable for the current Explore feature.
grant select on table public.users to anon, authenticated;

-- Server API/admin retains the required access.
grant select, insert, update on table public.users to service_role;

commit;
