import { test, expect, type Locator } from '@playwright/test';
import { S0_LEVEL } from '../../src/core/config';
import { createInitialState } from '../../src/simulation/initialState';
async function screen(canvas: Locator, x: number, y: number) {
  return canvas.evaluate(
    (el, p) => {
      const r = el.getBoundingClientRect();
      const s = Math.min((r.width - 48) / 1600, (r.height - 48) / 1000);
      return {
        x: r.left + (r.width - 1600 * s) / 2 + p.x * s,
        y: r.top + (r.height - 1000 * s) / 2 + p.y * s,
      };
    },
    { x, y },
  );
}
test('QA-01: 40 agents reach a stable three-corner form, resize preserves order and Restart is clean', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  await page.goto('/');
  await expect(page.locator('#arena')).toHaveAttribute('data-ready', 'true');
  const canvas = page.locator('canvas');
  const initial = await canvas.screenshot();
  const first = createInitialState(S0_LEVEL).agents[0]!;
  const pick = await screen(canvas, first.x, first.y);
  await page.mouse.click(pick.x, pick.y);
  await expect(canvas).toHaveAttribute('data-selected-group', 'group-1');
  const start = await screen(canvas, 650, 250),
    corner = await screen(canvas, 1100, 250),
    secondCorner = await screen(canvas, 1100, 700),
    thirdCorner = await screen(canvas, 650, 700),
    end = await screen(canvas, 650, 500);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(corner.x, corner.y, { steps: 10 });
  for (const p of [secondCorner, thirdCorner, end]) await page.mouse.move(p.x, p.y, { steps: 10 });
  await expect(canvas).toHaveAttribute('data-moving-count', '0');
  await page.mouse.up();
  await expect
    .poll(async () => Number(await canvas.getAttribute('data-moving-count')))
    .toBeGreaterThan(0);
  expect(Number(await canvas.getAttribute('data-max-slot-error'))).toBeGreaterThan(100);
  await expect(page.locator('#agent-count')).toHaveText('40');
  await expect(page.locator('#group-count')).toHaveText('1');
  await page.screenshot({ path: 'reports/s1-action6-moving.png' });
  await page.setViewportSize({ width: 900, height: 650 });
  await expect(canvas).toHaveAttribute('data-slot-count', '40');
  await expect(canvas).toHaveAttribute('data-moving-count', '0', { timeout: 15000 });
  await expect(canvas).toHaveAttribute('data-max-slot-error', '0');
  const settled = await canvas.screenshot();
  const tick = Number(await canvas.getAttribute('data-tick'));
  await expect
    .poll(async () => Number(await canvas.getAttribute('data-tick')))
    .toBeGreaterThan(tick + 30);
  expect((await canvas.screenshot()).equals(settled)).toBe(true);
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect.poll(async () => (await canvas.boundingBox())?.width).toBe(1440);
  await page.screenshot({ path: 'reports/s1-action6-settled.png' });
  await page.getByRole('button', { name: 'Заново' }).click();
  await expect(canvas).toHaveAttribute('data-slot-count', '0');
  await expect(canvas).toHaveAttribute('data-moving-count', '0');
  expect((await canvas.screenshot()).equals(initial)).toBe(true);
  expect(errors).toEqual([]);
});
