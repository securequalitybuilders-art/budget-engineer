import React from 'react';
import ReactDOM from 'react-dom/client';
import { Router } from '@/app/router';
import '@/styles/index.css';

// Ensure dark class is applied before React hydration
if (document.documentElement.classList.contains('dark') === false) {
  document.documentElement.classList.add('dark');
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Router />
  </React.StrictMode>
);
