/**
 * Elysia App Server with Port Sharing and Hot Swap
 * Enables embedding multiple web apps on a single port with session sharing
 */

import { Elysia } from 'elysia'
import { cors } from '@elysiajs/cors'
import { sessionPlugin } from 'elysia-session'
import { BunSQLiteStore } from 'elysia-session/stores/bun/sqlite'
import { Database } from 'bun:sqlite'
import { SignJWT, jwtVerify } from 'jose'
import * as path from 'path'
import * as fs from 'fs/promises'

// Configuration
const SESSION_NAME = 'aidev_sid'
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7 // 7 days
const JWT_SECRET = new TextEncoder().encode(process.env.SSO_SECRET || 'aidev-dev-secret')
const DOMAIN_BASE = process.env.DOMAIN_BASE || 'https://aidev.platform.com'
const IP_BASE = process.env.IP_BASE || 'http://192.168.0.10:3000'
const HOT_RELOAD = process.env.NODE_ENV === 'development'

interface EmbeddedApp {
  name: string
  prefix: string
  path: string
  module?: any
  lastModified?: number
}

export class ElysiaAppServer {
  private app: Elysia
  private db: Database
  private embeddedApps: Map<string, EmbeddedApp> = new Map()
  private hotReloadInterval?: Timer

  constructor(private port: number = 3000) {
    this.db = new Database('sessions.db')
    this.app = new Elysia()
    this.setupMiddleware()
    this.setupAuthRoutes()
    this.setupSSORoutes()
    if (HOT_RELOAD) {
      this.enableHotReload()
    }
  }

  private setupMiddleware() {
    this.app
      .use(cors({
        origin: (req) => {
          const o = req.headers.get('origin')
          return o && [DOMAIN_BASE, IP_BASE].some(base => o.startsWith(base))
        },
        credentials: true
      }))
      .use(sessionPlugin({
        cookieName: SESSION_NAME,
        store: new BunSQLiteStore(this.db, 'sessions'),
        expireAfter: SESSION_TTL_SECONDS
      }))
  }

  private setupAuthRoutes() {
    this.app
      .post('/api/login', async (ctx) => {
        const { email, password } = ctx.body as any
        // TODO: Implement actual authentication
        if (email && password) {
          ctx.session.set('user', { 
            id: Math.random().toString(36).substr(2, 9),
            email,
            name: email.split('@')[0]
          })
          return ctx.json({ ok: true, user: ctx.session.get('user') })
        }
        return ctx.json({ ok: false, error: 'Invalid credentials' })
      })
      .post('/api/logout', (ctx) => {
        ctx.session.clear()
        return ctx.json({ ok: true })
      })
      .get('/api/me', (ctx) => {
        return ctx.json({ user: ctx.session.get('user') || null })
      })
  }

  private setupSSORoutes() {
    // SSO handoff for IP <-> Domain authentication sharing
    this.app
      .get('/sso/start', async ({ request, session }) => {
        const url = new URL(request.url)
        const target = url.searchParams.get('to') // 'ip' | 'domain'
        const user = session.get('user')
        
        if (!user || !target) {
          return new Response('Unauthorized', { status: 401 })
        }

        const token = await new SignJWT({ 
          uid: user.id,
          email: user.email,
          name: user.name
        })
          .setProtectedHeader({ alg: 'HS256' })
          .setExpirationTime('60s')
          .sign(JWT_SECRET)

        const base = target === 'ip' ? IP_BASE : DOMAIN_BASE
        const redirect = new URL('/sso/consume', base)
        redirect.searchParams.set('token', token)
        return Response.redirect(redirect.toString(), 302)
      })
      .get('/sso/consume', async ({ request, session }) => {
        const token = new URL(request.url).searchParams.get('token')
        if (!token) {
          return new Response('Bad Request', { status: 400 })
        }

        try {
          const { payload } = await jwtVerify(token, JWT_SECRET)
          session.set('user', { 
            id: payload.uid as string,
            email: payload.email as string,
            name: payload.name as string
          })
          return Response.redirect('/', 302)
        } catch {
          return new Response('Invalid token', { status: 401 })
        }
      })
  }

  /**
   * Register an embedded app to be served under a specific prefix
   */
  async registerApp(config: EmbeddedApp) {
    const appPath = path.join(process.cwd(), config.path)
    
    // Check if app exists
    const exists = await fs.access(appPath).then(() => true).catch(() => false)
    if (!exists) {
      console.warn(`App path not found: ${appPath}`)
      return false
    }

    // Load app module
    const indexPath = path.join(appPath, 'index.ts')
    const serverPath = path.join(appPath, 'server.ts')
    const appFilePath = await fs.access(indexPath).then(() => indexPath)
      .catch(() => fs.access(serverPath).then(() => serverPath))
      .catch(() => null)

    if (!appFilePath) {
      console.warn(`No app entry point found for ${config.name}`)
      return false
    }

    try {
      const appModule = await import(appFilePath)
      const appInstance = appModule.default || appModule.app

      if (appInstance instanceof Elysia) {
        // Mount the sub-app with its prefix
        const subApp = new Elysia({ prefix: config.prefix })
          .use(appInstance)
        
        this.app.use(subApp)
        
        // Store for hot reload
        this.embeddedApps.set(config.name, {
          ...config,
          module: appInstance,
          lastModified: Date.now()
        })

        console.log(`✅ Registered app: ${config.name} at ${config.prefix}`)
        return true
      }
    } catch (error) {
      console.error(`Failed to load app ${config.name}:`, error)
    }

    return false
  }

  /**
   * Enable hot reload for development
   */
  private enableHotReload() {
    console.log('🔥 Hot reload enabled')
    
    this.hotReloadInterval = setInterval(async () => {
      for (const [name, app] of this.embeddedApps) {
        const appPath = path.join(process.cwd(), app.path)
        const stats = await fs.stat(appPath).catch(() => null)
        
        if (stats && stats.mtimeMs > (app.lastModified || 0)) {
          console.log(`🔄 Reloading ${name}...`)
          
          // Clear module cache
          const modulePath = path.resolve(appPath)
          delete require.cache[modulePath]
          
          // Re-register the app
          await this.registerApp({
            name: app.name,
            prefix: app.prefix,
            path: app.path
          })
          
          app.lastModified = stats.mtimeMs
        }
      }
    }, 1000) // Check every second
  }

  /**
   * Register all default embedded apps
   */
  async registerDefaultApps() {
    const apps: EmbeddedApp[] = [
      {
        name: 'AI Dev Portal',
        prefix: '/portal',
        path: 'layer/themes/portal_aidev'
      },
      {
        name: 'Log Dashboard',
        prefix: '/logs',
        path: 'layer/themes/infra_external-log-lib/user-stories/010-log-analysis-dashboard'
      },
      {
        name: 'GUI Selector',
        prefix: '/gui',
        path: 'layer/themes/portal_gui-selector'
      },
      {
        name: 'Monitoring',
        prefix: '/monitor',
        path: 'layer/themes/infra_monitoring'
      },
      {
        name: 'Security Portal',
        prefix: '/security',
        path: 'layer/themes/portal_security'
      }
    ]

    for (const app of apps) {
      await this.registerApp(app)
    }
  }

  /**
   * Start the server
   */
  async start() {
    // Register default apps
    await this.registerDefaultApps()

    // Add health check
    this.app.get('/health', () => ({ 
      status: 'ok', 
      apps: Array.from(this.embeddedApps.keys()),
      session: SESSION_NAME,
      hotReload: HOT_RELOAD
    }))

    // Start server
    this.app.listen(this.port)
    
    console.log(`
🚀 Elysia App Server running on port ${this.port}
📦 Embedded apps: ${this.embeddedApps.size}
🔐 Session store: SQLite
🔥 Hot reload: ${HOT_RELOAD ? 'enabled' : 'disabled'}
🌐 Access at: 
   - ${IP_BASE}
   - ${DOMAIN_BASE}
    `)
  }

  /**
   * Stop the server
   */
  stop() {
    if (this.hotReloadInterval) {
      clearInterval(this.hotReloadInterval)
    }
    this.db.close()
  }
}

// Export for use in other modules
export default ElysiaAppServer