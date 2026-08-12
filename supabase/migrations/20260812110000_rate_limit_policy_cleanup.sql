begin;

revoke all privileges on table public.api_rate_limits from service_role;
grant select, insert, update, delete on table public.api_rate_limits to service_role;

drop policy if exists service_role_rate_limits on public.api_rate_limits;
create policy service_role_rate_limits
on public.api_rate_limits
for all
to service_role
using (true)
with check (true);

commit;
