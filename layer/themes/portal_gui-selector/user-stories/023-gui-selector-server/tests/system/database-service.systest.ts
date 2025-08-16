/**
 * Database Service System Tests
 * Tests database operations and service integration
 */

import { fs } from '../../../../../infra_external-log-lib/src';
import { path } from '../../../../../infra_external-log-lib/src';
import { DatabaseService } from '../../src/services/DatabaseService';

describe('Database Service System Tests', () => {
  let databaseService: DatabaseService;

  beforeAll(async () => {
    // Initialize database service
    databaseService = new DatabaseService();
    await databaseService.initialize();
  });

  afterAll(async () => {
    // Clean up
    if (databaseService) {
      await databaseService.close();
    }
    
    // Clean up test database files
    const dataDir = path.join(process.cwd(), 'data');
    if (fs.existsSync(dataDir)) {
      const dbFile = path.join(dataDir, 'gui-selector.db');
      if (fs.existsSync(dbFile)) {
        try {
          fs.unlinkSync(dbFile);
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    }
  });

  describe('🚨 Story: User Management', () => {
    test('should create and retrieve users', async () => {
      // Given: The system is in a valid state
      // When: create and retrieve users
      // Then: The expected behavior occurs
      // Create a user
      const userResult = await databaseService.createUser(
        'testuser',
        'test@example.com',
        'hashedpassword123',
        'admin'
      );

      expect(userResult.lastID).toBeGreaterThan(0);
      const userId = userResult.lastID!;

      // Retrieve user by username
      const user = await databaseService.getUserByUsername('testuser');
      expect(user).toBeDefined();
      expect(user.username).toBe('testuser');
      expect(user.email).toBe('test@example.com');
      expect(user.role).toBe('admin');
      expect(user.id).toBe(userId);

      // Retrieve user by ID
      const userById = await databaseService.getUserById(userId);
      expect(userById).toBeDefined();
      expect(userById.username).toBe('testuser');
      expect(userById.email).toBe('test@example.com');
    });

    test('should handle duplicate username constraint', async () => {
      // Given: The system is in a valid state
      // When: handle duplicate username constraint
      // Then: The expected behavior occurs
      // Try to create user with duplicate username
      await expect(
        databaseService.createUser('testuser', 'another@example.com', 'password')
      ).rejects.toThrow();
    });
  });

  describe('App Management', () => {
    test('should create and manage apps', async () => {
      // Given: The system is in a valid state
      // When: create and manage apps
      // Then: The expected behavior occurs
      // First create a user to own the app
      const userResult = await databaseService.createUser(
        'appowner',
        'owner@example.com',
        'password123'
      );
      const ownerId = userResult.lastID!;

      // Create an app
      const appResult = await databaseService.createApp(
        'Test App',
        'A test application',
        ownerId,
        '/path/to/app',
        3000
      );

      expect(appResult.lastID).toBeGreaterThan(0);
      const appId = appResult.lastID!;

      // Get apps by owner
      const ownerApps = await databaseService.getAppsByOwner(ownerId);
      expect(ownerApps).toHaveLength(1);
      expect(ownerApps[0].name).toBe('Test App');
      expect(ownerApps[0].description).toBe('A test application');
      expect(ownerApps[0].port).toBe(3000);
      expect(ownerApps[0].path).toBe('/path/to/app');

      // Get app by ID
      const app = await databaseService.getAppById(appId);
      expect(app).toBeDefined();
      expect(app.name).toBe('Test App');
      expect(app.owner_id).toBe(ownerId);

      // Get all apps (includes owner name via join)
      const allApps = await databaseService.getAllApps();
      expect(allApps.length).toBeGreaterThanOrEqual(1);
      const testApp = allApps.find(a => a.name === 'Test App');
      expect(testApp).toBeDefined();
      expect(testApp!.owner_name).toBe('appowner');
    });
  });

  describe('Selection Management', () => {
    test('should create and manage selections', async () => {
      // Given: The system is in a valid state
      // When: create and manage selections
      // Then: The expected behavior occurs
      // Create user and app first
      const userResult = await databaseService.createUser(
        'selector',
        'selector@example.com',
        'password123'
      );
      const userId = userResult.lastID!;

      const appResult = await databaseService.createApp(
        'Selection App',
        'App for selections',
        userId
      );
      const appId = appResult.lastID!;

      // Create a selection
      const selectionResult = await databaseService.createSelection(
        userId,
        appId,
        'modern-01',
        'My Modern Project',
        'Great design choice',
        { theme: 'dark', layout: 'grid' }
      );

      expect(selectionResult.lastID).toBeGreaterThan(0);
      const selectionId = selectionResult.lastID!;

      // Get selections by user
      const userSelections = await databaseService.getSelectionsByUser(userId);
      expect(userSelections).toHaveLength(1);
      expect(userSelections[0].template_id).toBe('modern-01');
      expect(userSelections[0].project_name).toBe('My Modern Project');
      expect(userSelections[0].comments).toBe('Great design choice');
      expect(userSelections[0].app_name).toBe('Selection App');

      // Parse and verify metadata
      const metadata = JSON.parse(userSelections[0].metadata);
      expect(metadata.theme).toBe('dark');
      expect(metadata.layout).toBe('grid');

      // Get selections by app
      const appSelections = await databaseService.getSelectionsByApp(appId);
      expect(appSelections).toHaveLength(1);
      expect(appSelections[0].template_id).toBe('modern-01');
      expect(appSelections[0].user_id).toBe(userId);
    });
  });

  describe('Requirement Management', () => {
    test('should create and manage requirements', async () => {
      // Given: The system is in a valid state
      // When: create and manage requirements
      // Then: The expected behavior occurs
      // Create user, app, and selection first
      const userResult = await databaseService.createUser(
        'requirementuser',
        'req@example.com',
        'password123'
      );
      const userId = userResult.lastID!;

      const appResult = await databaseService.createApp(
        'Requirement App',
        'App for requirements',
        userId
      );
      const appId = appResult.lastID!;

      const selectionResult = await databaseService.createSelection(
        userId,
        appId,
        'professional-01',
        'Professional Project'
      );
      const selectionId = selectionResult.lastID!;

      // Create requirements with different priorities
      const req1 = await databaseService.createRequirement(
        userId,
        selectionId,
        'functional',
        'User authentication system',
        'high'
      );

      const req2 = await databaseService.createRequirement(
        userId,
        selectionId,
        'ui',
        'Responsive design'
        // Default priority 'medium'
      );

      const req3 = await databaseService.createRequirement(
        userId,
        selectionId,
        'performance',
        'Page load optimization',
        'low'
      );

      expect(req1.lastID).toBeGreaterThan(0);
      expect(req2.lastID).toBeGreaterThan(0);
      expect(req3.lastID).toBeGreaterThan(0);

      // Get requirements by user
      const userRequirements = await databaseService.getRequirementsByUser(userId);
      expect(userRequirements).toHaveLength(3);

      // Get requirements by selection (should be ordered by priority)
      const selectionRequirements = await databaseService.getRequirementsBySelection(selectionId);
      expect(selectionRequirements).toHaveLength(3);
      
      // Verify ordering by priority (high, medium, low)
      expect(selectionRequirements[0].priority).toBe('high');
      expect(selectionRequirements[0].description).toBe('User authentication system');
      expect(selectionRequirements[1].priority).toBe('medium');
      expect(selectionRequirements[1].description).toBe('Responsive design');
      expect(selectionRequirements[2].priority).toBe('low');
      expect(selectionRequirements[2].description).toBe('Page load optimization');
    });
  });

  describe('Session Management', () => {
    test('should manage JWT refresh token sessions', async () => {
      // Given: The system is in a valid state
      // When: manage JWT refresh token sessions
      // Then: The expected behavior occurs
      // Create a user
      const userResult = await databaseService.createUser(
        'sessionuser',
        'session@example.com',
        'password123'
      );
      const userId = userResult.lastID!;

      // Create a session
      const refreshToken = 'refresh_token_12345';
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

      const sessionResult = await databaseService.createSession(
        userId,
        refreshToken,
        expiresAt
      );

      expect(sessionResult.lastID).toBeGreaterThan(0);

      // Get session by refresh token
      const session = await databaseService.getSession(refreshToken);
      expect(session).toBeDefined();
      expect(session.user_id).toBe(userId);
      expect(session.refresh_token).toBe(refreshToken);
      expect(new Date(session.expires_at)).toEqual(expiresAt);

      // Delete session
      await databaseService.deleteSession(refreshToken);
      const deletedSession = await databaseService.getSession(refreshToken);
      expect(deletedSession).toBeUndefined();
    });

    test('should handle session cleanup and expiration', async () => {
      // Given: The system is in a valid state
      // When: handle session cleanup and expiration
      // Then: The expected behavior occurs
      // Create user for testing
      const userResult = await databaseService.createUser(
        'expireduser',
        'expired@example.com',
        'password123'
      );
      const userId = userResult.lastID!;

      // Create expired session
      const expiredToken = 'expired_token_123';
      const expiredDate = new Date();
      expiredDate.setDate(expiredDate.getDate() - 1); // Yesterday

      await databaseService.createSession(userId, expiredToken, expiredDate);

      // Create valid session
      const validToken = 'valid_token_123';
      const validDate = new Date();
      validDate.setDate(validDate.getDate() + 7); // Next week

      await databaseService.createSession(userId, validToken, validDate);

      // Expired session should not be retrievable (getSession filters by expiry)
      const expiredSession = await databaseService.getSession(expiredToken);
      expect(expiredSession).toBeUndefined();

      // Valid session should be retrievable
      const validSession = await databaseService.getSession(validToken);
      expect(validSession).toBeDefined();
      expect(validSession.refresh_token).toBe(validToken);

      // Clean up expired sessions
      await databaseService.deleteExpiredSessions();

      // Valid session should still exist
      const stillValidSession = await databaseService.getSession(validToken);
      expect(stillValidSession).toBeDefined();
    });
  });

  describe('Database Schema and Constraints', () => {
    test('should enforce foreign key relationships', async () => {
      // Given: The system is in a valid state
      // When: enforce foreign key relationships
      // Then: The expected behavior occurs
      // Try to create app with non-existent owner
      await expect(
        databaseService.createApp('Invalid App', 'Bad owner', 99999)
      ).rejects.toThrow();

      // Try to create selection with non-existent user or app
      await expect(
        databaseService.createSelection(99999, 1, 'template-1', 'Project')
      ).rejects.toThrow();

      // Try to create requirement with non-existent selection  
      await expect(
        databaseService.createRequirement(1, 99999, 'type', 'Description')
      ).rejects.toThrow();
    });

    test('should handle unique constraints', async () => {
      // Given: The system is in a valid state
      // When: handle unique constraints
      // Then: The expected behavior occurs
      // Create user first
      await databaseService.createUser(
        'uniquetest',
        'unique@example.com',
        'password123'
      );

      // Try duplicate username
      await expect(
        databaseService.createUser('uniquetest', 'other@example.com', 'password')
      ).rejects.toThrow();

      // Try duplicate email
      await expect(
        databaseService.createUser('othername', 'unique@example.com', 'password')
      ).rejects.toThrow();
    });
  });

  describe('Complex Queries and Joins', () => {
    test('should perform complex multi-table queries', async () => {
      // Given: The system is in a valid state
      // When: perform complex multi-table queries
      // Then: The expected behavior occurs
      // Create a complete workflow
      const owner1 = await databaseService.createUser('owner1', 'owner1@test.com', 'pass');
      const owner2 = await databaseService.createUser('owner2', 'owner2@test.com', 'pass');

      const app1 = await databaseService.createApp('App One', 'First app', owner1.lastID!);
      const app2 = await databaseService.createApp('App Two', 'Second app', owner2.lastID!);

      const sel1 = await databaseService.createSelection(
        owner1.lastID!, app1.lastID!, 'modern-01', 'Modern Project'
      );
      const sel2 = await databaseService.createSelection(
        owner2.lastID!, app2.lastID!, 'professional-01', 'Pro Project'
      );

      await databaseService.createRequirement(owner1.lastID!, sel1.lastID!, 'functional', 'Auth');
      await databaseService.createRequirement(owner2.lastID!, sel2.lastID!, 'ui', 'Layout');

      // Verify relationships through joins
      const allApps = await databaseService.getAllApps();
      expect(allApps.length).toBeGreaterThanOrEqual(2);
      
      const app1Data = allApps.find(a => a.name === 'App One');
      const app2Data = allApps.find(a => a.name === 'App Two');
      
      expect(app1Data!.owner_name).toBe('owner1');
      expect(app2Data!.owner_name).toBe('owner2');

      // Verify selections with app names
      const owner1Selections = await databaseService.getSelectionsByUser(owner1.lastID!);
      expect(owner1Selections[0].app_name).toBe('App One');
      expect(owner1Selections[0].template_id).toBe('modern-01');

      const owner2Selections = await databaseService.getSelectionsByUser(owner2.lastID!);
      expect(owner2Selections[0].app_name).toBe('App Two');
      expect(owner2Selections[0].template_id).toBe('professional-01');
    });
  });
});