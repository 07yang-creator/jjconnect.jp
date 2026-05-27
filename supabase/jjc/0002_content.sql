-- =============================================================================
-- jjconnect.jp — content system (C2). Apply to the SHARED Supabase project after
-- 0001_jjc_init.sql, in the `jjc` schema (already exposed via the Data API).
-- =============================================================================
-- The clean replacement for the removed TipTap publishing: learning/info content
-- as **markdown** (one canonical format, one sanitized render path — no dual
-- JSON+HTML model). Trilingual (one row per locale, linked by translation_group).
--
-- jjconnect.jp is ALL-PUBLIC for now, so content authored with visibility='public'
-- is world-readable. The members/premium tiers + required_role_level are designed
-- in now but only enforced once gating (Stripe / membership) is wired — premium
-- currently resolves to admin-only (see RLS). Write access = admin (role_level 'A').
-- =============================================================================

create table if not exists jjc.content_items (
  id                  uuid primary key default gen_random_uuid(),
  slug                text not null,
  locale              text not null default 'ja',          -- ja | zh | en
  translation_group   uuid,                                 -- rows sharing this are translations of one another
  content_type        text not null default 'article',      -- article | news | announcement | event | page
  topic               text,                                 -- finance | real_estate | misc | ... (free text for now)
  title               text not null,
  summary             text,                                 -- public excerpt / "brief"
  body_markdown       text not null default '',
  cover_image_url     text,
  status              text not null default 'draft',         -- draft | published
  visibility          text not null default 'public',        -- public | members | premium
  required_role_level text,                                   -- optional finer gate (matrix role); null = none
  author_id           uuid references auth.users(id) on delete set null,
  published_at        timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (locale, slug)
);

create index if not exists idx_jjc_content_status_visibility on jjc.content_items (status, visibility);
create index if not exists idx_jjc_content_locale on jjc.content_items (locale);
create index if not exists idx_jjc_content_group on jjc.content_items (translation_group);

alter table jjc.content_items enable row level security;

-- READ (policies are OR-ed): published public → everyone; published members → any
-- signed-in user; admins + the author see everything (incl. drafts). Premium has no
-- public/member read policy yet, so it resolves to admin-only until billing wires one.
create policy jjc_content_read_public on jjc.content_items
  for select to anon, authenticated
  using (status = 'published' and visibility = 'public');

create policy jjc_content_read_members on jjc.content_items
  for select to authenticated
  using (status = 'published' and visibility = 'members');

create policy jjc_content_read_admin_author on jjc.content_items
  for select to authenticated
  using (jjc.is_admin() or author_id = auth.uid());

-- WRITE: admins only for now (staff/writer roles from the matrix come later).
create policy jjc_content_write on jjc.content_items
  for all to authenticated
  using (jjc.is_admin())
  with check (jjc.is_admin());

create or replace function jjc.touch_updated_at()
  returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger trg_jjc_content_touch
  before update on jjc.content_items
  for each row execute function jjc.touch_updated_at();

grant select on jjc.content_items to anon, authenticated;
grant insert, update, delete on jjc.content_items to authenticated;
