import { test, expect } from '@playwright/test';
import { BASE, login, gotoPage, expectNoWhiteScreen, expectButtonVisible, clickButton } from './helpers';

test.describe('Observability Pages', () => {

  // ===== Monitor Dashboard =====
  test.describe('Monitor Dashboard', () => {
    test('page loads without white screen', async ({ page }) => {
      await gotoPage(page, '/monitor/dashboard');
      await expectNoWhiteScreen(page);
      await expect(page.locator('h1')).toContainText('监控面板');
    });

    test('refresh button works', async ({ page }) => {
      await gotoPage(page, '/monitor/dashboard');
      await clickButton(page, '刷新');
    });

    test('displays stat cards', async ({ page }) => {
      await gotoPage(page, '/monitor/dashboard');
      await expect(page.getByText('集群数量')).toBeVisible();
      await expect(page.getByText('Deployment 总数')).toBeVisible();
    });
  });

  // ===== Prometheus Metrics =====
  test.describe('Prometheus Metrics', () => {
    test('page loads without white screen', async ({ page }) => {
      await gotoPage(page, '/monitor/prometheus');
      await expectNoWhiteScreen(page);
      await expect(page.locator('h1')).toContainText('Prometheus 指标');
    });

    test('cluster selector label is visible', async ({ page }) => {
      await gotoPage(page, '/monitor/prometheus');
      await expect(page.getByText('集群:')).toBeVisible();
    });

    test('time range buttons are visible', async ({ page }) => {
      await gotoPage(page, '/monitor/prometheus');
      await expect(page.getByRole('button', { name: '5m', exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: '1h', exact: true })).toBeVisible();
    });

    test('auto refresh button works', async ({ page }) => {
      await gotoPage(page, '/monitor/prometheus');
      await clickButton(page, '自动刷新');
      await expect(page.getByRole('button', { name: /暂停/ })).toBeVisible();
    });

    test('refresh button works', async ({ page }) => {
      await gotoPage(page, '/monitor/prometheus');
      await page.getByRole('button', { name: '刷新', exact: true }).click();
    });

    test('charts display or show no data message', async ({ page }) => {
      await gotoPage(page, '/monitor/prometheus');
      await page.waitForTimeout(3000);
      const body = await page.textContent('body');
      const hasCharts = body?.includes('CPU 使用率') || body?.includes('暂无数据') || body?.includes('请先在集群配置中填写');
      expect(hasCharts).toBeTruthy();
    });
  });

  // ===== Service Health =====
  test.describe('Service Health', () => {
    test('page loads without white screen', async ({ page }) => {
      await gotoPage(page, '/monitor/service-health');
      await expectNoWhiteScreen(page);
      await expect(page.locator('h1')).toContainText('服务健康概览');
    });

    test('cluster selector label is visible', async ({ page }) => {
      await gotoPage(page, '/monitor/service-health');
      await expect(page.getByText('集群:')).toBeVisible();
    });

    test('refresh button exists', async ({ page }) => {
      await gotoPage(page, '/monitor/service-health');
      // Button may be disabled if no cluster selected, just verify it exists
      await expect(page.getByRole('button', { name: '刷新' })).toBeAttached();
    });
  });

  // ===== Log Viewer =====
  test.describe('Log Viewer', () => {
    test('page loads without white screen', async ({ page }) => {
      await gotoPage(page, '/log/loki');
      await expectNoWhiteScreen(page);
    });

    test('label browser sidebar is visible', async ({ page }) => {
      await gotoPage(page, '/log/loki');
      await expect(page.getByText('标签浏览器')).toBeVisible();
      await expect(page.getByRole('button', { name: '命名空间' })).toBeVisible();
    });

    test('LogQL input is visible', async ({ page }) => {
      await gotoPage(page, '/log/loki');
      await expect(page.getByText('LogQL', { exact: true })).toBeVisible();
    });

    test('level filter buttons are visible', async ({ page }) => {
      await gotoPage(page, '/log/loki');
      await expect(page.getByRole('button', { name: 'ERROR', exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: 'WARN', exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: 'INFO', exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: 'DEBUG', exact: true })).toBeVisible();
    });

    test('selecting namespace shows services section', async ({ page }) => {
      await gotoPage(page, '/log/loki');
      await page.waitForTimeout(2000);
      const nsButtons = page.getByRole('button', { name: 'mrboard' }).or(page.getByRole('button', { name: 'default' })).or(page.getByRole('button', { name: 'observability' })).first();
      if (await nsButtons.isVisible({ timeout: 3000 }).catch(() => false)) {
        await nsButtons.click();
        await page.waitForTimeout(1000);
        await expect(page.getByRole('button', { name: '服务' })).toBeVisible();
      }
    });

    test('query button is disabled without namespace', async ({ page }) => {
      await gotoPage(page, '/log/loki');
      const queryBtn = page.getByRole('button', { name: '查询', exact: true });
      await expect(queryBtn).toBeAttached();
      // Button should be disabled when no namespace selected
      await expect(queryBtn).toBeDisabled();
    });

    test('live tail button exists', async ({ page }) => {
      await gotoPage(page, '/log/loki');
      await expect(page.getByRole('button', { name: '实时', exact: true })).toBeAttached();
    });

    test('histogram appears when namespace selected', async ({ page }) => {
      await gotoPage(page, '/log/loki');
      await page.waitForTimeout(2000);
      const nsButtons = page.getByRole('button', { name: 'mrboard' }).or(page.getByRole('button', { name: 'default' })).or(page.getByRole('button', { name: 'observability' })).first();
      if (await nsButtons.isVisible({ timeout: 3000 }).catch(() => false)) {
        await nsButtons.click();
        await page.waitForTimeout(3000);
        // Histogram should appear (recharts renders SVG rect elements)
        const svgRects = await page.locator('svg rect').count();
        expect(svgRects).toBeGreaterThan(0);
      }
    });
  });

  // ===== Trace Viewer =====
  test.describe('Trace Viewer', () => {
    test('page loads without white screen', async ({ page }) => {
      await gotoPage(page, '/log/trace');
      await expectNoWhiteScreen(page);
      await expect(page.locator('h1')).toContainText('链路追踪');
    });

    test('search mode toggle works', async ({ page }) => {
      await gotoPage(page, '/log/trace');
      await expect(page.getByRole('button', { name: '链路搜索' })).toBeVisible();
      await expect(page.getByRole('button', { name: /SpanID/ })).toBeVisible();
    });

    test('search form fields are visible', async ({ page }) => {
      await gotoPage(page, '/log/trace');
      await expect(page.getByText('服务名称')).toBeVisible();
      await expect(page.getByText('时间范围')).toBeVisible();
      await expect(page.getByRole('button', { name: '搜索', exact: true })).toBeVisible();
    });

    test('time range selector uses shadcn Select', async ({ page }) => {
      await gotoPage(page, '/log/trace');
      const nativeSelect = page.locator('select');
      const count = await nativeSelect.count();
      expect(count).toBe(0);
    });

    test('search button works without crash', async ({ page }) => {
      await gotoPage(page, '/log/trace');
      await page.getByRole('button', { name: '搜索', exact: true }).click();
      await page.waitForTimeout(2000);
      await expectNoWhiteScreen(page);
    });

    test('SpanID mode toggle works', async ({ page }) => {
      await gotoPage(page, '/log/trace');
      await page.getByRole('button', { name: /SpanID/ }).click();
      await expect(page.getByText('SpanID (32位十六进制)')).toBeVisible();
    });

    test('service topology tab works', async ({ page }) => {
      await gotoPage(page, '/log/trace');
      await clickButton(page, '服务拓扑');
      await page.waitForTimeout(1000);
      await expectNoWhiteScreen(page);
    });
  });
});
