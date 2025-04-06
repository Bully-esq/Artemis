import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// Set up favicon and PWA icons for the correct color scheme
function updateFavicons() {
  const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const baseUrl = window.location.origin;
  
  // Update favicon
  const favicon = document.querySelector('link[rel="icon"]');
  if (favicon) {
    favicon.href = isDarkMode ? 
      `${baseUrl}/logo-dark.png` : 
      `${baseUrl}/logo-light.png`;
  }
  
  // Update apple touch icon
  const appleIcon = document.querySelector('link[rel="apple-touch-icon"]');
  if (appleIcon) {
    appleIcon.href = isDarkMode ? 
      `${baseUrl}/logo-dark.png` : 
      `${baseUrl}/logo-light.png`;
  }
}

// Run favicon update immediately and when theme changes
updateFavicons();
if (window.matchMedia) {
  window.matchMedia('(prefers-color-scheme: dark)')
    .addEventListener('change', updateFavicons);
}

// Use createRoot API from React 18
const root = createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
reportWebVitals();