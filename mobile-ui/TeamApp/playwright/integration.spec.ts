import { expect, test } from '@playwright/test';

const username = process.env.E2E_USERNAME ?? 'integration-runner';
const password = process.env.E2E_PASSWORD ?? 'IntegrationOnly-2026!';

test('shows client validation and does not submit empty login', async ({ page }) => {
  let loginRequests = 0;
  page.on('request', (request) => {
    if (request.url().includes('/auth/token/')) loginRequests += 1;
  });

  await page.goto('/login');
  await page.getByRole('button', { name: 'Log In' }).click();

  await expect(page.getByText('Username is required.')).toBeVisible();
  await expect(page.getByText('Password is required.')).toBeVisible();
  expect(loginRequests).toBe(0);
});

test('logs in and restores the session after reload', async ({ page }) => {
  await page.goto('/login');
  await page.getByPlaceholder('Username').fill(username);
  await page.getByPlaceholder('Password').fill(password);
  await page.getByRole('button', { name: 'Log In' }).click();

  await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible();
  await expect.poll(() => page.evaluate(() => Boolean(localStorage.getItem('pay-attention.auth-token')))).toBe(true);

  await page.reload();
  await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible();
});

test('Testing Bypass opens static UI without sending an API request', async ({ page }) => {
  const apiRequests: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/api/')) apiRequests.push(request.url());
  });

  await page.goto('/login');
  await page.getByText('Testing Bypass').click();
  await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible();
  expect(apiRequests).toEqual([]);
});

test('logout removes the persisted token and returns to login', async ({ page }) => {
  await page.goto('/login');
  await page.getByPlaceholder('Username').fill(username);
  await page.getByPlaceholder('Password').fill(password);
  await page.getByRole('button', { name: 'Log In' }).click();
  await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible();

  await page.getByRole('button', { name: 'Log out' }).click();
  await expect(page.getByText('Login')).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('pay-attention.auth-token'))).toBeNull();
});

test('loads the API-backed transaction screen and blocks invalid filter requests', async ({ page }) => {
  await page.goto('/login');
  await page.getByPlaceholder('Username').fill(username);
  await page.getByPlaceholder('Password').fill(password);
  await page.getByRole('button', { name: 'Log In' }).click();
  await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible();

  let transactionRequests = 0;
  page.on('request', (request) => {
    if (request.url().includes('/transactions/')) transactionRequests += 1;
  });
  await page.goto('/transactions');
  await expect(page.getByText('No transactions match the current filters.')).toBeVisible();

  const requestsBeforeInvalidFilter = transactionRequests;
  await page.getByPlaceholder('YYYY-MM-DD').first().fill('09/01/2026');
  await page.getByRole('button', { name: 'Apply filters' }).click();
  await expect(page.getByText('Start date must use YYYY-MM-DD format.')).toBeVisible();
  expect(transactionRequests).toBe(requestsBeforeInvalidFilter);
});
