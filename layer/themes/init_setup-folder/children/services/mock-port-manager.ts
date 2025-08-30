/**
 * Mock Port Manager for testing without full security module
 */

export type DeployType = 'local' | 'dev' | 'demo' | 'release' | 'production'

export class MockPortManager {
  private static instance: MockPortManager
  private portRanges = {
    local: { prefix: 31, start: 3100, end: 3199 },
    dev: { prefix: 32, start: 3200, end: 3299 },
    demo: { prefix: 33, start: 3300, end: 3399 },
    release: { prefix: 34, start: 3400, end: 3499 },
    production: { prefix: 35, start: 3500, end: 3599 }
  }
  
  private predefinedApps = new Map([
    ['portal', { name: 'AI Dev Portal', id: 56 }],
    ['gui-selector', { name: 'GUI Selector', id: 57 }],
    ['chat-space', { name: 'Chat Space', id: 10 }],
    ['pocketflow', { name: 'PocketFlow', id: 20 }]
  ])

  static getInstance(): MockPortManager {
    if (!MockPortManager.instance) {
      MockPortManager.instance = new MockPortManager()
    }
    return MockPortManager.instance
  }

  async registerApp(options: {
    appId: string
    deployType: DeployType
    ipAddress?: string
  }): Promise<{ success: boolean; port?: number; message?: string }> {
    const { appId, deployType } = options
    const predefined = this.predefinedApps.get(appId)
    
    if (predefined) {
      const range = this.portRanges[deployType]
      const port = range.start + predefined.id
      
      return {
        success: true,
        port,
        message: `Assigned port ${port} for ${appId} in ${deployType}`
      }
    }
    
    // Dynamic app - assign random port
    const range = this.portRanges[deployType]
    const port = range.start + Math.floor(Math.random() * 50)
    
    return {
      success: true,
      port,
      message: `Assigned dynamic port ${port}`
    }
  }

  async releasePort(port: number): Promise<void> {
    console.log(`Released port ${port}`)
  }
}