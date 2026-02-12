import { expect, Page } from '@playwright/test';

export async function login(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.getByTestId('auth-email').fill(email);
  await page.getByTestId('auth-password').fill(password);
  await page.getByTestId('auth-submit').click();
}

export async function gotoModule(page: Page, name: string) {
  await page.getByTestId(`sidebar-${name}`).click();
}

export async function assertToast(page: Page, text: string) {
  await expect(page.getByText(text).first()).toBeVisible();
}

export async function uploadFile(page: Page, inputSelector: string, filepath: string) {
  await page.locator(inputSelector).setInputFiles(filepath);
}

export function uniqueId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
