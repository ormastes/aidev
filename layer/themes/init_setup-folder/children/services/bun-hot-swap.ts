/**
 * Bun Hot Swap Implementation
 * Leverages Bun's native hot reload capabilities
 */

import { watch } from 'fs'
import * as path from 'path'
import { spawn } from 'child_process'

export interface HotSwapConfig {
  watchDirs: string[]
  extensions: string[]
  debounce: number
  onReload?: () => void
  excludeDirs?: string[]
}

export class BunHotSwap {
  private watchers: Map<string, any> = new Map()
  private reloadTimeout?: Timer
  private currentProcess?: any
  private isReloading = false

  constructor(private config: HotSwapConfig) {
    this.config.extensions = config.extensions || ['.ts', '.tsx', '.js', '.jsx']
    this.config.debounce = config.debounce || 500
    this.config.excludeDirs = config.excludeDirs || ['node_modules', '.git', 'dist']
  }

  /**
   * Start watching for file changes
   */
  start() {
    console.log('🔥 Bun Hot Swap enabled')
    
    this.config.watchDirs.forEach(dir => {
      this.watchDirectory(dir)
    })

    // Use Bun's built-in hot reload if available
    if (process.env.NODE_ENV === 'development' && Bun.env.BUN_HOT_RELOAD !== 'false') {
      this.enableBunHotReload()
    }
  }

  /**
   * Watch a directory for changes
   */
  private watchDirectory(dir: string) {
    const absPath = path.resolve(dir)
    
    const watcher = watch(absPath, { recursive: true }, (event, filename) => {
      if (!filename) return
      
      // Check if file should trigger reload
      if (this.shouldReload(filename)) {
        this.scheduleReload(filename)
      }
    })

    this.watchers.set(dir, watcher)
    console.log(`👁️  Watching: ${dir}`)
  }

  /**
   * Check if file should trigger reload
   */
  private shouldReload(filename: string): boolean {
    // Skip excluded directories
    for (const exclude of this.config.excludeDirs!) {
      if (filename.includes(exclude)) {
        return false
      }
    }

    // Check file extension
    const ext = path.extname(filename)
    return this.config.extensions.includes(ext)
  }

  /**
   * Schedule a reload (with debouncing)
   */
  private scheduleReload(filename: string) {
    if (this.isReloading) return

    console.log(`📝 Change detected: ${filename}`)

    // Clear existing timeout
    if (this.reloadTimeout) {
      clearTimeout(this.reloadTimeout)
    }

    // Schedule new reload
    this.reloadTimeout = setTimeout(() => {
      this.reload()
    }, this.config.debounce)
  }

  /**
   * Perform hot reload
   */
  private async reload() {
    if (this.isReloading) return
    this.isReloading = true

    console.log('🔄 Hot reloading...')

    try {
      // Call custom reload handler
      if (this.config.onReload) {
        await this.config.onReload()
      }

      // Clear module cache for hot reload
      this.clearModuleCache()

      // If using Bun's built-in server, trigger reload
      if (globalThis.Bun?.serve) {
        // Bun server automatically reloads
        console.log('✅ Hot reload complete (Bun server)')
      }

      console.log('✅ Hot reload complete')
    } catch (error) {
      console.error('❌ Hot reload failed:', error)
    } finally {
      this.isReloading = false
    }
  }

  /**
   * Clear module cache for hot reload
   */
  private clearModuleCache() {
    // Clear Bun's module cache
    if (globalThis.Bun?.transpiler) {
      // Bun automatically handles module cache clearing
      return
    }

    // Fallback for require.cache (Node.js compatibility)
    if (typeof require !== 'undefined' && require.cache) {
      Object.keys(require.cache).forEach(key => {
        if (!key.includes('node_modules')) {
          delete require.cache[key]
        }
      })
    }
  }

  /**
   * Enable Bun's native hot reload
   */
  private enableBunHotReload() {
    // Use Bun's --hot flag capabilities
    if (import.meta.hot) {
      import.meta.hot.accept()
      
      import.meta.hot.dispose(() => {
        console.log('🔥 Module disposed for hot reload')
        this.stop()
      })

      import.meta.hot.data = {
        timestamp: Date.now()
      }
    }
  }

  /**
   * Run a command with hot reload
   */
  static async runWithHotReload(command: string, args: string[] = []) {
    const bunArgs = ['--hot', ...args]
    
    console.log(`🚀 Starting with hot reload: bun ${command} ${bunArgs.join(' ')}`)
    
    const proc = spawn('bun', [command, ...bunArgs], {
      stdio: 'inherit',
      env: {
        ...process.env,
        BUN_HOT_RELOAD: 'true',
        NODE_ENV: 'development'
      }
    })

    proc.on('error', (err) => {
      console.error('❌ Failed to start:', err)
    })

    proc.on('exit', (code) => {
      if (code !== 0) {
        console.error(`❌ Process exited with code ${code}`)
      }
    })

    return proc
  }

  /**
   * Create a hot-reloadable server
   */
  static createServer(handler: (req: Request) => Response | Promise<Response>, port: number = 3000) {
    const server = Bun.serve({
      port,
      development: true, // Enable development mode for better errors
      
      // Main request handler
      fetch: async (req) => {
        try {
          return await handler(req)
        } catch (error) {
          console.error('Server error:', error)
          return new Response('Internal Server Error', { status: 500 })
        }
      },

      // WebSocket support for hot reload notifications
      websocket: {
        open(ws) {
          console.log('🔌 Hot reload client connected')
        },
        message(ws, message) {
          // Handle hot reload messages
          if (message === 'ping') {
            ws.send('pong')
          }
        },
        close(ws) {
          console.log('🔌 Hot reload client disconnected')
        }
      }
    })

    console.log(`
🔥 Bun Hot Swap Server
🚀 Running on http://localhost:${port}
📁 Development mode: enabled
🔄 Hot reload: active
    `)

    return server
  }

  /**
   * Stop watching
   */
  stop() {
    this.watchers.forEach(watcher => {
      if (watcher && typeof watcher.close === 'function') {
        watcher.close()
      }
    })
    this.watchers.clear()

    if (this.reloadTimeout) {
      clearTimeout(this.reloadTimeout)
    }

    if (this.currentProcess) {
      this.currentProcess.kill()
    }

    console.log('🛑 Hot swap stopped')
  }
}

// Export singleton for easy use
export const hotSwap = new BunHotSwap({
  watchDirs: ['./src', './layer'],
  extensions: ['.ts', '.tsx', '.js', '.jsx'],
  debounce: 500
})

export default BunHotSwap