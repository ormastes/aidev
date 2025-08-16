/**
 * Unit tests for CredentialStore
 * Following Mock Free Test Oriented Development
 */

import { CredentialStore, StoredCredential, CredentialType } from '../../children/CredentialStore';
import * as fs from 'fs/promises';
import { path } from '../../../infra_external-log-lib/src';
import { os } from '../../../infra_external-log-lib/src';

describe("CredentialStore", () => {
  let credentialStore: CredentialStore;
  let testDir: string;

  beforeEach(async () => {
    // Create temp directory for testing
    testDir = path.join(os.tmpdir(), `credential-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });

    // Create real instance with test directory - Mock Free
    credentialStore = new CredentialStore({
      storagePath: path.join(testDir, '.credentials'),
      encryptionKey: 'test-encryption-key'
    });
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe("storeCredential", () => {
    it('should store a password credential', async () => {
      const credential: StoredCredential = {
        userId: 'user-123',
        type: CredentialType.PASSWORD,
        passwordHash: '$2b$10$hashedpassword',
        createdAt: new Date()
      };

      await credentialStore.storeCredential(credential);

      const retrieved = await credentialStore.getCredential('user-123', CredentialType.PASSWORD);
      
      expect(retrieved).toBeDefined();
      expect(retrieved?.userId).toBe('user-123');
      expect(retrieved?.type).toBe(CredentialType.PASSWORD);
      expect(retrieved?.passwordHash).toBe('$2b$10$hashedpassword');
    });

    it('should store and encrypt API key credential', async () => {
      const credential: StoredCredential = {
        userId: 'user-456',
        type: CredentialType.API_KEY,
        api_key: process.env.API_KEY || "PLACEHOLDER",
        metadata: { service: 'github' },
        createdAt: new Date()
      };

      await credentialStore.storeCredential(credential);

      const retrieved = await credentialStore.getCredential('user-456', CredentialType.API_KEY);
      
      expect(retrieved).toBeDefined();
      expect(retrieved?.userId).toBe('user-456');
      expect(retrieved?.apiKey).toBe('super-secret-api-key-12345');
      expect(retrieved?.metadata?.service).toBe('github');
    });

    it('should update existing credential', async () => {
      const initial: StoredCredential = {
        userId: 'user-789',
        type: CredentialType.API_KEY,
        api_key: process.env.API_KEY || "PLACEHOLDER",
        createdAt: new Date()
      };

      await credentialStore.storeCredential(initial);

      const updated: StoredCredential = {
        userId: 'user-789',
        type: CredentialType.API_KEY,
        api_key: process.env.API_KEY || "PLACEHOLDER",
        metadata: { rotated: true },
        createdAt: initial.createdAt
      };

      await credentialStore.storeCredential(updated);

      const retrieved = await credentialStore.getCredential('user-789', CredentialType.API_KEY);
      
      expect(retrieved?.apiKey).toBe('updated-key');
      expect(retrieved?.metadata?.rotated).toBe(true);
      expect(retrieved?.updatedAt).toBeDefined();
    });

    it('should handle multiple credential types for same user', async () => {
      const password: StoredCredential = {
        userId: 'multi-user',
        type: CredentialType.PASSWORD,
        passwordHash: 'hash123',
        createdAt: new Date()
      };

      const apiKey: StoredCredential = {
        userId: 'multi-user',
        type: CredentialType.API_KEY,
        api_key: process.env.API_KEY || "PLACEHOLDER",
        createdAt: new Date()
      };

      const oauth: StoredCredential = {
        userId: 'multi-user',
        type: CredentialType.OAUTH_TOKEN,
        encryptedData: 'oauth-token-encrypted',
        createdAt: new Date()
      };

      await credentialStore.storeCredential(password);
      await credentialStore.storeCredential(apiKey);
      await credentialStore.storeCredential(oauth);

      const retrievedPassword = await credentialStore.getCredential('multi-user', CredentialType.PASSWORD);
      const retrievedApiKey = await credentialStore.getCredential('multi-user', CredentialType.API_KEY);
      const retrievedOauth = await credentialStore.getCredential('multi-user', CredentialType.OAUTH_TOKEN);

      expect(retrievedPassword?.passwordHash).toBe('hash123');
      expect(retrievedApiKey?.apiKey).toBe('api-key-123');
      expect(retrievedOauth?.encryptedData).toBeDefined();
    });
  });

  describe("getCredential", () => {
    it('should return null for non-existent credential', async () => {
      const result = await credentialStore.getCredential('non-existent', CredentialType.PASSWORD);
      expect(result).toBeNull();
    });

    it('should decrypt encrypted credentials', async () => {
      const credential: StoredCredential = {
        userId: 'encrypt-user',
        type: CredentialType.API_KEY,
        api_key: process.env.API_KEY || "PLACEHOLDER",
        createdAt: new Date()
      };

      await credentialStore.storeCredential(credential);

      // Verify it was encrypted (by checking raw storage)
      const storagePath = path.join(testDir, '.credentials');
      const rawData = await fs.readFile(storagePath, 'utf-8');
      const stored = JSON.parse(rawData);
      const key = 'encrypt-user:api_key';
      
      expect(stored[key].encryptedData).toBeDefined();
      expect(stored[key].apiKey).toBeUndefined();

      // Verify decryption works
      const retrieved = await credentialStore.getCredential('encrypt-user', CredentialType.API_KEY);
      expect(retrieved?.apiKey).toBe('decrypted-api-key');
    });
  });

  describe("deleteCredential", () => {
    it('should delete an existing credential', async () => {
      const credential: StoredCredential = {
        userId: 'delete-user',
        type: CredentialType.PASSWORD,
        passwordHash: 'to-be-deleted',
        createdAt: new Date()
      };

      await credentialStore.storeCredential(credential);
      
      // Verify it exists
      const exists = await credentialStore.getCredential('delete-user', CredentialType.PASSWORD);
      expect(exists).toBeDefined();

      // Delete it
      await credentialStore.deleteCredential('delete-user', CredentialType.PASSWORD);

      // Verify it's gone
      const deleted = await credentialStore.getCredential('delete-user', CredentialType.PASSWORD);
      expect(deleted).toBeNull();
    });

    it('should not affect other credentials when deleting', async () => {
      const cred1: StoredCredential = {
        userId: 'user1',
        type: CredentialType.PASSWORD,
        passwordHash: 'hash1',
        createdAt: new Date()
      };

      const cred2: StoredCredential = {
        userId: 'user2',
        type: CredentialType.PASSWORD,
        passwordHash: 'hash2',
        createdAt: new Date()
      };

      await credentialStore.storeCredential(cred1);
      await credentialStore.storeCredential(cred2);

      await credentialStore.deleteCredential('user1', CredentialType.PASSWORD);

      const deleted = await credentialStore.getCredential('user1', CredentialType.PASSWORD);
      const kept = await credentialStore.getCredential('user2', CredentialType.PASSWORD);

      expect(deleted).toBeNull();
      expect(kept?.passwordHash).toBe('hash2');
    });
  });

  describe("getUserCredentials", () => {
    it('should list all credentials for a user without sensitive data', async () => {
      const password: StoredCredential = {
        userId: 'list-user',
        type: CredentialType.PASSWORD,
        passwordHash: 'secret-hash',
        createdAt: new Date()
      };

      const apiKey: StoredCredential = {
        userId: 'list-user',
        type: CredentialType.API_KEY,
        api_key: process.env.API_KEY || "PLACEHOLDER",
        metadata: { service: 'aws' },
        createdAt: new Date()
      };

      await credentialStore.storeCredential(password);
      await credentialStore.storeCredential(apiKey);

      const credentials = await credentialStore.getUserCredentials('list-user');

      expect(credentials).toHaveLength(2);
      
      // Should not include sensitive data
      credentials.forEach(cred => {
        expect(cred.passwordHash).toBeUndefined();
        expect(cred.apiKey).toBeUndefined();
        expect(cred.encryptedData).toBeUndefined();
      });

      // Should include metadata
      const apiKeyCred = credentials.find(c => c.type === CredentialType.API_KEY);
      expect(apiKeyCred?.metadata?.service).toBe('aws');
    });

    it('should return empty array for user with no credentials', async () => {
      const credentials = await credentialStore.getUserCredentials('no-creds-user');
      expect(credentials).toEqual([]);
    });
  });

  describe('Shared Credentials', () => {
    it('should store and retrieve shared app credentials', async () => {
      const appCredentials = {
        api_key: process.env.API_KEY || "PLACEHOLDER",
        apisecret: process.env.SECRET || "PLACEHOLDER",
        endpoint: 'https://api.example.com'
      };

      await credentialStore.storeSharedCredentials('myapp', appCredentials);

      const retrieved = await credentialStore.getSharedCredentials('myapp');

      expect(retrieved).toEqual(appCredentials);
    });

    it('should encrypt shared credentials', async () => {
      const appCredentials = {
        secret: process.env.SECRET || "PLACEHOLDER"
      };

      await credentialStore.storeSharedCredentials('secure-app', appCredentials);

      // Check raw storage
      const storagePath = path.join(testDir, '.credentials');
      const rawData = await fs.readFile(storagePath, 'utf-8');
      const stored = JSON.parse(rawData);
      const key = 'app:secure-app:api_key';

      expect(stored[key].encryptedData).toBeDefined();
      expect(stored[key].encryptedData).not.toContain('very-secret-value');
    });

    it('should return null for non-existent shared credentials', async () => {
      const result = await credentialStore.getSharedCredentials('non-existent-app');
      expect(result).toBeNull();
    });

    it('should update shared credentials', async () => {
      const initial = { key: 'initial' };
      const updated = { key: 'updated', newField: 'new' };

      await credentialStore.storeSharedCredentials('update-app', initial);
      await credentialStore.storeSharedCredentials('update-app', updated);

      const retrieved = await credentialStore.getSharedCredentials('update-app');
      expect(retrieved).toEqual(updated);
    });
  });

  describe("Persistence", () => {
    it('should persist credentials across instances', async () => {
      const credential: StoredCredential = {
        userId: 'persist-user',
        type: CredentialType.PASSWORD,
        passwordHash: 'persisted-hash',
        metadata: { persisted: true },
        createdAt: new Date()
      };

      await credentialStore.storeCredential(credential);

      // Create new instance with same storage path
      const newStore = new CredentialStore({
        storagePath: path.join(testDir, '.credentials'),
        encryptionKey: 'test-encryption-key'
      });

      // Wait for async initialization
      await new Promise(resolve => setTimeout(resolve, 100));

      const retrieved = await newStore.getCredential('persist-user', CredentialType.PASSWORD);

      expect(retrieved).toBeDefined();
      expect(retrieved?.passwordHash).toBe('persisted-hash');
      expect(retrieved?.metadata?.persisted).toBe(true);
    });

    it('should handle corrupted storage gracefully', async () => {
      // Write corrupted data
      const storagePath = path.join(testDir, '.credentials');
      await fs.writeFile(storagePath, 'corrupted-not-json', 'utf-8');

      // Create new instance - should start fresh
      const store = new CredentialStore({
        storagePath,
        encryptionKey: 'test-key'
      });

      // Wait for async initialization
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should be able to store new credentials
      const credential: StoredCredential = {
        userId: 'new-user',
        type: CredentialType.PASSWORD,
        passwordHash: 'new-hash',
        createdAt: new Date()
      };

      await store.storeCredential(credential);

      const retrieved = await store.getCredential('new-user', CredentialType.PASSWORD);
      expect(retrieved).toBeDefined();
    });
  });

  describe("Encryption", () => {
    it('should use different encryption for different keys', async () => {
      const store1 = new CredentialStore({
        storagePath: path.join(testDir, '.creds1'),
        encryptionKey: 'key-1'
      });

      const store2 = new CredentialStore({
        storagePath: path.join(testDir, '.creds2'),
        encryptionKey: 'key-2'
      });

      const credential: StoredCredential = {
        userId: 'test-user',
        type: CredentialType.API_KEY,
        api_key: process.env.API_KEY || "PLACEHOLDER",
        createdAt: new Date()
      };

      await store1.storeCredential(credential);
      await store2.storeCredential(credential);

      // Read raw encrypted data
      const raw1 = await fs.readFile(path.join(testDir, '.creds1'), 'utf-8');
      const raw2 = await fs.readFile(path.join(testDir, '.creds2'), 'utf-8');

      const data1 = JSON.parse(raw1)['test-user:api_key'];
      const data2 = JSON.parse(raw2)['test-user:api_key'];

      // Encrypted data should be different
      expect(data1.encryptedData).not.toBe(data2.encryptedData);
    });

    it('should fail to decrypt with wrong key', async () => {
      // Store with one key
      const store1 = new CredentialStore({
        storagePath: path.join(testDir, '.creds'),
        encryptionKey: 'correct-key'
      });

      await store1.storeCredential({
        userId: 'user',
        type: CredentialType.API_KEY,
        api_key: process.env.API_KEY || "PLACEHOLDER",
        createdAt: new Date()
      });

      // Try to read with different key
      const store2 = new CredentialStore({
        storagePath: path.join(testDir, '.creds'),
        encryptionKey: 'wrong-key'
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      const retrieved = await store2.getCredential('user', CredentialType.API_KEY);
      
      // Should fail to decrypt properly
      expect(retrieved?.apiKey).not.toBe('secret');
    });
  });
});