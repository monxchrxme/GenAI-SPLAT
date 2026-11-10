import { restartMatch } from '../fixtures/restartMatch';
import { expect, test, type Locator } from '@playwright/test';

async function screen(canvas: Locator, x: number, y: number) {
  return canvas.evaluate(
    (element, point) => {
      const r = element.getBoundingClientRect();
      const scale = Math.min((r.width - 48) / 1600, (r.height - 48) / 1000);
      return {
        x:
          r.left +
          (r.width - 1600 * scale) / 2 +
          (point.x - Number(element.dataset.cameraLeft ?? 0)) * scale,
        y: r.top + (r.height - 1000 * scale) / 2 + point.y * scale,
      };
    },
    { x, y },
  );
}

test('empty click moves the selected group, obstructed slots are adjusted, another group switches selection', async ({
  page,
}) => {
  await page.goto('/');
  const canvas = page.locator('canvas');
  await expect(page.locator('#arena')).toHaveAttribute('data-ready', 'true');
  const first = await screen(canvas, 430, 500);
  await page.mouse.click(first.x, first.y);
  await expect(canvas).toHaveAttribute('data-selected-group', 'group-1');
  const destination = await screen(canvas, 900, 700);
  await page.mouse.click(destination.x, destination.y);
  await expect(canvas).toHaveAttribute('data-selected-group', 'group-1');
  await expect(canvas).toHaveAttribute('data-slot-count', '40');
  await expect
    .poll(async () => Number(await canvas.getAttribute('data-moving-count')))
    .toBeGreaterThan(0);
  const blocked = await screen(canvas, 1480, 500);
  await page.mouse.click(blocked.x, blocked.y);
  await expect(canvas).toHaveAttribute('data-selected-group', 'group-1');
  await expect(canvas).toHaveAttribute('data-slot-count', '40');
  await expect(page.locator('#hint')).not.toContainText('препятствие');
  await restartMatch(page);
  await expect(canvas).toHaveAttribute('data-restart-count', '1');
  await page.mouse.click(first.x, first.y);
  await page.keyboard.press('x');
  await expect(canvas).toHaveAttribute('data-selected-group', 'group-2');
  const other = await screen(canvas, 549, 500);
  await page.mouse.click(other.x, other.y);
  await expect(canvas).toHaveAttribute('data-selected-group', 'group-3');
});

test('click redirects a selected group after combat has started', async ({ page }) => {
  test.setTimeout(50000);
  await page.goto('/');
  const canvas = page.locator('canvas');
  await expect(page.locator('#arena')).toHaveAttribute('data-ready', 'true');
  const first = await screen(canvas, 430, 500);
  await page.mouse.click(first.x, first.y);
  await page.getByRole('button', { name: 'Камера вправо' }).click();
  await expect(canvas).toHaveAttribute('data-camera-left', '800');
  const a = await screen(canvas, 1650, 400);
  const b = await screen(canvas, 1950, 550);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 10 });
  await page.mouse.up();
  await expect
    .poll(async () => Number(await canvas.getAttribute('data-blue-health')), { timeout: 35000 })
    .toBeLessThan(120);
  const destination = await screen(canvas, 1900, 800);
  await page.mouse.click(destination.x, destination.y);
  await expect(canvas).toHaveAttribute('data-selected-group', 'group-1');
  await expect(canvas).toHaveAttribute('data-preview-points', '0');
  await expect
    .poll(async () => Number(await canvas.getAttribute('data-moving-count')))
    .toBeGreaterThan(0);
});

test('clicking a red squad does not select it and instead orders the blue squad', async ({
  page,
}) => {
  await page.goto('/');
  const canvas = page.locator('canvas');
  await expect(page.locator('#arena')).toHaveAttribute('data-ready', 'true');
  const first = await screen(canvas, 430, 500);
  await page.mouse.click(first.x, first.y);
  await expect(canvas).toHaveAttribute('data-selected-group', 'group-1');
  await page.getByRole('button', { name: 'Камера вправо' }).click();
  await expect(canvas).toHaveAttribute('data-camera-left', '800');
  const red = await screen(canvas, 1820, 500);
  await page.mouse.click(red.x, red.y);
  await expect(canvas).toHaveAttribute('data-selected-group', 'group-1');
  await expect(canvas).toHaveAttribute('data-slot-count', '40');
  await expect
    .poll(async () => Number(await canvas.getAttribute('data-moving-count')))
    .toBeGreaterThan(0);
});
