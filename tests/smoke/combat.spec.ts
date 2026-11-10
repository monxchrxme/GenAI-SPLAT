import { restartMatch } from '../fixtures/restartMatch';
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

test('red agents engage, losses update the HUD, and Restart restores both armies', async ({
  page,
}) => {
  await page.goto('/');
  const canvas = page.locator('canvas');
  await expect(page.locator('#arena')).toHaveAttribute('data-ready', 'true');
  await expect(page.locator('#red-count')).toHaveText('102');
  await expect(page.locator('#reinforcement-credits')).toHaveText('0');
  await expect(page.getByRole('button', { name: 'Пополнить (R)' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Пополнить (R)' })).toHaveAttribute(
    'title',
    '5 ед. ресурса → до 2 Сплатов в выбранную группу',
  );
  test.setTimeout(50000);
  await page.getByRole('button', { name: 'Камера вправо' }).click();
  await expect(canvas).toHaveAttribute('data-camera-left', '800');
  const red = await screen(canvas, 1820, 500);
  await page.mouse.click(red.x, red.y);
  await expect(canvas).toHaveAttribute('data-selected-group', '');
  await page.getByRole('button', { name: 'Камера влево' }).click();
  await expect(canvas).toHaveAttribute('data-camera-left', '0');
  const first = createInitialState(S0_LEVEL).agents[0]!;
  const pick = await screen(canvas, first.x, first.y);
  await page.mouse.click(pick.x, pick.y);
  await expect(canvas).toHaveAttribute('data-selected-group', 'group-1');
  await page.getByRole('button', { name: 'Камера вправо' }).click();
  await expect(canvas).toHaveAttribute('data-camera-left', '800');
  const start = await screen(canvas, 1650, 400);
  const end = await screen(canvas, 1950, 550);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(end.x, end.y, { steps: 10 });
  await page.mouse.up();
  await expect
    .poll(async () => Number(await page.locator('#red-count').textContent()), { timeout: 35000 })
    .toBeLessThan(102);
  await expect
    .poll(async () => Number(await canvas.getAttribute('data-marker-count')))
    .toBeLessThan(142);
  // Keep fighting after the first contact rather than assuming a passive line
  // always earns enough credits under every current map balance.
  const regroup = await screen(canvas, 1820, 500);
  await page.mouse.click(regroup.x, regroup.y);
  await expect
    .poll(async () => Number(await page.locator('#reinforcement-credits').textContent()), {
      timeout: 15000,
    })
    .toBeGreaterThanOrEqual(5);
  await expect(page.getByRole('button', { name: 'Пополнить (R)' })).toBeEnabled();
  await page.evaluate(() =>
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'к', code: 'KeyR' })),
  );
  await expect
    .poll(async () => {
      const credits = Number(await page.locator('#reinforcement-credits').textContent());
      const killed = 102 - Number(await page.locator('#red-count').textContent());
      return killed - credits;
    })
    .toBe(5);
  await restartMatch(page);
  await expect(page.locator('#red-count')).toHaveText('102');
  await expect(page.locator('#agent-count')).toHaveText('40');
  await expect(canvas).toHaveAttribute('data-marker-count', '142');
});

test('enemy splits when the blue formation spreads across the arena', async ({ page }) => {
  await page.goto('/');
  const canvas = page.locator('canvas');
  await expect(page.locator('#arena')).toHaveAttribute('data-ready', 'true');
  await expect(canvas).toHaveAttribute('data-red-group-count', '9');
  const first = createInitialState(S0_LEVEL).agents[0]!;
  const pick = await screen(canvas, first.x, first.y);
  await page.mouse.click(pick.x, pick.y);
  const start = await screen(canvas, 250, 500);
  const end = await screen(canvas, 1350, 500);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(end.x, end.y, { steps: 12 });
  await page.mouse.up();
  await expect(canvas).toHaveAttribute('data-red-group-count', '10', { timeout: 15000 });
});
