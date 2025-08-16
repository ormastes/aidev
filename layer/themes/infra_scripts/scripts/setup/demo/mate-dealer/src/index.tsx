import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/theme.css';
import { logger } from './services/ExternalLogger';

// Initialize performance monitoring
if ('performance' in window) {
  window.addEventListener('load', () => {
    const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (perfData) {
      logger.logPerformance('page_load_time', perfData.loadEventEnd - perfData.fetchStart);
      logger.logPerformance('dom_ready_time', perfData.domContentLoadedEventEnd - perfData.fetchStart);
      logger.logPerformance('first_paint_time', perfData.responseEnd - perfData.fetchStart);
      
      // Log connection info
      logger.info('Page loaded', 'PERFORMANCE', {
        connectionType: (navigator as any).connection?.effectiveType,
        userAgent: navigator.userAgent,
        screenResolution: `${window.screen.width}x${window.screen.height}`,
        viewport: `${window.innerWidth}x${window.innerHeight}`
      });
    }
  });
}

// Error boundary for the entire app
window.addEventListener('error', (event) => {
  logger.error('Global error caught', 'GLOBAL_ERROR', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno
  }, new Error(event.message));
});

window.addEventListener('unhandledrejection', (event) => {
  logger.error('Unhandled promise rejection', 'PROMISE_ERROR', {
    reason: event.reason
  }, new Error(String(event.reason)));
});

// Get root element
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Failed to find root element');
}

// Create React root and render app
const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Log app initialization
logger.info('Mate Dealer app initialized', 'APP_INIT', {
  environment: process.env.NODE_ENV,
  apiUrl: process.env.REACT_APP_API_URL || '/api'
});

// Cleanup on unmount
if (module.hot) {
  module.hot.accept('./App', () => {
    const NextApp = require('./App').default;
    root.render(
      <React.StrictMode>
        <NextApp />
      </React.StrictMode>
    );
  });
}