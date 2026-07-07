import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// 🚀 CRITICAL TELEGRAM HANDSHAKE MODULE
// Notifies the parent Telegram window container shell that our assets have loaded cleanly 
// and forces the web view modal to expand to its maximum portrait height layout stream instantly!
if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp) {
  const tgApp = (window as any).Telegram.WebApp;
  tgApp.ready();
  tgApp.expand();
  
  // Optional styling anchor: Matches the application headers to Telegram's native dark/light theme parameters
  if (tgApp.setHeaderColor) {
    tgApp.setHeaderColor('bg_color');
  }
}

// Locates the 'root' div anchor from index.html and dynamically mounts your React application
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);