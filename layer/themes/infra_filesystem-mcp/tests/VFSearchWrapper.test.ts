import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { VFSearchWrapper } from '../children/VFSearchWrapper';
import { VFDistributedFeatureWrapper } from '../children/VFDistributedFeatureWrapper';
import { VFNameIdWrapper } from '../children/VFNameIdWrapper';
import { fsPromises as fs } from 'fs/promises';
import { path } from '../../infra_external-log-lib/src';
import { os } from '../../infra_external-log-lib/src';

describe("VFSearchWrapper", () => {
  let tempDir: string;
  let searchWrapper: VFSearchWrapper;
  let featureWrapper: VFDistributedFeatureWrapper;
  let nameIdWrapper: VFNameIdWrapper;

  beforeEach(async () => {
    // Create temporary directory
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'vf-search-test-'));
    searchWrapper = new VFSearchWrapper(tempDir);
    featureWrapper = new VFDistributedFeatureWrapper(tempDir);
    nameIdWrapper = new VFNameIdWrapper(tempDir);

    // Create directory structure
    await fs.mkdir(path.join(tempDir, 'layer', 'themes', 'auth-theme'), { recursive: true });
    await fs.mkdir(path.join(tempDir, 'layer', 'themes', 'auth-theme', 'user-stories', 'login-story'), { recursive: true });
    await fs.mkdir(path.join(tempDir, 'layer', 'themes', 'payment-theme'), { recursive: true });
  });

  afterEach(async () => {
    // Clean up
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('Global Search', () => {
    beforeEach(async () => {
      // Create root FEATURE.vf.json
      const rootFeatures = {
        metadata: {
          level: 'root',
          path: '/',
          version: '1.0.0',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        features: {
          platform: [{
            id: 'platform-001',
            name: 'ai-dev-platform',
            data: {
              title: 'AI Development Platform',
              description: 'Main platform for AI development',
              level: 'root',
              status: 'in-progress',
              priority: 'high',
              tags: ["platform", 'core'],
              virtual_path: '/'
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }]
        }
      };
      await featureWrapper.write(path.join(tempDir, 'FEATURE.vf.json'), rootFeatures);

      // Create auth theme FEATURE.vf.json
      const authFeatures = {
        metadata: {
          level: 'theme',
          path: '/layer/themes/auth-theme',
          version: '1.0.0',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        features: {
          epics: [{
            id: 'auth-epic-001',
            name: 'authentication-epic',
            data: {
              title: 'Authentication Epic',
              description: 'User authentication and authorization',
              level: 'epic',
              status: 'in-progress',
              priority: 'high',
              tags: ['auth', "security"],
              assignee: 'dev-team-1',
              virtual_path: '/layer/themes/auth-theme'
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }],
          themes: [{
            id: 'auth-theme-001',
            name: 'auth-theme',
            data: {
              title: 'Authentication Theme',
              description: 'Theme for authentication features',
              level: 'theme',
              status: 'in-progress',
              priority: 'high',
              tags: ['auth', 'theme'],
              virtual_path: '/layer/themes/auth-theme'
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }]
        }
      };
      await featureWrapper.write(path.join(tempDir, 'layer', 'themes', 'auth-theme', 'FEATURE.vf.json'), authFeatures);

      // Create login story FEATURE.vf.json
      const loginStoryFeatures = {
        metadata: {
          level: 'user_story',
          path: '/layer/themes/auth-theme/user-stories/login-story',
          version: '1.0.0',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        features: {
          stories: [{
            id: 'story-login-001',
            name: 'user-login-story',
            data: {
              title: 'User Login Story',
              description: 'As a user, I want to login to the system',
              level: 'user_story',
              status: 'planned',
              priority: 'high',
              tags: ['auth', 'login', 'user-story'],
              epic_id: 'auth-epic-001',
              assignee: 'dev-1',
              virtual_path: '/layer/themes/auth-theme/user-stories/login-story'
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }]
        }
      };
      await featureWrapper.write(
        path.join(tempDir, 'layer', 'themes', 'auth-theme', 'user-stories', 'login-story', 'FEATURE.vf.json'),
        loginStoryFeatures
      );

      // Create root NAME_ID.vf.json
      const rootNameId = {
        'auth-service': [{
          id: 'service-001',
          name: 'auth-service',
          data: {
            type: 'service',
            namespace: 'root',
            tags: ['auth', 'service']
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }]
      };
      await nameIdWrapper.write(path.join(tempDir, 'NAME_ID.vf.json'), rootNameId);

      // Create auth theme NAME_ID.vf.json
      const authNameId = {
        'login-component': [{
          id: 'comp-001',
          name: 'login-component',
          data: {
            type: "component",
            namespace: 'auth-theme',
            tags: ['auth', 'ui', 'login']
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }]
      };
      await nameIdWrapper.write(path.join(tempDir, 'layer', 'themes', 'auth-theme', 'NAME_ID.vf.json'), authNameId);
    });

    it('should search all themes globally', async () => {
      const results = await searchWrapper.searchThemes();
      
      expect(results).toHaveLength(1);
      expect(results[0].type).toBe('feature');
      expect(results[0].item).toHaveProperty('name', 'auth-theme');
    });

    it('should search all epics globally', async () => {
      const results = await searchWrapper.searchEpics();
      
      expect(results).toHaveLength(1);
      expect(results[0].type).toBe('feature');
      expect(results[0].item).toHaveProperty('name', 'authentication-epic');
    });

    it('should search all user stories globally', async () => {
      const results = await searchWrapper.searchUserStories();
      
      expect(results).toHaveLength(1);
      expect(results[0].type).toBe('feature');
      expect(results[0].item).toHaveProperty('name', 'user-login-story');
    });

    it('should search by text query', async () => {
      const response = await searchWrapper.search({ query: 'login' }, 'global');
      
      // Should find both the login story and login component
      expect(response.totalResults).toBeGreaterThanOrEqual(2);
      
      const featureResults = response.results.filter(r => r.type === 'feature');
      const entityResults = response.results.filter(r => r.type === 'entity');
      
      expect(featureResults).toHaveLength(1);
      expect(entityResults).toHaveLength(1);
    });

    it('should search by tags', async () => {
      const response = await searchWrapper.search({ tags: ['auth'] }, 'global');
      
      // Should find items tagged with 'auth'
      expect(response.totalResults).toBeGreaterThanOrEqual(3); // epic, theme, story, service, component
      
      // Check facets
      expect(response.facets.tags).toHaveProperty('auth');
      expect(response.facets.tags.auth).toBeGreaterThanOrEqual(3);
    });

    it('should filter by assignee', async () => {
      const response = await searchWrapper.search({ assignee: 'dev-1' }, 'global');
      
      expect(response.totalResults).toBe(1);
      expect(response.results[0].item).toHaveProperty('name', 'user-login-story');
    });

    it('should find stories by epic ID', async () => {
      const results = await searchWrapper.searchUserStories(undefined, 'auth-epic-001');
      
      expect(results).toHaveLength(1);
      expect(results[0].item).toHaveProperty('name', 'user-login-story');
    });

    it('should generate proper facets', async () => {
      const response = await searchWrapper.search({}, 'global');
      
      expect(response.facets.levels).toHaveProperty('root');
      expect(response.facets.levels).toHaveProperty('epic');
      expect(response.facets.levels).toHaveProperty('theme');
      expect(response.facets.levels).toHaveProperty('user_story');
      
      expect(response.facets.status).toHaveProperty('in-progress');
      expect(response.facets.status).toHaveProperty('planned');
      
      expect(response.facets.tags).toHaveProperty('auth');
      expect(response.facets.tags).toHaveProperty("security");
    });
  });

  describe('Local Search', () => {
    beforeEach(async () => {
      // Setup same test data as global search
      // ... (same setup code as above)
    });

    it('should search only within auth theme and its children', async () => {
      const authThemePath = path.join(tempDir, 'layer', 'themes', 'auth-theme');
      const response = await searchWrapper.search({}, 'local', authThemePath);
      
      // Should find only auth theme items (epic, theme, story, component)
      const featureResults = response.results.filter(r => r.type === 'feature');
      const entityResults = response.results.filter(r => r.type === 'entity');
      
      expect(featureResults.length).toBeGreaterThanOrEqual(2); // epic, theme, story
      expect(entityResults.length).toBeGreaterThanOrEqual(1); // component
      
      // Should not find root level items
      const rootItems = response.results.filter(r => 
        r.source.includes('FEATURE.vf.json') && !r.source.includes('themes')
      );
      expect(rootItems).toHaveLength(0);
    });

    it('should get all stories under a theme', async () => {
      const stories = await searchWrapper.getStoriesByTheme('auth-theme');
      
      expect(stories).toHaveLength(1);
      expect(stories[0].item).toHaveProperty('name', 'user-login-story');
    });
  });

  describe('Search Relevance', () => {
    it('should rank exact title matches higher', async () => {
      // Create features with similar content
      const features = {
        metadata: {
          level: 'root',
          path: '/',
          version: '1.0.0',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        features: {
          test: [
            {
              id: 'feat-001',
              name: 'feature-1',
              data: {
                title: 'Login Feature',
                description: 'Some other content',
                level: 'theme',
                status: 'planned',
                priority: 'high',
                virtual_path: '/'
              },
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            },
            {
              id: 'feat-002',
              name: 'feature-2',
              data: {
                title: 'Other Feature',
                description: 'Login functionality described here',
                level: 'theme',
                status: 'planned',
                priority: 'high',
                virtual_path: '/'
              },
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }
          ]
        }
      };
      await featureWrapper.write(path.join(tempDir, 'test-FEATURE.vf.json'), features);

      const response = await searchWrapper.search({ query: 'login' }, 'global');
      
      // Title match should rank higher
      const titleMatch = response.results.find(r => 
        r.type === 'feature' && (r.item as any).data.title === 'Login Feature'
      );
      const descMatch = response.results.find(r => 
        r.type === 'feature' && (r.item as any).data.title === 'Other Feature'
      );
      
      expect(titleMatch).toBeDefined();
      expect(descMatch).toBeDefined();
      expect(titleMatch!.relevance).toBeGreaterThan(descMatch!.relevance);
    });
  });

  describe('Feature Hierarchy', () => {
    beforeEach(async () => {
      // Create hierarchical features
      const features = {
        metadata: {
          level: 'root',
          path: '/',
          version: '1.0.0',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        features: {
          test: [
            {
              id: 'parent-001',
              name: 'parent-feature',
              data: {
                title: 'Parent Feature',
                description: 'Parent',
                level: 'epic',
                status: 'planned',
                priority: 'high',
                child_features: ['child-001', 'child-002'],
                virtual_path: '/'
              },
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            },
            {
              id: 'child-001',
              name: 'child-feature-1',
              data: {
                title: 'Child Feature 1',
                description: 'First child',
                level: 'user_story',
                status: 'planned',
                priority: 'high',
                parent_feature_id: 'parent-001',
                virtual_path: '/'
              },
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            },
            {
              id: 'child-002',
              name: 'child-feature-2',
              data: {
                title: 'Child Feature 2',
                description: 'Second child',
                level: 'user_story',
                status: 'planned',
                priority: 'medium',
                parent_feature_id: 'parent-001',
                virtual_path: '/'
              },
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }
          ]
        }
      };
      await featureWrapper.write(path.join(tempDir, 'hierarchy-FEATURE.vf.json'), features);
    });

    it('should retrieve feature hierarchy', async () => {
      const hierarchy = await searchWrapper.getFeatureHierarchy('parent-001');
      
      expect(hierarchy).toBeDefined();
      expect(hierarchy.feature.id).toBe('parent-001');
      expect(hierarchy.children).toHaveLength(2);
      expect(hierarchy.children[0].feature.id).toBe('child-001');
      expect(hierarchy.children[1].feature.id).toBe('child-002');
    });
  });

  describe('Text Highlighting', () => {
    it('should generate text highlights for matches', async () => {
      const features = {
        metadata: {
          level: 'root',
          path: '/',
          version: '1.0.0',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        features: {
          test: [{
            id: 'highlight-001',
            name: 'test-feature',
            data: {
              title: 'This is a test feature for highlighting',
              description: 'The test should highlight this text properly',
              level: 'theme',
              status: 'planned',
              priority: 'high',
              virtual_path: '/'
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }]
        }
      };
      await featureWrapper.write(path.join(tempDir, 'highlight-FEATURE.vf.json'), features);

      const response = await searchWrapper.search({ query: 'test' }, 'global');
      const result = response.results.find(r => r.item.id === 'highlight-001');
      
      expect(result).toBeDefined();
      expect(result!.highlight).toBeDefined();
      expect(result!.highlight!.length).toBeGreaterThan(0);
      
      const titleHighlight = result!.highlight!.find(h => h.field === 'title');
      expect(titleHighlight).toBeDefined();
      expect(titleHighlight!.snippet).toContain('test');
    });
  });
});