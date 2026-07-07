import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './styles.css';
import './mobile.css'; /* mobile-first overrides — loaded last to guarantee precedence */

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Register PWA service worker (auto-updates on new deploy)
if ('serviceWorker' in navigator) {
  import('virtual:pwa-register').then(({ registerSW }) => {
    registerSW({ immediate: false });
  }).catch(() => {
    // PWA registration is optional; ignore failure in dev
  });
}
