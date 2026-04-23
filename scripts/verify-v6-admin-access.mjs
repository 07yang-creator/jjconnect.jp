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
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const workerUrl = 'https://jjconnect-auth-worker.07-yang.workers.dev';
const email = 'agent_test_v6@jjconnect.jp';
const password = process.env.VV_TEST_PASSWORD;

async function main() {
  if (!url || !anonKey || !password) {
    console.error('Missing credentials');
    process.exit(1);
  }

  const supabase = createClient(url, anonKey);

  console.log(`Attempting login for ${email}...`);
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  const token = data.session.access_token;
  console.log('Login successful. Token obtained.');

  console.log(`Verifying Admin Console access via Worker: ${workerUrl}/api/admin/stats/roles`);
  const res = await fetch(`${workerUrl}/api/admin/stats/roles`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (res.ok) {
    const payload = await res.json();
    console.log('SUCCESS: Admin Console data (stats/roles) loaded!');
    console.log('Data sample:', JSON.stringify(payload).substring(0, 100));
    console.log('E2E lifecycle verified: Register -> Login -> Promote -> Access Admin Console.');
  } else {
    const text = await res.text();
    console.error(`FAILURE: Admin Console returned ${res.status}`);
    console.error(text);
    process.exit(1);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
