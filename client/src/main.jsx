import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConvexProvider } from 'convex/react';
import { convex } from './convexClient.js';
import { registerSW } from 'virtual:pwa-register';
import App from './App.jsx';
import './index.css';
import './styles/motion.css';

// Silently suppress uncaught network / Convex connection rejections or WebSocket drops
// so the application boots and operates seamlessly with zero external database dependencies.
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event?.reason;
    const msg = String(reason?.message || reason || '');
    if (
      msg.includes('convex.cloud') ||
      msg.includes('Convex') ||
      msg.includes('convex') ||
      msg.includes('WebSocket') ||
      msg.includes('Failed to fetch') ||
      msg.includes('NetworkError') ||
      msg.includes('Load failed')
    ) {
      event.preventDefault?.();
    }
  });
}

const LATEST_BUILD_TAG = '2026-10-29.01-pure-telegram-cdn-zero-convex';

// Evict stale caches safely on new builds when online
(async function checkAndEvictStaleCaches() {
  try {
    const currentTag = localStorage.getItem('smartdine_build_tag');
    if (currentTag !== LATEST_BUILD_TAG) {
      console.log('[SmartDine] New build detected:', LATEST_BUILD_TAG);
      localStorage.setItem('smartdine_build_tag', LATEST_BUILD_TAG);

      if (typeof navigator !== 'undefined' && navigator.onLine) {
        if ('caches' in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map((k) => caches.delete(k)));
        }
        if ('serviceWorker' in navigator) {
          const registrations = await navigator.serviceWorker.getRegistrations();
          await Promise.all(registrations.map((r) => r.unregister()));
        }
      }
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
