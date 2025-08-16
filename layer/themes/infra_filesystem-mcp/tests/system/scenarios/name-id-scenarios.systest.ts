/**
 * System Tests for VFNameIdWrapper Scenarios
 * 
 * This test suite covers comprehensive real-world scenarios for
 * the VFNameIdWrapper including CRUD operations, filtering,
 * and complex query scenarios.
 */

import { VFNameIdWrapper, Entity } from '../../../children/VFNameIdWrapper';
import * as fs from 'fs/promises';
import { path } from '../../../../infra_external-log-lib/src';
import { os } from '../../../../infra_external-log-lib/src';

describe('VFNameIdWrapper System Test Scenarios', () => {
  let tempDir: string;
  let wrapper: VFNameIdWrapper;
  let featuresFile: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'vf-nameid-system-'));
    wrapper = new VFNameIdWrapper(tempDir);
    featuresFile = 'features.vf.json';
    
    // Load sample data
    const sampleData = await fs.readFile(
      path.join(__dirname, '../fixtures/sample-features.json'),
      'utf-8'
    );
    await fs.writeFile(path.join(tempDir, featuresFile), sampleData);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('📋 Story: Product Manager Reviews Features', () => {
    test('Should list all features for sprint planning', async () => {
      // Given: A product manager needs to see all features
      const allFeatures = await wrapper.read(featuresFile);
      
      // When: They request all features
      const featureGroups = Object.keys(allFeatures);
      
      // Then: They should see all feature categories
      expect(featureGroups).toContain('userManagement');
      expect(featureGroups).toContain('dataAnalytics');
      expect(featureGroups).toContain('apiIntegration');
      
      // And: Each category should have features
      expect(allFeatures.userManagement).toHaveLength(2);
      expect(allFeatures.dataAnalytics).toHaveLength(1);
      expect(allFeatures.apiIntegration).toHaveLength(2);
      
      console.log('🔄 Product manager can view all features for planning');
    });

    test('Should filter features by priority for immediate action', async () => {
      // Given: A product manager needs to focus on high priority items
      // When: They filter by high priority
      const highPriorityFeatures = await wrapper.read(`${featuresFile}?priority=high`) as Entity[];
      
      // Then: They should see only high priority features
      expect(highPriorityFeatures).toHaveLength(2);
      expect(highPriorityFeatures.every(f => f.data.priority === 'high')).toBe(true);
      
      // And: Features should include user registration and API integration
      const titles = highPriorityFeatures.map(f => f.data.title);
      expect(titles).toContain('User Registration System');
      expect(titles).toContain('Third-party API Integration');
      
      console.log('🔄 Product manager can filter high priority features');
    });

    test('Should identify In Progress features for release notes', async () => {
      // Given: A product manager preparing release notes
      // When: They filter by In Progress status
      const completedFeatures = await wrapper.read(`${featuresFile}?status=In Progress`) as Entity[];
      
      // Then: They should see In Progress features
      expect(completedFeatures).toHaveLength(1);
      expect(completedFeatures[0].data.title).toBe('Real-time Analytics Dashboard');
      expect(completedFeatures[0].data.status).toBe('In Progress');
      
      console.log('🔄 Product manager can identify In Progress features');
    });
  });

  describe('🛠️ Story: Developer Searches for Work Items', () => {
    test('Should find features by category for specialized teams', async () => {
      // Given: A security team member looking for security-related work
      // When: They search by security category
      const securityFeatures = await wrapper.read(`${featuresFile}?category=security`) as Entity[];
      
      // Then: They should find security-related features
      expect(securityFeatures).toHaveLength(1);
      expect(securityFeatures[0].data.category).toBe('security');
      expect(securityFeatures[0].data.title).toBe('API Rate Limiting');
      
      console.log('🔄 Developer can find features by category');
    });

    test('Should find features by complexity level for skill matching', async () => {
      // Given: A junior developer looking for beginner-level tasks
      // When: They filter by beginner complexity
      const beginnerFeatures = await wrapper.read(`${featuresFile}?complexity=beginner`) as Entity[];
      
      // Then: They should find appropriate tasks
      expect(beginnerFeatures).toHaveLength(1);
      expect(beginnerFeatures[0].data.complexity).toBe('beginner');
      expect(beginnerFeatures[0].data.title).toBe('User Profile Management');
      
      console.log('🔄 Developer can find features by complexity level');
    });

    test('Should find active features excluding archived ones', async () => {
      // Given: A developer looking for active work items
      // When: They filter by active status
      const activeFeatures = await wrapper.read(`${featuresFile}?active=true`) as Entity[];
      
      // Then: They should see only active features
      expect(activeFeatures).toHaveLength(4);
      expect(activeFeatures.every(f => f.data.active === true)).toBe(true);
      
      // And: In Progress but inactive features should be excluded
      const titles = activeFeatures.map(f => f.data.title);
      expect(titles).not.toContain('Real-time Analytics Dashboard');
      
      console.log('🔄 Developer can filter active features');
    });
  });

  describe('📊 Story: Project Manager Tracks Progress', () => {
    test('Should calculate total estimated hours for sprint planning', async () => {
      // Given: A project manager planning sprint capacity
      // When: They get all pending features
      const pendingFeatures = await wrapper.read(`${featuresFile}?status=pending`) as Entity[];
      
      // Then: They can calculate total estimated effort
      const totalHours = pendingFeatures.reduce((sum, feature) => 
        sum + feature.data.estimated_hours, 0
      );
      
      expect(totalHours).toBe(30); // 8+4+6+12 hours
      expect(pendingFeatures).toHaveLength(4);
      
      console.log(`🔄 Project manager calculated ${totalHours} hours of pending work`);
    });

    test('Should identify in-progress features for status updates', async () => {
      // Given: A project manager preparing status updates
      // When: They filter by in-progress status
      const inProgressFeatures = await wrapper.read(`${featuresFile}?status=in-progress`) as Entity[];
      
      // Then: They should see features currently being worked on
      expect(inProgressFeatures).toHaveLength(1);
      expect(inProgressFeatures[0].data.title).toBe('Third-party API Integration');
      expect(inProgressFeatures[0].data.status).toBe('in-progress');
      
      console.log('🔄 Project manager can track in-progress features');
    });
  });

  describe('🔄 Story: Feature Lifecycle Management', () => {
    test('Should create new feature and assign unique ID', async () => {
      // Given: A product owner defining a new feature
      const newFeatureData = {
        title: 'Email Notification System',
        description: 'Send automated email notifications to users',
        priority: 'medium',
        status: 'pending',
        category: 'communication',
        complexity: 'intermediate',
        estimated_hours: 6,
        tags: ['email', 'notification', 'automation'],
        active: true
      };
      
      // When: They add the new feature
      const featureId = await wrapper.addEntity('emailNotification', newFeatureData, featuresFile);
      
      // Then: The feature should be created with unique ID
      expect(featureId).toBeTruthy();
      
      // And: The feature should be retrievable
      const createdFeature = await wrapper.read(`${featuresFile}?id=${featureId}`) as Entity[];
      expect(createdFeature).toHaveLength(1);
      expect(createdFeature[0].data.title).toBe('Email Notification System');
      
      console.log('🔄 Product owner can create new features with unique IDs');
    });

    test('Should update feature status during development', async () => {
      // Given: A developer starting work on a feature
      const pendingFeatures = await wrapper.read(`${featuresFile}?status=pending&name=userManagement`) as Entity[];
      const userRegistration = pendingFeatures.find(f => 
        f.data.title === 'User Registration System'
      );
      
      // When: They update the status to in-progress
      await wrapper.updateEntity(userRegistration!.id, {
        data: { ...userRegistration!.data, status: 'in-progress' }
      }, featuresFile);
      
      // Then: The feature status should be updated
      const updatedFeature = await wrapper.read(`${featuresFile}?id=${userRegistration!.id}`) as Entity[];
      expect(updatedFeature[0].data.status).toBe('in-progress');
      
      console.log('🔄 Developer can update feature status during development');
    });

    test('Should delete outdated or cancelled features', async () => {
      // Given: A product manager reviewing outdated features
      const analyticsFeatures = await wrapper.read(`${featuresFile}?name=dataAnalytics`) as Entity[];
      const analyticsFeature = analyticsFeatures[0];
      
      // When: They delete the outdated feature
      await wrapper.deleteEntity(analyticsFeature.id, featuresFile);
      
      // Then: The feature should be removed
      const deletedFeature = await wrapper.read(`${featuresFile}?id=${analyticsFeature.id}`) as Entity[];
      expect(deletedFeature).toHaveLength(0);
      
      // And: The dataAnalytics category should be removed since it's empty
      const remainingFeatures = await wrapper.read(featuresFile);
      expect(remainingFeatures).not.toHaveProperty('dataAnalytics');
      
      console.log('🔄 Product manager can delete outdated features');
    });
  });

  describe('🔍 Story: Complex Query Scenarios', () => {
    test('Should find features using multiple filter criteria', async () => {
      // Given: A team lead looking for specific work assignments
      // When: They use multiple criteria (active, pending, category)
      const targetFeatures = await wrapper.read(
        `${featuresFile}?active=true&status=pending&category=authentication`
      ) as Entity[];
      
      // Then: They should find features matching all criteria
      expect(targetFeatures).toHaveLength(1);
      expect(targetFeatures[0].data.title).toBe('User Registration System');
      expect(targetFeatures[0].data.active).toBe(true);
      expect(targetFeatures[0].data.status).toBe('pending');
      expect(targetFeatures[0].data.category).toBe('authentication');
      
      console.log('🔄 Team lead can use complex multi-criteria filtering');
    });

    test('Should handle edge case with no matching results', async () => {
      // Given: A user searching for non-existent criteria
      // When: They search for impossible combination
      const noResults = await wrapper.read(
        `${featuresFile}?status=In Progress&priority=critical`
      ) as Entity[];
      
      // Then: They should get empty results without errors
      expect(noResults).toHaveLength(0);
      expect(Array.isArray(noResults)).toBe(true);
      
      console.log('🔄 System handles edge cases with no matching results');
    });

    test('Should validate schema requirements during write operations', async () => {
      // Given: A user attempting to create invalid feature data
      const invalidFeature = {
        // Missing required 'name' field
        data: { title: 'Invalid Feature' }
      };
      
      // When: They try to write invalid data
      // Then: The system should reject it with validation error
      await expect(wrapper.write(featuresFile, invalidFeature as any))
        .rejects.toThrow('Schema validation failed');
      
      console.log('🔄 System validates schema requirements during writes');
    });
  });

  describe('🎯 Story: Performance and Reliability', () => {
    test('Should handle large datasets efficiently', async () => {
      // Given: A system with many features
      const largeDataset = {};
      for (let i = 0; i < 100; i++) {
        const categoryName = `category${i}`;
        largeDataset[categoryName] = [{
          id: `feature-${i}`,
          name: categoryName,
          data: {
            title: `Feature ${i}`,
            priority: i % 3 === 0 ? 'high' : 'medium',
            status: 'pending',
            active: true
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }];
      }
      
      const largeFile = 'large-features.vf.json';
      await wrapper.write(largeFile, largeDataset);
      
      // When: Filtering on large dataset
      const startTime = Date.now();
      const highPriorityFeatures = await wrapper.read(`${largeFile}?priority=high`) as Entity[];
      const endTime = Date.now();
      
      // Then: Query should In Progress quickly and return correct results
      expect(endTime - startTime).toBeLessThan(1000); // Less than 1 second
      expect(highPriorityFeatures).toHaveLength(34); // Every 3rd item (0, 3, 6, ... 99)
      
      console.log(`🔄 System handles large datasets efficiently (${endTime - startTime}ms)`);
    });

    test('Should maintain data integrity during concurrent operations', async () => {
      // Given: Multiple concurrent operations
      const concurrentOperations = [];
      
      // When: Adding multiple features concurrently
      for (let i = 0; i < 10; i++) {
        concurrentOperations.push(
          wrapper.addEntity(`concurrent${i}`, {
            title: `Concurrent Feature ${i}`,
            priority: 'medium',
            status: 'pending',
            active: true
          }, `concurrent-${i}.vf.json`)
        );
      }
      
      const results = await Promise.all(concurrentOperations);
      
      // Then: All operations should succeed with unique IDs
      expect(results).toHaveLength(10);
      expect(new Set(results).size).toBe(10); // All IDs should be unique
      
      console.log('🔄 System maintains data integrity during concurrent operations');
    });
  });
});