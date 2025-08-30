/**
 * AI Dev Portal - Elysia Version
 * Embedded app for the unified Elysia server
 */

import { Elysia } from 'elysia'
import { html } from '@elysiajs/html'
import { staticPlugin } from '@elysiajs/static'

// Create the portal app
export const app = new Elysia()
  .use(html())
  .use(staticPlugin({
    assets: 'public',
    prefix: '/assets'
  }))
  
  // Dashboard route
  .get('/', ({ session }) => {
    const user = session?.get('user')
    
    return `<!DOCTYPE html>
    <html>
    <head>
      <title>AI Dev Portal</title>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
        }
        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2rem;
        }
        .header {
          background: white;
          border-radius: 1rem;
          padding: 2rem;
          margin-bottom: 2rem;
          box-shadow: 0 10px 40px rgba(0,0,0,0.1);
        }
        .user-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 1.5rem;
        }
        .card {
          background: white;
          border-radius: 0.75rem;
          padding: 1.5rem;
          box-shadow: 0 4px 20px rgba(0,0,0,0.1);
          transition: transform 0.3s, box-shadow 0.3s;
        }
        .card:hover {
          transform: translateY(-5px);
          box-shadow: 0 8px 30px rgba(0,0,0,0.15);
        }
        .card h3 {
          color: #333;
          margin-bottom: 0.5rem;
        }
        .card p {
          color: #666;
          line-height: 1.5;
        }
        .card a {
          display: inline-block;
          margin-top: 1rem;
          padding: 0.5rem 1rem;
          background: #667eea;
          color: white;
          text-decoration: none;
          border-radius: 0.5rem;
          transition: background 0.3s;
        }
        .card a:hover {
          background: #764ba2;
        }
        .status {
          display: inline-block;
          padding: 0.25rem 0.75rem;
          border-radius: 1rem;
          font-size: 0.875rem;
          font-weight: 600;
        }
        .status.online { background: #10b981; color: white; }
        .status.offline { background: #ef4444; color: white; }
        .btn {
          padding: 0.75rem 1.5rem;
          border-radius: 0.5rem;
          border: none;
          font-weight: 600;
          cursor: pointer;
          text-decoration: none;
          display: inline-block;
          transition: all 0.3s;
        }
        .btn-primary {
          background: #667eea;
          color: white;
        }
        .btn-primary:hover {
          background: #5a67d8;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="user-info">
            <div>
              <h1>🚀 AI Dev Portal</h1>
              <p>Unified Development Platform</p>
            </div>
            <div>
              ${user ? `
                <p>Welcome, <strong>${user.name || user.email}</strong></p>
                <a href="/api/logout" class="btn btn-primary">Logout</a>
              ` : `
                <a href="/login" class="btn btn-primary">Login</a>
              `}
            </div>
          </div>
        </div>

        <div class="grid">
          <div class="card">
            <span class="status online">Active</span>
            <h3>📊 Log Dashboard</h3>
            <p>Real-time log monitoring and analysis with advanced filtering and search capabilities.</p>
            <a href="/logs">Open Dashboard</a>
          </div>

          <div class="card">
            <span class="status online">Active</span>
            <h3>🎨 GUI Selector</h3>
            <p>Visual design selection tool for choosing between multiple UI candidates.</p>
            <a href="/gui">Open Selector</a>
          </div>

          <div class="card">
            <span class="status online">Active</span>
            <h3>📈 Monitoring</h3>
            <p>System metrics, performance monitoring, and alerting dashboard.</p>
            <a href="/monitor">View Metrics</a>
          </div>

          <div class="card">
            <span class="status online">Active</span>
            <h3>🔐 Security Portal</h3>
            <p>Security configuration, audit logs, and access control management.</p>
            <a href="/security">Security Settings</a>
          </div>

          <div class="card">
            <h3>🤖 MCP Agents</h3>
            <p>Model Context Protocol agents for AI-powered development assistance.</p>
            <a href="/mcp">Manage Agents</a>
          </div>

          <div class="card">
            <h3>🧪 Test Runner</h3>
            <p>Automated test execution and coverage reporting across all themes.</p>
            <a href="/tests">Run Tests</a>
          </div>
        </div>
      </div>
    </body>
    </html>`
  })

  // Login page
  .get('/login', () => `<!DOCTYPE html>
    <html>
    <head>
      <title>Login - AI Dev Portal</title>
      <meta charset="utf-8">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .login-box {
          background: white;
          border-radius: 1rem;
          padding: 2rem;
          width: 100%;
          max-width: 400px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.1);
        }
        h2 {
          margin-bottom: 1.5rem;
          color: #333;
        }
        .form-group {
          margin-bottom: 1rem;
        }
        label {
          display: block;
          margin-bottom: 0.5rem;
          color: #666;
          font-weight: 500;
        }
        input {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #ddd;
          border-radius: 0.5rem;
          font-size: 1rem;
        }
        button {
          width: 100%;
          padding: 0.75rem;
          background: #667eea;
          color: white;
          border: none;
          border-radius: 0.5rem;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.3s;
        }
        button:hover {
          background: #5a67d8;
        }
      </style>
    </head>
    <body>
      <div class="login-box">
        <h2>🚀 AI Dev Portal Login</h2>
        <form action="/api/login" method="POST">
          <div class="form-group">
            <label>Email</label>
            <input type="email" name="email" required>
          </div>
          <div class="form-group">
            <label>Password</label>
            <input type="password" name="password" required>
          </div>
          <button type="submit">Login</button>
        </form>
      </div>
    </body>
    </html>`)

  // API routes
  .group('/api', app => app
    .get('/status', () => ({
      status: 'operational',
      timestamp: new Date().toISOString(),
      services: {
        portal: 'online',
        logs: 'online',
        gui: 'online',
        monitor: 'online',
        security: 'online'
      }
    }))
    
    .get('/health', () => ({
      status: 'healthy',
      uptime: process.uptime(),
      memory: process.memoryUsage()
    }))

    .get('/mcp/status', () => ({
      connected: true,
      agents: ['architect', 'developer', 'tester', 'gui'],
      servers: ['aidev', 'filesystem']
    }))
  )

export default app