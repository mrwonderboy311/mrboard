import { Page, expect } from '@playwright/test';

export const BASE = 'http://10.0.0.130:30088';

export async function login(page: Page) {
  await page.goto(BASE);
  await page.fill('input[type="text"], input[placeholder*="用户"]', 'admin');
  await page.fill('input[type="password"]', 'admin');
  await page.click('button:has-text("登")');
  await page.waitForURL(/.*\/(?!login)/, { timeout: 15000 });
  await page.waitForLoadState('networkidle');
}

export async function apiLogin(request: any): Promise<string> {
  const loginResp = await request.post(`${BASE}/public/login`, {
    form: { isajax: '1', username: 'admin', password: 'admin', src: 'mrboardApp' },
  });
  const cookies = loginResp.headers()['set-cookie'] || '';
  return cookies.split(';')[0];
}

export async function gotoPage(page: Page, path: string) {
  await login(page);
  await page.goto(BASE + path);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);
}

export async function expectPageLoaded(page: Page, ...keywords: string[]) {
  const body = await page.textContent('body');
  expect(body?.length).toBeGreaterThan(0);
  for (const kw of keywords) {
    expect(body).toContain(kw);
  }
}

export async function expectNoWhiteScreen(page: Page) {
  const body = await page.textContent('body');
  expect(body?.length).toBeGreaterThan(10);
}

export async function expectTableHasRows(page: Page) {
  const rows = page.locator('table tbody tr');
  const count = await rows.count();
  expect(count).toBeGreaterThan(0);
}

export async function expectButtonVisible(page: Page, text: string) {
  const btn = page.locator(`button:has-text("${text}")`).first();
  await expect(btn).toBeVisible();
}

export async function expectInputVisible(page: Page, placeholder: string) {
  const input = page.locator(`input[placeholder*="${placeholder}"]`).first();
  await expect(input).toBeVisible();
}

export async function clickButton(page: Page, text: string) {
  const btn = page.locator(`button:has-text("${text}")`).first();
  await btn.click();
  await page.waitForTimeout(500);
}
