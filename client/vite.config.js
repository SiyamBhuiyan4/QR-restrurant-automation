import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'pwa-192x192.png', 'pwa-512x512.png'],
      manifest: {
        name: 'SmartDine - Local Restaurant',
        short_name: 'SmartDine',
        description: 'Offline-First Smart Restaurant Ordering & Table Management System',
        theme_color: '#0a0a0c',
        background_color: '#0a0a0c',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff,woff2}'],
        runtimeCaching: [
          {
            // Cache static media and font assets with CacheFirst strategy
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico|woff|woff2)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'static-media-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // Cache /api/menu with NetworkFirst strategy (falling back to cached response if network fails, cache expiration 7 days)
            urlPattern: /\/api\/menu.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-menu-cache',
              networkTimeoutSeconds: 5,
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // Cache images from external CDNs (Unsplash) with CacheFirst (30 days expiration)
            urlPattern: /^https:\/\/(?:images\.unsplash\.com|source\.unsplash\.com)\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'unsplash-images-cache',
              expiration: {
                maxEntries: 150,
                maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
    }),
  ],
  build: {
    target: 'es2020',
    sourcemap: false,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('lucide-react')) {
              return 'vendor-lucide';
            }
            if (
              id.includes('/react/') ||
              id.includes('/react-dom/') ||
              id.includes('/scheduler/') ||
              id.endsWith('/react') ||
              id.endsWith('/react-dom')
            ) {
              return 'vendor-react';
            }
            if (
              id.includes('socket.io-client') ||
              id.includes('socket.io-parser') ||
              id.includes('engine.io-client') ||
              id.includes('engine.io-parser')
            ) {
              return 'vendor-socket';
            }
            if (id.includes('convex')) {
              return 'vendor-convex';
            }
            // Everything else: let Rollup split it, so libraries used only by lazy
            // screens (jsPDF for QR sheets, admin-only packages) stay out of the
            // customer's first load.
            return undefined;
          }
        },
      },
    },
  },
  server: {
    host: true, // Listen on all network interfaces (e.g. 0.0.0.0) so LAN devices can connect
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
      '/uploads': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
      '/socket.io': {
        target: 'http://localhost:3000',
        ws: true,
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
