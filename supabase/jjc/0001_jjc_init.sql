-- =============================================================================
-- jjconnect.jp — `jjc` schema (Movement B: auth on the SHARED Supabase project)
-- =============================================================================
-- Targets the SAME Supabase project as jjconnect.online (shared `auth.users` =
-- single sign-on), but every jjconnect.jp object lives in a dedicated `jjc`
-- schema, fully isolated from online's `public.*` auction tables.
--
-- DRAFT — apply to the shared project in coordination with the online side:
--   * one migration source of truth (Supabase CLI history is linear), and
--   * expose the `jjc` schema in the project's API settings (Settings → API →
--     Exposed schemas) so PostgREST / supabase-js can reach it via
--     `supabase.schema('jjc')`.
--
-- jjconnect.jp content is ALL PUBLIC for now; role gating + paid tiers (Stripe)
-- come later. The role vocabulary mirrors the "Role Level JJCONNECT.jp" matrix:
--   A  admin            B  business buyer   CB casual buyer   VB VIP buyer
--   T  traveller (DEFAULT)                  S  seller         W  writer
--   WN news-writer      W1/W2/W3 topic writers (Finance/RealEstate/Misc)
--   S-writer
-- Resources for the future gate: 新闻 / 公告 / 活动, Blog Brief & Blog Full
-- (Finance / Real Estate / Misc), Mono Page CB / VB, AI Tool.
-- ("Mono Page BB" from the old matrix is legacy and intentionally dropped.)
--
-- NOTE: no trigger on auth.users — jjconnect.jp creates its jjc.profiles row
-- app-side after signup, so online's signups are never touched.
-- =============================================================================

create schema if not exists jjc;
grant usage on schema jjc to anon, authenticated;

-- ---------- Profiles (one per jjconnect.jp user; keyed to the shared auth.users)
-- role_level is free text on purpose: the matrix is still being revised, so we
-- avoid an enum that would force a migration on every change. Default 'T'.
create table if not exists jjc.profiles (
  id                 uuid primary key references auth.users(id) on delete cascade,
  email              text,
  display_name       text,
  role_level         text not null default 'T',
  country_region     text,
  preferred_language text,
  onboarded_at       timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- ---------- Helpers (SECURITY DEFINER: read jjc.profiles without RLS recursion)
create or replace function jjc.role_level()
  returns text language sql stable security definer set search_path = jjc, public
as $$ select role_level from jjc.profiles where id = auth.uid() $$;

create or replace function jjc.is_admin()
  returns boolean language sql stable security definer set search_path = jjc, public
as $$ select exists (select 1 from jjc.profiles where id = auth.uid() and role_level = 'A') $$;

-- ---------- Row-Level Security ----------
alter table jjc.profiles enable row level security;

-- A user reads/edits only their own row; an admin reads/edits all.
create policy jjc_profiles_read on jjc.profiles
  for select to authenticated using (id = auth.uid() or jjc.is_admin());
create policy jjc_profiles_insert on jjc.profiles
  for insert to authenticated with check (id = auth.uid() or jjc.is_admin());
create policy jjc_profiles_update on jjc.profiles
  for update to authenticated
  using (id = auth.uid() or jjc.is_admin())
  with check (id = auth.uid() or jjc.is_admin());

-- Only an admin (or the service_role / provisioning path, where auth.uid() is
-- null) may change role_level — a user cannot self-promote.
create or replace function jjc.guard_profile_role()
  returns trigger language plpgsql security definer set search_path = jjc, public
as $$
begin
  if auth.uid() is not null and not jjc.is_admin()
     and new.role_level is distinct from old.role_level then
    raise exception 'only an admin may change role_level';
  end if;
  return new;
end $$;

create trigger trg_jjc_guard_profile_role
  before update on jjc.profiles
  for each row execute function jjc.guard_profile_role();

-- ---------- Grants (RLS is the real gate; roles still need table access) ------
grant select, insert, update on jjc.profiles to authenticated;
grant execute on function jjc.role_level() to anon, authenticated;
grant execute on function jjc.is_admin()   to anon, authenticated;

-- ---------- After applying (hand-off) ----------
-- 1) Expose `jjc` in Supabase API settings (so supabase-js .schema('jjc') works).
-- 2) Create your account through Supabase Auth, then promote yourself to admin:
--      insert into jjc.profiles (id, email, role_level)
--      values ('<your auth.users uuid>', '<you@email>', 'A')
--      on conflict (id) do update set role_level = 'A';
