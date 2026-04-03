#!/usr/bin/env node
/**
 * Copy repo-root WordPress trees into public/ so Next/Vercel can emit real
 * directories under .vercel/output/static (symlinks to ../wp-content break the collector).
 */
import { cpSync, existsSync, rmSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

function copyTree(name) {
  const src = resolve(root, name);
  const dest = resolve(root, 'public', name);
  if (!existsSync(src)) {
    console.warn(`[copy-wordpress-into-public] skip (missing): ${name}`);
    return;
  }
  rmSync(dest, { recursive: true, force: true });
  cpSync(src, dest, { recursive: true });
  console.log(`[copy-wordpress-into-public] ${name}/ → public/${name}/`);
}

copyTree('wp-content');
copyTree('wp-includes');
