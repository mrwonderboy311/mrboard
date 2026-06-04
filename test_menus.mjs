import { chromium } from 'playwright';

const BASE = 'https://xkube.xx-xx.xyz';

const routes = [
  '/cluster/list', '/rbac/myClusterList', '/favorite/list',
  '/k8s/nodepool', '/k8s/node', '/k8s/namespace', '/k8s/podmetrics',
  '/k8s/clusterrolebinding', '/k8s/clusterroles', '/k8s/rolebinding',
  '/k8s/roles', '/k8s/serviceaccounts', '/k8s/event',
  '/deploy/list', '/k8s/statefulset', '/k8s/daemonset', '/k8s/job',
  '/k8s/cronjob', '/k8s/pod', '/k8s/crd', '/k8s/hpa', '/tools/apply-yaml',
  '/k8s/service', '/k8s/ingress',
  '/k8s/gatewayclass', '/k8s/gateway', '/k8s/httproute', '/k8s/grpcroute',
  '/k8s/tcproute', '/k8s/udproute',
  '/k8s/configmap', '/k8s/secret',
  '/k8s/pvc', '/k8s/pv', '/k8s/storageclass',
  '/app/list', '/tools/clone-resource', '/ops/backup',
  '/cicd/list', '/cicd/aliyunak', '/cicd/jenkins', '/cicd/pipelines',
  '/rbac/adminList', '/rbac/roleList', '/rbac/groupList', '/rbac/nodeList',
  '/rbac/clusterToUserList', '/rbac/lockList', '/rbac/auditLogList',
  '/wiki/columns', '/wiki/list',
  '/log/loki', '/log/trace',
  '/search', '/ai/chat',
];

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await context.newPage();

  // Login via API directly (bypass captcha with src=xkubeApp)
  console.log('=== Logging in via API ===');
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
  console.log('Login result:', JSON.stringify(loginResult));

  if (!loginResult.status) {
    console.log('Login failed! Exiting.');
    await browser.close();
    return;
  }

  // Set clusterId from myClusterList
  const clusterRes = await page.evaluate(async () => {
    const res = await fetch('/rbac/cluster/MyClusterList', { credentials: 'include' });
    return await res.json();
  });
  console.log('Cluster list:', JSON.stringify(clusterRes).slice(0, 300));
  if (clusterRes.data && clusterRes.data.length > 0) {
    const clusterId = clusterRes.data[0].cluster_id;
    console.log('Using clusterId:', clusterId);
    await page.evaluate((id) => localStorage.setItem('clusterId', id), clusterId);
  }

  const results = [];

  for (const route of routes) {
    const url = BASE + route;
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 10000 });
      await page.waitForTimeout(2000);

      const bodyText = await page.textContent('body').catch(() => '');
      const hasTable = await page.$('table').then(el => !!el).catch(() => false);
      const hasData = await page.$$('tbody tr').then(rows => rows.length > 1).catch(() => false);
      const hasError = bodyText.includes('Error') && bodyText.length < 200;
      const isEmpty = bodyText.trim().length < 80;
      const pageTitle = await page.$('h1').then(el => el?.textContent()).catch(() => '');

      let result = 'OK';
      if (isEmpty) result = 'BLANK';
      else if (hasError) result = 'ERROR';

      const emoji = result === 'OK' ? '✅' : '❌';
      const dataInfo = hasTable ? (hasData ? 'HAS_DATA' : 'TABLE_NO_DATA') : 'NO_TABLE';
      console.log(`${emoji} ${route} → ${result} [${dataInfo}] title="${pageTitle}"`);
      results.push({ route, result, hasTable, hasData, pageTitle });
    } catch (err) {
      console.log(`❌ ${route} → TIMEOUT: ${err.message.slice(0, 60)}`);
      results.push({ route, result: 'TIMEOUT' });
    }
  }

  console.log('\n=== SUMMARY ===');
  const ok = results.filter(r => r.result === 'OK').length;
  const fail = results.filter(r => r.result !== 'OK').length;
  console.log(`Total: ${results.length}, OK: ${ok}, Failed: ${fail}`);
  if (fail > 0) {
    console.log('\nFailed pages:');
    results.filter(r => r.result !== 'OK').forEach(r => console.log(`  ${r.route} → ${r.result}`));
  }

  // Take a final screenshot of a working page
  await page.goto(BASE + '/deploy/list', { waitUntil: 'domcontentloaded', timeout: 10000 });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: '/root/xkube/screenshots/deploy_list.png', fullPage: true });

  await browser.close();
})();
