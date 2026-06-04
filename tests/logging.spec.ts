import { test, expect } from '@playwright/test';
import { BASE, login, apiLogin, gotoPage, expectNoWhiteScreen, expectButtonVisible, clickButton } from './helpers';

test.describe('Logging & Tracing', () => {

  test('Loki log viewer page loads', async ({ page }) => {
    await gotoPage(page, '/log/loki');
    await expectNoWhiteScreen(page);
    const body = await page.textContent('body');
    expect(body).toContain('Loki');
  });

  test('Loki has query input', async ({ page }) => {
    await gotoPage(page, '/log/loki');
    await expectButtonVisible(page, '查询');
  });

  test('Loki has label selector', async ({ page }) => {
    await gotoPage(page, '/log/loki');
    const body = await page.textContent('body');
    expect(body).toContain('选择标签');
  });

  test('Loki query button works', async ({ page }) => {
    await gotoPage(page, '/log/loki');
    await clickButton(page, '查询');
    await page.waitForTimeout(2000);
    await expectNoWhiteScreen(page);
  });

  test('Trace viewer page loads', async ({ page }) => {
    await gotoPage(page, '/log/trace');
    await expectNoWhiteScreen(page);
    const body = await page.textContent('body');
    expect(body).toContain('链路追踪');
  });

  test('Trace has search mode toggle', async ({ page }) => {
    await gotoPage(page, '/log/trace');
    const body = await page.textContent('body');
    expect(body).toContain('链路搜索');
    expect(body).toContain('SpanID定位');
  });

  test('Trace has service name input', async ({ page }) => {
    await gotoPage(page, '/log/trace');
    const input = page.locator('input[placeholder*="服务名称"]').first();
    await expect(input).toBeVisible();
  });

  test('Trace has time range selector', async ({ page }) => {
    await gotoPage(page, '/log/trace');
    const body = await page.textContent('body');
    expect(body).toContain('最近1小时');
  });

  test('Trace search button works', async ({ page }) => {
    await gotoPage(page, '/log/trace');
    await clickButton(page, '搜索');
    await page.waitForTimeout(2000);
    await expectNoWhiteScreen(page);
  });

  test('Trace service graph tab works', async ({ page }) => {
    await gotoPage(page, '/log/trace');
    await clickButton(page, '服务拓扑');
    await page.waitForTimeout(1000);
    await expectNoWhiteScreen(page);
  });

  test('Trace detail page loads', async ({ page }) => {
    await gotoPage(page, '/log/trace/detail?clusterId=local-cluster&traceId=test');
    await page.waitForTimeout(2000);
    await expectNoWhiteScreen(page);
  });

  test('Trace Search API responds', async ({ request }) => {
    const sessionCookie = await apiLogin(request);
    const resp = await request.get(`${BASE}/mrboard/trace/v1/Search?clusterId=local-cluster&limit=5`, {
      headers: { Cookie: sessionCookie },
    });
    expect(resp.ok()).toBeTruthy();
    const data = await resp.json();
    expect(data).toHaveProperty('code');
    expect(data.code).toBe(0);
    expect(data.data).toBeDefined();
    expect(data.data.length).toBeGreaterThan(0);
  });

  test('Trace Search API returns valid structure', async ({ request }) => {
    const sessionCookie = await apiLogin(request);
    const resp = await request.get(`${BASE}/mrboard/trace/v1/Search?clusterId=local-cluster&limit=3`, {
      headers: { Cookie: sessionCookie },
    });
    const data = await resp.json();
    const trace = data.data[0];
    expect(trace).toHaveProperty('traceID');
    expect(trace).toHaveProperty('rootService');
    expect(trace).toHaveProperty('rootOperation');
    expect(trace).toHaveProperty('duration');
    expect(trace.traceID.length).toBe(32);
  });
});
