#!/usr/bin/env bun

import ElysiaSecurityIntegratedServer from './children/services/elysia-security-integrated-v2'

async function main() {
  const server = new ElysiaSecurityIntegratedServer()
  
  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n⏹️  Shutting down server...')
    await server.stop()
    process.exit(0)
  })
  
  process.on('SIGTERM', async () => {
    await server.stop()
    process.exit(0)
  })
  
  // Start the server
  await server.start()
}

main().catch(console.error)