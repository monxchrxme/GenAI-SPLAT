import { expect, test, type Locator, type Page } from '@playwright/test';

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

async function beginMatch(page: Page, path: string) {
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

test('first-map victory offers the next level and starts a fresh match', async ({ page }) => {
  test.setTimeout(180000);
  const { canvas, form, refill } = await beginMatch(page, '/');
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
  await expect(page.locator('#checkpoint-hint')).toHaveCount(0);
  await form(3600, 500, 7, 130);
  await expect(page.locator('#checkpoint-status')).toHaveText('пройден');
  await expect(page.getByRole('button', { name: 'Камера вправо' })).toBeEnabled();
  await expect(page.locator('#outcome')).toBeHidden();
  await form(4250, 280, 7);
  await form(4800, 230, 7);
  await form(5060, 220, 7);
  await refill();
  // Use the upper flank to fight the two deviants separately.
  await form(5360, 265, 6);
  await form(5540, 275, 6);
  await expect(canvas).toHaveAttribute('data-deviant-count', '1');
  await refill();
  await form(5460, 520, 6);
  await refill();
  await form(5490, 705, 6);
  await expect(canvas).toHaveAttribute('data-deviant-count', '0');
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
  await expect(page.getByRole('dialog', { name: 'Победа' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Следующий уровень' })).toHaveAttribute(
    'href',
    '?level=izluchina',
  );
  await page.getByRole('link', { name: 'Следующий уровень' }).click();
  await expect(page).toHaveURL(/level=izluchina/);
  await expect(page.locator('#arena')).toHaveAttribute('data-ready', 'true');
  await expect(page.locator('#checkpoint-status')).toHaveText('0/2');
  await expect(page.locator('#red-count')).toHaveText('152');
  await expect(page.locator('#outcome')).toBeHidden();
});

test('Izluchina opens two camera boundaries in order and can be replayed', async ({ page }) => {
  test.setTimeout(180000);
  const { canvas, form, refill } = await beginMatch(page, '/?level=izluchina');
  const right = page.getByRole('button', { name: 'Камера вправо' });
  const progress = page.locator('#checkpoint-status');
  await form(670, 720, 5);
  await form(1240, 680, 6);
  await form(1580, 670, 6);
  await form(1670, 770, 5);
  await expect(right).toBeDisabled();
  await expect(canvas).toHaveAttribute('data-camera-left', '400');
  await expect(progress).toHaveText('0/2');
  await form(1840, 700, 11, 170);
  await expect(progress).toHaveText('1/2');
  await expect(right).toBeEnabled();
  await refill();
  await form(2160, 825, 5);
  await form(2490, 790, 5);
  await form(2950, 810, 6);
  await form(3280, 850, 6);
  await form(3540, 835, 5);
  await form(3580, 470, 5);
  await form(3530, 285, 6);
  await expect(right).toBeDisabled();
  await expect(canvas).toHaveAttribute('data-camera-left', '2400');
  await expect(progress).toHaveText('1/2');
  await form(3760, 300, 11, 170);
  await expect(progress).toHaveText('2/2');
  await expect(right).toBeEnabled();
  await refill();
  await form(4250, 490, 6);
  await form(4780, 500, 6);
  await form(5210, 495, 6);
  await form(5360, 490, 6);
  await refill();
  await form(5610, 500, 6, 190);
  await form(5720, 500, 5, 190);
  await form(5860, 500, 5, 190);
  await expect(page.getByRole('dialog', { name: 'Победа' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Следующий уровень' })).toHaveCount(0);
  await expect(page.locator('#objective-status')).toHaveText('захвачена');
  await page.getByRole('button', { name: 'Повторить уровень' }).click();
  await page.clock.runFor(100);
  await expect(page.locator('#outcome')).toBeHidden();
  await expect(progress).toHaveText('0/2');
  await expect(canvas).toHaveAttribute('data-camera-left', '0');
  await expect(page.locator('#objective-status')).toHaveText('не захвачена');
  await expect(page).toHaveURL(/level=izluchina/);
});
