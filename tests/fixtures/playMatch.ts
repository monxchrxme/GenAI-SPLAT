import { expect, type Locator, type Page } from '@playwright/test';

async function screen(canvas: Locator, x: number, y: number) {
  return canvas.evaluate(
    (element, point) => {
      const rect = element.getBoundingClientRect();
      const scale = Math.min((rect.width - 48) / 1600, (rect.height - 48) / 1000);
      return {
        x:
          rect.left +
          (rect.width - 1600 * scale) / 2 +
          (point.x - Number(element.dataset.cameraLeft ?? 0)) * scale,
        y: rect.top + (rect.height - 1000 * scale) / 2 + point.y * scale,
      };
    },
    { x, y },
  );
}

export async function beginMatch(page: Page, path: string) {
  await page.clock.install();
  await page.goto(path);
  await expect(page.locator('#arena')).toHaveAttribute('data-ready', 'true');
  await page.clock.pauseAt(Date.now() + 1000);
  const canvas = page.locator('#arena canvas');
  const center = await screen(canvas, 430, 500);
  await page.mouse.click(center.x, center.y);
  await page.clock.runFor(50);
  const form = async (x: number, y: number, seconds: number, height = 120) => {
    for (let tries = 0; tries < 8; tries++) {
      const left = Number(await canvas.getAttribute('data-camera-left'));
      if (x >= left && x <= left + 1600) break;
      await page.getByRole('button', { name: x < left ? 'Камера влево' : 'Камера вправо' }).click();
      await page.clock.runFor(400);
    }
    const start = await screen(canvas, x, y - height / 2);
    const end = await screen(canvas, x, y + height / 2);
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(end.x, end.y);
    await page.mouse.up();
    await page.clock.runFor(seconds * 1000);
  };
  const refill = async () => {
    const button = page.getByRole('button', { name: 'Пополнить (R)' });
    for (let i = 0; i < 20 && (await button.isEnabled()); i++) {
      await button.click();
      await page.clock.runFor(50);
    }
  };
  return { canvas, form, refill };
}
