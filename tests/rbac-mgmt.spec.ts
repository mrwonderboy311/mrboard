import { test, expect } from '@playwright/test';
import { BASE, gotoPage, expectNoWhiteScreen } from './helpers';

test.describe('RBAC Management', () => {

  test('Admin list page loads', async ({ page }) => {
    await gotoPage(page, '/rbac/adminList');
    await expectNoWhiteScreen(page);
  });

  test('Role list page loads', async ({ page }) => {
    await gotoPage(page, '/rbac/roleList');
    await expectNoWhiteScreen(page);
  });

  test('Role to User page loads', async ({ page }) => {
    await gotoPage(page, '/rbac/roleToUserList');
    await expectNoWhiteScreen(page);
  });

  test('Role to Node page loads', async ({ page }) => {
    await gotoPage(page, '/rbac/roleToNodeList');
    await expectNoWhiteScreen(page);
  });

  test('Cluster to User page loads', async ({ page }) => {
    await gotoPage(page, '/rbac/clusterToUserList');
    await expectNoWhiteScreen(page);
  });

  test('Group list page loads', async ({ page }) => {
    await gotoPage(page, '/rbac/groupList');
    await expectNoWhiteScreen(page);
  });

  test('Node list page loads', async ({ page }) => {
    await gotoPage(page, '/rbac/nodeList');
    await expectNoWhiteScreen(page);
  });

  test('Audit log page loads', async ({ page }) => {
    await gotoPage(page, '/rbac/auditLogList');
    await expectNoWhiteScreen(page);
  });

  test('Lock list page loads', async ({ page }) => {
    await gotoPage(page, '/rbac/lockList');
    await expectNoWhiteScreen(page);
  });

  test('My info page loads', async ({ page }) => {
    await gotoPage(page, '/rbac/myinfo');
    await expectNoWhiteScreen(page);
  });

  test('Change password page loads', async ({ page }) => {
    await gotoPage(page, '/rbac/changepassword');
    await expectNoWhiteScreen(page);
  });
});
