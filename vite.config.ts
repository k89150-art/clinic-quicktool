import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? '/clinic-quicktool/' : '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: '門診快速助手',
        short_name: 'QuickTool',
        description: '門診慢箋日期計算與收案快速輔助判斷',
        theme_color: '#0b6b63',
        background_color: '#f5f8f7',
        display: 'standalone',
        start_url: '.',
        scope: '.',
        lang: 'zh-TW',
        icons: [
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }
        ]
      },
      workbox: {
        navigateFallback: 'index.html',
        globPatterns: ['**/*.{js,css,html,svg,woff2}']
      }
    })
  ],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    coverage: { reporter: ['text', 'html'] }
  }
});
