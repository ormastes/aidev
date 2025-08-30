import { SandboxManager, SandboxConfig } from './sandbox-manager';
import { test as baseTest } from '@playwright/test';

export interface TestSandboxOptions {
  useSandbox?: boolean;
  sandboxType?: 'docker' | 'qemu' | 'podman';
  dangerLevel?: 'low' | 'medium' | 'high' | 'critical';
}

export const DANGER_PATTERNS = {
  critical: [
    /rm\s+-rf\s+\//,
    /sudo\s+rm/,
    /chmod\s+777\s+\//,
    /dd\s+if=.*of=\/dev/
  ],
  high: [
    /kill\s+-9/,
    /pkill/,
    /exec\(/,
    /system\(/,
    /eval\(/
  ],
  medium: [
    /spawn\(/,
    /fork\(/,
    /process\.exit/,
    /fs\.unlink/
  ],
  low: [
    /fs\.writeFile/,
    /fs\.mkdir/,
    /process\.env/
  ]
};

export class TestWrapper {
  private config: SandboxConfig;
  
  constructor(options: TestSandboxOptions = {}) {
    const sandboxType = options.sandboxType || this.detectSandboxType(options.dangerLevel);
    
    this.config = {
      type: sandboxType,
      limits: this.getLimitsForDangerLevel(options.dangerLevel || 'medium'),
      network: options.dangerLevel === 'critical' ? 'none' : 'bridge'
    };
  }

  private detectSandboxType(dangerLevel?: string): 'docker' | 'qemu' | 'podman' {
    if (dangerLevel === 'critical') {
      return 'qemu'; // Full isolation for critical tests
    }
    if (process.platform === 'linux' && process.getuid && process.getuid() !== 0) {
      return 'podman'; // Rootless containers preferred
    }
    return 'docker';
  }

  private getLimitsForDangerLevel(level: string) {
    switch (level) {
      case 'critical':
        return { memory: '256m', cpus: '0.5', timeout: 60000 };
      case 'high':
        return { memory: '512m', cpus: '1', timeout: 120000 };
      case 'medium':
        return { memory: '1g', cpus: '2', timeout: 180000 };
      case 'low':
      default:
        return { memory: '2g', cpus: '4', timeout: 300000 };
    }
  }

  async runTest(testFn: () => Promise<void>, options?: TestSandboxOptions): Promise<void> {
    if (!options?.useSandbox) {
      return testFn();
    }

    const sandbox = new SandboxManager(this.config);
    
    try {
      const result = await sandbox.run(testFn);
      
      if (result.exitCode !== 0) {
        throw new Error(`Test failed in sandbox: ${result.stderr}`);
      }
      
      if (result.killed) {
        throw new Error(`Test exceeded timeout (${this.config.limits?.timeout}ms)`);
      }
    } finally {
      await sandbox.cleanup();
    }
  }

  detectDangerLevel(code: string): 'low' | 'medium' | 'high' | 'critical' {
    for (const [level, patterns] of Object.entries(DANGER_PATTERNS)) {
      for (const pattern of patterns) {
        if (pattern.test(code)) {
          return level as any;
        }
      }
    }
    return 'low';
  }
}

// Playwright test extension with sandbox support
export const test = baseTest.extend<{
  sandbox: TestWrapper;
}>({
  sandbox: async ({}, use) => {
    const wrapper = new TestWrapper();
    await use(wrapper);
  }
});

// Helper decorator for automatic sandboxing
export function sandboxed(options: TestSandboxOptions = { useSandbox: true }) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const wrapper = new TestWrapper(options);
      return wrapper.runTest(() => originalMethod.apply(this, args), options);
    };
    
    return descriptor;
  };
}