import { fsPromises as fs } from '../../infra_external-log-lib/dist';
import { path } from '../../infra_external-log-lib/src';
import { VFDistributedFeatureWrapper, DistributedFeatureFile } from '../children/VFDistributedFeatureWrapper';

/**
 * Integration tests for the distributed feature system
 * Tests the complete workflow from root to user story levels
 */
describe('Distributed Feature System Integration', () => {
  const tempDir = path.join(__dirname, '../temp/test-distributed');
  const rootFeaturePath = path.join(tempDir, 'FEATURE.vf.json');
  const epicFeaturePath = path.join(tempDir, 'layer/themes/filesystem_mcp/FEATURE.vf.json');
  const storyFeaturePath = path.join(tempDir, 'layer/themes/filesystem_mcp/user-stories/001-wrapper/FEATURE.vf.json');

  beforeAll(async () => {
    // Create test directory structure
    await fs.mkdir(path.dirname(rootFeaturePath), { recursive: true });
    await fs.mkdir(path.dirname(epicFeaturePath), { recursive: true });
    await fs.mkdir(path.dirname(storyFeaturePath), { recursive: true });
  });

  afterAll(async () => {
    // Clean up test files
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  test('should create complete hierarchical feature structure', async () => {
    // 1. Create root level feature file
    const rootFeature: DistributedFeatureFile = {
      metadata: {
        level: 'root',
        path: '/FEATURE.vf.json',
        version: '1.0.0',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      features: {
        platform: [{
          id: 'root-platform-001',
          name: 'AI Development Platform',
          data: {
            title: 'AI Development Platform',
            description: 'Complete platform for AI-assisted development',
            level: 'root',
            status: 'in-progress',
            priority: 'critical',
            tags: ['platform', 'ai', 'development'],
            virtual_path: '/FEATURE.vf.json',
            child_features: []
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }]
      },
      children: ['/layer/themes/filesystem_mcp/FEATURE.vf.json']
    };

    await fs.writeFile(rootFeaturePath, JSON.stringify(rootFeature, null, 2));

    // 2. Create epic level feature file
    const epicFeature: DistributedFeatureFile = {
      metadata: {
        level: 'epic',
        parent_id: 'root-platform-001',
        path: '/layer/themes/filesystem_mcp/FEATURE.vf.json',
        version: '1.0.0',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      features: {
        filesystem: [{
          id: 'epic-filesystem-001',
          name: 'Virtual File System',
          data: {
            title: 'Virtual File System with MCP Integration',
            description: 'Complete virtual file system implementation',
            level: 'epic',
            parent_feature_id: 'root-platform-001',
            status: 'in-progress',
            priority: 'high',
            tags: ['filesystem', 'mcp', 'integration'],
            virtual_path: '/layer/themes/filesystem_mcp/FEATURE.vf.json',
            child_features: []
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }]
      },
      children: ['/layer/themes/filesystem_mcp/user-stories/001-wrapper/FEATURE.vf.json']
    };

    await fs.writeFile(epicFeaturePath, JSON.stringify(epicFeature, null, 2));

    // 3. Create user story level feature file
    const storyFeature: DistributedFeatureFile = {
      metadata: {
        level: 'user_story',
        parent_id: 'epic-filesystem-001',
        path: '/layer/themes/filesystem_mcp/user-stories/001-wrapper/FEATURE.vf.json',
        version: '1.0.0',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      features: {
        wrapper: [{
          id: 'story-wrapper-001',
          name: 'VF File Wrapper',
          data: {
            title: 'VFFileWrapper Implementation',
            description: 'Basic virtual file operations with query parameter support',
            level: 'user_story',
            parent_feature_id: 'epic-filesystem-001',
            epic_id: 'epic-filesystem-001',
            status: 'completed',
            priority: 'high',
            tags: ['wrapper', 'file-operations'],
            components: ['VFFileWrapper.ts'],
            virtual_path: '/layer/themes/filesystem_mcp/user-stories/001-wrapper/FEATURE.vf.json',
            acceptanceCriteria: [
              'read() method handles query parameter parsing',
              'write() method handles file write operations',
              'parseQueryParams() correctly parses URL-style parameters'
            ]
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }]
      }
    };

    await fs.writeFile(storyFeaturePath, JSON.stringify(storyFeature, null, 2));

    // 4. Test reading from root level with aggregation
    const rootWrapper = new VFDistributedFeatureWrapper(rootFeaturePath);
    const rootResult = await rootWrapper.read(rootFeaturePath);

    expect(rootResult.metadata.level).toBe('root');
    expect(rootResult.features.platform).toHaveLength(1);
    expect(rootResult.children).toContain('/layer/themes/filesystem_mcp/FEATURE.vf.json');
    expect(rootResult.aggregated_view).toBeDefined();
    
    // Should aggregate features from child files
    expect(rootResult.aggregated_view?.filesystem).toBeDefined();
    expect(rootResult.aggregated_view?.wrapper).toBeDefined();

    // 5. Test reading from epic level
    const epicWrapper = new VFDistributedFeatureWrapper(epicFeaturePath);
    const epicResult = await epicWrapper.read(epicFeaturePath);

    expect(epicResult.metadata.level).toBe('epic');
    expect(epicResult.metadata.parent_id).toBe('root-platform-001');
    expect(epicResult.aggregated_view?.wrapper).toBeDefined();
    expect(epicResult.aggregated_view?.wrapper[0].id).toBe('story-wrapper-001');

    // 6. Test reading from user story level
    const storyWrapper = new VFDistributedFeatureWrapper(storyFeaturePath);
    const storyResult = await storyWrapper.read(storyFeaturePath);

    expect(storyResult.metadata.level).toBe('user_story');
    expect(storyResult.metadata.parent_id).toBe('epic-filesystem-001');
    expect(storyResult.features.wrapper[0].data.epic_id).toBe('epic-filesystem-001');
  });

  test('should handle orphaned features by creating common epics', async () => {
    const orphanedStoryPath = path.join(tempDir, 'layer/themes/test/user-stories/001-orphan/FEATURE.vf.json');
    await fs.mkdir(path.dirname(orphanedStoryPath), { recursive: true });

    const orphanedFeature: DistributedFeatureFile = {
      metadata: {
        level: 'user_story',
        path: '/layer/themes/test/user-stories/001-orphan/FEATURE.vf.json',
        version: '1.0.0',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      features: {}
    };

    await fs.writeFile(orphanedStoryPath, JSON.stringify(orphanedFeature, null, 2));

    const wrapper = new VFDistributedFeatureWrapper(orphanedStoryPath);
    
    // Add a feature without explicit parent epic
    await wrapper.addFeature('orphan', {
      name: 'Orphaned Feature',
      data: {
        title: 'Orphaned Feature',
        description: 'A feature without explicit parent epic',
        level: 'user_story',
        status: 'planned',
        priority: 'medium',
        virtual_path: '/layer/themes/test/user-stories/001-orphan/FEATURE.vf.json'
      }
    });

    // Read the updated file
    const result = await wrapper.read(orphanedStoryPath);

    // Should have created a common epic
    expect(result.features.common).toBeDefined();
    expect(result.features.common[0].id).toBe('common-test');
    expect(result.features.common[0].data.level).toBe('epic');
    expect(result.features.common[0].data.tags).toContain('auto-generated');

    // Orphaned feature should be assigned to common epic
    expect(result.features.orphan[0].data.epic_id).toBe('common-test');
    expect(result.features.orphan[0].data.parent_feature_id).toBe('common-test');
  });

  test('should support filtering by level across hierarchy', async () => {
    // Use the existing root feature file from previous test
    const rootWrapper = new VFDistributedFeatureWrapper(rootFeaturePath);
    
    // Test filtering by different levels
    const rootOnlyResult = await rootWrapper.read(`${rootFeaturePath}?level=root`);
    expect(rootOnlyResult.aggregated_view?.platform).toBeDefined();
    expect(rootOnlyResult.aggregated_view?.filesystem).toBeUndefined();
    expect(rootOnlyResult.aggregated_view?.wrapper).toBeUndefined();

    const epicOnlyResult = await rootWrapper.read(`${rootFeaturePath}?level=epic`);
    expect(rootOnlyResult.aggregated_view?.platform).toBeDefined(); // Should still show due to original features
    expect(epicOnlyResult.aggregated_view?.filesystem).toBeDefined();
    expect(epicOnlyResult.aggregated_view?.wrapper).toBeUndefined();

    const userStoryOnlyResult = await rootWrapper.read(`${rootFeaturePath}?level=user_story`);
    expect(userStoryOnlyResult.aggregated_view?.wrapper).toBeDefined();
    expect(userStoryOnlyResult.aggregated_view?.wrapper[0].data.level).toBe('user_story');
  });

  test('should maintain parent-child relationships when updating features', async () => {
    const testEpicPath = path.join(tempDir, 'layer/themes/relationship-test/FEATURE.vf.json');
    await fs.mkdir(path.dirname(testEpicPath), { recursive: true });

    const epicFeature: DistributedFeatureFile = {
      metadata: {
        level: 'epic',
        path: '/layer/themes/relationship-test/FEATURE.vf.json',
        version: '1.0.0',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      features: {
        test: [{
          id: 'epic-test-001',
          name: 'Test Epic',
          data: {
            title: 'Test Epic',
            description: 'Epic for relationship testing',
            level: 'epic',
            status: 'in-progress',
            priority: 'high',
            virtual_path: '/layer/themes/relationship-test/FEATURE.vf.json',
            child_features: []
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }]
      }
    };

    await fs.writeFile(testEpicPath, JSON.stringify(epicFeature, null, 2));

    const wrapper = new VFDistributedFeatureWrapper(testEpicPath);

    // Add child features
    await wrapper.addFeature('child', {
      name: 'Child Feature 1',
      data: {
        title: 'Child Feature 1',
        description: 'First child feature',
        level: 'user_story',
        parent_feature_id: 'epic-test-001',
        status: 'planned',
        priority: 'medium',
        virtual_path: '/layer/themes/relationship-test/FEATURE.vf.json'
      }
    });

    await wrapper.addFeature('child', {
      name: 'Child Feature 2',
      data: {
        title: 'Child Feature 2',
        description: 'Second child feature',
        level: 'user_story',
        parent_feature_id: 'epic-test-001',
        status: 'planned',
        priority: 'medium',
        virtual_path: '/layer/themes/relationship-test/FEATURE.vf.json'
      }
    });

    // Read and verify relationships
    const result = await wrapper.read(testEpicPath);

    // Epic should have both child features in its child_features array
    const epic = result.features.test[0];
    expect(epic.data.child_features).toHaveLength(2);
    
    // Child features should reference the epic as parent
    const childFeatures = result.features.child;
    expect(childFeatures).toHaveLength(2);
    expect(childFeatures[0].data.parent_feature_id).toBe('epic-test-001');
    expect(childFeatures[1].data.parent_feature_id).toBe('epic-test-001');
    expect(childFeatures[0].data.epic_id).toBe('epic-test-001');
    expect(childFeatures[1].data.epic_id).toBe('epic-test-001');
  });

  test('should handle complex multi-level aggregation', async () => {
    // Create a deep hierarchy: root -> epic -> theme -> user_story
    const deepRootPath = path.join(tempDir, 'deep/FEATURE.vf.json');
    const deepEpicPath = path.join(tempDir, 'deep/layer/themes/deep-theme/FEATURE.vf.json');
    const deepStory1Path = path.join(tempDir, 'deep/layer/themes/deep-theme/user-stories/001-story/FEATURE.vf.json');
    const deepStory2Path = path.join(tempDir, 'deep/layer/themes/deep-theme/user-stories/002-story/FEATURE.vf.json');

    await fs.mkdir(path.dirname(deepRootPath), { recursive: true });
    await fs.mkdir(path.dirname(deepEpicPath), { recursive: true });
    await fs.mkdir(path.dirname(deepStory1Path), { recursive: true });
    await fs.mkdir(path.dirname(deepStory2Path), { recursive: true });

    // Create files with cross-references
    const deepRoot: DistributedFeatureFile = {
      metadata: {
        level: 'root',
        path: '/deep/FEATURE.vf.json',
        version: '1.0.0',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      features: {
        platform: [{
          id: 'deep-root-001',
          name: 'Deep Platform',
          data: {
            title: 'Deep Platform',
            description: 'Root of deep hierarchy',
            level: 'root',
            status: 'in-progress',
            priority: 'critical',
            virtual_path: '/deep/FEATURE.vf.json',
            child_features: ['deep-epic-001']
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }]
      },
      children: ['/deep/layer/themes/deep-theme/FEATURE.vf.json']
    };

    const deepEpic: DistributedFeatureFile = {
      metadata: {
        level: 'epic',
        parent_id: 'deep-root-001',
        path: '/deep/layer/themes/deep-theme/FEATURE.vf.json',
        version: '1.0.0',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      features: {
        theme: [{
          id: 'deep-epic-001',
          name: 'Deep Theme',
          data: {
            title: 'Deep Theme',
            description: 'Epic level in deep hierarchy',
            level: 'epic',
            parent_feature_id: 'deep-root-001',
            status: 'in-progress',
            priority: 'high',
            virtual_path: '/deep/layer/themes/deep-theme/FEATURE.vf.json',
            child_features: ['deep-story-001', 'deep-story-002']
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }]
      },
      children: [
        '/deep/layer/themes/deep-theme/user-stories/001-story/FEATURE.vf.json',
        '/deep/layer/themes/deep-theme/user-stories/002-story/FEATURE.vf.json'
      ]
    };

    const deepStory1: DistributedFeatureFile = {
      metadata: {
        level: 'user_story',
        parent_id: 'deep-epic-001',
        path: '/deep/layer/themes/deep-theme/user-stories/001-story/FEATURE.vf.json',
        version: '1.0.0',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      features: {
        story: [{
          id: 'deep-story-001',
          name: 'Deep Story 1',
          data: {
            title: 'Deep Story 1',
            description: 'First user story in deep hierarchy',
            level: 'user_story',
            parent_feature_id: 'deep-epic-001',
            epic_id: 'deep-epic-001',
            status: 'completed',
            priority: 'medium',
            virtual_path: '/deep/layer/themes/deep-theme/user-stories/001-story/FEATURE.vf.json'
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }]
      }
    };

    const deepStory2: DistributedFeatureFile = {
      metadata: {
        level: 'user_story',
        parent_id: 'deep-epic-001',
        path: '/deep/layer/themes/deep-theme/user-stories/002-story/FEATURE.vf.json',
        version: '1.0.0',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      features: {
        story: [{
          id: 'deep-story-002',
          name: 'Deep Story 2',
          data: {
            title: 'Deep Story 2',
            description: 'Second user story in deep hierarchy',
            level: 'user_story',
            parent_feature_id: 'deep-epic-001',
            epic_id: 'deep-epic-001',
            status: 'in-progress',
            priority: 'low',
            virtual_path: '/deep/layer/themes/deep-theme/user-stories/002-story/FEATURE.vf.json'
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }]
      }
    };

    await fs.writeFile(deepRootPath, JSON.stringify(deepRoot, null, 2));
    await fs.writeFile(deepEpicPath, JSON.stringify(deepEpic, null, 2));
    await fs.writeFile(deepStory1Path, JSON.stringify(deepStory1, null, 2));
    await fs.writeFile(deepStory2Path, JSON.stringify(deepStory2, null, 2));

    // Test aggregation from root level
    const rootWrapper = new VFDistributedFeatureWrapper(deepRootPath);
    const rootResult = await rootWrapper.read(deepRootPath);

    expect(rootResult.aggregated_view).toBeDefined();
    expect(rootResult.aggregated_view?.platform).toHaveLength(1);
    expect(rootResult.aggregated_view?.theme).toHaveLength(1);
    expect(rootResult.aggregated_view?.story).toHaveLength(2);

    // Verify the aggregated stories come from different files
    const aggregatedStories = rootResult.aggregated_view?.story || [];
    expect(aggregatedStories.find(s => s.id === 'deep-story-001')).toBeDefined();
    expect(aggregatedStories.find(s => s.id === 'deep-story-002')).toBeDefined();
  });
});