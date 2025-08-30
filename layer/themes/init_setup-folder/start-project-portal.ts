#!/usr/bin/env bun

/**
 * Start the Project-Aware Portal
 */

import ProjectAwarePortal from './children/services/project-aware-portal'

async function main() {
  const portal = new ProjectAwarePortal()
  
  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n⏹️  Shutting down...')
    process.exit(0)
  })
  
  process.on('SIGTERM', () => {
    process.exit(0)
  })
  
  // Start the portal with correct base path
  const basePath = process.cwd().includes('init_setup-folder') 
    ? process.cwd().replace('/layer/themes/init_setup-folder', '')
    : process.cwd()
  
  await portal.start(basePath)
}

main().catch(console.error)