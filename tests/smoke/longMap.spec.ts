import { expect, test } from '@playwright/test';
import { S0_LEVEL } from '../../src/core/config';
import { createInitialState } from '../../src/simulation/initialState';

test('camera pans, maps pointer coordinates and Restart restores the start', async ({ page }) => {
  await page.goto('/');
  const canvas = page.locator('canvas');
  await expect(page.locator('#arena')).toHaveAttribute('data-ready', 'true');
  await expect(canvas).toHaveAttribute('data-world-size', '3200×1000');
  await expect(canvas).toHaveAttribute('data-camera-left', '0');
  const first = createInitialState(S0_LEVEL).agents[0]!;
  const screen = async (x: number, y: number) =>
    canvas.evaluate(
      (element, p) => {
        const rect = element.getBoundingClientRect();
        const scale = Math.min((rect.width - 48) / 1600, (rect.height - 48) / 1000);
        return {
          x:
            rect.left +
            (rect.width - 1600 * scale) / 2 +
            (p.x - Number(element.dataset.cameraLeft ?? 0)) * scale,
          y: rect.top + (rect.height - 1000 * scale) / 2 + p.y * scale,
        };
      },
      { x, y },
    );
  const pick = await screen(first.x, first.y);
  await page.mouse.click(pick.x, pick.y);
  await expect(canvas).toHaveAttribute('data-selected-group', 'group-1');
  await page.getByRole('button', { name: 'Камера вправо' }).click();
  const transition = await page.evaluate(async () => {
    const canvas = document.querySelector('canvas')!;
    const values: number[] = [];
    for (let i = 0; i < 120; i++) {
      await new Promise(requestAnimationFrame);
      values.push(Number(canvas.dataset.cameraLeft));
      if (values.at(-1) === 800) break;
    }
    return values;
  });
  expect(transition.some((value) => value > 0 && value < 800)).toBe(true);
  for (let i = 1; i < transition.length; i++)
    expect(transition[i]!).toBeGreaterThanOrEqual(transition[i - 1]!);
  await expect(canvas).toHaveAttribute('data-camera-left', '800');
  await page.getByRole('button', { name: 'Наклонный ракурс' }).click();
  await expect(canvas).toHaveAttribute('data-camera-left', '800');
  await page.getByRole('button', { name: 'Наклонный ракурс' }).click();
  await expect(canvas).toHaveAttribute('data-camera-left', '800');
  const start = await screen(1600, 300),
    end = await screen(1750, 300);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(end.x, end.y, { steps: 10 });
  await page.mouse.up();
  await expect
    .poll(async () => JSON.parse((await canvas.getAttribute('data-formation-path')) ?? '[]').length)
    .toBeGreaterThan(1);
  const path = JSON.parse((await canvas.getAttribute('data-formation-path'))!);
  expect(path[0].x).toBeCloseTo(1600, 0);
  await page.getByRole('button', { name: 'Заново' }).click();
  await expect(canvas).toHaveAttribute('data-camera-left', '0');
});

test('moving the selected group right makes the camera follow', async ({ page }) => {
  await page.goto('/');
  const canvas = page.locator('canvas');
  await expect(page.locator('#arena')).toHaveAttribute('data-ready', 'true');
  const coordinates = async (x: number, y: number) =>
    canvas.evaluate(
      (element, point) => {
        const r = element.getBoundingClientRect();
        const scale = Math.min((r.width - 48) / 1600, (r.height - 48) / 1000);
        return {
          x: r.left + (r.width - 1600 * scale) / 2 + point.x * scale,
          y: r.top + (r.height - 1000 * scale) / 2 + point.y * scale,
        };
      },
      { x, y },
    );
  const first = createInitialState(S0_LEVEL).agents[0]!;
  const pick = await coordinates(first.x, first.y);
  await page.mouse.click(pick.x, pick.y);
  const middleA = await coordinates(900, 300),
    middleB = await coordinates(1050, 300);
  await page.mouse.move(middleA.x, middleA.y);
  await page.mouse.down();
  await page.mouse.move(middleB.x, middleB.y, { steps: 10 });
  await page.mouse.up();
  await expect
    .poll(async () => Number(await canvas.getAttribute('data-max-slot-error')), { timeout: 15000 })
    .toBeLessThan(1);
  await expect(canvas).toHaveAttribute('data-camera-left', '0');
  const a = await coordinates(1550, 300),
    b = await coordinates(1590, 300);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 10 });
  await page.mouse.up();
  await expect
    .poll(async () => Number(await canvas.getAttribute('data-camera-left')), { timeout: 15000 })
    .toBe(800);
  await expect
    .poll(async () => Number(await canvas.getAttribute('data-visible-red-count')))
    .toBeGreaterThan(0);
  await expect
    .poll(async () => Number(await canvas.getAttribute('data-visible-selected-count')))
    .toBeGreaterThan(0);
  await expect(canvas).toHaveAttribute('data-blue-health', '120');
  const scene = async (x: number, y: number) =>
    canvas.evaluate(
      (element, p) => {
        const r = element.getBoundingClientRect();
        const scale = Math.min((r.width - 48) / 1600, (r.height - 48) / 1000);
        return {
          x:
            r.left +
            (r.width - 1600 * scale) / 2 +
            (p.x - Number(element.dataset.cameraLeft ?? 0)) * scale,
          y: r.top + (r.height - 1000 * scale) / 2 + p.y * scale,
        };
      },
      { x, y },
    );
  const start = await scene(1200, 800),
    end = await scene(1300, 800);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(end.x, end.y, { steps: 5 });
  await expect(canvas).toHaveAttribute('data-drawing', 'true');
  const frozen = Number(await canvas.getAttribute('data-camera-left'));
  await page.waitForTimeout(350);
  expect(Number(await canvas.getAttribute('data-camera-left'))).toBe(frozen);
  await page.mouse.up();
  const samples = await page.evaluate(async () => {
    const canvas = document.querySelector('canvas')!;
    const values: number[] = [];
    for (let i = 0; i < 12; i++) {
      await new Promise(requestAnimationFrame);
      values.push(Number(canvas.dataset.cameraLeft));
    }
    return values;
  });
  for (let i = 1; i < samples.length; i++)
    expect(Math.abs(samples[i]! - samples[i - 1]!)).toBeLessThan(200);
});

test('a formation on an obstacle is rejected with feedback', async ({ page }) => {
  await page.goto('/');
  const canvas = page.locator('canvas');
  await expect(page.locator('#arena')).toHaveAttribute('data-ready', 'true');
  const coords = async (x: number, y: number) =>
    canvas.evaluate(
      (element, p) => {
        const r = element.getBoundingClientRect();
        const scale = Math.min((r.width - 48) / 1600, (r.height - 48) / 1000);
        return {
          x: r.left + (r.width - 1600 * scale) / 2 + p.x * scale,
          y: r.top + (r.height - 1000 * scale) / 2 + p.y * scale,
        };
      },
      { x, y },
    );
  const first = createInitialState(S0_LEVEL).agents[0]!;
  const pick = await coords(first.x, first.y);
  await page.mouse.click(pick.x, pick.y);
  const a = await coords(1450, 450),
    b = await coords(1510, 450);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 8 });
  await page.mouse.up();
  await expect(page.locator('#hint')).toContainText('препятствие');
  await expect(canvas).toHaveAttribute('data-formation-path', '[]');
});
