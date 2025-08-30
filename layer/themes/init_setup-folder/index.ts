/**
 * Main entry point for Elysia unified server with hot swap
 */

import ElysiaAppServer from './children/services/elysia-app-server'
import { BunHotSwap } from './children/services/bun-hot-swap'

// Environment configuration
const PORT = parseInt(process.env.PORT || '3000')
const HOT_RELOAD = process.env.NODE_ENV === 'development'

async function main() {
  // Create server instance
  const server = new ElysiaAppServer(PORT)
  
  // Setup hot swap if in development
  if (HOT_RELOAD) {
    const hotSwap = new BunHotSwap({
      watchDirs: [
        './layer/themes/portal_aidev',
        './layer/themes/portal_gui-selector',
        './layer/themes/portal_security',
        './layer/themes/infra_monitoring',
        './layer/themes/infra_external-log-lib'
      ],
      extensions: ['.ts', '.tsx', '.js', '.jsx'],
      debounce: 500,
      onReload: async () => {
        // Re-register apps on hot reload
        await server.registerDefaultApps()
      }
    })
    
    hotSwap.start()
    
    // Cleanup on exit
    process.on('SIGINT', () => {
      hotSwap.stop()
      server.stop()
      process.exit(0)
    })
  }
  
  // Start the server
  await server.start()
}

// Enable Bun hot module replacement
if (import.meta.hot) {
  import.meta.hot.accept()
  import.meta.hot.dispose(() => {
    console.log('🔄 Hot module replacement triggered')
  })
}

// Run the server
main().catch(console.error)