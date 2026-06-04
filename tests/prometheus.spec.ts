import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:3000';

async function login(page: any) {
  await page.goto(BASE);
  await page.fill('input[type="text"], input[placeholder*="用户"]', 'admin');
  await page.fill('input[type="password"]', 'admin');
  await page.click('button:has-text("登")');
  await page.waitForURL(/.*\/(?!login)/, { timeout: 15000 });
  await page.waitForLoadState('networkidle');
}

async function apiLogin(request: any) {
  const loginResp = await request.post(`${BASE}/public/login`, {
    form: { isajax: '1', username: 'admin', password: 'admin', src: 'mrboardApp' },
  });
  const cookies = loginResp.headers()['set-cookie'] || '';
  return cookies.split(';')[0];
}

test.describe('Prometheus Drilldown Metrics', () => {

  test('1. Prometheus metrics page loads', async ({ page }) => {
    await login(page);
    await page.goto(BASE + '/monitor/prometheus');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    const body = await page.textContent('body');
    expect(body).toContain('Prometheus');
    console.log('✓ Prometheus metrics page loads');
  });

  test('2. Prometheus page has correct UI elements', async ({ page }) => {
    await login(page);
    await page.goto(BASE + '/monitor/prometheus');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    const body = await page.textContent('body');
    // Should have cluster selector, time range, refresh controls
    expect(body).toContain('集群');
    expect(body).toContain('刷新');
    console.log('✓ Prometheus page has correct UI elements');
  });

  test('3. Cluster selector is present', async ({ page }) => {
    await login(page);
    await page.goto(BASE + '/monitor/prometheus');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    const body = await page.textContent('body');
    const hasClusterUI = body?.includes('集群') || body?.includes('选择');
    expect(hasClusterUI).toBeTruthy();
    console.log('✓ Cluster selector UI present');
  });

  test('4. Time range presets visible', async ({ page }) => {
    await login(page);
    await page.goto(BASE + '/monitor/prometheus');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    const body = await page.textContent('body');
    const hasTimeRange = body?.includes('1h') || body?.includes('6h') || body?.includes('时间');
    expect(hasTimeRange).toBeTruthy();
    console.log('✓ Time range controls visible');
  });

  test('5. Auto-refresh button exists', async ({ page }) => {
    await login(page);
    await page.goto(BASE + '/monitor/prometheus');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    const body = await page.textContent('body');
    const hasRefresh = body?.includes('刷新') || body?.includes('自动');
    expect(hasRefresh).toBeTruthy();
    console.log('✓ Auto-refresh button visible');
  });

  test('6. Prometheus label_values API responds', async ({ request }) => {
    const sessionCookie = await apiLogin(request);
    const resp = await request.get(`${BASE}/mrboard/prometheus/v1/label_values?clusterId=local-cluster&label=namespace`, {
      headers: { Cookie: sessionCookie },
    });
    expect(resp.ok()).toBeTruthy();
    const data = await resp.json();
    expect(data).toHaveProperty('code');
    expect(data.code).toBe(0);
    console.log('✓ Prometheus label_values API responds:', JSON.stringify(data).substring(0, 100));
  });

  test('7. Prometheus query_range API responds', async ({ request }) => {
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
    console.log('✓ Prometheus query_range API responds:', JSON.stringify(data).substring(0, 100));
  });

  test('8. Cluster edit shows Prometheus URL field', async ({ page }) => {
    await login(page);
    await page.goto(BASE + '/cluster/edit/3');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    const body = await page.textContent('body');
    const hasPromField = body?.includes('Prometheus') || body?.includes('prometheus');
    expect(hasPromField).toBeTruthy();
    console.log('✓ Cluster edit has Prometheus URL field');
  });

  test('9. Service health page loads', async ({ page }) => {
    await login(page);
    await page.goto(BASE + '/monitor/service-health');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    const body = await page.textContent('body');
    expect(body).toContain('服务健康');
    console.log('✓ Service health page loads');
  });

  test('10. Service health has cluster selector', async ({ page }) => {
    await login(page);
    await page.goto(BASE + '/monitor/service-health');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    const body = await page.textContent('body');
    expect(body).toContain('集群');
    console.log('✓ Service health has cluster selector');
  });

  test('11. Log viewer page loads', async ({ page }) => {
    await login(page);
    await page.goto(BASE + '/log/loki');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    const body = await page.textContent('body');
    expect(body).toContain('Loki');
    console.log('✓ Log viewer page loads');
  });

  test('12. Trace detail page loads', async ({ page }) => {
    await login(page);
    await page.goto(BASE + '/log/trace/detail?clusterId=local-cluster&traceId=test');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    const body = await page.textContent('body');
    const hasTraceUI = body?.includes('Trace') || body?.includes('链路') || body?.includes('未找到');
    expect(hasTraceUI).toBeTruthy();
    console.log('✓ Trace detail page loads');
  });
});
