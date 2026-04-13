#!/usr/local/bin/node
import { createClient } from '@supabase/supabase-js';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { loadEnvConfig } = require('@next/env');

const __dirname = dirname(fileURLToPath(import.meta.url));
loadEnvConfig(resolve(__dirname, '..'), true);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = 'agent_test_v6@jjconnect.jp';
const password = process.env.VV_TEST_PASSWORD || 'Password123!';

if (!url || !serviceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  console.log(`Creating test user: ${email}...`);
  
  // 1. Delete if exists
  const { data: users } = await admin.auth.admin.listUsers();
  const existing = users.users.find(u => u.email === email);
  if (existing) {
    console.log('Deleting existing user...');
    await admin.auth.admin.deleteUser(existing.id);
  }

  // 2. Create confirmed user
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { username: 'agent_test_v6', full_name: 'Agent Test V6' }
  });

  if (error) throw error;
  const userId = data.user.id;
  console.log(`User created. ID: ${userId}`);

  // 3. Upsert profile with Admin role
  const now = new Date().toISOString();
  const { error: profileError } = await admin.from('profiles').upsert({
    id: userId,
    role: 'A',
    role_level: 'A',
    is_authorized: true,
    country_region: 'JP',
    preferred_language: 'ja',
    call_name: 'Agent Test V6',
    display_name: 'Agent Test V6',
    email_verified_at: now,
    basic_profile_completed_at: now
  });

  if (profileError) throw profileError;
  console.log('Profile created and promoted to Admin (A).');
  console.log('\nSuccess! You can now log in at https://www.jjconnect.jp/login.html');
  console.log(`Email: ${email}`);
  console.log(`Password: ${password}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
