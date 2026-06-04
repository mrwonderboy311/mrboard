import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:3000';

test.describe('xkube Frontend-Backend Separation Verification', () => {

  test('1. Login page loads correctly', async ({ page }) => {
    await page.goto(BASE);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await expect(page.locator('input[type="text"], input[placeholder*="用户"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button:has-text("登")')).toBeVisible();
    console.log('✓ Login page loads correctly');
  });

  test('2. API health check works', async ({ request }) => {
    const resp = await request.get(`${BASE}/public/check`);
    expect(resp.ok()).toBeTruthy();
    const data = await resp.json();
    expect(data.status).toBe(true);
    console.log('✓ API health check works');
  });

  test('3. Login with admin credentials', async ({ page }) => {
    const consoleMessages: string[] = [];
    page.on('console', msg => consoleMessages.push(msg.text()));
    await page.goto(BASE);
    await page.fill('input[type="text"], input[placeholder*="用户"]', 'admin');
    await page.fill('input[type="password"]', 'admin');
    await page.click('button:has-text("登")');
    // Wait a bit for the login request to complete
    await page.waitForTimeout(3000);
    const url = page.url();
    const bodyText = await page.textContent('body').catch(() => '');
    console.log('URL after login:', url);
    console.log('Body length:', bodyText?.length);
    console.log('Console messages:', consoleMessages.join(' | '));
    // Verify we're no longer on the login page
    expect(url).not.toContain('/login');
    console.log('✓ Login with admin works, redirected to dashboard');
  });

  test('4. Dashboard page loads after login', async ({ page }) => {
    await page.goto(BASE);
    await page.fill('input[type="text"], input[placeholder*="用户"]', 'admin');
    await page.fill('input[type="password"]', 'admin');
    await page.click('button:has-text("登")');
    await page.waitForURL(/.*\/(?!login)/, { timeout: 10000 });
    // Verify page has rendered content (not blank)
    const body = await page.textContent('body');
    expect(body?.length).toBeGreaterThan(0);
    console.log('✓ Dashboard page loads after login');
  });

  test('5. Cluster list page loads via direct URL', async ({ page }) => {
    await page.goto(BASE);
    await page.fill('input[type="text"], input[placeholder*="用户"]', 'admin');
    await page.fill('input[type="password"]', 'admin');
    await page.click('button:has-text("登")');
    await page.waitForURL(/.*\/(?!login)/, { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    await page.goto(BASE + '/cluster/list');
    await page.waitForLoadState('networkidle');
    const body = await page.textContent('body');
    expect(body?.length).toBeGreaterThan(0);
    console.log('✓ Cluster list page loads');
  });

  test('6. Deploy list page loads via direct URL', async ({ page }) => {
    await page.goto(BASE);
    await page.fill('input[type="text"], input[placeholder*="用户"]', 'admin');
    await page.fill('input[type="password"]', 'admin');
    await page.click('button:has-text("登")');
    await page.waitForURL(/.*\/(?!login)/, { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    await page.goto(BASE + '/deploy/list');
    await page.waitForLoadState('networkidle');
    const body = await page.textContent('body');
    expect(body?.length).toBeGreaterThan(0);
    console.log('✓ Deploy list page loads');
  });

  test('7. RBAC admin list page loads via direct URL', async ({ page }) => {
    await page.goto(BASE);
    await page.fill('input[type="text"], input[placeholder*="用户"]', 'admin');
    await page.fill('input[type="password"]', 'admin');
    await page.click('button:has-text("登")');
    await page.waitForURL(/.*\/(?!login)/, { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    await page.goto(BASE + '/rbac/adminList');
    await page.waitForLoadState('networkidle');
    const body = await page.textContent('body');
    expect(body?.length).toBeGreaterThan(0);
    console.log('✓ RBAC admin list page loads');
  });

  test('8. Wiki list page loads via direct URL', async ({ page }) => {
    await page.goto(BASE);
    await page.fill('input[type="text"], input[placeholder*="用户"]', 'admin');
    await page.fill('input[type="password"]', 'admin');
    await page.click('button:has-text("登")');
    await page.waitForURL(/.*\/(?!login)/, { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    await page.goto(BASE + '/wiki/list');
    await page.waitForLoadState('networkidle');
    const body = await page.textContent('body');
    expect(body?.length).toBeGreaterThan(0);
    console.log('✓ Wiki list page loads');
  });

  test('9. Search page loads via direct URL', async ({ page }) => {
    await page.goto(BASE);
    await page.fill('input[type="text"], input[placeholder*="用户"]', 'admin');
    await page.fill('input[type="password"]', 'admin');
    await page.click('button:has-text("登")');
    await page.waitForURL(/.*\/(?!login)/, { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    await page.goto(BASE + '/search');
    await page.waitForLoadState('networkidle');
    const body = await page.textContent('body');
    expect(body?.length).toBeGreaterThan(0);
    console.log('✓ Search page loads');
  });

  test('10. Cluster API returns JSON (not HTML)', async ({ request }) => {
    // Login first to get a valid session cookie
    const loginResp = await request.post(`${BASE}/public/login`, {
      form: { isajax: '1', username: 'admin', password: 'admin', src: 'mrboardApp' },
    });
    const cookies = loginResp.headers()['set-cookie'] || '';
    const sessionCookie = cookies.split(';')[0];
    const resp = await request.get(`${BASE}/mrboard/cluster/v1/List`, {
      headers: { Cookie: sessionCookie },
    });
    expect(resp.ok()).toBeTruthy();
    const data = await resp.json();
    expect(data).toHaveProperty('code');
    console.log('✓ Cluster API returns JSON');
  });
});
