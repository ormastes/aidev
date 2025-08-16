import { fsPromises as fs } from 'fs/promises';
import { path } from '../../infra_external-log-lib/src';
import { VFDistributedFeatureWrapper, DistributedFeatureFile } from '../children/VFDistributedFeatureWrapper';

/**
 * Real-world demo E2E test scenarios
 * Tests the distributed feature system with realistic use cases
 */
describe('Real-World Demo E2E Tests', () => {
  const testBaseDir = path.join(__dirname, '../temp/demo-realworld');
  
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

  describe('Case 1: E-Commerce Platform Development', () => {
    test('should handle complete e-commerce platform with proper hierarchy', async () => {
      // Given: The system is in a valid state
      // When: handle complete e-commerce platform with proper hierarchy
      // Then: The expected behavior occurs
      console.log('\n🚀 Demo Case 1: E-Commerce Platform Development');
      
      // === STEP 1: Create Root Platform ===
      const rootPath = path.join(testBaseDir, 'ecommerce-root.json');
      const rootWrapper = new VFDistributedFeatureWrapper(rootPath);

      await rootWrapper.write(rootPath, {
        metadata: {
          level: 'root',
          path: '/ecommerce-root.json',
          version: '1.0.0',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        features: {},
        children: [
          '/layer/themes/user-management/FEATURE.vf.json',
          '/layer/themes/product-catalog/FEATURE.vf.json',
          '/layer/themes/order-processing/FEATURE.vf.json'
        ]
      });

      const platformId = await rootWrapper.addFeature("platform", {
        name: 'E-Commerce Platform',
        data: {
          title: 'E-Commerce Platform',
          description: 'Complete online shopping platform',
          level: 'root',
          status: 'in-progress',
          priority: "critical",
          tags: ['e-commerce', "platform", 'web'],
          virtual_path: '/ecommerce-root.json'
        }
      });

      console.log(`   ✅ Created root platform: ${platformId}`);

      // === STEP 2: Create User Management Epic ===
      const userEpicPath = path.join(testBaseDir, 'user-management-epic.json');
      const userEpicWrapper = new VFDistributedFeatureWrapper(userEpicPath);

      await userEpicWrapper.write(userEpicPath, {
        metadata: {
          level: 'epic',
          parent_id: platformId,
          path: '/layer/themes/user-management/FEATURE.vf.json',
          version: '1.0.0',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        features: {},
        children: [
          '/layer/themes/user-management/user-stories/001-registration/FEATURE.vf.json',
          '/layer/themes/user-management/user-stories/002-login/FEATURE.vf.json',
          '/layer/themes/user-management/user-stories/003-profile/FEATURE.vf.json'
        ]
      });

      const userEpicId = await userEpicWrapper.addFeature('user_management', {
        name: 'User Management System',
        data: {
          title: 'User Management System',
          description: 'Complete user registration, authentication and profile management',
          level: 'epic',
          parent_feature_id: platformId,
          status: 'in-progress',
          priority: 'high',
          tags: ['users', "authentication", "security"],
          virtual_path: '/layer/themes/user-management/FEATURE.vf.json'
        }
      });

      console.log(`   ✅ Created user management epic: ${userEpicId}`);

      // === STEP 3: Create User Stories ===
      const registrationPath = path.join(testBaseDir, 'registration-story.json');
      const registrationWrapper = new VFDistributedFeatureWrapper(registrationPath);

      await registrationWrapper.write(registrationPath, {
        metadata: {
          level: 'user_story',
          parent_id: userEpicId,
          path: '/layer/themes/user-management/user-stories/001-registration/FEATURE.vf.json',
          version: '1.0.0',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        features: {}
      });

      const registrationId = await registrationWrapper.addFeature("registration", {
        name: 'User Registration',
        data: {
          title: 'User Registration',
          description: 'Allow users to create new accounts with email verification',
          level: 'user_story',
          parent_feature_id: userEpicId,
          epic_id: userEpicId,
          status: "completed",
          priority: 'high',
          tags: ["registration", 'signup', 'email-verification'],
          acceptanceCriteria: [
            'User can enter email and password',
            'Email verification is sent',
            'Account is created after verification',
            'User is redirected to dashboard'
          ],
          virtual_path: '/layer/themes/user-management/user-stories/001-registration/FEATURE.vf.json'
        }
      });

      console.log(`   ✅ Created registration story: ${registrationId}`);

      // === STEP 4: Create Product Catalog Epic ===
      const productEpicPath = path.join(testBaseDir, 'product-catalog-epic.json');
      const productEpicWrapper = new VFDistributedFeatureWrapper(productEpicPath);

      await productEpicWrapper.write(productEpicPath, {
        metadata: {
          level: 'epic',
          parent_id: platformId,
          path: '/layer/themes/product-catalog/FEATURE.vf.json',
          version: '1.0.0',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        features: {},
        children: [
          '/layer/themes/product-catalog/user-stories/001-browse-products/FEATURE.vf.json',
          '/layer/themes/product-catalog/user-stories/002-search-products/FEATURE.vf.json'
        ]
      });

      const productEpicId = await productEpicWrapper.addFeature('product_catalog', {
        name: 'Product Catalog System',
        data: {
          title: 'Product Catalog System',
          description: 'Product browsing, search, and filtering capabilities',
          level: 'epic',
          parent_feature_id: platformId,
          status: 'planned',
          priority: 'high',
          tags: ["products", 'catalog', 'search'],
          virtual_path: '/layer/themes/product-catalog/FEATURE.vf.json'
        }
      });

      console.log(`   ✅ Created product catalog epic: ${productEpicId}`);

      // === STEP 5: Test Aggregated View ===
      const finalRootResult = await rootWrapper.read(rootPath);
      
      console.log(`   📊 Root file has ${Object.keys(finalRootResult.features).length} feature categories`);
      console.log(`   📊 Platform features: ${finalRootResult.features.platform?.length || 0}`);
      
      // Verify root structure
      expect(finalRootResult.metadata.level).toBe('root');
      expect(finalRootResult.features.platform).toHaveLength(1);
      expect(finalRootResult.features.platform[0].id).toBe(platformId);
      expect(finalRootResult.children).toHaveLength(3);

      // Test epic structure
      const userEpicResult = await userEpicWrapper.read(userEpicPath);
      expect(userEpicResult.metadata.level).toBe('epic');
      expect(userEpicResult.metadata.parent_id).toBe(platformId);
      expect(userEpicResult.features.user_management).toHaveLength(1);

      // Test user story structure
      const registrationResult = await registrationWrapper.read(registrationPath);
      expect(registrationResult.metadata.level).toBe('user_story');
      expect(registrationResult.metadata.parent_id).toBe(userEpicId);
      expect(registrationResult.features.registration).toHaveLength(1);
      expect(registrationResult.features.registration[0].data.acceptanceCriteria).toHaveLength(4);

      console.log('   ✅ Case 1 Complete: E-Commerce platform hierarchy validated');
    });
  });

  describe('Case 2: Feature Evolution and Orphan Handling', () => {
    test('should handle orphaned features and common epic creation', async () => {
      // Given: The system is in a valid state
      // When: handle orphaned features and common epic creation
      // Then: The expected behavior occurs
      console.log('\n🔄 Demo Case 2: Feature Evolution and Orphan Handling');
      
      // === STEP 1: Create theme with orphaned features ===
      const themePath = path.join(testBaseDir, 'analytics-theme.json');
      const themeWrapper = new VFDistributedFeatureWrapper(themePath);

      await themeWrapper.write(themePath, {
        metadata: {
          level: 'theme',
          path: '/layer/themes/analytics/FEATURE.vf.json',
          version: '1.0.0',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        features: {}
      });

      // Add orphaned feature (no explicit epic)
      const dashboardId = await themeWrapper.addFeature("dashboards", {
        name: 'Analytics Dashboard',
        data: {
          title: 'Analytics Dashboard',
          description: 'Real-time analytics and reporting dashboard',
          level: 'user_story',
          status: 'in-progress',
          priority: 'medium',
          tags: ["analytics", "dashboard", "reporting"],
          virtual_path: '/layer/themes/analytics/FEATURE.vf.json'
        }
      });

      console.log(`   ✅ Added orphaned feature: ${dashboardId}`);

      // Add another orphaned feature
      const reportingId = await themeWrapper.addFeature("reporting", {
        name: 'Custom Reports',
        data: {
          title: 'Custom Reports',
          description: 'Generate custom business reports',
          level: 'user_story',
          status: 'planned',
          priority: 'low',
          tags: ["analytics", 'reports', "business"],
          virtual_path: '/layer/themes/analytics/FEATURE.vf.json'
        }
      });

      console.log(`   ✅ Added another orphaned feature: ${reportingId}`);

      // === STEP 2: Verify common epic creation ===
      const result = await themeWrapper.read(themePath);
      
      console.log(`   📊 Theme has ${Object.keys(result.features).length} feature categories`);
      
      // Should have created common epic
      expect(result.features.common).toBeDefined();
      expect(result.features.common).toHaveLength(1);
      
      const commonEpic = result.features.common[0];
      expect(commonEpic.id).toMatch(/^common-/);
      expect(commonEpic.data.level).toBe('epic');
      expect(commonEpic.data.tags).toContain('auto-generated');
      expect(commonEpic.data.tags).toContain('common');

      console.log(`   ✅ Common epic created: ${commonEpic.id}`);

      // Verify orphaned features reference common epic
      expect(result.features.dashboards[0].data.epic_id).toBe(commonEpic.id);
      expect(result.features.dashboards[0].data.parent_feature_id).toBe(commonEpic.id);
      expect(result.features.reporting[0].data.epic_id).toBe(commonEpic.id);
      expect(result.features.reporting[0].data.parent_feature_id).toBe(commonEpic.id);

      console.log('   ✅ Case 2 Complete: Orphan handling and common epic creation validated');
    });
  });

  describe('Case 3: Query Parameters and Filtering', () => {
    test('should handle complex filtering scenarios', async () => {
      // Given: The system is in a valid state
      // When: handle complex filtering scenarios
      // Then: The expected behavior occurs
      console.log('\n🔍 Demo Case 3: Query Parameters and Filtering');
      
      // === STEP 1: Create mixed-level feature file ===
      const mixedPath = path.join(testBaseDir, 'mixed-features.json');
      const mixedWrapper = new VFDistributedFeatureWrapper(mixedPath);

      await mixedWrapper.write(mixedPath, {
        metadata: {
          level: 'epic',
          path: '/layer/themes/mixed/FEATURE.vf.json',
          version: '1.0.0',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        features: {
          mixed_features: [
            {
              id: 'epic-001',
              name: 'Main Epic',
              data: {
                title: 'Main Epic Feature',
                description: 'Epic level feature',
                level: 'epic',
                status: 'in-progress',
                priority: "critical",
                tags: ['epic', 'main'],
                virtual_path: '/layer/themes/mixed/FEATURE.vf.json'
              },
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            },
            {
              id: 'theme-001',
              name: 'Theme Feature',
              data: {
                title: 'Theme Level Feature',
                description: 'Theme level feature',
                level: 'theme',
                status: 'planned',
                priority: 'high',
                tags: ['theme', "secondary"],
                virtual_path: '/layer/themes/mixed/FEATURE.vf.json'
              },
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            },
            {
              id: 'story-001',
              name: 'User Story',
              data: {
                title: 'User Story Feature',
                description: 'User story level feature',
                level: 'user_story',
                status: "completed",
                priority: 'medium',
                tags: ['story', 'user'],
                virtual_path: '/layer/themes/mixed/FEATURE.vf.json'
              },
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            },
            {
              id: 'story-002',
              name: 'Another User Story',
              data: {
                title: 'Another User Story',
                description: 'Second user story feature',
                level: 'user_story',
                status: 'blocked',
                priority: 'low',
                tags: ['story', "secondary"],
                virtual_path: '/layer/themes/mixed/FEATURE.vf.json'
              },
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }
          ]
        }
      });

      console.log('   ✅ Created mixed-level feature file with 4 features');

      // === STEP 2: Test different filter queries ===
      
      // Filter by epic level
      const epicOnly = await mixedWrapper.read(mixedPath + '?level=epic');
      expect(epicOnly.features.mixed_features).toHaveLength(1);
      expect(epicOnly.features.mixed_features[0].data.level).toBe('epic');
      console.log(`   ✅ Epic filter: ${epicOnly.features.mixed_features.length} features`);

      // Filter by theme level
      const themeOnly = await mixedWrapper.read(mixedPath + '?level=theme');
      expect(themeOnly.features.mixed_features).toHaveLength(1);
      expect(themeOnly.features.mixed_features[0].data.level).toBe('theme');
      console.log(`   ✅ Theme filter: ${themeOnly.features.mixed_features.length} features`);

      // Filter by user_story level
      const storyOnly = await mixedWrapper.read(mixedPath + '?level=user_story');
      expect(storyOnly.features.mixed_features).toHaveLength(2);
      expect(storyOnly.features.mixed_features[0].data.level).toBe('user_story');
      expect(storyOnly.features.mixed_features[1].data.level).toBe('user_story');
      console.log(`   ✅ User story filter: ${storyOnly.features.mixed_features.length} features`);

      // No filter - should return all
      const allFeatures = await mixedWrapper.read(mixedPath);
      expect(allFeatures.features.mixed_features).toHaveLength(4);
      console.log(`   ✅ No filter: ${allFeatures.features.mixed_features.length} features`);

      console.log('   ✅ Case 3 Complete: Query parameter filtering validated');
    });
  });

  describe('🚨 Story: Case 4: Large Scale Enterprise Scenario', () => {
    test('should handle enterprise-scale feature management', async () => {
      // Given: The system is in a valid state
      // When: handle enterprise-scale feature management
      // Then: The expected behavior occurs
      console.log('\n🏢 Demo Case 4: Large Scale Enterprise Scenario');
      
      // === STEP 1: Create enterprise root ===
      const enterpriseRootPath = path.join(testBaseDir, 'enterprise-root.json');
      const enterpriseRootWrapper = new VFDistributedFeatureWrapper(enterpriseRootPath);

      await enterpriseRootWrapper.write(enterpriseRootPath, {
        metadata: {
          level: 'root',
          path: '/enterprise-root.json',
          version: '2.0.0',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        features: {},
        children: []
      });

      // === STEP 2: Add multiple platform features ===
      const platformIds: string[] = [];
      const platforms = [
        { name: 'Customer Portal', priority: "critical", status: 'in-progress' },
        { name: 'Admin Dashboard', priority: 'high', status: 'planned' },
        { name: 'Mobile App', priority: 'medium', status: 'planned' },
        { name: 'API Gateway', priority: "critical", status: "completed" },
        { name: 'Analytics Engine', priority: 'medium', status: 'in-progress' }
      ];

      for (const platform of platforms) {
        const platformId = await enterpriseRootWrapper.addFeature("platforms", {
          name: platform.name,
          data: {
            title: platform.name,
            description: `Enterprise ${platform.name} system`,
            level: 'root',
            status: platform.status as any,
            priority: platform.priority as any,
            tags: ["enterprise", "platform", platform.name.toLowerCase().replace(' ', '-')],
            virtual_path: '/enterprise-root.json'
          }
        });
        platformIds.push(platformId);
        console.log(`   ✅ Added platform: ${platform.name} (${platformId})`);
      }

      // === STEP 3: Create enterprise epic with many features ===
      const enterpriseEpicPath = path.join(testBaseDir, 'enterprise-epic.json');
      const enterpriseEpicWrapper = new VFDistributedFeatureWrapper(enterpriseEpicPath);

      await enterpriseEpicWrapper.write(enterpriseEpicPath, {
        metadata: {
          level: 'epic',
          parent_id: platformIds[0], // Link to Customer Portal
          path: '/layer/themes/customer-portal/FEATURE.vf.json',
          version: '1.0.0',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        features: {}
      });

      // Add multiple epics and user stories
      const modules = [
        "authentication", "authorization", 'user-management', 'content-management',
        'workflow-engine', 'notification-system', 'audit-logging', 'data-export',
        'integration-hub', 'reporting-suite'
      ];

      const featureIds: string[] = [];
      for (const module of modules) {
        // Add epic
        const epicId = await enterpriseEpicWrapper.addFeature('epics', {
          name: `${module.charAt(0).toUpperCase() + module.slice(1)} Epic`,
          data: {
            title: `${module.charAt(0).toUpperCase() + module.slice(1)} System`,
            description: `Complete ${module} functionality for enterprise customers`,
            level: 'epic',
            parent_feature_id: platformIds[0],
            status: 'in-progress',
            priority: 'high',
            tags: ["enterprise", 'epic', module],
            virtual_path: '/layer/themes/customer-portal/FEATURE.vf.json'
          }
        });

        // Add related user stories
        for (let i = 1; i <= 3; i++) {
          const storyId = await enterpriseEpicWrapper.addFeature('user_stories', {
            name: `${module} Story ${i}`,
            data: {
              title: `${module.charAt(0).toUpperCase() + module.slice(1)} Feature ${i}`,
              description: `User story ${i} for ${module} functionality`,
              level: 'user_story',
              parent_feature_id: epicId,
              epic_id: epicId,
              status: i === 1 ? "completed" : i === 2 ? 'in-progress' : 'planned',
              priority: i === 1 ? 'high' : 'medium',
              tags: ["enterprise", 'story', module, `story-${i}`],
              acceptanceCriteria: [
                `User can access ${module} feature`,
                `${module} works correctly`,
                `Error handling is implemented`
              ],
              virtual_path: '/layer/themes/customer-portal/FEATURE.vf.json'
            }
          });
          featureIds.push(storyId);
        }
        console.log(`   ✅ Added ${module} epic with 3 user stories`);
      }

      // === STEP 4: Verify enterprise structure ===
      const enterpriseResult = await enterpriseRootWrapper.read(enterpriseRootPath);
      console.log(`   📊 Enterprise root has ${Object.keys(enterpriseResult.features).length} categories`);
      console.log(`   📊 Total platforms: ${enterpriseResult.features.platforms?.length || 0}`);

      const epicResult = await enterpriseEpicWrapper.read(enterpriseEpicPath);
      console.log(`   📊 Epic file has ${Object.keys(epicResult.features).length} categories`);
      console.log(`   📊 Total epics: ${epicResult.features.epics?.length || 0}`);
      console.log(`   📊 Total user stories: ${epicResult.features.user_stories?.length || 0}`);

      // Verify numbers
      expect(enterpriseResult.features.platforms).toHaveLength(5);
      expect(epicResult.features.epics).toHaveLength(10);
      expect(epicResult.features.user_stories).toHaveLength(30); // 10 modules × 3 stories each

      // Test performance with large dataset
      const startTime = Date.now();
      const perfResult = await enterpriseEpicWrapper.read(enterpriseEpicPath);
      const readTime = Date.now() - startTime;
      
      console.log(`   ⚡ Read 40 features in ${readTime}ms`);
      expect(readTime).toBeLessThan(100); // Should be fast

      console.log('   ✅ Case 4 Complete: Enterprise-scale feature management validated');
    });
  });

  describe('Case 5: Cross-Epic Dependencies and Complex Relationships', () => {
    test('should handle complex feature dependencies', async () => {
      // Given: The system is in a valid state
      // When: handle complex feature dependencies
      // Then: The expected behavior occurs
      console.log('\n🔗 Demo Case 5: Cross-Epic Dependencies and Complex Relationships');
      
      // === STEP 1: Create microservices architecture ===
      const microservicesPath = path.join(testBaseDir, 'microservices-root.json');
      const microservicesWrapper = new VFDistributedFeatureWrapper(microservicesPath);

      await microservicesWrapper.write(microservicesPath, {
        metadata: {
          level: 'root',
          path: '/microservices-root.json',
          version: '1.0.0',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        features: {}
      });

      // Add platform
      const platformId = await microservicesWrapper.addFeature("platform", {
        name: 'Microservices Platform',
        data: {
          title: 'Microservices Platform',
          description: 'Distributed microservices architecture',
          level: 'root',
          status: 'in-progress',
          priority: "critical",
          tags: ["microservices", "distributed", "architecture"],
          virtual_path: '/microservices-root.json'
        }
      });

      // === STEP 2: Create interdependent services ===
      const services = [
        {
          name: 'auth-service',
          title: 'Authentication Service',
          dependencies: []
        },
        {
          name: 'user-service',
          title: 'User Management Service',
          dependencies: ['auth-service-001']
        },
        {
          name: 'order-service',
          title: 'Order Processing Service',
          dependencies: ['auth-service-001', 'user-service-001']
        },
        {
          name: 'payment-service',
          title: 'Payment Processing Service',
          dependencies: ['auth-service-001', 'order-service-001']
        },
        {
          name: 'notification-service',
          title: 'Notification Service',
          dependencies: ['user-service-001', 'order-service-001', 'payment-service-001']
        }
      ];

      const serviceIds: { [key: string]: string } = {};

      for (const service of services) {
        const serviceId = await microservicesWrapper.addFeature("microservices", {
          name: service.name,
          data: {
            title: service.title,
            description: `${service.title} microservice`,
            level: 'epic',
            parent_feature_id: platformId,
            status: 'in-progress',
            priority: 'high',
            tags: ["microservice", service.name, 'backend'],
            dependencies: service.dependencies,
            components: [`${service.name}-api`, `${service.name}-db`, `${service.name}-cache`],
            virtual_path: '/microservices-root.json'
          }
        });
        
        serviceIds[`${service.name}-001`] = serviceId;
        console.log(`   ✅ Added ${service.title}: ${serviceId}`);
        console.log(`      Dependencies: ${service.dependencies.length > 0 ? service.dependencies.join(', ') : 'None'}`);
      }

      // === STEP 3: Add cross-cutting concerns ===
      const crossCuttingFeatures = [
        {
          name: 'logging',
          title: 'Centralized Logging',
          affects: Object.values(serviceIds)
        },
        {
          name: "monitoring",
          title: 'Service Monitoring',
          affects: Object.values(serviceIds)
        },
        {
          name: "security",
          title: 'Cross-Service Security',
          affects: [serviceIds['auth-service-001'], serviceIds['user-service-001']]
        }
      ];

      for (const feature of crossCuttingFeatures) {
        const featureId = await microservicesWrapper.addFeature('cross_cutting', {
          name: feature.name,
          data: {
            title: feature.title,
            description: `${feature.title} across microservices`,
            level: 'theme',
            parent_feature_id: platformId,
            status: 'planned',
            priority: 'medium',
            tags: ['cross-cutting', feature.name, "infrastructure"],
            dependencies: feature.affects,
            virtual_path: '/microservices-root.json'
          }
        });
        console.log(`   ✅ Added ${feature.title}: ${featureId}`);
        console.log(`      Affects ${feature.affects.length} services`);
      }

      // === STEP 4: Verify complex relationships ===
      const result = await microservicesWrapper.read(microservicesPath);
      
      console.log(`   📊 Platform has ${Object.keys(result.features).length} categories`);
      console.log(`   📊 Microservices: ${result.features.microservices?.length || 0}`);
      console.log(`   📊 Cross-cutting concerns: ${result.features.cross_cutting?.length || 0}`);

      // Verify dependency chain
      const notificationService = result.features.microservices?.find(f => f.name === 'notification-service');
      expect(notificationService?.data.dependencies).toHaveLength(3);
      expect(notificationService?.data.dependencies).toContain('user-service-001');
      expect(notificationService?.data.dependencies).toContain('order-service-001');
      expect(notificationService?.data.dependencies).toContain('payment-service-001');

      // Verify service structure
      const authService = result.features.microservices?.find(f => f.name === 'auth-service');
      expect(authService?.data.dependencies).toHaveLength(0); // No dependencies
      expect(authService?.data.components).toContain('auth-service-api');
      expect(authService?.data.components).toContain('auth-service-db');

      console.log('   ✅ Case 5 Complete: Complex dependencies and relationships validated');
    });
  });

  console.log('\n🎉 All Real-World Demo E2E Tests Complete!');
});