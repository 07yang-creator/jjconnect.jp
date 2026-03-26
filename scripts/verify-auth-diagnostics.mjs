#!/usr/bin/env node
/**
 * GET /api/auth/diagnostics (dev: no secret; prod: set AUTH_DIAGNOSTICS_SECRET + x-auth-diagnostics header).
 * Usage: VERIFY_AUTH_URL=http://localhost:3000 npm run verify:auth
 */
const base = (process.env.VERIFY_AUTH_URL || 'http://localhost:3000').replace(/\/$/, '');
const url = `${base}/api/auth/diagnostics`;
const headers = {};
const secret = process.env.AUTH_DIAGNOSTICS_SECRET?.trim();
if (secret) headers['x-auth-diagnostics'] = secret;

const res = await fetch(url, { headers });
const text = await res.text();
let json;
try {
  json = JSON.parse(text);
} catch {
  console.error(text);
  process.exit(1);
}

console.log(JSON.stringify(json, null, 2));

if (!res.ok) process.exit(1);
if (json.authProviderEnvMismatch === true) {
  console.error('\nauthProviderEnvMismatch: set JJC_AUTH_PROVIDER and NEXT_PUBLIC_AUTH_PROVIDER to the same mode.');
  process.exit(2);
}
