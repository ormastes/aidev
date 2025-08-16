/**
 * Test Port Manager Helper  
 * NO HARDCODED PORTS - all managed through environment/deployment
 * Future: Will integrate with infra_test-as-manual theme
 */

import { getTestBaseUrl } from './port-config';

export interface TestConfig {
  port: number;
  baseUrl: string;
  appId: string;
}

/**
 * Get test configuration ensuring NO hardcoded ports
 * Currently uses environment variables
 * Future: Will use test-as-manual → portal_security theme chain
 */
export async function getTestConfig(options: {
  suiteName: string;
  testType?: 'unit' | "integration" | 'e2e';
  deployType?: 'local' | 'dev' | 'demo' | 'release' | "production";
}): Promise<TestConfig> {
  const { suiteName } = options;
  
  try {
    // Get base URL with validation for no hardcoded ports
    const baseUrl = getTestBaseUrl();
    
    // Extract port from URL
    const match = baseUrl.match(/:(\d+)/);
    const port = match ? parseInt(match[1], 10) : 80;
    
    return {
      port,
      baseUrl,
      appId: `test-${suiteName}`
    };
  } catch (error) {
    console.error('❌ Failed to get test configuration:', error);
    throw new Error(`
      Test configuration failed. 
      Ensure PORT or TEST_URL environment variable is set.
      DO NOT use hardcoded ports.
    `);
  }
}

/**
 * Release test port back to the pool
 * Currently a no-op, will be implemented with test-as-manual theme
 */
export async function releaseTestPort(appId: string): Promise<void> {
  console.log(`📋 Port release for ${appId} (will be managed by test-as-manual theme)`);
}

/**
 * Get test URL from environment
 * NEVER returns hardcoded ports
 */
export async function getTestUrl(suiteName: string): Promise<string> {
  return getTestBaseUrl();
}