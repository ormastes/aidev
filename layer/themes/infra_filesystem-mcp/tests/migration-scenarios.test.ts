import { fsPromises as fs } from '../../infra_external-log-lib/dist';
import { path } from '../../infra_external-log-lib/src';
import { VFDistributedFeatureWrapper, DistributedFeatureFile, DistributedFeature } from '../children/VFDistributedFeatureWrapper';

/**
 * Migration scenarios tests
 * Tests various migration patterns from old formats to new distributed structure
 */
describe('Migration Scenarios from Old to New Format', () => {
  const testBaseDir = path.join(__dirname, '../temp/migration');
  
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

  describe('Legacy Monolithic to Distributed Migration', () => {
    test('should migrate from single large feature file to distributed hierarchy', async () => {
      const migrationDir = path.join(testBaseDir, 'monolithic-to-distributed');
      await fs.mkdir(migrationDir, { recursive: true });

      // 1. Create legacy monolithic structure (all features in one file)
      const legacyPath = path.join(migrationDir, 'legacy-features.json');
      const legacyData = {
        version: '0.8.0',
        created: '2024-01-01T00:00:00Z',
        features: [
          // Root-level platform features
          {
            id: 'platform-001',
            title: 'Core Platform',
            description: 'Main platform infrastructure',
            type: 'platform',
            status: 'in-progress',
            priority: 'critical',
            tags: ['platform', 'core'],
            owner: 'platform-team'
          },
          
          // Authentication features (should become epic)
          {
            id: 'auth-001',
            title: 'User Authentication',
            description: 'Basic user login/logout',
            type: 'feature',
            status: 'completed',
            priority: 'critical',
            tags: ['auth', 'login'],
            owner: 'auth-team',
            parent: 'platform-001'
          },
          {
            id: 'auth-002',
            title: 'OAuth Integration',
            description: 'Third-party OAuth providers',
            type: 'feature',
            status: 'in-progress',
            priority: 'high',
            tags: ['auth', 'oauth'],
            owner: 'auth-team',
            parent: 'auth-001'
          },
          {
            id: 'auth-003',
            title: 'Multi-Factor Authentication',
            description: 'SMS and TOTP MFA',
            type: 'feature',
            status: 'planned',
            priority: 'high',
            tags: ['auth', 'mfa', 'security'],
            owner: 'auth-team',
            parent: 'auth-001'
          },
          
          // Payment features (should become epic)
          {
            id: 'pay-001',
            title: 'Payment Gateway',
            description: 'Core payment processing',
            type: 'feature',
            status: 'completed',
            priority: 'critical',
            tags: ['payments', 'gateway'],
            owner: 'payments-team',
            parent: 'platform-001'
          },
          {
            id: 'pay-002',
            title: 'Stripe Integration',
            description: 'Stripe payment processor',
            type: 'feature',
            status: 'completed',
            priority: 'high',
            tags: ['payments', 'stripe'],
            owner: 'payments-team',
            parent: 'pay-001'
          },
          {
            id: 'pay-003',
            title: 'PayPal Integration',
            description: 'PayPal payment processor',
            type: 'feature',
            status: 'planned',
            priority: 'medium',
            tags: ['payments', 'paypal'],
            owner: 'payments-team',
            parent: 'pay-001'
          },
          
          // Analytics features (should become epic)
          {
            id: 'analytics-001',
            title: 'Event Tracking',
            description: 'User event analytics',
            type: 'feature',
            status: 'in-progress',
            priority: 'medium',
            tags: ['analytics', 'tracking'],
            owner: 'analytics-team',
            parent: 'platform-001'
          },
          {
            id: 'analytics-002',
            title: 'Dashboard Reports',
            description: 'Analytics dashboard',
            type: 'feature',
            status: 'planned',
            priority: 'medium',
            tags: ['analytics', 'dashboard'],
            owner: 'analytics-team',
            parent: 'analytics-001'
          }
        ]
      };

      await fs.writeFile(legacyPath, JSON.stringify(legacyData, null, 2));

      // 2. Create migration function
      const migrateLegacyToDistributed = async (legacyFilePath: string, outputDir: string) => {
        const legacyContent = JSON.parse(await fs.readFile(legacyFilePath, 'utf-8'));
        const features = legacyContent.features;

        // Group features by domain/epic
        const featureGroups: Record<string, any[]> = {};
        const rootFeatures: any[] = [];

        features.forEach((feature: any) => {
          if (feature.type === 'platform') {
            rootFeatures.push(feature);
          } else {
            // Group by tag domain or parent
            const domain = feature.tags?.[0] || 'common';
            if (!featureGroups[domain]) featureGroups[domain] = [];
            featureGroups[domain].push(feature);
          }
        });

        // Create root FEATURE.vf.json
        const rootPath = path.join(outputDir, 'FEATURE.vf.json');
        const rootWrapper = new VFDistributedFeatureWrapper(rootPath);
        
        await rootWrapper.write(rootPath, {
          metadata: {
            level: 'root',
            path: '/FEATURE.vf.json',
            version: '2.0.0',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          features: {}
        });

        // Migrate root features
        const epicIds: Record<string, string> = {};
        for (const rootFeature of rootFeatures) {
          const platformId = await rootWrapper.addFeature('platform', {
            name: rootFeature.title,
            data: {
              title: rootFeature.title,
              description: rootFeature.description,
              level: 'root',
              status: rootFeature.status === 'in-progress' ? 'in-progress' : 
                     rootFeature.status === 'completed' ? 'completed' : 'planned',
              priority: rootFeature.priority === 'critical' ? 'critical' :
                       rootFeature.priority === 'high' ? 'high' :
                       rootFeature.priority === 'medium' ? 'medium' : 'low',
              tags: rootFeature.tags || [],
              assignee: rootFeature.owner,
              virtual_path: '/FEATURE.vf.json'
            }
          });

          // Create epics for each domain
          for (const [domain, domainFeatures] of Object.entries(featureGroups)) {
            const epicPath = path.join(outputDir, `layer/themes/${domain}/FEATURE.vf.json`);
            await fs.mkdir(path.dirname(epicPath), { recursive: true });
            
            const epicWrapper = new VFDistributedFeatureWrapper(epicPath);
            
            await epicWrapper.write(epicPath, {
              metadata: {
                level: 'epic',
                parent_id: platformId,
                path: `/layer/themes/${domain}/FEATURE.vf.json`,
                version: '2.0.0',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              },
              features: {}
            });

            const epicId = await epicWrapper.addFeature(domain.replace('-', '_'), {
              name: `${domain.charAt(0).toUpperCase() + domain.slice(1)} System`,
              data: {
                title: `${domain.charAt(0).toUpperCase() + domain.slice(1)} System`,
                description: `Migrated ${domain} features from legacy system`,
                level: 'epic',
                parent_feature_id: platformId,
                status: 'in-progress',
                priority: 'high',
                tags: [domain, 'migrated'],
                virtual_path: `/layer/themes/${domain}/FEATURE.vf.json`
              }
            });

            epicIds[domain] = epicId;

            // Create user stories for each feature in the domain
            const storyPaths: string[] = [];
            for (let i = 0; i < domainFeatures.length; i++) {
              const feature = domainFeatures[i];
              const storyNum = String(i + 1).padStart(3, '0');
              const storyName = feature.title.toLowerCase().replace(/\s+/g, '-');
              const storyPath = path.join(outputDir, `layer/themes/${domain}/user-stories/${storyNum}-${storyName}/FEATURE.vf.json`);
              
              await fs.mkdir(path.dirname(storyPath), { recursive: true });
              
              const storyWrapper = new VFDistributedFeatureWrapper(storyPath);
              
              await storyWrapper.write(storyPath, {
                metadata: {
                  level: 'user_story',
                  parent_id: epicId,
                  path: `/layer/themes/${domain}/user-stories/${storyNum}-${storyName}/FEATURE.vf.json`,
                  version: '2.0.0',
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                },
                features: {}
              });

              await storyWrapper.addFeature(storyName.replace('-', '_'), {
                name: feature.title,
                data: {
                  title: feature.title,
                  description: feature.description,
                  level: 'user_story',
                  parent_feature_id: epicId,
                  epic_id: epicId,
                  status: feature.status === 'in-progress' ? 'in-progress' : 
                         feature.status === 'completed' ? 'completed' : 'planned',
                  priority: feature.priority === 'critical' ? 'critical' :
                           feature.priority === 'high' ? 'high' :
                           feature.priority === 'medium' ? 'medium' : 'low',
                  tags: feature.tags || [],
                  assignee: feature.owner,
                  components: [`${feature.title.replace(/\s+/g, '')}.tsx`],
                  acceptanceCriteria: [
                    `${feature.title} functionality works as expected`,
                    'Migration from legacy system is complete',
                    'All existing functionality is preserved'
                  ],
                  virtual_path: `/layer/themes/${domain}/user-stories/${storyNum}-${storyName}/FEATURE.vf.json`
                }
              });

              storyPaths.push(`/layer/themes/${domain}/user-stories/${storyNum}-${storyName}/FEATURE.vf.json`);
            }

            // Update epic with children
            const epicContent = await epicWrapper.read(epicPath);
            epicContent.children = storyPaths;
            await epicWrapper.write(epicPath, epicContent);
          }

          // Update root with epic children
          const rootContent = await rootWrapper.read(rootPath);
          rootContent.children = Object.keys(featureGroups).map(domain => `/layer/themes/${domain}/FEATURE.vf.json`);
          await rootWrapper.write(rootPath, rootContent);
        }

        return { epicIds, groupCount: Object.keys(featureGroups).length };
      };

      // 3. Perform migration
      const migrationOutputDir = path.join(migrationDir, 'migrated');
      await fs.mkdir(migrationOutputDir, { recursive: true });
      
      const migrationResult = await migrateLegacyToDistributed(legacyPath, migrationOutputDir);

      // 4. Verify migration results
      const rootPath = path.join(migrationOutputDir, 'FEATURE.vf.json');
      const rootWrapper = new VFDistributedFeatureWrapper(rootPath);
      const migratedRoot = await rootWrapper.read(rootPath);

      // Should have platform feature
      expect(migratedRoot.features.platform).toHaveLength(1);
      expect(migratedRoot.features.platform[0].data.title).toBe('Core Platform');

      // Should have all epics in aggregated view
      expect(migratedRoot.aggregated_view?.auth).toHaveLength(1);
      expect(migratedRoot.aggregated_view?.payments).toHaveLength(1);
      expect(migratedRoot.aggregated_view?.analytics).toHaveLength(1);

      // Should have all user stories (3 auth + 3 payments + 2 analytics = 8 total)
      const allStoryKeys = Object.keys(migratedRoot.aggregated_view || {}).filter(key => 
        !['platform', 'auth', 'payments', 'analytics'].includes(key)
      );
      expect(allStoryKeys.length).toBe(8);

      // Verify specific migrations
      expect(migratedRoot.aggregated_view?.user_authentication).toHaveLength(1);
      expect(migratedRoot.aggregated_view?.oauth_integration).toHaveLength(1);
      expect(migratedRoot.aggregated_view?.stripe_integration).toHaveLength(1);

      // Verify statuses were preserved
      const userAuthStory = migratedRoot.aggregated_view?.user_authentication[0];
      expect(userAuthStory.data.status).toBe('completed');

      const oauthStory = migratedRoot.aggregated_view?.oauth_integration[0];
      expect(oauthStory.data.status).toBe('in-progress');

      console.log('✅ Legacy Monolithic to Distributed Migration - PASSED');
      console.log(`   📊 Migrated ${allStoryKeys.length} features across ${migrationResult.groupCount} epics`);
    });
  });

  describe('Version Migration Scenarios', () => {
    test('should migrate from v1.0 to v2.0 format with new fields', async () => {
      const versionDir = path.join(testBaseDir, 'version-migration');
      await fs.mkdir(versionDir, { recursive: true });

      // 1. Create v1.0 format files
      const v1Files = [
        {
          path: 'root-v1.json',
          content: {
            metadata: {
              level: 'root',
              path: '/root-v1.json',
              version: '1.0.0',
              created_at: '2024-06-01T10:00:00Z',
              updated_at: '2024-06-01T10:00:00Z'
            },
            features: {
              platform: [{
                id: 'platform-v1-001',
                name: 'Platform V1',
                data: {
                  title: 'Platform V1',
                  description: 'Original platform implementation',
                  level: 'root',
                  status: 'completed',
                  priority: 'critical',
                  // Missing new v2.0 fields: tags, assignee, components, acceptanceCriteria
                  virtual_path: '/root-v1.json'
                },
                createdAt: '2024-06-01T10:00:00Z',
                updatedAt: '2024-06-01T10:00:00Z'
              }]
            }
          }
        },
        {
          path: 'epic-v1.json',
          content: {
            metadata: {
              level: 'epic',
              parent_id: 'platform-v1-001',
              path: '/epic-v1.json',
              version: '1.0.0',
              created_at: '2024-06-01T10:00:00Z',
              updated_at: '2024-06-01T10:00:00Z'
            },
            features: {
              user_management: [{
                id: 'epic-v1-001',
                name: 'User Management',
                data: {
                  title: 'User Management System',
                  description: 'Basic user management',
                  level: 'epic',
                  parent_feature_id: 'platform-v1-001',
                  status: 'in-progress',
                  priority: 'high',
                  // Missing v2.0 fields
                  virtual_path: '/epic-v1.json'
                },
                createdAt: '2024-06-01T10:00:00Z',
                updatedAt: '2024-06-01T10:00:00Z'
              }]
            }
          }
        }
      ];

      // Write v1.0 files
      for (const file of v1Files) {
        const filePath = path.join(versionDir, file.path);
        await fs.writeFile(filePath, JSON.stringify(file.content, null, 2));
      }

      // 2. Create migration function for v1.0 to v2.0
      const migrateV1ToV2 = async (v1FilePath: string, v2FilePath: string) => {
        const v1Content = JSON.parse(await fs.readFile(v1FilePath, 'utf-8'));
        const wrapper = new VFDistributedFeatureWrapper(v2FilePath);

        // Update metadata to v2.0
        const v2Metadata = {
          ...v1Content.metadata,
          version: '2.0.0',
          updated_at: new Date().toISOString(),
          // New v2.0 metadata fields
          migration_source: v1FilePath,
          migration_date: new Date().toISOString(),
          backward_compatible: true
        };

        // Enhance features with new v2.0 fields
        const enhancedFeatures: Record<string, DistributedFeature[]> = {};
        
        for (const [category, features] of Object.entries(v1Content.features)) {
          enhancedFeatures[category] = (features as any[]).map(feature => ({
            ...feature,
            data: {
              ...feature.data,
              // Add missing v2.0 fields with defaults
              tags: feature.data.tags || [`migrated-${category}`, 'v1-to-v2'],
              assignee: feature.data.assignee || 'migration-team',
              components: feature.data.components || [`${feature.data.title.replace(/\s+/g, '')}.tsx`],
              acceptanceCriteria: feature.data.acceptanceCriteria || [
                'All v1.0 functionality is preserved',
                'Performance is maintained or improved',
                'Migration is transparent to users'
              ],
              // New v2.0 specific fields
              migration_notes: `Migrated from v1.0 on ${new Date().toISOString()}`,
              original_id: feature.id,
              compatibility_mode: true
            },
            updatedAt: new Date().toISOString()
          }));
        }

        // Write v2.0 file
        const v2Content: DistributedFeatureFile = {
          metadata: v2Metadata as any,
          features: enhancedFeatures,
          // New v2.0 sections
          children: v1Content.children || [],
          aggregated_view: v1Content.aggregated_view
        };

        await wrapper.write(v2FilePath, v2Content);
        return v2Content;
      };

      // 3. Perform migrations
      const migrationResults: any[] = [];
      
      for (const file of v1Files) {
        const v1Path = path.join(versionDir, file.path);
        const v2Path = path.join(versionDir, file.path.replace('-v1', '-v2'));
        
        const result = await migrateV1ToV2(v1Path, v2Path);
        migrationResults.push({ v1Path, v2Path, result });
      }

      // 4. Verify migrations
      for (const migration of migrationResults) {
        const wrapper = new VFDistributedFeatureWrapper(migration.v2Path);
        const v2Result = await wrapper.read(migration.v2Path);

        // Should have updated version
        expect(v2Result.metadata.version).toBe('2.0.0');
        expect((v2Result.metadata as any).migration_source).toBeDefined();
        expect((v2Result.metadata as any).backward_compatible).toBe(true);

        // Features should have new v2.0 fields
        for (const [category, features] of Object.entries(v2Result.features)) {
          features.forEach(feature => {
            expect(feature.data.tags).toBeDefined();
            expect(feature.data.assignee).toBeDefined();
            expect(feature.data.components).toBeDefined();
            expect(feature.data.acceptanceCriteria).toBeDefined();
            expect((feature.data as any).migration_notes).toBeDefined();
            expect((feature.data as any).original_id).toBeDefined();
            expect((feature.data as any).compatibility_mode).toBe(true);
          });
        }
      }

      console.log('✅ Version Migration (v1.0 to v2.0) - PASSED');
    });

    test('should handle incremental migrations through multiple versions', async () => {
      const incrementalDir = path.join(testBaseDir, 'incremental-migration');
      await fs.mkdir(incrementalDir, { recursive: true });

      // 1. Create migration chain: v0.5 -> v1.0 -> v1.5 -> v2.0
      const createV0_5File = async () => {
        const v05Path = path.join(incrementalDir, 'feature-v0.5.json');
        const v05Content = {
          // Very old format - minimal structure
          app_version: '0.5.0',
          timestamp: '2024-01-01T00:00:00Z',
          feature_list: [
            {
              feature_id: 'f001',
              feature_name: 'Basic Login',
              description: 'Simple username/password login',
              state: 'done',
              importance: 'high'
            },
            {
              feature_id: 'f002',
              feature_name: 'User Profile',
              description: 'Basic user profile page',
              state: 'working',
              importance: 'medium'
            }
          ]
        };
        
        await fs.writeFile(v05Path, JSON.stringify(v05Content, null, 2));
        return v05Path;
      };

      // Migration v0.5 -> v1.0
      const migrateV05ToV10 = async (v05Path: string) => {
        const v05Content = JSON.parse(await fs.readFile(v05Path, 'utf-8'));
        const v10Path = path.join(incrementalDir, 'feature-v1.0.json');
        
        const v10Content = {
          metadata: {
            level: 'root',
            path: '/feature-v1.0.json',
            version: '1.0.0',
            created_at: v05Content.timestamp,
            updated_at: new Date().toISOString()
          },
          features: {
            migrated: v05Content.feature_list.map((f: any) => ({
              id: `migrated-${f.feature_id}`,
              name: f.feature_name,
              data: {
                title: f.feature_name,
                description: f.description,
                level: 'user_story',
                status: f.state === 'done' ? 'completed' : f.state === 'working' ? 'in-progress' : 'planned',
                priority: f.importance === 'high' ? 'high' : f.importance === 'medium' ? 'medium' : 'low',
                virtual_path: '/feature-v1.0.json'
              },
              createdAt: v05Content.timestamp,
              updatedAt: new Date().toISOString()
            }))
          }
        };
        
        await fs.writeFile(v10Path, JSON.stringify(v10Content, null, 2));
        return v10Path;
      };

      // Migration v1.0 -> v1.5 (add parent-child relationships)
      const migrateV10ToV15 = async (v10Path: string) => {
        const v10Content = JSON.parse(await fs.readFile(v10Path, 'utf-8'));
        const v15Path = path.join(incrementalDir, 'feature-v1.5.json');
        
        const v15Content = {
          ...v10Content,
          metadata: {
            ...v10Content.metadata,
            version: '1.5.0',
            updated_at: new Date().toISOString()
          },
          // Add parent-child relationships in v1.5
          features: {
            ...v10Content.features,
            // Create a parent epic
            auth_system: [{
              id: 'auth-epic-001',
              name: 'Authentication System',
              data: {
                title: 'Authentication System Epic',
                description: 'Parent epic for auth-related features',
                level: 'epic',
                status: 'in-progress',
                priority: 'high',
                child_features: ['migrated-f001'], // Reference to login feature
                virtual_path: '/feature-v1.5.json'
              },
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }]
          }
        };

        // Update login feature to reference parent
        v15Content.features.migrated = v15Content.features.migrated.map((f: any) => {
          if (f.id === 'migrated-f001') {
            return {
              ...f,
              data: {
                ...f.data,
                parent_feature_id: 'auth-epic-001',
                epic_id: 'auth-epic-001'
              },
              updatedAt: new Date().toISOString()
            };
          }
          return f;
        });
        
        await fs.writeFile(v15Path, JSON.stringify(v15Content, null, 2));
        return v15Path;
      };

      // Migration v1.5 -> v2.0 (full distributed format)
      const migrateV15ToV20 = async (v15Path: string) => {
        const v15Content = JSON.parse(await fs.readFile(v15Path, 'utf-8'));
        const v20Path = path.join(incrementalDir, 'feature-v2.0.json');
        const wrapper = new VFDistributedFeatureWrapper(v20Path);
        
        const v20Content: DistributedFeatureFile = {
          metadata: {
            level: 'root',
            path: '/feature-v2.0.json',
            version: '2.0.0',
            created_at: v15Content.metadata.created_at,
            updated_at: new Date().toISOString()
          },
          features: {},
          children: []
        };

        await wrapper.write(v20Path, v20Content);

        // Add root platform feature
        const platformId = await wrapper.addFeature('platform', {
          name: 'Migrated Platform',
          data: {
            title: 'Platform Migrated Through Multiple Versions',
            description: 'Platform that went through v0.5 -> v1.0 -> v1.5 -> v2.0 migration',
            level: 'root',
            status: 'in-progress',
            priority: 'critical',
            tags: ['migrated', 'multi-version'],
            virtual_path: '/feature-v2.0.json'
          }
        });

        // Migrate auth epic
        const authEpicId = await wrapper.addFeature('auth_system', {
          name: 'Authentication System',
          data: {
            title: 'Authentication System Epic',
            description: 'Migrated authentication features with full hierarchy',
            level: 'epic',
            parent_feature_id: platformId,
            status: 'in-progress',
            priority: 'high',
            tags: ['auth', 'migrated'],
            virtual_path: '/feature-v2.0.json'
          }
        });

        // Migrate individual features
        for (const feature of v15Content.features.migrated) {
          await wrapper.addFeature('migrated_features', {
            name: feature.name,
            data: {
              title: feature.data.title,
              description: feature.data.description + ' (Migrated through multiple versions)',
              level: 'user_story',
              parent_feature_id: feature.data.parent_feature_id || authEpicId,
              epic_id: feature.data.epic_id || authEpicId,
              status: feature.data.status,
              priority: feature.data.priority,
              tags: ['migrated', 'multi-version', 'legacy'],
              components: [`${feature.name.replace(/\s+/g, '')}.tsx`],
              acceptanceCriteria: [
                'Original functionality is preserved',
                'Migration through all versions is successful',
                'No data loss during migration'
              ],
              virtual_path: '/feature-v2.0.json'
            }
          });
        }

        return v20Path;
      };

      // 2. Execute incremental migration chain
      const v05Path = await createV0_5File();
      const v10Path = await migrateV05ToV10(v05Path);
      const v15Path = await migrateV10ToV15(v10Path);
      const v20Path = await migrateV15ToV20(v15Path);

      // 3. Verify final state
      const finalWrapper = new VFDistributedFeatureWrapper(v20Path);
      const finalResult = await finalWrapper.read(v20Path);

      // Should have platform feature
      expect(finalResult.features.platform).toHaveLength(1);
      expect(finalResult.features.platform[0].data.title).toContain('Multiple Versions');

      // Should have auth system epic
      expect(finalResult.features.auth_system).toHaveLength(1);
      expect(finalResult.features.auth_system[0].data.title).toBe('Authentication System Epic');

      // Should have migrated features
      expect(finalResult.features.migrated_features).toHaveLength(2);
      expect(finalResult.features.migrated_features[0].data.description).toContain('multiple versions');

      // Should maintain version progression metadata
      expect(finalResult.metadata.version).toBe('2.0.0');

      // 4. Verify migration integrity by checking each step
      const versions = [
        { path: v05Path, expectedFeatures: 2 },
        { path: v10Path, expectedCategories: 1 },
        { path: v15Path, expectedCategories: 2 },
        { path: v20Path, expectedCategories: 3 }
      ];

      for (const version of versions) {
        const content = JSON.parse(await fs.readFile(version.path, 'utf-8'));
        if (version.expectedFeatures) {
          expect(content.feature_list).toHaveLength(version.expectedFeatures);
        } else {
          expect(Object.keys(content.features)).toHaveLength(version.expectedCategories);
        }
      }

      console.log('✅ Incremental Multi-Version Migration - PASSED');
      console.log('   📈 Successfully migrated through v0.5 -> v1.0 -> v1.5 -> v2.0');
    });
  });

  describe('Data Transformation Migration', () => {
    test('should migrate different data structures and field mappings', async () => {
      const transformDir = path.join(testBaseDir, 'data-transformation');
      await fs.mkdir(transformDir, { recursive: true });

      // 1. Create various legacy data formats to migrate
      const legacyFormats = [
        {
          name: 'jira-export',
          content: {
            issues: [
              {
                key: 'PROJ-123',
                summary: 'Implement user registration',
                description: 'Create user registration form with validation',
                status: { name: 'Done' },
                priority: { name: 'High' },
                assignee: { displayName: 'John Doe' },
                components: [{ name: 'Frontend' }, { name: 'Backend' }],
                created: '2024-03-01T09:00:00.000Z',
                updated: '2024-03-15T14:30:00.000Z'
              },
              {
                key: 'PROJ-124',
                summary: 'Add OAuth login',
                description: 'Integrate Google and GitHub OAuth',
                status: { name: 'In Progress' },
                priority: { name: 'Medium' },
                assignee: { displayName: 'Jane Smith' },
                components: [{ name: 'Auth Service' }],
                created: '2024-03-02T10:00:00.000Z',
                updated: '2024-03-20T16:45:00.000Z'
              }
            ]
          }
        },
        {
          name: 'trello-export',
          content: {
            cards: [
              {
                id: 'card-001',
                name: 'Payment Gateway Integration',
                desc: 'Integrate Stripe payment processing',
                list: { name: 'In Progress' },
                labels: [
                  { name: 'High Priority', color: 'red' },
                  { name: 'Backend', color: 'blue' }
                ],
                members: [{ fullName: 'Bob Wilson' }],
                dateLastActivity: '2024-03-10T12:00:00.000Z'
              },
              {
                id: 'card-002',
                name: 'Email Notifications',
                desc: 'Send email notifications for important events',
                list: { name: 'Todo' },
                labels: [
                  { name: 'Medium Priority', color: 'yellow' },
                  { name: 'Feature', color: 'green' }
                ],
                members: [{ fullName: 'Alice Brown' }],
                dateLastActivity: '2024-03-05T08:30:00.000Z'
              }
            ]
          }
        },
        {
          name: 'custom-tracker',
          content: {
            tasks: [
              {
                task_id: 'T001',
                title: 'Database Migration Script',
                body: 'Create script to migrate user data to new schema',
                current_state: 'completed',
                urgency_level: 1,
                team_member: 'dev-team',
                tech_stack: ['PostgreSQL', 'Node.js'],
                checklist: [
                  'Design new schema',
                  'Write migration script',
                  'Test on staging',
                  'Deploy to production'
                ],
                timestamp_created: 1709280000000,
                timestamp_modified: 1709366400000
              }
            ]
          }
        }
      ];

      // Write legacy format files
      for (const format of legacyFormats) {
        const formatPath = path.join(transformDir, `${format.name}.json`);
        await fs.writeFile(formatPath, JSON.stringify(format.content, null, 2));
      }

      // 2. Create transformation functions for each format
      const transformJiraToDistributed = async (jiraPath: string, outputPath: string) => {
        const jiraData = JSON.parse(await fs.readFile(jiraPath, 'utf-8'));
        const wrapper = new VFDistributedFeatureWrapper(outputPath);
        
        await wrapper.write(outputPath, {
          metadata: {
            level: 'epic',
            path: '/migrated-from-jira.json',
            version: '2.0.0',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          features: {}
        });

        const epicId = await wrapper.addFeature('jira_migrated', {
          name: 'Jira Migrated Epic',
          data: {
            title: 'Features Migrated from Jira',
            description: 'Epic containing features migrated from Jira export',
            level: 'epic',
            status: 'in-progress',
            priority: 'high',
            tags: ['migrated', 'jira'],
            virtual_path: '/migrated-from-jira.json'
          }
        });

        for (const issue of jiraData.issues) {
          await wrapper.addFeature('jira_features', {
            name: issue.summary,
            data: {
              title: issue.summary,
              description: issue.description,
              level: 'user_story',
              parent_feature_id: epicId,
              epic_id: epicId,
              status: issue.status.name === 'Done' ? 'completed' :
                     issue.status.name === 'In Progress' ? 'in-progress' : 'planned',
              priority: issue.priority.name === 'High' ? 'high' :
                       issue.priority.name === 'Medium' ? 'medium' : 'low',
              tags: ['jira-migrated', ...issue.components.map((c: any) => c.name.toLowerCase())],
              assignee: issue.assignee?.displayName,
              components: issue.components.map((c: any) => `${c.name}.tsx`),
              acceptanceCriteria: [
                'Jira requirements are fully implemented',
                'Original functionality is preserved',
                'Migration mapping is documented'
              ],
              virtual_path: '/migrated-from-jira.json'
            }
          });
        }
      };

      const transformTrelloToDistributed = async (trelloPath: string, outputPath: string) => {
        const trelloData = JSON.parse(await fs.readFile(trelloPath, 'utf-8'));
        const wrapper = new VFDistributedFeatureWrapper(outputPath);
        
        await wrapper.write(outputPath, {
          metadata: {
            level: 'epic',
            path: '/migrated-from-trello.json',
            version: '2.0.0',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          features: {}
        });

        const epicId = await wrapper.addFeature('trello_migrated', {
          name: 'Trello Migrated Epic',
          data: {
            title: 'Features Migrated from Trello',
            description: 'Epic containing features migrated from Trello board',
            level: 'epic',
            status: 'in-progress',
            priority: 'high',
            tags: ['migrated', 'trello'],
            virtual_path: '/migrated-from-trello.json'
          }
        });

        for (const card of trelloData.cards) {
          const priorityLabel = card.labels.find((l: any) => l.name.includes('Priority'));
          const priority = priorityLabel?.name.includes('High') ? 'high' :
                          priorityLabel?.name.includes('Medium') ? 'medium' : 'low';

          await wrapper.addFeature('trello_features', {
            name: card.name,
            data: {
              title: card.name,
              description: card.desc,
              level: 'user_story',
              parent_feature_id: epicId,
              epic_id: epicId,
              status: card.list.name === 'Done' ? 'completed' :
                     card.list.name === 'In Progress' ? 'in-progress' : 'planned',
              priority: priority as any,
              tags: ['trello-migrated', ...card.labels.map((l: any) => l.name.toLowerCase().replace(/\s+/g, '-'))],
              assignee: card.members[0]?.fullName,
              components: [`${card.name.replace(/\s+/g, '')}.tsx`],
              acceptanceCriteria: [
                'Trello card requirements are implemented',
                'All labels are converted to appropriate tags',
                'Board structure is preserved'
              ],
              virtual_path: '/migrated-from-trello.json'
            }
          });
        }
      };

      const transformCustomToDistributed = async (customPath: string, outputPath: string) => {
        const customData = JSON.parse(await fs.readFile(customPath, 'utf-8'));
        const wrapper = new VFDistributedFeatureWrapper(outputPath);
        
        await wrapper.write(outputPath, {
          metadata: {
            level: 'epic',
            path: '/migrated-from-custom.json',
            version: '2.0.0',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          features: {}
        });

        const epicId = await wrapper.addFeature('custom_migrated', {
          name: 'Custom Tracker Migrated Epic',
          data: {
            title: 'Features Migrated from Custom Tracker',
            description: 'Epic containing features from custom tracking system',
            level: 'epic',
            status: 'in-progress',
            priority: 'high',
            tags: ['migrated', 'custom-tracker'],
            virtual_path: '/migrated-from-custom.json'
          }
        });

        for (const task of customData.tasks) {
          await wrapper.addFeature('custom_features', {
            name: task.title,
            data: {
              title: task.title,
              description: task.body,
              level: 'user_story',
              parent_feature_id: epicId,
              epic_id: epicId,
              status: task.current_state === 'completed' ? 'completed' :
                     task.current_state === 'in-progress' ? 'in-progress' : 'planned',
              priority: task.urgency_level === 1 ? 'critical' :
                       task.urgency_level === 2 ? 'high' :
                       task.urgency_level === 3 ? 'medium' : 'low',
              tags: ['custom-migrated', ...task.tech_stack.map((t: string) => t.toLowerCase())],
              assignee: task.team_member,
              components: task.tech_stack.map((t: string) => `${t.replace(/[^a-zA-Z0-9]/g, '')}.ts`),
              acceptanceCriteria: task.checklist || [
                'Custom tracker requirements are met',
                'Technical stack compatibility is verified',
                'Team assignments are preserved'
              ],
              virtual_path: '/migrated-from-custom.json'
            }
          });
        }
      };

      // 3. Perform transformations
      const transformations = [
        {
          source: path.join(transformDir, 'jira-export.json'),
          target: path.join(transformDir, 'migrated-from-jira.json'),
          transform: transformJiraToDistributed
        },
        {
          source: path.join(transformDir, 'trello-export.json'),
          target: path.join(transformDir, 'migrated-from-trello.json'),
          transform: transformTrelloToDistributed
        },
        {
          source: path.join(transformDir, 'custom-tracker.json'),
          target: path.join(transformDir, 'migrated-from-custom.json'),
          transform: transformCustomToDistributed
        }
      ];

      for (const transformation of transformations) {
        await transformation.transform(transformation.source, transformation.target);
      }

      // 4. Verify transformations
      for (const transformation of transformations) {
        const wrapper = new VFDistributedFeatureWrapper(transformation.target);
        const result = await wrapper.read(transformation.target);

        // Should have migrated epic
        const epicCategory = Object.keys(result.features).find(key => key.includes('migrated'));
        expect(epicCategory).toBeDefined();
        expect(result.features[epicCategory!]).toHaveLength(1);

        // Should have features
        const featureCategory = Object.keys(result.features).find(key => key.includes('features'));
        expect(featureCategory).toBeDefined();
        expect(result.features[featureCategory!].length).toBeGreaterThan(0);

        // All features should have required fields
        result.features[featureCategory!].forEach(feature => {
          expect(feature.data.title).toBeDefined();
          expect(feature.data.description).toBeDefined();
          expect(feature.data.level).toBe('user_story');
          expect(feature.data.status).toMatch(/^(completed|in-progress|planned)$/);
          expect(feature.data.priority).toMatch(/^(critical|high|medium|low)$/);
          expect(feature.data.tags).toContain('migrated');
          expect(feature.data.virtual_path).toBeDefined();
        });
      }

      // 5. Create combined view of all migrations
      const combinedPath = path.join(transformDir, 'all-migrations-combined.json');
      const combinedWrapper = new VFDistributedFeatureWrapper(combinedPath);
      
      await combinedWrapper.write(combinedPath, {
        metadata: {
          level: 'root',
          path: '/all-migrations-combined.json',
          version: '2.0.0',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        features: {},
        children: [
          '/migrated-from-jira.json',
          '/migrated-from-trello.json',
          '/migrated-from-custom.json'
        ]
      });

      const platformId = await combinedWrapper.addFeature('platform', {
        name: 'Multi-Source Migration Platform',
        data: {
          title: 'Platform with Multi-Source Migrations',
          description: 'Platform combining features migrated from Jira, Trello, and custom tracker',
          level: 'root',
          status: 'in-progress',
          priority: 'critical',
          tags: ['platform', 'multi-migration'],
          virtual_path: '/all-migrations-combined.json'
        }
      });

      // Verify combined view
      const combinedResult = await combinedWrapper.read(combinedPath);
      expect(combinedResult.features.platform).toHaveLength(1);
      expect(combinedResult.children).toHaveLength(3);

      console.log('✅ Data Transformation Migration - PASSED');
      console.log('   🔄 Successfully migrated from Jira, Trello, and custom tracker formats');
    });
  });

  console.log('✅ All Migration Scenarios Tests Defined');
});