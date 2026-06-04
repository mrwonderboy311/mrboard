import { chromium } from 'playwright';

const BASE = 'https://xkube.xx-xx.xyz';

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await context.newPage();

  // Capture console errors
  page.on('console', msg => {
    if (msg.type() === 'error') console.log('CONSOLE ERROR:', msg.text());
  });
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  // Login first
  await page.goto(BASE + '/login', { waitUntil: 'domcontentloaded', timeout: 15000 });
  const loginResult = await page.evaluate(async () => {
    const formData = new URLSearchParams();
    formData.append('isajax', '1');
    formData.append('username', 'admin');
    formData.append('password', 'admin');
    formData.append('src', 'xkubeApp');
    const res = await fetch('/public/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      credentials: 'include',
      body: formData.toString(),
    });
    return await res.json();
  });
  console.log('Login:', loginResult.status ? 'SUCCESS' : 'FAILED');

  // Set clusterId
  await page.evaluate(() => localStorage.setItem('clusterId', 'local-cluster'));

  // Navigate to deploy list
  console.log('\n=== Testing /deploy/list ===');
  await page.goto(BASE + '/deploy/list', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: '/root/xkube/screenshots/deploy_list.png', fullPage: true });

  const html = await page.content();
  console.log('HTML length:', html.length);
  console.log('Has root div:', html.includes('id="root"'));
  console.log('Body text:', (await page.textContent('body')).slice(0, 500));
  console.log('URL:', page.url());

  // Check if React rendered anything
  const rootHtml = await page.$eval('#root', el => el.innerHTML).catch(() => 'NOT FOUND');
  console.log('Root innerHTML length:', rootHtml.length);
  console.log('Root innerHTML preview:', rootHtml.slice(0, 300));

  // Test API directly
  console.log('\n=== Testing API ===');
  const apiRes = await page.evaluate(async () => {
    const res = await fetch('/xkube/deploy/v1/List?clusterId=local-cluster', { credentials: 'include' });
    const text = await res.text();
    return { status: res.status, body: text.slice(0, 500) };
  });
  console.log('API /xkube/deploy/v1/List:', JSON.stringify(apiRes));

  // Check public/check
  const checkRes = await page.evaluate(async () => {
    const res = await fetch('/public/check', { credentials: 'include' });
    return await res.json();
  });
  console.log('/public/check:', JSON.stringify(checkRes));

  await browser.close();
})();
