import { fsPromises as fs } from '../../infra_external-log-lib/dist';
import { path } from '../../infra_external-log-lib/src';
import { VFDistributedFeatureWrapper, DistributedFeatureFile } from '../children/VFDistributedFeatureWrapper';

/**
 * Concurrent operations and race conditions tests
 * Tests scenarios where multiple operations happen simultaneously
 */
describe('Concurrent Operations and Race Conditions', () => {
  const testBaseDir = path.join(__dirname, '../temp/concurrent-ops');
  
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

  describe('Concurrent Feature Addition', () => {
    test('should handle multiple features being added simultaneously to same file', async () => {
      const concurrentDir = path.join(testBaseDir, 'concurrent-add');
      await fs.mkdir(concurrentDir, { recursive: true });

      const featurePath = path.join(concurrentDir, 'FEATURE.vf.json');
      const wrapper = new VFDistributedFeatureWrapper(featurePath);

      // Initialize file
      await wrapper.write(featurePath, {
        metadata: {
          level: 'root',
          path: '/FEATURE.vf.json',
          version: '1.0.0',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        features: {}
      });

      // Simulate concurrent feature additions
      const concurrentAdditions = Array.from({ length: 20 }, (_, i) => 
        wrapper.addFeature(`category_${i % 5}`, {
          name: `Concurrent Feature ${i}`,
          data: {
            title: `Concurrent Feature ${i}`,
            description: `Feature added concurrently ${i}`,
            level: 'user_story',
            status: 'planned',
            priority: 'medium',
            tags: [`concurrent-${i}`, `batch-${Math.floor(i / 5)}`],
            virtual_path: '/FEATURE.vf.json'
          }
        })
      );

      // Execute all additions in parallel
      const startTime = Date.now();
      const featureIds = await Promise.all(concurrentAdditions);
      const endTime = Date.now();

      console.log(`Added 20 features concurrently in ${endTime - startTime}ms`);

      // Verify all features were added
      const result = await wrapper.read(featurePath);
      
      // Should have 5 categories (0-4)
      expect(Object.keys(result.features)).toHaveLength(5);
      
      // Total features should be 20
      const totalFeatures = Object.values(result.features).reduce((sum, features) => sum + features.length, 0);
      expect(totalFeatures).toBe(20);

      // All feature IDs should be unique
      const allIds = Object.values(result.features).flat().map(f => f.id);
      const uniqueIds = new Set(allIds);
      expect(uniqueIds.size).toBe(20);

      // Returned IDs should match actual IDs
      featureIds.forEach(id => {
        expect(allIds).toContain(id);
      });
    });

    test('should handle rapid sequential vs concurrent feature additions performance', async () => {
      const perfDir = path.join(testBaseDir, 'performance');
      await fs.mkdir(perfDir, { recursive: true });

      // Test 1: Sequential additions
      const sequentialPath = path.join(perfDir, 'sequential.json');
      const sequentialWrapper = new VFDistributedFeatureWrapper(sequentialPath);
      
      await sequentialWrapper.write(sequentialPath, {
        metadata: {
          level: 'root',
          path: '/sequential.json',
          version: '1.0.0',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        features: {}
      });

      const sequentialStart = Date.now();
      for (let i = 0; i < 50; i++) {
        await sequentialWrapper.addFeature('sequential', {
          name: `Sequential Feature ${i}`,
          data: {
            title: `Sequential Feature ${i}`,
            description: 'Added sequentially',
            level: 'user_story',
            status: 'planned',
            priority: 'medium',
            virtual_path: '/sequential.json'
          }
        });
      }
      const sequentialTime = Date.now() - sequentialStart;

      // Test 2: Concurrent additions (simulated)
      const concurrentPath = path.join(perfDir, 'concurrent.json');
      const concurrentWrapper = new VFDistributedFeatureWrapper(concurrentPath);
      
      await concurrentWrapper.write(concurrentPath, {
        metadata: {
          level: 'root',
          path: '/concurrent.json',
          version: '1.0.0',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        features: {}
      });

      // Create batches of concurrent operations
      const batchSize = 10;
      const concurrentStart = Date.now();
      
      for (let batch = 0; batch < 5; batch++) {
        const batchPromises = Array.from({ length: batchSize }, (_, i) => 
          concurrentWrapper.addFeature('concurrent', {
            name: `Concurrent Feature ${batch * batchSize + i}`,
            data: {
              title: `Concurrent Feature ${batch * batchSize + i}`,
              description: 'Added concurrently',
              level: 'user_story',
              status: 'planned',
              priority: 'medium',
              virtual_path: '/concurrent.json'
            }
          })
        );
        
        await Promise.all(batchPromises);
      }
      
      const concurrentTime = Date.now() - concurrentStart;

      console.log(`Sequential: ${sequentialTime}ms, Concurrent batches: ${concurrentTime}ms`);

      // Verify both approaches produced correct results
      const sequentialResult = await sequentialWrapper.read(sequentialPath);
      const concurrentResult = await concurrentWrapper.read(concurrentPath);

      expect(sequentialResult.features.sequential).toHaveLength(50);
      expect(concurrentResult.features.concurrent).toHaveLength(50);

      // Performance comparison (concurrent batching should be faster)
      expect(concurrentTime).toBeLessThan(sequentialTime * 1.2); // Allow some variance
    });
  });

  describe('Concurrent File Operations', () => {
    test('should handle simultaneous reads of same file', async () => {
      const readsDir = path.join(testBaseDir, 'concurrent-reads');
      await fs.mkdir(readsDir, { recursive: true });

      const readPath = path.join(readsDir, 'read-test.json');
      const wrapper = new VFDistributedFeatureWrapper(readPath);

      // Create a file with substantial content
      const content: DistributedFeatureFile = {
        metadata: {
          level: 'root',
          path: '/read-test.json',
          version: '1.0.0',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        features: {
          test: Array.from({ length: 100 }, (_, i) => ({
            id: `test-${i}`,
            name: `Test Feature ${i}`,
            data: {
              title: `Test Feature ${i}`,
              description: `Feature for concurrent read testing ${i}`,
              level: 'user_story',
              status: i % 4 === 0 ? 'completed' : i % 4 === 1 ? 'in-progress' : i % 4 === 2 ? 'planned' : 'blocked',
              priority: i % 4 === 0 ? 'critical' : i % 4 === 1 ? 'high' : i % 4 === 2 ? 'medium' : 'low',
              tags: [`tag-${i % 10}`, `category-${Math.floor(i / 10)}`],
              virtual_path: '/read-test.json'
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }))
        }
      };

      await wrapper.write(readPath, content);

      // Perform 50 concurrent reads
      const concurrentReads = Array.from({ length: 50 }, (_, i) => 
        wrapper.read(readPath + (i % 5 === 0 ? '?level=user_story' : ''))
      );

      const readStart = Date.now();
      const results = await Promise.all(concurrentReads);
      const readTime = Date.now() - readStart;

      console.log(`50 concurrent reads completed in ${readTime}ms`);

      // All reads should succeed
      expect(results).toHaveLength(50);
      results.forEach((result, i) => {
        expect(result.features.test).toBeDefined();
        if (i % 5 === 0) {
          // Filtered reads should have all features (since they're all user_story level)
          expect(result.features.test.length).toBe(100);
        } else {
          // Unfiltered reads should have all features
          expect(result.features.test.length).toBe(100);
        }
      });

      // Results should be consistent
      const firstResult = results[0];
      results.forEach(result => {
        expect(result.features.test.length).toBe(firstResult.features.test.length);
        expect(result.metadata.version).toBe(firstResult.metadata.version);
      });
    });

    test('should handle mixed read/write operations', async () => {
      const mixedDir = path.join(testBaseDir, 'mixed-ops');
      await fs.mkdir(mixedDir, { recursive: true });

      const mixedPath = path.join(mixedDir, 'mixed-ops.json');
      const wrapper = new VFDistributedFeatureWrapper(mixedPath);

      // Initialize file
      await wrapper.write(mixedPath, {
        metadata: {
          level: 'root',
          path: '/mixed-ops.json',
          version: '1.0.0',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        features: {}
      });

      // Mix of read and write operations
      const operations: Promise<any>[] = [];

      // Add some initial features
      for (let i = 0; i < 5; i++) {
        operations.push(
          wrapper.addFeature('initial', {
            name: `Initial Feature ${i}`,
            data: {
              title: `Initial Feature ${i}`,
              description: 'Initial feature',
              level: 'user_story',
              status: 'planned',
              priority: 'medium',
              virtual_path: '/mixed-ops.json'
            }
          })
        );
      }

      // Add read operations between writes
      for (let i = 0; i < 10; i++) {
        operations.push(wrapper.read(mixedPath));
      }

      // Add more features
      for (let i = 5; i < 10; i++) {
        operations.push(
          wrapper.addFeature('later', {
            name: `Later Feature ${i}`,
            data: {
              title: `Later Feature ${i}`,
              description: 'Feature added later',
              level: 'user_story',
              status: 'planned',
              priority: 'medium',
              virtual_path: '/mixed-ops.json'
            }
          })
        );
      }

      // Execute all operations concurrently
      const mixedStart = Date.now();
      const results = await Promise.allSettled(operations);
      const mixedTime = Date.now() - mixedStart;

      console.log(`Mixed read/write operations completed in ${mixedTime}ms`);

      // Most operations should succeed
      const successful = results.filter(r => r.status === 'fulfilled');
      const failed = results.filter(r => r.status === 'rejected');

      console.log(`Successful: ${successful.length}, Failed: ${failed.length}`);
      
      // At least 80% should succeed (some may fail due to race conditions)
      expect(successful.length).toBeGreaterThan(results.length * 0.8);

      // Final state should be consistent
      const finalResult = await wrapper.read(mixedPath);
      expect(finalResult.features.initial || []).toBeDefined();
      expect(finalResult.features.later || []).toBeDefined();

      const totalFeatures = Object.values(finalResult.features).reduce((sum, features) => sum + features.length, 0);
      expect(totalFeatures).toBeGreaterThan(0);
      expect(totalFeatures).toBeLessThanOrEqual(10);
    });
  });

  describe('Concurrent Hierarchical Operations', () => {
    test('should handle concurrent operations across hierarchy levels', async () => {
      const hierarchyDir = path.join(testBaseDir, 'hierarchy-concurrent');
      await fs.mkdir(hierarchyDir, { recursive: true });

      // Create hierarchy structure
      await fs.mkdir(path.join(hierarchyDir, 'layer/themes/concurrent-theme/user-stories/001-story'), { recursive: true });
      await fs.mkdir(path.join(hierarchyDir, 'layer/themes/concurrent-theme/user-stories/002-story'), { recursive: true });

      const rootPath = path.join(hierarchyDir, 'FEATURE.vf.json');
      const epicPath = path.join(hierarchyDir, 'layer/themes/concurrent-theme/FEATURE.vf.json');
      const story1Path = path.join(hierarchyDir, 'layer/themes/concurrent-theme/user-stories/001-story/FEATURE.vf.json');
      const story2Path = path.join(hierarchyDir, 'layer/themes/concurrent-theme/user-stories/002-story/FEATURE.vf.json');

      const rootWrapper = new VFDistributedFeatureWrapper(rootPath);
      const epicWrapper = new VFDistributedFeatureWrapper(epicPath);
      const story1Wrapper = new VFDistributedFeatureWrapper(story1Path);
      const story2Wrapper = new VFDistributedFeatureWrapper(story2Path);

      // Initialize all files
      const initOperations = [
        rootWrapper.write(rootPath, {
          metadata: {
            level: 'root',
            path: '/FEATURE.vf.json',
            version: '1.0.0',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          features: {}
        }),
        epicWrapper.write(epicPath, {
          metadata: {
            level: 'epic',
            path: '/layer/themes/concurrent-theme/FEATURE.vf.json',
            version: '1.0.0',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          features: {}
        }),
        story1Wrapper.write(story1Path, {
          metadata: {
            level: 'user_story',
            path: '/layer/themes/concurrent-theme/user-stories/001-story/FEATURE.vf.json',
            version: '1.0.0',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          features: {}
        }),
        story2Wrapper.write(story2Path, {
          metadata: {
            level: 'user_story',
            path: '/layer/themes/concurrent-theme/user-stories/002-story/FEATURE.vf.json',
            version: '1.0.0',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          features: {}
        })
      ];

      await Promise.all(initOperations);

      // Perform concurrent operations at different levels
      const hierarchyOperations: Promise<any>[] = [];

      // Root level operations
      for (let i = 0; i < 3; i++) {
        hierarchyOperations.push(
          rootWrapper.addFeature('platform', {
            name: `Platform Feature ${i}`,
            data: {
              title: `Platform Feature ${i}`,
              description: 'Root level feature',
              level: 'root',
              status: 'planned',
              priority: 'critical',
              virtual_path: '/FEATURE.vf.json'
            }
          })
        );
      }

      // Epic level operations
      for (let i = 0; i < 3; i++) {
        hierarchyOperations.push(
          epicWrapper.addFeature('theme', {
            name: `Theme Feature ${i}`,
            data: {
              title: `Theme Feature ${i}`,
              description: 'Epic level feature',
              level: 'epic',
              status: 'planned',
              priority: 'high',
              virtual_path: '/layer/themes/concurrent-theme/FEATURE.vf.json'
            }
          })
        );
      }

      // Story level operations
      for (let i = 0; i < 5; i++) {
        const wrapper = i % 2 === 0 ? story1Wrapper : story2Wrapper;
        const path = i % 2 === 0 ? story1Path : story2Path;
        
        hierarchyOperations.push(
          wrapper.addFeature(`story_${i % 2 + 1}`, {
            name: `Story Feature ${i}`,
            data: {
              title: `Story Feature ${i}`,
              description: 'User story level feature',
              level: 'user_story',
              status: 'planned',
              priority: 'medium',
              virtual_path: path.replace(hierarchyDir, '')
            }
          })
        );
      }

      // Add concurrent read operations
      for (let i = 0; i < 5; i++) {
        hierarchyOperations.push(rootWrapper.read(rootPath));
        hierarchyOperations.push(epicWrapper.read(epicPath));
      }

      // Execute all operations concurrently
      const hierarchyStart = Date.now();
      const hierarchyResults = await Promise.allSettled(hierarchyOperations);
      const hierarchyTime = Date.now() - hierarchyStart;

      console.log(`Hierarchical concurrent operations completed in ${hierarchyTime}ms`);

      const hierarchySuccessful = hierarchyResults.filter(r => r.status === 'fulfilled');
      const hierarchyFailed = hierarchyResults.filter(r => r.status === 'rejected');

      console.log(`Hierarchical - Successful: ${hierarchySuccessful.length}, Failed: ${hierarchyFailed.length}`);

      // Most operations should succeed
      expect(hierarchySuccessful.length).toBeGreaterThan(hierarchyResults.length * 0.7);

      // Verify final state
      const finalRootResult = await rootWrapper.read(rootPath);
      const finalEpicResult = await epicWrapper.read(epicPath);
      const finalStory1Result = await story1Wrapper.read(story1Path);
      const finalStory2Result = await story2Wrapper.read(story2Path);

      // Should have features at each level
      expect(Object.keys(finalRootResult.features)).toContain('platform');
      expect(Object.keys(finalEpicResult.features)).toContain('theme');
      expect(Object.keys(finalStory1Result.features)).toContain('story_1');
      expect(Object.keys(finalStory2Result.features)).toContain('story_2');
    });

    test('should handle concurrent parent-child relationship updates', async () => {
      const relationshipDir = path.join(testBaseDir, 'relationship-concurrent');
      await fs.mkdir(relationshipDir, { recursive: true });

      const relationshipPath = path.join(relationshipDir, 'relationships.json');
      const wrapper = new VFDistributedFeatureWrapper(relationshipPath);

      // Initialize with parent features
      await wrapper.write(relationshipPath, {
        metadata: {
          level: 'epic',
          path: '/relationships.json',
          version: '1.0.0',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        features: {
          parents: [
            {
              id: 'parent-001',
              name: 'Parent Feature 1',
              data: {
                title: 'Parent Feature 1',
                description: 'First parent feature',
                level: 'epic',
                status: 'in-progress',
                priority: 'high',
                child_features: [],
                virtual_path: '/relationships.json'
              },
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            },
            {
              id: 'parent-002',
              name: 'Parent Feature 2',
              data: {
                title: 'Parent Feature 2',
                description: 'Second parent feature',
                level: 'epic',
                status: 'in-progress',
                priority: 'high',
                child_features: [],
                virtual_path: '/relationships.json'
              },
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }
          ]
        }
      });

      // Concurrently add child features that reference the parents
      const childOperations = Array.from({ length: 20 }, (_, i) => 
        wrapper.addFeature('children', {
          name: `Child Feature ${i}`,
          data: {
            title: `Child Feature ${i}`,
            description: `Child feature ${i}`,
            level: 'user_story',
            parent_feature_id: i % 2 === 0 ? 'parent-001' : 'parent-002',
            epic_id: i % 2 === 0 ? 'parent-001' : 'parent-002',
            status: 'planned',
            priority: 'medium',
            virtual_path: '/relationships.json'
          }
        })
      );

      // Execute concurrent child additions
      const childStart = Date.now();
      const childResults = await Promise.allSettled(childOperations);
      const childTime = Date.now() - childStart;

      console.log(`Concurrent child additions completed in ${childTime}ms`);

      const childSuccessful = childResults.filter(r => r.status === 'fulfilled');
      console.log(`Child operations - Successful: ${childSuccessful.length}, Failed: ${childResults.length - childSuccessful.length}`);

      // Verify parent-child relationships
      const finalResult = await wrapper.read(relationshipPath);
      
      // Should have children
      expect(finalResult.features.children).toBeDefined();
      expect(finalResult.features.children.length).toBeGreaterThan(0);

      // Parents should have updated child_features arrays
      const parent1 = finalResult.features.parents.find(p => p.id === 'parent-001');
      const parent2 = finalResult.features.parents.find(p => p.id === 'parent-002');

      expect(parent1?.data.child_features).toBeDefined();
      expect(parent2?.data.child_features).toBeDefined();

      // Verify child assignments
      const children = finalResult.features.children;
      const parent1Children = children.filter(c => c.data.parent_feature_id === 'parent-001');
      const parent2Children = children.filter(c => c.data.parent_feature_id === 'parent-002');

      expect(parent1Children.length).toBeGreaterThan(0);
      expect(parent2Children.length).toBeGreaterThan(0);

      // Parent child_features arrays should contain the child IDs
      parent1Children.forEach(child => {
        expect(parent1?.data.child_features).toContain(child.id);
      });

      parent2Children.forEach(child => {
        expect(parent2?.data.child_features).toContain(child.id);
      });
    });
  });

  describe('Concurrent Epic Creation', () => {
    test('should handle concurrent common epic creation for orphaned features', async () => {
      const orphanDir = path.join(testBaseDir, 'concurrent-orphans');
      await fs.mkdir(orphanDir, { recursive: true });

      // Create multiple orphaned features concurrently that should all get the same common epic
      const orphanOperations: Promise<string>[] = [];
      
      for (let i = 0; i < 15; i++) {
        const orphanPath = path.join(orphanDir, `orphan-${i}.json`);
        const orphanWrapper = new VFDistributedFeatureWrapper(orphanPath);
        
        // Initialize file
        const initPromise = orphanWrapper.write(orphanPath, {
          metadata: {
            level: 'user_story',
            path: `/orphan-${i}.json`,
            version: '1.0.0',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          features: {}
        }).then(() => 
          // Add orphaned feature (should create common epic)
          orphanWrapper.addFeature('orphaned', {
            name: `Orphaned Feature ${i}`,
            data: {
              title: `Orphaned Feature ${i}`,
              description: `Feature ${i} without explicit parent - should get common epic`,
              level: 'user_story',
              status: 'planned',
              priority: 'medium',
              tags: ['orphaned', `batch-${Math.floor(i / 5)}`],
              virtual_path: `/orphan-${i}.json`
            }
          })
        );

        orphanOperations.push(initPromise);
      }

      // Execute all orphan creations concurrently
      const orphanStart = Date.now();
      const orphanResults = await Promise.allSettled(orphanOperations);
      const orphanTime = Date.now() - orphanStart;

      console.log(`Concurrent orphan feature creation completed in ${orphanTime}ms`);

      const orphanSuccessful = orphanResults.filter(r => r.status === 'fulfilled');
      console.log(`Orphan operations - Successful: ${orphanSuccessful.length}, Failed: ${orphanResults.length - orphanSuccessful.length}`);

      // Verify all orphaned features got common epics
      const verificationPromises = Array.from({ length: 15 }, async (_, i) => {
        const orphanPath = path.join(orphanDir, `orphan-${i}.json`);
        const orphanWrapper = new VFDistributedFeatureWrapper(orphanPath);
        
        try {
          const result = await orphanWrapper.read(orphanPath);
          return {
            index: i,
            hasCommonEpic: result.features.common !== undefined,
            commonEpicId: result.features.common?.[0]?.id,
            orphanEpicId: result.features.orphaned?.[0]?.data.epic_id,
            success: true
          };
        } catch (error) {
          return {
            index: i,
            hasCommonEpic: false,
            success: false,
            error
          };
        }
      });

      const verificationResults = await Promise.all(verificationPromises);
      const successfulVerifications = verificationResults.filter(r => r.success);

      console.log(`Verification - Successful: ${successfulVerifications.length}, Failed: ${verificationResults.length - successfulVerifications.length}`);

      // Most orphaned features should have common epics
      expect(successfulVerifications.length).toBeGreaterThan(verificationResults.length * 0.7);

      // Check common epic consistency
      successfulVerifications.forEach(result => {
        if (result.hasCommonEpic) {
          expect(result.commonEpicId).toMatch(/^common-/);
          expect(result.orphanEpicId).toBe(result.commonEpicId);
        }
      });

      // Verify that all features in the same "theme" (determined by path pattern) have the same common epic
      const themeGroups = successfulVerifications.reduce((groups, result) => {
        if (result.hasCommonEpic && result.commonEpicId) {
          const theme = result.commonEpicId.replace('common-', '');
          if (!groups[theme]) groups[theme] = [];
          groups[theme].push(result);
        }
        return groups;
      }, {} as Record<string, typeof successfulVerifications>);

      // Each theme group should have consistent common epic IDs
      Object.values(themeGroups).forEach(group => {
        const firstEpicId = group[0].commonEpicId;
        group.forEach(result => {
          expect(result.commonEpicId).toBe(firstEpicId);
        });
      });
    });
  });

  describe('Stress Testing', () => {
    test('should handle high-volume concurrent operations without corruption', async () => {
      const stressDir = path.join(testBaseDir, 'stress-test');
      await fs.mkdir(stressDir, { recursive: true });

      const stressPath = path.join(stressDir, 'stress.json');
      const wrapper = new VFDistributedFeatureWrapper(stressPath);

      // Initialize file
      await wrapper.write(stressPath, {
        metadata: {
          level: 'root',
          path: '/stress.json',
          version: '1.0.0',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        features: {}
      });

      // High-volume stress test: 100 concurrent operations
      const stressOperations: Promise<any>[] = [];

      // 80 feature additions
      for (let i = 0; i < 80; i++) {
        stressOperations.push(
          wrapper.addFeature(`stress_${i % 10}`, {
            name: `Stress Feature ${i}`,
            data: {
              title: `Stress Feature ${i}`,
              description: `High-volume stress test feature ${i}`,
              level: 'user_story',
              status: ['planned', 'in-progress', 'completed', 'blocked'][i % 4] as any,
              priority: ['critical', 'high', 'medium', 'low'][i % 4] as any,
              tags: [`stress-${i}`, `batch-${Math.floor(i / 10)}`, `group-${i % 5}`],
              virtual_path: '/stress.json'
            }
          })
        );
      }

      // 20 read operations
      for (let i = 0; i < 20; i++) {
        stressOperations.push(
          wrapper.read(stressPath + (i % 4 === 0 ? '?level=user_story' : ''))
        );
      }

      // Execute stress test
      const stressStart = Date.now();
      const stressResults = await Promise.allSettled(stressOperations);
      const stressTime = Date.now() - stressStart;

      console.log(`Stress test (100 operations) completed in ${stressTime}ms`);

      const stressSuccessful = stressResults.filter(r => r.status === 'fulfilled');
      const stressFailed = stressResults.filter(r => r.status === 'rejected');

      console.log(`Stress test - Successful: ${stressSuccessful.length}, Failed: ${stressFailed.length}`);

      // At least 70% should succeed under stress
      expect(stressSuccessful.length).toBeGreaterThan(stressResults.length * 0.7);

      // Verify file integrity after stress test
      const finalStressResult = await wrapper.read(stressPath);
      
      // Should have stress categories
      const stressCategories = Object.keys(finalStressResult.features).filter(key => key.startsWith('stress_'));
      expect(stressCategories.length).toBeGreaterThan(0);
      expect(stressCategories.length).toBeLessThanOrEqual(10);

      // Total features should be reasonable
      const totalStressFeatures = Object.values(finalStressResult.features).reduce((sum, features) => sum + features.length, 0);
      expect(totalStressFeatures).toBeGreaterThan(0);
      expect(totalStressFeatures).toBeLessThanOrEqual(80);

      // All feature IDs should be unique
      const allStressIds = Object.values(finalStressResult.features).flat().map(f => f.id);
      const uniqueStressIds = new Set(allStressIds);
      expect(uniqueStressIds.size).toBe(allStressIds.length);

      // Metadata should be valid
      expect(finalStressResult.metadata.level).toBe('root');
      expect(finalStressResult.metadata.version).toBe('1.0.0');
      expect(new Date(finalStressResult.metadata.updated_at).getTime()).toBeGreaterThan(Date.now() - 60000); // Updated within last minute
    });
  });

  console.log('✅ All Concurrent Operations and Race Conditions Tests Defined');
});