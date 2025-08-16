import { VFDistributedFeatureWrapper, DistributedFeatureFile, DistributedFeature } from '../children/VFDistributedFeatureWrapper';
import { fsPromises as fs } from 'fs/promises';
import { path } from '../../infra_external-log-lib/src';

// Mock fs module
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
    access: jest.fn(),
    mkdir: jest.fn()
  }
}));

const mockFs = fs as jest.Mocked<typeof fs>;

describe("VFDistributedFeatureWrapper", () => {
  let wrapper: VFDistributedFeatureWrapper;
  const testFilePath = '/test/FEATURE.vf.json';
  const testSchemaPath = '/test/schema.json';

  beforeEach(() => {
    wrapper = new VFDistributedFeatureWrapper(testFilePath, testSchemaPath);
    jest.clearAllMocks();
  });

  describe('Hierarchical Level Management', () => {
    test('should identify root level features correctly', async () => {
      const rootFeatureFile: DistributedFeatureFile = {
        metadata: {
          level: 'root',
          path: '/FEATURE.vf.json',
          version: '1.0.0',
          created_at: '2025-01-24T10:00:00Z',
          updated_at: '2025-01-24T10:00:00Z'
        },
        features: {
          platform: [{
            id: 'root-001',
            name: 'AI Development Platform',
            data: {
              title: 'AI Development Platform',
              description: 'Complete platform for AI-assisted development',
              level: 'root',
              status: 'in-progress',
              priority: "critical",
              virtual_path: '/FEATURE.vf.json'
            },
            createdAt: '2025-01-24T10:00:00Z',
            updatedAt: '2025-01-24T10:00:00Z'
          }]
        }
      };

      mockFs.readFile.mockResolvedValue(JSON.stringify(rootFeatureFile));

      const result = await wrapper.read('/FEATURE.vf.json');
      
      expect(result.metadata.level).toBe('root');
      expect(result.features.platform[0].data.level).toBe('root');
      expect(result.features.platform[0].data.virtual_path).toBe('/FEATURE.vf.json');
    });

    test('should identify epic level features correctly', async () => {
      const epicFeatureFile: DistributedFeatureFile = {
        metadata: {
          level: 'epic',
          parent_id: 'root-001',
          path: '/layer/themes/filesystem_mcp/FEATURE.vf.json',
          version: '1.0.0',
          created_at: '2025-01-24T10:00:00Z',
          updated_at: '2025-01-24T10:00:00Z'
        },
        features: {
          filesystem: [{
            id: 'epic-001',
            name: 'Virtual File System',
            data: {
              title: 'Virtual File System with MCP Integration',
              description: 'Complete virtual file system implementation',
              level: 'epic',
              parent_feature_id: 'root-001',
              status: 'in-progress',
              priority: 'high',
              virtual_path: '/layer/themes/filesystem_mcp/FEATURE.vf.json'
            },
            createdAt: '2025-01-24T10:00:00Z',
            updatedAt: '2025-01-24T10:00:00Z'
          }]
        }
      };

      mockFs.readFile.mockResolvedValue(JSON.stringify(epicFeatureFile));

      const result = await wrapper.read('/layer/themes/filesystem_mcp/FEATURE.vf.json');
      
      expect(result.metadata.level).toBe('epic');
      expect(result.metadata.parent_id).toBe('root-001');
      expect(result.features.filesystem[0].data.level).toBe('epic');
    });

    test('should filter features by level when query parameter provided', async () => {
      const mixedFeatureFile: DistributedFeatureFile = {
        metadata: {
          level: 'root',
          path: '/FEATURE.vf.json',
          version: '1.0.0',
          created_at: '2025-01-24T10:00:00Z',
          updated_at: '2025-01-24T10:00:00Z'
        },
        features: {},
        aggregated_view: {
          mixed: [
            {
              id: 'root-001',
              name: 'Root Feature',
              data: {
                title: 'Root Feature',
                description: 'A root level feature',
                level: 'root',
                status: 'in-progress',
                priority: 'high',
                virtual_path: '/FEATURE.vf.json'
              },
              createdAt: '2025-01-24T10:00:00Z',
              updatedAt: '2025-01-24T10:00:00Z'
            },
            {
              id: 'epic-001',
              name: 'Epic Feature',
              data: {
                title: 'Epic Feature',
                description: 'An epic level feature',
                level: 'epic',
                status: 'planned',
                priority: 'medium',
                virtual_path: '/layer/themes/test/FEATURE.vf.json'
              },
              createdAt: '2025-01-24T10:00:00Z',
              updatedAt: '2025-01-24T10:00:00Z'
            }
          ]
        }
      };

      mockFs.readFile.mockResolvedValue(JSON.stringify(mixedFeatureFile));

      const result = await wrapper.read('/FEATURE.vf.json?level=epic');
      
      expect(result.aggregated_view?.mixed).toHaveLength(1);
      expect(result.aggregated_view?.mixed?.[0].data.level).toBe('epic');
    });
  });

  describe('Parent-Child Relationship Management', () => {
    test('should automatically assign epic for user story without parent', async () => {
      const userStoryFeature: Omit<DistributedFeature, 'id' | "createdAt" | "updatedAt"> = {
        name: 'Login Form',
        data: {
          title: 'User Login Form',
          description: 'Create login form for users',
          level: 'user_story',
          status: 'planned',
          priority: 'high',
          virtual_path: '/layer/themes/auth/user-stories/001-login/FEATURE.vf.json'
        }
      };

      const featureFile: DistributedFeatureFile = {
        metadata: {
          level: 'user_story',
          path: '/layer/themes/auth/user-stories/001-login/FEATURE.vf.json',
          version: '1.0.0',
          created_at: '2025-01-24T10:00:00Z',
          updated_at: '2025-01-24T10:00:00Z'
        },
        features: {}
      };

      mockFs.readFile.mockResolvedValue(JSON.stringify(featureFile));
      mockFs.writeFile.mockResolvedValue();

      const featureId = await wrapper.addFeature('auth', userStoryFeature);

      expect(featureId).toBeDefined();
      expect(mockFs.writeFile).toHaveBeenCalled();
      
      const writeCall = mockFs.writeFile.mock.calls[0];
      const writtenContent = JSON.parse(writeCall[1] as string) as DistributedFeatureFile;
      
      // Should have created a common epic
      expect(writtenContent.features.common).toBeDefined();
      expect(writtenContent.features.common[0].id).toMatch(/^common-/);
      expect(writtenContent.features.common[0].data.level).toBe('epic');
      
      // User story should be assigned to the common epic
      expect(writtenContent.features.auth[0].data.epic_id).toMatch(/^common-/);
    });

    test('should use existing parent epic when available', async () => {
      const userStoryFeature: Omit<DistributedFeature, 'id' | "createdAt" | "updatedAt"> = {
        name: 'Login Form',
        data: {
          title: 'User Login Form',
          description: 'Create login form for users',
          level: 'user_story',
          status: 'planned',
          priority: 'high',
          virtual_path: '/layer/themes/auth/user-stories/001-login/FEATURE.vf.json'
        }
      };

      const featureFileWithEpic: DistributedFeatureFile = {
        metadata: {
          level: 'user_story',
          path: '/layer/themes/auth/user-stories/001-login/FEATURE.vf.json',
          version: '1.0.0',
          created_at: '2025-01-24T10:00:00Z',
          updated_at: '2025-01-24T10:00:00Z'
        },
        features: {
          auth: [{
            id: 'epic-auth-001',
            name: 'Authentication System',
            data: {
              title: 'Authentication System',
              description: 'Complete authentication system',
              level: 'epic',
              status: 'in-progress',
              priority: 'high',
              virtual_path: '/layer/themes/auth/FEATURE.vf.json'
            },
            createdAt: '2025-01-24T10:00:00Z',
            updatedAt: '2025-01-24T10:00:00Z'
          }]
        }
      };

      mockFs.readFile.mockResolvedValue(JSON.stringify(featureFileWithEpic));
      mockFs.writeFile.mockResolvedValue();

      const featureId = await wrapper.addFeature('auth', userStoryFeature);

      const writeCall = mockFs.writeFile.mock.calls[0];
      const writtenContent = JSON.parse(writeCall[1] as string) as DistributedFeatureFile;
      
      // Should use existing epic, not create common epic
      expect(writtenContent.features.common).toBeUndefined();
      expect(writtenContent.features.auth[1].data.epic_id).toBe('epic-auth-001');
      expect(writtenContent.features.auth[1].data.parent_feature_id).toBe('epic-auth-001');
    });

    test('should update child_features array for parent features', async () => {
      const featureFile: DistributedFeatureFile = {
        metadata: {
          level: 'epic',
          path: '/layer/themes/auth/FEATURE.vf.json',
          version: '1.0.0',
          created_at: '2025-01-24T10:00:00Z',
          updated_at: '2025-01-24T10:00:00Z'
        },
        features: {
          auth: [
            {
              id: 'epic-auth-001',
              name: 'Authentication System',
              data: {
                title: 'Authentication System',
                description: 'Complete authentication system',
                level: 'epic',
                status: 'in-progress',
                priority: 'high',
                virtual_path: '/layer/themes/auth/FEATURE.vf.json'
              },
              createdAt: '2025-01-24T10:00:00Z',
              updatedAt: '2025-01-24T10:00:00Z'
            },
            {
              id: 'story-001',
              name: 'Login Form',
              data: {
                title: 'User Login Form',
                description: 'Create login form for users',
                level: 'user_story',
                parent_feature_id: 'epic-auth-001',
                status: 'planned',
                priority: 'high',
                virtual_path: '/layer/themes/auth/user-stories/001-login/FEATURE.vf.json'
              },
              createdAt: '2025-01-24T10:00:00Z',
              updatedAt: '2025-01-24T10:00:00Z'
            }
          ]
        }
      };

      mockFs.readFile.mockResolvedValue(JSON.stringify(featureFile));
      mockFs.writeFile.mockResolvedValue();

      await wrapper.write('/layer/themes/auth/FEATURE.vf.json', featureFile);

      const writeCall = mockFs.writeFile.mock.calls[0];
      const writtenContent = JSON.parse(writeCall[1] as string) as DistributedFeatureFile;
      
      // Epic should have child_features updated
      expect(writtenContent.features.auth[0].data.child_features).toContain('story-001');
    });
  });

  describe('Aggregated View Generation', () => {
    test('should aggregate features from child files', async () => {
      const parentFile: DistributedFeatureFile = {
        metadata: {
          level: 'epic',
          path: '/layer/themes/filesystem_mcp/FEATURE.vf.json',
          version: '1.0.0',
          created_at: '2025-01-24T10:00:00Z',
          updated_at: '2025-01-24T10:00:00Z'
        },
        features: {
          filesystem: [{
            id: 'epic-001',
            name: 'Virtual File System',
            data: {
              title: 'Virtual File System',
              description: 'Complete virtual file system',
              level: 'epic',
              status: 'in-progress',
              priority: 'high',
              virtual_path: '/layer/themes/filesystem_mcp/FEATURE.vf.json'
            },
            createdAt: '2025-01-24T10:00:00Z',
            updatedAt: '2025-01-24T10:00:00Z'
          }]
        },
        children: ['/layer/themes/filesystem_mcp/user-stories/001-wrapper/FEATURE.vf.json']
      };

      const childFile: DistributedFeatureFile = {
        metadata: {
          level: 'user_story',
          parent_id: 'epic-001',
          path: '/layer/themes/filesystem_mcp/user-stories/001-wrapper/FEATURE.vf.json',
          version: '1.0.0',
          created_at: '2025-01-24T10:00:00Z',
          updated_at: '2025-01-24T10:00:00Z'
        },
        features: {
          wrapper: [{
            id: 'story-001',
            name: 'File Wrapper',
            data: {
              title: 'VF File Wrapper',
              description: 'Basic file wrapper implementation',
              level: 'user_story',
              parent_feature_id: 'epic-001',
              status: "completed",
              priority: 'high',
              virtual_path: '/layer/themes/filesystem_mcp/user-stories/001-wrapper/FEATURE.vf.json'
            },
            createdAt: '2025-01-24T10:00:00Z',
            updatedAt: '2025-01-24T10:00:00Z'
          }]
        }
      };

      mockFs.readFile
        .mockResolvedValueOnce(JSON.stringify(parentFile))
        .mockResolvedValueOnce(JSON.stringify(childFile));

      const result = await wrapper.read('/layer/themes/filesystem_mcp/FEATURE.vf.json');

      expect(result.aggregated_view).toBeDefined();
      expect(result.aggregated_view?.filesystem).toBeDefined();
      expect(result.aggregated_view?.wrapper).toBeDefined();
      expect(result.aggregated_view?.wrapper[0].id).toBe('story-001');
    });

    test('should handle missing child files gracefully', async () => {
      const parentFile: DistributedFeatureFile = {
        metadata: {
          level: 'epic',
          path: '/layer/themes/filesystem_mcp/FEATURE.vf.json',
          version: '1.0.0',
          created_at: '2025-01-24T10:00:00Z',
          updated_at: '2025-01-24T10:00:00Z'
        },
        features: {
          filesystem: [{
            id: 'epic-001',
            name: 'Virtual File System',
            data: {
              title: 'Virtual File System',
              description: 'Complete virtual file system',
              level: 'epic',
              status: 'in-progress',
              priority: 'high',
              virtual_path: '/layer/themes/filesystem_mcp/FEATURE.vf.json'
            },
            createdAt: '2025-01-24T10:00:00Z',
            updatedAt: '2025-01-24T10:00:00Z'
          }]
        },
        children: ['/non-existent/FEATURE.vf.json']
      };

      mockFs.readFile
        .mockResolvedValueOnce(JSON.stringify(parentFile))
        .mockRejectedValueOnce(new Error('File not found'));

      // Should not throw and should still return parent features
      const result = await wrapper.read('/layer/themes/filesystem_mcp/FEATURE.vf.json');

      expect(result.aggregated_view).toBeDefined();
      expect(result.aggregated_view?.filesystem).toBeDefined();
      expect(result.aggregated_view?.filesystem[0].id).toBe('epic-001');
    });
  });

  describe('Common Epic Creation', () => {
    test('should create common epic with correct naming', async () => {
      const userStoryFeature: Omit<DistributedFeature, 'id' | "createdAt" | "updatedAt"> = {
        name: 'Test Feature',
        data: {
          title: 'Test Feature',
          description: 'A test feature without parent epic',
          level: 'theme',
          status: 'planned',
          priority: 'medium',
          virtual_path: '/layer/themes/test_theme/FEATURE.vf.json'
        }
      };

      const featureFile: DistributedFeatureFile = {
        metadata: {
          level: 'theme',
          path: '/layer/themes/test_theme/FEATURE.vf.json',
          version: '1.0.0',
          created_at: '2025-01-24T10:00:00Z',
          updated_at: '2025-01-24T10:00:00Z'
        },
        features: {}
      };

      mockFs.readFile.mockResolvedValue(JSON.stringify(featureFile));
      mockFs.writeFile.mockResolvedValue();

      await wrapper.addFeature('test', userStoryFeature);

      const writeCall = mockFs.writeFile.mock.calls[0];
      const writtenContent = JSON.parse(writeCall[1] as string) as DistributedFeatureFile;
      
      expect(writtenContent.features.common).toBeDefined();
      expect(writtenContent.features.common[0].id).toBe('common-test_theme');
      expect(writtenContent.features.common[0].data.title).toBe('Common Features - test_theme');
      expect(writtenContent.features.common[0].data.tags).toContain('auto-generated');
      expect(writtenContent.features.common[0].data.tags).toContain('common');
    });

    test('should reuse existing common epic', async () => {
      const existingCommonEpic: DistributedFeature = {
        id: 'common-test_theme',
        name: 'Common Features',
        data: {
          title: 'Common Features - test_theme',
          description: 'Auto-generated epic for features without explicit parent epic',
          level: 'epic',
          status: 'in-progress',
          priority: 'medium',
          tags: ['auto-generated', 'common'],
          child_features: [],
          virtual_path: '/layer/themes/test_theme/FEATURE.vf.json'
        },
        createdAt: '2025-01-24T10:00:00Z',
        updatedAt: '2025-01-24T10:00:00Z'
      };

      const featureFile: DistributedFeatureFile = {
        metadata: {
          level: 'theme',
          path: '/layer/themes/test_theme/FEATURE.vf.json',
          version: '1.0.0',
          created_at: '2025-01-24T10:00:00Z',
          updated_at: '2025-01-24T10:00:00Z'
        },
        features: {
          common: [existingCommonEpic]
        }
      };

      const userStoryFeature: Omit<DistributedFeature, 'id' | "createdAt" | "updatedAt"> = {
        name: 'Test Feature',
        data: {
          title: 'Test Feature',
          description: 'A test feature without parent epic',
          level: 'theme',
          status: 'planned',
          priority: 'medium',
          virtual_path: '/layer/themes/test_theme/FEATURE.vf.json'
        }
      };

      mockFs.readFile.mockResolvedValue(JSON.stringify(featureFile));
      mockFs.writeFile.mockResolvedValue();

      await wrapper.addFeature('test', userStoryFeature);

      const writeCall = mockFs.writeFile.mock.calls[0];
      const writtenContent = JSON.parse(writeCall[1] as string) as DistributedFeatureFile;
      
      // Should still have only one common epic
      expect(writtenContent.features.common).toHaveLength(1);
      expect(writtenContent.features.common[0].id).toBe('common-test_theme');
      
      // New feature should be assigned to existing common epic
      expect(writtenContent.features.test[0].data.epic_id).toBe('common-test_theme');
    });
  });

  describe('Metadata Management', () => {
    test('should automatically update timestamps on write', async () => {
      const featureFile: DistributedFeatureFile = {
        metadata: {
          level: 'root',
          path: '/FEATURE.vf.json',
          version: '1.0.0',
          created_at: '2025-01-24T10:00:00Z',
          updated_at: '2025-01-24T10:00:00Z'
        },
        features: {}
      };

      mockFs.readFile.mockResolvedValue(JSON.stringify(featureFile));
      mockFs.writeFile.mockResolvedValue();

      const startTime = new Date().toISOString();
      await wrapper.write('/FEATURE.vf.json', featureFile);
      
      const writeCall = mockFs.writeFile.mock.calls[0];
      const writtenContent = JSON.parse(writeCall[1] as string) as DistributedFeatureFile;
      
      expect(new Date(writtenContent.metadata.updated_at).getTime()).toBeGreaterThanOrEqual(new Date(startTime).getTime());
      expect(writtenContent.metadata.created_at).toBe('2025-01-24T10:00:00Z'); // Should preserve original
    });

    test('should set created_at if not provided', async () => {
      const featureFile: DistributedFeatureFile = {
        metadata: {
          level: 'root',
          path: '/FEATURE.vf.json',
          version: '1.0.0',
          updated_at: '2025-01-24T10:00:00Z'
        } as any, // Missing created_at
        features: {}
      };

      mockFs.readFile.mockResolvedValue(JSON.stringify(featureFile));
      mockFs.writeFile.mockResolvedValue();

      await wrapper.write('/FEATURE.vf.json', featureFile);
      
      const writeCall = mockFs.writeFile.mock.calls[0];
      const writtenContent = JSON.parse(writeCall[1] as string) as DistributedFeatureFile;
      
      expect(writtenContent.metadata.created_at).toBeDefined();
      expect(writtenContent.metadata.created_at).toBe(writtenContent.metadata.updated_at);
    });
  });
});