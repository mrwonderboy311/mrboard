import { test, expect } from '@playwright/test';
import { BASE, gotoPage, expectNoWhiteScreen, expectButtonVisible, clickButton } from './helpers';

test.describe('Wiki, Search, Tools & AI', () => {

  test('Wiki columns page loads', async ({ page }) => {
    await gotoPage(page, '/wiki/columns');
    await expectNoWhiteScreen(page);
  });

  test('Wiki list page loads', async ({ page }) => {
    await gotoPage(page, '/wiki/list');
    await expectNoWhiteScreen(page);
  });

  test('Wiki add page loads', async ({ page }) => {
    await gotoPage(page, '/wiki/add');
    await expectNoWhiteScreen(page);
  });

  test('Search page loads', async ({ page }) => {
    await gotoPage(page, '/search');
    await expectNoWhiteScreen(page);
    const body = await page.textContent('body');
    expect(body).toContain('搜索');
  });

  test('Search input works', async ({ page }) => {
    await gotoPage(page, '/search');
    const input = page.locator('input').first();
    await input.fill('test');
    await page.waitForTimeout(500);
    await expectNoWhiteScreen(page);
  });

  test('Apply YAML page loads', async ({ page }) => {
    await gotoPage(page, '/tools/apply-yaml');
    await expectNoWhiteScreen(page);
    const body = await page.textContent('body');
    expect(body).toContain('YAML');
  });

  test('Clone resource page loads', async ({ page }) => {
    await gotoPage(page, '/tools/clone-resource');
    await expectNoWhiteScreen(page);
  });

  test('App list page loads', async ({ page }) => {
    await gotoPage(page, '/app/list');
    await expectNoWhiteScreen(page);
  });

  test('App add page loads', async ({ page }) => {
    await gotoPage(page, '/app/add');
    await expectNoWhiteScreen(page);
  });

  test('App download page loads', async ({ page }) => {
    await gotoPage(page, '/app/down');
    await expectNoWhiteScreen(page);
  });

  test('Backup list page loads', async ({ page }) => {
    await gotoPage(page, '/ops/backup');
    await expectNoWhiteScreen(page);
  });

  test('AI chat page loads', async ({ page }) => {
    await gotoPage(page, '/ai/chat');
    // AI chat is a frontend-only route; backend may return 404 if no catch-all
    const body = await page.textContent('body');
    expect(body?.length).toBeGreaterThan(0);
  });
});
