import React from 'react';
import ReactDOM from 'react-dom/client';
import { Router } from '@/app/router';
import '@/styles/index.css';
import { registerSW } from 'virtual:pwa-register';
import { initI18n } from '@/lib/i18n/i18n';

initI18n();

// Ensure dark class is applied before React hydration
if (document.documentElement.classList.contains('dark') === false) {
  document.documentElement.classList.add('dark');
}

// Register service worker with auto-update: on activation (new deploy) reload page
registerSW({ immediate: true });

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Router />
  </React.StrictMode>
);
