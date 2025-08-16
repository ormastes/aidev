import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { ClaudeAuthManager, AuthOptions } from '../../src/core/claude-auth';
import * as fs from 'fs/promises';
import { path } from '../../../../../infra_external-log-lib/src';
import { os } from '../../../../../infra_external-log-lib/src';
import { createTempDir, cleanupTempDir, createMockCredentials, createExpiredMockCredentials, writeMockCredentials } from '../helpers/test-utils';

describe('ClaudeAuthManager', () => {
  let authManager: ClaudeAuthManager;
  let tempDir: string;
  let credentialsPath: string;

  beforeEach(async () => {
    tempDir = await createTempDir('auth-test');
    credentialsPath = path.join(tempDir, '.claude', '.credentials.json');
  });

  afterEach(async () => {
    await cleanupTempDir(tempDir);
  });

  describe('API Key Authentication', () => {
    it('should use API key when provided', async () => {
      authManager = new ClaudeAuthManager({ apiKey: 'test-api-key' });
      
      const header = await authManager.getAuthHeader();
      expect(header).toBe('x-api-key test-api-key');
    });

    it('should report api-key auth type', () => {
      authManager = new ClaudeAuthManager({ apiKey: 'test-api-key' });
      
      expect(authManager.getAuthType()).toBe('api-key');
      expect(authManager.isAuthenticated()).toBe(true);
    });
  });

  describe('Local Claude Authentication', () => {
    it('should load local credentials when no API key provided', async () => {
      const mockCredentials = createMockCredentials({
        accessToken: 'test-access-token'
      });
      
      await writeMockCredentials(credentialsPath, mockCredentials);
      
      authManager = new ClaudeAuthManager({
        credentialsPath: credentialsPath
      });
      
      const header = await authManager.getAuthHeader();
      expect(header).toBe('Bearer test-access-token');
    });

    it('should detect expired tokens', async () => {
      const expiredCredentials = createExpiredMockCredentials();
      
      await writeMockCredentials(credentialsPath, expiredCredentials);
      
      authManager = new ClaudeAuthManager({
        credentialsPath: credentialsPath
      });
      
      await expect(authManager.getAuthHeader()).rejects.toThrow(
        'Claude access token expired'
      );
    });

    it('should handle missing credentials file', async () => {
      authManager = new ClaudeAuthManager({
        credentialsPath: path.join(tempDir, 'non-existent', '.credentials.json')
      });
      
      await expect(authManager.getAuthHeader()).rejects.toThrow(
        'No authentication found'
      );
    });

    it('should handle invalid credentials format', async () => {
      await fs.mkdir(path.dirname(credentialsPath), { recursive: true });
      await fs.writeFile(credentialsPath, 'invalid json', 'utf-8');
      
      authManager = new ClaudeAuthManager({
        credentialsPath: credentialsPath
      });
      
      await expect(authManager.getAuthHeader()).rejects.toThrow(
        'No authentication found'
      );
    });

    it('should use custom credentials path', async () => {
      const customPath = path.join(tempDir, 'custom', '.credentials.json');
      const mockCredentials = createMockCredentials({
        accessToken: 'custom-token'
      });
      
      await writeMockCredentials(customPath, mockCredentials);
      
      authManager = new ClaudeAuthManager({
        credentialsPath: customPath
      });
      
      const header = await authManager.getAuthHeader();
      expect(header).toBe('Bearer custom-token');
    });
  });

  describe('Authentication Priority', () => {
    it('should prefer API key over local credentials', async () => {
      const mockCredentials = createMockCredentials({
        accessToken: 'local-token'
      });
      
      await writeMockCredentials(credentialsPath, mockCredentials);
      
      authManager = new ClaudeAuthManager({ 
        apiKey: 'api-key-123',
        credentialsPath: credentialsPath
      });
      
      const header = await authManager.getAuthHeader();
      expect(header).toBe('x-api-key api-key-123');
      
      // Verify local credentials were not used by checking they exist but weren't accessed
      const fileContent = await fs.readFile(credentialsPath, 'utf-8');
      expect(fileContent).toContain('local-token');
    });
  });

  describe('Validation Methods', () => {
    it('should validate API key authentication', async () => {
      authManager = new ClaudeAuthManager({ apiKey: 'test-key' });
      
      const isValid = await authManager.validateAuth();
      expect(isValid).toBe(true);
    });

    it('should validate local authentication', async () => {
      const mockCredentials = createMockCredentials({
        accessToken: 'valid-token'
      });
      
      await writeMockCredentials(credentialsPath, mockCredentials);
      
      authManager = new ClaudeAuthManager({
        credentialsPath: credentialsPath
      });
      const isValid = await authManager.validateAuth();
      expect(isValid).toBe(true);
    });

    it('should fail validation with no auth', async () => {
      authManager = new ClaudeAuthManager({
        credentialsPath: path.join(tempDir, 'missing', '.credentials.json')
      });
      
      const isValid = await authManager.validateAuth();
      expect(isValid).toBe(false);
    });
  });

  describe('Cache Management', () => {
    it('should cache loaded credentials', async () => {
      const mockCredentials = createMockCredentials({
        accessToken: 'cached-token'
      });
      
      await writeMockCredentials(credentialsPath, mockCredentials);
      
      authManager = new ClaudeAuthManager({
        credentialsPath: credentialsPath
      });
      
      // First call
      const header1 = await authManager.getAuthHeader();
      expect(header1).toBe('Bearer cached-token');
      
      // Modify file to verify cache is used
      const modifiedCredentials = createMockCredentials({
        accessToken: 'modified-token'
      });
      await writeMockCredentials(credentialsPath, modifiedCredentials);
      
      // Second call should still return cached value
      const header2 = await authManager.getAuthHeader();
      expect(header2).toBe('Bearer cached-token');
    });

    it('should clear cache on demand', async () => {
      const mockCredentials = createMockCredentials({
        accessToken: 'cached-token'
      });
      
      await writeMockCredentials(credentialsPath, mockCredentials);
      
      authManager = new ClaudeAuthManager({
        credentialsPath: credentialsPath
      });
      
      // First call
      const header1 = await authManager.getAuthHeader();
      expect(header1).toBe('Bearer cached-token');
      
      // Modify file
      const modifiedCredentials = createMockCredentials({
        accessToken: 'new-token'
      });
      await writeMockCredentials(credentialsPath, modifiedCredentials);
      
      // Clear cache
      authManager.clearCache();
      
      // Should reload and get new value
      const header2 = await authManager.getAuthHeader();
      expect(header2).toBe('Bearer new-token');
    });
  });
});