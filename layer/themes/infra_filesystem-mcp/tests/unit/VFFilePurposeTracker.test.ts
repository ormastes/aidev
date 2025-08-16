/**
 * Unit tests for VFFilePurposeTracker
 */

import { VFFilePurposeTracker, FilePurpose, PurposeSearchParams } from '../../children/VFFilePurposeTracker';
import { VFNameIdWrapper } from '../../children/VFNameIdWrapper';
import * as fs from 'fs/promises';
import { path } from '../../../infra_external-log-lib/src';
import { createHash } from 'crypto';

// Mock dependencies
jest.mock('../../children/VFNameIdWrapper');
jest.mock('fs/promises');
jest.mock('crypto');

describe('VFFilePurposeTracker', () => {
  let tracker: VFFilePurposeTracker;
  let mockNameIdWrapper: jest.Mocked<VFNameIdWrapper>;
  const basePath = '/test/base/path';

  beforeEach(() => {
    jest.clearAllMocks();
    tracker = new VFFilePurposeTracker(basePath);
    mockNameIdWrapper = (VFNameIdWrapper as jest.MockedClass<typeof VFNameIdWrapper>).mock.instances[0] as any;
  });

  describe('registerFile', () => {
    it('should successfully register a file with purpose', async () => {
      // Mock file existence
      (fs.stat as jest.Mock).mockResolvedValue({
        isFile: () => true,
        size: 1024
      });

      // Mock content hash
      (createHash as jest.Mock).mockReturnValue({
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue('abc123hash')
      });

      // Mock file reading for hash
      (fs.readFile as jest.Mock).mockResolvedValue(Buffer.from('file content'));

      // Mock NAME_ID.vf.json read (empty storage)
      mockNameIdWrapper.read.mockResolvedValue({});

      // Mock write
      mockNameIdWrapper.write.mockResolvedValue(undefined);

      const result = await tracker.registerFile(
        'test-file.ts',
        'Test file for unit testing',
        {
          theme: 'test-theme',
          tags: ['test', 'unit']
        }
      );

      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
      expect(mockNameIdWrapper.write).toHaveBeenCalled();
    });

    it('should reject file registration without theme or directory', async () => {
      (fs.stat as jest.Mock).mockResolvedValue({
        isFile: () => true
      });

      const result = await tracker.registerFile(
        'test-file.ts',
        'Test file'
      );

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Either theme or directory must be specified for file registration');
    });

    it('should detect duplicate files', async () => {
      // Mock file existence
      (fs.stat as jest.Mock).mockResolvedValue({
        isFile: () => true,
        size: 1024
      });

      // Mock content hash
      (createHash as jest.Mock).mockReturnValue({
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue('abc123hash')
      });

      (fs.readFile as jest.Mock).mockResolvedValue(Buffer.from('file content'));

      // Mock existing file with same hash and purpose
      const existingFile: FilePurpose = {
        id: 'existing-001',
        filePath: 'existing-file.ts',
        purpose: 'test file for unit testing',
        theme: 'test-theme',
        metadata: {
          contentHash: 'abc123hash',
          size: 1024,
          createdAt: '2025-08-13T10:00:00.000Z',
          updatedAt: '2025-08-13T10:00:00.000Z'
        },
        status: 'active'
      };

      mockNameIdWrapper.read.mockResolvedValue({
        'existing-file.ts': [{
          id: 'existing-001',
          name: 'existing-file.ts',
          data: existingFile,
          createdAt: '2025-08-13T10:00:00.000Z',
          updatedAt: '2025-08-13T10:00:00.000Z'
        }]
      });

      const result = await tracker.registerFile(
        'test-file.ts',
        'Test file for unit testing',
        { theme: 'test-theme' }
      );

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('File with same content and purpose already exists');
      expect(result.duplicates).toHaveLength(1);
      expect(result.suggestions).toBeDefined();
    });

    it('should handle non-existent files', async () => {
      (fs.stat as jest.Mock).mockRejectedValue(new Error('File not found'));

      const result = await tracker.registerFile(
        'non-existent.ts',
        'Test purpose',
        { theme: 'test' }
      );

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('File non-existent.ts does not exist');
    });

    it('should update parent children when parentId is provided', async () => {
      (fs.stat as jest.Mock).mockResolvedValue({
        isFile: () => true,
        size: 1024
      });

      (createHash as jest.Mock).mockReturnValue({
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue('abc123hash')
      });

      (fs.readFile as jest.Mock).mockResolvedValue(Buffer.from('file content'));

      // Mock parent exists
      const parentFile: FilePurpose = {
        id: 'parent-001',
        filePath: 'parent.ts',
        purpose: 'Parent file',
        theme: 'test-theme',
        children: [],
        metadata: {
          createdAt: '2025-08-13T09:00:00.000Z',
          updatedAt: '2025-08-13T09:00:00.000Z'
        },
        status: 'active'
      };

      mockNameIdWrapper.read.mockResolvedValue({
        'parent.ts': [{
          id: 'parent-001',
          name: 'parent.ts',
          data: parentFile,
          createdAt: '2025-08-13T09:00:00.000Z',
          updatedAt: '2025-08-13T09:00:00.000Z'
        }]
      });

      mockNameIdWrapper.write.mockResolvedValue(undefined);

      const result = await tracker.registerFile(
        'child.ts',
        'Child file',
        {
          theme: 'test-theme',
          parentId: 'parent-001'
        }
      );

      expect(result.valid).toBe(true);
      expect(mockNameIdWrapper.write).toHaveBeenCalledTimes(2); // Once for parent update, once for child
    });
  });

  describe('searchByPurpose', () => {
    const mockPurposes: FilePurpose[] = [
      {
        id: 'file-001',
        filePath: 'src/utils.ts',
        purpose: 'Utility functions',
        theme: 'shared',
        metadata: {
          contentHash: 'hash1',
          size: 1000,
          createdAt: '2025-08-13T10:00:00.000Z',
          updatedAt: '2025-08-13T10:00:00.000Z'
        },
        tags: ['utility', 'shared'],
        status: 'active'
      },
      {
        id: 'file-002',
        filePath: 'src/config.ts',
        purpose: 'Configuration management',
        theme: 'platform',
        directory: 'src',
        metadata: {
          contentHash: 'hash2',
          size: 2000,
          createdAt: '2025-08-13T11:00:00.000Z',
          updatedAt: '2025-08-13T11:00:00.000Z'
        },
        tags: ['config'],
        status: 'active'
      },
      {
        id: 'file-003',
        filePath: 'test/utils.test.ts',
        purpose: 'Utility tests',
        theme: 'shared',
        parentId: 'file-001',
        metadata: {
          contentHash: 'hash3',
          size: 1500,
          createdAt: '2025-08-13T12:00:00.000Z',
          updatedAt: '2025-08-13T12:00:00.000Z'
        },
        tags: ['test', 'utility'],
        status: 'active'
      }
    ];

    beforeEach(() => {
      const storage: any = {};
      mockPurposes.forEach(purpose => {
        if (!storage[purpose.filePath]) {
          storage[purpose.filePath] = [];
        }
        storage[purpose.filePath].push({
          id: purpose.id,
          name: purpose.filePath,
          data: purpose,
          createdAt: purpose.metadata.createdAt,
          updatedAt: purpose.metadata.updatedAt
        });
      });
      mockNameIdWrapper.read.mockResolvedValue(storage);
    });

    it('should search by purpose text', async () => {
      const results = await tracker.searchByPurpose({ purpose: 'utility' });
      
      expect(results).toHaveLength(2);
      expect(results[0].purpose).toContain('Utility');
      expect(results[1].purpose).toContain('Utility');
    });

    it('should search by theme', async () => {
      const results = await tracker.searchByPurpose({ theme: 'shared' });
      
      expect(results).toHaveLength(2);
      expect(results.every(r => r.theme === 'shared')).toBe(true);
    });

    it('should search by directory', async () => {
      const results = await tracker.searchByPurpose({ directory: 'src' });
      
      expect(results).toHaveLength(1);
      expect(results[0].directory).toBe('src');
    });

    it('should search by parentId', async () => {
      const results = await tracker.searchByPurpose({ parentId: 'file-001' });
      
      expect(results).toHaveLength(1);
      expect(results[0].parentId).toBe('file-001');
    });

    it('should search by tags', async () => {
      const results = await tracker.searchByPurpose({ tags: ['utility'] });
      
      expect(results).toHaveLength(2);
      expect(results.every(r => r.tags?.includes('utility'))).toBe(true);
    });

    it('should search by multiple criteria', async () => {
      const results = await tracker.searchByPurpose({
        theme: 'shared',
        tags: ['test']
      });
      
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('file-003');
    });

    it('should return all when no criteria provided', async () => {
      const results = await tracker.searchByPurpose({});
      expect(results).toHaveLength(3);
    });
  });

  describe('validateFileCreation', () => {
    it('should prevent file creation without registration', async () => {
      mockNameIdWrapper.read.mockResolvedValue({});

      const result = await tracker.validateFileCreation(
        'new-file.ts',
        { theme: 'test-theme' }
      );

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('File new-file.ts must be registered with a purpose before creation');
      expect(result.suggestions).toBeDefined();
    });

    it('should allow file creation when registered', async () => {
      const existingFile: FilePurpose = {
        id: 'file-001',
        filePath: 'registered-file.ts',
        purpose: 'Test file',
        theme: 'test-theme',
        metadata: {
          createdAt: '2025-08-13T10:00:00.000Z',
          updatedAt: '2025-08-13T10:00:00.000Z'
        },
        status: 'active'
      };

      mockNameIdWrapper.read.mockResolvedValue({
        'registered-file.ts': [{
          id: 'file-001',
          name: 'registered-file.ts',
          data: existingFile,
          createdAt: '2025-08-13T10:00:00.000Z',
          updatedAt: '2025-08-13T10:00:00.000Z'
        }]
      });

      const result = await tracker.validateFileCreation(
        'registered-file.ts',
        { theme: 'test-theme' }
      );

      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });
  });

  describe('getHierarchy', () => {
    it('should build hierarchy tree from parent-child relationships', async () => {
      const purposes: FilePurpose[] = [
        {
          id: 'root-001',
          filePath: 'root.ts',
          purpose: 'Root file',
          theme: 'test',
          children: ['child-001', 'child-002'],
          metadata: {
            createdAt: '2025-08-13T10:00:00.000Z',
            updatedAt: '2025-08-13T10:00:00.000Z'
          },
          status: 'active'
        },
        {
          id: 'child-001',
          filePath: 'child1.ts',
          purpose: 'Child 1',
          theme: 'test',
          parentId: 'root-001',
          children: ['grandchild-001'],
          metadata: {
            createdAt: '2025-08-13T11:00:00.000Z',
            updatedAt: '2025-08-13T11:00:00.000Z'
          },
          status: 'active'
        },
        {
          id: 'child-002',
          filePath: 'child2.ts',
          purpose: 'Child 2',
          theme: 'test',
          parentId: 'root-001',
          metadata: {
            createdAt: '2025-08-13T11:00:00.000Z',
            updatedAt: '2025-08-13T11:00:00.000Z'
          },
          status: 'active'
        },
        {
          id: 'grandchild-001',
          filePath: 'grandchild.ts',
          purpose: 'Grandchild',
          theme: 'test',
          parentId: 'child-001',
          metadata: {
            createdAt: '2025-08-13T12:00:00.000Z',
            updatedAt: '2025-08-13T12:00:00.000Z'
          },
          status: 'active'
        }
      ];

      const storage: any = {};
      purposes.forEach(purpose => {
        if (!storage[purpose.filePath]) {
          storage[purpose.filePath] = [];
        }
        storage[purpose.filePath].push({
          id: purpose.id,
          name: purpose.filePath,
          data: purpose,
          createdAt: purpose.metadata.createdAt,
          updatedAt: purpose.metadata.updatedAt
        });
      });
      mockNameIdWrapper.read.mockResolvedValue(storage);

      const hierarchy = await tracker.getHierarchy();

      expect(hierarchy).toHaveLength(1);
      expect(hierarchy[0].id).toBe('root-001');
      expect(hierarchy[0].children).toHaveLength(2);
      expect(hierarchy[0].children[0].id).toBe('child-001');
      expect(hierarchy[0].children[0].children).toHaveLength(1);
      expect(hierarchy[0].children[0].children[0].id).toBe('grandchild-001');
    });

    it('should get hierarchy from specific root', async () => {
      const purposes: FilePurpose[] = [
        {
          id: 'node-001',
          filePath: 'node1.ts',
          purpose: 'Node 1',
          theme: 'test',
          children: ['node-002'],
          metadata: {
            createdAt: '2025-08-13T10:00:00.000Z',
            updatedAt: '2025-08-13T10:00:00.000Z'
          },
          status: 'active'
        },
        {
          id: 'node-002',
          filePath: 'node2.ts',
          purpose: 'Node 2',
          theme: 'test',
          parentId: 'node-001',
          metadata: {
            createdAt: '2025-08-13T11:00:00.000Z',
            updatedAt: '2025-08-13T11:00:00.000Z'
          },
          status: 'active'
        }
      ];

      const storage: any = {};
      purposes.forEach(purpose => {
        if (!storage[purpose.filePath]) {
          storage[purpose.filePath] = [];
        }
        storage[purpose.filePath].push({
          id: purpose.id,
          name: purpose.filePath,
          data: purpose,
          createdAt: purpose.metadata.createdAt,
          updatedAt: purpose.metadata.updatedAt
        });
      });
      mockNameIdWrapper.read.mockResolvedValue(storage);

      const hierarchy = await tracker.getHierarchy('node-001');

      expect(hierarchy.id).toBe('node-001');
      expect(hierarchy.children).toHaveLength(1);
      expect(hierarchy.children[0].id).toBe('node-002');
    });
  });

  describe('validateAllFiles', () => {
    it('should validate all registered files', async () => {
      const purposes: FilePurpose[] = [
        {
          id: 'file-001',
          filePath: 'existing.ts',
          purpose: 'Existing file',
          theme: 'test',
          metadata: {
            contentHash: 'hash1',
            size: 1000,
            createdAt: '2025-08-13T10:00:00.000Z',
            updatedAt: '2025-08-13T10:00:00.000Z'
          },
          status: 'active'
        },
        {
          id: 'file-002',
          filePath: 'missing.ts',
          purpose: 'Missing file',
          theme: 'test',
          metadata: {
            contentHash: 'hash2',
            size: 2000,
            createdAt: '2025-08-13T11:00:00.000Z',
            updatedAt: '2025-08-13T11:00:00.000Z'
          },
          status: 'active'
        }
      ];

      const storage: any = {};
      purposes.forEach(purpose => {
        if (!storage[purpose.filePath]) {
          storage[purpose.filePath] = [];
        }
        storage[purpose.filePath].push({
          id: purpose.id,
          name: purpose.filePath,
          data: purpose,
          createdAt: purpose.metadata.createdAt,
          updatedAt: purpose.metadata.updatedAt
        });
      });
      mockNameIdWrapper.read.mockResolvedValue(storage);

      // Mock file existence check
      (fs.stat as jest.Mock).mockImplementation((filePath) => {
        if (filePath.includes('existing.ts')) {
          return Promise.resolve({ size: 1000 });
        }
        return Promise.reject(new Error('File not found'));
      });

      // Mock hash calculation
      (createHash as jest.Mock).mockReturnValue({
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue('hash1')
      });

      (fs.readFile as jest.Mock).mockResolvedValue(Buffer.from('content'));

      const results = await tracker.validateAllFiles();

      expect(results.size).toBe(2);
      
      const existingValidation = results.get('existing.ts');
      expect(existingValidation?.valid).toBe(true);
      
      const missingValidation = results.get('missing.ts');
      expect(missingValidation?.valid).toBe(false);
      expect(missingValidation?.errors).toContain('File no longer exists: missing.ts');
    });
  });
});