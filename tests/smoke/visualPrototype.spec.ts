import { expect, test, type Locator } from '@playwright/test';

async function screen(canvas: Locator, x: number, y: number) {
  return canvas.evaluate(
    (element, point) => {
      const bounds = element.getBoundingClientRect();
      const width = element.clientWidth,
        height = element.clientHeight;
      const scale = Math.min((width - 48) / 1600, (height - 48) / 1000);
      return {
        x: bounds.left + (((width - 1600 * scale) / 2 + point.x * scale) * bounds.width) / width,
        y:
          bounds.top +
          (((height - 1000 * scale * 0.72) / 2 + point.y * scale * 0.72) * bounds.height) / height,
      };
    },
    { x, y },
  );
}
for (const deviceScaleFactor of [1, 2]) {
  test.describe(`inclined prototype DPR ${deviceScaleFactor}`, () => {
    test.use({ deviceScaleFactor });
    test('dense selection, world drawing, Cut and resize retain correct mapping', async ({
      page,
    }) => {
      await page.goto('/');
      await expect(page.locator('#arena')).toHaveAttribute('data-ready', 'true');
      const canvas = page.locator('canvas');
      const tilt = page.getByRole('button', { name: 'Наклонный ракурс' });
      await tilt.click();
      await expect(tilt).toHaveAttribute('aria-pressed', 'true');
      await expect(page.getByLabel('Пробные формы Сплатов')).toBeVisible();
      const center = await screen(canvas, 430, 500);
      await page.mouse.click(center.x, center.y);
      await expect(canvas).toHaveAttribute('data-selection-ring-count', '40');
      const start = await screen(canvas, 200, 300),
        end = await screen(canvas, 980, 300);
      await page.mouse.move(start.x, start.y);
      await page.mouse.down();
      await page.mouse.move(end.x, end.y, { steps: 10 });
      await page.mouse.up();
      await expect(canvas).toHaveAttribute('data-slot-count', '40');
      await expect
        .poll(async () => JSON.parse((await canvas.getAttribute('data-formation-path'))!).length)
        .toBeGreaterThan(1);
      const path = JSON.parse((await canvas.getAttribute('data-formation-path'))!);
      expect(path[0].x).toBeCloseTo(200, 1);
      expect(path[0].y).toBeCloseTo(300, 1);
      await page.getByRole('button', { name: 'Разрезать (X)' }).click();
      const a = await screen(canvas, 590, 200),
        b = await screen(canvas, 590, 400);
      await page.mouse.move(a.x, a.y);
      await page.mouse.down();
      await page.mouse.move(b.x, b.y, { steps: 10 });
      await page.mouse.up();
      await expect(page.locator('#group-count')).toHaveText('2');
      await page.getByRole('button', { name: 'Заново' }).click();
      await expect(canvas).toHaveAttribute('data-restart-count', '1');
      await page.setViewportSize({ width: 900, height: 650 });
      await expect.poll(async () => (await canvas.boundingBox())?.width).toBe(900);
      const resized = await screen(canvas, 430, 500);
      await page.mouse.click(resized.x, resized.y);
      await expect(canvas).toHaveAttribute('data-selection-ring-count', '40');
      await tilt.click();
      await expect(tilt).toHaveAttribute('aria-pressed', 'false');
      await page.setViewportSize({ width: 390, height: 600 });
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true);
    });
  });
}
