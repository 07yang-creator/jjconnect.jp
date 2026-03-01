#!/usr/bin/env node
/**
 * Injects env values into static HTML files (reCAPTCHA key, etc.)
 * Run before deploy: node scripts/inject-env-into-html.js
 *
 * Requires dotenv: npm install dotenv
 * Loads .env from project root.
 */
const fs = require('fs');
const path = require('path');

function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) {
    console.warn('.env not found, using process.env');
    return process.env;
  }
  const content = fs.readFileSync(envPath, 'utf8');
  const env = {};
  for (const line of content.split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) {
      env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
    }
  }
  return { ...process.env, ...env };
}

const env = loadEnv();
const recaptchaKey = env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || env.RECAPTCHA_SITE_KEY || '';
const placeholder = env.RECAPTCHA_PLACEHOLDER || '__RECAPTCHA_SITE_KEY__';
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL || '';
const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || '';
const configPlaceholder = '__JJCONNECT_CONFIG__';

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

// 2. Inject Supabase config into publish.html (for static deploy / Live Server)
if (supabaseUrl && supabaseAnonKey) {
  const publishPath = path.join(root, 'publish.html');
  if (fs.existsSync(publishPath)) {
    const configObj = JSON.stringify({ supabaseUrl, supabaseAnonKey });
    let content = fs.readFileSync(publishPath, 'utf8');
    if (content.includes(configPlaceholder)) {
      content = content.split(configPlaceholder).join(configObj);
      fs.writeFileSync(publishPath, content);
      replaced++;
      console.log('Injected Supabase config into publish.html');
    }
  }
} else {
  console.warn('No NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY in .env, skipping publish.html config injection');
}

if (replaced === 0) {
  console.log('No replacements needed');
}
