import { fsPromises as fs } from '../../infra_external-log-lib/dist';
import { path } from '../../infra_external-log-lib/src';
import { VFDistributedFeatureWrapper, DistributedFeatureFile, DistributedFeature } from '../children/VFDistributedFeatureWrapper';

/**
 * Complex hierarchical relationships tests
 * Tests advanced scenarios with deep hierarchies, cross-references, and complex dependency chains
 */
describe('Complex Hierarchical Relationships', () => {
  const testBaseDir = path.join(__dirname, '../temp/complex-hierarchy');
  
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

  describe('Multi-Level Cross-Dependencies', () => {
    test('should handle complex dependency chains across multiple levels', async () => {
      const complexDir = path.join(testBaseDir, 'multi-level-deps');
      await fs.mkdir(complexDir, { recursive: true });

      // Create complex structure:
      // Root Platform
      // ├── Infrastructure Epic
      // │   ├── Database User Story (foundation)
      // │   ├── Cache User Story (depends on database)
      // │   └── Monitoring User Story (depends on both)
      // ├── API Epic  
      // │   ├── Authentication API (depends on database)
      // │   ├── User API (depends on auth API)
      // │   └── Analytics API (depends on monitoring)
      // └── Frontend Epic
      //     ├── Login Component (depends on auth API)
      //     ├── Dashboard (depends on user API and analytics API)
      //     └── Admin Panel (depends on all previous)

      const structure = {
        infrastructure: ['001-database', '002-cache', '003-monitoring'],
        api: ['001-auth-api', '002-user-api', '003-analytics-api'],
        frontend: ['001-login', '002-dashboard', '003-admin-panel']
      };

      // Create directory structure
      for (const [epic, stories] of Object.entries(structure)) {
        await fs.mkdir(path.join(complexDir, `layer/themes/${epic}`), { recursive: true });
        for (const story of stories) {
          await fs.mkdir(path.join(complexDir, `layer/themes/${epic}/user-stories/${story}`), { recursive: true });
        }
      }

      // 1. Create root platform
      const rootPath = path.join(complexDir, 'FEATURE.vf.json');
      const rootWrapper = new VFDistributedFeatureWrapper(rootPath);
      
      await rootWrapper.write(rootPath, {
        metadata: {
          level: 'root',
          path: '/FEATURE.vf.json',
          version: '1.0.0',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        features: {}
      });

      const platformId = await rootWrapper.addFeature('platform', {
        name: 'Complex Dependency Platform',
        data: {
          title: 'Multi-Tier Platform with Complex Dependencies',
          description: 'Platform demonstrating complex dependency relationships across multiple levels',
          level: 'root',
          status: 'in-progress',
          priority: 'critical',
          tags: ['platform', 'complex', 'dependencies'],
          virtual_path: '/FEATURE.vf.json'
        }
      });

      // 2. Create Infrastructure Epic
      const infraPath = path.join(complexDir, 'layer/themes/infrastructure/FEATURE.vf.json');
      const infraWrapper = new VFDistributedFeatureWrapper(infraPath);
      
      await infraWrapper.write(infraPath, {
        metadata: {
          level: 'epic',
          parent_id: platformId,
          path: '/layer/themes/infrastructure/FEATURE.vf.json',
          version: '1.0.0',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        features: {}
      });

      const infraEpicId = await infraWrapper.addFeature('infrastructure', {
        name: 'Infrastructure',
        data: {
          title: 'Core Infrastructure Services',
          description: 'Foundation services including database, cache, and monitoring',
          level: 'epic',
          parent_feature_id: platformId,
          status: 'in-progress',
          priority: 'critical',
          tags: ['infrastructure', 'foundation'],
          virtual_path: '/layer/themes/infrastructure/FEATURE.vf.json'
        }
      });

      // 3. Create API Epic  
      const apiPath = path.join(complexDir, 'layer/themes/api/FEATURE.vf.json');
      const apiWrapper = new VFDistributedFeatureWrapper(apiPath);
      
      await apiWrapper.write(apiPath, {
        metadata: {
          level: 'epic',
          parent_id: platformId,
          path: '/layer/themes/api/FEATURE.vf.json',
          version: '1.0.0',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        features: {}
      });

      const apiEpicId = await apiWrapper.addFeature('api', {
        name: 'API Layer',
        data: {
          title: 'Application Programming Interface Layer',
          description: 'REST API services for authentication, users, and analytics',
          level: 'epic',
          parent_feature_id: platformId,
          status: 'planned',
          priority: 'high',
          tags: ['api', 'rest', 'services'],
          dependencies: [infraEpicId], // API depends on infrastructure
          virtual_path: '/layer/themes/api/FEATURE.vf.json'
        }
      });

      // 4. Create Frontend Epic
      const frontendPath = path.join(complexDir, 'layer/themes/frontend/FEATURE.vf.json');
      const frontendWrapper = new VFDistributedFeatureWrapper(frontendPath);
      
      await frontendWrapper.write(frontendPath, {
        metadata: {
          level: 'epic',
          parent_id: platformId,
          path: '/layer/themes/frontend/FEATURE.vf.json',
          version: '1.0.0',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        features: {}
      });

      const frontendEpicId = await frontendWrapper.addFeature('frontend', {
        name: 'Frontend Layer',
        data: {
          title: 'User Interface Layer',
          description: 'React-based frontend components and pages',
          level: 'epic',
          parent_feature_id: platformId,
          status: 'planned',
          priority: 'high',
          tags: ['frontend', 'react', 'ui'],
          dependencies: [apiEpicId], // Frontend depends on API
          virtual_path: '/layer/themes/frontend/FEATURE.vf.json'
        }
      });

      // 5. Create Infrastructure User Stories
      const infraStories = [
        {
          id: 'db-001', path: '001-database', name: 'Database Service',
          title: 'PostgreSQL Database Service',
          description: 'Core database service with connection pooling and migrations',
          dependencies: [], status: 'completed', priority: 'critical'
        },
        {
          id: 'cache-001', path: '002-cache', name: 'Cache Service',
          title: 'Redis Cache Service',
          description: 'Distributed caching service for performance optimization',
          dependencies: ['db-001'], status: 'completed', priority: 'high'
        },
        {
          id: 'monitor-001', path: '003-monitoring', name: 'Monitoring Service',
          title: 'Application Monitoring and Observability',
          description: 'Comprehensive monitoring with metrics, logs, and tracing',
          dependencies: ['db-001', 'cache-001'], status: 'in-progress', priority: 'high'
        }
      ];

      for (const story of infraStories) {
        const storyPath = path.join(complexDir, `layer/themes/infrastructure/user-stories/${story.path}/FEATURE.vf.json`);
        const storyWrapper = new VFDistributedFeatureWrapper(storyPath);
        
        await storyWrapper.write(storyPath, {
          metadata: {
            level: 'user_story',
            parent_id: infraEpicId,
            path: `/layer/themes/infrastructure/user-stories/${story.path}/FEATURE.vf.json`,
            version: '1.0.0',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          features: {}
        });

        await storyWrapper.addFeature(story.path.replace('-', '_'), {
          name: story.name,
          data: {
            title: story.title,
            description: story.description,
            level: 'user_story',
            parent_feature_id: infraEpicId,
            epic_id: infraEpicId,
            status: story.status as any,
            priority: story.priority as any,
            tags: ['infrastructure', story.path.split('-')[1]],
            dependencies: story.dependencies,
            components: [`${story.name.replace(' ', '')}.ts`, `${story.name.replace(' ', '')}Service.ts`],
            acceptanceCriteria: [
              `${story.name} is deployed and operational`,
              'Health checks pass consistently',
              'Performance metrics meet requirements',
              'Integration tests pass'
            ],
            virtual_path: `/layer/themes/infrastructure/user-stories/${story.path}/FEATURE.vf.json`
          }
        });
      }

      // 6. Create API User Stories
      const apiStories = [
        {
          id: 'auth-api-001', path: '001-auth-api', name: 'Authentication API',
          title: 'User Authentication REST API',
          description: 'JWT-based authentication API with login, logout, and token refresh',
          dependencies: ['db-001'], status: 'completed', priority: 'critical'
        },
        {
          id: 'user-api-001', path: '002-user-api', name: 'User Management API',
          title: 'User CRUD Operations API',
          description: 'RESTful API for user profile management and user data operations',
          dependencies: ['auth-api-001', 'cache-001'], status: 'in-progress', priority: 'high'
        },
        {
          id: 'analytics-api-001', path: '003-analytics-api', name: 'Analytics API',
          title: 'Analytics and Reporting API',
          description: 'API for collecting and retrieving analytics data and generating reports',
          dependencies: ['monitor-001', 'user-api-001'], status: 'planned', priority: 'medium'
        }
      ];

      for (const story of apiStories) {
        const storyPath = path.join(complexDir, `layer/themes/api/user-stories/${story.path}/FEATURE.vf.json`);
        const storyWrapper = new VFDistributedFeatureWrapper(storyPath);
        
        await storyWrapper.write(storyPath, {
          metadata: {
            level: 'user_story',
            parent_id: apiEpicId,
            path: `/layer/themes/api/user-stories/${story.path}/FEATURE.vf.json`,
            version: '1.0.0',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          features: {}
        });

        await storyWrapper.addFeature(story.path.replace('-', '_'), {
          name: story.name,
          data: {
            title: story.title,
            description: story.description,
            level: 'user_story',
            parent_feature_id: apiEpicId,
            epic_id: apiEpicId,
            status: story.status as any,
            priority: story.priority as any,
            tags: ['api', 'rest', story.path.split('-')[0]],
            dependencies: story.dependencies,
            components: [`${story.name.replace(' ', '').replace('API', 'Api')}.ts`, `${story.name.replace(' ', '').replace('API', '')}Controller.ts`],
            acceptanceCriteria: [
              'API endpoints are documented with OpenAPI/Swagger',
              'Authentication and authorization work correctly',
              'Error handling follows API standards',
              'Rate limiting is implemented',
              'API tests achieve >90% coverage'
            ],
            virtual_path: `/layer/themes/api/user-stories/${story.path}/FEATURE.vf.json`
          }
        });
      }

      // 7. Create Frontend User Stories
      const frontendStories = [
        {
          id: 'login-001', path: '001-login', name: 'Login Component',
          title: 'User Login Interface',
          description: 'React component for user authentication with form validation',
          dependencies: ['auth-api-001'], status: 'completed', priority: 'critical'
        },
        {
          id: 'dashboard-001', path: '002-dashboard', name: 'User Dashboard',
          title: 'Main User Dashboard',
          description: 'Central dashboard showing user data and analytics insights',
          dependencies: ['user-api-001', 'analytics-api-001'], status: 'in-progress', priority: 'high'
        },
        {
          id: 'admin-panel-001', path: '003-admin-panel', name: 'Admin Panel',
          title: 'Administrative Management Panel',
          description: 'Comprehensive admin interface for system management',
          dependencies: ['login-001', 'dashboard-001', 'monitor-001'], status: 'planned', priority: 'medium'
        }
      ];

      for (const story of frontendStories) {
        const storyPath = path.join(complexDir, `layer/themes/frontend/user-stories/${story.path}/FEATURE.vf.json`);
        const storyWrapper = new VFDistributedFeatureWrapper(storyPath);
        
        await storyWrapper.write(storyPath, {
          metadata: {
            level: 'user_story',
            parent_id: frontendEpicId,
            path: `/layer/themes/frontend/user-stories/${story.path}/FEATURE.vf.json`,
            version: '1.0.0',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          features: {}
        });

        await storyWrapper.addFeature(story.path.replace('-', '_'), {
          name: story.name,
          data: {
            title: story.title,
            description: story.description,
            level: 'user_story',
            parent_feature_id: frontendEpicId,
            epic_id: frontendEpicId,
            status: story.status as any,
            priority: story.priority as any,
            tags: ['frontend', 'react', story.path.split('-')[0]],
            dependencies: story.dependencies,
            components: [`${story.name.replace(' ', '')}.tsx`, `${story.name.replace(' ', '')}Container.tsx`, `use${story.name.replace(' ', '')}.ts`],
            acceptanceCriteria: [
              'Component renders correctly on all screen sizes',
              'Accessibility standards (WCAG 2.1) are met',
              'Loading and error states are handled',
              'Unit tests achieve >95% coverage',
              'E2E tests cover critical user flows'
            ],
            virtual_path: `/layer/themes/frontend/user-stories/${story.path}/FEATURE.vf.json`
          }
        });
      }

      // 8. Update all parent references
      const rootContent = await rootWrapper.read(rootPath);
      rootContent.children = [
        '/layer/themes/infrastructure/FEATURE.vf.json',
        '/layer/themes/api/FEATURE.vf.json',
        '/layer/themes/frontend/FEATURE.vf.json'
      ];
      await rootWrapper.write(rootPath, rootContent);

      // Update infrastructure children
      const infraContent = await infraWrapper.read(infraPath);
      infraContent.children = infraStories.map(story => `/layer/themes/infrastructure/user-stories/${story.path}/FEATURE.vf.json`);
      await infraWrapper.write(infraPath, infraContent);

      // Update API children
      const apiContent = await apiWrapper.read(apiPath);
      apiContent.children = apiStories.map(story => `/layer/themes/api/user-stories/${story.path}/FEATURE.vf.json`);
      await apiWrapper.write(apiPath, apiContent);

      // Update frontend children
      const frontendContent = await frontendWrapper.read(frontendPath);
      frontendContent.children = frontendStories.map(story => `/layer/themes/frontend/user-stories/${story.path}/FEATURE.vf.json`);
      await frontendWrapper.write(frontendPath, frontendContent);

      // 9. Verify complex dependency chain
      const finalRootResult = await rootWrapper.read(rootPath);
      
      // Should have all 3 epics
      expect(finalRootResult.aggregated_view?.infrastructure).toHaveLength(1);
      expect(finalRootResult.aggregated_view?.api).toHaveLength(1);
      expect(finalRootResult.aggregated_view?.frontend).toHaveLength(1);

      // Should have all 9 user stories (3 per epic)
      const allUserStories = Object.keys(finalRootResult.aggregated_view || {}).filter(key => 
        key.includes('001_') || key.includes('002_') || key.includes('003_')
      );
      expect(allUserStories.length).toBe(9);

      // Verify dependency chain integrity
      const apiEpic = finalRootResult.aggregated_view?.api[0];
      expect(apiEpic.data.dependencies).toContain(infraEpicId);

      const frontendEpic = finalRootResult.aggregated_view?.frontend[0];
      expect(frontendEpic.data.dependencies).toContain(apiEpicId);

      // Verify cross-story dependencies
      const userApiStory = finalRootResult.aggregated_view?.['002_user_api'][0];
      expect(userApiStory.data.dependencies).toContain('auth-api-001');
      expect(userApiStory.data.dependencies).toContain('cache-001');

      const dashboardStory = finalRootResult.aggregated_view?.['002_dashboard'][0];
      expect(dashboardStory.data.dependencies).toContain('user-api-001');
      expect(dashboardStory.data.dependencies).toContain('analytics-api-001');

      const adminPanelStory = finalRootResult.aggregated_view?.['003_admin_panel'][0];
      expect(adminPanelStory.data.dependencies).toContain('login-001');
      expect(adminPanelStory.data.dependencies).toContain('dashboard-001');
      expect(adminPanelStory.data.dependencies).toContain('monitor-001');

      console.log('✅ Complex Multi-Level Cross-Dependencies - PASSED');
    });
  });

  describe('Dynamic Epic Creation with Complex Relationships', () => {
    test('should create common epics with proper hierarchy when features are orphaned', async () => {
      const dynamicDir = path.join(testBaseDir, 'dynamic-epics');
      await fs.mkdir(dynamicDir, { recursive: true });

      // Create scenarios where features at different levels need common epics
      const scenarios = [
        { theme: 'orphaned-theme-1', stories: ['001-lonely', '002-isolated'] },
        { theme: 'orphaned-theme-2', stories: ['001-standalone', '002-solo', '003-independent'] },
        { theme: 'mixed-theme', stories: ['001-with-epic', '002-without-epic'] }
      ];

      // Create directory structure
      for (const scenario of scenarios) {
        await fs.mkdir(path.join(dynamicDir, `layer/themes/${scenario.theme}`), { recursive: true });
        for (const story of scenario.stories) {
          await fs.mkdir(path.join(dynamicDir, `layer/themes/${scenario.theme}/user-stories/${story}`), { recursive: true });
        }
      }

      // 1. Create root platform
      const rootPath = path.join(dynamicDir, 'FEATURE.vf.json');
      const rootWrapper = new VFDistributedFeatureWrapper(rootPath);
      
      await rootWrapper.write(rootPath, {
        metadata: {
          level: 'root',
          path: '/FEATURE.vf.json',
          version: '1.0.0',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        features: {}
      });

      const platformId = await rootWrapper.addFeature('platform', {
        name: 'Dynamic Epic Platform',
        data: {
          title: 'Platform with Dynamic Epic Creation',
          description: 'Demonstrates automatic common epic creation for orphaned features',
          level: 'root',
          status: 'in-progress',
          priority: 'high',
          tags: ['dynamic', 'epics', 'platform'],
          virtual_path: '/FEATURE.vf.json'
        }
      });

      // 2. Create orphaned theme 1 - no explicit epic, multiple orphaned stories
      for (let i = 0; i < 2; i++) {
        const storyNum = String(i + 1).padStart(3, '0');
        const storyPath = path.join(dynamicDir, `layer/themes/orphaned-theme-1/user-stories/${storyNum}-${i === 0 ? 'lonely' : 'isolated'}/FEATURE.vf.json`);
        const storyWrapper = new VFDistributedFeatureWrapper(storyPath);
        
        await storyWrapper.write(storyPath, {
          metadata: {
            level: 'user_story',
            path: `/layer/themes/orphaned-theme-1/user-stories/${storyNum}-${i === 0 ? 'lonely' : 'isolated'}/FEATURE.vf.json`,
            version: '1.0.0',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          features: {}
        });

        await storyWrapper.addFeature(`orphaned_${i + 1}`, {
          name: `Orphaned Feature ${i + 1}`,
          data: {
            title: `Orphaned Feature ${i + 1} in Theme 1`,
            description: `Feature without explicit parent epic - should get common epic`,
            level: 'user_story',
            status: 'planned',
            priority: 'medium',
            tags: ['orphaned', 'theme-1'],
            virtual_path: `/layer/themes/orphaned-theme-1/user-stories/${storyNum}-${i === 0 ? 'lonely' : 'isolated'}/FEATURE.vf.json`
          }
        });
      }

      // 3. Create orphaned theme 2 - no explicit epic, multiple orphaned stories
      for (let i = 0; i < 3; i++) {
        const storyNum = String(i + 1).padStart(3, '0');
        const storyNames = ['standalone', 'solo', 'independent'];
        const storyPath = path.join(dynamicDir, `layer/themes/orphaned-theme-2/user-stories/${storyNum}-${storyNames[i]}/FEATURE.vf.json`);
        const storyWrapper = new VFDistributedFeatureWrapper(storyPath);
        
        await storyWrapper.write(storyPath, {
          metadata: {
            level: 'user_story',
            path: `/layer/themes/orphaned-theme-2/user-stories/${storyNum}-${storyNames[i]}/FEATURE.vf.json`,
            version: '1.0.0',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          features: {}
        });

        await storyWrapper.addFeature(`theme2_${storyNames[i]}`, {
          name: `${storyNames[i].charAt(0).toUpperCase() + storyNames[i].slice(1)} Feature`,
          data: {
            title: `${storyNames[i].charAt(0).toUpperCase() + storyNames[i].slice(1)} Feature in Theme 2`,
            description: `Another orphaned feature - should get same common epic as siblings`,
            level: 'user_story',
            status: 'planned',
            priority: 'medium',
            tags: ['orphaned', 'theme-2', storyNames[i]],
            virtual_path: `/layer/themes/orphaned-theme-2/user-stories/${storyNum}-${storyNames[i]}/FEATURE.vf.json`
          }
        });
      }

      // 4. Create mixed theme - has explicit epic AND orphaned stories
      const mixedEpicPath = path.join(dynamicDir, 'layer/themes/mixed-theme/FEATURE.vf.json');
      const mixedEpicWrapper = new VFDistributedFeatureWrapper(mixedEpicPath);
      
      await mixedEpicWrapper.write(mixedEpicPath, {
        metadata: {
          level: 'epic',
          parent_id: platformId,
          path: '/layer/themes/mixed-theme/FEATURE.vf.json',
          version: '1.0.0',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        features: {}
      });

      const mixedEpicId = await mixedEpicWrapper.addFeature('mixed_epic', {
        name: 'Mixed Theme Epic',
        data: {
          title: 'Explicit Epic in Mixed Theme',
          description: 'This epic coexists with orphaned features in the same theme',
          level: 'epic',
          parent_feature_id: platformId,
          status: 'in-progress',
          priority: 'high',
          tags: ['mixed', 'explicit-epic'],
          virtual_path: '/layer/themes/mixed-theme/FEATURE.vf.json'
        }
      });

      // Story 1: Has explicit epic parent
      const withEpicPath = path.join(dynamicDir, 'layer/themes/mixed-theme/user-stories/001-with-epic/FEATURE.vf.json');
      const withEpicWrapper = new VFDistributedFeatureWrapper(withEpicPath);
      
      await withEpicWrapper.write(withEpicPath, {
        metadata: {
          level: 'user_story',
          parent_id: mixedEpicId,
          path: '/layer/themes/mixed-theme/user-stories/001-with-epic/FEATURE.vf.json',
          version: '1.0.0',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        features: {}
      });

      await withEpicWrapper.addFeature('with_epic', {
        name: 'Feature with Epic',
        data: {
          title: 'Feature that belongs to explicit epic',
          description: 'This feature has a proper parent epic',
          level: 'user_story',
          parent_feature_id: mixedEpicId,
          epic_id: mixedEpicId,
          status: 'completed',
          priority: 'high',
          tags: ['mixed', 'with-epic'],
          virtual_path: '/layer/themes/mixed-theme/user-stories/001-with-epic/FEATURE.vf.json'
        }
      });

      // Story 2: Orphaned (should get common epic)
      const withoutEpicPath = path.join(dynamicDir, 'layer/themes/mixed-theme/user-stories/002-without-epic/FEATURE.vf.json');
      const withoutEpicWrapper = new VFDistributedFeatureWrapper(withoutEpicPath);
      
      await withoutEpicWrapper.write(withoutEpicPath, {
        metadata: {
          level: 'user_story',
          path: '/layer/themes/mixed-theme/user-stories/002-without-epic/FEATURE.vf.json',
          version: '1.0.0',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        features: {}
      });

      await withoutEpicWrapper.addFeature('without_epic', {
        name: 'Orphaned Feature in Mixed Theme',
        data: {
          title: 'Orphaned feature in theme with explicit epic',
          description: 'This feature should get a common epic despite theme having explicit epic',
          level: 'user_story',
          status: 'planned',
          priority: 'medium',
          tags: ['mixed', 'orphaned'],
          virtual_path: '/layer/themes/mixed-theme/user-stories/002-without-epic/FEATURE.vf.json'
        }
      });

      // 5. Read orphaned stories to verify common epic creation
      const orphan1Path = path.join(dynamicDir, 'layer/themes/orphaned-theme-1/user-stories/001-lonely/FEATURE.vf.json');
      const orphan1Wrapper = new VFDistributedFeatureWrapper(orphan1Path);
      const orphan1Result = await orphan1Wrapper.read(orphan1Path);

      const orphan2Path = path.join(dynamicDir, 'layer/themes/orphaned-theme-1/user-stories/002-isolated/FEATURE.vf.json');
      const orphan2Wrapper = new VFDistributedFeatureWrapper(orphan2Path);
      const orphan2Result = await orphan2Wrapper.read(orphan2Path);

      const theme2Story1Path = path.join(dynamicDir, 'layer/themes/orphaned-theme-2/user-stories/001-standalone/FEATURE.vf.json');
      const theme2Story1Wrapper = new VFDistributedFeatureWrapper(theme2Story1Path);
      const theme2Story1Result = await theme2Story1Wrapper.read(theme2Story1Path);

      const mixedOrphanResult = await withoutEpicWrapper.read(withoutEpicPath);

      // 6. Verify common epic creation and relationships
      // Theme 1 orphans should share same common epic
      expect(orphan1Result.features.common).toBeDefined();
      expect(orphan2Result.features.common).toBeDefined();
      expect(orphan1Result.features.common[0].id).toBe('common-orphaned_theme_1');
      expect(orphan2Result.features.common[0].id).toBe('common-orphaned_theme_1');
      
      // Both orphaned features should reference the same common epic
      expect(orphan1Result.features.orphaned_1[0].data.epic_id).toBe('common-orphaned_theme_1');
      expect(orphan2Result.features.orphaned_2[0].data.epic_id).toBe('common-orphaned_theme_1');

      // Theme 2 should have its own common epic
      expect(theme2Story1Result.features.common).toBeDefined();
      expect(theme2Story1Result.features.common[0].id).toBe('common-orphaned_theme_2');
      expect(theme2Story1Result.features.theme2_standalone[0].data.epic_id).toBe('common-orphaned_theme_2');

      // Mixed theme orphan should get common epic despite explicit epic existing
      expect(mixedOrphanResult.features.common).toBeDefined();
      expect(mixedOrphanResult.features.common[0].id).toBe('common-mixed_theme');
      expect(mixedOrphanResult.features.without_epic[0].data.epic_id).toBe('common-mixed_theme');

      // Feature with explicit epic should NOT have common epic
      const withEpicResult = await withEpicWrapper.read(withEpicPath);
      expect(withEpicResult.features.with_epic[0].data.epic_id).toBe(mixedEpicId);
      expect(withEpicResult.features.with_epic[0].data.parent_feature_id).toBe(mixedEpicId);

      // 7. Verify common epic properties
      const commonEpic1 = orphan1Result.features.common[0];
      expect(commonEpic1.data.level).toBe('epic');
      expect(commonEpic1.data.title).toBe('Common Features - orphaned_theme_1');
      expect(commonEpic1.data.tags).toContain('auto-generated');
      expect(commonEpic1.data.tags).toContain('common');
      expect(commonEpic1.data.status).toBe('in-progress');

      const commonEpic2 = theme2Story1Result.features.common[0];
      expect(commonEpic2.data.title).toBe('Common Features - orphaned_theme_2');
      expect(commonEpic2.id).toBe('common-orphaned_theme_2');

      const commonEpic3 = mixedOrphanResult.features.common[0];
      expect(commonEpic3.data.title).toBe('Common Features - mixed_theme');
      expect(commonEpic3.id).toBe('common-mixed_theme');

      console.log('✅ Dynamic Epic Creation with Complex Relationships - PASSED');
    });
  });

  describe('Multi-Epic Theme with Cross-Epic Dependencies', () => {
    test('should handle themes with multiple epics and cross-epic feature dependencies', async () => {
      const multiEpicDir = path.join(testBaseDir, 'multi-epic-theme');
      await fs.mkdir(multiEpicDir, { recursive: true });

      // Create a complex e-commerce theme with multiple epics:
      // Theme: e-commerce
      // ├── Epic: user-management (identity, profiles, preferences)
      // ├── Epic: product-catalog (products, categories, search)
      // ├── Epic: order-processing (cart, checkout, payment)
      // └── Epic: support-system (tickets, chat, knowledge-base)
      // With cross-epic dependencies between features

      const epics = [
        { name: 'user-management', stories: ['001-identity', '002-profiles', '003-preferences'] },
        { name: 'product-catalog', stories: ['001-products', '002-categories', '003-search'] },
        { name: 'order-processing', stories: ['001-cart', '002-checkout', '003-payment'] },
        { name: 'support-system', stories: ['001-tickets', '002-chat', '003-knowledge-base'] }
      ];

      // Create directory structure
      const themeName = 'e-commerce';
      for (const epic of epics) {
        await fs.mkdir(path.join(multiEpicDir, `layer/themes/${themeName}/epics/${epic.name}`), { recursive: true });
        for (const story of epic.stories) {
          await fs.mkdir(path.join(multiEpicDir, `layer/themes/${themeName}/epics/${epic.name}/user-stories/${story}`), { recursive: true });
        }
      }

      // 1. Create root platform
      const rootPath = path.join(multiEpicDir, 'FEATURE.vf.json');
      const rootWrapper = new VFDistributedFeatureWrapper(rootPath);
      
      await rootWrapper.write(rootPath, {
        metadata: {
          level: 'root',
          path: '/FEATURE.vf.json',
          version: '1.0.0',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        features: {}
      });

      const platformId = await rootWrapper.addFeature('platform', {
        name: 'E-commerce Platform',
        data: {
          title: 'Multi-Epic E-commerce Platform',
          description: 'Complex e-commerce platform with multiple epics and cross-dependencies',
          level: 'root',
          status: 'in-progress',
          priority: 'critical',
          tags: ['e-commerce', 'multi-epic', 'platform'],
          virtual_path: '/FEATURE.vf.json'
        }
      });

      // 2. Create theme-level epic coordination feature
      const themeEpicPath = path.join(multiEpicDir, `layer/themes/${themeName}/FEATURE.vf.json`);
      const themeEpicWrapper = new VFDistributedFeatureWrapper(themeEpicPath);
      
      await themeEpicWrapper.write(themeEpicPath, {
        metadata: {
          level: 'epic',
          parent_id: platformId,
          path: `/layer/themes/${themeName}/FEATURE.vf.json`,
          version: '1.0.0',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        features: {}
      });

      const themeCoordinatorId = await themeEpicWrapper.addFeature('ecommerce_coordinator', {
        name: 'E-commerce Coordinator',
        data: {
          title: 'E-commerce Theme Coordinator',
          description: 'Coordinates multiple epics within the e-commerce theme',
          level: 'epic',
          parent_feature_id: platformId,
          status: 'in-progress',
          priority: 'critical',
          tags: ['coordinator', 'theme-level'],
          virtual_path: `/layer/themes/${themeName}/FEATURE.vf.json`
        }
      });

      // 3. Create sub-epics
      const epicIds: Record<string, string> = {};
      
      for (const epic of epics) {
        const epicPath = path.join(multiEpicDir, `layer/themes/${themeName}/epics/${epic.name}/FEATURE.vf.json`);
        const epicWrapper = new VFDistributedFeatureWrapper(epicPath);
        
        await epicWrapper.write(epicPath, {
          metadata: {
            level: 'epic',
            parent_id: themeCoordinatorId,
            path: `/layer/themes/${themeName}/epics/${epic.name}/FEATURE.vf.json`,
            version: '1.0.0',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          features: {}
        });

        const epicPriority = epic.name === 'user-management' ? 'critical' :
                           epic.name === 'product-catalog' ? 'high' :
                           epic.name === 'order-processing' ? 'high' : 'medium';

        const epicStatus = epic.name === 'user-management' ? 'completed' :
                          epic.name === 'product-catalog' ? 'in-progress' :
                          epic.name === 'order-processing' ? 'planned' : 'planned';

        const epicId = await epicWrapper.addFeature(epic.name.replace('-', '_'), {
          name: epic.name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
          data: {
            title: `${epic.name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} Epic`,
            description: `Sub-epic handling ${epic.name.replace('-', ' ')} within e-commerce theme`,
            level: 'epic',
            parent_feature_id: themeCoordinatorId,
            status: epicStatus as any,
            priority: epicPriority as any,
            tags: ['sub-epic', epic.name],
            virtual_path: `/layer/themes/${themeName}/epics/${epic.name}/FEATURE.vf.json`
          }
        });
        
        epicIds[epic.name] = epicId;
      }

      // 4. Create user stories with complex cross-epic dependencies
      const storyDefinitions = {
        'user-management': {
          '001-identity': {
            title: 'User Identity Management',
            description: 'Core user authentication and identity services',
            dependencies: [], priority: 'critical', status: 'completed'
          },
          '002-profiles': {
            title: 'User Profile Management',
            description: 'User profile creation and management',
            dependencies: ['identity-001'], priority: 'high', status: 'completed'
          },
          '003-preferences': {
            title: 'User Preferences',
            description: 'User preference settings and customization',
            dependencies: ['profiles-001'], priority: 'medium', status: 'in-progress'
          }
        },
        'product-catalog': {
          '001-products': {
            title: 'Product Management',
            description: 'Product CRUD operations and inventory',
            dependencies: ['identity-001'], priority: 'critical', status: 'completed'
          },
          '002-categories': {
            title: 'Category Management',
            description: 'Product categorization and taxonomy',
            dependencies: ['products-001'], priority: 'high', status: 'in-progress'
          },
          '003-search': {
            title: 'Product Search',
            description: 'Advanced product search and filtering',
            dependencies: ['products-001', 'categories-001', 'preferences-001'], priority: 'high', status: 'planned'
          }
        },
        'order-processing': {
          '001-cart': {
            title: 'Shopping Cart',
            description: 'Shopping cart functionality and persistence',
            dependencies: ['identity-001', 'products-001'], priority: 'critical', status: 'planned'
          },
          '002-checkout': {
            title: 'Checkout Process',
            description: 'Multi-step checkout workflow',
            dependencies: ['cart-001', 'profiles-001'], priority: 'critical', status: 'planned'
          },
          '003-payment': {
            title: 'Payment Processing',
            description: 'Secure payment processing and transactions',
            dependencies: ['checkout-001'], priority: 'critical', status: 'planned'
          }
        },
        'support-system': {
          '001-tickets': {
            title: 'Support Tickets',
            description: 'Customer support ticket management',
            dependencies: ['identity-001', 'profiles-001'], priority: 'medium', status: 'planned'
          },
          '002-chat': {
            title: 'Live Chat Support',
            description: 'Real-time customer support chat',
            dependencies: ['tickets-001'], priority: 'medium', status: 'planned'
          },
          '003-knowledge-base': {
            title: 'Knowledge Base',
            description: 'Self-service knowledge base and FAQs',
            dependencies: ['products-001', 'categories-001'], priority: 'low', status: 'planned'
          }
        }
      };

      // Create all user stories
      for (const epic of epics) {
        const epicChildrenPaths: string[] = [];
        
        for (const story of epic.stories) {
          const storyPath = path.join(multiEpicDir, `layer/themes/${themeName}/epics/${epic.name}/user-stories/${story}/FEATURE.vf.json`);
          const storyWrapper = new VFDistributedFeatureWrapper(storyPath);
          
          await storyWrapper.write(storyPath, {
            metadata: {
              level: 'user_story',
              parent_id: epicIds[epic.name],
              path: `/layer/themes/${themeName}/epics/${epic.name}/user-stories/${story}/FEATURE.vf.json`,
              version: '1.0.0',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            },
            features: {}
          });

          const storyData = storyDefinitions[epic.name as keyof typeof storyDefinitions][story as keyof typeof storyDefinitions['user-management']];
          const storyId = `${story.split('-')[1]}-001`;

          await storyWrapper.addFeature(story.replace('-', '_'), {
            name: storyData.title,
            data: {
              title: storyData.title,
              description: storyData.description,
              level: 'user_story',
              parent_feature_id: epicIds[epic.name],
              epic_id: epicIds[epic.name],
              status: storyData.status as any,
              priority: storyData.priority as any,
              tags: [epic.name, story.split('-')[1]],
              dependencies: storyData.dependencies,
              components: [`${storyData.title.replace(/\s+/g, '')}.tsx`, `${storyData.title.replace(/\s+/g, '')}Service.ts`],
              acceptanceCriteria: [
                `${storyData.title} functionality works correctly`,
                'Cross-epic dependencies are properly handled',
                'Integration tests pass with dependent features',
                'Performance requirements are met'
              ],
              virtual_path: `/layer/themes/${themeName}/epics/${epic.name}/user-stories/${story}/FEATURE.vf.json`
            }
          });

          epicChildrenPaths.push(`/layer/themes/${themeName}/epics/${epic.name}/user-stories/${story}/FEATURE.vf.json`);
        }

        // Update epic with children
        const epicPath = path.join(multiEpicDir, `layer/themes/${themeName}/epics/${epic.name}/FEATURE.vf.json`);
        const epicWrapper = new VFDistributedFeatureWrapper(epicPath);
        const epicContent = await epicWrapper.read(epicPath);
        epicContent.children = epicChildrenPaths;
        await epicWrapper.write(epicPath, epicContent);
      }

      // 5. Update theme coordinator with all epic children
      const themeContent = await themeEpicWrapper.read(themeEpicPath);
      themeContent.children = epics.map(epic => `/layer/themes/${themeName}/epics/${epic.name}/FEATURE.vf.json`);
      await themeEpicWrapper.write(themeEpicPath, themeContent);

      // Update root with theme
      const rootContent = await rootWrapper.read(rootPath);
      rootContent.children = [`/layer/themes/${themeName}/FEATURE.vf.json`];
      await rootWrapper.write(rootPath, rootContent);

      // 6. Verify complex multi-epic structure
      const finalRootResult = await rootWrapper.read(rootPath);
      
      // Should have theme coordinator
      expect(finalRootResult.aggregated_view?.ecommerce_coordinator).toHaveLength(1);
      
      // Should have all 4 sub-epics
      expect(finalRootResult.aggregated_view?.user_management).toHaveLength(1);
      expect(finalRootResult.aggregated_view?.product_catalog).toHaveLength(1);
      expect(finalRootResult.aggregated_view?.order_processing).toHaveLength(1);
      expect(finalRootResult.aggregated_view?.support_system).toHaveLength(1);

      // Should have all 12 user stories (4 epics × 3 stories each)
      const allStoryKeys = Object.keys(finalRootResult.aggregated_view || {}).filter(key => 
        key.includes('001_') || key.includes('002_') || key.includes('003_')
      );
      expect(allStoryKeys.length).toBe(12);

      // 7. Verify cross-epic dependencies
      const searchStory = finalRootResult.aggregated_view?.['003_search'][0];
      expect(searchStory.data.dependencies).toContain('products-001'); // From product-catalog epic
      expect(searchStory.data.dependencies).toContain('categories-001'); // From same epic
      expect(searchStory.data.dependencies).toContain('preferences-001'); // From user-management epic

      const cartStory = finalRootResult.aggregated_view?.['001_cart'][0];
      expect(cartStory.data.dependencies).toContain('identity-001'); // From user-management epic
      expect(cartStory.data.dependencies).toContain('products-001'); // From product-catalog epic

      const checkoutStory = finalRootResult.aggregated_view?.['002_checkout'][0];
      expect(checkoutStory.data.dependencies).toContain('cart-001'); // From same epic
      expect(checkoutStory.data.dependencies).toContain('profiles-001'); // From user-management epic

      const knowledgeBaseStory = finalRootResult.aggregated_view?.['003_knowledge_base'][0];
      expect(knowledgeBaseStory.data.dependencies).toContain('products-001'); // From product-catalog epic
      expect(knowledgeBaseStory.data.dependencies).toContain('categories-001'); // From product-catalog epic

      // 8. Verify epic hierarchy
      const themeResult = await themeEpicWrapper.read(themeEpicPath);
      expect(themeResult.features.ecommerce_coordinator[0].data.parent_feature_id).toBe(platformId);
      
      // All sub-epics should reference theme coordinator as parent
      expect(finalRootResult.aggregated_view?.user_management[0].data.parent_feature_id).toBe(themeCoordinatorId);
      expect(finalRootResult.aggregated_view?.product_catalog[0].data.parent_feature_id).toBe(themeCoordinatorId);
      expect(finalRootResult.aggregated_view?.order_processing[0].data.parent_feature_id).toBe(themeCoordinatorId);
      expect(finalRootResult.aggregated_view?.support_system[0].data.parent_feature_id).toBe(themeCoordinatorId);

      console.log('✅ Multi-Epic Theme with Cross-Epic Dependencies - PASSED');
    });
  });

  console.log('✅ All Complex Hierarchical Relationship Tests Defined');
});