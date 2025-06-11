import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  server: {
    // Allow ngrok connections and any other hosts
    host: true,
    hmr: {
      // Allow HMR to work with ngrok
      clientPort: 443,
    },
    // List of allowed hosts for accessing the dev server
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      'eecf-2800-bf0-1da-d23-60be-1bff-35a3-8a85.ngrok-free.app',
      '.ngrok-free.app', // Allow any ngrok-free.app subdomain
    ],
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'Time & Attendance System',
        short_name: 'TimeAttendance',
        description: 'Employee time and attendance tracking system with facial recognition',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      // Disable PWA in development to avoid warnings
      devOptions: {
        enabled: true
      }, workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}', 'models/**/*'],
        globIgnores: ['**/node_modules/**/*', 'sw.js', 'workbox-*.js'],
        /* Skip precaching in development to avoid warnings */
        mode: process.env.NODE_ENV === 'development' ? 'development' : 'production',
        // Add navigation routes fallback to handle SPA routing
        navigateFallback: 'index.html',
        // Make sure to include route for IndexedDB access
        navigateFallbackDenylist: [/^\/api/],
        // Increase maximum file size limit to accommodate face models
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              },
            },
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              },
            },
          },
          {
            urlPattern: /\.(?:js|css)$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'static-resources',
            },
          },
          // Cache for face models
          {
            urlPattern: /models\/.*/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'face-models-cache',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              },
            },
          },
          // Cache for application shell (all routes)
          {
            urlPattern: /\/$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'app-shell',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 // 1 day
              },
            },
          },
        ],
      },
    })
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})