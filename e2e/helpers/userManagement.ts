import { expect, type Page } from '@playwright/test';

export type TestUser = {
  email: string;
  password: string;
  username: string;
  firstName: string;
  lastName: string;
  callName: string;
};

type MePayload = {
  isLoggedIn: boolean;
  userData?: {
    id?: string;
    email?: string;
    email_verified?: boolean;
    is_authorized?: boolean;
  } | null;
};

type PublicConfigPayload = {
  authProvider?: string;
};

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export function buildDisposableUser(): TestUser {
  const domain = requiredEnv('E2E_TEST_EMAIL_DOMAIN');
  const password = process.env.E2E_TEST_PASSWORD?.trim() || 'Jjconnect#E2E12345';
  const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const username = `vv_e2e_${suffix}`;
  const firstName = 'VV';
  const lastName = `E2E${suffix.slice(-4)}`;
  return {
    email: `${username}@${domain}`,
    password,
    username,
    firstName,
    lastName,
    callName: `VV-${suffix.slice(-4)}`,
  };
}

export async function registerUser(page: Page, user: TestUser) {
  await page.goto('/login.html?create=1&next=/publish/request-access');
  await page.fill('#reg-firstname', user.firstName);
  await page.fill('#reg-lastname', user.lastName);
  await page.fill('#reg-username', user.username);
  await page.fill('#reg-email', user.email);
  await page.fill('#reg-password', user.password);
  await page.fill('#reg-confirm-password', user.password);
  await page.check('#terms');
  await page.click('#reg-create-account-btn');

  await Promise.race([
    page.waitForURL(/\/onboarding(\?|$)/, { timeout: 45_000 }),
    page.waitForURL(/\/publish\/request-access(\?|$)/, { timeout: 45_000 }),
    page.waitForSelector('.message-box', { timeout: 45_000 }),
  ]).catch(() => null);

  const messageBox = page.locator('.message-box');
  if (await messageBox.isVisible().catch(() => false)) {
    const text = (await messageBox.textContent())?.trim() || '';
    if (/failed|error|wrong|network/i.test(text)) {
      throw new Error(`Registration did not complete: ${text}`);
    }
  }
}

export async function completeOnboarding(page: Page, user: TestUser) {
  if (!/\/onboarding(\?|$)/.test(page.url())) {
    return;
  }
  await page.fill('#countryRegion', 'Japan / Tokyo');
  await page.selectOption('#preferredLanguage', 'en');
  await page.fill('#callName', user.callName);
  await page.getByRole('button', { name: 'Continue' }).click();
}

export async function submitPublishAccessRequest(page: Page) {
  if (!/\/publish\/request-access(\?|$)/.test(page.url())) {
    await page.goto('/publish/request-access');
  }
  await page.waitForURL(/\/publish\/request-access(\?|$)/);
  await page.fill('#full_name', 'VV E2E User');
  await page.fill('#org_name', 'VV E2E Org');
  await page.selectOption('#org_type', 'company');
  await page.fill('#role_in_org', 'QA Engineer');
  await page.fill('#org_url', 'https://example.com');
  await page.fill(
    '#intent_summary',
    'I want to publish verified market updates and event notes for our testing workflow.'
  );
  await page.selectOption('#publishing_experience', 'occasional');
  await page.fill('#language_pref', 'English');
  await page.check('input[name="attestation_accepted"]');
  await page.getByRole('button', { name: 'Submit request' }).click();
  await expect(page.getByText('Thank you')).toBeVisible();
  await expect(page.getByText('We received your request.')).toBeVisible();
}

export async function getMe(page: Page): Promise<MePayload> {
  const response = await page.request.get('/api/me');
  expect(response.ok()).toBeTruthy();
  return (await response.json()) as MePayload;
}

export async function getAuthProvider(page: Page): Promise<string> {
  const response = await page.request.get('/api/public-config');
  if (!response.ok()) return 'supabase';
  const json = (await response.json()) as PublicConfigPayload;
  return (json.authProvider || 'supabase').toLowerCase();
}

export async function ensureLoggedIn(page: Page) {
  await expect
    .poll(async () => {
      const me = await getMe(page);
      return me.isLoggedIn;
    })
    .toBeTruthy();
}

export async function elevateViaTestApi(page: Page, params: { userId: string; email: string }) {
  const token = requiredEnv('E2E_PRIVILEGED_TOKEN');
  const response = await page.request.post('/api/test/e2e/user-access', {
    headers: {
      authorization: `Bearer ${token}`,
    },
    data: {
      userId: params.userId,
      email: params.email,
      markEmailConfirmed: true,
      grantAuthorized: true,
      approvePendingRequest: true,
    },
  });
  const body = await response.json();
  if (!response.ok()) {
    throw new Error(`Failed to elevate test user: ${JSON.stringify(body)}`);
  }
}
