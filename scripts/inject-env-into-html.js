#!/usr/bin/env node
/**
 * Injects env values into static HTML files (reCAPTCHA key, publish inline Supabase JSON, etc.)
 * Run before deploy: node scripts/inject-env-into-html.js
 *
 * Loads .env then .env.local from project root (.env.local overrides).
 */
const fs = require('fs');
const path = require('path');

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const content = fs.readFileSync(filePath, 'utf8');
  const env = {};
  for (const line of content.split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) {
      env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
    }
  }
  return env;
}

function loadEnv() {
  const root = process.cwd();
  const fromEnv = parseEnvFile(path.resolve(root, '.env'));
  const fromLocal = parseEnvFile(path.resolve(root, '.env.local'));
  if (!fs.existsSync(path.resolve(root, '.env')) && !fs.existsSync(path.resolve(root, '.env.local'))) {
    console.warn('.env / .env.local not found, using process.env only');
  }
  return { ...process.env, ...fromEnv, ...fromLocal };
}

const env = loadEnv();
const recaptchaKey = env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || env.RECAPTCHA_SITE_KEY || '';
const placeholder = env.RECAPTCHA_PLACEHOLDER || '__RECAPTCHA_SITE_KEY__';
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL || '';
const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || '';

const root = path.resolve(process.cwd());
let replaced = 0;

// 1. Inject reCAPTCHA key into index, feedback, about
if (recaptchaKey) {
  const recaptchaFiles = ['index.html', 'feedback.html', 'about.html'].filter((f) =>
    fs.existsSync(path.join(root, f))
  );
  for (const file of recaptchaFiles) {
    const fp = path.join(root, file);
    let content = fs.readFileSync(fp, 'utf8');
    if (content.includes(placeholder)) {
      content = content.split(placeholder).join(recaptchaKey);
      fs.writeFileSync(fp, content);
      replaced++;
      console.log(`Injected recaptcha key into ${file}`);
    }
  }
} else {
  console.warn('No NEXT_PUBLIC_RECAPTCHA_SITE_KEY in .env, skipping recaptcha injection');
}

// 2. Inject Supabase into publish.html (<script id="jjc-publish-inline-config" type="application/json">)
function injectPublishInlineConfig(relativePath) {
  const fp = path.join(root, relativePath);
  if (!fs.existsSync(fp)) {
    console.warn(`[inject] skip (missing): ${relativePath}`);
    return false;
  }
  let content = fs.readFileSync(fp, 'utf8');
  const re =
    /(<script[^>]*\bid="jjc-publish-inline-config"[^>]*\btype="application\/json"[^>]*>)([\s\S]*?)(<\/script>)/i;
  if (!re.test(content)) {
    console.warn(`[inject] no jjc-publish-inline-config block in ${relativePath}`);
    return false;
  }
  const patch =
    supabaseUrl && supabaseAnonKey
      ? JSON.stringify({ supabaseUrl, supabaseAnonKey })
      : '{}';
  content = content.replace(re, `$1${patch}$3`);
  fs.writeFileSync(fp, content);
  console.log(`Injected Supabase inline config into ${relativePath}`);
  return true;
}

if (supabaseUrl && supabaseAnonKey) {
  if (injectPublishInlineConfig('public/publish.html')) replaced++;
  if (injectPublishInlineConfig('publish.html')) replaced++;
} else {
  console.warn(
    'No NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY in .env(.local), skipping publish.html inline injection (use npm run generate:public-config for jjc-default-config.js)'
  );
}

if (replaced === 0) {
  console.log('No replacements made (or no matching placeholders)');
}
