/**
 * Security Detector Tests
 */

import { SecurityDetector } from '../detectors/security-detector';
import { FraudSeverity, ViolationType } from '../types';

describe("SecurityDetector", () => {
  let detector: SecurityDetector;

  beforeEach(() => {
    detector = new SecurityDetector();
  });

  describe('SQL Injection Detection', () => {
    it('should detect basic SQL injection attempts', async () => {
      const input = "' OR '1'='1";
      const result = await detector.detect(input);

      expect(result.passed).toBe(false);
      expect(result.violations.some(v => v.type === ViolationType.SQL_INJECTION)).toBe(true);
      expect(result.violations.some(v => v.severity === FraudSeverity.CRITICAL)).toBe(true);
    });

    it('should detect SQL keywords in suspicious contexts', async () => {
      const input = "name'; DROP TABLE users; --";
      const result = await detector.detect(input);

      expect(result.passed).toBe(false);
      expect(result.violations.some(v => v.type === ViolationType.SQL_INJECTION)).toBe(true);
    });

    it('should detect UNION SELECT attacks', async () => {
      const input = "1 UNION SELECT username, password FROM users";
      const result = await detector.detect(input);

      expect(result.passed).toBe(false);
      expect(result.violations.some(v => v.type === ViolationType.SQL_INJECTION)).toBe(true);
    });
  });

  describe('XSS Detection', () => {
    it('should detect script tags', async () => {
      const input = '<script>alert("XSS")</script>';
      const result = await detector.detect(input);

      expect(result.passed).toBe(false);
      expect(result.violations.some(v => v.type === ViolationType.XSS_ATTEMPT)).toBe(true);
      expect(result.violations.some(v => v.severity === FraudSeverity.HIGH)).toBe(true);
    });

    it('should detect javascript: protocol', async () => {
      const input = '<a href="javascript:void(0)">Click</a>';
      const result = await detector.detect(input);

      expect(result.passed).toBe(false);
      expect(result.violations.some(v => v.type === ViolationType.XSS_ATTEMPT)).toBe(true);
    });

    it('should detect event handlers', async () => {
      const input = '<img src=x onerror="alert(1)">';
      const result = await detector.detect(input);

      expect(result.passed).toBe(false);
      expect(result.violations.some(v => v.type === ViolationType.XSS_ATTEMPT)).toBe(true);
    });
  });

  describe('Path Traversal Detection', () => {
    it('should detect directory traversal attempts', async () => {
      const input = '../../etc/passwd';
      const result = await detector.detect(input);

      expect(result.passed).toBe(false);
      expect(result.violations.some(v => v.type === ViolationType.PATH_TRAVERSAL)).toBe(true);
    });

    it('should detect URL-encoded traversal', async () => {
      const input = '..%2F..%2Fetc%2Fpasswd';
      const result = await detector.detect(input);

      expect(result.passed).toBe(false);
      expect(result.violations.some(v => v.type === ViolationType.PATH_TRAVERSAL)).toBe(true);
    });

    it('should detect Windows path traversal', async () => {
      const input = 'C:\\Windows\\System32\\config\\sam';
      const result = await detector.detect(input);

      expect(result.passed).toBe(false);
      expect(result.violations.some(v => v.type === ViolationType.PATH_TRAVERSAL)).toBe(true);
    });
  });

  describe('Command Injection Detection', () => {
    it('should detect shell command characters', async () => {
      const input = 'file.txt; rm -rf /';
      const result = await detector.detect(input);

      expect(result.passed).toBe(false);
      expect(result.violations.some(v => v.type === ViolationType.COMMAND_INJECTION)).toBe(true);
      expect(result.violations.some(v => v.severity === FraudSeverity.CRITICAL)).toBe(true);
    });

    it('should detect command substitution', async () => {
      const input = '$(whoami)';
      const result = await detector.detect(input);

      expect(result.passed).toBe(false);
      expect(result.violations.some(v => v.type === ViolationType.COMMAND_INJECTION)).toBe(true);
    });

    it('should detect common shell commands', async () => {
      const input = 'test && cat /etc/passwd';
      const result = await detector.detect(input);

      expect(result.passed).toBe(false);
      expect(result.violations.some(v => v.type === ViolationType.COMMAND_INJECTION)).toBe(true);
    });
  });

  describe('Sensitive Data Detection', () => {
    it('should detect credit card numbers', async () => {
      const input = 'Card: 4111111111111111';
      const result = await detector.detect(input);

      expect(result.passed).toBe(false);
      expect(result.violations.some(v => v.type === ViolationType.UNAUTHORIZED_ACCESS)).toBe(true);
    });

    it('should detect exposed passwords', async () => {
      const input = 'password: supersecret123';
      const result = await detector.detect(input);

      expect(result.passed).toBe(false);
      expect(result.violations.some(v => v.type === ViolationType.UNAUTHORIZED_ACCESS)).toBe(true);
    });

    it('should detect private keys', async () => {
      const input = '-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEA...';
      const result = await detector.detect(input);

      expect(result.passed).toBe(false);
      expect(result.violations.some(v => v.type === ViolationType.UNAUTHORIZED_ACCESS)).toBe(true);
    });

    it('should filter false positive emails', async () => {
      const input = 'test@example.com admin@test.com';
      const result = await detector.detect(input);

      expect(result.passed).toBe(true);
      expect(result.violations.length).toBe(0);
    });
  });

  describe('Object Input Handling', () => {
    it('should handle object input', async () => {
      const input = {
        query: "SELECT * FROM users WHERE id = '1' OR '1'='1'",
        data: '<script>alert(1)</script>'
      };

      const result = await detector.detect(input);

      expect(result.passed).toBe(false);
      expect(result.violations.some(v => v.type === ViolationType.SQL_INJECTION)).toBe(true);
      expect(result.violations.some(v => v.type === ViolationType.XSS_ATTEMPT)).toBe(true);
    });
  });

  describe('Safe Input', () => {
    it('should pass safe input', async () => {
      const input = 'This is a normal text without any malicious content';
      const result = await detector.detect(input);

      expect(result.passed).toBe(true);
      expect(result.violations.length).toBe(0);
      expect(result.score).toBe(0);
    });
  });

  describe('Scoring', () => {
    it('should calculate appropriate scores based on severity', async () => {
      const criticalInput = "'; DROP TABLE users; --";
      const result = await detector.detect(criticalInput);

      expect(result.score).toBeGreaterThan(70);
      expect(result.metadata?.checksPerformed).toContain('sql_injection');
    });
  });
});