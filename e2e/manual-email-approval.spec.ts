import { expect, test } from '@playwright/test';
import {
  buildDisposableUser,
  completeOnboarding,
  getMe,
  registerUser,
  submitPublishAccessRequest,
} from './helpers/userManagement';

test('user management e2e with real email + manual admin approval', async ({ page }) => {
  const user = buildDisposableUser();
  console.log(`[manual-e2e] user email: ${user.email}`);
  console.log('[manual-e2e] run in headed mode. This test pauses for manual actions.');

  await registerUser(page, user);
  await completeOnboarding(page, user);
  await submitPublishAccessRequest(page);

  const meBefore = await getMe(page);
  expect(meBefore.userData?.is_authorized).toBeFalsy();

  console.log('[manual-e2e] NEXT STEPS BEFORE RESUME:');
  console.log('1) Confirm this account email in the real inbox.');
  console.log('2) Approve this user request from /admin/publish-requests.');
  console.log('3) Resume this Playwright session.');
  await page.pause();

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
  await expect(page.getByPlaceholder('Enter your title here...')).toBeVisible();
});
