/**
 * Elysia Server with Security Module Port Management Integration
 */

import { Elysia } from 'elysia'
import { cors } from '@elysiajs/cors'
import { sessionPlugin } from 'elysia-session'
import { BunSQLiteStore } from 'elysia-session/stores/bun/sqlite'
import { Database } from 'bun:sqlite'
import { SignJWT, jwtVerify } from 'jose'
import * as path from 'path'

// Import security module's port manager
import { EnhancedPortManager } from '../../../portal_security/children/EnhancedPortManager'

// Configuration
const SESSION_NAME = 'aidev_sid'
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7
const JWT_SECRET = new TextEncoder().encode(process.env.SSO_SECRET || 'aidev-dev-secret')
const DEPLOY_TYPE = (process.env.DEPLOY_TYPE || 'local') as 'local' | 'dev' | 'demo' | 'release' | 'production'
const APP_ID = 'portal' // Predefined app ID for AI Dev Portal

export class ElysiaSecurityIntegratedServer {
  private app: Elysia
  private db: Database
  private portManager: any // EnhancedPortManager instance
  private assignedPort?: number
  private serverInstance?: any

  constructor() {
    this.db = new Database('sessions.db')
    this.app = new Elysia()
    // Get singleton instance of port manager
    this.portManager = (EnhancedPortManager as any).getInstance()
  }

  /**
   * Register with security module and get port assignment
   */
  async registerWithSecurity(): Promise<number> {
    console.log(`🔐 Registering ${APP_ID} with security module for ${DEPLOY_TYPE} deployment...`)
    
    const registration = await this.portManager.registerApp({
      appId: APP_ID,
      deployType: DEPLOY_TYPE,
      ipAddress: '127.0.0.1' // Localhost binding for security
    })

    if (!registration.success) {
      throw new Error(`Failed to register with security: ${registration.message}`)
    }

    this.assignedPort = registration.port!
    console.log(`✅ Security assigned port: ${this.assignedPort}`)
    
    return this.assignedPort
  }

  /**
   * Setup middleware and routes
   */
  private setupApp() {
    // CORS configuration
    this.app.use(cors({
      origin: (req) => {
        const o = req.headers.get('origin')
        // Allow localhost and assigned port
        const allowedOrigins = [
          `http://localhost:${this.assignedPort}`,
          `http://127.0.0.1:${this.assignedPort}`,
          'http://localhost:3000', // Fallback
        ]
        return o && allowedOrigins.some(allowed => o.startsWith(allowed))
      },
      credentials: true
    }))

    // Session management
    this.app.use(sessionPlugin({
      cookieName: SESSION_NAME,
      store: new BunSQLiteStore(this.db, 'sessions'),
      expireAfter: SESSION_TTL_SECONDS
    }))

    // Health check
    this.app.get('/health', () => ({
      status: 'healthy',
      app: APP_ID,
      deployType: DEPLOY_TYPE,
      port: this.assignedPort,
      security: 'integrated'
    }))

    // Authentication routes
    this.app
      .post('/api/login', async (ctx) => {
        const body = ctx.body as any
        
        // Basic auth (replace with actual auth logic)
        if (body?.email && body?.password) {
          // Verify with security module if needed
          const authResult = await this.verifyWithSecurity(body.email, body.password)
          
          if (authResult.success) {
            ctx.session.set('user', authResult.user)
            return { success: true, user: authResult.user }
          }
        }
        
        return { success: false, error: 'Invalid credentials' }
      })
      .post('/api/logout', (ctx) => {
        ctx.session.clear()
        return { success: true }
      })
      .get('/api/user', (ctx) => {
        const user = ctx.session.get('user')
        return { user: user || null }
      })

    // Mount sub-applications
    this.mountSubApps()
  }

  /**
   * Verify credentials with security module
   */
  private async verifyWithSecurity(email: string, password: string) {
    // TODO: Integrate with actual security authentication
    // For now, mock authentication
    if (email && password === 'demo') {
      return {
        success: true,
        user: {
          id: '1',
          email,
          name: email.split('@')[0],
          roles: ['user']
        }
      }
    }
    return { success: false, user: null }
  }

  /**
   * Mount sub-applications with security-aware routing
   */
  private mountSubApps() {
    // Portal routes
    this.app.get('/', ({ session }) => {
      const user = session?.get('user')
      return this.renderPortalHome(user)
    })

    // API routes group
    this.app.group('/api', app => app
      .get('/status', () => ({
        status: 'operational',
        deployType: DEPLOY_TYPE,
        port: this.assignedPort,
        security: {
          managed: true,
          portManager: 'EnhancedPortManager'
        }
      }))
      .get('/config', () => ({
        deployType: DEPLOY_TYPE,
        features: this.getEnabledFeatures()
      }))
    )

    // Embedded apps (if same port sharing is enabled)
    if (DEPLOY_TYPE === 'local' || DEPLOY_TYPE === 'dev') {
      this.mountEmbeddedApps()
    }
  }

  /**
   * Mount embedded applications for development
   */
  private mountEmbeddedApps() {
    // These will be proxied or mounted based on security configuration
    const embeddedApps = [
      { prefix: '/logs', name: 'Log Dashboard', appId: 'external-log' },
      { prefix: '/gui', name: 'GUI Selector', appId: 'gui-selector' },
      { prefix: '/chat', name: 'Chat Space', appId: 'chat-space' },
      { prefix: '/security', name: 'Security Portal', appId: 'security-proxy' }
    ]

    embeddedApps.forEach(({ prefix, name }) => {
      this.app.get(`${prefix}/*`, () => ({
        message: `${name} - Embedded app placeholder`,
        info: 'In production, this would proxy to the actual service'
      }))
    })
  }

  /**
   * Get enabled features based on deploy type
   */
  private getEnabledFeatures() {
    const features: Record<string, any> = {
      local: {
        hotReload: true,
        debug: true,
        embeddedApps: true,
        cors: 'permissive'
      },
      dev: {
        hotReload: true,
        debug: true,
        embeddedApps: true,
        cors: 'restricted'
      },
      demo: {
        hotReload: false,
        debug: false,
        embeddedApps: false,
        cors: 'restricted'
      },
      release: {
        hotReload: false,
        debug: false,
        embeddedApps: false,
        cors: 'strict'
      },
      production: {
        hotReload: false,
        debug: false,
        embeddedApps: false,
        cors: 'strict',
        https: true
      }
    }
    
    return features[DEPLOY_TYPE] || features.dev
  }

  /**
   * Render portal home page
   */
  private renderPortalHome(user: any) {
    return `<!DOCTYPE html>
    <html>
    <head>
      <title>AI Dev Portal - ${DEPLOY_TYPE.toUpperCase()}</title>
      <meta charset="utf-8">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: system-ui, -apple-system, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          padding: 2rem;
        }
        .container {
          max-width: 1200px;
          margin: 0 auto;
        }
        .header {
          background: white;
          border-radius: 1rem;
          padding: 2rem;
          margin-bottom: 2rem;
          box-shadow: 0 10px 40px rgba(0,0,0,0.1);
        }
        .deployment-badge {
          display: inline-block;
          padding: 0.25rem 0.75rem;
          border-radius: 1rem;
          font-size: 0.875rem;
          font-weight: 600;
          margin-left: 1rem;
          background: ${DEPLOY_TYPE === 'production' ? '#ef4444' : DEPLOY_TYPE === 'release' ? '#f59e0b' : '#10b981'};
          color: white;
        }
        .info-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1rem;
          margin-top: 1rem;
        }
        .info-card {
          background: #f3f4f6;
          padding: 1rem;
          border-radius: 0.5rem;
        }
        .info-card h3 {
          font-size: 0.875rem;
          color: #6b7280;
          margin-bottom: 0.25rem;
        }
        .info-card p {
          font-size: 1.25rem;
          font-weight: 600;
          color: #111827;
        }
        .user-section {
          margin-top: 2rem;
          padding-top: 2rem;
          border-top: 1px solid #e5e7eb;
        }
        .btn {
          display: inline-block;
          padding: 0.75rem 1.5rem;
          background: #667eea;
          color: white;
          text-decoration: none;
          border-radius: 0.5rem;
          font-weight: 600;
          transition: background 0.3s;
        }
        .btn:hover {
          background: #5a67d8;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>
            🚀 AI Dev Portal
            <span class="deployment-badge">${DEPLOY_TYPE.toUpperCase()}</span>
          </h1>
          
          <div class="info-grid">
            <div class="info-card">
              <h3>Port Assignment</h3>
              <p>${this.assignedPort}</p>
            </div>
            <div class="info-card">
              <h3>Security</h3>
              <p>✅ Managed</p>
            </div>
            <div class="info-card">
              <h3>Session Store</h3>
              <p>SQLite</p>
            </div>
            <div class="info-card">
              <h3>Deploy Type</h3>
              <p>${DEPLOY_TYPE}</p>
            </div>
          </div>
          
          <div class="user-section">
            ${user ? `
              <p>Welcome, <strong>${user.name || user.email}</strong></p>
              <a href="/api/logout" class="btn" style="margin-top: 1rem;">Logout</a>
            ` : `
              <p>Not logged in</p>
              <a href="/api/login" class="btn" style="margin-top: 1rem;">Login</a>
            `}
          </div>
        </div>
      </div>
    </body>
    </html>`
  }

  /**
   * Start the server
   */
  async start() {
    // Register with security module first
    const port = await this.registerWithSecurity()
    
    // Setup app routes
    this.setupApp()
    
    // Start listening on assigned port
    this.serverInstance = this.app.listen(port)
    
    console.log(`
╔════════════════════════════════════════════╗
║      AI Dev Portal - Security Managed      ║
╠════════════════════════════════════════════╣
║ 🚀 Status:     Running                     ║
║ 🔐 Security:   EnhancedPortManager         ║
║ 📍 Deploy:     ${DEPLOY_TYPE.padEnd(28)}║
║ 🔌 Port:       ${String(port).padEnd(28)}║
║ 🌐 URL:        http://localhost:${port}${' '.repeat(28 - String(port).length - 11)}║
╚════════════════════════════════════════════╝
    `)
    
    return this.serverInstance
  }

  /**
   * Stop the server and cleanup
   */
  async stop() {
    if (this.serverInstance) {
      // Notify security module
      await this.portManager.releasePort(this.assignedPort)
      
      // Close database
      this.db.close()
      
      console.log('🛑 Server stopped and port released')
    }
  }
}

export default ElysiaSecurityIntegratedServer