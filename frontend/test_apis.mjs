import { chromium } from 'playwright';

const browser = await chromium.launch({ args: ['--no-sandbox'] });
const ctx = await browser.newContext({ ignoreHTTPSErrors: true });
const page = await ctx.newPage();

// Collect API errors
const apiErrors = [];
page.on('response', res => {
  if (res.status() >= 400) {
    apiErrors.push({ url: res.url(), status: res.status() });
  }
});

// Login
await page.goto('https://xkube.xx-xx.xyz/login', { waitUntil: 'domcontentloaded', timeout: 15000 });
await page.evaluate(async () => {
  const fd = new URLSearchParams();
  fd.append('isajax', '1'); fd.append('username', 'admin'); fd.append('password', 'admin'); fd.append('src', 'xkubeApp');
  await fetch('/public/login', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, credentials: 'include', body: fd.toString() });
});
await page.evaluate(() => localStorage.setItem('clusterId', 'local-cluster'));

const routes = [
  '/deploy/list', '/k8s/node', '/k8s/pod', '/cluster/list',
  '/rbac/roleList', '/rbac/adminList', '/rbac/groupList', '/rbac/auditLogList',
  '/wiki/list', '/cicd/list', '/k8s/configmap', '/k8s/secret',
  '/k8s/pvc', '/k8s/ingress', '/k8s/service', '/ops/backup',
  '/resource/list', '/app/list',
];

for (const r of routes) {
  apiErrors.length = 0;
  await page.goto('https://xkube.xx-xx.xyz' + r, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(3000);
  if (apiErrors.length > 0) {
    console.log(`\n=== ${r} ===`);
    apiErrors.forEach(e => console.log(`  ${e.status} ${e.url}`));
  }
}

await browser.close();
