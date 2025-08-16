import { PermissionManager } from '../../children/src/infrastructure/permission-manager';
import { fs } from '../../../../themes/infra_external-log-lib/dist';

jest.mock('fs');

describe('PermissionManager', () => {
  let permissionManager: PermissionManager;
  const mockFs = fs as jest.Mocked<typeof fs>;
  const testAuditFile = '/test/audit.log';

  beforeEach(() => {
    permissionManager = new PermissionManager(testAuditFile);
    jest.clearAllMocks();
    
    mockFs.appendFileSync.mockImplementation(() => {});
    mockFs.writeFileSync.mockImplementation(() => {});
    mockFs.readFileSync.mockReturnValue('');
  });

  describe('checkPermission', () => {
    it('should allow action when user has exact permission', () => {
      const result = permissionManager.checkPermission(
        'user123',
        'file:read',
        ['file:read', 'file:write']
      );
      
      expect(result).toBe(true);
    });

    it('should allow action with wildcard permission', () => {
      const result = permissionManager.checkPermission(
        'admin',
        'file:delete',
        ['file:*', 'user:read']
      );
      
      expect(result).toBe(true);
    });

    it('should allow action with admin wildcard', () => {
      const result = permissionManager.checkPermission(
        'superadmin',
        'system:shutdown',
        ['admin:*']
      );
      
      expect(result).toBe(true);
    });

    it('should deny action without permission', () => {
      const result = permissionManager.checkPermission(
        'user123',
        'admin:delete',
        ['user:read', 'user:write']
      );
      
      expect(result).toBe(false);
    });

    it('should audit permission checks', () => {
      permissionManager.checkPermission(
        'user123',
        'file:read',
        ['file:read']
      );
      
      expect(mockFs.appendFileSync).toHaveBeenCalledWith(
        testAuditFile,
        expect.stringContaining('PERMISSION_CHECK')
      );
    });

    it('should handle empty permissions array', () => {
      const result = permissionManager.checkPermission(
        'user123',
        'any:action',
        []
      );
      
      expect(result).toBe(false);
    });
  });

  describe('addRule', () => {
    it('should add permission rule', () => {
      const rule = jest.fn().mockReturnValue(true);
      
      permissionManager.addRule('custom:action', rule);
      
      const result = permissionManager.checkPermission(
        'user123',
        'custom:action',
        []
      );
      
      expect(rule).toHaveBeenCalledWith('user123', {});
      expect(result).toBe(true);
    });

    it('should pass context to rule', () => {
      const rule = jest.fn().mockReturnValue(false);
      const context = { resource: 'file.txt' };
      
      permissionManager.addRule('file:read', rule);
      
      permissionManager.checkPermission(
        'user123',
        'file:read',
        [],
        context
      );
      
      expect(rule).toHaveBeenCalledWith('user123', context);
    });

    it('should override with new rule', () => {
      const rule1 = jest.fn().mockReturnValue(true);
      const rule2 = jest.fn().mockReturnValue(false);
      
      permissionManager.addRule('test:action', rule1);
      permissionManager.addRule('test:action', rule2);
      
      const result = permissionManager.checkPermission(
        'user123',
        'test:action',
        []
      );
      
      expect(rule1).not.toHaveBeenCalled();
      expect(rule2).toHaveBeenCalled();
      expect(result).toBe(false);
    });
  });

  describe('enableDangerousMode', () => {
    it('should enable dangerous mode', () => {
      permissionManager.enableDangerousMode('admin123', 'System maintenance');
      
      expect(mockFs.appendFileSync).toHaveBeenCalledWith(
        testAuditFile,
        expect.stringContaining('DANGEROUS_MODE_ENABLED')
      );
    });

    it('should allow any action in dangerous mode', () => {
      permissionManager.enableDangerousMode('admin123', 'Emergency');
      
      const result = permissionManager.checkPermission(
        'admin123',
        'system:destroy-everything',
        []
      );
      
      expect(result).toBe(true);
    });

    it('should not affect other users', () => {
      permissionManager.enableDangerousMode('admin123', 'Maintenance');
      
      const result = permissionManager.checkPermission(
        'user456',
        'admin:action',
        []
      );
      
      expect(result).toBe(false);
    });
  });

  describe('disableDangerousMode', () => {
    it('should disable dangerous mode', () => {
      permissionManager.enableDangerousMode('admin123', 'Test');
      permissionManager.disableDangerousMode('admin123');
      
      const result = permissionManager.checkPermission(
        'admin123',
        'restricted:action',
        []
      );
      
      expect(result).toBe(false);
      expect(mockFs.appendFileSync).toHaveBeenCalledWith(
        testAuditFile,
        expect.stringContaining('DANGEROUS_MODE_DISABLED')
      );
    });
  });

  describe('isDangerousModeEnabled', () => {
    it('should return true when enabled', () => {
      permissionManager.enableDangerousMode('admin123', 'Test');
      
      const result = permissionManager.isDangerousModeEnabled('admin123');
      
      expect(result).toBe(true);
    });

    it('should return false when not enabled', () => {
      const result = permissionManager.isDangerousModeEnabled('user123');
      
      expect(result).toBe(false);
    });

    it('should return false after disabling', () => {
      permissionManager.enableDangerousMode('admin123', 'Test');
      permissionManager.disableDangerousMode('admin123');
      
      const result = permissionManager.isDangerousModeEnabled('admin123');
      
      expect(result).toBe(false);
    });
  });

  describe('audit', () => {
    it('should write audit entry with all fields', () => {
      const entry = {
        userId: 'user123',
        action: 'file:delete',
        resource: '/important/file.txt',
        result: 'denied' as const,
        reason: 'Insufficient permissions'
      };
      
      permissionManager.audit(entry);
      
      expect(mockFs.appendFileSync).toHaveBeenCalledWith(
        testAuditFile,
        expect.stringContaining('user123')
      );
      expect(mockFs.appendFileSync).toHaveBeenCalledWith(
        testAuditFile,
        expect.stringContaining('file:delete')
      );
      expect(mockFs.appendFileSync).toHaveBeenCalledWith(
        testAuditFile,
        expect.stringContaining('denied')
      );
    });

    it('should include timestamp in audit entry', () => {
      permissionManager.audit({
        userId: 'user123',
        action: 'test',
        result: 'allowed'
      });
      
      const auditCall = mockFs.appendFileSync.mock.calls[0];
      const auditEntry = JSON.parse(auditCall[1] as string);
      
      expect(auditEntry).toHaveProperty('timestamp');
      expect(new Date(auditEntry.timestamp)).toBeInstanceOf(Date);
    });
  });

  describe('getAuditLog', () => {
    it('should return parsed audit entries', () => {
      const auditData = [
        { timestamp: new Date().toISOString(), userId: 'user1', action: 'read', result: 'allowed' },
        { timestamp: new Date().toISOString(), userId: 'user2', action: 'write', result: 'denied' }
      ].map(e => JSON.stringify(e)).join('\n');
      
      mockFs.readFileSync.mockReturnValue(auditData);
      
      const log = permissionManager.getAuditLog();
      
      expect(log).toHaveLength(2);
      expect(log[0].userId).toBe('user1');
      expect(log[1].userId).toBe('user2');
    });

    it('should filter by userId', () => {
      const auditData = [
        { timestamp: new Date().toISOString(), userId: 'user1', action: 'read' },
        { timestamp: new Date().toISOString(), userId: 'user2', action: 'write' },
        { timestamp: new Date().toISOString(), userId: 'user1', action: 'delete' }
      ].map(e => JSON.stringify(e)).join('\n');
      
      mockFs.readFileSync.mockReturnValue(auditData);
      
      const log = permissionManager.getAuditLog({ userId: 'user1' });
      
      expect(log).toHaveLength(2);
      expect(log.every(e => e.userId === 'user1')).toBe(true);
    });

    it('should filter by action', () => {
      const auditData = [
        { timestamp: new Date().toISOString(), action: 'file:read' },
        { timestamp: new Date().toISOString(), action: 'file:write' },
        { timestamp: new Date().toISOString(), action: 'user:delete' }
      ].map(e => JSON.stringify(e)).join('\n');
      
      mockFs.readFileSync.mockReturnValue(auditData);
      
      const log = permissionManager.getAuditLog({ action: 'file:*' });
      
      expect(log).toHaveLength(2);
      expect(log.every(e => e.action?.startsWith('file:'))).toBe(true);
    });

    it('should filter by date range', () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      
      const auditData = [
        { timestamp: yesterday.toISOString(), action: 'old' },
        { timestamp: now.toISOString(), action: 'current' },
        { timestamp: tomorrow.toISOString(), action: 'future' }
      ].map(e => JSON.stringify(e)).join('\n');
      
      mockFs.readFileSync.mockReturnValue(auditData);
      
      const log = permissionManager.getAuditLog({
        startDate: new Date(now.getTime() - 60000),
        endDate: new Date(now.getTime() + 60000)
      });
      
      expect(log).toHaveLength(1);
      expect(log[0].action).toBe('current');
    });

    it('should handle empty audit log', () => {
      mockFs.readFileSync.mockReturnValue('');
      
      const log = permissionManager.getAuditLog();
      
      expect(log).toEqual([]);
    });

    it('should skip malformed entries', () => {
      const auditData = [
        JSON.stringify({ timestamp: new Date().toISOString(), userId: 'user1' }),
        'malformed entry',
        JSON.stringify({ timestamp: new Date().toISOString(), userId: 'user2' })
      ].join('\n');
      
      mockFs.readFileSync.mockReturnValue(auditData);
      
      const log = permissionManager.getAuditLog();
      
      expect(log).toHaveLength(2);
    });
  });

  describe('getStatistics', () => {
    it('should calculate statistics from audit log', () => {
      const auditData = [
        { timestamp: new Date().toISOString(), userId: 'user1', action: 'read', result: 'allowed' },
        { timestamp: new Date().toISOString(), userId: 'user1', action: 'write', result: 'denied' },
        { timestamp: new Date().toISOString(), userId: 'user2', action: 'read', result: 'allowed' },
        { timestamp: new Date().toISOString(), userId: 'user1', action: 'delete', result: 'denied' }
      ].map(e => JSON.stringify(e)).join('\n');
      
      mockFs.readFileSync.mockReturnValue(auditData);
      
      const stats = permissionManager.getStatistics();
      
      expect(stats.totalChecks).toBe(4);
      expect(stats.allowed).toBe(2);
      expect(stats.denied).toBe(2);
      expect(stats.byUser['user1']).toBe(3);
      expect(stats.byUser['user2']).toBe(1);
      expect(stats.byAction['read']).toBe(2);
      expect(stats.byAction['write']).toBe(1);
      expect(stats.byAction['delete']).toBe(1);
    });

    it('should handle empty statistics', () => {
      mockFs.readFileSync.mockReturnValue('');
      
      const stats = permissionManager.getStatistics();
      
      expect(stats.totalChecks).toBe(0);
      expect(stats.allowed).toBe(0);
      expect(stats.denied).toBe(0);
      expect(stats.byUser).toEqual({});
      expect(stats.byAction).toEqual({});
    });
  });

  describe('exportAuditLog', () => {
    it('should export audit log to file', () => {
      const auditData = [
        { timestamp: new Date().toISOString(), userId: 'user1', action: 'read' }
      ].map(e => JSON.stringify(e)).join('\n');
      
      mockFs.readFileSync.mockReturnValue(auditData);
      
      permissionManager.exportAuditLog('/export/audit.json');
      
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        '/export/audit.json',
        expect.any(String)
      );
      
      const exportedData = JSON.parse(mockFs.writeFileSync.mock.calls[0][1] as string);
      expect(exportedData).toHaveLength(1);
      expect(exportedData[0].userId).toBe('user1');
    });

    it('should export with filters', () => {
      const auditData = [
        { timestamp: new Date().toISOString(), userId: 'user1', action: 'read' },
        { timestamp: new Date().toISOString(), userId: 'user2', action: 'write' }
      ].map(e => JSON.stringify(e)).join('\n');
      
      mockFs.readFileSync.mockReturnValue(auditData);
      
      permissionManager.exportAuditLog('/export/filtered.json', { userId: 'user1' });
      
      const exportedData = JSON.parse(mockFs.writeFileSync.mock.calls[0][1] as string);
      expect(exportedData).toHaveLength(1);
      expect(exportedData[0].userId).toBe('user1');
    });
  });
});