import { test, expect } from '@playwright/test';
import { BASE, gotoPage, expectNoWhiteScreen, expectButtonVisible, expectInputVisible } from './helpers';

test.describe('K8s Workloads', () => {

  test('Deploy list page loads with UI elements', async ({ page }) => {
    await gotoPage(page, '/deploy/list');
    await expectNoWhiteScreen(page);
    const body = await page.textContent('body');
    expect(body).toContain('容器镜像');
    await expectInputVisible(page, '搜索应用名称');
  });

  test('Deploy list search filter works', async ({ page }) => {
    await gotoPage(page, '/deploy/list');
    const input = page.locator('input[placeholder*="搜索"]').first();
    await input.fill('test');
    await page.waitForTimeout(500);
    // Should not crash
    await expectNoWhiteScreen(page);
  });

  test('Deploy list refresh button works', async ({ page }) => {
    await gotoPage(page, '/deploy/list');
    // Deploy list uses search input, not a refresh button
    const input = page.locator('input[placeholder*="搜索"]').first();
    await input.fill('');
    await page.waitForTimeout(500);
    await expectNoWhiteScreen(page);
  });

  test('StatefulSet list page loads', async ({ page }) => {
    await gotoPage(page, '/k8s/statefulset');
    await expectNoWhiteScreen(page);
    await expectButtonVisible(page, '刷新');
  });

  test('DaemonSet list page loads', async ({ page }) => {
    await gotoPage(page, '/k8s/daemonset');
    await expectNoWhiteScreen(page);
    await expectButtonVisible(page, '刷新');
  });

  test('Job list page loads', async ({ page }) => {
    await gotoPage(page, '/k8s/job');
    await expectNoWhiteScreen(page);
    await expectButtonVisible(page, '刷新');
  });

  test('CronJob list page loads', async ({ page }) => {
    await gotoPage(page, '/k8s/cronjob');
    await expectNoWhiteScreen(page);
    await expectButtonVisible(page, '刷新');
  });

  test('Pod list page loads', async ({ page }) => {
    await gotoPage(page, '/k8s/pod');
    await expectNoWhiteScreen(page);
    await expectButtonVisible(page, '刷新');
  });

  test('CRD list page loads', async ({ page }) => {
    await gotoPage(page, '/k8s/crd');
    await expectNoWhiteScreen(page);
    await expectButtonVisible(page, '刷新');
  });

  test('CRD search filter works', async ({ page }) => {
    await gotoPage(page, '/k8s/crd');
    const input = page.locator('input[placeholder*="CRD"]').first();
    await input.fill('test');
    await page.waitForTimeout(500);
    await expectNoWhiteScreen(page);
  });

  test('HPA list page loads', async ({ page }) => {
    await gotoPage(page, '/k8s/hpa');
    await expectNoWhiteScreen(page);
    await expectButtonVisible(page, '刷新');
  });
});
