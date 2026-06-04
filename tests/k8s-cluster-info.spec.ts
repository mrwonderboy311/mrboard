import { test, expect } from '@playwright/test';
import { BASE, gotoPage, expectNoWhiteScreen, expectButtonVisible, clickButton } from './helpers';

test.describe('K8s Cluster Info', () => {

  test('Node list page loads', async ({ page }) => {
    await gotoPage(page, '/k8s/node');
    await expectNoWhiteScreen(page);
    await expectButtonVisible(page, '刷新');
  });

  test('NodePool list page loads', async ({ page }) => {
    await gotoPage(page, '/k8s/nodepool');
    await expectNoWhiteScreen(page);
    await expectButtonVisible(page, '刷新');
  });

  test('Namespace list page loads', async ({ page }) => {
    await gotoPage(page, '/k8s/namespace');
    await expectNoWhiteScreen(page);
  });

  test('PodMetrics page loads', async ({ page }) => {
    await gotoPage(page, '/k8s/podmetrics');
    await expectNoWhiteScreen(page);
    await expectButtonVisible(page, '刷新');
  });

  test('Event center page loads', async ({ page }) => {
    await gotoPage(page, '/k8s/event');
    await expectNoWhiteScreen(page);
    await expectButtonVisible(page, '刷新');
  });

  test('Cluster list page loads', async ({ page }) => {
    await gotoPage(page, '/cluster/list');
    await expectNoWhiteScreen(page);
    const body = await page.textContent('body');
    expect(body).toContain('集群');
  });

  test('My K8s list page loads', async ({ page }) => {
    await gotoPage(page, '/rbac/myClusterList');
    await expectNoWhiteScreen(page);
  });

  test('Favorites list page loads', async ({ page }) => {
    await gotoPage(page, '/favorite/list');
    await expectNoWhiteScreen(page);
  });
});
