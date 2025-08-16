import express from 'express';

/**
 * Example: Backward Compatible App Configuration
 * 
 * This shows how existing apps like GUI Selector can continue running
 * with their current port configuration while still being accessible
 * through the web-security proxy.
 * 
 * The app doesn't need to change - it runs as-is.
 * The proxy knows how to route to it based on the registered ports.
 */

const app = express();

// GUI Selector's existing port configuration - NO CHANGES NEEDED
const ENV = process.env.NODE_ENV || 'development';
const PORT = process.env.PORT || (
  ENV === 'production' || ENV === 'release' ? 3456 :
  ENV === 'demo' ? 3356 :
  3256
);

// Existing GUI Selector code continues to work as-is
app.get('/', (req, res) => {
  res.send(`
    <h1>GUI Selector</h1>
    <p>Running on port ${PORT} with original configuration</p>
    <p>Environment: ${ENV}</p>
    <hr>
    <p>This app continues to run exactly as before!</p>
    <p>No code changes required.</p>
    <hr>
    <h3>Access Options:</h3>
    <ul>
      <li>Direct (existing): http://localhost:${PORT}</li>
      <li>Via proxy (new): http://localhost:3200/app/gui-selector</li>
      <li>Remote via proxy: http://your-server:3200/app/gui-selector</li>
    </ul>
  `);
});

// Start server - EXACTLY AS BEFORE
app.listen(PORT, () => {
  console.log(`GUI Selector Server running on port ${PORT} in ${ENV} mode`);
  console.log(`Access the app at http://localhost:${PORT}`);
});

/**
 * NOTES:
 * 
 * 1. The GUI Selector continues to run on its existing ports (3256/3356/3456)
 * 2. No code changes are required in the GUI Selector
 * 3. The web-security proxy is configured to know these ports
 * 4. Remote access is now available through the proxy without changing the app
 * 
 * The PortManager in web-security is already configured with:
 * { appId: 'gui-selector', id: 56, internalPort: 4056 }
 * 
 * This maps to the expected ports:
 * - dev: 3256
 * - demo: 3356
 * - release: 3456
 */