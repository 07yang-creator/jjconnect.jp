#!/usr/bin/env node
/**
 * V&V test users: vv1{role}@<domain> matching Role Matrix (12 roles).
 * - Creates users via Auth Admin + profiles (onboarding + email_verified_at).
 * - Sets profiles.role to A, B, CB, VB, T, S.writer, WN, W1, W2, W3, S_writer.
 * - Upserts public.role_permissions for those role_level codes (resource slugs
 *   aligned with workers/lib/roleMatrix.js RESOURCE_MAP / Sheet sync).
 *
 * Env (.env.local):
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *   VV_TEST_PASSWORD        — shared dev password (required)
 *   VV_TEST_EMAIL_DOMAIN    — default jjconnect.jp
 *
 * Usage:
 *   npm run seed:vv-test-users
 *   npm run seed:vv-test-users -- --dry-run
 *   npm run seed:vv-test-users -- --skip-matrix   (only users)
 *   npm run seed:vv-test-users -- --skip-users     (only role_permissions)
 */
import { createClient } from '@supabase/supabase-js';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { loadEnvConfig } = require('@next/env');

const __dirname = dirname(fileURLToPath(import.meta.url));
loadEnvConfig(resolve(__dirname, '..'), true);

const RESOURCES = [
  'news',
  'announcement',
  'activity',
  'blog_brief_1',
  'blog_brief_2',
  'blog_brief_3',
  'blog_full_1',
  'blog_full_2',
  'blog_full_3',
  'mono_bb',
  'mono_cb',
  'mono_vb',
  'ai_tool',
];

/** @param {Record<string, string>} partial resource → R | R/W | allow | deny */
function permRow(partial) {
  /** @type {Record<string, string>} */
  const o = {};
  for (const r of RESOURCES) o[r] = 'deny';
  Object.assign(o, partial);
  return o;
}

/**
 * Permissions from your auth matrix (spreadsheet). Uses worker slug names.
 * "—" → deny. ✓ on AI → allow.
 */
const MATRIX_BY_ROLE = {
  A: permRow({ announcement: 'R/W', activity: 'R/W' }),

  B: permRow({
    news: 'R',
    blog_brief_1: 'R/W',
    blog_brief_2: 'R/W',
    blog_brief_3: 'R/W',
    mono_bb: 'R',
    mono_cb: 'R',
    mono_vb: 'R',
    ai_tool: 'allow',
  }),

  CB: permRow({
    news: 'R',
    blog_brief_1: 'R',
    blog_brief_2: 'R',
    blog_brief_3: 'R',
    blog_full_1: 'R',
    blog_full_2: 'R',
    blog_full_3: 'R',
    mono_cb: 'R',
    ai_tool: 'allow',
  }),

  VB: permRow({
    news: 'R',
    blog_brief_1: 'R',
    blog_brief_2: 'R',
    blog_brief_3: 'R',
    blog_full_1: 'R',
    blog_full_2: 'R',
    blog_full_3: 'R',
    mono_bb: 'R',
    mono_cb: 'R',
    mono_vb: 'R',
    ai_tool: 'allow',
  }),

  T: permRow({
    news: 'R',
    blog_brief_1: 'R',
    blog_brief_2: 'R',
    blog_brief_3: 'R',
  }),

  S: permRow({
    news: 'R',
    blog_brief_1: 'R',
    blog_brief_2: 'R',
    blog_brief_3: 'R',
    blog_full_1: 'R',
    blog_full_2: 'R',
    blog_full_3: 'R',
    mono_bb: 'R/W',
    mono_cb: 'R/W',
    ai_tool: 'allow',
  }),

  W: permRow({}),

  WN: permRow({
    news: 'R/W',
    mono_cb: 'R',
  }),

  W1: permRow({
    announcement: 'R/W',
    activity: 'R/W',
    blog_brief_3: 'R/W',
    blog_full_1: 'R/W',
    blog_full_3: 'R/W',
    mono_cb: 'R',
  }),

  W2: permRow({
    announcement: 'R/W',
    blog_brief_2: 'R/W',
    blog_brief_3: 'R/W',
    blog_full_2: 'R/W',
    blog_full_3: 'R/W',
    mono_cb: 'R',
  }),

  W3: permRow({
    announcement: 'R/W',
    blog_brief_3: 'R/W',
    blog_full_3: 'R/W',
  }),

  S_writer: permRow({
    news: 'R',
    announcement: 'R/W',
    activity: 'R/W',
    blog_brief_1: 'R/W',
    blog_brief_2: 'R/W',
    blog_brief_3: 'R/W',
    blog_full_1: 'R/W',
    blog_full_2: 'R/W',
    blog_full_3: 'R/W',
    mono_cb: 'R',
    ai_tool: 'allow',
  }),
};

/**
 * vv1 + localPart @ domain  ↔  profiles.role / role_permissions.role_level
 * Email local parts are lowercase; S_writer maps to vv1s-writer.
 */
const VV_ACCOUNTS = [
  { localPart: 'a', roleLevel: 'A', label: 'admin' },
  { localPart: 'b', roleLevel: 'B', label: 'business buyer' },
  { localPart: 'cb', roleLevel: 'CB', label: 'casual buyer' },
  { localPart: 'vb', roleLevel: 'VB', label: 'VIP buyer' },
  { localPart: 't', roleLevel: 'T', label: 'traveller' },
  { localPart: 's', roleLevel: 'S', label: 'seller' },
  { localPart: 'w', roleLevel: 'W', label: 'writer' },
  { localPart: 'wn', roleLevel: 'WN', label: 'NewsWriter' },
  { localPart: 'w1', roleLevel: 'W1', label: '1 Finance' },
  { localPart: 'w2', roleLevel: 'W2', label: '2 Real Estate' },
  { localPart: 'w3', roleLevel: 'W3', label: '3 Misc' },
  { localPart: 's-writer', roleLevel: 'S_writer', label: 'S-writer' },
];

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const password = process.env.VV_TEST_PASSWORD?.trim();
const domain = process.env.VV_TEST_EMAIL_DOMAIN?.trim() || 'jjconnect.jp';

const dryRun = process.argv.includes('--dry-run');
const skipMatrix = process.argv.includes('--skip-matrix');
const skipUsers = process.argv.includes('--skip-users');

if (!url || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}
if (!skipUsers && !password) {
  console.error('Set VV_TEST_PASSWORD (or pass --skip-users).');
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function emailFor(localPart) {
  return `vv1${localPart}@${domain}`;
}

async function upsertMatrix() {
  const rows = [];
  for (const [role_level, perms] of Object.entries(MATRIX_BY_ROLE)) {
    for (const [resource, permission] of Object.entries(perms)) {
      rows.push({ role_level, resource, permission });
    }
  }
  if (dryRun) {
    console.log(`[dry-run] Would upsert ${rows.length} role_permissions rows (12 roles × resources).`);
    return;
  }
  const { error } = await admin.from('role_permissions').upsert(rows, {
    onConflict: 'role_level,resource',
  });
  if (error) throw new Error(`role_permissions upsert: ${error.message}`);
  console.log(`Upserted ${rows.length} role_permissions rows.`);
}

async function seedUsers() {
  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const acc of VV_ACCOUNTS) {
    const email = emailFor(acc.localPart);
    const callName = `VV ${acc.label}`;
    if (dryRun) {
      console.log(`[dry-run] ${email} → role ${acc.roleLevel}`);
      continue;
    }

    const { data: userData, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { vv_test: true, role_label: acc.label },
    });

    if (createErr) {
      const msg = createErr.message || String(createErr);
      if (/already|duplicate|registered/i.test(msg)) {
        console.warn('skip (exists):', email, '- delete in Dashboard/SQL or pick another domain');
        skipped++;
        continue;
      }
      console.error('FAIL create:', email, msg);
      failed++;
      continue;
    }

    const userId = userData.user?.id;
    if (!userId) {
      console.error('FAIL no id:', email);
      failed++;
      continue;
    }

    const now = new Date().toISOString();
    const { error: upErr } = await admin
      .from('profiles')
      .update({
        role: acc.roleLevel,
        country_region: 'JP',
        preferred_language: 'ja',
        call_name: callName,
        display_name: callName,
        basic_profile_completed_at: now,
        email_verified_at: now,
        is_authorized: acc.roleLevel === 'A',
      })
      .eq('id', userId);

    if (upErr) {
      console.error('WARN profile update:', email, upErr.message);
    }

    console.log('ok:', email, acc.roleLevel, userId);
    created++;
  }

  if (!dryRun) {
    console.log(`\nUsers: ${created} created, ${skipped} skipped, ${failed} failed.`);
    if (failed > 0) process.exit(1);
  }
}

async function main() {
  console.log(`Domain: ${domain}  (override with VV_TEST_EMAIL_DOMAIN)\n`);

  if (!skipMatrix) {
    await upsertMatrix();
  } else {
    console.log('Skipped role_permissions (--skip-matrix).');
  }

  if (!skipUsers) {
    await seedUsers();
  } else {
    console.log('Skipped users (--skip-users).');
  }

  if (dryRun) {
    process.exit(0);
  }

  console.log(
    '\nLogin: vv1a@… through vv1s-writer@… with VV_TEST_PASSWORD. ' +
      'Clear VV_TEST_PASSWORD from .env.local when done.\n'
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
