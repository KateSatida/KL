-- ════════════════════════════════════════════════════════════════════════════
-- Wedding Guestbook: Supabase setup
-- Paste this whole file into Supabase → SQL Editor → New query → Run.
-- Safe to run again (it only creates what is missing / refreshes permissions).
--
-- STEP 1: change the email below to the email you will use to log in to /admin.html
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.admins (email text primary key);
alter table public.admins enable row level security;   -- not readable from the website
insert into public.admins (email) values ('you@example.com') on conflict do nothing;
--                                         ^^^^^^^^^^^^^^^ CHANGE ME

-- true when the logged-in user is one of the admins above
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where lower(email) = lower(auth.jwt() ->> 'email'));
$$;


-- ── Photo booth: guests can add, only admins can see ───────────────────────────
-- The picture itself is stored in the `image` column (a JPEG as a data URL),
-- so guests never need permission to read anything back.
create table if not exists public.photos (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name       text not null default '' check (char_length(name) <= 40),
  note       text not null default '' check (char_length(note) <= 1300),
  path       text check (path ~ '^[0-9a-f-]{36}\.jpg$'),          -- only used by early versions
  image      text check (image like 'data:image/jpeg;base64,%' and char_length(image) <= 4000000)
);
-- upgrade tables made by an earlier version of this file
alter table public.photos add column if not exists image text
  check (image like 'data:image/jpeg;base64,%' and char_length(image) <= 4000000);
alter table public.photos alter column path drop not null;
alter table public.photos enable row level security;
drop policy if exists "guests add photos" on public.photos;
drop policy if exists "admin reads photos" on public.photos;
drop policy if exists "admin deletes photos" on public.photos;
create policy "guests add photos"    on public.photos for insert to anon, authenticated with check (true);
create policy "admin reads photos"   on public.photos for select to authenticated using (public.is_admin());
create policy "admin deletes photos" on public.photos for delete to authenticated using (public.is_admin());


-- ── Bar message wall: everyone can read and write, admins can delete ───────────
create table if not exists public.messages (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name       text not null default '' check (char_length(name) <= 40),
  text       text not null check (char_length(text) between 1 and 500)
);
alter table public.messages enable row level security;
drop policy if exists "everyone reads messages" on public.messages;
drop policy if exists "guests add messages" on public.messages;
drop policy if exists "admin deletes messages" on public.messages;
create policy "everyone reads messages" on public.messages for select to anon, authenticated using (true);
create policy "guests add messages"     on public.messages for insert to anon, authenticated with check (true);
create policy "admin deletes messages"  on public.messages for delete to authenticated using (public.is_admin());


-- ── Single station: public cards; guests add via add_single() and can delete their own ──
create table if not exists public.singles (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  name        text not null check (char_length(name) between 1 and 40),
  instagram   text not null check (instagram ~ '^[A-Za-z0-9._]{1,30}$'),
  bio         text not null default '' check (char_length(bio) <= 140),
  path        text not null check (path ~ '^[0-9a-f-]{36}\.jpg$'),
  owner_token uuid not null default gen_random_uuid()   -- secret, never readable from the website
);
alter table public.singles enable row level security;
drop policy if exists "everyone reads singles" on public.singles;
drop policy if exists "admin deletes singles" on public.singles;
create policy "everyone reads singles" on public.singles for select to anon, authenticated using (true);
create policy "admin deletes singles"  on public.singles for delete to authenticated using (public.is_admin());
-- hide owner_token: the website may only read these columns
revoke select on public.singles from anon, authenticated;
grant select (id, created_at, name, instagram, bio, path) on public.singles to anon, authenticated;
revoke insert, update on public.singles from anon, authenticated;

create or replace function public.add_single(p_name text, p_instagram text, p_bio text, p_path text)
returns json language plpgsql security definer set search_path = public as $$
declare r public.singles;
begin
  insert into public.singles (name, instagram, bio, path)
  values (trim(p_name), trim(p_instagram), coalesce(trim(p_bio), ''), p_path)
  returning * into r;
  return json_build_object('id', r.id, 'token', r.owner_token);
end $$;

create or replace function public.delete_own_single(p_id uuid, p_token uuid)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  delete from public.singles where id = p_id and owner_token = p_token;
  return found;   -- (the image file stays in storage; delete it from the dashboard if you like)
end $$;

grant execute on function public.add_single(text, text, text, text) to anon, authenticated;
grant execute on function public.delete_own_single(uuid, uuid) to anon, authenticated;


-- ── Wishing tree: everyone can read and hang a wish, admins can delete ─────────
create table if not exists public.wishes (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name       text not null default '' check (char_length(name) <= 40),
  text       text not null check (char_length(text) between 1 and 140),
  color      text not null default '#ff5d8f' check (color ~ '^#[0-9a-fA-F]{6}$')
);
alter table public.wishes enable row level security;
drop policy if exists "everyone reads wishes" on public.wishes;
drop policy if exists "guests add wishes" on public.wishes;
drop policy if exists "admin deletes wishes" on public.wishes;
create policy "everyone reads wishes" on public.wishes for select to anon, authenticated using (true);
create policy "guests add wishes"     on public.wishes for insert to anon, authenticated with check (true);
create policy "admin deletes wishes"  on public.wishes for delete to authenticated using (public.is_admin());


-- ── Dance floor song requests: everyone can read and add, admins can delete ────
create table if not exists public.song_requests (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name       text not null default '' check (char_length(name) <= 40),
  song       text not null check (char_length(song) between 1 and 200)   -- song name or a Spotify/YouTube link
);
alter table public.song_requests enable row level security;
drop policy if exists "everyone reads songs" on public.song_requests;
drop policy if exists "guests add songs" on public.song_requests;
drop policy if exists "admin deletes songs" on public.song_requests;
create policy "everyone reads songs" on public.song_requests for select to anon, authenticated using (true);
create policy "guests add songs"     on public.song_requests for insert to anon, authenticated with check (true);
create policy "admin deletes songs"  on public.song_requests for delete to authenticated using (public.is_admin());


-- ── Guest names: no sign-up; one name per phone, one phone per name ──────────────
-- Each phone has a random secret token (kept in the browser). claim_name() gives
-- the name to the first phone that asks; that phone keeps it and can't take another.
-- Delete a row (admin page → Guest names) to free both the name and the phone.
create table if not exists public.guest_names (
  id         uuid primary key default gen_random_uuid(),
  name_key   text not null unique,          -- lower-case, single spaces: "Mai" = "mai" = " MAI "
  name       text not null check (char_length(name) between 1 and 24),
  token      uuid not null,
  created_at timestamptz not null default now()
);
alter table public.guest_names enable row level security;
drop policy if exists "admin reads names" on public.guest_names;
drop policy if exists "admin deletes names" on public.guest_names;
create policy "admin reads names"   on public.guest_names for select to authenticated using (public.is_admin());
create policy "admin deletes names" on public.guest_names for delete to authenticated using (public.is_admin());
revoke all on public.guest_names from anon, authenticated;
grant select (id, name_key, name, created_at), delete on public.guest_names to authenticated;

create or replace function public.claim_name(p_name text, p_token uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  v_name text := regexp_replace(trim(coalesce(p_name, '')), '\s+', ' ', 'g');
  v_key  text := lower(v_name);
begin
  if char_length(v_name) not between 1 and 24 then return false; end if;
  if exists (select 1 from public.guest_names where token = p_token and name_key <> v_key) then
    return false;                                  -- this phone already has another name
  end if;
  insert into public.guest_names (name_key, name, token) values (v_key, v_name, p_token)
  on conflict (name_key) do nothing;
  return exists (select 1 from public.guest_names where name_key = v_key and token = p_token);
end $$;
grant execute on function public.claim_name(text, uuid) to anon, authenticated;


-- ── Image storage ─────────────────────────────────────────────────────────────
-- photos  : private (only admins can view), max 5 MB, JPEG only
-- singles : public (shown on the projector),  max 2 MB, JPEG only
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('photos',  'photos',  false, 5242880, array['image/jpeg']),
  ('singles', 'singles', true,  2097152, array['image/jpeg'])
on conflict (id) do update set public = excluded.public,
  file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "guests upload photos" on storage.objects;
drop policy if exists "admin reads photo files" on storage.objects;
drop policy if exists "admin deletes photo files" on storage.objects;
drop policy if exists "guests upload singles" on storage.objects;
drop policy if exists "admin deletes single files" on storage.objects;
create policy "guests upload photos"       on storage.objects for insert to anon, authenticated with check (bucket_id = 'photos');
create policy "admin reads photo files"    on storage.objects for select to authenticated using (bucket_id = 'photos' and public.is_admin());
create policy "admin deletes photo files"  on storage.objects for delete to authenticated using (bucket_id = 'photos' and public.is_admin());
create policy "guests upload singles"      on storage.objects for insert to anon, authenticated with check (bucket_id = 'singles');
-- uploads read the new file back, so the (public) singles files must be readable
drop policy if exists "everyone reads single files" on storage.objects;
create policy "everyone reads single files" on storage.objects for select to anon, authenticated using (bucket_id = 'singles');
create policy "admin deletes single files" on storage.objects for delete to authenticated using (bucket_id = 'singles' and public.is_admin());


-- Tell Supabase's API to pick up the new tables and functions right away
notify pgrst, 'reload schema';
