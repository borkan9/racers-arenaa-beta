begin;

-- Make existing usernames case-insensitively unique without deleting accounts.
with ranked as (
  select
    id,
    username,
    row_number() over (
      partition by lower(username)
      order by created_at asc, id asc
    ) as rn
  from public.users
  where username is not null
), duplicates as (
  select id, username
  from ranked
  where rn > 1
)
update public.users u
set username = left(d.username, 23) || '_' || left(replace(u.id::text, '-', ''), 6)
from duplicates d
where u.id = d.id;

create unique index if not exists users_username_lower_unique_idx
  on public.users (lower(username))
  where username is not null;

-- Keep auth-trigger profile creation compatible with unique usernames and fix search_path.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  base_username text;
  candidate text;
begin
  base_username := lower(regexp_replace(split_part(coalesce(new.email, 'racer'), '@', 1), '[^a-zA-Z0-9_]', '', 'g'));
  if length(base_username) < 3 then
    base_username := 'racer';
  end if;

  candidate := left(base_username, 30);
  if exists (select 1 from public.users where lower(username) = lower(candidate)) then
    candidate := left(base_username, 23) || '_' || left(replace(new.id::text, '-', ''), 6);
  end if;

  insert into public.users (id, created_at, username, avatar, bio)
  values (
    new.id,
    now(),
    candidate,
    new.raw_user_meta_data->>'avatar_url',
    null
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.rls_auto_enable() from public, anon, authenticated;

-- Consolidate race SELECT policy, avoid exposing flagged/private routes, and avoid per-row auth.uid re-evaluation.
drop policy if exists users_read_own_races on public.races;
drop policy if exists users_read_public_races on public.races;
drop policy if exists races_select_policy on public.races;
create policy races_select_policy
on public.races
for select
to anon, authenticated
using (
  ((select auth.uid()) = user_id)
  or (is_private = false and status = 'FINISHED')
);

-- Least privilege for exposed tables.
revoke all privileges on table public.users from anon, authenticated;
grant select on table public.users to anon, authenticated;
grant insert (id, username, avatar, bio) on public.users to authenticated;
grant update (username, avatar, bio) on public.users to authenticated;

revoke all privileges on table public.races from anon, authenticated;
grant select on table public.races to anon, authenticated;

revoke all privileges on table public.leaderboard_entries from anon, authenticated;
grant select on table public.leaderboard_entries to anon, authenticated;

revoke all privileges on table public.users from service_role;
grant select, update on table public.users to service_role;

revoke all privileges on table public.races from service_role;
grant select, insert, update on table public.races to service_role;

revoke all privileges on table public.leaderboard_entries from service_role;
grant select, insert, update, delete on table public.leaderboard_entries to service_role;

create index if not exists leaderboard_entries_race_id_idx
  on public.leaderboard_entries (race_id);

-- Avatar bucket limits and ownership policies.
update storage.buckets
set
  file_size_limit = 5242880,
  allowed_mime_types = array[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif'
  ]::text[]
where id = 'avatars';

drop policy if exists "Public read avatars 1oj01fe_0" on storage.objects;
drop policy if exists "Users can update own avatar 1oj01fe_0" on storage.objects;
drop policy if exists "Users can update own avatar 1oj01fe_1" on storage.objects;
drop policy if exists "Users can upload own avatar 1oj01fe_0" on storage.objects;
drop policy if exists avatars_public_read on storage.objects;
drop policy if exists avatars_owner_insert on storage.objects;
drop policy if exists avatars_owner_update on storage.objects;
drop policy if exists avatars_owner_delete on storage.objects;

create policy avatars_public_read
on storage.objects
for select
to public
using (bucket_id = 'avatars');

create policy avatars_owner_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy avatars_owner_update
on storage.objects
for update
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy avatars_owner_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

commit;
