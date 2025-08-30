#!/usr/bin/env bun

/**
 * Simple AI Dev Portal with Mock Security
 */

import { Elysia } from 'elysia'
import { cors } from '@elysiajs/cors'
import { cookie } from '@elysiajs/cookie'
import { MockPortManager } from './children/services/mock-port-manager'

const DEPLOY_TYPE = (process.env.DEPLOY_TYPE || 'local') as any
const APP_ID = 'portal'

async function main() {
  // Get port from mock security
  const portManager = MockPortManager.getInstance()
  const registration = await portManager.registerApp({
    appId: APP_ID,
    deployType: DEPLOY_TYPE,
    ipAddress: '127.0.0.1'
  })

  if (!registration.success) {
    throw new Error(`Failed to get port: ${registration.message}`)
  }

  const port = registration.port!
  
  // Create Elysia app
  const app = new Elysia()
    .use(cors({
      credentials: true
    }))
    .use(cookie())
    
    // Health check
    .get('/health', () => ({
      status: 'ok',
      port,
      deployType: DEPLOY_TYPE
    }))
    
    // Home page
    .get('/', () => new Response(`<!DOCTYPE html>
      <html>
      <head>
        <title>AI Dev Portal</title>
        <style>
          body {
            font-family: system-ui, -apple-system, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            margin: 0;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .card {
            background: white;
            border-radius: 1rem;
            padding: 3rem;
            box-shadow: 0 20px 60px rgba(0,0,0,0.2);
            text-align: center;
            max-width: 500px;
          }
          h1 { 
            color: #333; 
            margin: 0 0 1rem 0;
          }
          .info {
            background: #f3f4f6;
            padding: 1rem;
            border-radius: 0.5rem;
            margin: 1rem 0;
          }
          .badge {
            display: inline-block;
            padding: 0.25rem 0.75rem;
            border-radius: 1rem;
            font-size: 0.875rem;
            font-weight: 600;
            background: ${DEPLOY_TYPE === 'production' ? '#ef4444' : '#10b981'};
            color: white;
          }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>🚀 AI Dev Portal</h1>
          <div class="badge">${DEPLOY_TYPE.toUpperCase()}</div>
          <div class="info">
            <p><strong>Port:</strong> ${port}</p>
            <p><strong>Security:</strong> Mock (Testing)</p>
            <p><strong>Status:</strong> Running</p>
          </div>
          <p style="color: #666; margin-top: 2rem;">
            Elysia server with port sharing capability
          </p>
        </div>
      </body>
      </html>`, {
        headers: { 'Content-Type': 'text/html' }
      }))
    
    // API routes
    .get('/api/status', () => ({
      status: 'operational',
      port,
      deployType: DEPLOY_TYPE,
      timestamp: new Date().toISOString()
    }))

  // Start server
  app.listen(port)
  
  console.log(`
╔════════════════════════════════════════════╗
║         AI Dev Portal - Running            ║
╠════════════════════════════════════════════╣
║ 🚀 Port:       ${String(port).padEnd(28)}║
║ 📍 Deploy:     ${DEPLOY_TYPE.padEnd(28)}║
║ 🌐 URL:        http://localhost:${port}${' '.repeat(28 - String(port).length - 11)}║
╚════════════════════════════════════════════╝
  `)

  // Handle shutdown
  process.on('SIGINT', async () => {
    console.log('\n⏹️  Shutting down...')
    await portManager.releasePort(port)
    process.exit(0)
  })
}

main().catch(console.error)