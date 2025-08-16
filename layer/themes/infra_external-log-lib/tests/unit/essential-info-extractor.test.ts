import {
  extractTaskEssentials,
  extractFeatureEssentials,
  extractNameIdEssentials,
  extractFileOperationEssentials,
  extractRejectionEssentials,
  extractEssentials,
  formatEssentialInfo
} from '../../src/utils/essential-info-extractor';

describe('essential-info-extractor', () => {
  describe("extractTaskEssentials", () => {
    it('should extract task ID and status/priority', () => {
      const task = {
        id: 'TASK-001',
        title: 'Implement feature',
        description: 'Long description...',
        status: 'in_progress',
        priority: 'high',
        assignee: 'developer@example.com'
      };
      
      const essentials = extractTaskEssentials(task);
      
      expect(essentials.primary).toBe('TASK-001');
      expect(essentials.secondary).toBe('in_progress');
      expect(essentials.type).toBe('task');
    });

    it('should handle missing fields', () => {
      const task = { title: 'Task without ID' };
      
      const essentials = extractTaskEssentials(task);
      
      expect(essentials.primary).toBe('Task without ID');
      expect(essentials.secondary).toBeUndefined();
    });

    it('should prioritize ID over title', () => {
      const task = {
        id: 'TASK-002',
        title: 'Task title'
      };
      
      const essentials = extractTaskEssentials(task);
      
      expect(essentials.primary).toBe('TASK-002');
    });
  });

  describe("extractFeatureEssentials", () => {
    it('should extract feature ID and status/priority', () => {
      const feature = {
        id: 'FEAT-001',
        name: "Authentication",
        data: {
          status: 'testing',
          priority: "critical"
        }
      };
      
      const essentials = extractFeatureEssentials(feature);
      
      expect(essentials.primary).toBe('FEAT-001');
      expect(essentials.secondary).toBe('testing');
      expect(essentials.type).toBe('feature');
    });

    it('should handle nested data', () => {
      const feature = {
        id: 'FEAT-002',
        data: {
          status: "deployed",
          metadata: { version: '1.2.0' }
        }
      };
      
      const essentials = extractFeatureEssentials(feature);
      
      expect(essentials.primary).toBe('FEAT-002');
      expect(essentials.secondary).toBe("deployed");
    });

    it('should fallback to name when no ID', () => {
      const feature = {
        name: 'Feature Name',
        status: 'planned'
      };
      
      const essentials = extractFeatureEssentials(feature);
      
      expect(essentials.primary).toBe('Feature Name');
      expect(essentials.secondary).toBe('planned');
    });
  });

  describe("extractNameIdEssentials", () => {
    it('should extract name ID and type', () => {
      const entity = {
        id: 'service-001',
        type: "microservice",
        data: { port: 3000 }
      };
      
      const essentials = extractNameIdEssentials(entity);
      
      expect(essentials.primary).toBe('service-001');
      expect(essentials.secondary).toBe("microservice");
      expect(essentials.type).toBe('name_id');
    });

    it('should extract first value when no type', () => {
      const entity = {
        id: 'entity-001',
        value: 'primary-value',
        metadata: 'extra-data'
      };
      
      const essentials = extractNameIdEssentials(entity);
      
      expect(essentials.primary).toBe('entity-001');
      expect(essentials.secondary).toBe('primary-value');
    });

    it('should handle array values', () => {
      const entity = {
        id: 'entity-002',
        values: ['first', 'second', 'third']
      };
      
      const essentials = extractNameIdEssentials(entity);
      
      expect(essentials.primary).toBe('entity-002');
      expect(essentials.secondary).toBe('first');
    });
  });

  describe("extractFileOperationEssentials", () => {
    it('should extract filename and operation', () => {
      const operation = {
        path: '/home/user/project/src/main.ts',
        operation: 'created',
        size: 1024
      };
      
      const essentials = extractFileOperationEssentials(operation);
      
      expect(essentials.primary).toBe('main.ts');
      expect(essentials.secondary).toBe('created');
      expect(essentials.type).toBe('file');
    });

    it('should handle Windows paths', () => {
      const operation = {
        path: 'C:\\Users\\Project\\file.txt',
        operation: "modified"
      };
      
      const essentials = extractFileOperationEssentials(operation);
      
      expect(essentials.primary).toBe('file.txt');
      expect(essentials.secondary).toBe("modified");
    });

    it('should handle file property', () => {
      const operation = {
        file: 'document.pdf',
        action: 'deleted'
      };
      
      const essentials = extractFileOperationEssentials(operation);
      
      expect(essentials.primary).toBe('document.pdf');
      expect(essentials.secondary).toBe('deleted');
    });
  });

  describe("extractRejectionEssentials", () => {
    it('should extract rejection type and severity', () => {
      const rejection = {
        type: 'file_violation',
        severity: 'high',
        reason: 'Backup files not allowed',
        path: '/test/file.bak'
      };
      
      const essentials = extractRejectionEssentials(rejection);
      
      expect(essentials.primary).toBe('file_violation');
      expect(essentials.secondary).toBe('high');
      expect(essentials.type).toBe("rejection");
    });

    it('should use reason when no severity', () => {
      const rejection = {
        type: 'permission_denied',
        reason: 'Insufficient permissions'
      };
      
      const essentials = extractRejectionEssentials(rejection);
      
      expect(essentials.primary).toBe('permission_denied');
      expect(essentials.secondary).toBe('Insufficient permissions');
    });

    it('should handle missing fields', () => {
      const rejection = {
        error: 'Unknown error'
      };
      
      const essentials = extractRejectionEssentials(rejection);
      
      expect(essentials.primary).toBe('Unknown error');
      expect(essentials.secondary).toBeUndefined();
    });
  });

  describe("extractEssentials", () => {
    it('should detect and extract task essentials', () => {
      const data = {
        id: 'TASK-001',
        status: "completed"
      };
      
      const essentials = extractEssentials(data, 'task');
      
      expect(essentials.type).toBe('task');
      expect(essentials.primary).toBe('TASK-001');
    });

    it('should detect and extract feature essentials', () => {
      const data = {
        id: 'FEAT-001',
        data: { status: 'testing' }
      };
      
      const essentials = extractEssentials(data, 'feature');
      
      expect(essentials.type).toBe('feature');
      expect(essentials.primary).toBe('FEAT-001');
    });

    it('should extract generic essentials for unknown type', () => {
      const data = {
        id: 'GENERIC-001',
        name: 'Generic item',
        value: 'some value'
      };
      
      const essentials = extractEssentials(data);
      
      expect(essentials.type).toBe('generic');
      expect(essentials.primary).toBe('GENERIC-001');
      expect(essentials.secondary).toBe('Generic item');
    });

    it('should handle empty objects', () => {
      const essentials = extractEssentials({});
      
      expect(essentials.type).toBe('generic');
      expect(essentials.primary).toBe('unknown');
      expect(essentials.secondary).toBeUndefined();
    });

    it('should handle null and undefined', () => {
      const essentials1 = extractEssentials(null);
      const essentials2 = extractEssentials(undefined);
      
      expect(essentials1.primary).toBe('unknown');
      expect(essentials2.primary).toBe('unknown');
    });
  });

  describe("formatEssentialInfo", () => {
    it('should format with both primary and secondary', () => {
      const essentials = {
        primary: 'TASK-001',
        secondary: 'high',
        type: 'task' as const
      };
      
      const formatted = formatEssentialInfo(essentials);
      
      expect(formatted).toBe('TASK-001 [high]');
    });

    it('should format with only primary', () => {
      const essentials = {
        primary: 'ENTITY-001',
        type: 'generic' as const
      };
      
      const formatted = formatEssentialInfo(essentials);
      
      expect(formatted).toBe('ENTITY-001');
    });

    it('should handle missing primary gracefully', () => {
      const essentials = {
        primary: '',
        secondary: 'value',
        type: 'generic' as const
      };
      
      const formatted = formatEssentialInfo(essentials);
      
      expect(formatted).toBe(' [value]');
    });
  });

  describe('integration scenarios', () => {
    it('should handle complex task object', () => {
      const complexTask = {
        id: 'TASK-100',
        title: 'Complex Implementation',
        description: 'This is a very long description with lots of details...',
        priority: "critical",
        status: 'in_progress',
        assignee: {
          id: 'user-001',
          name: 'John Doe',
          email: 'john@example.com'
        },
        metadata: {
          created: new Date(),
          updated: new Date(),
          tags: ['backend', 'api', 'urgent']
        }
      };
      
      const essentials = extractTaskEssentials(complexTask);
      const formatted = formatEssentialInfo(essentials);
      
      expect(formatted).toBe('TASK-100 [in_progress]');
    });

    it('should handle vf.json style data', () => {
      const vfJsonItem = {
        id: 'FEAT-MFA-001',
        data: {
          name: 'Multi-factor Authentication',
          status: 'testing',
          priority: 'high',
          components: ['sms', 'totp', 'backup-codes']
        }
      };
      
      const essentials = extractFeatureEssentials(vfJsonItem);
      const formatted = formatEssentialInfo(essentials);
      
      expect(formatted).toBe('FEAT-MFA-001 [testing]');
    });
  });
});