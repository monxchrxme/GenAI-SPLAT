import { expect, test } from '@playwright/test';

test('Cut splits a drawn group and each group accepts an independent order', async ({ page }) => {
  await page.goto('/');
  const canvas = page.locator('canvas');
  await expect(page.locator('#arena')).toHaveAttribute('data-ready', 'true');
  const point = async (x: number, y: number) =>
    canvas.evaluate(
      (element, p) => {
        const rect = element.getBoundingClientRect();
        const scale = Math.min(
          (element.clientWidth - 48) / 1600,
          (element.clientHeight - 48) / 1000,
        );
        return {
          x:
            rect.left +
            (((element.clientWidth - 1600 * scale) / 2 + p.x * scale) * rect.width) /
              element.clientWidth,
          y:
            rect.top +
            (((element.clientHeight - 1000 * scale) / 2 + p.y * scale) * rect.height) /
              element.clientHeight,
        };
      },
      { x, y },
    );
  const drag = async (a: { x: number; y: number }, b: { x: number; y: number }) => {
    await page.mouse.move(a.x, a.y);
    await page.mouse.down();
    await page.mouse.move(b.x, b.y, { steps: 10 });
    await page.mouse.up();
  };
  const center = await point(430, 500);
  await page.mouse.click(center.x, center.y);
  await drag(await point(200, 300), await point(980, 300));
  await expect(canvas).toHaveAttribute('data-slot-count', '40');
  await expect
    .poll(async () => JSON.parse((await canvas.getAttribute('data-formation-path'))!).length)
    .toBeGreaterThan(1);
  await page.getByRole('button', { name: 'Разрезать (X)' }).click();
  await expect(page.getByRole('button', { name: 'Разрезать (X)' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Разрезать (X)' })).toHaveAttribute(
    'aria-pressed',
    'false',
  );
  await page.keyboard.press('x');
  await expect(page.getByRole('button', { name: 'Разрезать (X)' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await drag(await point(590, 200), await point(590, 400));
  await expect(page.locator('#group-count')).toHaveText('2');
  await expect(canvas).toHaveAttribute('data-selected-group', 'group-2');
  await expect(canvas).toHaveAttribute('data-selection-ring-count', '20');
  await expect(page.locator('#agent-count')).toHaveText('40');
  await drag(await point(200, 700), await point(900, 700));
  await expect(canvas).toHaveAttribute('data-slot-count', '20');
  await page.getByRole('button', { name: 'Заново' }).click();
  await expect(page.locator('#group-count')).toHaveText('1');
  await expect(page.locator('#agent-count')).toHaveText('40');
});
