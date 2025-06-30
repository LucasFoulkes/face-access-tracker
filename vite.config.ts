import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from "path"
import tailwindcss from "@tailwindcss/vite"
import { tanstackRouter } from '@tanstack/router-plugin/vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true,
    }),
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,

      pwaAssets: {
        disabled: false,
        config: true,
      },

      manifest: {
        name: 'face-access-tracker',
        short_name: 'face-access-tracker',
        description: 'face-access-tracker',
        theme_color: '#ffffff',
      },

      workbox: {
        globPatterns: [
          '**/*.{js,css,html,svg,png,ico,json,woff,woff2,ttf,eot}',
          'models/**/*', // Cache all files in models directory regardless of extension
          'models/*', // Also catch files directly in models folder
        ],
        // Explicitly include model files without extensions
        additionalManifestEntries: [
          { url: '/models/face_landmark_68_model-shard1', revision: null },
          { url: '/models/face_recognition_model-shard1', revision: null },
          { url: '/models/face_recognition_model-shard2', revision: null },
          { url: '/models/tiny_face_detector_model-shard1', revision: null },
        ],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true, // Force immediate activation of new service worker
        maximumFileSizeToCacheInBytes: 50 * 1024 * 1024, // 50MB for large model files

        // Add runtime caching for better offline support
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 365 days
              },
              cacheKeyWillBeUsed: async ({ request }) => {
                return `${request.url}`
              }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 365 days
              }
            }
          },
          {
            urlPattern: /\/models\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'face-api-models',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              }
            }
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              }
            }
          }
        ],

        // Ensure navigation requests are handled offline
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/_/, /\/[^/?]+\.[^/]+$/],
      },

      devOptions: {
        enabled: false,
        navigateFallback: 'index.html',
        suppressWarnings: true,
        type: 'module',
      },
    })
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    fs: {
      // Allow serving files from the models directory
      allow: ['..', 'public/models']
    }
  }
})
