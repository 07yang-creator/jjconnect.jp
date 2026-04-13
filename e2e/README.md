# E2E User Management Tests

These tests cover:

1. New user registration
2. Onboarding form completion
3. Publish-access request form submission
4. Submission accepted notice
5. Email confirmation + authorization grant
6. Successful authorized access to publishing page

## Prerequisites

- Install browser: `npm run e2e:install`
- Set `E2E_BASE_URL` to your production URL (default is `https://www.jjconnect.jp`).
- Set `E2E_TEST_EMAIL_DOMAIN` (domain used for disposable users).
- For automated privileged flow, set:
  - `E2E_ENABLED=true`
  - `E2E_PRIVILEGED_TOKEN=<strong-random-token>`
  - Optional: `E2E_ALLOWED_EMAIL_DOMAIN=<same-domain-as-test-users>`

## Run commands

- Automated flow with recording:
  - `npm run e2e -- --grep "automated privileged path"`
- Manual real email/admin flow:
  - `npm run e2e:manual`
- Open report:
  - `npm run e2e:report`

## Video artifacts

Playwright saves videos under `test-results/` and links them from `playwright-report/index.html`.
