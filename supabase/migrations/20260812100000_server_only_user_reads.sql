begin;

-- Public profile data is exposed through sanitised API routes only so
-- profile_locked cannot be bypassed with direct PostgREST reads.
revoke select on table public.users from anon, authenticated;

grant select, insert, update on table public.users to service_role;

commit;
