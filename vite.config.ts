import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './', // 相对路径：兼容 GitHub Pages 子路径部署（如 xxx.github.io/ref-life-simulator/）
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: true,
  },
});
