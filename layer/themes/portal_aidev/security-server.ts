#!/usr/bin/env bun
/**
 * Security-First Local Development Server
 * Port: 3156
 * Purpose: Secure local development portal with built-in protections
 */

import { serve } from 'bun';

const PORT = 3156;
const ALLOWED_ORIGINS = ['http://localhost:3156', 'http://127.0.0.1:3156'];

// Security headers
const securityHeaders = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'",
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
};

// Request rate limiting
const requestCounts = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 100; // requests per minute
const RATE_WINDOW = 60000; // 1 minute in ms

function checkRateLimit(clientIp: string): boolean {
  const now = Date.now();
  const client = requestCounts.get(clientIp);

  if (!client || now > client.resetTime) {
    requestCounts.set(clientIp, { count: 1, resetTime: now + RATE_WINDOW });
    return true;
  }

  if (client.count >= RATE_LIMIT) {
    return false;
  }

  client.count++;
  return true;
}

// Main server
const server = serve({
  port: PORT,

  fetch(request) {
    const url = new URL(request.url);
    const clientIp = request.headers.get('x-forwarded-for') || '127.0.0.1';

    // Rate limiting
    if (!checkRateLimit(clientIp)) {
      return new Response('Rate limit exceeded', {
        status: 429,
        headers: { ...securityHeaders, 'Retry-After': '60' }
      });
    }

    // CORS check for API routes
    const origin = request.headers.get('origin');
    if (url.pathname.startsWith('/api/') && origin && !ALLOWED_ORIGINS.includes(origin)) {
      return new Response('CORS policy violation', {
        status: 403,
        headers: securityHeaders
      });
    }

    // Route handling
    if (url.pathname === '/') {
      return new Response(getHomePage(), {
        headers: {
          ...securityHeaders,
          'Content-Type': 'text/html; charset=utf-8'
        }
      });
    }

    if (url.pathname === '/api/status') {
      return new Response(JSON.stringify({
        status: 'operational',
        port: PORT,
        security: 'enabled',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      }), {
        headers: {
          ...securityHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    if (url.pathname === '/api/health') {
      return new Response(JSON.stringify({
        healthy: true,
        security_module: 'active',
        rate_limiting: 'enabled',
        cors_protection: 'enabled'
      }), {
        headers: {
          ...securityHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    // 404 for unknown routes
    return new Response('Not Found', {
      status: 404,
      headers: securityHeaders
    });
  }
});

function getHomePage(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Secure Dev Portal - Port 3156</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .container {
            background: white;
            border-radius: 10px;
            padding: 40px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            max-width: 600px;
            width: 90%;
        }
        h1 {
            color: #333;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .status {
            display: inline-block;
            padding: 4px 12px;
            background: #4caf50;
            color: white;
            border-radius: 20px;
            font-size: 14px;
            margin-left: 10px;
        }
        .security-info {
            background: #f0f4f8;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
        }
        .security-info h3 {
            color: #667eea;
            margin-bottom: 10px;
        }
        .feature-list {
            list-style: none;
            margin-top: 10px;
        }
        .feature-list li {
            padding: 8px 0;
            border-bottom: 1px solid #e0e0e0;
        }
        .feature-list li:last-child {
            border-bottom: none;
        }
        .check { color: #4caf50; margin-right: 8px; }
        .endpoints {
            margin-top: 20px;
            padding: 20px;
            background: #f9f9f9;
            border-radius: 8px;
        }
        .endpoints h3 {
            margin-bottom: 10px;
            color: #555;
        }
        .endpoint {
            font-family: monospace;
            background: white;
            padding: 8px 12px;
            margin: 5px 0;
            border-radius: 4px;
            border: 1px solid #ddd;
        }
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e0e0e0;
            color: #666;
            font-size: 14px;
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔒 Secure Development Portal <span class="status">Active</span></h1>

        <div class="security-info">
            <h3>Security Features</h3>
            <ul class="feature-list">
                <li><span class="check">✓</span> Security headers enforced</li>
                <li><span class="check">✓</span> Rate limiting active (100 req/min)</li>
                <li><span class="check">✓</span> CORS protection enabled</li>
                <li><span class="check">✓</span> XSS protection active</li>
                <li><span class="check">✓</span> Content-Type validation</li>
                <li><span class="check">✓</span> Frame options restricted</li>
            </ul>
        </div>

        <div class="endpoints">
            <h3>Available Endpoints</h3>
            <div class="endpoint">GET / - This page</div>
            <div class="endpoint">GET /api/status - Server status</div>
            <div class="endpoint">GET /api/health - Health check</div>
        </div>

        <div class="footer">
            Port 3156 | Security Module Active | Local Development Only
        </div>
    </div>
</body>
</html>`;
}

console.log(`
╔════════════════════════════════════════════╗
║     🔒 Secure Development Server            ║
╠════════════════════════════════════════════╣
║ Port:      ${PORT}                            ║
║ Status:    Active                          ║
║ Security:  Enabled                         ║
║ URL:       http://localhost:${PORT}           ║
╚════════════════════════════════════════════╝
`);