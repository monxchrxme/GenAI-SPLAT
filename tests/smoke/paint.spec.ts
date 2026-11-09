import { expect, test } from '@playwright/test';

test('territory becomes owned and Restart clears it', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#arena')).toHaveAttribute('data-ready', 'true');
  const progress = page.locator('#paint-progress');
  await expect
    .poll(async () => Number((await progress.textContent())?.replace('%', '')))
    .toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Заново' }).click();
  await expect(progress).toHaveText('0%');
  await expect
    .poll(async () => Number((await progress.textContent())?.replace('%', '')))
    .toBeGreaterThan(0);
});
