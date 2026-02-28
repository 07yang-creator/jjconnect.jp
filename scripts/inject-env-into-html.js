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
const placeholder = '6LdELc4rAAAAANnRvGLrrV1achd-aP8bxgr02EJn';

if (!recaptchaKey) {
  console.warn('No NEXT_PUBLIC_RECAPTCHA_SITE_KEY in .env, skipping injection');
  process.exit(0);
}

const root = path.resolve(process.cwd());
const htmlFiles = ['index.html', 'feedback.html', 'about.html'].filter((f) =>
  fs.existsSync(path.join(root, f))
);

let replaced = 0;
for (const file of htmlFiles) {
  const fp = path.join(root, file);
  let content = fs.readFileSync(fp, 'utf8');
  if (content.includes(placeholder)) {
    content = content.split(placeholder).join(recaptchaKey);
    fs.writeFileSync(fp, content);
    replaced++;
    console.log(`Injected recaptcha key into ${file}`);
  }
}
if (replaced === 0) {
  console.log('No replacements needed');
}
