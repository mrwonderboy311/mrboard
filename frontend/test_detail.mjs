import { chromium } from 'playwright';

const browser = await chromium.launch({ args: ['--no-sandbox'] });
const ctx = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

const apiErrors = [];
page.on('response', res => {
  if (res.url().includes('/xkube/') && res.status() >= 400) {
    apiErrors.push({ url: res.url().replace('https://xkube.xx-xx.xyz', ''), status: res.status() });
  }
});

await page.goto('https://xkube.xx-xx.xyz/login', { waitUntil: 'domcontentloaded', timeout: 15000 });
await page.evaluate(async () => {
  const fd = new URLSearchParams();
  fd.append('isajax', '1'); fd.append('username', 'admin'); fd.append('password', 'admin'); fd.append('src', 'xkubeApp');
  await fetch('/public/login', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, credentials: 'include', body: fd.toString() });
});
await page.evaluate(() => localStorage.setItem('clusterId', 'local-cluster'));

// First get some resource names from list pages
async function getFirstResource(listUrl, nameField) {
  await page.goto('https://xkube.xx-xx.xyz' + listUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(3000);
  const text = await page.textContent('body');
  // Try to find table rows
  const rows = await page.$$eval('table tbody tr', rows => 
    rows.map(r => r.querySelector('td')?.textContent?.trim()).filter(Boolean)
  );
  return rows[0] || null;
}

// Get first deploy name
const deployName = await getFirstResource('/deploy/list');
console.log('First deploy:', deployName);

const podName = await getFirstResource('/k8s/pod');
console.log('First pod:', podName);

const nodeName = await getFirstResource('/k8s/node');
console.log('First node:', nodeName);

// Test detail pages with resource names
const detailTests = [];

if (deployName) {
  detailTests.push(
    `/deploy/detail?name=${deployName}&namespace=default`,
    `/deploy/yaml?name=${deployName}&namespace=default`,
  );
}

if (podName) {
  detailTests.push(
    `/pod/detail?name=${podName}&namespace=default`,
    `/pod/yaml?name=${podName}&namespace=default`,
    `/pod/log?name=${podName}&namespace=default`,
  );
}

if (nodeName) {
  detailTests.push(
    `/node/detail?name=${nodeName}`,
    `/node/yaml?name=${nodeName}`,
  );
}

// Test create pages
const createTests = [
  '/deploy/create', '/deploy/yamlCreate',
  '/service/create', '/service/yamlCreate',
  '/configmap/create', '/configmap/yamlCreate',
  '/secret/yamlCreate', '/ingress/create',
  '/namespace/create', '/pv/create',
];

console.log('\n=== Detail/YAML Pages ===');
for (const r of detailTests) {
  apiErrors.length = 0;
  await page.goto('https://xkube.xx-xx.xyz' + r, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(3000);
  const errs = apiErrors.filter(e => !e.url.includes('/public/'));
  if (errs.length === 0) {
    console.log('OK   ', r);
  } else {
    console.log('FAIL ', r);
    errs.forEach(e => console.log('       ', e.status, e.url));
  }
}

console.log('\n=== Create Pages ===');
for (const r of createTests) {
  apiErrors.length = 0;
  await page.goto('https://xkube.xx-xx.xyz' + r, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(2000);
  const errs = apiErrors.filter(e => !e.url.includes('/public/'));
  const title = await page.textContent('h1').catch(() => '');
  if (errs.length === 0) {
    console.log('OK   ', r, title ? `(${title})` : '');
  } else {
    console.log('FAIL ', r, title ? `(${title})` : '');
    errs.forEach(e => console.log('       ', e.status, e.url));
  }
}

await browser.close();
