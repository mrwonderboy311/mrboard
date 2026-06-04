import { test, expect } from '@playwright/test';
import { BASE, login, apiLogin, gotoPage, expectNoWhiteScreen, expectButtonVisible } from './helpers';

test.describe('Monitoring', () => {

  test('Dashboard page loads', async ({ page }) => {
    await gotoPage(page, '/monitor/dashboard');
    await expectNoWhiteScreen(page);
    const body = await page.textContent('body');
    expect(body).toContain('监控');
  });

  test('Prometheus page loads', async ({ page }) => {
    await gotoPage(page, '/monitor/prometheus');
    await expectNoWhiteScreen(page);
    const body = await page.textContent('body');
    expect(body).toContain('Prometheus');
  });

  test('Prometheus has cluster selector', async ({ page }) => {
    await gotoPage(page, '/monitor/prometheus');
    const body = await page.textContent('body');
    expect(body).toContain('集群');
  });

  test('Prometheus has time range controls', async ({ page }) => {
    await gotoPage(page, '/monitor/prometheus');
    const body = await page.textContent('body');
    const hasTimeRange = body?.includes('1h') || body?.includes('6h') || body?.includes('时间');
    expect(hasTimeRange).toBeTruthy();
  });

  test('Prometheus has refresh button', async ({ page }) => {
    await gotoPage(page, '/monitor/prometheus');
    const body = await page.textContent('body');
    expect(body).toContain('刷新');
  });

  test('Prometheus label_values API responds', async ({ request }) => {
    const sessionCookie = await apiLogin(request);
    const resp = await request.get(`${BASE}/mrboard/prometheus/v1/label_values?clusterId=local-cluster&label=namespace`, {
      headers: { Cookie: sessionCookie },
    });
    expect(resp.ok()).toBeTruthy();
    const data = await resp.json();
    expect(data).toHaveProperty('code');
    expect(data.code).toBe(0);
  });

  test('Prometheus query_range API responds', async ({ request }) => {
    const sessionCookie = await apiLogin(request);
    const end = Math.floor(Date.now() / 1000);
    const start = end - 3600;
    const resp = await request.get(
      `${BASE}/mrboard/prometheus/v1/query_range?clusterId=local-cluster&metric=cpu&start=${start}&end=${end}&step=60`,
      { headers: { Cookie: sessionCookie } }
    );
    expect(resp.ok()).toBeTruthy();
    const data = await resp.json();
    expect(data).toHaveProperty('code');
  });

  test('Service Health page loads', async ({ page }) => {
    await gotoPage(page, '/monitor/service-health');
    await expectNoWhiteScreen(page);
    const body = await page.textContent('body');
    expect(body).toContain('服务健康');
  });

  test('Service Health has cluster selector', async ({ page }) => {
    await gotoPage(page, '/monitor/service-health');
    const body = await page.textContent('body');
    expect(body).toContain('集群');
  });
});
