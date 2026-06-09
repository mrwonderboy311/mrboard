import { test, expect } from '@playwright/test'

test('AI analysis renders structured cards', async ({ page }) => {
  // Login
  await page.goto('http://10.110.31.248:30088/login')
  await page.fill('input[placeholder*="用户名"]', 'admin')
  await page.fill('input[placeholder*="密码"]', 'admin123')
  await page.click('button:has-text("登录")')
  await page.waitForURL('**/home', { timeout: 10000 })

  // Navigate to AI analysis
  await page.goto('http://10.110.31.248:30088/ai/analysis')
  await page.waitForTimeout(2000)

  // Check history tab
  const historyBtn = page.locator('button:has-text("历史分析")')
  if (await historyBtn.isVisible()) {
    await historyBtn.click()
    await page.waitForTimeout(1000)
  }

  // Get all history items
  const historyItems = page.locator('[data-testid^="history-"]')
  const count = await historyItems.count()
  console.log(`History items: ${count}`)

  if (count > 0) {
    // Click first history item
    await historyItems.first().click()
    await page.waitForTimeout(2000)

    // Check if raw JSON is visible (BAD)
    const rawJson = page.locator('text=/\\{\\s*"告警/')
    const hasRawJson = await rawJson.count()
    console.log(`Has raw JSON visible: ${hasRawJson > 0}`)

    // Check if structured cards are shown (GOOD)
    const badges = page.locator('.badge, [class*="badge"]')
    const badgeCount = await badges.count()
    console.log(`Badge elements: ${badgeCount}`)

    // Check for severity badge
    const severityBadge = page.locator('text=/warning|critical|info/i').first()
    const hasSeverity = await severityBadge.isVisible().catch(() => false)
    console.log(`Has severity: ${hasSeverity}`)

    // Check for suggestion cards with numbered steps
    const steps = page.locator('text=/\\d+\\./')
    const stepCount = await steps.count()
    console.log(`Numbered steps: ${stepCount}`)

    // Screenshot
    await page.screenshot({ path: '/tmp/ai-analysis-result.png', fullPage: true })
    console.log('Screenshot saved')

    // Verify no raw JSON block is showing
    const preBlocks = page.locator('pre, code:has-text("告警名称")')
    const preCount = await preBlocks.count()
    console.log(`Raw code blocks: ${preCount}`)
  }
})
