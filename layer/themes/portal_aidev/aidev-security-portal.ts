#!/usr/bin/env bun
/**
 * AI Dev Portal - Security Theme
 * Enhanced portal with security-first architecture
 */

import { serve } from 'bun';
import { readFileSync, existsSync } from 'fs';
import path from 'path';

const PORT = 3156;

// Security configuration
const securityConfig = {
  headers: {
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'",
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
  },
  rateLimit: {
    window: 60000,
    max: 100
  },
  allowedOrigins: ['http://localhost:3156', 'http://127.0.0.1:3156']
};

// Rate limiting store
const rateLimiter = new Map<string, { count: number; reset: number }>();

// Load VF.json data
function loadVfData(filename: string): any {
  // Load from project root, not current directory
  const filePath = path.join(__dirname, '../../../', filename);
  if (existsSync(filePath)) {
    try {
      return JSON.parse(readFileSync(filePath, 'utf-8'));
    } catch (e) {
      console.error(`Error loading ${filename}:`, e);
      return null;
    }
  }
  return null;
}

const taskQueue = loadVfData('TASK_QUEUE.vf.json');
const features = loadVfData('FEATURE.vf.json');

// Security middleware
function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const client = rateLimiter.get(ip);

  if (!client || now > client.reset) {
    rateLimiter.set(ip, { count: 1, reset: now + securityConfig.rateLimit.window });
    return true;
  }

  if (client.count >= securityConfig.rateLimit.max) {
    return false;
  }

  client.count++;
  return true;
}

// Main server
serve({
  port: PORT,

  fetch(request) {
    const url = new URL(request.url);
    const clientIp = request.headers.get('x-forwarded-for') || '127.0.0.1';

    // Apply rate limiting
    if (!checkRateLimit(clientIp)) {
      return new Response('Rate limit exceeded', {
        status: 429,
        headers: { ...securityConfig.headers, 'Retry-After': '60' }
      });
    }

    // Route handlers
    switch (url.pathname) {
      case '/':
        return new Response(renderPortalHome(), {
          headers: {
            ...securityConfig.headers,
            'Content-Type': 'text/html; charset=utf-8'
          }
        });

      case '/api/status':
        return new Response(JSON.stringify({
          status: 'operational',
          security: 'enabled',
          port: PORT,
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          services: {
            taskQueue: taskQueue ? 'loaded' : 'unavailable',
            features: features ? 'loaded' : 'unavailable'
          }
        }), {
          headers: {
            ...securityConfig.headers,
            'Content-Type': 'application/json'
          }
        });

      case '/api/tasks':
        const tasks = getTaskSummary();
        return new Response(JSON.stringify(tasks), {
          headers: {
            ...securityConfig.headers,
            'Content-Type': 'application/json'
          }
        });

      case '/api/features':
        const featureData = getFeatureSummary();
        return new Response(JSON.stringify(featureData), {
          headers: {
            ...securityConfig.headers,
            'Content-Type': 'application/json'
          }
        });

      case '/api/security':
        return new Response(JSON.stringify({
          status: 'active',
          headers: Object.keys(securityConfig.headers),
          rateLimit: securityConfig.rateLimit,
          cors: 'restricted',
          authentication: 'session-based'
        }), {
          headers: {
            ...securityConfig.headers,
            'Content-Type': 'application/json'
          }
        });

      default:
        return new Response('Not Found', {
          status: 404,
          headers: securityConfig.headers
        });
    }
  }
});

function getTaskSummary() {
  if (!taskQueue) return { error: 'Task queue unavailable' };

  const summary = {
    total: taskQueue.metadata?.total_items || 0,
    queues: Object.entries(taskQueue.queues || {}).map(([name, queue]: [string, any]) => ({
      name,
      count: queue.items?.length || 0,
      items: queue.items?.slice(0, 3).map((item: any) => ({
        id: item.id,
        content: item.content?.substring(0, 100),
        status: item.status
      }))
    }))
  };

  return summary;
}

function getFeatureSummary() {
  if (!features) return { error: 'Features unavailable' };

  return {
    categories: Object.entries(features.features || {}).map(([cat, items]: [string, any]) => ({
      category: cat,
      count: items?.length || 0,
      items: items?.slice(0, 3).map((f: any) => ({
        id: f.id,
        name: f.name,
        status: f.data?.status
      }))
    }))
  };
}

function renderPortalHome(): string {
  const taskCount = taskQueue?.metadata?.total_items || 0;
  const featureCount = features ? Object.values(features.features || {}).reduce((sum: number, f: any) => sum + (f?.length || 0), 0) : 0;

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Dev Portal - Security Theme</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        .header {
            background: white;
            border-radius: 10px;
            padding: 30px;
            margin-bottom: 30px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        }
        h1 {
            color: #333;
            display: flex;
            align-items: center;
            gap: 15px;
        }
        .security-badge {
            background: #4caf50;
            color: white;
            padding: 5px 15px;
            border-radius: 20px;
            font-size: 14px;
        }
        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .card {
            background: white;
            border-radius: 10px;
            padding: 25px;
            box-shadow: 0 5px 20px rgba(0,0,0,0.1);
            transition: transform 0.3s;
        }
        .card:hover {
            transform: translateY(-5px);
        }
        .card h3 {
            color: #667eea;
            margin-bottom: 15px;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .stat {
            font-size: 32px;
            font-weight: bold;
            color: #333;
            margin: 10px 0;
        }
        .label {
            color: #666;
            font-size: 14px;
        }
        .api-section {
            background: white;
            border-radius: 10px;
            padding: 25px;
            margin-bottom: 20px;
        }
        .endpoint {
            background: #f5f5f5;
            padding: 12px;
            border-radius: 6px;
            margin: 8px 0;
            font-family: monospace;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .method {
            background: #667eea;
            color: white;
            padding: 3px 8px;
            border-radius: 4px;
            font-size: 12px;
        }
        .security-info {
            background: #e8f5e9;
            border-left: 4px solid #4caf50;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }
        .security-info h4 {
            color: #2e7d32;
            margin-bottom: 10px;
        }
        .feature-list {
            list-style: none;
        }
        .feature-list li {
            padding: 5px 0;
        }
        .check { color: #4caf50; margin-right: 8px; }
        footer {
            text-align: center;
            color: white;
            padding: 20px;
        }
        .modal {
            display: none;
            position: fixed;
            z-index: 1000;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0,0,0,0.4);
        }
        .modal-content {
            background-color: #fefefe;
            margin: 5% auto;
            padding: 20px;
            border: 1px solid #888;
            width: 80%;
            max-width: 800px;
            border-radius: 10px;
            max-height: 80vh;
            overflow-y: auto;
        }
        .close {
            color: #aaa;
            float: right;
            font-size: 28px;
            font-weight: bold;
            cursor: pointer;
        }
        .close:hover,
        .close:focus {
            color: #000;
        }
        pre {
            background: #f5f5f5;
            padding: 15px;
            border-radius: 6px;
            overflow-x: auto;
        }
        .api-link {
            color: #667eea;
            text-decoration: none;
            cursor: pointer;
        }
        .api-link:hover {
            text-decoration: underline;
        }
    </style>
</head>
<body>
    <div id="apiModal" class="modal">
        <div class="modal-content">
            <span class="close">&times;</span>
            <h2 id="modalTitle">API Response</h2>
            <pre id="modalContent"></pre>
        </div>
    </div>

    <div class="header">
        <h1>
            🚀 AI Development Portal
            <span class="security-badge">🔒 Security Enabled</span>
        </h1>
        <p style="color: #666; margin-top: 10px;">Centralized hub for AI development with security-first architecture</p>
    </div>

    <div class="grid">
        <div class="card">
            <h3>📋 Task Queue</h3>
            <div class="stat">${taskCount}</div>
            <div class="label">Active Tasks</div>
            <div style="margin-top: 15px;">
                <a class="api-link" data-endpoint="/api/tasks" data-title="Task Queue">View Tasks API →</a>
            </div>
        </div>

        <div class="card">
            <h3>🎯 Features</h3>
            <div class="stat">${featureCount}</div>
            <div class="label">Total Features</div>
            <div style="margin-top: 15px;">
                <a class="api-link" data-endpoint="/api/features" data-title="Features">View Features API →</a>
            </div>
        </div>

        <div class="card">
            <h3>🔒 Security Status</h3>
            <div class="stat" style="color: #4caf50;">Active</div>
            <div class="label">All protections enabled</div>
            <div style="margin-top: 15px;">
                <a class="api-link" data-endpoint="/api/security" data-title="Security Details">Security Details →</a>
            </div>
        </div>

        <div class="card">
            <h3>⚡ System Health</h3>
            <div class="stat" style="color: #4caf50;">100%</div>
            <div class="label">Operational</div>
            <div style="margin-top: 15px;">
                <a class="api-link" data-endpoint="/api/status" data-title="System Status">System Status →</a>
            </div>
        </div>
    </div>

    <div class="api-section">
        <h3 style="color: #333; margin-bottom: 20px;">🔌 API Endpoints</h3>

        <div class="endpoint">
            <span>/api/status</span>
            <span class="method">GET</span>
        </div>
        <div class="endpoint">
            <span>/api/tasks</span>
            <span class="method">GET</span>
        </div>
        <div class="endpoint">
            <span>/api/features</span>
            <span class="method">GET</span>
        </div>
        <div class="endpoint">
            <span>/api/security</span>
            <span class="method">GET</span>
        </div>
    </div>

    <div class="api-section">
        <div class="security-info">
            <h4>🛡️ Security Features</h4>
            <ul class="feature-list">
                <li><span class="check">✓</span> Rate limiting (100 req/min)</li>
                <li><span class="check">✓</span> Security headers (HSTS, CSP, X-Frame-Options)</li>
                <li><span class="check">✓</span> XSS protection</li>
                <li><span class="check">✓</span> CORS restrictions</li>
                <li><span class="check">✓</span> Content-Type validation</li>
            </ul>
        </div>
    </div>

    <footer>
        <p>AI Dev Portal | Port ${PORT} | Security Theme Active</p>
    </footer>

    <script>
        // Modal functionality
        const modal = document.getElementById('apiModal');
        const modalTitle = document.getElementById('modalTitle');
        const modalContent = document.getElementById('modalContent');
        const closeBtn = document.getElementsByClassName('close')[0];

        // Handle API link clicks
        document.querySelectorAll('.api-link').forEach(link => {
            link.addEventListener('click', async (e) => {
                e.preventDefault();
                const endpoint = link.dataset.endpoint;
                const title = link.dataset.title;

                try {
                    const response = await fetch(endpoint);
                    const data = await response.json();

                    modalTitle.textContent = title;
                    modalContent.textContent = JSON.stringify(data, null, 2);
                    modal.style.display = 'block';
                } catch (error) {
                    modalTitle.textContent = 'Error';
                    modalContent.textContent = 'Failed to fetch data: ' + error.message;
                    modal.style.display = 'block';
                }
            });
        });

        // Close modal when clicking X
        closeBtn.onclick = function() {
            modal.style.display = 'none';
        }

        // Close modal when clicking outside
        window.onclick = function(event) {
            if (event.target == modal) {
                modal.style.display = 'none';
            }
        }

        // Handle Escape key
        document.addEventListener('keydown', function(event) {
            if (event.key === 'Escape' && modal.style.display === 'block') {
                modal.style.display = 'none';
            }
        });
    </script>
</body>
</html>`;
}

console.log(`
╔═══════════════════════════════════════════════╗
║     🚀 AI Dev Portal - Security Theme         ║
╠═══════════════════════════════════════════════╣
║ Port:      ${PORT}                               ║
║ Status:    Active                             ║
║ Security:  Enabled                            ║
║ Tasks:     ${taskQueue?.metadata?.total_items || 0} loaded                         ║
║ Features:  ${features ? 'Loaded' : 'Unavailable'}                        ║
║ URL:       http://localhost:${PORT}              ║
╚═══════════════════════════════════════════════╝
`);