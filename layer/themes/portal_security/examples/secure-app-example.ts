import express from 'express';
import { PortManager } from '../children/PortManager';

/**
 * Example: Secure App Configuration
 * 
 * This example shows how to configure an app to work with the web-security proxy
 * - Binds to localhost only (not accessible remotely)
 * - Gets port from PortManager
 * - Registers with the proxy system
 */

const app = express();

// Get port from PortManager
const portManager = PortManager.getInstance();
const environment = portManager.getCurrentEnvironment();
const PORT = portManager.getPortForEnvironment('gui-selector', environment);

// IMPORTANT: Bind to localhost only for security
const HOST = "localhost"; // or '127.0.0.1'

app.get('/health', (req, res) => {
  res.json({ status: 'ok', port: PORT, host: HOST });
});

app.get('/', (req, res) => {
  // Check if request came through proxy
  const userId = req.headers['x-user-id'];
  const username = req.headers['x-username'];
  
  res.send(`
    <h1>GUI Selector</h1>
    <p>Running securely on ${HOST}:${PORT}</p>
    ${userId ? `<p>Authenticated as: ${username}</p>` : '<p>Not authenticated</p>'}
    <hr>
    <p>This app is only accessible through the web-security proxy:</p>
    <ul>
      <li>Direct access: http://localhost:${PORT} (local only)</li>
      <li>Remote access: http://your-server:3400/app/gui-selector</li>
    </ul>
  `);
});

// Start server - BIND TO LOCALHOST ONLY
app.listen(PORT, HOST, () => {
  console.log(`GUI Selector started securely`);
  console.log(`Host: ${HOST} (localhost only - not accessible remotely)`);
  console.log(`Port: ${PORT}`);
  console.log(`Environment: ${environment}`);
  console.log(`Local URL: http://${HOST}:${PORT}`);
  console.log(`Proxy URL: http://localhost:${portManager.getPortForEnvironment('web-security', environment)}/app/gui-selector`);
});

// For contrast, here's what NOT to do:
// ❌ app.listen(PORT); // Binds to all interfaces by default
// ❌ app.listen(PORT, '0.0.0.0'); // Explicitly binds to all interfaces
// ❌ app.listen(PORT, '::'); // Binds to all IPv6 interfaces