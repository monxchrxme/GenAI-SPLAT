import { expect, test } from '@playwright/test';
import { beginMatch } from '../fixtures/playMatch';
import { REDOUBTS_ROUTE } from '../fixtures/redoubtsRoute';

test('Redoubts opens three camera boundaries, wins and repeats a clean final level', async ({
  page,
}) => {
  test.setTimeout(300000);
  const { canvas, form, refill } = await beginMatch(page, '/?level=redoubts');
  await expect(canvas).toHaveAttribute('data-world-size', '7200×1000');
  await expect(canvas).toHaveAttribute('data-marker-count', '208');
  await expect(page.locator('#checkpoint-status')).toHaveText('0/3');
  await expect(page.locator('#red-count')).toHaveText('168');
  await expect(page.locator('#checkpoint-hint')).toHaveCount(0);
  const right = page.getByRole('button', { name: 'Камера вправо' });
  for (const [index, stage] of REDOUBTS_ROUTE.entries()) {
    const previousCheckpoints = REDOUBTS_ROUTE[index - 1]?.checkpoints ?? 0;
    for (const [pointIndex, [x, y, seconds, height]] of stage.points.entries()) {
      if (
        stage.checkpoints > previousCheckpoints &&
        pointIndex === (index === 0 ? stage.points.length - 1 : 0)
      ) {
        if (await right.isEnabled()) {
          await right.click();
          await page.clock.runFor(400);
        }
        await expect(right).toBeDisabled();
        await expect(canvas).toHaveAttribute(
          'data-camera-left',
          String([560, 2240, 4000][stage.checkpoints - 1]),
        );
        await expect(page.locator('#checkpoint-status')).toHaveText(`${previousCheckpoints}/3`);
      }
      await form(x, y, seconds, height);
    }
    await expect(page.locator('#checkpoint-status')).toHaveText(`${stage.checkpoints}/3`);
    await expect(canvas).toHaveAttribute('data-deviant-count', String(stage.deviants));
    if (index < REDOUBTS_ROUTE.length - 1) await expect(page.locator('#outcome')).toBeHidden();
    if (stage.refill) await refill();
  }
  await expect(page.getByRole('dialog', { name: 'Победа' })).toBeVisible();
  await expect(page.locator('#objective-status')).toHaveText('захвачена');
  await expect(page.getByRole('link', { name: 'Следующий уровень' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Редуты', exact: true })).toHaveAttribute(
    'aria-current',
    'true',
  );
  await expect(page.getByRole('link', { name: 'Излучина', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Повторить уровень' }).click();
  await page.clock.runFor(100);
  await expect(page.locator('#outcome')).toBeHidden();
  await expect(page.locator('#checkpoint-status')).toHaveText('0/3');
  await expect(page.locator('#objective-status')).toHaveText('не захвачена');
  await expect(page.locator('#reinforcement-credits')).toHaveText('0');
  await expect(page.locator('#agent-count')).toHaveText('40');
  await expect(page.locator('#red-count')).toHaveText('168');
  await expect(canvas).toHaveAttribute('data-camera-left', '0');
  await expect(canvas).toHaveAttribute('data-deviant-count', '3');
  await expect(page).toHaveURL(/level=redoubts/);
});

test('Redoubts menu and optional lesson pause the map without losing its three objectives', async ({
  page,
}) => {
  await page.goto('/?level=redoubts');
  await expect(page.locator('#arena')).toHaveAttribute('data-ready', 'true');
  const canvas = page.locator('#arena canvas');
  await page.getByRole('button', { name: 'Как играть' }).click();
  const tick = await canvas.getAttribute('data-tick');
  await expect(page.getByRole('dialog', { name: 'Как играть' })).toBeVisible();
  await page.waitForTimeout(150);
  await expect(canvas).toHaveAttribute('data-tick', tick!);
  await page.getByRole('button', { name: 'Вернуться к игре' }).click();
  await expect(page.locator('#checkpoint-status')).toHaveText('0/3');
  await page.getByRole('button', { name: 'Меню', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Два прохода', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Излучина', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Редуты', exact: true })).toHaveAttribute(
    'aria-current',
    'true',
  );
  await page.getByRole('button', { name: 'Заново', exact: true }).click();
  await expect(page.locator('#agent-count')).toHaveText('40');
  await expect(page.locator('#reinforcement-credits')).toHaveText('0');
});
