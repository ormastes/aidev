import { fsPromises as fs } from 'fs/promises';
import { path } from '../../infra_external-log-lib/src';
import { VFDistributedFeatureWrapper, DistributedFeatureFile } from '../children/VFDistributedFeatureWrapper';

/**
 * Simple integration test to verify the distributed feature system works
 */
describe('Simple Distributed Feature Integration Test', () => {
  const testBaseDir = path.join(__dirname, '../temp/simple-integration');
  
  beforeAll(async () => {
    await fs.mkdir(testBaseDir, { recursive: true });
  });

  afterAll(async () => {
    try {
      await fs.rm(testBaseDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  test('should create and read a basic distributed feature file', async () => {
    const testPath = path.join(testBaseDir, 'test-feature.json');
    const wrapper = new VFDistributedFeatureWrapper(testPath);

    // Create a basic feature file
    const initialContent: DistributedFeatureFile = {
      metadata: {
        level: 'root',
        path: '/test-feature.json',
        version: '1.0.0',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      features: {}
    };

    await wrapper.write(testPath, initialContent);

    // Read it back
    const result = await wrapper.read(testPath);

    expect(result.metadata.level).toBe('root');
    expect(result.metadata.version).toBe('1.0.0');
    expect(result.features).toBeDefined();
  });

  test('should add features to the file', async () => {
    const testPath = path.join(testBaseDir, 'test-add-feature.json');
    const wrapper = new VFDistributedFeatureWrapper(testPath);

    // Initialize file
    await wrapper.write(testPath, {
      metadata: {
        level: 'root',
        path: '/test-add-feature.json',
        version: '1.0.0',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      features: {}
    });

    // Add a feature
    const featureId = await wrapper.addFeature('test', {
      name: 'Test Feature',
      data: {
        title: 'Test Feature',
        description: 'A simple test feature',
        level: 'root',
        status: 'planned',
        priority: 'medium',
        virtual_path: '/test-add-feature.json'
      }
    });

    expect(featureId).toBeDefined();
    expect(typeof featureId).toBe('string');

    // Verify the feature was added
    const result = await wrapper.read(testPath);
    expect(result.features.test).toHaveLength(1);
    expect(result.features.test[0].id).toBe(featureId);
    expect(result.features.test[0].data.title).toBe('Test Feature');
  });

  test('should handle hierarchical feature creation', async () => {
    const rootPath = path.join(testBaseDir, 'hierarchy-root.json');
    const epicPath = path.join(testBaseDir, 'hierarchy-epic.json');
    
    const rootWrapper = new VFDistributedFeatureWrapper(rootPath);
    const epicWrapper = new VFDistributedFeatureWrapper(epicPath);

    // Create root
    await rootWrapper.write(rootPath, {
      metadata: {
        level: 'root',
        path: '/hierarchy-root.json',
        version: '1.0.0',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      features: {}
    });

    const platformId = await rootWrapper.addFeature("platform", {
      name: 'Test Platform',
      data: {
        title: 'Test Platform',
        description: 'Platform for hierarchy testing',
        level: 'root',
        status: 'in-progress',
        priority: "critical",
        virtual_path: '/hierarchy-root.json'
      }
    });

    // Create epic
    await epicWrapper.write(epicPath, {
      metadata: {
        level: 'epic',
        parent_id: platformId,
        path: '/hierarchy-epic.json',
        version: '1.0.0',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      features: {}
    });

    const epicId = await epicWrapper.addFeature('epic', {
      name: 'Test Epic',
      data: {
        title: 'Test Epic',
        description: 'Epic for testing hierarchy',
        level: 'epic',
        parent_feature_id: platformId,
        status: 'planned',
        priority: 'high',
        virtual_path: '/hierarchy-epic.json'
      }
    });

    // Verify hierarchy
    const rootResult = await rootWrapper.read(rootPath);
    expect(rootResult.features.platform[0].id).toBe(platformId);

    const epicResult = await epicWrapper.read(epicPath);
    expect(epicResult.features.epic[0].id).toBe(epicId);
    expect(epicResult.features.epic[0].data.parent_feature_id).toBe(platformId);
    expect(epicResult.metadata.parent_id).toBe(platformId);
  });

  test('should handle orphaned features with common epic creation', async () => {
    const orphanPath = path.join(testBaseDir, 'orphan-feature.json');
    const wrapper = new VFDistributedFeatureWrapper(orphanPath);

    // Create orphaned feature (no explicit epic)
    await wrapper.write(orphanPath, {
      metadata: {
        level: 'user_story',
        path: '/orphan-feature.json',
        version: '1.0.0',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      features: {}
    });

    // Add orphaned feature - should create common epic
    await wrapper.addFeature("orphaned", {
      name: 'Orphaned Feature',
      data: {
        title: 'Orphaned Feature',
        description: 'Feature without explicit parent',
        level: 'user_story',
        status: 'planned',
        priority: 'medium',
        virtual_path: '/orphan-feature.json'
      }
    });

    const result = await wrapper.read(orphanPath);
    
    // Should have created common epic
    expect(result.features.common).toBeDefined();
    expect(result.features.common).toHaveLength(1);
    
    const commonEpic = result.features.common[0];
    expect(commonEpic.id).toMatch(/^common-/);
    expect(commonEpic.data.level).toBe('epic');
    expect(commonEpic.data.tags).toContain('auto-generated');

    // Orphaned feature should reference common epic
    expect(result.features.orphaned[0].data.epic_id).toBe(commonEpic.id);
    expect(result.features.orphaned[0].data.parent_feature_id).toBe(commonEpic.id);
  });

  test('should handle query parameters for filtering', async () => {
    const queryPath = path.join(testBaseDir, 'query-test.json');
    const wrapper = new VFDistributedFeatureWrapper(queryPath);

    // Create file with mixed features
    await wrapper.write(queryPath, {
      metadata: {
        level: 'epic',
        path: '/query-test.json',
        version: '1.0.0',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      features: {
        mixed: [
          {
            id: 'epic-001',
            name: 'Epic Feature',
            data: {
              title: 'Epic Feature',
              description: 'An epic level feature',
              level: 'epic',
              status: 'planned',
              priority: 'high',
              virtual_path: '/query-test.json'
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          {
            id: 'story-001',
            name: 'Story Feature',
            data: {
              title: 'Story Feature',
              description: 'A user story level feature',
              level: 'user_story',
              status: 'planned',
              priority: 'medium',
              virtual_path: '/query-test.json'
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        ]
      }
    });

    // Test level filtering
    const epicOnlyResult = await wrapper.read(queryPath + '?level=epic');
    expect(epicOnlyResult.features.mixed).toHaveLength(1);
    expect(epicOnlyResult.features.mixed[0].data.level).toBe('epic');

    const storyOnlyResult = await wrapper.read(queryPath + '?level=user_story');
    expect(storyOnlyResult.features.mixed).toHaveLength(1);
    expect(storyOnlyResult.features.mixed[0].data.level).toBe('user_story');

    // Test without filter
    const allResult = await wrapper.read(queryPath);
    expect(allResult.features.mixed).toHaveLength(2);
  });

  console.log('✅ Simple Distributed Feature Integration Test - PASSED');
});