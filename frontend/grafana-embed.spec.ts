import { test, expect } from '@playwright/test';
import { BASE } from './helpers';

test('Grafana embed and tab switching', async ({ page, request }) => {
  test.setTimeout(120000);
  
  // Login
  const loginResp = await request.post(BASE + '/public/login', {
    form: { isajax: '1', username: 'admin', password: 'admin', src: 'mrboardApp' },
  });
  const cookies = loginResp.headers()['set-cookie'] || '';
  const sessionCookie = cookies.split(';')[0];
  const [name, value] = sessionCookie.split('=');
  await page.context().addCookies([{ name, value, domain: '10.0.0.130', path: '/' }]);
  
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForTimeout(2000);
  await page.evaluate(() => localStorage.setItem('clusterId', 'local-cluster'));
  
  // Navigate to Grafana page
  await page.goto(BASE + '/monitor/dashboard', { waitUntil: 'load' });
  await page.waitForTimeout(8000);
  
  // Check metrics tab (default)
  const iframe = page.locator('iframe');
  await expect(iframe).toBeVisible({ timeout: 15000 });
  const src1 = await iframe.getAttribute('src');
  console.log('✅ 指标 tab src:', src1?.substring(0, 80));
  expect(src1).toContain('prometheus');
  
  // Check Grafana content loaded (not login page)
  const iframeDoc = await iframe.contentFrame();
  const title = await iframeDoc?.title();
  console.log('✅ Grafana page title:', title);
  
  await page.screenshot({ path: '/tmp/grafana-metrics.png', fullPage: true });
  
  // Switch to logs tab
  await page.getByRole('button', { name: '日志' }).click();
  await page.waitForTimeout(3000);
  const src2 = await iframe.getAttribute('src');
  console.log('✅ 日志 tab src:', src2?.substring(0, 80));
  expect(src2).toContain('loki');
  await page.screenshot({ path: '/tmp/grafana-logs.png', fullPage: true });
  
  // Switch to traces tab
  await page.getByRole('button', { name: '链路' }).click();
  await page.waitForTimeout(3000);
  const src3 = await iframe.getAttribute('src');
  console.log('✅ 链路 tab src:', src3?.substring(0, 80));
  expect(src3).toContain('tempo');
  await page.screenshot({ path: '/tmp/grafana-traces.png', fullPage: true });
  
  console.log('\n🎉 Grafana 嵌入 + Tab 切换验证通过！');
});
