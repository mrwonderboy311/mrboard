import { chromium } from 'playwright';
const BASE = 'https://xkube.xx-xx.xyz';
const pages = [
  '/deploy/list', '/k8s/node', '/k8s/pod', '/rbac/roleList',
  '/wiki/list', '/cicd/list', '/k8s/configmap', '/ops/backup',
];
(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(BASE + '/login', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.evaluate(async () => {
    const fd = new URLSearchParams();
    fd.append('isajax', '1'); fd.append('username', 'admin'); fd.append('password', 'admin'); fd.append('src', 'xkubeApp');
    await fetch('/public/login', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, credentials: 'include', body: fd.toString() });
  });
  await page.evaluate(() => localStorage.setItem('clusterId', 'local-cluster'));
  for (const p of pages) {
    await page.goto(BASE + p, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2000);
    const name = p.replace(/\//g, '_').replace(/^_/, '');
    await page.screenshot({ path: `/root/xkube/screenshots/${name}.png`, fullPage: true });
    console.log('Screenshot:', p);
  }
  await browser.close();
})();
