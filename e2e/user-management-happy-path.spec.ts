import { expect, test } from '@playwright/test';
import {
  buildDisposableUser,
  completeOnboarding,
  ensureLoggedIn,
  elevateViaTestApi,
  getAuthProvider,
  getMe,
  registerUser,
  submitPublishAccessRequest,
} from './helpers/userManagement';

test('user management end-to-end (automated privileged path)', async ({ page }) => {
  const authProvider = await getAuthProvider(page);
  if (authProvider !== 'supabase') {
    test.skip(
      true,
      `Automated signup flow requires Supabase auth provider. Current provider: ${authProvider}. Use manual scenario on production Auth0.`
    );
  }

  const user = buildDisposableUser();
  console.log(`[e2e] created disposable user: ${user.email}`);

  await registerUser(page, user);
  await ensureLoggedIn(page);
  await completeOnboarding(page, user);
  await submitPublishAccessRequest(page);

  const meBefore = await getMe(page);
  expect(meBefore.isLoggedIn).toBeTruthy();
  expect(meBefore.userData?.id).toBeTruthy();

  await elevateViaTestApi(page, {
    userId: meBefore.userData!.id!,
    email: user.email,
  });

  await expect
    .poll(async () => {
      const meAfter = await getMe(page);
      return {
        authorized: meAfter.userData?.is_authorized === true,
        verified: meAfter.userData?.email_verified === true,
      };
    })
    .toEqual({ authorized: true, verified: true });

  await page.goto('/publish');
  await expect(page).toHaveURL(/\/publish(\?|$)/);
  await expect(page.getByPlaceholder('Enter your title here...')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Submit for Review' })).toBeVisible();
});
