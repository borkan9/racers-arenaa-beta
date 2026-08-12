begin;

create table if not exists public.api_rate_limits (
  key text primary key,
  window_start timestamptz not null default now(),
  request_count integer not null default 0 check (request_count >= 0)
);

alter table public.api_rate_limits enable row level security;
revoke all privileges on table public.api_rate_limits from public, anon, authenticated;
grant select, insert, update, delete on table public.api_rate_limits to service_role;

create or replace function public.consume_api_rate_limit(
  p_key text,
  p_window_seconds integer,
  p_max_requests integer
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  current_row public.api_rate_limits%rowtype;
  now_ts timestamptz := now();
begin
  if p_key is null or length(p_key) = 0 or p_window_seconds <= 0 or p_max_requests <= 0 then
    return false;
  end if;

  select * into current_row
  from public.api_rate_limits
  where key = p_key
  for update;

  if not found then
    insert into public.api_rate_limits(key, window_start, request_count)
    values (p_key, now_ts, 1)
    on conflict (key) do nothing;

    if found then
      return true;
    end if;

    select * into current_row
    from public.api_rate_limits
    where key = p_key
    for update;
  end if;

  if current_row.window_start <= now_ts - make_interval(secs => p_window_seconds) then
    update public.api_rate_limits
    set window_start = now_ts, request_count = 1
    where key = p_key;
    return true;
  end if;

  if current_row.request_count >= p_max_requests then
    return false;
  end if;

  update public.api_rate_limits
  set request_count = request_count + 1
  where key = p_key;
  return true;
end;
$$;

revoke all on function public.consume_api_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_api_rate_limit(text, integer, integer) to service_role;

commit;
