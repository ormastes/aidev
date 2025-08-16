/**
 * Real-world integration test for freeze validation
 * This test simulates the actual bug scenario where files are created at root
 */

import { VFValidatedFileWrapper } from '../../children/VFValidatedFileWrapper';
import * as fs from 'fs/promises';
import { path } from '../../../infra_external-log-lib/src';

describe('Real-world Freeze Validation', () => {
  let wrapper: VFValidatedFileWrapper;
  let testBasePath: string;

  beforeEach(async () => {
    // Use the actual aidev root for testing
    testBasePath = path.join(__dirname, 'test-real-world-freeze');
    await fs.mkdir(testBasePath, { recursive: true });
    
    // Copy the real FILE_STRUCTURE.vf.json
    const realStructure = await fs.readFile(
      path.join(__dirname, '../../../../../../FILE_STRUCTURE.vf.json'),
      'utf-8'
    );
    await fs.writeFile(
      path.join(testBasePath, 'FILE_STRUCTURE.vf.json'),
      realStructure
    );
    
    wrapper = new VFValidatedFileWrapper(testBasePath);
  });

  afterEach(async () => {
    await fs.rm(testBasePath, { recursive: true, force: true });
  });

  describe('Files that should be blocked at root', () => {
    const unauthorizedRootFiles = [
      'playwright-demo.js',
      'portal-after-login.png',
      'portal-before-login.png',
      'portal-initial.png',
      'run-playwright-test.sh',
      'start-mcp.sh',
      'test-ai-portal-login.js',
      'test-mcp.sh',
      'test-playwright-login.js',
      'test_output.log'
    ];

    unauthorizedRootFiles.forEach(file => {
      it(`should block creation of ${file}`, async () => {
        await expect(wrapper.write(file, 'test content'))
          .rejects
          .toThrow(/frozen/);
      });
    });
  });

  describe('Files that should be allowed', () => {
    it('should allow platform-specific files', async () => {
      await wrapper.write('package.json', { name: 'test' });
      await wrapper.write('package-lock.json', {});
      await wrapper.write('.gitignore', 'node_modules');
    });

    it('should allow required root files', async () => {
      await wrapper.write('README.md', '# Test');
      await wrapper.write('CLAUDE.md', '# Claude Config');
      await wrapper.write('TASK_QUEUE.vf.json', { queues: {} });
    });

    it('should allow files in gen/doc/', async () => {
      await wrapper.write('gen/doc/report.md', '# Report');
      await wrapper.write('gen/doc/analysis.md', '# Analysis');
    });

    it('should allow files in layer/themes/', async () => {
      await wrapper.write('layer/themes/test-theme/README.md', '# Theme');
      await wrapper.write('layer/themes/test-theme/children/component.ts', 'export {}');
    });
  });

  describe('Error messages', () => {
    it('should provide helpful freeze message', async () => {
      try {
        await wrapper.write('unauthorized.js', 'test');
        fail('Should have thrown');
      } catch (error: any) {
        expect(error.message).toContain('Root directory is frozen');
        expect(error.message).toContain('gen/doc/');
        expect(error.message).toContain('layer/themes/');
      }
    });
  });
});