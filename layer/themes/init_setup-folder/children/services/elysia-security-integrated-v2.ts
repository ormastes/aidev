/**
 * Elysia Server with Security Module Port Management Integration V2
 * Using built-in cookie support instead of session plugin
 */

import { Elysia } from 'elysia'
import { cors } from '@elysiajs/cors'
import { cookie } from '@elysiajs/cookie'
import { SignJWT, jwtVerify } from 'jose'
import Database from 'bun:sqlite'

// Import security module's port manager
import { EnhancedPortManager } from '../../../portal_security/children/EnhancedPortManager'

// Configuration
const JWT_SECRET = new TextEncoder().encode(process.env.SSO_SECRET || 'aidev-dev-secret')
const DEPLOY_TYPE = (process.env.DEPLOY_TYPE || 'local') as 'local' | 'dev' | 'demo' | 'release' | 'production'
const APP_ID = 'portal' // Predefined app ID for AI Dev Portal
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7 // 7 days

// Simple session store using SQLite
class SessionStore {
  private db: any

  constructor() {
    this.db = new Database(':memory:') // Use file for persistence: 'sessions.db'
    this.init()
  }

  private init() {
    this.db.run(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        data TEXT,
        expires INTEGER
      )
    `)
  }

  async get(id: string): Promise<any> {
    const row = this.db.query('SELECT data FROM sessions WHERE id = ? AND expires > ?').get(id, Date.now())
    return row ? JSON.parse(row.data) : null
  }

  async set(id: string, data: any, ttl: number = SESSION_TTL_SECONDS) {
    const expires = Date.now() + (ttl * 1000)
    this.db.run(
      'INSERT OR REPLACE INTO sessions (id, data, expires) VALUES (?, ?, ?)',
      [id, JSON.stringify(data), expires]
    )
  }

  async delete(id: string) {
    this.db.run('DELETE FROM sessions WHERE id = ?', [id])
  }

  close() {
    this.db.close()
  }
}

export class ElysiaSecurityIntegratedServer {
  private app: Elysia
  private sessionStore: SessionStore
  private portManager: any
  private assignedPort?: number
  private serverInstance?: any

  constructor() {
    this.sessionStore = new SessionStore()
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
      ipAddress: '127.0.0.1'
    })

    if (!registration.success) {
      throw new Error(`Failed to register with security: ${registration.message}`)
    }

    this.assignedPort = registration.port!
    console.log(`✅ Security assigned port: ${this.assignedPort}`)
    
    return this.assignedPort
  }

  /**
   * Generate session ID
   */
  private generateSessionId(): string {
    return crypto.randomUUID()
  }

  /**
   * Setup middleware and routes
   */
  private setupApp() {
    // CORS configuration
    this.app.use(cors({
      origin: (req) => {
        const o = req.headers.get('origin')
        const allowedOrigins = [
          `http://localhost:${this.assignedPort}`,
          `http://127.0.0.1:${this.assignedPort}`,
          'http://localhost:3000',
        ]
        return o && allowedOrigins.some(allowed => o.startsWith(allowed))
      },
      credentials: true
    }))

    // Cookie support
    this.app.use(cookie())

    // Session middleware
    this.app.derive(async ({ cookie, setCookie }) => {
      let sessionId = cookie['aidev_sid']
      let session = null

      if (sessionId) {
        session = await this.sessionStore.get(sessionId)
      }

      if (!session) {
        sessionId = this.generateSessionId()
        session = {}
        await this.sessionStore.set(sessionId, session)
        setCookie('aidev_sid', sessionId, {
          httpOnly: true,
          secure: DEPLOY_TYPE === 'production',
          sameSite: 'lax',
          maxAge: SESSION_TTL_SECONDS
        })
      }

      return {
        session,
        sessionId,
        setSession: async (data: any) => {
          await this.sessionStore.set(sessionId, data)
        }
      }
    })

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
      .post('/api/login', async ({ body, setSession, setCookie, sessionId }) => {
        const { email, password } = body as any
        
        if (email && password) {
          const authResult = await this.verifyWithSecurity(email, password)
          
          if (authResult.success) {
            await setSession({ user: authResult.user })
            return { success: true, user: authResult.user }
          }
        }
        
        return { success: false, error: 'Invalid credentials' }
      })
      .post('/api/logout', async ({ sessionId }) => {
        await this.sessionStore.delete(sessionId)
        return { success: true }
      })
      .get('/api/user', ({ session }) => {
        return { user: session?.user || null }
      })

    // Portal home
    this.app.get('/', ({ session }) => {
      return this.renderPortalHome(session?.user)
    })

    // API routes
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

    // Mount embedded apps in development
    if (DEPLOY_TYPE === 'local' || DEPLOY_TYPE === 'dev') {
      this.mountEmbeddedApps()
    }
  }

  /**
   * Verify credentials with security module
   */
  private async verifyWithSecurity(email: string, password: string) {
    // TODO: Integrate with actual security authentication
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
   * Mount embedded applications for development
   */
  private mountEmbeddedApps() {
    const embeddedApps = [
      { prefix: '/logs', name: 'Log Dashboard' },
      { prefix: '/gui', name: 'GUI Selector' },
      { prefix: '/chat', name: 'Chat Space' },
      { prefix: '/security', name: 'Security Portal' }
    ]

    embeddedApps.forEach(({ prefix, name }) => {
      this.app.get(`${prefix}`, () => ({
        message: `${name} - Embedded app`,
        info: 'In production, this would be the actual service'
      }))
    })
  }

  /**
   * Get enabled features based on deploy type
   */
  private getEnabledFeatures() {
    const features: Record<string, any> = {
      local: { hotReload: true, debug: true, embeddedApps: true },
      dev: { hotReload: true, debug: true, embeddedApps: true },
      demo: { hotReload: false, debug: false, embeddedApps: false },
      release: { hotReload: false, debug: false, embeddedApps: false },
      production: { hotReload: false, debug: false, embeddedApps: false, https: true }
    }
    return features[DEPLOY_TYPE] || features.dev
  }

  /**
   * Render portal home page
   */
  private renderPortalHome(user: any) {
    return new Response(`<!DOCTYPE html>
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
        .container { max-width: 1200px; margin: 0 auto; }
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
          background: ${DEPLOY_TYPE === 'production' ? '#ef4444' : 
                       DEPLOY_TYPE === 'release' ? '#f59e0b' : '#10b981'};
          color: white;
        }
        .info-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
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
        .btn {
          display: inline-block;
          padding: 0.75rem 1.5rem;
          background: #667eea;
          color: white;
          text-decoration: none;
          border-radius: 0.5rem;
          font-weight: 600;
          margin-top: 1rem;
        }
        .btn:hover { background: #5a67d8; }
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
              <h3>Port</h3>
              <p>${this.assignedPort}</p>
            </div>
            <div class="info-card">
              <h3>Security</h3>
              <p>✅ Managed</p>
            </div>
            <div class="info-card">
              <h3>Session</h3>
              <p>SQLite</p>
            </div>
            <div class="info-card">
              <h3>Deploy</h3>
              <p>${DEPLOY_TYPE}</p>
            </div>
          </div>
          
          <div style="margin-top: 2rem; padding-top: 2rem; border-top: 1px solid #e5e7eb;">
            ${user ? `
              <p>Welcome, <strong>${user.name || user.email}</strong></p>
              <form action="/api/logout" method="POST" style="display: inline;">
                <button type="submit" class="btn">Logout</button>
              </form>
            ` : `
              <p>Not logged in</p>
              <p style="margin-top: 0.5rem;">Use email and password "demo" to test</p>
              <a href="#" onclick="showLogin()" class="btn">Login</a>
            `}
          </div>
        </div>
      </div>
      
      <script>
        function showLogin() {
          const email = prompt('Email:')
          const password = prompt('Password:')
          if (email && password) {
            fetch('/api/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email, password }),
              credentials: 'include'
            })
            .then(r => r.json())
            .then(data => {
              if (data.success) location.reload()
              else alert('Login failed')
            })
          }
        }
      </script>
    </body>
    </html>`, {
      headers: { 'Content-Type': 'text/html' }
    })
  }

  /**
   * Start the server
   */
  async start() {
    // Register with security module
    const port = await this.registerWithSecurity()
    
    // Setup app routes
    this.setupApp()
    
    // Start listening
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
   * Stop the server
   */
  async stop() {
    if (this.serverInstance) {
      await this.portManager.releasePort(this.assignedPort)
      this.sessionStore.close()
      console.log('🛑 Server stopped and port released')
    }
  }
}

export default ElysiaSecurityIntegratedServer