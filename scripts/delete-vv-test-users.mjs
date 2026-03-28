#!/usr/bin/env node
/**
 * Deletes the 12 Supabase Auth users created for local V&V (2025-03-27 audit).
 * CASCADE removes related public.profiles, posts, comments, external_identities, etc.
 *
 * Usage: node scripts/delete-vv-test-users.mjs
 * Dry run: node scripts/delete-vv-test-users.mjs --dry-run
 *
 * If deleteUser fails (same DB issue as listUsers), use the SQL in the script comment
 * in Supabase SQL Editor (service role / dashboard).
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
if (!url || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

/** IDs from `npm run audit:test-users` (profiles-only), 2025-03-27 */
const VV_TEST_USER_IDS = [
  '0f5b2f37-c2d9-4b13-a664-bc8befdde11b',
  '4971391f-9f08-44ec-a2fe-537f4256eef3',
  '7929e686-166b-41e8-b116-0fe58fe95ede',
  '8552fc1c-bf5a-4970-af55-14a9cd017fa6',
  '8f800381-c12f-48d2-88f8-c0fa3b237509',
  '992ffe2a-7239-4858-8d61-c35d92d6a797',
  'c44d12f9-5919-4c1f-96e9-449de125374a',
  'd26b61a7-5cd5-43aa-9e78-f01052810329',
  'da745da5-176e-4a68-9076-25d668c6aa01',
  'e374cd2f-ef70-4749-a3d5-407c1ad184e0',
  'f1fc5cf4-bb8c-4a79-8127-842f6b97b83a',
  'f8c96911-ad4a-4b66-9da6-fad1b196362b',
];

const dryRun = process.argv.includes('--dry-run');
const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/*
 * SQL fallback (Supabase SQL Editor) if Auth API returns 5xx:
 *
 * DELETE FROM auth.users
 * WHERE id IN (
 *   '0f5b2f37-c2d9-4b13-a664-bc8befdde11b',
 *   ...
 * );
 */

let ok = 0;
let fail = 0;

for (const id of VV_TEST_USER_IDS) {
  if (dryRun) {
    console.log('[dry-run] would delete', id);
    ok++;
    continue;
  }
  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) {
    console.error('FAIL', id, error.message);
    fail++;
  } else {
    console.log('deleted', id);
    ok++;
  }
}

console.log(`\nDone: ${ok} ok, ${fail} failed${dryRun ? ' (dry-run)' : ''}.`);
if (fail > 0) {
  console.error(
    '\nAuth API cannot touch these users. Run the SQL file in Supabase SQL Editor:\n' +
      '  scripts/delete-vv-test-users.sql\n'
  );
  process.exit(1);
}
