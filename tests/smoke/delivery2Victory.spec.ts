import { expect, test, type Locator } from '@playwright/test';
import { S0_LEVEL } from '../../src/core/config';
import { createInitialState } from '../../src/simulation/initialState';

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

test('complete local match reaches victory and Restart through the real UI', async ({ page }) => {
  test.setTimeout(180000);
  // Keep the real input/render/simulation pipeline, but advance fixed-step time in the test.
  await page.clock.install();
  await page.goto('/');
  await expect(page.locator('#arena')).toHaveAttribute('data-ready', 'true');
  await page.clock.pauseAt(Date.now() + 1000);
  const canvas = page.locator('canvas');
  const drag = async (x1: number, x2: number, y: number) => {
    const start = await screen(canvas, x1, y),
      end = await screen(canvas, x2, y);
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(end.x, end.y);
    await page.mouse.up();
    await page.clock.runFor(50);
  };
  const center = await screen(canvas, 430, 500);
  await page.mouse.click(center.x, center.y);
  await page.clock.runFor(50);
  await page.keyboard.press('x');
  await page.clock.runFor(50);
  await expect(page.locator('#group-count')).toHaveText('2');
  await page.getByRole('button', { name: 'Камера вправо' }).click();
  await page.clock.runFor(500);
  await drag(1650, 1750, 300);
  await page.getByRole('button', { name: 'Камера влево' }).click();
  await page.clock.runFor(500);
  const rightmost = createInitialState(S0_LEVEL)
    .agents.sort((a, b) => a.x - b.x || a.y - b.y)
    .at(-1)!;
  const selected = await screen(canvas, rightmost.x, rightmost.y);
  await page.mouse.click(selected.x, selected.y);
  await page.clock.runFor(100);
  await expect(canvas).toHaveAttribute('data-selected-group', 'group-3');
  await page.getByRole('button', { name: 'Камера вправо' }).click();
  await page.clock.runFor(500);
  await drag(1650, 1750, 700);
  await page.clock.runFor(10000);
  await expect(page.getByRole('button', { name: 'Пополнить (R)' })).toBeEnabled();
  await page.keyboard.press('r');
  await page.clock.runFor(100);
  await page.keyboard.press('m');
  const upper = await screen(canvas, 1700, 300);
  await page.mouse.click(upper.x, upper.y);
  await page.clock.runFor(4000);
  await expect(page.locator('#group-count')).toHaveText('1');
  await page.getByRole('button', { name: 'Камера вправо' }).click();
  await page.clock.runFor(500);
  for (const y of [100, 300, 500, 700, 900, 100, 300, 500, 700, 900]) {
    await drag(1550, 3150, y);
    await page.clock.runFor(11000);
    if (await page.locator('#outcome').isVisible()) break;
  }
  const outcome = page.locator('#outcome');
  await expect(outcome).toBeVisible();
  await expect(outcome).toContainText('Победа');
  await expect(page.locator('#paint-progress')).toHaveText('60%');
  const tick = await canvas.getAttribute('data-tick');
  await page.clock.runFor(1000);
  await expect(canvas).toHaveAttribute('data-tick', tick!);
  await expect(page.getByRole('button', { name: 'Разделить (X)' })).toBeDisabled();
  await page.getByRole('button', { name: 'Заново' }).click();
  await page.clock.runFor(100);
  await expect(outcome).toBeHidden();
  await expect(page.locator('#agent-count')).toHaveText('40');
  await expect(page.locator('#red-count')).toHaveText('36');
  await expect(page.locator('#reinforcement-credits')).toHaveText('0');
  await expect(canvas).toHaveAttribute('data-camera-left', '0');
});
