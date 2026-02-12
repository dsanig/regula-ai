import { expect, test } from '@playwright/test';
import path from 'node:path';
import { assertToast, gotoModule, login, uniqueId, uploadFile } from './helpers';

test('admin happy path smoke', async ({ page }, testInfo) => {
  const adminEmail = process.env.E2E_ADMIN_EMAIL;
  const adminPassword = process.env.E2E_ADMIN_PASSWORD;
  test.skip(!adminEmail || !adminPassword, 'Missing admin credentials');

  const logs: string[] = [];
  page.on('console', (msg) => logs.push(`[${msg.type()}] ${msg.text()}`));

  const id = uniqueId('e2e');
  const docCode = `DOC-${id}`;
  const processCode = `PNT-${id}`;
  const auditTitle = `Auditoría E2E ${id}`;
  const ncTitle = `NC E2E ${id}`;
  const incidentStandalone = `Incidencia Standalone ${id}`;
  const incidentLinked = `Incidencia Audit ${id}`;
  const viewerEmail = process.env.E2E_VIEWER_EMAIL || `viewer+${id}@example.com`;
  const viewerPassword = process.env.E2E_VIEWER_PASSWORD || 'Viewer123!';

  await login(page, adminEmail!, adminPassword!);
  await expect(page.getByTestId('sidebar-documents')).toBeVisible();

  await gotoModule(page, 'documents');
  await expect(page.getByTestId('documents-new-button')).toBeEnabled();

  await gotoModule(page, 'processes');
  await expect(page.getByTestId('documents-new-button')).toBeEnabled();

  await gotoModule(page, 'company');
  await page.getByTestId('company-users-tab').click();
  await page.getByTestId('create-user-button').click();
  await page.getByTestId('create-user-name').fill('E2E Viewer');
  await page.getByTestId('create-user-email').fill(viewerEmail);
  await page.getByTestId('create-user-password').fill(viewerPassword);
  await page.getByTestId('create-user-confirm-password').fill(viewerPassword);
  await page.getByTestId('create-user-role').click();
  await page.getByRole('option', { name: 'Viewer' }).click();
  await page.getByTestId('create-user-save').click();
  await assertToast(page, 'Usuario creado');
  await expect(page.getByText(viewerEmail)).toBeVisible();

  const changePasswordBtn = page.locator('[data-testid^="change-password-"]').first();
  if (await changePasswordBtn.isVisible()) {
    await changePasswordBtn.click();
    await page.getByTestId('new-password-input').fill('Viewer123!x');
    await page.getByTestId('confirm-password-input').fill('Viewer123!x');
    await page.getByTestId('update-password-save').click();
    await assertToast(page, 'Contraseña actualizada');
  }

  await gotoModule(page, 'documents');
  await page.getByTestId('documents-new-button').click();
  await page.getByTestId('document-code-input').fill(docCode);
  await page.getByTestId('document-title-input').fill(`Documento E2E ${id}`);
  await page.getByTestId('document-category-select').first().click();
  await page.getByRole('option', { name: /Calidad/i }).first().click();
  await uploadFile(page, '[data-testid="document-file-input"]', path.join(process.cwd(), 'tests/fixtures/sample.pdf'));
  await page.getByTestId('document-save-button').click();
  await assertToast(page, 'Documento creado');
  await expect(page.getByText(docCode)).toBeVisible();

  await page.getByTestId('documents-search').fill(docCode);
  await expect(page.getByText(docCode)).toBeVisible();
  await page.getByTestId('documents-filter-button').click();
  await page.getByRole('button', { name: 'Aplicar filtros' }).click();

  await gotoModule(page, 'processes');
  await page.getByTestId('documents-new-button').click();
  await page.getByTestId('document-code-input').fill(processCode);
  await page.getByTestId('document-title-input').fill(`Proceso E2E ${id}`);
  await uploadFile(page, '[data-testid="document-file-input"]', path.join(process.cwd(), 'tests/fixtures/sample.pdf'));
  await page.getByTestId('document-save-button').click();

  await gotoModule(page, 'audits');
  await page.getByTestId('audit-new-button').click();
  await page.getByTestId('audit-title-input').fill(auditTitle);
  await page.getByTestId('audit-save-button').click();
  await assertToast(page, 'Auditoría creada');

  await page.getByTestId('audit-new-nc-button').click();
  await page.getByTestId('nc-title-input').fill(ncTitle);
  await page.getByTestId('nc-save-button').click();

  await page.getByTestId('audit-new-action-button').click();
  await page.getByTestId('action-nc-select').click();
  await page.getByRole('option', { name: ncTitle }).click();
  await page.getByTestId('action-description-input').fill(`Acción E2E ${id}`);
  await page.getByTestId('action-file-input').setInputFiles([
    path.join(process.cwd(), 'tests/fixtures/sample.png'),
  ]);
  await page.getByTestId('action-save-button').click();

  await gotoModule(page, 'incidents');
  await page.getByTestId('incidents-new-button').click();
  await page.getByTestId('incident-title-input').fill(incidentStandalone);
  await page.getByTestId('incident-description-input').fill('Standalone');
  await page.getByTestId('incident-save-button').click();

  await page.getByTestId('incidents-new-button').click();
  await page.getByTestId('incident-title-input').fill(incidentLinked);
  await page.getByTestId('incident-audit-select').click();
  await page.getByRole('option', { name: auditTitle }).click();
  await page.getByTestId('incident-save-button').click();

  console.log(JSON.stringify({ docCode, processCode, auditTitle, ncTitle, incidentStandalone, incidentLinked, viewerEmail }, null, 2));
  await testInfo.attach('browser-console.log', { body: logs.join('\n'), contentType: 'text/plain' });
});
