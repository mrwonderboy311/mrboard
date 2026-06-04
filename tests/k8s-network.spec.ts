import { test, expect } from '@playwright/test';
import { BASE, gotoPage, expectNoWhiteScreen, expectButtonVisible, clickButton } from './helpers';

test.describe('K8s Network', () => {

  test('Service list page loads', async ({ page }) => {
    await gotoPage(page, '/k8s/service');
    await expectNoWhiteScreen(page);
    await expectButtonVisible(page, '刷新');
  });

  test('Service list namespace filter works', async ({ page }) => {
    await gotoPage(page, '/k8s/service');
    const select = page.locator('select').first();
    if (await select.isVisible()) {
      await select.selectOption({ index: 1 });
      await page.waitForTimeout(500);
    }
    await expectNoWhiteScreen(page);
  });

  test('Ingress list page loads', async ({ page }) => {
    await gotoPage(page, '/k8s/ingress');
    await expectNoWhiteScreen(page);
    await expectButtonVisible(page, '刷新');
  });

  test('GatewayClass list page loads', async ({ page }) => {
    await gotoPage(page, '/k8s/gatewayclass');
    await expectNoWhiteScreen(page);
    await expectButtonVisible(page, '刷新');
  });

  test('Gateway list page loads', async ({ page }) => {
    await gotoPage(page, '/k8s/gateway');
    await expectNoWhiteScreen(page);
    await expectButtonVisible(page, '刷新');
  });

  test('HTTPRoute list page loads', async ({ page }) => {
    await gotoPage(page, '/k8s/httproute');
    await expectNoWhiteScreen(page);
    await expectButtonVisible(page, '刷新');
  });

  test('GRPCRoute list page loads', async ({ page }) => {
    await gotoPage(page, '/k8s/grpcroute');
    await expectNoWhiteScreen(page);
    await expectButtonVisible(page, '刷新');
  });

  test('TCPRoute list page loads', async ({ page }) => {
    await gotoPage(page, '/k8s/tcproute');
    await expectNoWhiteScreen(page);
    await expectButtonVisible(page, '刷新');
  });

  test('UDPRoute list page loads', async ({ page }) => {
    await gotoPage(page, '/k8s/udproute');
    await expectNoWhiteScreen(page);
    await expectButtonVisible(page, '刷新');
  });
});
