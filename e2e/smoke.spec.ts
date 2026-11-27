import { expect, test } from '@playwright/test';

test('the built app loads', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  await page.goto('/');
  await expect(page).toHaveTitle('Sedimi Fitter');
  await expect(page.getByRole('heading', { name: 'Sedimi Fitter' })).toBeVisible();
  expect(errors).toEqual([]);
});
