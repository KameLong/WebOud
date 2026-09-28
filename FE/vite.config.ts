import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/apple-touch-icon.png', 'font/*'],
      manifest: {
        name: 'WebOud',
        short_name: 'WebOud',
        description: '運行ダイヤ作成ソフト WebOud',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#0F5B8A',
        theme_color: '#0F5B8A',
        lang: 'ja',
        icons: [
          {
            src: '/icons/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icons/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/icons/maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2,ttf,otf}'],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
})
