import { expect, test } from '@playwright/test';

test('hazards and final objective appear, turrets fire without player input, Restart resets the field', async ({
  page,
}) => {
  await page.goto('/');
  const canvas = page.locator('canvas');
  await expect(page.locator('#arena')).toHaveAttribute('data-ready', 'true');
  await expect(canvas).toHaveAttribute('data-pond-count', '12');
  await expect(canvas).toHaveAttribute('data-mine-count', '3');
  await expect(canvas).toHaveAttribute('data-slow-count', '6');
  await expect(canvas).toHaveAttribute('data-cannon-count', '2');
  await expect(canvas).toHaveAttribute('data-deviant-count', '2');
  await expect(page.locator('#checkpoint-status')).toHaveText('не пройден');
  await expect(page.locator('#objective-status')).toHaveText('не захвачена');
  await expect
    .poll(async () => Number(await canvas.getAttribute('data-projectile-count')))
    .toBeGreaterThan(0);
  const right = page.getByRole('button', { name: 'Камера вправо' });
  for (const left of [800, 1600, 2400]) {
    await right.click();
    await expect.poll(async () => Number(await canvas.getAttribute('data-camera-left'))).toBe(left);
  }
  await expect(right).toBeDisabled();
  await expect(page.locator('#checkpoint-hint')).toContainText('Займите рубеж 1');
  await expect(canvas).toHaveAttribute('data-camera-left', '2400');
  await expect(canvas).toHaveAttribute('data-visible-red-count', /[1-9]/);
  await page.getByRole('button', { name: 'Заново' }).click();
  await expect(canvas).toHaveAttribute('data-restart-count', '1');
  await expect(canvas).toHaveAttribute('data-mine-count', '3');
  await expect(page.locator('#checkpoint-status')).toHaveText('не пройден');
  await expect(page.locator('#objective-status')).toHaveText('не захвачена');
});
