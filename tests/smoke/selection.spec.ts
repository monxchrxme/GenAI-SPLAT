import { expect, test, type Locator } from '@playwright/test';
import { S0_LEVEL } from '../../src/core/config';
import { createInitialState } from '../../src/simulation/initialState';

const first = createInitialState(S0_LEVEL).agents[0]!;

// Independent forward projection for real pointer events; includes canvas offsets and CSS transforms.
async function screenPoint(canvas: Locator, point: { x: number; y: number }) {
  return canvas.evaluate((element, worldPoint) => {
    const bounds = element.getBoundingClientRect();
    const width = element.clientWidth;
    const height = element.clientHeight;
    const scale = Math.min((width - 48) / 1600, (height - 48) / 1000);
    return {
      x: bounds.left + (((width - 1600 * scale) / 2 + worldPoint.x * scale) * bounds.width) / width,
      y:
        bounds.top +
        (((height - 1000 * scale) / 2 + worldPoint.y * scale) * bounds.height) / height,
    };
  }, point);
}

for (const deviceScaleFactor of [1, 2]) {
  test.describe(`selection at DPR ${deviceScaleFactor}`, () => {
    test.use({ deviceScaleFactor });
    test('selects and starts a formation in a dense gap; distant empty ground still clears', async ({
      page,
    }) => {
      const initial = createInitialState(S0_LEVEL);
      const corners = [0, 1, 8, 9].map((i) => initial.agents[i]!);
      const gap = {
        x: corners.reduce((sum, a) => sum + a.x, 0) / 4,
        y: corners.reduce((sum, a) => sum + a.y, 0) / 4,
      };
      // This is genuinely outside all old individual hit areas.
      expect(
        initial.agents.every(
          (a) => Math.hypot(a.x - gap.x, a.y - gap.y) > S0_LEVEL.selection.hitRadius,
        ),
      ).toBe(true);
      await page.goto('/');
      const canvas = page.locator('canvas');
      await expect(page.locator('#arena')).toHaveAttribute('data-ready', 'true');
      const p = await screenPoint(canvas, gap);
      await page.mouse.click(p.x, p.y);
      await expect(canvas).toHaveAttribute('data-selection-ring-count', '40');
      await page.mouse.click(p.x, p.y);
      await expect(canvas).toHaveAttribute('data-selected-group', 'group-1');
      if (deviceScaleFactor === 1) await page.screenshot({ path: 'reports/s1-gap-selection.png' });
      const end = await screenPoint(canvas, { x: 1000, y: 250 });
      await page.mouse.move(p.x, p.y);
      await page.mouse.down();
      await page.mouse.move(end.x, end.y, { steps: 5 });
      await page.mouse.up();
      await expect(canvas).toHaveAttribute('data-slot-count', '40');
      await expect
        .poll(async () => JSON.parse((await canvas.getAttribute('data-formation-path'))!).length)
        .toBeGreaterThan(1);
      const start = JSON.parse((await canvas.getAttribute('data-formation-path'))!)[0];
      expect(start.x).toBeCloseTo(gap.x, 2);
      expect(start.y).toBeCloseTo(gap.y, 2);
      const blank = await screenPoint(canvas, { x: 1500, y: 950 });
      await page.mouse.click(blank.x, blank.y);
      await expect(canvas).toHaveAttribute('data-selected-group', '');
      await expect(canvas).toHaveAttribute('data-slot-count', '0');
      await page.getByRole('button', { name: 'Заново' }).click();
      await page.setViewportSize({ width: 900, height: 650 });
      await expect.poll(async () => (await canvas.boundingBox())?.width).toBe(900);
      const resized = await screenPoint(canvas, gap);
      await page.mouse.click(resized.x, resized.y);
      await expect(canvas).toHaveAttribute('data-selection-ring-count', '40');
    });
    test('S1 action 1: selection, static rings, resize/offset, empty clicks and Restart', async ({
      page,
    }) => {
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      page.on('console', (message) => {
        if (message.type() === 'error') errors.push(message.text());
      });
      page.on('requestfailed', (request) => errors.push(request.url()));
      page.on('response', (response) => {
        if (response.status() >= 400) errors.push(response.url());
      });
      await page.goto('/');
      await expect(page.locator('#arena')).toHaveAttribute('data-ready', 'true');
      const canvas = page.locator('canvas');
      await expect(canvas).toHaveAttribute('data-selection-ring-count', '0');
      const before = await canvas.screenshot();
      const selectPoint = await screenPoint(canvas, first);
      await page.mouse.click(selectPoint.x, selectPoint.y);
      await expect(canvas).toHaveAttribute('data-selected-group', 'group-1');
      await expect(canvas).toHaveAttribute('data-selection-ring-count', '40');
      await expect(page.locator('#hint')).toContainText('Выбрана группа · 40');
      const selected = await canvas.screenshot();
      expect(selected.equals(before)).toBe(false);
      const tick = Number(await canvas.getAttribute('data-tick'));
      await expect
        .poll(async () => Number(await canvas.getAttribute('data-tick')))
        .toBeGreaterThan(tick + 3);
      expect((await canvas.screenshot()).equals(selected)).toBe(true);
      if (deviceScaleFactor === 1)
        await page.screenshot({ path: 'reports/s1-action1-selected.png' });

      const blank = await screenPoint(canvas, { x: 1300, y: 800 });
      await page.mouse.click(blank.x, blank.y);
      await expect(canvas).toHaveAttribute('data-selected-group', '');
      expect((await canvas.screenshot()).equals(before)).toBe(true);
      await page.mouse.click(selectPoint.x, selectPoint.y);
      await expect(canvas).toHaveAttribute('data-selected-group', 'group-1');
      const bounds = (await canvas.boundingBox())!;
      await page.mouse.click(bounds.x + 2, bounds.y + 2);
      await canvas.dispatchEvent('pointerdown', {
        button: 2,
        isPrimary: true,
        clientX: blank.x,
        clientY: blank.y,
      });
      await canvas.dispatchEvent('pointerdown', {
        button: 0,
        isPrimary: false,
        clientX: blank.x,
        clientY: blank.y,
      });
      await expect(canvas).toHaveAttribute('data-selected-group', 'group-1');

      for (const viewport of [
        { width: 900, height: 650 },
        { width: 1920, height: 1080 },
      ]) {
        await page.setViewportSize(viewport);
        await expect.poll(async () => (await canvas.boundingBox())?.width).toBe(viewport.width);
        await expect(canvas).toHaveAttribute('data-selected-group', 'group-1');
        const empty = await screenPoint(canvas, { x: 1300, y: 800 });
        await page.mouse.click(empty.x, empty.y);
        await expect(canvas).toHaveAttribute('data-selected-group', '');
        const marker = await screenPoint(canvas, first);
        await page.mouse.click(marker.x, marker.y);
        await expect(canvas).toHaveAttribute('data-selection-ring-count', '40');
      }

      await canvas.evaluate((element) => {
        element.style.transformOrigin = 'top left';
        element.style.transform = 'translate(41px, 23px) scale(0.8)';
      });
      const empty = await screenPoint(canvas, { x: 1300, y: 800 });
      await page.mouse.click(empty.x, empty.y);
      await expect(canvas).toHaveAttribute('data-selected-group', '');
      const marker = await screenPoint(canvas, first);
      await page.mouse.click(marker.x, marker.y);
      await expect(canvas).toHaveAttribute('data-selection-ring-count', '40');
      await page.getByRole('button', { name: 'Заново' }).click();
      await expect(canvas).toHaveAttribute('data-selected-group', '');
      await expect(canvas).toHaveAttribute('data-selection-ring-count', '0');
      await expect(page.locator('#agent-count')).toHaveText('40');
      await expect(page.locator('#group-count')).toHaveText('1');
      await expect(page.locator('#hint')).toContainText('Выберите группу');
      expect(errors).toEqual([]);
    });
  });
}
