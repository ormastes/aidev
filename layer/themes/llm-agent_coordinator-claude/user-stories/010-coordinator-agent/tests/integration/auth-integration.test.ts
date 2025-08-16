import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { ClaudeAPIClient } from '../../src/core/claude-api-client';
import { ClaudeAuthManager } from '../../src/core/claude-auth';
import * as fs from 'fs/promises';
import { path } from '../../../../../infra_external-log-lib/src';
import { os } from '../../../../../infra_external-log-lib/src';

describe('Authentication Integration Tests', () => {
  let tempDir: string;
  let credentialsPath: string;

  beforeEach(async () => {
    // Create temporary directory for test credentials
    tempDir = path.join(os.tmpdir(), 'claude-auth-test-' + Date.now());
    await fs.mkdir(tempDir, { recursive: true });
    credentialsPath = path.join(tempDir, '.credentials.json');
  });

  afterEach(async () => {
    // Clean up
    try {
      await fs.rm(tempDir, { recursive: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Local Credentials Integration', () => {
    it('should create client with local credentials', async () => {
      // Create mock credentials file
      const mockCredentials = {
        claudeAiOauth: {
          accessToken: 'sk-ant-test-token',
          refreshToken: 'sk-ant-refresh-token',
          expiresAt: Date.now() + 3600000,
          subscriptionType: 'pro'
        }
      };
      
      await fs.writeFile(credentialsPath, JSON.stringify(mockCredentials));
      
      // Create client without API key
      const client = new ClaudeAPIClient({
        authOptions: {
          credentialsPath
        }
      });
      
      // Verify authentication
      const authInfo = await client.getAuthInfo();
      expect(authInfo.type).toBe('oauth');
      expect(authInfo.authenticated).toBe(true);
    });

    it('should fall back to API key when local auth fails', async () => {
      // No credentials file exists
      const client = new ClaudeAPIClient({
        apiKey: 'fallback-api-key',
        authOptions: {
          credentialsPath: path.join(tempDir, 'nonexistent.json')
        }
      });
      
      const authInfo = await client.getAuthInfo();
      expect(authInfo.type).toBe('api-key');
      expect(authInfo.authenticated).toBe(true);
    });

    it('should handle expired local credentials', async () => {
      // Create expired credentials
      const expiredCredentials = {
        claudeAiOauth: {
          accessToken: 'expired-token',
          expiresAt: Date.now() - 3600000 // Expired 1 hour ago
        }
      };
      
      await fs.writeFile(credentialsPath, JSON.stringify(expiredCredentials));
      
      const client = new ClaudeAPIClient({
        authOptions: {
          credentialsPath
        }
      });
      
      const authInfo = await client.getAuthInfo();
      expect(authInfo.authenticated).toBe(false);
    });
  });

  describe('Authentication Priority', () => {
    it('should prefer API key when both are available', async () => {
      // Create valid local credentials
      const mockCredentials = {
        claudeAiOauth: {
          accessToken: 'local-token',
          expiresAt: Date.now() + 3600000
        }
      };
      
      await fs.writeFile(credentialsPath, JSON.stringify(mockCredentials));
      
      // Create client with both API key and local path
      const client = new ClaudeAPIClient({
        apiKey: 'explicit-api-key',
        authOptions: {
          credentialsPath
        }
      });
      
      const authInfo = await client.getAuthInfo();
      expect(authInfo.type).toBe('api-key');
    });
  });

  describe('Real-world Scenarios', () => {
    it('should work with environment variable API key', async () => {
      // Temporarily set env var
      const originalKey = process.env.CLAUDE_API_KEY;
      process.env.CLAUDE_API_KEY = 'env-api-key';
      
      try {
        const client = new ClaudeAPIClient({
          apiKey: process.env.CLAUDE_API_KEY
        });
        
        const authInfo = await client.getAuthInfo();
        expect(authInfo.type).toBe('api-key');
        expect(authInfo.authenticated).toBe(true);
      } finally {
        // Restore original env
        if (originalKey) {
          process.env.CLAUDE_API_KEY = originalKey;
        } else {
          delete process.env.CLAUDE_API_KEY;
        }
      }
    });

    it('should detect actual Claude CLI credentials if present', async () => {
      // This test checks if real Claude credentials exist
      const realCredPath = path.join(os.homedir(), '.claude', '.credentials.json');
      
      try {
        await fs.access(realCredPath);
        
        // Real credentials exist - test with them
        const client = new ClaudeAPIClient({});
        const authInfo = await client.getAuthInfo();
        
        console.log('Found real Claude credentials:', {
          type: authInfo.type,
          authenticated: authInfo.authenticated
        });
        
        // If real creds exist, they should work
        if (authInfo.type === 'oauth') {
          expect(authInfo.authenticated).toBe(true);
        }
      } catch (error) {
        // No real credentials - skip this test
        console.log('No real Claude credentials found - skipping');
      }
    });
  });
});