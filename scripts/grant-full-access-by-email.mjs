#!/usr/bin/env node
/**
 * Grant full app access for one Supabase Auth user by email:
 *   • Confirm email on auth.users
 *   • profiles: is_authorized=true, role='A', onboarding / upgrade completion fields
 *
 * Env (.env / .env.local via @next/env):
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 * Usage:
 *   node scripts/grant-full-access-by-email.mjs yanogin@icloud.com
 *   npm run grant:full-access -- yanogin@icloud.com
 *   npm run grant:full-access -- --dry-run yanogin@icloud.com
 */
import { createClient } from '@supabase/supabase-js';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { loadEnvConfig } = require('@next/env');

const __dirname = dirname(fileURLToPath(import.meta.url));
loadEnvConfig(resolve(__dirname, '..'), true);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

const dryRun = process.argv.includes('--dry-run');
const positional = process.argv.filter((a) => !a.startsWith('-') && !a.endsWith('.mjs'));
const emailArg = positional[positional.length - 1];
const targetEmail = (emailArg || 'yanogin@icloud.com').trim().toLowerCase();

if (!url || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function findUserByEmail(emailLower) {
  let page = 1;
  const perPage = 200;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(`listUsers: ${error.message}`);
    const users = data?.users ?? [];
    const hit = users.find((u) => (u.email || '').toLowerCase() === emailLower);
    if (hit) return hit;
    if (users.length < perPage) return null;
    page += 1;
  }
}

async function main() {
  console.log('Target:', targetEmail, dryRun ? '(dry-run)' : '');

  const user = await findUserByEmail(targetEmail);
  if (!user?.id) {
    console.error('No auth user found with this email. They must sign up once first.');
    process.exit(1);
  }

  const userId = user.id;
  console.log('User id:', userId);

  if (dryRun) {
    console.log('[dry-run] Would confirm email + upsert profiles (role A, is_authorized, gates).');
    return;
  }

  const { error: authErr } = await admin.auth.admin.updateUserById(userId, {
    email_confirm: true,
  });
  if (authErr) throw new Error(`updateUserById: ${authErr.message}`);

  const now = new Date().toISOString();
  const profilePayload = {
    role: 'A',
    is_authorized: true,
    country_region: 'Japan',
    preferred_language: 'English',
    call_name: 'Yano',
    basic_profile_completed_at: now,
    upgrade_profile_completed_at: now,
    updated_at: now,
  };

  const { data: existing, error: selErr } = await admin
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .maybeSingle();

  if (selErr) throw new Error(`profiles select: ${selErr.message}`);

  if (existing) {
    const { error: upErr } = await admin.from('profiles').update(profilePayload).eq('id', userId);
    if (upErr) throw new Error(`profiles update: ${upErr.message}`);
    console.log('Updated profiles row.');
  } else {
    const { error: insErr } = await admin.from('profiles').insert({
      id: userId,
      ...profilePayload,
    });
    if (insErr) throw new Error(`profiles insert: ${insErr.message}`);
    console.log('Inserted profiles row.');
  }

  console.log('Done. Full access: role A, is_authorized, email confirmed, profile gates satisfied.');
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
