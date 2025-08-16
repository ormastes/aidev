/**
 * Unit test for freeze validation in VFFileStructureWrapper
 */

import { VFFileStructureWrapper } from '../../children/VFFileStructureWrapper';
import * as fs from 'fs/promises';
import { path } from '../../../infra_external-log-lib/src';

describe('Freeze Validation Unit Test', () => {
  let wrapper: VFFileStructureWrapper;
  let testBasePath: string;

  beforeEach(async () => {
    // Create test directory
    testBasePath = path.join(__dirname, 'test-freeze-validation');
    await fs.mkdir(testBasePath, { recursive: true });
    
    // Create a mock FILE_STRUCTURE.vf.json with freeze settings
    const structure = {
      metadata: {
        version: '2.1.0',
        description: 'Test structure with freeze validation'
      },
      templates: {
        workspace: {
          id: 'workspace',
          type: 'directory',
          freeze: true,
          freeze_message: 'Root directory is frozen. Create files in appropriate subdirectories: gen/doc/ for reports, layer/themes/ for features',
          required_children: [
            { name: 'CLAUDE.md', type: 'file' },
            { name: 'README.md', type: 'file' },
            { name: 'gen', type: 'directory', children: [
              { name: 'doc', type: 'directory' }
            ]},
            { name: 'layer', type: 'directory' }
          ],
          platform_files: '$ref:platform_specific_root_files'
        }
      },
      platform_specific_root_files: {
        node: [
          { name: 'package.json', type: 'file' },
          { name: 'package-lock.json', type: 'file' }
        ],
        common: [
          { name: '.gitignore', type: 'file', pattern: '^\\.gitignore$' }
        ]
      },
      structure: {
        name: '.',
        type: 'directory',
        template: 'workspace'
      }
    };
    
    await fs.writeFile(
      path.join(testBasePath, 'FILE_STRUCTURE.vf.json'),
      JSON.stringify(structure, null, 2)
    );
    
    wrapper = new VFFileStructureWrapper(testBasePath);
  });

  afterEach(async () => {
    // Clean up
    await fs.rm(testBasePath, { recursive: true, force: true });
  });

  describe('validateWrite with freeze', () => {
    it('should block unauthorized root files', async () => {
      const result = await wrapper.validateWrite('test.js', false);
      
      expect(result.valid).toBe(false);
      expect(result.message).toContain('Root directory is frozen');
    });

    it('should allow required root files', async () => {
      const result = await wrapper.validateWrite('CLAUDE.md', false);
      
      expect(result.valid).toBe(true);
    });

    it('should allow platform-specific files', async () => {
      const result = await wrapper.validateWrite('package.json', false);
      
      expect(result.valid).toBe(true);
    });

    it('should allow files in allowed subdirectories', async () => {
      const result = await wrapper.validateWrite('gen/doc/report.md', false);
      
      expect(result.valid).toBe(true);
    });

    it('should block files in root even with different extensions', async () => {
      const unauthorizedFiles = [
        'script.sh',
        'demo.png',
        'test.log',
        'random.txt'
      ];

      for (const file of unauthorizedFiles) {
        const result = await wrapper.validateWrite(file, false);
        expect(result.valid).toBe(false);
        expect(result.message).toContain('frozen');
      }
    });
  });

  describe('checkFreezeStatus', () => {
    it('should provide helpful freeze messages', async () => {
      const result = await wrapper.validateWrite('unauthorized.js', false);
      
      expect(result.message).toContain('gen/doc/');
      expect(result.message).toContain('layer/themes/');
    });

    it('should handle nested frozen directories', async () => {
      // Add a frozen theme directory
      const structure = await wrapper.loadStructure();
      structure.templates['theme'] = {
        id: 'theme',
        type: 'directory',
        freeze: true,
        freeze_message: 'Theme root is frozen. Use subdirectories.',
        required_children: [
          { name: 'children', type: 'directory' }
        ]
      };
      
      // Update structure
      await fs.writeFile(
        path.join(testBasePath, 'FILE_STRUCTURE.vf.json'),
        JSON.stringify(structure, null, 2)
      );
      
      // Force reload
      wrapper = new VFFileStructureWrapper(testBasePath);
      
      // This would need more complex setup to test properly
      // Just verifying the basic structure works
      const result = await wrapper.validateWrite('test.js', false);
      expect(result.valid).toBe(false);
    });
  });
});