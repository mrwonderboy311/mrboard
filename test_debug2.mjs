import { chromium } from 'playwright';

const BASE = 'https://xkube.xx-xx.xyz';

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await context.newPage();

  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', err => errors.push('PAGE: ' + err.message));

  // Login
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
  console.log('Login:', loginResult.status ? 'OK' : 'FAIL');

  // Check cookies
  const cookies = await context.cookies();
  console.log('Cookies:', cookies.map(c => c.name + '=' + c.value.slice(0, 20)).join(', '));

  // Navigate to deploy list using client-side navigation
  // First, let's check if we're on the login page and navigate from there
  console.log('\n=== Current page state ===');
  console.log('URL:', page.url());

  // Try clicking a menu item instead of direct navigation
  // Or try navigating via React Router
  await page.goto(BASE + '/deploy/list', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(3000);

  console.log('\n=== After navigation ===');
  console.log('URL:', page.url());
  const bodyText = await page.textContent('body');
  console.log('Body text:', bodyText.slice(0, 500));
  console.log('Root HTML:', await page.$eval('#root', el => el.innerHTML.slice(0, 300)).catch(() => 'NOT FOUND'));

  // Check auth via API
  const checkRes = await page.evaluate(async () => {
    const res = await fetch('/public/check', { credentials: 'include' });
    return await res.json();
  });
  console.log('/public/check:', JSON.stringify(checkRes));

  // Check if useAuth redirects
  const myinfoRes = await page.evaluate(async () => {
    const res = await fetch('/public/myinfo', { credentials: 'include' });
    return { status: res.status, body: await res.text() };
  });
  console.log('/public/myinfo:', JSON.stringify(myinfoRes).slice(0, 300));

  if (errors.length) {
    console.log('\n=== Console errors ===');
    errors.forEach(e => console.log(' -', e.slice(0, 200)));
  }

  await page.screenshot({ path: '/root/xkube/screenshots/debug_deploy.png', fullPage: true });
  await browser.close();
})();
