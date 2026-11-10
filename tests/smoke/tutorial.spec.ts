import { expect, test, type Locator } from '@playwright/test';

async function screen(canvas: Locator, x: number, y: number) {
  return canvas.evaluate(
    (element, point) => {
      const rect = element.getBoundingClientRect();
      const scale = Math.min((rect.width - 48) / 1600, (rect.height - 48) / 1000);
      return {
        x: rect.left + (rect.width - 1600 * scale) / 2 + point.x * scale,
        y: rect.top + (rect.height - 1000 * scale) / 2 + point.y * scale,
      };
    },
    { x, y },
  );
}

test('plays the lesson with real game controls and resumes the untouched match', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.locator('#arena')).toHaveAttribute('data-ready', 'true');
  const main = page.locator('#arena canvas');
  const starter = await screen(main, 430, 500);
  await page.mouse.click(starter.x, starter.y);
  await expect(main).toHaveAttribute('data-selected-group', 'group-1');
  const open = page.getByRole('button', { name: 'Как играть' });
  await open.click();
  const dialog = page.getByRole('dialog', { name: 'Как играть' });
  const lesson = dialog.getByRole('status');
  const field = dialog.locator('canvas');
  const frozenTick = (await main.getAttribute('data-tick'))!;
  const clickAt = async (x: number, y: number) => {
    const target = await screen(field, x, y);
    await page.mouse.click(target.x, target.y);
  };
  const draw = async (x: number, from: number, to: number) => {
    const start = await screen(field, x, from);
    const end = await screen(field, x, to);
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(end.x, end.y, { steps: 12 });
    await page.mouse.up();
  };
  const settle = () =>
    expect
      .poll(async () => Number(await field.getAttribute('data-max-slot-error')))
      .toBeLessThan(1);

  await expect(lesson).toContainText('Шаг 1');
  await clickAt(413, 483);
  await expect(lesson).toContainText('Шаг 2');
  await clickAt(590, 500);
  await expect(lesson).toContainText('Шаг 3');
  await draw(650, 300, 650);
  await expect(lesson).toContainText('Шаг 4');
  await settle();
  await page.keyboard.press('x');
  await expect(lesson).toContainText('Шаг 5');
  await clickAt(510, 250);
  await expect(lesson).toContainText('Шаг 6');
  await settle();
  await dialog.getByRole('button', { name: 'Объединить (M)' }).click();
  await clickAt(650, 650);
  await expect(lesson).toContainText('Шаг 7');
  await draw(1150, 460, 540);
  await expect(lesson).toContainText('Урок пройден', { timeout: 10000 });
  await expect(main).toHaveAttribute('data-tick', frozenTick);
  await expect(main).toHaveAttribute('data-selection-ring-count', '40');

  await dialog.getByRole('button', { name: 'Начать урок заново' }).click();
  await expect(lesson).toContainText('Шаг 1');
  await expect(field).toHaveAttribute('data-selected-group', '');
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(open).toBeFocused();
  await expect(main).toHaveAttribute('data-selected-group', 'group-1');
  await expect
    .poll(async () => Number(await main.getAttribute('data-tick')))
    .toBeGreaterThan(Number(frozenTick));

  await open.click();
  await expect(lesson).toContainText('Шаг 1');
  await expect(field).toHaveCount(1);
  await dialog.getByRole('button', { name: 'Вернуться к игре' }).click();
  await expect(dialog).toBeHidden();
});
