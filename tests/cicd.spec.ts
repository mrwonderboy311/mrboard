import { test, expect } from '@playwright/test';
import { BASE, gotoPage, expectNoWhiteScreen, expectButtonVisible, clickButton } from './helpers';

test.describe('CI/CD', () => {

  test('CICD list page loads', async ({ page }) => {
    await gotoPage(page, '/cicd/list');
    await expectNoWhiteScreen(page);
  });

  test('Pipelines list page loads', async ({ page }) => {
    await gotoPage(page, '/cicd/pipelines');
    await expectNoWhiteScreen(page);
  });

  test('Jenkins list page loads', async ({ page }) => {
    await gotoPage(page, '/cicd/jenkins');
    await expectNoWhiteScreen(page);
  });

  test('Aliyun AK page loads', async ({ page }) => {
    await gotoPage(page, '/cicd/aliyunak');
    await expectNoWhiteScreen(page);
  });
});
