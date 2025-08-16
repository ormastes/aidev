/**
 * Port Configuration Helper
 * Ensures NO HARDCODED PORTS in tests
 * Gets port from environment or fails
 */

export interface TestPortConfig {
  port: number;
  baseUrl: string;
  source: 'environment' | 'test-theme';
}

/**
 * Get port configuration for tests
 * NEVER returns hardcoded ports
 */
export function getPortConfig(): TestPortConfig {
  // Check for PORT environment variable (set by deployment)
  if (process.env.PORT) {
    const port = parseInt(process.env.PORT, 10);
    if (!isNaN(port)) {
      // Port from environment is OK - it's managed by deployment/security theme
      console.log(`✅ Using PORT from environment (managed by deployment): ${port}`);
      return {
        port,
        baseUrl: `http://localhost:${port}`,
        source: 'environment'
      };
    }
  }
  
  // Check for TEST_URL environment variable
  if (process.env.TEST_URL) {
    const match = process.env.TEST_URL.match(/:(\d+)/);
    if (match) {
      const port = parseInt(match[1], 10);
      return {
        port,
        baseUrl: process.env.TEST_URL,
        source: 'environment'
      };
    }
  }
  
  // FAIL - no hardcoded ports allowed
  throw new Error(`
    ❌ NO PORT CONFIGURATION AVAILABLE
    
    Tests MUST NOT use hardcoded ports.
    Port must be provided through:
    1. PORT environment variable (from deployment)
    2. TEST_URL environment variable
    3. test-as-manual theme (future integration)
    
    DO NOT hardcode ports like 3456, 3457, etc.
    All ports must be managed by portal_security theme.
    
    To run tests:
    PORT=<allocated-port> npm test
    or
    TEST_URL=http://localhost:<allocated-port> npm test
  `);
}

/**
 * Validate that no hardcoded ports are present
 */
export function validateNoHardcodedPorts(url: string): boolean {
  // Check for common hardcoded ports
  const hardcodedPorts = [
    '3256', '3000', '3001', '8080', '8000'
  ];
  
  // These specific ports should NEVER be hardcoded - they must come from security theme
  const securityManagedPorts = ['3456', '3457', '3156', '3157', '3256', '3257', '3356', '3357', '3556', '3557'];
  
  // Check all ports that should never be hardcoded
  const allForbiddenPorts = [...hardcodedPorts, ...securityManagedPorts];
  
  for (const port of allForbiddenPorts) {
    if (url.includes(`:${port}`)) {
      console.error(`❌ HARDCODED PORT DETECTED: ${port} in ${url}`);
      console.error('This violates portal_security theme requirements');
      console.error('All ports must be allocated through test-as-manual → portal_security theme chain');
      return false;
    }
  }
  
  return true;
}

/**
 * Get test base URL ensuring no hardcoded ports
 */
export function getTestBaseUrl(): string {
  const config = getPortConfig();
  
  // Skip validation if port comes from environment (managed by deployment)
  if (config.source === 'environment') {
    console.log(`✅ Test URL from ${config.source}: ${config.baseUrl}`);
    console.log('✅ Port managed by deployment/security theme via environment');
    return config.baseUrl;
  }
  
  // Validate no hardcoded ports for other sources
  if (!validateNoHardcodedPorts(config.baseUrl)) {
    throw new Error('Hardcoded port detected in test configuration');
  }
  
  console.log(`✅ Test URL from ${config.source}: ${config.baseUrl}`);
  console.log('✅ No hardcoded ports - managed by portal_security');
  
  return config.baseUrl;
}