import { test, expect } from '@playwright/test';

test('API settings modal with AQUA preset', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => {
    if (m.type() === 'error') {
      // 沙箱预览无外网时，fetch 外部 API 必然报 CORS/网络错误 —— 属预期，不计为页面崩溃
      const t = m.text();
      if (!/CORS|ERR_FAILED|Failed to fetch|net::ERR/i.test(t)) errors.push(t);
    }
  });

  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });

  // 打开 API 设置
  await page.click('text=🔌 API 设置');
  await expect(page.locator('text=预设服务').first()).toBeVisible({ timeout: 5000 });

  // 默认 Base URL 应为 AQUA
  await expect(page.locator('input[placeholder*="api.ltzy.top"]')).toHaveValue('https://api.ltzy.top/v1');

  // 预设按钮存在
  await expect(page.locator('text=💠 AQUA 公益AI').first()).toBeVisible();
  await expect(page.locator('text=📦 Ollama 本地').first()).toBeVisible();

  // 模型输入默认 minimax-m3
  await expect(page.locator('input[placeholder="minimaxai/minimax-m3"]')).toHaveValue('minimaxai/minimax-m3');

  // 点击预设切换到 Ollama → Base URL 应更新
  await page.locator('button:has-text("Ollama 本地")').first().click();
  await expect(page.locator('input[placeholder*="api.ltzy.top"]')).toHaveValue('http://localhost:11434/v1');
  // 切回 AQUA
  await page.locator('button:has-text("AQUA 公益AI")').first().click();

  // 尝试拉取模型列表 —— 沙箱无外网会显示错误提示，但 UI 不崩溃
  await page.click('text=从服务端拉取列表');
  await page.waitForTimeout(2500);
  const errCount = await page.locator('text=/❌/').count();
  console.log('拉取结果提示数量:', errCount, errCount > 0 ? '（沙箱无外网，真实环境可正常拉取）' : '（可能成功或提示中）');

  // 关闭弹窗，页面应正常
  await page.click('text=✕ 关闭');
  await expect(page.locator('text=🔌 API 设置').first()).toBeVisible();

  expect(errors).toEqual([]);
  console.log('✅ API 设置弹窗冒烟测试通过，页面无崩溃');
});
