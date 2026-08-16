import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: '.',
  testMatch: '*.spec.ts',
  timeout: 120000,
  use: { headless: true },
  reporter: [['list']],
});
