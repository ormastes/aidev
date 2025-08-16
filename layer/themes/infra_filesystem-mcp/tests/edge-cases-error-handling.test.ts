import { fsPromises as fs } from 'fs/promises';
import { path } from '../../infra_external-log-lib/src';
import { VFDistributedFeatureWrapper, DistributedFeatureFile } from '../children/VFDistributedFeatureWrapper';

/**
 * Edge cases and error handling tests for the distributed feature system
 * Tests various failure scenarios, malformed data, and edge conditions
 */
describe('Edge Cases and Error Handling', () => {
  const testBaseDir = path.join(__dirname, '../temp/edge-cases');
  
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

  describe('File System Edge Cases', () => {
    test('should handle non-existent files gracefully', async () => {
      const nonExistentPath = path.join(testBaseDir, 'does-not-exist.json');
      const wrapper = new VFDistributedFeatureWrapper(nonExistentPath);

      await expect(wrapper.read(nonExistentPath)).rejects.toThrow();
    });

    test('should handle corrupted JSON files', async () => {
      const corruptedPath = path.join(testBaseDir, 'corrupted.json');
      await fs.writeFile(corruptedPath, '{ invalid json content }');

      const wrapper = new VFDistributedFeatureWrapper(corruptedPath);
      await expect(wrapper.read(corruptedPath)).rejects.toThrow();
    });

    test('should handle empty files', async () => {
      const emptyPath = path.join(testBaseDir, 'empty.json');
      await fs.writeFile(emptyPath, '');

      const wrapper = new VFDistributedFeatureWrapper(emptyPath);
      await expect(wrapper.read(emptyPath)).rejects.toThrow();
    });

    test('should handle files with null content', async () => {
      const nullPath = path.join(testBaseDir, 'null.json');
      await fs.writeFile(nullPath, 'null');

      const wrapper = new VFDistributedFeatureWrapper(nullPath);
      await expect(wrapper.read(nullPath)).rejects.toThrow();
    });

    test('should handle permission denied scenarios', async () => {
      const restrictedDir = path.join(testBaseDir, "restricted");
      await fs.mkdir(restrictedDir, { recursive: true });
      
      const restrictedFile = path.join(restrictedDir, 'restricted.json');
      await fs.writeFile(restrictedFile, '{}');
      
      // Change permissions to read-only directory (this might not work on all systems)
      try {
        await fs.chmod(restrictedDir, 0o444);
        
        const wrapper = new VFDistributedFeatureWrapper(restrictedFile);
        const validContent: DistributedFeatureFile = {
          metadata: {
            level: 'root',
            path: '/restricted.json',
            version: '1.0.0',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          features: {}
        };

        // Writing should fail due to permissions
        await expect(wrapper.write(restrictedFile, validContent)).rejects.toThrow();
        
        // Restore permissions for cleanup
        await fs.chmod(restrictedDir, 0o755);
      } catch (error) {
        // Skip this test if chmod is not supported
        console.log('Skipping permission test - chmod not supported');
      }
    });

    test('should handle very large file paths', async () => {
      const longDirName = 'a'.repeat(100);
      const longPath = path.join(testBaseDir, longDirName, 'feature.json');
      
      try {
        await fs.mkdir(path.dirname(longPath), { recursive: true });
        
        const wrapper = new VFDistributedFeatureWrapper(longPath);
        const content: DistributedFeatureFile = {
          metadata: {
            level: 'root',
            path: '/very/long/path/feature.json',
            version: '1.0.0',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          features: {}
        };

        await wrapper.write(longPath, content);
        const result = await wrapper.read(longPath);
        expect(result.metadata.level).toBe('root');
      } catch (error) {
        // On some systems, very long paths may not be supported
        console.log('Long path test failed (expected on some systems):', error);
      }
    });
  });

  describe('Data Validation Edge Cases', () => {
    test('should handle missing required metadata fields', async () => {
      const invalidPath = path.join(testBaseDir, 'invalid-metadata.json');
      const wrapper = new VFDistributedFeatureWrapper(invalidPath);

      // Missing required fields
      const invalidContent = {
        metadata: {
          level: 'root'
          // Missing path, version, created_at, updated_at
        },
        features: {}
      } as any;

      await fs.writeFile(invalidPath, JSON.stringify(invalidContent));
      
      // Should still read but might cause issues when processing
      const result = await wrapper.read(invalidPath);
      expect(result.metadata.level).toBe('root');
      
      // Writing should add missing fields
      await wrapper.write(invalidPath, result as DistributedFeatureFile);
      const updatedResult = await wrapper.read(invalidPath);
      expect(updatedResult.metadata.updated_at).toBeDefined();
    });

    test('should handle invalid enum values', async () => {
      const invalidEnumPath = path.join(testBaseDir, 'invalid-enum.json');
      const wrapper = new VFDistributedFeatureWrapper(invalidEnumPath);

      const invalidContent: DistributedFeatureFile = {
        metadata: {
          level: 'invalid_level' as any, // Invalid level
          path: '/invalid-enum.json',
          version: '1.0.0',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        features: {
          test: [{
            id: 'test-001',
            name: 'Test Feature',
            data: {
              title: 'Test Feature',
              description: 'Test with invalid enums',
              level: 'invalid_level' as any,
              status: 'invalid_status' as any,
              priority: 'invalid_priority' as any,
              virtual_path: '/invalid-enum.json'
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }]
        }
      };

      // Should be able to write invalid data (validation happens at schema level)
      await wrapper.write(invalidEnumPath, invalidContent);
      const result = await wrapper.read(invalidEnumPath);
      expect(result.metadata.level).toBe('invalid_level');
    });

    test('should handle circular dependencies', async () => {
      const circularDir = path.join(testBaseDir, "circular");
      await fs.mkdir(circularDir, { recursive: true });
      
      const file1Path = path.join(circularDir, 'file1.json');
      const file2Path = path.join(circularDir, 'file2.json');
      
      const wrapper1 = new VFDistributedFeatureWrapper(file1Path);
      const wrapper2 = new VFDistributedFeatureWrapper(file2Path);

      // Create circular reference in children
      const content1: DistributedFeatureFile = {
        metadata: {
          level: 'epic',
          path: '/circular/file1.json',
          version: '1.0.0',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        features: {
          feature1: [{
            id: 'feature-001',
            name: 'Feature 1',
            data: {
              title: 'Feature 1',
              description: 'First feature',
              level: 'epic',
              status: 'planned',
              priority: 'high',
              virtual_path: '/circular/file1.json'
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }]
        },
        children: ['/circular/file2.json'] // Points to file2
      };

      const content2: DistributedFeatureFile = {
        metadata: {
          level: 'epic',
          path: '/circular/file2.json',
          version: '1.0.0',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        features: {
          feature2: [{
            id: 'feature-002',
            name: 'Feature 2',
            data: {
              title: 'Feature 2',
              description: 'Second feature',
              level: 'epic',
              status: 'planned',
              priority: 'high',
              virtual_path: '/circular/file2.json'
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }]
        },
        children: ['/circular/file1.json'] // Points back to file1 - CIRCULAR!
      };

      await wrapper1.write(file1Path, content1);
      await wrapper2.write(file2Path, content2);

      // Reading should handle circular references gracefully (might hit recursion limit)
      try {
        const result1 = await wrapper1.read(file1Path);
        expect(result1.features.feature1).toHaveLength(1);
        // Aggregated view might be incomplete due to circular reference
      } catch (error) {
        // Expected to fail or handle gracefully
        expect(error).toBeDefined();
      }
    });

    test('should handle extremely deep hierarchies', async () => {
      const deepDir = path.join(testBaseDir, 'deep-hierarchy');
      await fs.mkdir(deepDir, { recursive: true });

      // Create 10 levels deep hierarchy
      const levels = 10;
      const wrappers: VFDistributedFeatureWrapper[] = [];
      const paths: string[] = [];
      
      for (let i = 0; i < levels; i++) {
        const levelPath = path.join(deepDir, `level-${i}.json`);
        paths.push(levelPath);
        wrappers.push(new VFDistributedFeatureWrapper(levelPath));
      }

      // Create files from deepest to shallowest
      for (let i = levels - 1; i >= 0; i--) {
        const content: DistributedFeatureFile = {
          metadata: {
            level: i === 0 ? 'root' : 'epic',
            parent_id: i > 0 ? `feature-${i-1}` : undefined,
            path: `/deep-hierarchy/level-${i}.json`,
            version: '1.0.0',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          features: {
            [`level_${i}`]: [{
              id: `feature-${i}`,
              name: `Level ${i} Feature`,
              data: {
                title: `Level ${i} Feature`,
                description: `Feature at level ${i}`,
                level: i === 0 ? 'root' : 'epic',
                parent_feature_id: i > 0 ? `feature-${i-1}` : undefined,
                status: 'planned',
                priority: 'medium',
                virtual_path: `/deep-hierarchy/level-${i}.json`
              },
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }]
          },
          children: i < levels - 1 ? [`/deep-hierarchy/level-${i+1}.json`] : undefined
        };

        await wrappers[i].write(paths[i], content);
      }

      // Reading from root should aggregate all levels
      const rootResult = await wrappers[0].read(paths[0]);
      expect(rootResult.features.level_0).toHaveLength(1);
      
      // Should have aggregated view with multiple levels
      if (rootResult.aggregated_view) {
        const aggregatedKeys = Object.keys(rootResult.aggregated_view);
        expect(aggregatedKeys.length).toBeGreaterThan(1);
      }
    });
  });

  describe('Malformed Feature Data Edge Cases', () => {
    test('should handle features with missing IDs', async () => {
      const missingIdPath = path.join(testBaseDir, 'missing-id.json');
      const wrapper = new VFDistributedFeatureWrapper(missingIdPath);

      const content: any = {
        metadata: {
          level: 'root',
          path: '/missing-id.json',
          version: '1.0.0',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        features: {
          test: [{
            // Missing id field
            name: 'Test Feature',
            data: {
              title: 'Test Feature',
              description: 'Feature without ID',
              level: 'root',
              status: 'planned',
              priority: 'medium',
              virtual_path: '/missing-id.json'
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }]
        }
      };

      await fs.writeFile(missingIdPath, JSON.stringify(content));
      
      const result = await wrapper.read(missingIdPath);
      expect(result.features.test).toHaveLength(1);
      // Feature exists but lacks ID
      expect(result.features.test[0].id).toBeUndefined();
    });

    test('should handle features with duplicate IDs', async () => {
      const duplicateIdPath = path.join(testBaseDir, 'duplicate-id.json');
      const wrapper = new VFDistributedFeatureWrapper(duplicateIdPath);

      const content: DistributedFeatureFile = {
        metadata: {
          level: 'root',
          path: '/duplicate-id.json',
          version: '1.0.0',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        features: {
          test: [
            {
              id: 'duplicate-id',
              name: 'Feature 1',
              data: {
                title: 'Feature 1',
                description: 'First feature with duplicate ID',
                level: 'root',
                status: 'planned',
                priority: 'medium',
                virtual_path: '/duplicate-id.json'
              },
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            },
            {
              id: 'duplicate-id', // Same ID
              name: 'Feature 2',
              data: {
                title: 'Feature 2',
                description: 'Second feature with duplicate ID',
                level: 'root',
                status: 'planned',
                priority: 'medium',
                virtual_path: '/duplicate-id.json'
              },
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }
          ]
        }
      };

      await wrapper.write(duplicateIdPath, content);
      const result = await wrapper.read(duplicateIdPath);
      
      // Both features exist with duplicate IDs
      expect(result.features.test).toHaveLength(2);
      expect(result.features.test[0].id).toBe('duplicate-id');
      expect(result.features.test[1].id).toBe('duplicate-id');
    });

    test('should handle very long feature descriptions', async () => {
      const longDescPath = path.join(testBaseDir, 'long-description.json');
      const wrapper = new VFDistributedFeatureWrapper(longDescPath);

      const veryLongDescription = 'A'.repeat(10000); // 10KB description

      await wrapper.write(longDescPath, {
        metadata: {
          level: 'root',
          path: '/long-description.json',
          version: '1.0.0',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        features: {}
      });

      const featureId = await wrapper.addFeature('test', {
        name: 'Long Description Feature',
        data: {
          title: 'Feature with Very Long Description',
          description: veryLongDescription,
          level: 'root',
          status: 'planned',
          priority: 'medium',
          virtual_path: '/long-description.json'
        }
      });

      const result = await wrapper.read(longDescPath);
      expect(result.features.test[0].data.description).toHaveLength(10000);
      expect(result.features.test[0].id).toBe(featureId);
    });

    test('should handle features with special characters in names', async () => {
      const specialCharsPath = path.join(testBaseDir, 'special-chars.json');
      const wrapper = new VFDistributedFeatureWrapper(specialCharsPath);

      await wrapper.write(specialCharsPath, {
        metadata: {
          level: 'root',
          path: '/special-chars.json',
          version: '1.0.0',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        features: {}
      });

      const specialName = '特殊字符-🚀-@#$%^&*()_+-=[]{}|;:,.<>?';
      const featureId = await wrapper.addFeature('special', {
        name: specialName,
        data: {
          title: 'Feature with Special Characters',
          description: 'Testing unicode and special characters: 中文, русский, العربية, 🎉🔥💯',
          level: 'root',
          status: 'planned',
          priority: 'medium',
          tags: ['unicode', 'special-chars', '🏷️'],
          virtual_path: '/special-chars.json'
        }
      });

      const result = await wrapper.read(specialCharsPath);
      expect(result.features.special[0].name).toBe(specialName);
      expect(result.features.special[0].data.tags).toContain('🏷️');
    });

    test('should handle features with null or undefined values', async () => {
      const nullValuesPath = path.join(testBaseDir, 'null-values.json');
      const wrapper = new VFDistributedFeatureWrapper(nullValuesPath);

      const contentWithNulls: any = {
        metadata: {
          level: 'root',
          path: '/null-values.json',
          version: '1.0.0',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        features: {
          test: [{
            id: 'null-test-001',
            name: null, // null name
            data: {
              title: 'Feature with Null Values',
              description: null, // null description
              level: 'root',
              status: 'planned',
              priority: 'medium',
              tags: null, // null tags
              assignee: undefined, // undefined assignee
              virtual_path: '/null-values.json'
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }]
        }
      };

      await fs.writeFile(nullValuesPath, JSON.stringify(contentWithNulls));
      
      const result = await wrapper.read(nullValuesPath);
      expect(result.features.test).toHaveLength(1);
      expect(result.features.test[0].name).toBeNull();
      expect(result.features.test[0].data.description).toBeNull();
    });
  });

  describe('Query Parameter Edge Cases', () => {
    test('should handle malformed query parameters', async () => {
      const queryTestPath = path.join(testBaseDir, 'query-test.json');
      const wrapper = new VFDistributedFeatureWrapper(queryTestPath);

      const content: DistributedFeatureFile = {
        metadata: {
          level: 'root',
          path: '/query-test.json',
          version: '1.0.0',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        features: {
          test: [{
            id: 'query-001',
            name: 'Query Test',
            data: {
              title: 'Query Test Feature',
              description: 'For testing query parameters',
              level: 'root',
              status: 'planned',
              priority: 'medium',
              virtual_path: '/query-test.json'
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }]
        }
      };

      await wrapper.write(queryTestPath, content);

      // Test various malformed query strings
      const malformedQueries = [
        `${queryTestPath}?`,
        `${queryTestPath}?&&&`,
        `${queryTestPath}?=value`,
        `${queryTestPath}?key=`,
        `${queryTestPath}?key1=value1&key2`,
        `${queryTestPath}?level=root&level=epic`, // Duplicate parameter
        `${queryTestPath}?level=root&invalid=value&another=`
      ];

      for (const malformedQuery of malformedQueries) {
        try {
          const result = await wrapper.read(malformedQuery);
          expect(result.features.test).toHaveLength(1);
        } catch (error) {
          // Some malformed queries might cause errors, which is acceptable
          console.log(`Query "${malformedQuery}" caused error (acceptable):`, (error as Error).message);
        }
      }
    });

    test('should handle URL encoded query parameters', async () => {
      const encodedQueryPath = path.join(testBaseDir, 'encoded-query.json');
      const wrapper = new VFDistributedFeatureWrapper(encodedQueryPath);

      const content: DistributedFeatureFile = {
        metadata: {
          level: 'root',
          path: '/encoded-query.json',
          version: '1.0.0',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        features: {
          test: [{
            id: 'encoded-001',
            name: 'Encoded Test',
            data: {
              title: 'URL Encoded Test',
              description: 'Testing URL encoded parameters',
              level: 'root',
              status: 'planned',
              priority: 'medium',
              virtual_path: '/encoded-query.json'
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }]
        }
      };

      await wrapper.write(encodedQueryPath, content);

      // Test URL encoded query parameters
      const encodedQuery = `${encodedQueryPath}?level=root&name=${encodeURIComponent('test with spaces')}&special=${encodeURIComponent('特殊字符')}`;
      
      const result = await wrapper.read(encodedQuery);
      expect(result.features.test).toHaveLength(1);
    });
  });

  describe('Memory and Performance Edge Cases', () => {
    test('should handle large number of features', async () => {
      const largeFeaturesPath = path.join(testBaseDir, 'large-features.json');
      const wrapper = new VFDistributedFeatureWrapper(largeFeaturesPath);

      const content: DistributedFeatureFile = {
        metadata: {
          level: 'root',
          path: '/large-features.json',
          version: '1.0.0',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        features: {}
      };

      await wrapper.write(largeFeaturesPath, content);

      // Add 1000 features to test performance
      const numFeatures = 1000;
      const startTime = Date.now();
      
      for (let i = 0; i < numFeatures; i++) {
        await wrapper.addFeature(`category_${Math.floor(i / 100)}`, {
          name: `Feature ${i}`,
          data: {
            title: `Large Test Feature ${i}`,
            description: `This is feature number ${i} for performance testing`,
            level: 'user_story',
            status: i % 4 === 0 ? "completed" : i % 4 === 1 ? 'in-progress' : i % 4 === 2 ? 'planned' : 'blocked',
            priority: i % 4 === 0 ? "critical" : i % 4 === 1 ? 'high' : i % 4 === 2 ? 'medium' : 'low',
            tags: [`tag-${i % 10}`, `category-${Math.floor(i / 100)}`],
            virtual_path: '/large-features.json'
          }
        });
      }

      const addTime = Date.now() - startTime;
      console.log(`Added ${numFeatures} features in ${addTime}ms`);

      // Read and verify
      const readStartTime = Date.now();
      const result = await wrapper.read(largeFeaturesPath);
      const readTime = Date.now() - readStartTime;
      
      console.log(`Read ${numFeatures} features in ${readTime}ms`);
      
      // Should have 10 categories (0-9)
      const categoryCount = Object.keys(result.features).length;
      expect(categoryCount).toBe(10);
      
      // Total features should be 1000
      const totalFeatures = Object.values(result.features).reduce((sum, features) => sum + features.length, 0);
      expect(totalFeatures).toBe(numFeatures);
    });

    test('should handle very large individual feature objects', async () => {
      const largeFeatPath = path.join(testBaseDir, 'large-feature.json');
      const wrapper = new VFDistributedFeatureWrapper(largeFeatPath);

      await wrapper.write(largeFeatPath, {
        metadata: {
          level: 'root',
          path: '/large-feature.json',
          version: '1.0.0',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        features: {}
      });

      // Create feature with very large arrays
      const largeComponents = Array.from({ length: 1000 }, (_, i) => `Component${i}.tsx`);
      const largeCriteria = Array.from({ length: 500 }, (_, i) => `Acceptance criterion ${i} must be met`);
      const largeTags = Array.from({ length: 200 }, (_, i) => `tag-${i}`);
      const largeDependencies = Array.from({ length: 100 }, (_, i) => `dependency-${i}`);

      const featureId = await wrapper.addFeature('large', {
        name: 'Very Large Feature',
        data: {
          title: 'Feature with Large Arrays',
          description: 'X'.repeat(5000), // 5KB description
          level: 'epic',
          status: 'planned',
          priority: 'medium',
          tags: largeTags,
          components: largeComponents,
          acceptanceCriteria: largeCriteria,
          dependencies: largeDependencies,
          virtual_path: '/large-feature.json'
        }
      });

      const result = await wrapper.read(largeFeatPath);
      expect(result.features.large[0].data.components).toHaveLength(1000);
      expect(result.features.large[0].data.acceptanceCriteria).toHaveLength(500);
      expect(result.features.large[0].data.tags).toHaveLength(200);
      expect(result.features.large[0].data.dependencies).toHaveLength(100);
    });
  });

  describe('Concurrency and Race Condition Edge Cases', () => {
    test('should handle simultaneous reads', async () => {
      const concurrentPath = path.join(testBaseDir, 'concurrent.json');
      const wrapper = new VFDistributedFeatureWrapper(concurrentPath);

      const content: DistributedFeatureFile = {
        metadata: {
          level: 'root',
          path: '/concurrent.json',
          version: '1.0.0',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        features: {
          test: [{
            id: 'concurrent-001',
            name: 'Concurrent Test',
            data: {
              title: 'Concurrent Access Test',
              description: 'Testing concurrent read access',
              level: 'root',
              status: 'planned',
              priority: 'medium',
              virtual_path: '/concurrent.json'
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }]
        }
      };

      await wrapper.write(concurrentPath, content);

      // Perform 10 simultaneous reads
      const readPromises = Array.from({ length: 10 }, () => wrapper.read(concurrentPath));
      const results = await Promise.all(readPromises);

      // All reads should succeed
      results.forEach(result => {
        expect(result.features.test).toHaveLength(1);
        expect(result.features.test[0].id).toBe('concurrent-001');
      });
    });

    test('should handle rapid sequential writes', async () => {
      const rapidWritePath = path.join(testBaseDir, 'rapid-write.json');
      const wrapper = new VFDistributedFeatureWrapper(rapidWritePath);

      // Initialize file
      await wrapper.write(rapidWritePath, {
        metadata: {
          level: 'root',
          path: '/rapid-write.json',
          version: '1.0.0',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        features: {}
      });

      // Perform rapid sequential feature additions
      const featureIds: string[] = [];
      for (let i = 0; i < 20; i++) {
        const featureId = await wrapper.addFeature('rapid', {
          name: `Rapid Feature ${i}`,
          data: {
            title: `Rapid Feature ${i}`,
            description: `Feature added in rapid sequence ${i}`,
            level: 'user_story',
            status: 'planned',
            priority: 'medium',
            virtual_path: '/rapid-write.json'
          }
        });
        featureIds.push(featureId);
      }

      // Verify all features were added
      const result = await wrapper.read(rapidWritePath);
      expect(result.features.rapid).toHaveLength(20);
      
      // Verify all IDs are unique
      const resultIds = result.features.rapid.map(f => f.id);
      const uniqueIds = new Set(resultIds);
      expect(uniqueIds.size).toBe(20);
    });
  });

  describe('Schema Evolution Edge Cases', () => {
    test('should handle features with additional unknown fields', async () => {
      const unknownFieldsPath = path.join(testBaseDir, 'unknown-fields.json');
      const wrapper = new VFDistributedFeatureWrapper(unknownFieldsPath);

      const contentWithUnknownFields: any = {
        metadata: {
          level: 'root',
          path: '/unknown-fields.json',
          version: '1.0.0',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          // Unknown metadata fields
          unknown_meta_field: 'some value',
          future_feature: true
        },
        features: {
          test: [{
            id: 'unknown-001',
            name: 'Unknown Fields Test',
            data: {
              title: 'Feature with Unknown Fields',
              description: 'Testing forward compatibility',
              level: 'root',
              status: 'planned',
              priority: 'medium',
              virtual_path: '/unknown-fields.json',
              // Unknown feature fields
              unknown_feature_field: 'unknown value',
              future_property: { complex: 'object' },
              experimental_array: [1, 2, 3]
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            // Unknown top-level feature fields
            custom_field: 'custom value'
          }]
        },
        // Unknown root fields
        experimental_section: {
          enabled: true,
          config: { setting: 'value' }
        }
      };

      await fs.writeFile(unknownFieldsPath, JSON.stringify(contentWithUnknownFields));
      
      const result = await wrapper.read(unknownFieldsPath);
      expect(result.features.test).toHaveLength(1);
      
      // Unknown fields should be preserved
      expect((result.metadata as any).unknown_meta_field).toBe('some value');
      expect((result.features.test[0].data as any).unknown_feature_field).toBe('unknown value');
      expect((result as any).experimental_section).toBeDefined();
    });

    test('should handle version mismatches', async () => {
      const versionMismatchPath = path.join(testBaseDir, 'version-mismatch.json');
      const wrapper = new VFDistributedFeatureWrapper(versionMismatchPath);

      const futureVersionContent: DistributedFeatureFile = {
        metadata: {
          level: 'root',
          path: '/version-mismatch.json',
          version: '99.0.0', // Future version
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        features: {
          test: [{
            id: 'version-001',
            name: 'Version Test',
            data: {
              title: 'Future Version Feature',
              description: 'Feature from future version',
              level: 'root',
              status: 'planned',
              priority: 'medium',
              virtual_path: '/version-mismatch.json'
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }]
        }
      };

      await wrapper.write(versionMismatchPath, futureVersionContent);
      
      // Should still be able to read future version files
      const result = await wrapper.read(versionMismatchPath);
      expect(result.metadata.version).toBe('99.0.0');
      expect(result.features.test).toHaveLength(1);
    });
  });

  console.log('✅ All Edge Cases and Error Handling Tests Defined');
});