/**
 * System test for MCP server freeze validation
 */

import { path } from '../../../infra_external-log-lib/src';
import * as fs from 'fs/promises';

// Mock the problematic dependencies
jest.mock('../../dist/pipe/index.js', () => ({
  VFFileWrapper: jest.requireActual('../../children/VFFileWrapper').VFFileWrapper,
  VFNameIdWrapper: jest.fn().mockImplementation(() => ({
    read: jest.fn().mockResolvedValue({}),
    write: jest.fn().mockResolvedValue(undefined)
  })),
  VFIdNameWrapper: jest.fn().mockImplementation(() => ({
    read: jest.fn().mockResolvedValue({}),
    write: jest.fn().mockResolvedValue(undefined)
  })),
  VFTaskQueueWrapper: jest.fn().mockImplementation(() => ({
    read: jest.fn().mockResolvedValue({ queues: {} }),
    write: jest.fn().mockResolvedValue(undefined),
    pop: jest.fn().mockResolvedValue({})
  })),
  VFFileStructureWrapper: jest.requireActual('../../children/VFFileStructureWrapper').VFFileStructureWrapper,
  VFValidatedFileWrapper: jest.requireActual('../../children/VFValidatedFileWrapper').VFValidatedFileWrapper
}));

jest.mock('../../dist/children/CommentTaskExecutor.js', () => ({
  CommentTaskExecutor: {
    createWithCommentSupport: jest.fn().mockReturnValue({})
  }
}));

jest.mock('../../src/VFSetupFolderWrapper.js', () => jest.fn());

describe('MCP Server Freeze Validation', () => {
  let server: any;
  let testBasePath: string;

  beforeEach(async () => {
    // Create test directory
    testBasePath = path.join(__dirname, 'test-mcp-freeze');
    await fs.mkdir(testBasePath, { recursive: true });
    
    // Copy real FILE_STRUCTURE.vf.json
    const structureContent = await fs.readFile(
      path.join(__dirname, '../../../../../../FILE_STRUCTURE.vf.json'),
      'utf-8'
    );
    await fs.writeFile(
      path.join(testBasePath, 'FILE_STRUCTURE.vf.json'),
      structureContent
    );
    
    // Import after mocks are set up
    const FilesystemMCPServer = require('../../mcp-server.js');
    
    // Need to set NODE_ENV to ensure mocks work properly
    process.env.VF_BASE_PATH = testBasePath;
    
    server = new FilesystemMCPServer(testBasePath);
  });

  afterEach(async () => {
    await fs.rm(testBasePath, { recursive: true, force: true });
  });

  describe('handleWrite freeze validation', () => {
    it('should block unauthorized root files', async () => {
      // Given: The system is in a valid state
      // When: block unauthorized root files
      // Then: The expected behavior occurs
      const unauthorizedFiles = [
        'test.js',
        'script.sh',
        'demo.png',
        'random.txt'
      ];

      for (const file of unauthorizedFiles) {
        const result = await server.handleRequest('vf_write', {
          file,
          content: 'test content'
        });

        expect(result.error).toBeDefined();
        expect(result.error).toContain('frozen');
      }
    });

    it('should allow platform-specific files', async () => {
      // Given: The system is in a valid state
      // When: allow platform-specific files
      // Then: The expected behavior occurs
      const result = await server.handleRequest('vf_write', {
        file: 'package.json',
        content: '{"name": "test"}'
      });

      // Should succeed (no error)
      expect(result.error).toBeUndefined();
    });

    it('should allow files in gen/doc/', async () => {
      // Given: The system is in a valid state
      // When: allow files in gen/doc/
      // Then: The expected behavior occurs
      const result = await server.handleRequest('vf_write', {
        file: 'gen/doc/report.md',
        content: '# Report'
      });

      expect(result.error).toBeUndefined();
    });
  });

  describe("handleWriteValidated", () => {
    it('should enforce freeze validation', async () => {
      // Given: The system is in a valid state
      // When: enforce freeze validation
      // Then: The expected behavior occurs
      const result = await server.handleRequest('vf_write_validated', {
        file: 'unauthorized.js',
        content: 'test'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('frozen');
    });

    it('should suggest using proper directories', async () => {
      // Given: The system is in a valid state
      // When: suggest using proper directories
      // Then: The expected behavior occurs
      const result = await server.handleRequest('vf_write_validated', {
        file: 'demo.txt',
        content: 'demo'
      });

      expect(result.success).toBe(false);
      expect(result.suggestion || result.error).toContain('gen/doc/');
    });
  });
});