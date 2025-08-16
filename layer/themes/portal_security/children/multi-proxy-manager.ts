import { spawn, ChildProcess } from 'child_process';
import { PortManager } from '../children/PortManager';
import { logger } from '../children/utils/logger';

/**
 * Multi-Proxy Manager
 * 
 * Manages separate web-security proxy instances for each environment.
 * Each port range (31xx, 32xx, 33xx, 34xx) has its own proxy instance.
 */
export class MultiProxyManager {
  private proxies: Map<string, ChildProcess> = new Map();
  private portManager = PortManager.getInstance();

  // Environment-specific configurations
  private readonly PROXY_CONFIGS = {
    'dev-local': {
      env: 'dev-local',
      host: "localhost",  // Local dev only on localhost
      name: 'Local Development Proxy',
      color: '\x1b[36m'  // Cyan
    },
    'dev': {
      env: "development",
      host: '0.0.0.0',   // Dev server accessible remotely
      name: 'Development Server Proxy',
      color: '\x1b[32m'  // Green
    },
    'demo': {
      env: 'demo',
      host: '0.0.0.0',   // Demo accessible remotely
      name: 'Demo Server Proxy',
      color: '\x1b[33m'  // Yellow
    },
    'release': {
      env: 'release',
      host: '0.0.0.0',   // Production accessible remotely
      name: 'Production Proxy',
      color: '\x1b[31m'  // Red
    }
  };

  /**
   * Start a proxy for a specific environment
   */
  async startProxy(environment: 'dev-local' | 'dev' | 'demo' | 'release'): Promise<void> {
    const config = this.PROXY_CONFIGS[environment];
    const port = this.portManager.getPortForEnvironment('web-security', environment);

    logger.info(`Starting ${config.name} on port ${port}`);

    // Spawn proxy process with environment-specific settings
    const proxyProcess = spawn('ts-node', ['src/proxy-server.ts'], {
      env: {
        ...process.env,
        NODE_ENV: config.env,
        PROXY_HOST: config.host,
        PROXY_NAME: config.name,
        PROXY_COLOR: config.color
      },
      stdio: 'pipe'
    });

    // Handle output with color coding
    proxyProcess.stdout.on('data', (data) => {
      process.stdout.write(`${config.color}[${environment}]:\x1b[0m ${data}`);
    });

    proxyProcess.stderr.on('data', (data) => {
      process.stderr.write(`${config.color}[${environment} ERROR]:\x1b[0m ${data}`);
    });

    proxyProcess.on('close', (code) => {
      logger.info(`${config.name} exited with code ${code}`);
      this.proxies.delete(environment);
    });

    this.proxies.set(environment, proxyProcess);
  }

  /**
   * Stop a specific proxy
   */
  stopProxy(environment: string): void {
    const proxy = this.proxies.get(environment);
    if (proxy) {
      logger.info(`Stopping proxy for ${environment}`);
      proxy.kill('SIGTERM');
      this.proxies.delete(environment);
    }
  }

  /**
   * Start all proxies
   */
  async startAll(): Promise<void> {
    logger.info('Starting all web-security proxies...');
    
    for (const env of ['dev-local', 'dev', 'demo', 'release'] as const) {
      await this.startProxy(env);
      // Small delay between starts
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    logger.info(`
╔════════════════════════════════════════════════════════════╗
║               Web Security Multi-Proxy System              ║
╠════════════════════════════════════════════════════════════╣
║ Environment │ Port │ Binding    │ Access                   ║
╠═════════════╪══════╪════════════╪══════════════════════════╣
║ dev-local   │ 3100 │ localhost  │ Local only               ║
║ dev         │ 3200 │ 0.0.0.0    │ Remote accessible        ║
║ demo        │ 3300 │ 0.0.0.0    │ Remote accessible        ║
║ release     │ 3400 │ 0.0.0.0    │ Remote accessible        ║
╚═════════════╧══════╧════════════╧══════════════════════════╝

Each proxy manages its own port range:
- 31xx: Local development (GUI Selector on 3156)
- 32xx: Development server
- 33xx: Demo server
- 34xx: Production server
    `);
  }

  /**
   * Stop all proxies
   */
  stopAll(): void {
    logger.info('Stopping all proxies...');
    for (const [env, proxy] of this.proxies) {
      this.stopProxy(env);
    }
  }

  /**
   * Get status of all proxies
   */
  getStatus(): Array<{environment: string, running: boolean, port: number}> {
    const status = [];
    
    for (const env of ['dev-local', 'dev', 'demo', 'release'] as const) {
      status.push({
        environment: env,
        running: this.proxies.has(env),
        port: this.portManager.getPortForEnvironment('web-security', env)
      });
    }
    
    return status;
  }
}

// CLI usage
if (require.main === module) {
  const manager = new MultiProxyManager();
  
  // Handle shutdown gracefully
  process.on('SIGINT', () => {
    logger.info('\nShutting down all proxies...');
    manager.stopAll();
    process.exit(0);
  });

  // Start all proxies
  manager.startAll().catch(error => {
    logger.error('Failed to start proxies:', error);
    process.exit(1);
  });
}