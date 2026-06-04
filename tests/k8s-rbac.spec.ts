import { test, expect } from '@playwright/test';
import { BASE, gotoPage, expectNoWhiteScreen, expectButtonVisible, clickButton } from './helpers';

test.describe('K8s RBAC Resources', () => {

  test('ClusterRoleBinding list page loads', async ({ page }) => {
    await gotoPage(page, '/k8s/clusterrolebinding');
    await expectNoWhiteScreen(page);
    const body = await page.textContent('body');
    expect(body).toContain('ClusterRoleBinding');
    await expectButtonVisible(page, '刷新');
  });

  test('ClusterRoleBinding search works', async ({ page }) => {
    await gotoPage(page, '/k8s/clusterrolebinding');
    const input = page.locator('input[placeholder*="搜索"]').first();
    await input.fill('admin');
    await page.waitForTimeout(500);
    await expectNoWhiteScreen(page);
  });

  test('ClusterRoles list page loads', async ({ page }) => {
    await gotoPage(page, '/k8s/clusterroles');
    await expectNoWhiteScreen(page);
    const body = await page.textContent('body');
    expect(body).toContain('ClusterRole');
    await expectButtonVisible(page, '刷新');
  });

  test('RoleBinding list page loads', async ({ page }) => {
    await gotoPage(page, '/k8s/rolebinding');
    await expectNoWhiteScreen(page);
    await expectButtonVisible(page, '刷新');
  });

  test('Roles list page loads', async ({ page }) => {
    await gotoPage(page, '/k8s/roles');
    await expectNoWhiteScreen(page);
    await expectButtonVisible(page, '刷新');
  });

  test('ServiceAccounts list page loads', async ({ page }) => {
    await gotoPage(page, '/k8s/serviceaccounts');
    await expectNoWhiteScreen(page);
    await expectButtonVisible(page, '刷新');
  });
});
