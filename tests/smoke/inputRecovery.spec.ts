import { test, expect, type Page } from '@playwright/test';
import { S0_LEVEL } from '../../src/core/config';
import { createInitialState } from '../../src/simulation/initialState';

async function point(page: Page, x: number, y: number) {
  return page.locator('canvas').evaluate(
    (el, p) => {
      const b = el.getBoundingClientRect(),
        s = Math.min((b.width - 48) / 1600, (b.height - 48) / 1000);
      return {
        x: b.left + (b.width - 1600 * s) / 2 + p.x * s,
        y: b.top + (b.height - 1000 * s) / 2 + p.y * s,
      };
    },
    { x, y },
  );
}
test.use({ viewport: { width: 446, height: 760 } });
test('narrow viewport keeps canvas geometry fixed across prompts, click movement and selection', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.locator('#arena')).toHaveAttribute('data-ready', 'true');
  const canvas = page.locator('canvas');
  const first = createInitialState(S0_LEVEL).agents[0]!;
  const original = await canvas.boundingBox();
  const hit = await point(page, first.x, first.y);
  await page.mouse.click(hit.x, hit.y);
  await expect(canvas).toHaveAttribute('data-selected-group', 'group-1');
  expect(await canvas.boundingBox()).toEqual(original);
  const a = await point(page, 650, 200),
    b = await point(page, 1200, 650);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 12 });
  await expect(canvas).toHaveAttribute('data-drawing', 'true');
  expect(await canvas.boundingBox()).toEqual(original);
  await page.mouse.up();
  await expect(canvas).toHaveAttribute('data-slot-count', '40');
  const blank = await point(page, 900, 700);
  await page.mouse.click(blank.x, blank.y);
  await expect(canvas).toHaveAttribute('data-selected-group', 'group-1');
  expect(await canvas.boundingBox()).toEqual(original);
  // The group remains selected and can be targeted again immediately.
  const again = await point(page, first.x, first.y);
  await page.mouse.click(again.x, again.y);
  await expect(canvas).toHaveAttribute('data-selected-group', 'group-1');
});

test('rapid replacement gestures, including a press on a moving marker, always publish the last target', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.locator('#arena')).toHaveAttribute('data-ready', 'true');
  const canvas = page.locator('canvas'),
    first = createInitialState(S0_LEVEL).agents[0]!;
  const start = await point(page, first.x, first.y),
    end = await point(page, 1100, 250);
  // Selection and drawing are one continuous gesture, latched to the pressed group.
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(end.x, end.y, { steps: 3 });
  await page.mouse.up();
  await expect(canvas).toHaveAttribute('data-slot-count', '40');
  const box = await canvas.boundingBox();
  for (let i = 0; i < 12; i++) {
    const a = await point(page, 900, 800),
      b = await point(page, 1400, i % 2 ? 600 : 300);
    const expectedY = i % 2 ? 600 : 300;
    await page.mouse.move(a.x, a.y);
    await page.mouse.down();
    await page.mouse.move(b.x, b.y, { steps: 2 });
    await page.mouse.up();
    await expect(canvas).toHaveAttribute('data-slot-count', '40');
    await expect
      .poll(async () => JSON.parse((await canvas.getAttribute('data-formation-path'))!).at(-1)?.y)
      .toBeCloseTo(expectedY, 2);
    expect(await canvas.boundingBox()).toEqual(box);
  }
  await expect
    .poll(async () => canvas.getAttribute('data-preview-path'))
    .toBe(await canvas.getAttribute('data-formation-path'));
  const committed = await canvas.getAttribute('data-formation-path');
  const tick = Number(await canvas.getAttribute('data-tick'));
  await expect
    .poll(async () => Number(await canvas.getAttribute('data-tick')))
    .toBeGreaterThan(tick + 5);
  expect(await canvas.getAttribute('data-formation-path')).toBe(committed);
  expect(await canvas.getAttribute('data-preview-path')).toBe(committed);
});

test('tension is visible while drawing and is not hidden by the length limit', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#arena')).toHaveAttribute('data-ready', 'true');
  const canvas = page.locator('canvas'),
    first = createInitialState(S0_LEVEL).agents[0]!;
  const pick = await point(page, first.x, first.y);
  await page.mouse.click(pick.x, pick.y);
  await expect(canvas).toHaveAttribute('data-selected-group', 'group-1');
  const box = await canvas.boundingBox();
  const a = await point(page, 200, 250),
    b = await point(page, 1350, 250),
    c = await point(page, 1350, 750),
    d = await point(page, 200, 750),
    e = await point(page, 200, 250);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  for (const p of [b, c, d, e]) await page.mouse.move(p.x, p.y, { steps: 15 });
  await expect(canvas).toHaveAttribute('data-drawing-limited', 'true');
  await expect(canvas).toHaveAttribute('data-tension-active', 'true');
  await expect(page.locator('#hint')).toContainText('Натяжение');
  await expect(page.locator('#hint')).toContainText('Лимит');
  expect(await canvas.boundingBox()).toEqual(box);
  await page.screenshot({ path: 'reports/s1-action5-repair-limit.png' });
  await page.mouse.up();
  await expect(canvas).toHaveAttribute('data-drawing', 'false');
  await expect(canvas).toHaveAttribute('data-tension-active', 'true');
  await expect(canvas).toHaveAttribute('data-slot-count', '40');
});
