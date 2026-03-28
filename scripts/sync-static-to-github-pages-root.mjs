#!/usr/bin/env node
/**
 * GitHub Pages often publishes the repository root; Next.js serves from public/.
 * After editing files under public/, run: npm run sync:static-root (or npm run build).
 *
 * - Canonical source: public/ (except index.html — see below).
 * - index.html stays at repo root only so Next app/page.tsx keeps serving "/".
 */
import { copyFileSync, mkdirSync, cpSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

function copyFile(fromRel, toRel) {
  const from = resolve(root, fromRel);
  const to = resolve(root, toRel);
  if (!existsSync(from)) {
    console.warn('[sync-static-root] skip (missing):', fromRel);
    return;
  }
  mkdirSync(dirname(to), { recursive: true });
  copyFileSync(from, to);
  console.log('[sync-static-root]', fromRel, '→', toRel);
}

function copyDir(fromRel, toRel) {
  const from = resolve(root, fromRel);
  const to = resolve(root, toRel);
  if (!existsSync(from)) {
    console.warn('[sync-static-root] skip dir (missing):', fromRel);
    return;
  }
  cpSync(from, to, { recursive: true });
  console.log('[sync-static-root]', fromRel, '→', toRel, '(dir)');
}

copyFile('public/navbar.js', 'navbar.js');
copyFile('public/navbar.css', 'navbar.css');
copyDir('public/brand', 'brand');

const pairs = [
  ['public/cloudflare-image-url.js', 'cloudflare-image-url.js'],
  ['public/home.html', 'home.html'],
  ['public/services.html', 'services.html'],
  ['public/product.html', 'product.html'],
  ['public/login.html', 'login.html'],
  ['public/property_report_info.html', 'property_report_info.html'],
  ['public/property_report.html', 'property_report.html'],
  ['public/mansion_info.html', 'mansion_info.html'],
  ['public/raft_info.html', 'raft_info.html'],
  ['public/admin-console.html', 'admin-console.html'],
  ['public/admin.html', 'admin.html'],
  ['public/admin_dashboard.html', 'admin_dashboard.html'],
  // Marketing & legacy static (phase 2 — canonical in public/)
  ['public/about.html', 'about.html'],
  ['public/gettingready.html', 'gettingready.html'],
  ['public/publish.html', 'publish.html'],
  ['public/category.html', 'category.html'],
  ['public/profile.html', 'profile.html'],
  ['public/raft_home.html', 'raft_home.html'],
  ['public/mansion_home.html', 'mansion_home.html'],
  ['public/terms.html', 'terms.html'],
  ['public/ai.html', 'ai.html'],
  ['public/feedback.html', 'feedback.html'],
  ['public/backend-status.html', 'backend-status.html'],
  ['public/joint-mamori-submission.html', 'joint-mamori-submission.html'],
];

for (const [from, to] of pairs) {
  copyFile(from, to);
}

const cfg = resolve(root, 'public/config.js');
if (existsSync(cfg)) {
  copyFile('public/config.js', 'config.js');
}

console.log('[sync-static-root] done. (index.html is root-only — not in public/ for Next "/" )');
