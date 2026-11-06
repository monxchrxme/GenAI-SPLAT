import { test, expect, type Locator } from '@playwright/test';
import { createInitialState } from '../../src/simulation/initialState';
import { S0_LEVEL } from '../../src/core/config';

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
for (const deviceScaleFactor of [1, 2])
  test.describe(`drawing DPR ${deviceScaleFactor}`, () => {
    test.use({ deviceScaleFactor });
    test('preview, cancellation, resize, limits and clean restart', async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      page.on('console', (m) => {
        if (m.type() === 'error') errors.push(m.text());
      });
      await page.goto('/');
      const canvas = page.locator('canvas');
      await expect(page.locator('#arena')).toHaveAttribute('data-ready', 'true');
      const first = createInitialState(S0_LEVEL).agents[0]!;
      const marker = await screen(canvas, first.x, first.y);
      await page.mouse.click(marker.x, marker.y);
      await expect(canvas).toHaveAttribute('data-selected-group', 'group-1');
      const before = await canvas.screenshot();
      const start = await screen(canvas, 700, 250);
      const corner = await screen(canvas, 1000, 250);
      const end = await screen(canvas, 1000, 600);
      await page.mouse.move(start.x, start.y);
      await page.mouse.down();
      await page.mouse.move(corner.x, corner.y, { steps: 10 });
      await page.mouse.move(end.x, end.y, { steps: 10 });
      await expect(canvas).toHaveAttribute('data-drawing', 'true');
      expect(Number(await canvas.getAttribute('data-preview-points'))).toBeGreaterThan(2);
      await page.mouse.up();
      await expect(canvas).toHaveAttribute('data-drawing', 'false');
      await expect(canvas).toHaveAttribute('data-slot-count', '40');
      const assignments = await canvas.getAttribute('data-slot-assignments');
      expect(assignments?.split(',')).toHaveLength(40);
      await expect(canvas).toHaveAttribute('data-selected-group', 'group-1');
      const saved = await canvas.screenshot();
      const savedPath = await canvas.getAttribute('data-preview-path');
      await page.keyboard.press('Escape');
      await expect.poll(async () => canvas.getAttribute('data-preview-path')).toBe(savedPath);
      expect(saved.equals(before)).toBe(false);
      if (deviceScaleFactor === 1) await page.screenshot({ path: 'reports/s1-action3-slots.png' });
      // Short drag, Escape and leaving the world preserve the last finished line.
      await page.mouse.move(start.x, start.y);
      await page.mouse.down();
      await page.mouse.move(start.x + 5, start.y);
      await page.mouse.up();
      await expect.poll(async () => canvas.getAttribute('data-preview-path')).toBe(savedPath);
      await page.mouse.move(start.x, start.y);
      await page.mouse.down();
      await page.mouse.move(end.x, end.y);
      await page.keyboard.press('Escape');
      await page.mouse.up();
      await expect.poll(async () => canvas.getAttribute('data-preview-path')).toBe(savedPath);
      await page.mouse.move(start.x, start.y);
      await page.mouse.down();
      await page.mouse.move(1, 1);
      await page.mouse.up();
      await expect.poll(async () => canvas.getAttribute('data-preview-path')).toBe(savedPath);
      // Repeated long segments hit the length bound; old movement continues during drafts.
      await page.mouse.move(start.x, start.y);
      await page.mouse.down();
      for (let i = 0; i < 8; i++)
        await page.mouse.move(i % 2 === 0 ? end.x : start.x, i % 2 === 0 ? end.y : start.y);
      await expect(canvas).toHaveAttribute('data-drawing-limited', 'true');
      await page.mouse.up();
      expect(Number(await canvas.getAttribute('data-preview-points'))).toBeLessThanOrEqual(256);
      await expect(canvas).toHaveAttribute('data-slot-count', '40');
      expect(await canvas.getAttribute('data-slot-assignments')).toBe(assignments);
      await page.mouse.move(start.x, start.y);
      await page.mouse.down();
      await page.mouse.move(end.x, end.y);
      await page.setViewportSize({ width: 900, height: 650 });
      await expect(canvas).toHaveAttribute('data-drawing', 'false');
      await page.mouse.up();
      await page.getByRole('button', { name: 'Заново' }).click();
      await expect(canvas).toHaveAttribute('data-preview-points', '0');
      await expect(canvas).toHaveAttribute('data-slot-count', '0');
      await expect(canvas).toHaveAttribute('data-selected-group', '');
      await expect(page.locator('#agent-count')).toHaveText('40');
      await expect(page.locator('#group-count')).toHaveText('1');
      expect(errors).toEqual([]);
    });
  });
