import { fsPromises as fs } from '../../infra_external-log-lib/dist';
import { path } from '../../infra_external-log-lib/src';
import { VFDistributedFeatureWrapper, DistributedFeatureFile, DistributedFeature } from '../children/VFDistributedFeatureWrapper';

/**
 * Comprehensive End-to-End tests for the distributed feature system
 * Tests real file operations with various scenarios and edge cases
 */
describe('Comprehensive E2E Distributed Feature Tests', () => {
  const testBaseDir = path.join(__dirname, '../temp/e2e-comprehensive');
  
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

  describe('🚨 Story: Scenario 1: Complete Platform Development Lifecycle', () => {
    const scenarioDir = path.join(testBaseDir, 'scenario1');
    
    test('should handle complete development lifecycle from planning to completion', async () => {
      // Given: The system is in a valid state
      // When: handle complete development lifecycle from planning to completion
      // Then: The expected behavior occurs
      // Setup directory structure
      await fs.mkdir(scenarioDir, { recursive: true });
      await fs.mkdir(path.join(scenarioDir, 'layer/themes/auth/user-stories/001-login'), { recursive: true });
      await fs.mkdir(path.join(scenarioDir, 'layer/themes/auth/user-stories/002-register'), { recursive: true });
      await fs.mkdir(path.join(scenarioDir, 'layer/themes/payments/user-stories/001-process'), { recursive: true });
      await fs.mkdir(path.join(scenarioDir, 'layer/themes/admin/user-stories/001-dashboard'), { recursive: true });

      // 1. Start with root platform feature
      const rootPath = path.join(scenarioDir, 'FEATURE.vf.json');
      const rootWrapper = new VFDistributedFeatureWrapper(rootPath);
      
      await rootWrapper.write(rootPath, {
        metadata: {
          level: 'root',
          path: '/FEATURE.vf.json',
          version: '1.0.0',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        features: {},
        children: []
      });

      // Add platform feature
      const platformId = await rootWrapper.addFeature('platform', {
        name: 'E-commerce Platform',
        data: {
          title: 'Complete E-commerce Platform',
          description: 'Full-featured e-commerce platform with auth, payments, and admin',
          level: 'root',
          status: 'planned',
          priority: 'critical',
          tags: ['platform', 'e-commerce'],
          virtual_path: '/FEATURE.vf.json'
        }
      });

      // 2. Create auth epic
      const authPath = path.join(scenarioDir, 'layer/themes/auth/FEATURE.vf.json');
      const authWrapper = new VFDistributedFeatureWrapper(authPath);
      
      await authWrapper.write(authPath, {
        metadata: {
          level: 'epic',
          parent_id: platformId,
          path: '/layer/themes/auth/FEATURE.vf.json',
          version: '1.0.0',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        features: {},
        children: []
      });

      const authEpicId = await authWrapper.addFeature('auth', {
        name: 'Authentication System',
        data: {
          title: 'User Authentication & Authorization',
          description: 'Complete authentication system with login, register, and session management',
          level: 'epic',
          parent_feature_id: platformId,
          status: 'in-progress',
          priority: 'high',
          tags: ['auth', 'security'],
          virtual_path: '/layer/themes/auth/FEATURE.vf.json'
        }
      });

      // 3. Create payments epic  
      const paymentsPath = path.join(scenarioDir, 'layer/themes/payments/FEATURE.vf.json');
      const paymentsWrapper = new VFDistributedFeatureWrapper(paymentsPath);
      
      await paymentsWrapper.write(paymentsPath, {
        metadata: {
          level: 'epic',
          parent_id: platformId,
          path: '/layer/themes/payments/FEATURE.vf.json',
          version: '1.0.0',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        features: {},
        children: []
      });

      const paymentsEpicId = await paymentsWrapper.addFeature('payments', {
        name: 'Payment Processing',
        data: {
          title: 'Payment Processing System',
          description: 'Secure payment processing with multiple payment methods',
          level: 'epic',
          parent_feature_id: platformId,
          status: 'planned',
          priority: 'high',
          tags: ['payments', 'fintech'],
          virtual_path: '/layer/themes/payments/FEATURE.vf.json'
        }
      });

      // 4. Add user stories to auth
      const loginPath = path.join(scenarioDir, 'layer/themes/auth/user-stories/001-login/FEATURE.vf.json');
      const loginWrapper = new VFDistributedFeatureWrapper(loginPath);
      
      await loginWrapper.write(loginPath, {
        metadata: {
          level: 'user_story',
          parent_id: authEpicId,
          path: '/layer/themes/auth/user-stories/001-login/FEATURE.vf.json',
          version: '1.0.0',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        features: {}
      });

      await loginWrapper.addFeature('login', {
        name: 'User Login',
        data: {
          title: 'User Login Form',
          description: 'Secure user login with email/password',
          level: 'user_story',
          parent_feature_id: authEpicId,
          epic_id: authEpicId,
          status: 'completed',
          priority: 'critical',
          tags: ['login', 'form', 'security'],
          components: ['LoginForm.tsx', 'AuthService.ts'],
          acceptanceCriteria: [
            'User can login with valid credentials',
            'Invalid credentials show error message',
            'Session is created on successful login',
            'User is redirected to dashboard'
          ],
          virtual_path: '/layer/themes/auth/user-stories/001-login/FEATURE.vf.json'
        }
      });

      const registerPath = path.join(scenarioDir, 'layer/themes/auth/user-stories/002-register/FEATURE.vf.json');
      const registerWrapper = new VFDistributedFeatureWrapper(registerPath);
      
      await registerWrapper.write(registerPath, {
        metadata: {
          level: 'user_story',
          parent_id: authEpicId,
          path: '/layer/themes/auth/user-stories/002-register/FEATURE.vf.json',
          version: '1.0.0',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        features: {}
      });

      await registerWrapper.addFeature('register', {
        name: 'User Registration',
        data: {
          title: 'User Registration Form',
          description: 'New user registration with validation',
          level: 'user_story',
          parent_feature_id: authEpicId,
          epic_id: authEpicId,
          status: 'in-progress',
          priority: 'high',
          tags: ['register', 'validation'],
          components: ['RegistrationForm.tsx', 'UserService.ts'],
          acceptanceCriteria: [
            'User can create account with valid data',
            'Email validation prevents duplicates',
            'Password meets security requirements',
            'Confirmation email is sent'
          ],
          virtual_path: '/layer/themes/auth/user-stories/002-register/FEATURE.vf.json'
        }
      });

      // 5. Add payment processing story
      const paymentProcessPath = path.join(scenarioDir, 'layer/themes/payments/user-stories/001-process/FEATURE.vf.json');
      const paymentProcessWrapper = new VFDistributedFeatureWrapper(paymentProcessPath);
      
      await paymentProcessWrapper.write(paymentProcessPath, {
        metadata: {
          level: 'user_story',
          parent_id: paymentsEpicId,
          path: '/layer/themes/payments/user-stories/001-process/FEATURE.vf.json',
          version: '1.0.0',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        features: {}
      });

      await paymentProcessWrapper.addFeature('payment', {
        name: 'Payment Processing',
        data: {
          title: 'Credit Card Payment Processing',
          description: 'Process credit card payments securely',
          level: 'user_story',
          parent_feature_id: paymentsEpicId,
          epic_id: paymentsEpicId,
          status: 'planned',
          priority: 'critical',
          tags: ['payment', 'credit-card', 'security'],
          dependencies: [authEpicId], // Depends on auth being complete
          components: ['PaymentForm.tsx', 'PaymentService.ts', 'StripeIntegration.ts'],
          acceptanceCriteria: [
            'User can enter credit card details',
            'Payment is processed securely via Stripe',
            'Payment confirmation is shown',
            'Order is created on successful payment'
          ],
          virtual_path: '/layer/themes/payments/user-stories/001-process/FEATURE.vf.json'
        }
      });

      // 6. Add admin dashboard with orphaned feature (no explicit epic)
      const adminDashPath = path.join(scenarioDir, 'layer/themes/admin/user-stories/001-dashboard/FEATURE.vf.json');
      const adminDashWrapper = new VFDistributedFeatureWrapper(adminDashPath);
      
      await adminDashWrapper.write(adminDashPath, {
        metadata: {
          level: 'user_story',
          path: '/layer/themes/admin/user-stories/001-dashboard/FEATURE.vf.json',
          version: '1.0.0',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        features: {}
      });

      // This should create a common epic automatically
      await adminDashWrapper.addFeature('admin', {
        name: 'Admin Dashboard',
        data: {
          title: 'Administrator Dashboard',
          description: 'Dashboard for system administrators',
          level: 'user_story',
          status: 'planned',
          priority: 'medium',
          tags: ['admin', 'dashboard'],
          components: ['AdminDashboard.tsx', 'AdminService.ts'],
          virtual_path: '/layer/themes/admin/user-stories/001-dashboard/FEATURE.vf.json'
        }
      });

      // 7. Update root to include children
      const rootContent = await rootWrapper.read(rootPath);
      rootContent.children = [
        '/layer/themes/auth/FEATURE.vf.json',
        '/layer/themes/payments/FEATURE.vf.json'
      ];
      await rootWrapper.write(rootPath, rootContent);

      // Update auth to include children
      const authContent = await authWrapper.read(authPath);
      authContent.children = [
        '/layer/themes/auth/user-stories/001-login/FEATURE.vf.json',
        '/layer/themes/auth/user-stories/002-register/FEATURE.vf.json'
      ];
      await authWrapper.write(authPath, authContent);

      // Update payments to include children
      const paymentsContent = await paymentsWrapper.read(paymentsPath);
      paymentsContent.children = [
        '/layer/themes/payments/user-stories/001-process/FEATURE.vf.json'
      ];
      await paymentsWrapper.write(paymentsPath, paymentsContent);

      // 8. Verify complete hierarchy with aggregation
      const finalRootResult = await rootWrapper.read(rootPath);
      
      // Should have platform feature
      expect(finalRootResult.features.platform).toHaveLength(1);
      expect(finalRootResult.features.platform[0].data.title).toBe('Complete E-commerce Platform');
      
      // Should aggregate all features from children
      expect(finalRootResult.aggregated_view).toBeDefined();
      expect(finalRootResult.aggregated_view?.auth).toHaveLength(1); // Auth epic
      expect(finalRootResult.aggregated_view?.payments).toHaveLength(1); // Payments epic
      expect(finalRootResult.aggregated_view?.login).toHaveLength(1); // Login story
      expect(finalRootResult.aggregated_view?.register).toHaveLength(1); // Register story
      expect(finalRootResult.aggregated_view?.payment).toHaveLength(1); // Payment story

      // 9. Verify epic-level aggregation
      const finalAuthResult = await authWrapper.read(authPath);
      expect(finalAuthResult.aggregated_view?.login).toHaveLength(1);
      expect(finalAuthResult.aggregated_view?.register).toHaveLength(1);
      expect(finalAuthResult.aggregated_view?.login[0].data.status).toBe('completed');
      expect(finalAuthResult.aggregated_view?.register[0].data.status).toBe('in-progress');

      // 10. Verify common epic was created for admin
      const adminResult = await adminDashWrapper.read(adminDashPath);
      expect(adminResult.features.common).toBeDefined();
      expect(adminResult.features.common[0].id).toBe('common-admin');
      expect(adminResult.features.admin[0].data.epic_id).toBe('common-admin');

      console.log('✅ Scenario 1: Complete Platform Development Lifecycle - PASSED');
    });
  });

  describe('🚨 Story: Scenario 2: Complex Multi-Epic Platform', () => {
    const scenarioDir = path.join(testBaseDir, 'scenario2');
    
    test('should handle complex multi-epic platform with cross-dependencies', async () => {
      // Given: The system is in a valid state
      // When: handle complex multi-epic platform with cross-dependencies
      // Then: The expected behavior occurs
      await fs.mkdir(scenarioDir, { recursive: true });
      
      // Create complex structure: 3 epics with multiple user stories each
      const epics = [
        { name: 'user-management', stories: ['001-profiles', '002-preferences', '003-notifications'] },
        { name: 'content-management', stories: ['001-posts', '002-media', '003-comments'] },
        { name: 'analytics', stories: ['001-tracking', '002-reports', '003-insights'] }
      ];

      // Create directory structure
      for (const epic of epics) {
        await fs.mkdir(path.join(scenarioDir, `layer/themes/${epic.name}`), { recursive: true });
        for (const story of epic.stories) {
          await fs.mkdir(path.join(scenarioDir, `layer/themes/${epic.name}/user-stories/${story}`), { recursive: true });
        }
      }

      // 1. Create root platform
      const rootPath = path.join(scenarioDir, 'FEATURE.vf.json');
      const rootWrapper = new VFDistributedFeatureWrapper(rootPath);
      
      await rootWrapper.write(rootPath, {
        metadata: {
          level: 'root',
          path: '/FEATURE.vf.json',
          version: '1.0.0',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        features: {},
        children: []
      });

      const platformId = await rootWrapper.addFeature('platform', {
        name: 'Social Media Platform',
        data: {
          title: 'Comprehensive Social Media Platform',
          description: 'Multi-feature social media platform with user management, content, and analytics',
          level: 'root',
          status: 'in-progress',
          priority: 'critical',
          tags: ['social-media', 'platform'],
          virtual_path: '/FEATURE.vf.json'
        }
      });

      // 2. Create epics with cross-dependencies
      const epicIds: Record<string, string> = {};
      
      for (const epic of epics) {
        const epicPath = path.join(scenarioDir, `layer/themes/${epic.name}/FEATURE.vf.json`);
        const epicWrapper = new VFDistributedFeatureWrapper(epicPath);
        
        await epicWrapper.write(epicPath, {
          metadata: {
            level: 'epic',
            parent_id: platformId,
            path: `/layer/themes/${epic.name}/FEATURE.vf.json`,
            version: '1.0.0',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          features: {},
          children: []
        });

        // Add dependencies based on epic type
        const dependencies = epic.name === 'analytics' 
          ? Object.values(epicIds) // Analytics depends on both user and content management
          : epic.name === 'content-management' 
          ? [epicIds['user-management']] // Content depends on user management
          : []; // User management has no dependencies

        const epicId = await epicWrapper.addFeature(epic.name.replace('-', '_'), {
          name: epic.name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
          data: {
            title: `${epic.name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} System`,
            description: `Complete ${epic.name.replace('-', ' ')} functionality`,
            level: 'epic',
            parent_feature_id: platformId,
            status: epic.name === 'user-management' ? 'completed' : epic.name === 'content-management' ? 'in-progress' : 'planned',
            priority: epic.name === 'user-management' ? 'critical' : 'high',
            dependencies: dependencies.filter(Boolean),
            tags: [epic.name, 'system'],
            virtual_path: `/layer/themes/${epic.name}/FEATURE.vf.json`
          }
        });
        
        epicIds[epic.name] = epicId;
      }

      // 3. Add user stories with varying complexity
      const storyData = {
        'user-management': {
          '001-profiles': { title: 'User Profiles', status: 'completed', priority: 'critical' },
          '002-preferences': { title: 'User Preferences', status: 'completed', priority: 'high' },
          '003-notifications': { title: 'Notification System', status: 'in-progress', priority: 'medium' }
        },
        'content-management': {
          '001-posts': { title: 'Post Creation', status: 'completed', priority: 'critical' },
          '002-media': { title: 'Media Upload', status: 'in-progress', priority: 'high' },
          '003-comments': { title: 'Comment System', status: 'planned', priority: 'medium' }
        },
        'analytics': {
          '001-tracking': { title: 'Event Tracking', status: 'planned', priority: 'medium' },
          '002-reports': { title: 'Analytics Reports', status: 'planned', priority: 'medium' },
          '003-insights': { title: 'User Insights', status: 'planned', priority: 'low' }
        }
      };

      for (const epic of epics) {
        for (const story of epic.stories) {
          const storyPath = path.join(scenarioDir, `layer/themes/${epic.name}/user-stories/${story}/FEATURE.vf.json`);
          const storyWrapper = new VFDistributedFeatureWrapper(storyPath);
          
          await storyWrapper.write(storyPath, {
            metadata: {
              level: 'user_story',
              parent_id: epicIds[epic.name],
              path: `/layer/themes/${epic.name}/user-stories/${story}/FEATURE.vf.json`,
              version: '1.0.0',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            },
            features: {}
          });

          const storyInfo = storyData[epic.name as keyof typeof storyData][story as keyof typeof storyData['user-management']];
          
          await storyWrapper.addFeature(story.replace('-', '_'), {
            name: storyInfo.title,
            data: {
              title: storyInfo.title,
              description: `Implementation of ${storyInfo.title.toLowerCase()}`,
              level: 'user_story',
              parent_feature_id: epicIds[epic.name],
              epic_id: epicIds[epic.name],
              status: storyInfo.status as any,
              priority: storyInfo.priority as any,
              tags: [epic.name, story.split('-')[1]],
              components: [`${storyInfo.title.replace(' ', '')}.tsx`],
              acceptanceCriteria: [
                `${storyInfo.title} functionality works correctly`,
                'User interface is responsive',
                'Data validation is implemented'
              ],
              virtual_path: `/layer/themes/${epic.name}/user-stories/${story}/FEATURE.vf.json`
            }
          });
        }
      }

      // 4. Update all parent references
      // Update root
      const rootContent = await rootWrapper.read(rootPath);
      rootContent.children = epics.map(epic => `/layer/themes/${epic.name}/FEATURE.vf.json`);
      await rootWrapper.write(rootPath, rootContent);

      // Update epics
      for (const epic of epics) {
        const epicPath = path.join(scenarioDir, `layer/themes/${epic.name}/FEATURE.vf.json`);
        const epicWrapper = new VFDistributedFeatureWrapper(epicPath);
        const epicContent = await epicWrapper.read(epicPath);
        epicContent.children = epic.stories.map(story => `/layer/themes/${epic.name}/user-stories/${story}/FEATURE.vf.json`);
        await epicWrapper.write(epicPath, epicContent);
      }

      // 5. Verify complex aggregation
      const finalRootResult = await rootWrapper.read(rootPath);
      
      // Should have all epics
      expect(finalRootResult.aggregated_view?.user_management).toHaveLength(1);
      expect(finalRootResult.aggregated_view?.content_management).toHaveLength(1);
      expect(finalRootResult.aggregated_view?.analytics).toHaveLength(1);
      
      // Should have all user stories (3 per epic = 9 total stories)
      const allStoryCategories = Object.keys(finalRootResult.aggregated_view || {}).filter(key => 
        key.includes('001_') || key.includes('002_') || key.includes('003_')
      );
      expect(allStoryCategories.length).toBe(9);

      // 6. Verify dependencies are maintained
      const analyticsEpic = finalRootResult.aggregated_view?.analytics?.[0];
      expect(analyticsEpic?.data.dependencies).toHaveLength(2); // Should depend on both user and content management

      // 7. Verify status progression (user-management completed, content in-progress, analytics planned)
      expect(finalRootResult.aggregated_view?.user_management[0].data.status).toBe('completed');
      expect(finalRootResult.aggregated_view?.content_management[0].data.status).toBe('in-progress');
      expect(finalRootResult.aggregated_view?.analytics[0].data.status).toBe('planned');

      console.log('✅ Scenario 2: Complex Multi-Epic Platform - PASSED');
    });
  });

  describe('🚨 Story: Scenario 3: Rapid Prototyping with Frequent Changes', () => {
    const scenarioDir = path.join(testBaseDir, 'scenario3');
    
    test('should handle rapid feature changes and restructuring', async () => {
      // Given: The system is in a valid state
      // When: handle rapid feature changes and restructuring
      // Then: The expected behavior occurs
      await fs.mkdir(scenarioDir, { recursive: true });
      await fs.mkdir(path.join(scenarioDir, 'layer/themes/prototype/user-stories/001-mvp'), { recursive: true });

      // 1. Start with minimal viable product
      const rootPath = path.join(scenarioDir, 'FEATURE.vf.json');
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

      // Add MVP platform
      const platformId = await rootWrapper.addFeature('mvp', {
        name: 'MVP Platform',
        data: {
          title: 'Minimum Viable Product',
          description: 'Basic prototype to test core functionality',
          level: 'root',
          status: 'in-progress',
          priority: 'critical',
          tags: ['mvp', 'prototype'],
          virtual_path: '/FEATURE.vf.json'
        }
      });

      // 2. Add initial prototype feature
      const prototypePath = path.join(scenarioDir, 'layer/themes/prototype/FEATURE.vf.json');
      const prototypeWrapper = new VFDistributedFeatureWrapper(prototypePath);
      
      await prototypeWrapper.write(prototypePath, {
        metadata: {
          level: 'epic',
          parent_id: platformId,
          path: '/layer/themes/prototype/FEATURE.vf.json',
          version: '1.0.0',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        features: {}
      });

      const prototypeEpicId = await prototypeWrapper.addFeature('prototype', {
        name: 'Core Prototype',
        data: {
          title: 'Core Prototype Features',
          description: 'Essential features for MVP',
          level: 'epic',
          parent_feature_id: platformId,
          status: 'in-progress',
          priority: 'critical',
          tags: ['prototype', 'core'],
          virtual_path: '/layer/themes/prototype/FEATURE.vf.json'
        }
      });

      // 3. Add MVP user story
      const mvpPath = path.join(scenarioDir, 'layer/themes/prototype/user-stories/001-mvp/FEATURE.vf.json');
      const mvpWrapper = new VFDistributedFeatureWrapper(mvpPath);
      
      await mvpWrapper.write(mvpPath, {
        metadata: {
          level: 'user_story',
          parent_id: prototypeEpicId,
          path: '/layer/themes/prototype/user-stories/001-mvp/FEATURE.vf.json',
          version: '1.0.0',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        features: {}
      });

      await mvpWrapper.addFeature('mvp_core', {
        name: 'MVP Core',
        data: {
          title: 'MVP Core Functionality',
          description: 'Basic functionality for testing',
          level: 'user_story',
          parent_feature_id: prototypeEpicId,
          epic_id: prototypeEpicId,
          status: 'completed',
          priority: 'critical',
          tags: ['mvp', 'core'],
          components: ['App.tsx', 'MainPage.tsx'],
          virtual_path: '/layer/themes/prototype/user-stories/001-mvp/FEATURE.vf.json'
        }
      });

      // 4. ITERATION 1: Add more features rapidly
      await fs.mkdir(path.join(scenarioDir, 'layer/themes/prototype/user-stories/002-auth'), { recursive: true });
      await fs.mkdir(path.join(scenarioDir, 'layer/themes/prototype/user-stories/003-data'), { recursive: true });

      const authMvpPath = path.join(scenarioDir, 'layer/themes/prototype/user-stories/002-auth/FEATURE.vf.json');
      const authMvpWrapper = new VFDistributedFeatureWrapper(authMvpPath);
      
      await authMvpWrapper.write(authMvpPath, {
        metadata: {
          level: 'user_story',
          parent_id: prototypeEpicId,
          path: '/layer/themes/prototype/user-stories/002-auth/FEATURE.vf.json',
          version: '1.0.0',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        features: {}
      });

      await authMvpWrapper.addFeature('auth_prototype', {
        name: 'Auth Prototype',
        data: {
          title: 'Authentication Prototype',
          description: 'Basic auth for testing',
          level: 'user_story',
          parent_feature_id: prototypeEpicId,
          epic_id: prototypeEpicId,
          status: 'in-progress',
          priority: 'high',
          tags: ['auth', 'prototype'],
          components: ['SimpleAuth.tsx'],
          virtual_path: '/layer/themes/prototype/user-stories/002-auth/FEATURE.vf.json'
        }
      });

      // 5. ITERATION 2: Restructure - split prototype into separate epics
      await fs.mkdir(path.join(scenarioDir, 'layer/themes/auth-system/user-stories/001-login'), { recursive: true });
      await fs.mkdir(path.join(scenarioDir, 'layer/themes/data-management/user-stories/001-storage'), { recursive: true });

      // Create new auth epic
      const authSystemPath = path.join(scenarioDir, 'layer/themes/auth-system/FEATURE.vf.json');
      const authSystemWrapper = new VFDistributedFeatureWrapper(authSystemPath);
      
      await authSystemWrapper.write(authSystemPath, {
        metadata: {
          level: 'epic',
          parent_id: platformId,
          path: '/layer/themes/auth-system/FEATURE.vf.json',
          version: '1.0.0',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        features: {}
      });

      const authSystemEpicId = await authSystemWrapper.addFeature('auth_system', {
        name: 'Authentication System',
        data: {
          title: 'Production Authentication System',
          description: 'Full-featured authentication system evolved from prototype',
          level: 'epic',
          parent_feature_id: platformId,
          status: 'planned',
          priority: 'high',
          tags: ['auth', 'production'],
          virtual_path: '/layer/themes/auth-system/FEATURE.vf.json'
        }
      });

      // 6. ITERATION 3: Change priorities and status rapidly
      const updates = [
        { wrapper: mvpWrapper, path: mvpPath, status: 'completed' },
        { wrapper: authMvpWrapper, path: authMvpPath, status: 'blocked' },
        { wrapper: prototypeWrapper, path: prototypePath, status: 'completed' }
      ];

      for (const update of updates) {
        const content = await update.wrapper.read(update.path);
        for (const [category, features] of Object.entries(content.features)) {
          features.forEach((feature: DistributedFeature) => {
            feature.data.status = update.status as any;
            feature.updatedAt = new Date().toISOString();
          });
        }
        content.metadata.updated_at = new Date().toISOString();
        await update.wrapper.write(update.path, content);
      }

      // 7. Add new features to evolved epics
      const loginPath = path.join(scenarioDir, 'layer/themes/auth-system/user-stories/001-login/FEATURE.vf.json');
      const loginWrapper = new VFDistributedFeatureWrapper(loginPath);
      
      await loginWrapper.write(loginPath, {
        metadata: {
          level: 'user_story',
          parent_id: authSystemEpicId,
          path: '/layer/themes/auth-system/user-stories/001-login/FEATURE.vf.json',
          version: '1.0.0',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        features: {}
      });

      await loginWrapper.addFeature('production_login', {
        name: 'Production Login',
        data: {
          title: 'Production-Ready Login',
          description: 'Secure, scalable login system based on prototype learnings',
          level: 'user_story',
          parent_feature_id: authSystemEpicId,
          epic_id: authSystemEpicId,
          status: 'planned',
          priority: 'critical',
          tags: ['login', 'production', 'security'],
          components: ['SecureLogin.tsx', 'AuthService.ts', 'SessionManager.ts'],
          acceptanceCriteria: [
            'Multi-factor authentication support',
            'Session management with JWT',
            'Rate limiting for failed attempts',
            'Secure password requirements'
          ],
          virtual_path: '/layer/themes/auth-system/user-stories/001-login/FEATURE.vf.json'
        }
      });

      // 8. Update root to reflect new structure
      const rootContent = await rootWrapper.read(rootPath);
      rootContent.children = [
        '/layer/themes/prototype/FEATURE.vf.json',
        '/layer/themes/auth-system/FEATURE.vf.json'
      ];
      await rootWrapper.write(rootPath, rootContent);

      // Update prototype children
      const prototypeContent = await prototypeWrapper.read(prototypePath);
      prototypeContent.children = [
        '/layer/themes/prototype/user-stories/001-mvp/FEATURE.vf.json',
        '/layer/themes/prototype/user-stories/002-auth/FEATURE.vf.json'
      ];
      await prototypeWrapper.write(prototypePath, prototypeContent);

      // Update auth system children
      const authSystemContent = await authSystemWrapper.read(authSystemPath);
      authSystemContent.children = [
        '/layer/themes/auth-system/user-stories/001-login/FEATURE.vf.json'
      ];
      await authSystemWrapper.write(authSystemPath, authSystemContent);

      // 9. Verify final state after rapid changes
      const finalRootResult = await rootWrapper.read(rootPath);
      
      // Should have both epics
      expect(finalRootResult.aggregated_view?.prototype).toHaveLength(1);
      expect(finalRootResult.aggregated_view?.auth_system).toHaveLength(1);
      
      // Should show different statuses
      expect(finalRootResult.aggregated_view?.prototype[0].data.status).toBe('completed');
      expect(finalRootResult.aggregated_view?.auth_system[0].data.status).toBe('planned');
      
      // Should have evolved from prototype to production features
      expect(finalRootResult.aggregated_view?.mvp_core).toHaveLength(1);
      expect(finalRootResult.aggregated_view?.auth_prototype).toHaveLength(1);
      expect(finalRootResult.aggregated_view?.production_login).toHaveLength(1);
      
      // Should show blocked prototype auth
      expect(finalRootResult.aggregated_view?.auth_prototype[0].data.status).toBe('blocked');
      
      // Should show new production login as planned
      expect(finalRootResult.aggregated_view?.production_login[0].data.status).toBe('planned');

      console.log('✅ Scenario 3: Rapid Prototyping with Frequent Changes - PASSED');
    });
  });

  describe('🚨 Story: Scenario 4: Large Enterprise Platform', () => {
    const scenarioDir = path.join(testBaseDir, 'scenario4');
    
    test('should handle large enterprise platform with many features', async () => {
      // Given: The system is in a valid state
      // When: handle large enterprise platform with many features
      // Then: The expected behavior occurs
      await fs.mkdir(scenarioDir, { recursive: true });

      // Create large enterprise structure
      const modules = [
        { name: 'user-management', teams: ['identity', 'permissions', 'profiles'] },
        { name: 'content-platform', teams: ['cms', 'media', 'workflow'] },
        { name: 'analytics-suite', teams: ['tracking', 'reporting', 'insights'] },
        { name: 'integration-hub', teams: ['api', 'webhooks', 'third-party'] },
        { name: 'admin-console', teams: ['monitoring', 'configuration', 'maintenance'] }
      ];

      // Create directory structure
      for (const module of modules) {
        await fs.mkdir(path.join(scenarioDir, `layer/themes/${module.name}`), { recursive: true });
        for (const team of module.teams) {
          for (let i = 1; i <= 3; i++) {
            const storyNum = String(i).padStart(3, '0');
            await fs.mkdir(path.join(scenarioDir, `layer/themes/${module.name}/user-stories/${storyNum}-${team}`), { recursive: true });
          }
        }
      }

      // 1. Create enterprise root platform
      const rootPath = path.join(scenarioDir, 'FEATURE.vf.json');
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

      const platformId = await rootWrapper.addFeature('enterprise', {
        name: 'Enterprise Platform',
        data: {
          title: 'Enterprise Business Platform',
          description: 'Comprehensive enterprise platform with multiple business modules',
          level: 'root',
          status: 'in-progress',
          priority: 'critical',
          tags: ['enterprise', 'platform', 'business'],
          virtual_path: '/FEATURE.vf.json'
        }
      });

      // 2. Create module epics
      const moduleIds: Record<string, string> = {};
      const priorities = ['critical', 'high', 'high', 'medium', 'medium'];
      const statuses = ['completed', 'in-progress', 'in-progress', 'planned', 'planned'];

      for (let i = 0; i < modules.length; i++) {
        const module = modules[i];
        const modulePath = path.join(scenarioDir, `layer/themes/${module.name}/FEATURE.vf.json`);
        const moduleWrapper = new VFDistributedFeatureWrapper(modulePath);
        
        await moduleWrapper.write(modulePath, {
          metadata: {
            level: 'epic',
            parent_id: platformId,
            path: `/layer/themes/${module.name}/FEATURE.vf.json`,
            version: '1.0.0',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          features: {}
        });

        const moduleId = await moduleWrapper.addFeature(module.name.replace('-', '_'), {
          name: module.name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
          data: {
            title: `${module.name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} Module`,
            description: `Enterprise ${module.name.replace('-', ' ')} capabilities`,
            level: 'epic',
            parent_feature_id: platformId,
            status: statuses[i] as any,
            priority: priorities[i] as any,
            tags: [module.name, 'enterprise'],
            virtual_path: `/layer/themes/${module.name}/FEATURE.vf.json`
          }
        });
        
        moduleIds[module.name] = moduleId;
      }

      // 3. Create team features (45 total user stories = 5 modules × 3 teams × 3 stories)
      let totalStoriesCreated = 0;
      const teamFeatures = ['core', 'advanced', 'integration'];
      
      for (const module of modules) {
        const childrenPaths: string[] = [];
        
        for (let teamIndex = 0; teamIndex < module.teams.length; teamIndex++) {
          const team = module.teams[teamIndex];
          
          for (let storyIndex = 0; storyIndex < 3; storyIndex++) {
            const storyNum = String(storyIndex + 1).padStart(3, '0');
            const storyPath = path.join(scenarioDir, `layer/themes/${module.name}/user-stories/${storyNum}-${team}/FEATURE.vf.json`);
            const storyWrapper = new VFDistributedFeatureWrapper(storyPath);
            
            await storyWrapper.write(storyPath, {
              metadata: {
                level: 'user_story',
                parent_id: moduleIds[module.name],
                path: `/layer/themes/${module.name}/user-stories/${storyNum}-${team}/FEATURE.vf.json`,
                version: '1.0.0',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              },
              features: {}
            });

            const featureName = teamFeatures[storyIndex];
            const storyStatus = totalStoriesCreated < 15 ? 'completed' : 
                              totalStoriesCreated < 30 ? 'in-progress' : 'planned';
            const storyPriority = totalStoriesCreated < 10 ? 'critical' :
                                totalStoriesCreated < 25 ? 'high' : 
                                totalStoriesCreated < 35 ? 'medium' : 'low';

            await storyWrapper.addFeature(`${team}_${featureName}`, {
              name: `${team.charAt(0).toUpperCase() + team.slice(1)} ${featureName.charAt(0).toUpperCase() + featureName.slice(1)}`,
              data: {
                title: `${team.charAt(0).toUpperCase() + team.slice(1)} ${featureName.charAt(0).toUpperCase() + featureName.slice(1)} Feature`,
                description: `${featureName.charAt(0).toUpperCase() + featureName.slice(1)} functionality for ${team} team in ${module.name}`,
                level: 'user_story',
                parent_feature_id: moduleIds[module.name],
                epic_id: moduleIds[module.name],
                status: storyStatus as any,
                priority: storyPriority as any,
                tags: [module.name, team, featureName],
                assignee: `${team}-team`,
                components: [`${team}${featureName.charAt(0).toUpperCase() + featureName.slice(1)}.tsx`],
                acceptanceCriteria: [
                  `${featureName} functionality is implemented`,
                  'Enterprise security standards are met',
                  'Performance requirements are satisfied',
                  'Integration tests pass'
                ],
                virtual_path: `/layer/themes/${module.name}/user-stories/${storyNum}-${team}/FEATURE.vf.json`
              }
            });

            childrenPaths.push(`/layer/themes/${module.name}/user-stories/${storyNum}-${team}/FEATURE.vf.json`);
            totalStoriesCreated++;
          }
        }

        // Update module with children
        const modulePath = path.join(scenarioDir, `layer/themes/${module.name}/FEATURE.vf.json`);
        const moduleWrapper = new VFDistributedFeatureWrapper(modulePath);
        const moduleContent = await moduleWrapper.read(modulePath);
        moduleContent.children = childrenPaths;
        await moduleWrapper.write(modulePath, moduleContent);
      }

      // 4. Update root with all modules
      const rootContent = await rootWrapper.read(rootPath);
      rootContent.children = modules.map(module => `/layer/themes/${module.name}/FEATURE.vf.json`);
      await rootWrapper.write(rootPath, rootContent);

      // 5. Verify enterprise scale aggregation
      const finalRootResult = await rootWrapper.read(rootPath);
      
      // Should have all 5 modules
      expect(Object.keys(finalRootResult.aggregated_view || {}).filter(key => 
        key.includes('user_management') || key.includes('content_platform') || 
        key.includes('analytics_suite') || key.includes('integration_hub') || 
        key.includes('admin_console')
      ).length).toBe(5);

      // Should have all 45 user stories (15 categories × 3 features each)
      const allStoryKeys = Object.keys(finalRootResult.aggregated_view || {}).filter(key => 
        key.includes('_core') || key.includes('_advanced') || key.includes('_integration')
      );
      expect(allStoryKeys.length).toBe(45);

      // Verify status distribution
      const completedFeatures = Object.values(finalRootResult.aggregated_view || {})
        .flat()
        .filter((feature: any) => feature.data.status === 'completed');
      const inProgressFeatures = Object.values(finalRootResult.aggregated_view || {})
        .flat()
        .filter((feature: any) => feature.data.status === 'in-progress');
      const plannedFeatures = Object.values(finalRootResult.aggregated_view || {})
        .flat()
        .filter((feature: any) => feature.data.status === 'planned');

      expect(completedFeatures.length).toBe(16); // 1 platform + 15 stories
      expect(inProgressFeatures.length).toBe(17); // 2 modules + 15 stories  
      expect(plannedFeatures.length).toBe(17); // 2 modules + 15 stories

      // 6. Verify module-level aggregation
      const userMgmtPath = path.join(scenarioDir, 'layer/themes/user-management/FEATURE.vf.json');
      const userMgmtWrapper = new VFDistributedFeatureWrapper(userMgmtPath);
      const userMgmtResult = await userMgmtWrapper.read(userMgmtPath);
      
      // Should have 9 user stories (3 teams × 3 stories each)
      const userMgmtStories = Object.keys(userMgmtResult.aggregated_view || {}).filter(key => 
        key.includes('_core') || key.includes('_advanced') || key.includes('_integration')
      );
      expect(userMgmtStories.length).toBe(9);

      console.log('✅ Scenario 4: Large Enterprise Platform - PASSED');
      console.log(`   📊 Created ${totalStoriesCreated} user stories across ${modules.length} modules`);
    });
  });

  describe('🚨 Story: Scenario 5: Feature Migration and Evolution', () => {
    const scenarioDir = path.join(testBaseDir, 'scenario5');
    
    test('should handle feature migration from legacy to new structure', async () => {
      // Given: The system is in a valid state
      // When: handle feature migration from legacy to new structure
      // Then: The expected behavior occurs
      await fs.mkdir(scenarioDir, { recursive: true });
      
      // 1. Create legacy structure (single file approach)
      const legacyPath = path.join(scenarioDir, 'legacy-FEATURE.vf.json');
      const legacyWrapper = new VFDistributedFeatureWrapper(legacyPath);
      
      const legacyStructure: DistributedFeatureFile = {
        metadata: {
          level: 'root',
          path: '/legacy-FEATURE.vf.json',
          version: '0.9.0',
          created_at: '2024-12-01T10:00:00Z',
          updated_at: '2024-12-01T10:00:00Z'
        },
        features: {
          // All features mixed together in legacy format
          auth: [{
            id: 'legacy-auth-001',
            name: 'Legacy Auth',
            data: {
              title: 'Legacy Authentication',
              description: 'Old authentication system',
              level: 'epic',
              status: 'completed',
              priority: 'high',
              tags: ['legacy', 'auth'],
              virtual_path: '/legacy-FEATURE.vf.json'
            },
            createdAt: '2024-12-01T10:00:00Z',
            updatedAt: '2024-12-01T10:00:00Z'
          }],
          payments: [{
            id: 'legacy-pay-001',
            name: 'Legacy Payments',
            data: {
              title: 'Legacy Payment System',
              description: 'Old payment processing',
              level: 'epic',
              status: 'completed',
              priority: 'high',
              tags: ['legacy', 'payments'],
              virtual_path: '/legacy-FEATURE.vf.json'
            },
            createdAt: '2024-12-01T10:00:00Z',
            updatedAt: '2024-12-01T10:00:00Z'
          }],
          user_management: [{
            id: 'legacy-user-001',
            name: 'User Profile Management',
            data: {
              title: 'User Profile Management',
              description: 'Basic user profile features',
              level: 'user_story',
              status: 'completed',
              priority: 'medium',
              tags: ['legacy', 'users'],
              virtual_path: '/legacy-FEATURE.vf.json'
            },
            createdAt: '2024-12-01T10:00:00Z',
            updatedAt: '2024-12-01T10:00:00Z'
          }],
          reporting: [{
            id: 'legacy-report-001',
            name: 'Basic Reporting',
            data: {
              title: 'Basic Reporting',
              description: 'Simple reporting features',
              level: 'user_story',
              status: 'in-progress',
              priority: 'low',
              tags: ['legacy', 'reports'],
              virtual_path: '/legacy-FEATURE.vf.json'
            },
            createdAt: '2024-12-01T10:00:00Z',
            updatedAt: '2024-12-01T10:00:00Z'
          }]
        }
      };

      await legacyWrapper.write(legacyPath, legacyStructure);

      // 2. Create new distributed structure directories
      await fs.mkdir(path.join(scenarioDir, 'layer/themes/modern-auth/user-stories/001-oauth'), { recursive: true });
      await fs.mkdir(path.join(scenarioDir, 'layer/themes/modern-auth/user-stories/002-mfa'), { recursive: true });
      await fs.mkdir(path.join(scenarioDir, 'layer/themes/payment-v2/user-stories/001-stripe'), { recursive: true });
      await fs.mkdir(path.join(scenarioDir, 'layer/themes/payment-v2/user-stories/002-paypal'), { recursive: true });
      await fs.mkdir(path.join(scenarioDir, 'layer/themes/analytics/user-stories/001-dashboard'), { recursive: true });

      // 3. Create new root platform
      const newRootPath = path.join(scenarioDir, 'FEATURE.vf.json');
      const newRootWrapper = new VFDistributedFeatureWrapper(newRootPath);
      
      await newRootWrapper.write(newRootPath, {
        metadata: {
          level: 'root',
          path: '/FEATURE.vf.json',
          version: '2.0.0',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        features: {}
      });

      const newPlatformId = await newRootWrapper.addFeature('platform_v2', {
        name: 'Platform V2',
        data: {
          title: 'Next Generation Platform',
          description: 'Modern platform architecture with distributed features',
          level: 'root',
          status: 'in-progress',
          priority: 'critical',
          tags: ['v2', 'modern', 'distributed'],
          virtual_path: '/FEATURE.vf.json'
        }
      });

      // 4. Migrate auth features to modern structure
      const modernAuthPath = path.join(scenarioDir, 'layer/themes/modern-auth/FEATURE.vf.json');
      const modernAuthWrapper = new VFDistributedFeatureWrapper(modernAuthPath);
      
      await modernAuthWrapper.write(modernAuthPath, {
        metadata: {
          level: 'epic',
          parent_id: newPlatformId,
          path: '/layer/themes/modern-auth/FEATURE.vf.json',
          version: '2.0.0',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        features: {}
      });

      const modernAuthEpicId = await modernAuthWrapper.addFeature('modern_auth', {
        name: 'Modern Authentication',
        data: {
          title: 'Modern Authentication System',
          description: 'OAuth2, JWT, and MFA-enabled authentication system migrated from legacy',
          level: 'epic',
          parent_feature_id: newPlatformId,
          status: 'in-progress',
          priority: 'critical',
          tags: ['auth', 'modern', 'oauth', 'mfa'],
          dependencies: ['legacy-auth-001'], // Depends on legacy system for migration
          virtual_path: '/layer/themes/modern-auth/FEATURE.vf.json'
        }
      });

      // Add OAuth story
      const oauthPath = path.join(scenarioDir, 'layer/themes/modern-auth/user-stories/001-oauth/FEATURE.vf.json');
      const oauthWrapper = new VFDistributedFeatureWrapper(oauthPath);
      
      await oauthWrapper.write(oauthPath, {
        metadata: {
          level: 'user_story',
          parent_id: modernAuthEpicId,
          path: '/layer/themes/modern-auth/user-stories/001-oauth/FEATURE.vf.json',
          version: '2.0.0',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        features: {}
      });

      await oauthWrapper.addFeature('oauth_integration', {
        name: 'OAuth Integration',
        data: {
          title: 'OAuth 2.0 Integration',
          description: 'Modern OAuth 2.0 authentication replacing legacy system',
          level: 'user_story',
          parent_feature_id: modernAuthEpicId,
          epic_id: modernAuthEpicId,
          status: 'completed',
          priority: 'critical',
          tags: ['oauth', 'migration', 'modern'],
          components: ['OAuthProvider.tsx', 'TokenManager.ts'],
          acceptanceCriteria: [
            'Google OAuth integration works',
            'GitHub OAuth integration works',
            'Legacy user migration is seamless',
            'JWT tokens are properly managed'
          ],
          virtual_path: '/layer/themes/modern-auth/user-stories/001-oauth/FEATURE.vf.json'
        }
      });

      // Add MFA story
      const mfaPath = path.join(scenarioDir, 'layer/themes/modern-auth/user-stories/002-mfa/FEATURE.vf.json');
      const mfaWrapper = new VFDistributedFeatureWrapper(mfaPath);
      
      await mfaWrapper.write(mfaPath, {
        metadata: {
          level: 'user_story',
          parent_id: modernAuthEpicId,
          path: '/layer/themes/modern-auth/user-stories/002-mfa/FEATURE.vf.json',
          version: '2.0.0',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        features: {}
      });

      await mfaWrapper.addFeature('mfa_system', {
        name: 'Multi-Factor Authentication',
        data: {
          title: 'Multi-Factor Authentication',
          description: 'TOTP and SMS-based MFA system (new feature not in legacy)',
          level: 'user_story',
          parent_feature_id: modernAuthEpicId,
          epic_id: modernAuthEpicId,
          status: 'in-progress',
          priority: 'high',
          tags: ['mfa', 'security', 'new'],
          components: ['MFASetup.tsx', 'TOTPGenerator.ts', 'SMSProvider.ts'],
          acceptanceCriteria: [
            'TOTP authentication works with authenticator apps',
            'SMS backup authentication works',
            'Recovery codes are generated and managed',
            'MFA can be enabled/disabled by users'
          ],
          virtual_path: '/layer/themes/modern-auth/user-stories/002-mfa/FEATURE.vf.json'
        }
      });

      // 5. Migrate payments to modern structure
      const paymentV2Path = path.join(scenarioDir, 'layer/themes/payment-v2/FEATURE.vf.json');
      const paymentV2Wrapper = new VFDistributedFeatureWrapper(paymentV2Path);
      
      await paymentV2Wrapper.write(paymentV2Path, {
        metadata: {
          level: 'epic',
          parent_id: newPlatformId,
          path: '/layer/themes/payment-v2/FEATURE.vf.json',
          version: '2.0.0',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        features: {}
      });

      const paymentV2EpicId = await paymentV2Wrapper.addFeature('payment_v2', {
        name: 'Payment System V2',
        data: {
          title: 'Modern Payment Processing',
          description: 'Multi-provider payment system with Stripe and PayPal integration',
          level: 'epic',
          parent_feature_id: newPlatformId,
          status: 'planned',
          priority: 'high',
          tags: ['payments', 'v2', 'stripe', 'paypal'],
          dependencies: ['legacy-pay-001'],
          virtual_path: '/layer/themes/payment-v2/FEATURE.vf.json'
        }
      });

      // 6. Create analytics epic for evolved reporting
      const analyticsPath = path.join(scenarioDir, 'layer/themes/analytics/FEATURE.vf.json');
      const analyticsWrapper = new VFDistributedFeatureWrapper(analyticsPath);
      
      await analyticsWrapper.write(analyticsPath, {
        metadata: {
          level: 'epic',
          parent_id: newPlatformId,
          path: '/layer/themes/analytics/FEATURE.vf.json',
          version: '2.0.0',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        features: {}
      });

      const analyticsEpicId = await analyticsWrapper.addFeature('analytics', {
        name: 'Advanced Analytics',
        data: {
          title: 'Advanced Analytics Suite',
          description: 'Real-time analytics and reporting evolved from basic legacy reporting',
          level: 'epic',
          parent_feature_id: newPlatformId,
          status: 'planned',
          priority: 'medium',
          tags: ['analytics', 'reporting', 'evolved'],
          dependencies: ['legacy-report-001'],
          virtual_path: '/layer/themes/analytics/FEATURE.vf.json'
        }
      });

      // Add analytics dashboard
      const dashboardPath = path.join(scenarioDir, 'layer/themes/analytics/user-stories/001-dashboard/FEATURE.vf.json');
      const dashboardWrapper = new VFDistributedFeatureWrapper(dashboardPath);
      
      await dashboardWrapper.write(dashboardPath, {
        metadata: {
          level: 'user_story',
          parent_id: analyticsEpicId,
          path: '/layer/themes/analytics/user-stories/001-dashboard/FEATURE.vf.json',
          version: '2.0.0',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        features: {}
      });

      await dashboardWrapper.addFeature('analytics_dashboard', {
        name: 'Analytics Dashboard',
        data: {
          title: 'Real-time Analytics Dashboard',
          description: 'Interactive dashboard with real-time data visualization',
          level: 'user_story',
          parent_feature_id: analyticsEpicId,
          epic_id: analyticsEpicId,
          status: 'planned',
          priority: 'medium',
          tags: ['dashboard', 'realtime', 'visualization'],
          components: ['AnalyticsDashboard.tsx', 'ChartComponents.tsx', 'DataService.ts'],
          acceptanceCriteria: [
            'Real-time data updates every 30 seconds',
            'Interactive charts with drill-down capability',
            'Export functionality for reports',
            'Mobile-responsive design'
          ],
          virtual_path: '/layer/themes/analytics/user-stories/001-dashboard/FEATURE.vf.json'
        }
      });

      // 7. Create legacy compatibility epic (for features not yet migrated)
      const legacyCompatPath = path.join(scenarioDir, 'layer/themes/legacy-compat/FEATURE.vf.json');
      await fs.mkdir(path.dirname(legacyCompatPath), { recursive: true });
      const legacyCompatWrapper = new VFDistributedFeatureWrapper(legacyCompatPath);
      
      await legacyCompatWrapper.write(legacyCompatPath, {
        metadata: {
          level: 'epic',
          parent_id: newPlatformId,
          path: '/layer/themes/legacy-compat/FEATURE.vf.json',
          version: '2.0.0',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        features: {}
      });

      await legacyCompatWrapper.addFeature('legacy_compat', {
        name: 'Legacy Compatibility',
        data: {
          title: 'Legacy System Compatibility',
          description: 'Maintains compatibility with legacy features during migration',
          level: 'epic',
          parent_feature_id: newPlatformId,
          status: 'in-progress',
          priority: 'medium',
          tags: ['legacy', 'compatibility', 'migration'],
          virtual_path: '/layer/themes/legacy-compat/FEATURE.vf.json'
        }
      });

      // 8. Update root to include all new epics
      const newRootContent = await newRootWrapper.read(newRootPath);
      newRootContent.children = [
        '/layer/themes/modern-auth/FEATURE.vf.json',
        '/layer/themes/payment-v2/FEATURE.vf.json',
        '/layer/themes/analytics/FEATURE.vf.json',
        '/layer/themes/legacy-compat/FEATURE.vf.json'
      ];
      await newRootWrapper.write(newRootPath, newRootContent);

      // Update children for epics
      const modernAuthContent = await modernAuthWrapper.read(modernAuthPath);
      modernAuthContent.children = [
        '/layer/themes/modern-auth/user-stories/001-oauth/FEATURE.vf.json',
        '/layer/themes/modern-auth/user-stories/002-mfa/FEATURE.vf.json'
      ];
      await modernAuthWrapper.write(modernAuthPath, modernAuthContent);

      const analyticsContent = await analyticsWrapper.read(analyticsPath);
      analyticsContent.children = [
        '/layer/themes/analytics/user-stories/001-dashboard/FEATURE.vf.json'
      ];
      await analyticsWrapper.write(analyticsPath, analyticsContent);

      // 9. Verify migration results
      const finalNewResult = await newRootWrapper.read(newRootPath);
      const legacyResult = await legacyWrapper.read(legacyPath);

      // Should have migrated platform
      expect(finalNewResult.features.platform_v2).toHaveLength(1);
      expect(finalNewResult.features.platform_v2[0].data.tags).toContain('v2.0.0');

      // Should have modern epics
      expect(finalNewResult.aggregated_view?.modern_auth).toHaveLength(1);
      expect(finalNewResult.aggregated_view?.payment_v2).toHaveLength(1);
      expect(finalNewResult.aggregated_view?.analytics).toHaveLength(1);
      expect(finalNewResult.aggregated_view?.legacy_compat).toHaveLength(1);

      // Should have evolved features
      expect(finalNewResult.aggregated_view?.oauth_integration).toHaveLength(1);
      expect(finalNewResult.aggregated_view?.mfa_system).toHaveLength(1);
      expect(finalNewResult.aggregated_view?.analytics_dashboard).toHaveLength(1);

      // Should maintain legacy dependencies
      expect(finalNewResult.aggregated_view?.modern_auth[0].data.dependencies).toContain('legacy-auth-001');
      expect(finalNewResult.aggregated_view?.payment_v2[0].data.dependencies).toContain('legacy-pay-001');
      expect(finalNewResult.aggregated_view?.analytics[0].data.dependencies).toContain('legacy-report-001');

      // Legacy system should still exist
      expect(legacyResult.features.auth).toHaveLength(1);
      expect(legacyResult.features.payments).toHaveLength(1);
      expect(legacyResult.features.user_management).toHaveLength(1);
      expect(legacyResult.features.reporting).toHaveLength(1);

      // Should show evolution in features
      const oauthFeature = finalNewResult.aggregated_view?.oauth_integration?.[0];
      expect(oauthFeature?.data.tags).toContain('migration');
      expect(oauthFeature?.data.status).toBe('completed');

      const mfaFeature = finalNewResult.aggregated_view?.mfa_system?.[0];
      expect(mfaFeature?.data.tags).toContain('new');
      expect(mfaFeature?.data.status).toBe('in-progress');

      console.log('✅ Scenario 5: Feature Migration and Evolution - PASSED');
      console.log('   📈 Successfully migrated legacy monolithic structure to distributed architecture');
      console.log('   🔄 Maintained dependency tracking between legacy and modern systems');
      console.log('   ✨ Added new features (MFA) not present in legacy system');
    });
  });
});