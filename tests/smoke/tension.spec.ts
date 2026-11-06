import { test, expect, type Locator } from '@playwright/test';
import { createInitialState } from '../../src/simulation/initialState';
import { S0_LEVEL } from '../../src/core/config';
async function screen(canvas: Locator, x: number, y: number) {
  return canvas.evaluate(
    (el, p) => {
      const r = el.getBoundingClientRect(),
        s = Math.min((r.width - 48) / 1600, (r.height - 48) / 1000);
      return {
        x: r.left + (r.width - 1600 * s) / 2 + p.x * s,
        y: r.top + (r.height - 1000 * s) / 2 + p.y * s,
      };
    },
    { x, y },
  );
}
for (const deviceScaleFactor of [1, 2])
  test.describe(`tension DPR ${deviceScaleFactor}`, () => {
    test.use({ deviceScaleFactor });
    test('temporary cue expires without split; a new order and Restart remain clean', async ({
      page,
    }) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      page.on('console', (m) => {
        if (m.type() === 'error') errors.push(m.text());
      });
      await page.goto('/');
      await expect(page.locator('#arena')).toHaveAttribute('data-ready', 'true');
      const canvas = page.locator('canvas'),
        first = createInitialState(S0_LEVEL).agents[0]!;
      const pick = await screen(canvas, first.x, first.y);
      await page.mouse.click(pick.x, pick.y);
      await expect(canvas).toHaveAttribute('data-selected-group', 'group-1');
      const draw = async () => {
        const a = await screen(canvas, 200, 100),
          b = await screen(canvas, 1400, 100),
          c = await screen(canvas, 1400, 900);
        await page.mouse.move(a.x, a.y);
        await page.mouse.down();
        await page.mouse.move(b.x, b.y, { steps: 20 });
        await page.mouse.move(c.x, c.y, { steps: 20 });
        await page.mouse.up();
      };
      await draw();
      await expect(canvas).toHaveAttribute('data-tension-active', 'true');
      await expect(page.locator('#hint')).toContainText('Натяжение');
      await expect(page.locator('#agent-count')).toHaveText('40');
      await expect(page.locator('#group-count')).toHaveText('1');
      if (deviceScaleFactor === 1)
        await page.screenshot({ path: 'reports/s1-action5-tension.png' });
      await expect(canvas).toHaveAttribute('data-tension-active', 'false', { timeout: 5000 });
      await expect(page.locator('#hint')).not.toContainText('Натяжение');
      await expect(canvas).toHaveAttribute('data-slot-count', '40');
      await draw();
      await expect(canvas).toHaveAttribute('data-tension-active', 'true');
      await page.getByRole('button', { name: 'Заново' }).click();
      await expect(canvas).toHaveAttribute('data-tension-active', 'false');
      await expect(canvas).toHaveAttribute('data-slot-count', '0');
      await expect(canvas).toHaveAttribute('data-moving-count', '0');
      await expect(page.locator('#group-count')).toHaveText('1');
      expect(errors).toEqual([]);
    });
  });
