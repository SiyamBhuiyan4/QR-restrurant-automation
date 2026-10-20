import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConvexProvider } from 'convex/react';
import { convex } from './convexClient.js';
import { registerSW } from 'virtual:pwa-register';
import App from './App.jsx';
import './index.css';
import './styles/motion.css';

const LATEST_BUILD_TAG = '2026-10-20.31-admin-waiter-chat-and-dock-removal';

// Asynchronously purge obsolete caches, service workers, and force clean reload
(async function checkAndEvictStaleCaches() {
  try {
    const currentTag = localStorage.getItem('smartdine_build_tag');
    if (currentTag !== LATEST_BUILD_TAG) {
      console.log('[SmartDine] New build detected:', LATEST_BUILD_TAG, 'Purging stale caches...');

      // 1. Delete all CacheStorage entries
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }

      // 2. Unregister existing service workers to ensure immediate fresh fetch
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((r) => r.unregister()));
      }

      // 3. Mark the build tag only after successful cache eviction
      localStorage.setItem('smartdine_build_tag', LATEST_BUILD_TAG);

      // 4. Force hard reload from network
      window.location.reload();
      return;
    }
  } catch (err) {
    console.warn('[SmartDine] Cache sync note:', err);
  }
})();

// Automatically activate and update service worker across all active client tabs
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    updateSW(true);
  },
  onRegisteredSW(swUrl, r) {
    if (r) {
      r.update();
    }
  }
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ConvexProvider client={convex}>
      <App />
    </ConvexProvider>
  </React.StrictMode>
);
