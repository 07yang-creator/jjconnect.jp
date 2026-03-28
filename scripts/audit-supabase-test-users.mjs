#!/usr/bin/env node
/**
 * Read-only audit: auth users vs public.profiles vs app gate rules (Supabase auth mode).
 *
 * Usage (from repo root):
 *   npm run audit:test-users
 *
 * Loads env via `@next/env` (same as Next.js).
 * If Auth Admin `listUsers` fails (e.g. "Database error finding users"), falls back to
 * scanning `public.profiles` only — use Supabase SQL Editor to compare with `auth.users`.
 */
import { createClient } from '@supabase/supabase-js';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { loadEnvConfig } = require('@next/env');

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

loadEnvConfig(root, true);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!url || !serviceKey) {
  console.error(
    'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (.env / .env.local).'
  );
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function basicComplete(p) {
  if (!p) return false;
  return Boolean(
    p.country_region?.trim() &&
      p.preferred_language?.trim() &&
      p.call_name?.trim()
  );
}

function isUpgradedRole(role) {
  return Boolean(role && role !== 'T');
}

async function fetchAllUsers() {
  const out = [];
  let page = 1;
  const perPage = 200;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    out.push(...data.users);
    if (data.users.length < perPage) break;
    page += 1;
  }
  return out;
}

/** Columns that exist on all migrated schemas (no optional `profiles.email`). */
const PROFILE_SELECT =
  'id, role, is_authorized, country_region, preferred_language, call_name, upgrade_profile_completed_at, email_verified_at';

async function fetchAllProfiles() {
  const pageSize = 1000;
  let from = 0;
  const all = [];
  for (;;) {
    const { data, error } = await admin
      .from('profiles')
      .select(PROFILE_SELECT)
      .order('id', { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw error;
    if (!data?.length) break;
    all.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return all;
}

/** @type {Array<Record<string, unknown>>} */
const rows = [];
let mode = 'auth+profiles';

try {
  const users = await fetchAllUsers();
  console.log(`Found ${users.length} auth user(s) (Auth Admin API).\n`);

  for (const u of users) {
    const { data: prof, error: perr } = await admin
      .from('profiles')
      .select(PROFILE_SELECT)
      .eq('id', u.id)
      .maybeSingle();

    const profile = perr ? null : prof;
    const role = profile?.role ?? 'T';
    const emailOk = Boolean(u.email_confirmed_at);
    const basic = basicComplete(profile);
    const upgrade = Boolean(profile?.upgrade_profile_completed_at);
    const upgraded = isUpgradedRole(role);

    let publishFreeOk = basic;
    if (publishFreeOk && upgraded) {
      publishFreeOk = upgrade && emailOk;
    }

    const identities = u.identities ?? [];

    const issues = [];
    if (!profile) issues.push('no_profiles_row');
    if (!u.email) issues.push('no_email');
    if (!basic) issues.push('basic_profile_incomplete');
    if (upgraded && !emailOk) issues.push('upgraded_role_needs_email_confirmed');
    if (upgraded && !upgrade) issues.push('upgraded_role_needs_upgrade_profile_completed_at');

    rows.push({
      id: u.id,
      email: u.email ?? '(null)',
      has_profile: Boolean(profile),
      basic,
      upgrade,
      role,
      authz: profile?.is_authorized === true,
      email_conf: Boolean(u.email_confirmed_at),
      publish_free: publishFreeOk,
      issues: issues.length ? issues.join(';') : 'ok',
      last_sign_in: u.last_sign_in_at ? 'yes' : 'no',
      providers: identities.map((i) => i.provider).join(',') || '(none)',
    });
  }
} catch (err) {
  mode = 'profiles-only';
  const msg = err?.message || String(err);
  const code = err?.code ?? err?.name;
  console.error('Auth Admin listUsers failed:', code || '', msg);
  console.error(`
This usually means GoTrue cannot read auth.users (project DB/trigger/data issue), not a bad API key.
Check: Supabase Dashboard → Logs → Auth / Postgres for the underlying error.
If you inserted users via raw SQL, a bad row or trigger on auth.users can break listing.

Falling back to public.profiles only (no last_sign_in / OAuth providers; email_conf uses profiles.email_verified_at as proxy; no profiles.email column required).
---\n`);

  const profiles = await fetchAllProfiles();
  console.log(`Found ${profiles.length} profile row(s).\n`);

  for (const profile of profiles) {
    const role = profile?.role ?? 'T';
    const emailOk = Boolean(profile?.email_verified_at);
    const basic = basicComplete(profile);
    const upgrade = Boolean(profile?.upgrade_profile_completed_at);
    const upgraded = isUpgradedRole(role);

    let publishFreeOk = basic;
    if (publishFreeOk && upgraded) {
      publishFreeOk = upgrade && emailOk;
    }

    const issues = [];
    if (!basic) issues.push('basic_profile_incomplete');
    if (upgraded && !emailOk) {
      issues.push('upgraded_role_needs_email_verified_at_on_profile');
    }
    if (upgraded && !upgrade) issues.push('upgraded_role_needs_upgrade_profile_completed_at');

    rows.push({
      id: profile.id,
      email: `(profiles) ${profile.id}`,
      has_profile: true,
      basic,
      upgrade,
      role,
      authz: profile?.is_authorized === true,
      email_conf: emailOk,
      publish_free: publishFreeOk,
      issues: issues.length ? issues.join(';') : 'ok',
      last_sign_in: 'n/a',
      providers: 'n/a',
    });
  }
}

if (mode === 'profiles-only') {
  rows.sort((a, b) => String(a.id).localeCompare(String(b.id)));
} else {
  rows.sort((a, b) => String(a.email || '').localeCompare(String(b.email || '')));
}

console.table(
  rows.map((r) => ({
    email: r.email,
    has_profile: r.has_profile,
    basic: r.basic,
    upgrade: r.upgrade,
    role: r.role,
    authz: r.authz,
    email_conf: r.email_conf,
    publish_free: r.publish_free,
    issues: r.issues,
    last_sign_in: r.last_sign_in,
  }))
);

const bad = rows.filter((r) => r.issues !== 'ok');
if (bad.length) {
  console.log('\n--- Rows with issues (not plain "ok") ---');
  for (const r of bad) {
    console.log(`${r.email} → ${r.issues}`);
  }
}

console.log(
  `\nMode: ${mode}. ` +
    'Legend: publish_free = likely OK for free posts if auth email matches profile gates. ' +
    'Personal categories still need is_authorized or role A.\n'
);

if (mode === 'profiles-only') {
  console.log(
    'SQL sanity check (run in Supabase SQL Editor): compare counts and orphans.\n' +
      '  SELECT (SELECT count(*) FROM auth.users) AS auth_users, (SELECT count(*) FROM public.profiles) AS profiles;\n' +
      '  SELECT u.id, u.email FROM auth.users u LEFT JOIN public.profiles p ON p.id = u.id WHERE p.id IS NULL;\n'
  );
}
