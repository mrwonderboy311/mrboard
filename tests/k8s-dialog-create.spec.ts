import { test, expect } from '@playwright/test';

const BASE = 'http://10.0.0.130:30088';

// Pages that now use dialog-based creation
const pages = [
  { name: 'ConfigMap', path: '/k8s/configmap', title: '配置项[ConfigMap]' },
  { name: 'Secret', path: '/k8s/secret', title: '加密字典[Secret]' },
  { name: 'Service', path: '/k8s/service', title: '服务[Service]' },
  { name: 'Ingress', path: '/k8s/ingress', title: '路由[Ingress]' },
  { name: 'Namespace', path: '/k8s/namespace', title: '命名空间' },
  { name: 'CronJob', path: '/k8s/cronjob', title: '定时任务[CronJob]' },
  { name: 'StatefulSet', path: '/k8s/statefulset', title: '有状态副本集[StatefulSet]' },
  { name: 'Gateway', path: '/k8s/gateway', title: '网关[Gateway]' },
  { name: 'HttpRoute', path: '/k8s/httproute', title: 'HTTP路由[HTTPRoute]' },
  { name: 'Hpa', path: '/k8s/hpa', title: '自动伸缩[HPA]' },
  { name: 'GrpcRoute', path: '/k8s/grpcroute', title: 'GRPC路由[GRPCRoute]' },
  { name: 'TcpRoute', path: '/k8s/tcproute', title: 'TCP路由[TCPRoute]' },
  { name: 'UdpRoute', path: '/k8s/udproute', title: 'UDP路由[UDPRoute]' },
];

test.describe('K8s Dialog Create - All Pages', () => {
  test.beforeEach(async ({ page }) => {
    // Set clusterId in localStorage
    await page.goto(BASE + '/');
    await page.evaluate(() => localStorage.setItem('clusterId', 'local-cluster'));
  });

  for (const pg of pages) {
    test.describe(pg.name, () => {
      test('list page loads with new button', async ({ page }) => {
        await page.goto(BASE + pg.path);
        await expect(page.locator('h1')).toContainText(pg.title);
        const newBtn = page.locator('button', { hasText: '新增' });
        await expect(newBtn).toBeVisible();
      });

      test('dialog opens with form and yaml tabs', async ({ page }) => {
        await page.goto(BASE + pg.path);
        await page.locator('button', { hasText: '新增' }).click();

        const dialog = page.locator('[role="dialog"]');
        await expect(dialog).toBeVisible();
        await expect(dialog.locator('button', { hasText: '表单创建' })).toBeVisible();
        await expect(dialog.locator('button', { hasText: 'YAML创建' })).toBeVisible();
      });

      test('form tab has name field', async ({ page }) => {
        await page.goto(BASE + pg.path);
        await page.locator('button', { hasText: '新增' }).click();

        const dialog = page.locator('[role="dialog"]');
        // Each page should have at least a name input
        const nameInput = dialog.locator('input').first();
        await expect(nameInput).toBeVisible();
      });

      test('yaml tab shows editor', async ({ page }) => {
        await page.goto(BASE + pg.path);
        await page.locator('button', { hasText: '新增' }).click();

        const dialog = page.locator('[role="dialog"]');
        await dialog.locator('button', { hasText: 'YAML创建' }).click();

        const editor = dialog.locator('textarea');
        await expect(editor).toBeVisible();
        const content = await editor.inputValue();
        expect(content).toContain('apiVersion');
      });

      test('cancel button closes dialog', async ({ page }) => {
        await page.goto(BASE + pg.path);
        await page.locator('button', { hasText: '新增' }).click();

        const dialog = page.locator('[role="dialog"]');
        await expect(dialog).toBeVisible();

        await dialog.locator('button', { hasText: '取消' }).click();
        await expect(dialog).not.toBeVisible();
      });

      test('form validates required name', async ({ page }) => {
        await page.goto(BASE + pg.path);
        await page.locator('button', { hasText: '新增' }).click();

        const dialog = page.locator('[role="dialog"]');
        // Click create without filling name
        await dialog.locator('button', { hasText: '创建' }).click();

        // Should show error toast or stay on dialog
        const toast = page.locator('li[role="status"], .cn-toast, [data-sonner-toast]').first();
        const hasToast = await toast.isVisible({ timeout: 3000 }).catch(() => false);
        const dialogStillVisible = await dialog.isVisible();
        // Either toast appeared or dialog is still open (validation prevented submit)
        expect(hasToast || dialogStillVisible).toBeTruthy();
      });
    });
  }
});
