/**
 * Debug test for freeze validation
 */

import { VFFileStructureWrapper } from '../../children/VFFileStructureWrapper';
import * as fs from 'fs/promises';
import { path } from '../../../infra_external-log-lib/src';

describe('Debug Freeze Validation', () => {
  let wrapper: VFFileStructureWrapper;
  let testBasePath: string;

  beforeEach(async () => {
    testBasePath = path.join(__dirname, 'test-debug-freeze');
    await fs.mkdir(testBasePath, { recursive: true });
    
    const structure = {
      metadata: {
        version: '2.1.0',
        description: 'Test structure'
      },
      templates: {
        workspace: {
          id: 'workspace',
          type: 'directory',
          freeze: true,
          freeze_message: 'Root is frozen',
          required_children: [
            { name: 'CLAUDE.md', type: 'file' },
            { name: 'gen', type: 'directory', children: [
              { name: 'doc', type: 'directory' }
            ]}
          ],
          platform_files: '$ref:platform_specific_root_files'
        }
      },
      platform_specific_root_files: {
        node: [
          { name: 'package.json', type: 'file' }
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
    await fs.rm(testBasePath, { recursive: true, force: true });
  });

  it('should debug platform file validation', async () => {
    console.log('Testing package.json...');
    const result = await wrapper.validateWrite('package.json', false);
    console.log('Result:', result);
    
    // Also test validatePath directly
    const pathResult = await wrapper.validatePath('package.json', false);
    console.log('Path validation:', pathResult);
  });

  it('should debug subdirectory validation', async () => {
    console.log('Testing gen/doc/report.md...');
    const result = await wrapper.validateWrite('gen/doc/report.md', false);
    console.log('Result:', result);
    
    // Test each part
    const genResult = await wrapper.validatePath('gen', true);
    console.log('gen validation:', genResult);
    
    const docResult = await wrapper.validatePath('gen/doc', true);
    console.log('gen/doc validation:', docResult);
  });
});