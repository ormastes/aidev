import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

// Initialize the mobile frame
const initializeMobileFrame = () => {
  const root = document.getElementById('root');
  if (!root) return;

  // Create mobile frame wrapper
  const mobileFrame = document.createElement('div');
  mobileFrame.className = 'mobile-frame';
  
  const mobileScreen = document.createElement('div');
  mobileScreen.className = 'mobile-screen';
  mobileScreen.id = 'mobile-screen';
  
  mobileFrame.appendChild(mobileScreen);
  root.appendChild(mobileFrame);

  // Mount React app inside mobile screen
  const reactRoot = createRoot(mobileScreen);
  reactRoot.render(<App />);

  // Update status indicators
  updateStatusIndicators();
};

const updateStatusIndicators = () => {
  const updateStatus = (id: string, text: string, connected: boolean = true) => {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = text;
      element.style.color = connected ? '#4CAF50' : '#f44336';
    }
  };

  // Check server status
  fetch('http://localhost:3456/api/health')
    .then(response => {
      updateStatus('server-status', response.ok ? 'Connected' : 'Error', response.ok);
    })
    .catch(() => {
      updateStatus('server-status', 'Offline', false);
    });

  // Database is always ready (IndexedDB)
  updateStatus('db-status', 'Ready', true);

  // Update theme name when it changes
  window.addEventListener('themeUpdate', (event: any) => {
    const themeElement = document.getElementById('current-theme');
    if (themeElement && event.detail?.theme?.name) {
      themeElement.textContent = event.detail.theme.name;
    }
  });
};

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeMobileFrame);
} else {
  initializeMobileFrame();
}