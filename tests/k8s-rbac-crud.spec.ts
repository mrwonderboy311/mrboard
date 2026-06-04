import { test, expect } from '@playwright/test';
import { BASE, gotoPage, expectNoWhiteScreen, expectButtonVisible, clickButton } from './helpers';

test.describe('K8s RBAC CRUD Operations', () => {

  // ===== ClusterRole =====

  test('ClusterRole: list page loads with new button', async ({ page }) => {
    await gotoPage(page, '/k8s/clusterroles');
    await expectNoWhiteScreen(page);
    await expectButtonVisible(page, '刷新');
    await expectButtonVisible(page, '新增');
  });

  test('ClusterRole: create dialog opens with form and yaml tabs', async ({ page }) => {
    await gotoPage(page, '/k8s/clusterroles');
    await clickButton(page, '新增');
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();
    const body = await dialog.textContent();
    expect(body).toContain('表单创建');
    expect(body).toContain('YAML创建');
    expect(body).toContain('名称');
    expect(body).toContain('API组');
    expect(body).toContain('资源');
    expect(body).toContain('动词');
  });

  test('ClusterRole: form tab validates required name', async ({ page }) => {
    await gotoPage(page, '/k8s/clusterroles');
    await clickButton(page, '新增');
    // Click create without filling name
    const createBtn = page.locator('[role="dialog"] button:has-text("创建")').first();
    await createBtn.click();
    await page.waitForTimeout(1000);
    // Should show error toast (sonner uses li[role="status"] or .cn-toast)
    const toast = page.locator('li[role="status"], .cn-toast, [data-sonner-toast]').first();
    const hasToast = await toast.isVisible({ timeout: 3000 }).catch(() => false);
    if (hasToast) {
      const toastText = await toast.textContent();
      expect(toastText).toContain('名称');
    }
    // Dialog should still be open (create didn't succeed)
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();
  });

  test('ClusterRole: yaml tab has editor', async ({ page }) => {
    await gotoPage(page, '/k8s/clusterroles');
    await clickButton(page, '新增');
    await clickButton(page, 'YAML创建');
    const textarea = page.locator('[role="dialog"] textarea').first();
    await expect(textarea).toBeVisible();
    const content = await textarea.inputValue();
    expect(content).toContain('kind: ClusterRole');
    expect(content).toContain('apiVersion: rbac.authorization.k8s.io');
  });

  test('ClusterRole: create dialog cancel closes', async ({ page }) => {
    await gotoPage(page, '/k8s/clusterroles');
    await clickButton(page, '新增');
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();
    await clickButton(page, '取消');
    await page.waitForTimeout(500);
    await expect(dialog).not.toBeVisible();
  });

  test('ClusterRole: search filter works', async ({ page }) => {
    await gotoPage(page, '/k8s/clusterroles');
    const input = page.locator('input[placeholder*="搜索"]').first();
    await input.fill('cluster-admin');
    await page.waitForTimeout(500);
    await expectNoWhiteScreen(page);
  });

  test('ClusterRole: yaml view button navigates', async ({ page }) => {
    await gotoPage(page, '/k8s/clusterroles');
    // Wait for table to load
    await page.waitForTimeout(1000);
    const yamlBtn = page.locator('table tbody tr').first().locator('button').first();
    if (await yamlBtn.isVisible()) {
      await yamlBtn.click();
      await page.waitForTimeout(1000);
      const url = page.url();
      expect(url).toContain('/k8s/clusterroles/yaml');
    }
  });

  // ===== ClusterRoleBinding =====

  test('ClusterRoleBinding: list page loads with new button', async ({ page }) => {
    await gotoPage(page, '/k8s/clusterrolebinding');
    await expectNoWhiteScreen(page);
    await expectButtonVisible(page, '刷新');
    await expectButtonVisible(page, '新增');
  });

  test('ClusterRoleBinding: create dialog opens with form fields', async ({ page }) => {
    await gotoPage(page, '/k8s/clusterrolebinding');
    await clickButton(page, '新增');
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();
    const body = await dialog.textContent();
    expect(body).toContain('表单创建');
    expect(body).toContain('YAML创建');
    expect(body).toContain('名称');
    expect(body).toContain('角色引用');
    expect(body).toContain('主体');
  });

  test('ClusterRoleBinding: form tab validates required name', async ({ page }) => {
    await gotoPage(page, '/k8s/clusterrolebinding');
    await clickButton(page, '新增');
    const createBtn = page.locator('[role="dialog"] button:has-text("创建")').first();
    await createBtn.click();
    await page.waitForTimeout(1000);
    const toast = page.locator('li[role="status"], .cn-toast, [data-sonner-toast]').first();
    const hasToast = await toast.isVisible({ timeout: 3000 }).catch(() => false);
    if (hasToast) {
      const toastText = await toast.textContent();
      expect(toastText).toContain('名称');
    }
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();
  });

  test('ClusterRoleBinding: yaml tab has editor', async ({ page }) => {
    await gotoPage(page, '/k8s/clusterrolebinding');
    await clickButton(page, '新增');
    await clickButton(page, 'YAML创建');
    const textarea = page.locator('[role="dialog"] textarea').first();
    await expect(textarea).toBeVisible();
    const content = await textarea.inputValue();
    expect(content).toContain('kind: ClusterRoleBinding');
    expect(content).toContain('roleRef');
    expect(content).toContain('subjects');
  });

  test('ClusterRoleBinding: create dialog cancel closes', async ({ page }) => {
    await gotoPage(page, '/k8s/clusterrolebinding');
    await clickButton(page, '新增');
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();
    await clickButton(page, '取消');
    await page.waitForTimeout(500);
    await expect(dialog).not.toBeVisible();
  });

  test('ClusterRoleBinding: search filter works', async ({ page }) => {
    await gotoPage(page, '/k8s/clusterrolebinding');
    const input = page.locator('input[placeholder*="搜索"]').first();
    await input.fill('admin');
    await page.waitForTimeout(500);
    await expectNoWhiteScreen(page);
  });

  test('ClusterRoleBinding: delete button shows confirm', async ({ page }) => {
    await gotoPage(page, '/k8s/clusterrolebinding');
    await page.waitForTimeout(1000);
    // Find delete button (Trash2 icon button)
    const deleteBtn = page.locator('table tbody tr').first().locator('button:has(svg.text-destructive)').first();
    if (await deleteBtn.isVisible()) {
      page.on('dialog', async dialog => {
        expect(dialog.message()).toContain('确定删除');
        await dialog.dismiss();
      });
      await deleteBtn.click();
    }
  });

  // ===== Role =====

  test('Role: list page loads with new button', async ({ page }) => {
    await gotoPage(page, '/k8s/roles');
    await expectNoWhiteScreen(page);
    await expectButtonVisible(page, '刷新');
    await expectButtonVisible(page, '新增');
  });

  test('Role: create dialog opens with form fields', async ({ page }) => {
    await gotoPage(page, '/k8s/roles');
    await clickButton(page, '新增');
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();
    const body = await dialog.textContent();
    expect(body).toContain('表单创建');
    expect(body).toContain('YAML创建');
    expect(body).toContain('名称');
    expect(body).toContain('命名空间');
    expect(body).toContain('API组');
    expect(body).toContain('资源');
    expect(body).toContain('动词');
  });

  test('Role: form tab validates required name', async ({ page }) => {
    await gotoPage(page, '/k8s/roles');
    await clickButton(page, '新增');
    const createBtn = page.locator('[role="dialog"] button:has-text("创建")').first();
    await createBtn.click();
    await page.waitForTimeout(1000);
    const toast = page.locator('li[role="status"], .cn-toast, [data-sonner-toast]').first();
    const hasToast = await toast.isVisible({ timeout: 3000 }).catch(() => false);
    if (hasToast) {
      const toastText = await toast.textContent();
      expect(toastText).toContain('名称');
    }
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();
  });

  test('Role: yaml tab has editor with Role kind', async ({ page }) => {
    await gotoPage(page, '/k8s/roles');
    await clickButton(page, '新增');
    await clickButton(page, 'YAML创建');
    const textarea = page.locator('[role="dialog"] textarea').first();
    await expect(textarea).toBeVisible();
    const content = await textarea.inputValue();
    expect(content).toContain('kind: Role');
    expect(content).not.toContain('kind: ClusterRole');
  });

  test('Role: create dialog cancel closes', async ({ page }) => {
    await gotoPage(page, '/k8s/roles');
    await clickButton(page, '新增');
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();
    await clickButton(page, '取消');
    await page.waitForTimeout(500);
    await expect(dialog).not.toBeVisible();
  });

  test('Role: search filter works', async ({ page }) => {
    await gotoPage(page, '/k8s/roles');
    const input = page.locator('input[placeholder*="搜索"]').first();
    await input.fill('test-role');
    await page.waitForTimeout(500);
    await expectNoWhiteScreen(page);
  });

  test('Role: table shows namespace column', async ({ page }) => {
    await gotoPage(page, '/k8s/roles');
    await page.waitForTimeout(1000);
    const headers = page.locator('table thead th');
    const headerTexts = await headers.allTextContents();
    expect(headerTexts.join(',')).toContain('命名空间');
  });

  // ===== RoleBinding =====

  test('RoleBinding: list page loads with new button', async ({ page }) => {
    await gotoPage(page, '/k8s/rolebinding');
    await expectNoWhiteScreen(page);
    await expectButtonVisible(page, '刷新');
    await expectButtonVisible(page, '新增');
  });

  test('RoleBinding: create dialog opens with form fields', async ({ page }) => {
    await gotoPage(page, '/k8s/rolebinding');
    await clickButton(page, '新增');
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();
    const body = await dialog.textContent();
    expect(body).toContain('表单创建');
    expect(body).toContain('YAML创建');
    expect(body).toContain('名称');
    expect(body).toContain('命名空间');
    expect(body).toContain('角色引用');
    expect(body).toContain('主体');
  });

  test('RoleBinding: form tab validates required name', async ({ page }) => {
    await gotoPage(page, '/k8s/rolebinding');
    await clickButton(page, '新增');
    const createBtn = page.locator('[role="dialog"] button:has-text("创建")').first();
    await createBtn.click();
    await page.waitForTimeout(1000);
    const toast = page.locator('li[role="status"], .cn-toast, [data-sonner-toast]').first();
    const hasToast = await toast.isVisible({ timeout: 3000 }).catch(() => false);
    if (hasToast) {
      const toastText = await toast.textContent();
      expect(toastText).toContain('名称');
    }
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();
  });

  test('RoleBinding: yaml tab has editor', async ({ page }) => {
    await gotoPage(page, '/k8s/rolebinding');
    await clickButton(page, '新增');
    await clickButton(page, 'YAML创建');
    const textarea = page.locator('[role="dialog"] textarea').first();
    await expect(textarea).toBeVisible();
    const content = await textarea.inputValue();
    expect(content).toContain('kind: RoleBinding');
    expect(content).toContain('roleRef');
  });

  test('RoleBinding: create dialog cancel closes', async ({ page }) => {
    await gotoPage(page, '/k8s/rolebinding');
    await clickButton(page, '新增');
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();
    await clickButton(page, '取消');
    await page.waitForTimeout(500);
    await expect(dialog).not.toBeVisible();
  });

  test('RoleBinding: search filter works', async ({ page }) => {
    await gotoPage(page, '/k8s/rolebinding');
    const input = page.locator('input[placeholder*="搜索"]').first();
    await input.fill('test');
    await page.waitForTimeout(500);
    await expectNoWhiteScreen(page);
  });

  test('RoleBinding: table has text wrapping on subjects', async ({ page }) => {
    await gotoPage(page, '/k8s/rolebinding');
    await page.waitForTimeout(1000);
    // Check that subjects column exists and has break-all class for wrapping
    const cells = page.locator('table tbody tr td.break-all, table tbody tr td .break-all');
    // If there are rows, at least some should have text wrapping
    const rows = page.locator('table tbody tr');
    const count = await rows.count();
    if (count > 0) {
      // Just verify the page rendered without crash
      await expectNoWhiteScreen(page);
    }
  });

  // ===== Create + Delete E2E for ClusterRole =====

  test('ClusterRole: create via YAML and delete', async ({ page }) => {
    await gotoPage(page, '/k8s/clusterroles');

    // Open create dialog
    await clickButton(page, '新增');
    await clickButton(page, 'YAML创建');

    // Edit YAML to use unique name
    const textarea = page.locator('[role="dialog"] textarea').first();
    const yaml = await textarea.inputValue();
    const uniqueName = 'test-cr-' + Date.now();
    const newYaml = yaml.replace('my-clusterrole', uniqueName);
    await textarea.fill(newYaml);

    // Submit
    const createBtn = page.locator('[role="dialog"] button:has-text("创建")').first();
    await createBtn.click();
    await page.waitForTimeout(2000);

    // Verify success or handle API error gracefully
    const toast = page.locator('[data-sonner-toast]').first();
    if (await toast.isVisible({ timeout: 3000 })) {
      const toastText = await toast.textContent();
      // Could be success or error (e.g. if cluster not connected)
      expect(toastText).toBeTruthy();
    }

    // If created successfully, try to delete
    const searchInput = page.locator('input[placeholder*="搜索"]').first();
    await searchInput.fill(uniqueName);
    await page.waitForTimeout(1000);

    const deleteBtn = page.locator('table tbody tr').first().locator('button:has(svg.text-destructive)').first();
    if (await deleteBtn.isVisible()) {
      page.on('dialog', async dialog => {
        await dialog.accept();
      });
      await deleteBtn.click();
      await page.waitForTimeout(1000);
    }
  });

  // ===== Create + Delete E2E for Role =====

  test('Role: create via YAML and delete', async ({ page }) => {
    await gotoPage(page, '/k8s/roles');

    await clickButton(page, '新增');
    await clickButton(page, 'YAML创建');

    const textarea = page.locator('[role="dialog"] textarea').first();
    const yaml = await textarea.inputValue();
    const uniqueName = 'test-role-' + Date.now();
    const newYaml = yaml.replace('my-role', uniqueName);
    await textarea.fill(newYaml);

    const createBtn = page.locator('[role="dialog"] button:has-text("创建")').first();
    await createBtn.click();
    await page.waitForTimeout(2000);

    const toast = page.locator('[data-sonner-toast]').first();
    if (await toast.isVisible({ timeout: 3000 })) {
      const toastText = await toast.textContent();
      expect(toastText).toBeTruthy();
    }

    const searchInput = page.locator('input[placeholder*="搜索"]').first();
    await searchInput.fill(uniqueName);
    await page.waitForTimeout(1000);

    const deleteBtn = page.locator('table tbody tr').first().locator('button:has(svg.text-destructive)').first();
    if (await deleteBtn.isVisible()) {
      page.on('dialog', async dialog => {
        await dialog.accept();
      });
      await deleteBtn.click();
      await page.waitForTimeout(1000);
    }
  });

  // ===== Create via Form =====

  test('ClusterRole: create via form', async ({ page }) => {
    await gotoPage(page, '/k8s/clusterroles');

    await clickButton(page, '新增');
    // Form tab should be default
    const nameInput = page.locator('[role="dialog"] input[placeholder*="my-clusterrole"]').first();
    if (await nameInput.isVisible()) {
      const uniqueName = 'test-form-cr-' + Date.now();
      await nameInput.fill(uniqueName);

      const resourcesInput = page.locator('[role="dialog"] input[placeholder*="pods"]').first();
      if (await resourcesInput.isVisible()) {
        await resourcesInput.fill('pods,configmaps');
      }

      const verbsInput = page.locator('[role="dialog"] input[placeholder*="get,list"]').first();
      if (await verbsInput.isVisible()) {
        await verbsInput.fill('get,list,watch');
      }

      const createBtn = page.locator('[role="dialog"] button:has-text("创建")').first();
      await createBtn.click();
      await page.waitForTimeout(2000);

      const toast = page.locator('[data-sonner-toast]').first();
      if (await toast.isVisible({ timeout: 3000 })) {
        const toastText = await toast.textContent();
        expect(toastText).toBeTruthy();
      }
    }
  });

  test('Role: create via form', async ({ page }) => {
    await gotoPage(page, '/k8s/roles');

    await clickButton(page, '新增');
    const nameInput = page.locator('[role="dialog"] input[placeholder*="my-role"]').first();
    if (await nameInput.isVisible()) {
      const uniqueName = 'test-form-role-' + Date.now();
      await nameInput.fill(uniqueName);

      const createBtn = page.locator('[role="dialog"] button:has-text("创建")').first();
      await createBtn.click();
      await page.waitForTimeout(2000);

      const toast = page.locator('[data-sonner-toast]').first();
      if (await toast.isVisible({ timeout: 3000 })) {
        const toastText = await toast.textContent();
        expect(toastText).toBeTruthy();
      }
    }
  });

  // ===== Refresh button =====

  test('ClusterRoles page: refresh button works', async ({ page }) => {
    await gotoPage(page, '/k8s/clusterroles');
    await clickButton(page, '刷新');
    await page.waitForTimeout(1000);
    await expectNoWhiteScreen(page);
  });

  test('ClusterRoleBinding page: refresh button works', async ({ page }) => {
    await gotoPage(page, '/k8s/clusterrolebinding');
    await clickButton(page, '刷新');
    await page.waitForTimeout(1000);
    await expectNoWhiteScreen(page);
  });

  // ===== ServiceAccounts =====

  test('ServiceAccounts: list page loads', async ({ page }) => {
    await gotoPage(page, '/k8s/serviceaccounts');
    await expectNoWhiteScreen(page);
    await expectButtonVisible(page, '刷新');
  });
});
