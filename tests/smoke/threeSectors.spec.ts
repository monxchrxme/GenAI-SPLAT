import { expect, test } from '@playwright/test';

test('the checkpoint stops camera paging, explains capture and Restart restores the first view', async ({
  page,
}) => {
  await page.goto('/');
  const canvas = page.locator('canvas');
  await expect(page.locator('#arena')).toHaveAttribute('data-ready', 'true');
  await expect(page.locator('#red-count')).toHaveText('102');
  await expect(canvas).toHaveAttribute('data-red-group-count', '9');
  await expect(canvas).toHaveAttribute('data-world-size', '6000×1000');
  const right = page.getByRole('button', { name: 'Камера вправо' });
  for (const left of [800, 1600, 2400]) {
    await right.click();
    await expect.poll(async () => Number(await canvas.getAttribute('data-camera-left'))).toBe(left);
  }
  await expect(right).toBeDisabled();
  await expect(page.locator('#checkpoint-hint')).toContainText('Займите рубеж 1');
  await expect(canvas).toHaveAttribute('data-camera-left', '2400');
  await expect
    .poll(async () => Number(await canvas.getAttribute('data-visible-red-count')))
    .toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Заново' }).click();
  await expect(canvas).toHaveAttribute('data-camera-left', '0');
  await expect(page.locator('#red-count')).toHaveText('102');
  await expect(canvas).toHaveAttribute('data-red-group-count', '9');
});
