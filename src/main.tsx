import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import './index.css'

// Import the generated route tree
import { routeTree } from './routeTree.gen'

// Create a new router instance
const router = createRouter({ routeTree })

// Register the router instance for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

// Render the app
const rootElement = document.getElementById('root')!
if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement)
  root.render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>,
  )
}

// Enhanced service worker handling for better cache updates
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Clear all caches on app start to ensure fresh content
    caches.keys().then(cacheNames => {
      const oldCaches = cacheNames.filter(name =>
        name.includes('workbox-precache') ||
        name.includes('static-resources') ||
        name.includes('face-access-tracker')
      );

      if (oldCaches.length > 1) {
        // Keep only the most recent cache, delete others
        const sortedCaches = oldCaches.sort().reverse();
        const cachesToDelete = sortedCaches.slice(1);

        Promise.all(
          cachesToDelete.map(cacheName => caches.delete(cacheName))
        ).then(() => {
          console.log('Cleaned up old caches:', cachesToDelete);
        });
      }
    });
  });
}