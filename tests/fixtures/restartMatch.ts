import type { Page } from '@playwright/test';

export async function restartMatch(page: Page) {
  await page.getByRole('button', { name: 'Меню', exact: true }).click();
  await page.getByRole('button', { name: 'Заново', exact: true }).click();
}
