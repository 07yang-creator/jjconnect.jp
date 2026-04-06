#!/usr/bin/env node
/**
 * WordPress static exports often copy assets as literal filenames like
 * `hooks.min.js?ver=abc`. Browsers must request `/path/hooks.min.js?ver=abc`
 * (real query string). HTML exports incorrectly use `%3Fver=` inside the path,
 * so the server looks for a non-existent file and returns HTML → SyntaxError.
 *
 * This script:
 * 1. Renames `file?ver=...` (and similar) to `file` under public/wp-*.
 * 2. Replaces `%3F` with `?` in public HTML so URLs are valid.
 */
import { existsSync, readFileSync, readdirSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

function walkRename(dir) {
  if (!existsSync(dir)) return;
  const names = readdirSync(dir);
  for (const name of names) {
    if (name === '.DS_Store') continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      walkRename(full);
      continue;
    }
    if (!name.includes('?')) continue;
    const base = name.split('?')[0];
    const dest = join(dir, base);
    if (existsSync(dest)) {
      console.warn(`[normalize-wp-static] skip (target exists): ${dest}`);
      continue;
    }
    renameSync(full, dest);
    console.log(`[normalize-wp-static] ${name} → ${base}`);
  }
}

function fixHtmlPercent3F(filePath) {
  let s = readFileSync(filePath, 'utf8');
  if (!s.includes('%3F')) return;
  const t = s.split('%3F').join('?');
  writeFileSync(filePath, t);
  console.log(`[normalize-wp-static] fixed %3F in ${filePath}`);
}

function walkHtml(dir) {
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir)) {
    if (name === '.DS_Store') continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walkHtml(full);
    else if (name.endsWith('.html')) fixHtmlPercent3F(full);
  }
}

for (const tree of ['wp-content', 'wp-includes']) {
  walkRename(join(root, 'public', tree));
}

walkHtml(join(root, 'public'));
for (const top of ['index.html', 'about.html', 'feedback.html', 'login.html']) {
  const p = join(root, top);
  if (existsSync(p)) fixHtmlPercent3F(p);
}
