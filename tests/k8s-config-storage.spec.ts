import { test, expect } from '@playwright/test';
import { BASE, gotoPage, expectNoWhiteScreen, expectButtonVisible, expectInputVisible, clickButton } from './helpers';

test.describe('K8s Config & Storage', () => {

  test('ConfigMap list page loads', async ({ page }) => {
    await gotoPage(page, '/k8s/configmap');
    await expectNoWhiteScreen(page);
    const body = await page.textContent('body');
    expect(body).toContain('ConfigMap');
    await expectButtonVisible(page, '创建');
    await expectButtonVisible(page, 'YAML创建');
    await expectButtonVisible(page, '刷新');
  });

  test('ConfigMap namespace filter works', async ({ page }) => {
    await gotoPage(page, '/k8s/configmap');
    const select = page.locator('select').first();
    if (await select.isVisible()) {
      await select.selectOption({ index: 1 });
      await page.waitForTimeout(500);
    }
    await expectNoWhiteScreen(page);
  });

  test('ConfigMap search filter works', async ({ page }) => {
    await gotoPage(page, '/k8s/configmap');
    const input = page.locator('input[placeholder*="搜索"]').first();
    await input.fill('test');
    await page.waitForTimeout(500);
    await expectNoWhiteScreen(page);
  });

  test('Secret list page loads', async ({ page }) => {
    await gotoPage(page, '/k8s/secret');
    await expectNoWhiteScreen(page);
    const body = await page.textContent('body');
    expect(body).toContain('Secret');
    await expectButtonVisible(page, '创建');
    await expectButtonVisible(page, 'YAML创建');
    await expectButtonVisible(page, '刷新');
  });

  test('Secret namespace filter works', async ({ page }) => {
    await gotoPage(page, '/k8s/secret');
    const select = page.locator('select').first();
    if (await select.isVisible()) {
      await select.selectOption({ index: 1 });
      await page.waitForTimeout(500);
    }
    await expectNoWhiteScreen(page);
  });

  test('PVC list page loads', async ({ page }) => {
    await gotoPage(page, '/k8s/pvc');
    await expectNoWhiteScreen(page);
    await expectButtonVisible(page, '刷新');
  });

  test('PV list page loads', async ({ page }) => {
    await gotoPage(page, '/k8s/pv');
    await expectNoWhiteScreen(page);
    await expectButtonVisible(page, '刷新');
  });

  test('StorageClass list page loads', async ({ page }) => {
    await gotoPage(page, '/k8s/storageclass');
    await expectNoWhiteScreen(page);
    await expectButtonVisible(page, '刷新');
  });
});
