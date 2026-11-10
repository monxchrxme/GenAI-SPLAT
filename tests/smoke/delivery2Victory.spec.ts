import { expect, test, type Locator } from '@playwright/test';

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

test('wins on the current map by taking the checkpoint and final point through the UI', async ({
  page,
}) => {
  test.setTimeout(180000);
  await page.clock.install();
  await page.goto('/');
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
  await form(1660, 300, 10);
  await form(1830, 300, 7);
  await form(1830, 500, 7);
  await refill();
  await form(2890, 300, 9);
  await form(3200, 300, 5);
  await form(3440, 220, 6);
  await form(3500, 500, 7);
  await form(3500, 760, 7);
  await refill();
  await expect(page.getByRole('button', { name: 'Камера вправо' })).toBeDisabled();
  await expect(page.locator('#checkpoint-hint')).toContainText('Займите рубеж 1');
  await form(3600, 500, 7, 130);
  await expect(page.locator('#checkpoint-status')).toHaveText('пройден');
  await expect(page.getByRole('button', { name: 'Камера вправо' })).toBeEnabled();
  await expect(page.locator('#checkpoint-hint')).toContainText('Рубеж взят');
  await expect(page.locator('#outcome')).toBeHidden();
  await form(4250, 280, 7);
  await form(4800, 230, 7);
  await form(5060, 220, 7);
  await form(5270, 500, 7);
  await form(5440, 500, 7);
  await form(5710, 500, 7);
  await refill();
  await form(5660, 500, 5, 190);
  await form(5780, 500, 4, 190);
  await form(5870, 500, 4, 190);
  await expect(page.locator('#outcome')).toContainText('Победа');
  await expect(page.locator('#objective-status')).toHaveText('захвачена');
  const percent = Number((await page.locator('#paint-progress').textContent())?.replace('%', ''));
  expect(percent).toBeLessThan(60);
  const tick = await canvas.getAttribute('data-tick');
  await page.clock.runFor(1000);
  await expect(canvas).toHaveAttribute('data-tick', tick!);
  await page.getByRole('button', { name: 'Заново' }).click();
  await page.clock.runFor(100);
  await expect(page.locator('#outcome')).toBeHidden();
  await expect(page.locator('#checkpoint-status')).toHaveText('не пройден');
  await expect(page.locator('#objective-status')).toHaveText('не захвачена');
});
