import { chromium } from 'playwright';

const browser = await chromium.launch({ args: ['--no-sandbox'] });
const ctx = await browser.newContext({ ignoreHTTPSErrors: true });
const page = await ctx.newPage();

await page.goto('https://xkube.xx-xx.xyz/login', { waitUntil: 'domcontentloaded', timeout: 15000 });
await page.evaluate(async () => {
  const fd = new URLSearchParams();
  fd.append('isajax', '1'); fd.append('username', 'admin'); fd.append('password', 'admin'); fd.append('src', 'xkubeApp');
  await fetch('/public/login', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, credentials: 'include', body: fd.toString() });
});
await page.evaluate(() => localStorage.setItem('clusterId', 'local-cluster'));

const routes = [
  '/deploy/create', '/deploy/yamlCreate',
  '/service/create', '/service/yamlCreate',
  '/configmap/create', '/configmap/yamlCreate',
  '/secret/yamlCreate', '/ingress/create',
  '/namespace/create', '/pv/create',
  '/node/detail', '/pod/detail',
  '/deploy/detail', '/deploy/yaml',
];

for (const r of routes) {
  await page.goto('https://xkube.xx-xx.xyz' + r, { waitUntil: 'domcontentloaded', timeout: 10000 });
  await page.waitForTimeout(1500);
  const title = await page.textContent('h1').catch(() => 'NO H1');
  const url = page.url().replace('https://xkube.xx-xx.xyz', '');
  console.log(`${r} -> ${url} | h1: ${title}`);
}

await browser.close();
