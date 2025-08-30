#!/usr/bin/env bun

/**
 * Start script for Elysia App Server with hot reload
 */

import ElysiaAppServer from '../children/services/elysia-app-server'

const PORT = parseInt(process.env.PORT || '3000')

async function main() {
  const server = new ElysiaAppServer(PORT)
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n⏹️  Shutting down server...')
    server.stop()
    process.exit(0)
  })

  process.on('SIGTERM', () => {
    server.stop()
    process.exit(0)
  })

  // Start the server
  await server.start()
}

// Run with Bun's built-in hot reload in development
if (import.meta.hot) {
  import.meta.hot.accept()
  import.meta.hot.dispose(() => {
    console.log('🔄 Hot reload: disposing previous server')
  })
}

main().catch(console.error)