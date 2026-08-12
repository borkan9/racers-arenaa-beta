begin;

-- Competition data is exposed through API routes only. This prevents clients
-- from bypassing API sanitisation and reading raw GPS route data directly.
revoke select on table public.races from anon, authenticated;
revoke select on table public.leaderboard_entries from anon, authenticated;

-- Service-role access remains explicit for server API/database helpers.
grant select, insert, update on table public.races to service_role;
grant select, insert, update, delete on table public.leaderboard_entries to service_role;

commit;
