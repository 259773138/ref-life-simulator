/**
 * 端到端冒烟测试：创建角色 → 提交回合 → 结算 → 下月 → 彩蛋
 */
import { test, expect } from '@playwright/test';

test('full game loop', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });

  // ── 创建角色：第一步（自定义城市 + 任意年龄） ──
  await expect(page.locator('text=现代人生模拟器').first()).toBeVisible();
  await page.fill('input[placeholder="例如：林晚舟"]', '林晚舟');
  await page.click('text=♀ 女');
  // 年龄：自由输入 30 岁（不再限制 16-25）
  await page.fill('input[type="number"]', '30');
  // 城市：自定义「大理」（国内三线）
  await page.fill('input[placeholder*="大理"]', '大理');
  await page.selectOption('select', 'cn3');
  await page.click('text=使用该城市');
  await expect(page.locator('text=（自定义城市 · 三线）').first()).toBeVisible();
  await page.click('text=下一步 →');

  // ── 属性分配 ──
  await expect(page.locator('text=属性分配').first()).toBeVisible();
  await page.click('text=下一步 →');

  // ── 选天赋 ──
  await expect(page.locator('text=选天赋').first()).toBeVisible();
  await page.locator('button:has(span.text-2xl)').first().click();
  await page.click('text=下一步 →');

  // ── 选目标 ──
  await expect(page.locator('text=选目标').first()).toBeVisible();
  await page.click('text=存款达到 100 万');
  await page.click('text=🚀 开启新人生');

  // ── 每月开局页 ──
  await expect(page.locator('text=决策罗盘').first()).toBeVisible({ timeout: 10000 });
  await expect(page.locator('text=城市简报').first()).toBeVisible();
  // 自定义城市与任意年龄生效
  await expect(page.locator('text=年龄：30 岁').first()).toBeVisible({ timeout: 5000 });
  await expect(page.locator('text=大理').first()).toBeVisible({ timeout: 5000 });

  // 勾选 2 个选项 + 自由描述触发彩蛋
  const opts = page.locator('.compass-option');
  const count = await opts.count();
  expect(count).toBeGreaterThan(10);
  await opts.nth(0).click();
  await opts.nth(2).click();
  await page.fill('textarea', '拜访作者');
  await expect(page.locator('text=剩余行动点：4/7').first()).toBeVisible();
  await page.click('text=提交本月行动');

  // ── 结算面板 ──
  await expect(page.locator('text=月 度 总 结').first()).toBeVisible({ timeout: 20000 });
  await expect(page.locator('text=彩蛋触发：拜访作者').first()).toBeVisible({ timeout: 10000 });
  await expect(page.locator('text=一、本月纪要').first()).toBeVisible();
  await expect(page.locator('text=二、收支总览').first()).toBeVisible();
  await expect(page.locator('text=存档码').first()).toBeVisible();

  // 彩蛋：现金 +1000 万
  await expect(page.locator('text=+10,000,000').first()).toBeVisible({ timeout: 10000 });

  // ── 进入下月 ──
  await page.click('text=⏭ 进入下月');
  await expect(page.locator('text=决策罗盘').first()).toBeVisible({ timeout: 10000 });
  await expect(page.locator('text=剩余 11 个月').first()).toBeVisible();

  // 下月再提交一轮（无彩蛋）
  await page.locator('.compass-option').nth(1).click();
  await page.click('text=提交本月行动');
  await expect(page.locator('text=月 度 总 结').first()).toBeVisible({ timeout: 20000 });

  expect(errors.filter(e => !e.includes('favicon'))).toEqual([]);
  console.log('✅ E2E PASS. page errors:', errors.length);
});
