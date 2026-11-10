import { expect, test, type Page } from '@playwright/test';
import { S0_LEVEL } from '../../src/core/config';
import { createInitialState } from '../../src/simulation/initialState';

interface FrameAudit {
  expected: string;
  frames: number;
  rollbacks: string[];
}
type AuditedWindow = Window & { gestureAudit: FrameAudit };

async function screen(page: Page, x: number, y: number) {
  return page.locator('canvas').evaluate(
    (el, p) => {
      const b = el.getBoundingClientRect();
      const s = Math.min((b.width - 48) / 1600, (b.height - 48) / 1000);
      return {
        x: b.left + (b.width - 1600 * s) / 2 + p.x * s,
        y: b.top + (b.height - 1000 * s) / 2 + p.y * s,
      };
    },
    { x, y },
  );
}

for (const divisor of [1, 8]) {
  test(`direction reversals keep the released path in every rendered frame (time divisor ${divisor})`, async ({
    page,
  }) => {
    // Divisor 8 forces render-only frames between fixed steps, like a high
    // refresh display. No runtime clock or command API is exposed by the game.
    await page.addInitScript((divisor) => {
      const audit: FrameAudit = { expected: '', frames: 0, rollbacks: [] };
      (window as unknown as AuditedWindow).gestureAudit = audit;
      const raf = window.requestAnimationFrame.bind(window);
      window.requestAnimationFrame = (callback) =>
        raf((time) => {
          callback(time / divisor);
          const canvas = document.querySelector('canvas');
          if (audit.expected && canvas?.dataset.drawing === 'false') {
            audit.frames++;
            if (canvas.dataset.previewPath !== audit.expected)
              audit.rollbacks.push(canvas.dataset.previewPath ?? 'missing');
          }
        });
    }, divisor);
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/');
    const canvas = page.locator('canvas');
    await expect(page.locator('#arena')).toHaveAttribute('data-ready', 'true');
    const first = createInitialState(S0_LEVEL).agents[0]!;
    const hit = await screen(page, first.x, first.y);
    await page.mouse.click(hit.x, hit.y);
    await expect(canvas).toHaveAttribute('data-selected-group', 'group-1');
    // Use the open flanks between the current shoreline and the first wall.
    for (let i = 0; i < 12; i++) {
      const a = await screen(page, i % 2 ? 1400 : 700, i % 2 ? 700 : 300);
      const b = await screen(page, i % 2 ? 700 : 1400, i % 2 ? 700 : 300);
      await page.evaluate(() => {
        (window as unknown as AuditedWindow).gestureAudit.expected = '';
      });
      await page.mouse.move(a.x, a.y);
      await page.mouse.down({ clickCount: (i % 3) + 1 });
      await page.mouse.move(b.x, b.y, { steps: 2 });
      await expect(canvas).toHaveAttribute('data-drawing', 'true');
      const path = await canvas.getAttribute('data-preview-path');
      await page.evaluate((path) => {
        (window as unknown as AuditedWindow).gestureAudit.expected = path!;
      }, path);
      await page.mouse.up({ clickCount: (i % 3) + 1 });
      await expect(canvas).toHaveAttribute('data-formation-path', path!);
      expect(await canvas.getAttribute('data-preview-path')).toBe(path);
    }
    const error = Number(await canvas.getAttribute('data-max-slot-error'));
    await expect
      .poll(async () => Number(await canvas.getAttribute('data-max-slot-error')))
      .toBeLessThan(error - 5);
    const audit = await page.evaluate(() => (window as unknown as AuditedWindow).gestureAudit);
    expect(audit.frames).toBeGreaterThan(12);
    expect(audit.rollbacks).toEqual([]);
    expect(errors).toEqual([]);
    if (divisor === 1) await page.screenshot({ path: 'reports/s1-action5-direction-reversal.png' });
  });
}
