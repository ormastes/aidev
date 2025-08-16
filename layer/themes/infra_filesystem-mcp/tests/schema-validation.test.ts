import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { fsPromises as fs } from 'fs/promises';
import { path } from '../../infra_external-log-lib/src';

/**
 * Schema validation tests for distributed feature system
 */
describe('Distributed Feature Schema Validation', () => {
  let ajv: Ajv;
  let distributedFeatureSchema: any;
  let distributedFileStructureSchema: any;

  beforeAll(async () => {
    ajv = new Ajv({ allErrors: true, strict: false });
    addFormats(ajv);

    // Load schemas
    const schemaDir = path.join(__dirname, '../schemas');
    distributedFeatureSchema = JSON.parse(
      await fs.readFile(path.join(schemaDir, 'distributed_feature_vf_schema.json'), 'utf-8')
    );
    distributedFileStructureSchema = JSON.parse(
      await fs.readFile(path.join(schemaDir, 'distributed_file_structure_vf_schema.json'), 'utf-8')
    );
  });

  describe('Distributed Feature Schema Validation', () => {
    test('should validate valid root level feature file', () => {
      const validRootFeature = {
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
              tags: ["platform", 'ai'],
              virtual_path: '/FEATURE.vf.json'
            },
            createdAt: '2025-01-24T10:00:00Z',
            updatedAt: '2025-01-24T10:00:00Z'
          }]
        },
        children: ['/layer/themes/filesystem_mcp/FEATURE.vf.json'],
        aggregated_view: {
          platform: [{
            id: 'root-001',
            name: 'AI Development Platform',
            data: {
              title: 'AI Development Platform',
              description: 'Complete platform',
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

      const validate = ajv.compile(distributedFeatureSchema);
      const valid = validate(validRootFeature);

      if (!valid) {
        console.log('Validation errors:', validate.errors);
      }
      expect(valid).toBe(true);
    });

    test('should validate valid epic level feature file', () => {
      const validEpicFeature = {
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
              tags: ["filesystem", 'mcp'],
              child_features: ['story-001', 'story-002'],
              virtual_path: '/layer/themes/filesystem_mcp/FEATURE.vf.json'
            },
            createdAt: '2025-01-24T10:00:00Z',
            updatedAt: '2025-01-24T10:00:00Z'
          }]
        },
        children: [
          '/layer/themes/filesystem_mcp/user-stories/001-wrapper/FEATURE.vf.json'
        ]
      };

      const validate = ajv.compile(distributedFeatureSchema);
      const valid = validate(validEpicFeature);

      if (!valid) {
        console.log('Validation errors:', validate.errors);
      }
      expect(valid).toBe(true);
    });

    test('should validate user story level feature file', () => {
      const validUserStoryFeature = {
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
            name: 'VF File Wrapper',
            data: {
              title: 'VFFileWrapper Implementation',
              description: 'Basic virtual file operations',
              level: 'user_story',
              parent_feature_id: 'epic-001',
              epic_id: 'epic-001',
              status: "completed",
              priority: 'high',
              tags: ['wrapper', 'file-operations'],
              components: ['VFFileWrapper.ts'],
              acceptanceCriteria: [
                'read() method handles query parameter parsing',
                'write() method handles file write operations'
              ],
              virtual_path: '/layer/themes/filesystem_mcp/user-stories/001-wrapper/FEATURE.vf.json'
            },
            createdAt: '2025-01-24T10:00:00Z',
            updatedAt: '2025-01-24T10:00:00Z'
          }]
        }
      };

      const validate = ajv.compile(distributedFeatureSchema);
      const valid = validate(validUserStoryFeature);

      if (!valid) {
        console.log('Validation errors:', validate.errors);
      }
      expect(valid).toBe(true);
    });

    test('should reject invalid level values', () => {
      const invalidFeature = {
        metadata: {
          level: 'invalid_level', // Invalid level
          path: '/FEATURE.vf.json',
          version: '1.0.0',
          created_at: '2025-01-24T10:00:00Z',
          updated_at: '2025-01-24T10:00:00Z'
        },
        features: {}
      };

      const validate = ajv.compile(distributedFeatureSchema);
      const valid = validate(invalidFeature);

      expect(valid).toBe(false);
      expect(validate.errors?.some(error => 
        error.instancePath === '/metadata/level' && 
        error.keyword === 'enum'
      )).toBe(true);
    });

    test('should reject missing required metadata fields', () => {
      const invalidFeature = {
        metadata: {
          level: 'root',
          // Missing required fields: path, version, created_at, updated_at
        },
        features: {}
      };

      const validate = ajv.compile(distributedFeatureSchema);
      const valid = validate(invalidFeature);

      expect(valid).toBe(false);
      expect(validate.errors?.some(error => error.keyword === "required")).toBe(true);
    });

    test('should reject invalid status values', () => {
      const invalidFeature = {
        metadata: {
          level: 'root',
          path: '/FEATURE.vf.json',
          version: '1.0.0',
          created_at: '2025-01-24T10:00:00Z',
          updated_at: '2025-01-24T10:00:00Z'
        },
        features: {
          test: [{
            id: 'test-001',
            name: 'Test Feature',
            data: {
              title: 'Test Feature',
              description: 'A test feature',
              level: 'root',
              status: 'invalid_status', // Invalid status
              priority: 'high',
              virtual_path: '/FEATURE.vf.json'
            },
            createdAt: '2025-01-24T10:00:00Z',
            updatedAt: '2025-01-24T10:00:00Z'
          }]
        }
      };

      const validate = ajv.compile(distributedFeatureSchema);
      const valid = validate(invalidFeature);

      expect(valid).toBe(false);
      expect(validate.errors?.some(error => 
        error.instancePath.includes('/status') && 
        error.keyword === 'enum'
      )).toBe(true);
    });

    test('should reject invalid priority values', () => {
      const invalidFeature = {
        metadata: {
          level: 'root',
          path: '/FEATURE.vf.json',
          version: '1.0.0',
          created_at: '2025-01-24T10:00:00Z',
          updated_at: '2025-01-24T10:00:00Z'
        },
        features: {
          test: [{
            id: 'test-001',
            name: 'Test Feature',
            data: {
              title: 'Test Feature',
              description: 'A test feature',
              level: 'root',
              status: 'planned',
              priority: 'invalid_priority', // Invalid priority
              virtual_path: '/FEATURE.vf.json'
            },
            createdAt: '2025-01-24T10:00:00Z',
            updatedAt: '2025-01-24T10:00:00Z'
          }]
        }
      };

      const validate = ajv.compile(distributedFeatureSchema);
      const valid = validate(invalidFeature);

      expect(valid).toBe(false);
      expect(validate.errors?.some(error => 
        error.instancePath.includes('/priority') && 
        error.keyword === 'enum'
      )).toBe(true);
    });

    test('should validate feature with all optional fields', () => {
      const completeFeature = {
        metadata: {
          level: 'epic',
          parent_id: 'root-001',
          common_epic: 'common-filesystem',
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
              epic_id: 'epic-filesystem-001',
              status: 'in-progress',
              priority: 'high',
              tags: ["filesystem", 'mcp', "integration"],
              assignee: 'filesystem-team',
              dueDate: '2025-02-01',
              dependencies: ['root-001'],
              components: ['VFFileWrapper.ts', 'VFNameIdWrapper.ts'],
              acceptanceCriteria: [
                'All wrapper classes implement async operations',
                'Schema validation works for all file types'
              ],
              child_features: ['story-001', 'story-002'],
              virtual_path: '/layer/themes/filesystem_mcp/FEATURE.vf.json'
            },
            createdAt: '2025-01-24T10:00:00Z',
            updatedAt: '2025-01-24T10:00:00Z'
          }]
        },
        children: [
          '/layer/themes/filesystem_mcp/user-stories/001-wrapper/FEATURE.vf.json',
          '/layer/themes/filesystem_mcp/user-stories/002-nameid/FEATURE.vf.json'
        ],
        aggregated_view: {
          filesystem: [{
            id: 'epic-001',
            name: 'Virtual File System',
            data: {
              title: 'Virtual File System with MCP Integration',
              description: 'Complete virtual file system implementation',
              level: 'epic',
              status: 'in-progress',
              priority: 'high',
              virtual_path: '/layer/themes/filesystem_mcp/FEATURE.vf.json'
            },
            createdAt: '2025-01-24T10:00:00Z',
            updatedAt: '2025-01-24T10:00:00Z'
          }]
        }
      };

      const validate = ajv.compile(distributedFeatureSchema);
      const valid = validate(completeFeature);

      if (!valid) {
        console.log('Validation errors:', validate.errors);
      }
      expect(valid).toBe(true);
    });
  });

  describe('Distributed File Structure Schema Validation', () => {
    test('should validate valid distributed file structure', () => {
      const validFileStructure = {
        metadata: {
          level: 'root',
          version: '2.0.0',
          created_at: '2025-01-24T10:00:00Z',
          updated_at: '2025-01-24T10:00:00Z',
          description: 'Test file structure with distributed features',
          supports_distributed_features: true
        },
        templates: {
          workspace: {
            id: "workspace",
            type: "directory",
            feature_level: 'root',
            has_feature_file: true,
            description: 'Root workspace template',
            required_children: [
              { name: 'FEATURE.vf.json', type: 'feature_file', feature_level: 'root' },
              { name: 'config', type: "directory" }
            ]
          },
          theme: {
            id: 'theme',
            type: "directory",
            feature_level: 'epic',
            has_feature_file: true,
            description: 'Theme folder template',
            required_children: [
              { name: 'FEATURE.vf.json', type: 'feature_file', feature_level: 'epic' }
            ]
          }
        },
        structure: {
          name: '.',
          type: "directory",
          template: "workspace",
          feature_level: 'root',
          children: [
            {
              name: 'FEATURE.vf.json',
              type: 'feature_file',
              feature_level: 'root',
              aggregates_children: true
            }
          ]
        },
        feature_distribution: {
          auto_create_epics: true,
          common_epic_prefix: 'common-',
          feature_file_locations: {
            root: '/FEATURE.vf.json',
            epic: '/layer/themes/{theme_name}/FEATURE.vf.json',
            theme: '/layer/themes/{theme_name}/FEATURE.vf.json',
            user_story: '/layer/themes/{theme_name}/user-stories/{story_name}/FEATURE.vf.json'
          }
        }
      };

      const validate = ajv.compile(distributedFileStructureSchema);
      const valid = validate(validFileStructure);

      if (!valid) {
        console.log('Validation errors:', validate.errors);
      }
      expect(valid).toBe(true);
    });

    test('should validate template with feature_level', () => {
      const templateWithFeatureLevel = {
        id: 'user_story',
        type: "directory",
        feature_level: 'user_story',
        has_feature_file: true,
        description: 'User story template',
        required_children: [
          { name: 'FEATURE.vf.json', type: 'feature_file', feature_level: 'user_story' },
          { name: 'src', type: "directory" }
        ],
        constraints: {
          requires_parent_epic: true,
          max_depth: 5
        }
      };

      const schema = distributedFileStructureSchema.definitions.distributed_template;
      const validate = ajv.compile(schema);
      const valid = validate(templateWithFeatureLevel);

      if (!valid) {
        console.log('Validation errors:', validate.errors);
      }
      expect(valid).toBe(true);
    });

    test('should validate node with feature_file type', () => {
      const featureFileNode = {
        name: 'FEATURE.vf.json',
        type: 'feature_file',
        feature_level: 'epic',
        aggregates_children: true,
        description: 'Epic level feature file'
      };

      const schema = distributedFileStructureSchema.definitions.distributed_node;
      const validate = ajv.compile(schema);
      const valid = validate(featureFileNode);

      if (!valid) {
        console.log('Validation errors:', validate.errors);
      }
      expect(valid).toBe(true);
    });

    test('should reject invalid feature_level values', () => {
      const invalidNode = {
        name: 'FEATURE.vf.json',
        type: 'feature_file',
        feature_level: 'invalid_level' // Invalid level
      };

      const schema = distributedFileStructureSchema.definitions.distributed_node;
      const validate = ajv.compile(schema);
      const valid = validate(invalidNode);

      expect(valid).toBe(false);
      expect(validate.errors?.some(error => 
        error.instancePath === '/feature_level' && 
        error.keyword === 'enum'
      )).toBe(true);
    });

    test('should validate complete feature_distribution configuration', () => {
      const featureDistribution = {
        auto_create_epics: true,
        common_epic_prefix: 'auto-',
        feature_file_locations: {
          root: '/FEATURE.vf.json',
          epic: '/epics/{epic_name}/FEATURE.vf.json',
          theme: '/themes/{theme_name}/FEATURE.vf.json',
          user_story: '/themes/{theme_name}/stories/{story_name}/FEATURE.vf.json'
        }
      };

      const schema = distributedFileStructureSchema.properties.feature_distribution;
      const validate = ajv.compile(schema);
      const valid = validate(featureDistribution);

      if (!valid) {
        console.log('Validation errors:', validate.errors);
      }
      expect(valid).toBe(true);
    });
  });

  describe('Cross-Schema Integration', () => {
    test('should validate that feature files conform to both schemas', () => {
      // A feature file should validate against the distributed feature schema
      const featureFile = {
        metadata: {
          level: 'theme',
          parent_id: 'epic-001',
          path: '/layer/themes/test/FEATURE.vf.json',
          version: '1.0.0',
          created_at: '2025-01-24T10:00:00Z',
          updated_at: '2025-01-24T10:00:00Z'
        },
        features: {
          test: [{
            id: 'theme-001',
            name: 'Test Theme',
            data: {
              title: 'Test Theme',
              description: 'A theme for testing',
              level: 'theme',
              parent_feature_id: 'epic-001',
              status: 'in-progress',
              priority: 'medium',
              virtual_path: '/layer/themes/test/FEATURE.vf.json'
            },
            createdAt: '2025-01-24T10:00:00Z',
            updatedAt: '2025-01-24T10:00:00Z'
          }]
        }
      };

      // The corresponding node definition should validate against file structure schema
      const nodeDefinition = {
        name: 'FEATURE.vf.json',
        type: 'feature_file',
        feature_level: 'theme',
        aggregates_children: false,
        description: 'Theme level feature file'
      };

      const featureValidate = ajv.compile(distributedFeatureSchema);
      const nodeValidate = ajv.compile(distributedFileStructureSchema.definitions.distributed_node);

      expect(featureValidate(featureFile)).toBe(true);
      expect(nodeValidate(nodeDefinition)).toBe(true);

      // Levels should match
      expect(featureFile.metadata.level).toBe('theme');
      expect(nodeDefinition.feature_level).toBe('theme');
    });
  });
});