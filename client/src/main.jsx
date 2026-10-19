import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConvexProvider } from 'convex/react';
import { convex } from './convexClient.js';
import { registerSW } from 'virtual:pwa-register';
import App from './App.jsx';
import './index.css';
import './styles/motion.css';

// Force fresh cache busting for UI update
const LATEST_BUILD_TAG = 'v2026.10.19.2005';
try {
  const currentTag = localStorage.getItem('smartdine_build_tag');
  if (currentTag !== LATEST_BUILD_TAG) {
    localStorage.setItem('smartdine_build_tag', LATEST_BUILD_TAG);
    if ('caches' in window) {
      caches.keys().then((keys) => {
        for (const key of keys) {
          caches.delete(key);
        }
      });
    }
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          registration.unregister();
        }
      });
    }
    window.location.reload();
  }
} catch (e) {}

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
