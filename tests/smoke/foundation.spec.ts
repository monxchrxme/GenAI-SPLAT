import { expect, test } from '@playwright/test';

test('S0 production build: 40 static markers, clean restart, keyboard, resize, console and assets', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('requestfailed', (request) =>
    errors.push(`${request.method()} ${request.url()}: ${request.failure()?.errorText}`),
  );
  page.on('response', (response) => {
    if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`);
  });
  await page.goto('/');
  await expect(page.locator('#arena')).toHaveAttribute('data-ready', 'true');
  const canvas = page.getByRole('img', { name: 'Поле с 40 синими маркерами' });
  await expect(canvas).toBeVisible();
  await expect(canvas).toHaveAttribute('data-marker-count', '40');
  await expect(canvas).toHaveAttribute('data-world-size', '1600×1000');
  await expect(page.locator('#agent-count')).toHaveText('40');
  await expect(page.locator('#group-count')).toHaveText('1');
  await expect(page.getByRole('button')).toHaveCount(3);

  const before = await canvas.screenshot();
  await expect.poll(async () => Number(await canvas.getAttribute('data-tick'))).toBeGreaterThan(30);
  expect((await canvas.screenshot()).equals(before)).toBe(true);

  const restart = page.getByRole('button', { name: 'Заново' });
  for (let count = 1; count <= 3; count++) {
    await restart.click();
    await expect(canvas).toHaveAttribute('data-restart-count', String(count));
    expect(Number(await canvas.getAttribute('data-tick'))).toBeLessThan(20);
    await expect(canvas).toHaveAttribute('data-marker-count', '40');
    expect((await canvas.screenshot()).equals(before)).toBe(true);
  }
  await restart.focus();
  await page.keyboard.press('Enter');
  await expect(canvas).toHaveAttribute('data-restart-count', '4');

  for (const viewport of [
    { width: 900, height: 650 },
    { width: 1920, height: 1080 },
  ]) {
    await page.setViewportSize(viewport);
    await expect.poll(async () => (await canvas.boundingBox())?.width).toBe(viewport.width);
    await expect(canvas).toHaveAttribute('data-world-size', '1600×1000');
    await expect(canvas).toHaveAttribute('data-marker-count', '40');
    await expect(page.locator('#agent-count')).toHaveText('40');
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect.poll(async () => (await canvas.boundingBox())?.width).toBe(1440);
  expect((await canvas.screenshot()).equals(before)).toBe(true);
  await page.screenshot({ path: 'reports/s0-desktop.png' });
  expect(errors).toEqual([]);
});
