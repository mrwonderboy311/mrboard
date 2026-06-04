import { chromium } from 'playwright';

const BASE = 'https://xkube.xx-xx.xyz';

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await context.newPage();

  // Check login page
  console.log('=== Checking login page ===');
  await page.goto(BASE + '/login', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: '/root/xkube/screenshots/01_login.png', fullPage: true });

  const bodyText = await page.textContent('body').catch(() => '');
  console.log('Login page body length:', bodyText.length);
  console.log('Login page body preview:', bodyText.slice(0, 300));

  // Try to find and fill login form
  const inputs = await page.$$('input');
  console.log('Number of inputs found:', inputs.length);
  for (let i = 0; i < inputs.length; i++) {
    const type = await inputs[i].getAttribute('type');
    const placeholder = await inputs[i].getAttribute('placeholder');
    console.log(`  Input ${i}: type=${type}, placeholder=${placeholder}`);
  }

  const buttons = await page.$$('button');
  console.log('Number of buttons found:', buttons.length);
  for (let i = 0; i < buttons.length; i++) {
    const text = await buttons[i].textContent();
    console.log(`  Button ${i}: "${text}"`);
  }

  // Try login
  const userInput = await page.$('input[type="text"], input[placeholder*="用户"]');
  const pwdInput = await page.$('input[type="password"]');

  if (userInput && pwdInput) {
    await userInput.fill('admin');
    await pwdInput.fill('admin123');
    await page.screenshot({ path: '/root/xkube/screenshots/02_filled.png', fullPage: true });

    const submitBtn = await page.$('button[type="submit"], button:has-text("登录"), button:has-text("Login")');
    if (submitBtn) {
      await submitBtn.click();
      await page.waitForTimeout(3000);
      await page.screenshot({ path: '/root/xkube/screenshots/03_after_login.png', fullPage: true });

      const afterBody = await page.textContent('body').catch(() => '');
      console.log('\nAfter login body length:', afterBody.length);
      console.log('After login body preview:', afterBody.slice(0, 500));
      console.log('Current URL:', page.url());
    } else {
      console.log('No submit button found');
    }
  } else {
    console.log('No login form inputs found');
    // Maybe already logged in or different page
    console.log('Current URL:', page.url());
  }

  // Check if there's a network request we can intercept
  console.log('\n=== Checking API responses ===');
  const apiResponse = await page.evaluate(async () => {
    try {
      const res = await fetch('/public/check', { credentials: 'include' });
      const text = await res.text();
      return { status: res.status, body: text.slice(0, 500) };
    } catch (e) {
      return { error: e.message };
    }
  });
  console.log('/public/check response:', JSON.stringify(apiResponse));

  await browser.close();
})();
