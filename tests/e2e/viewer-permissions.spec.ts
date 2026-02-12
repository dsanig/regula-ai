import { expect, test } from '@playwright/test';
import { gotoModule, login } from './helpers';

test('viewer cannot create documents or manage passwords', async ({ page }) => {
  const viewerEmail = process.env.E2E_VIEWER_EMAIL;
  const viewerPassword = process.env.E2E_VIEWER_PASSWORD;
  test.skip(!viewerEmail || !viewerPassword, 'Missing viewer credentials');

  await login(page, viewerEmail!, viewerPassword!);

  await gotoModule(page, 'documents');
  await expect(page.getByTestId('documents-new-button')).toBeDisabled();

  await page.goto('/?open-new-document=1');
  await expect(page.getByTestId('document-save-button')).not.toBeVisible();

  await gotoModule(page, 'company');
  await page.getByTestId('company-users-tab').click();
  await expect(page.locator('[data-testid^="change-password-"]')).toHaveCount(0);
});
