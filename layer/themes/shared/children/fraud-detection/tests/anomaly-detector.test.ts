/**
 * Anomaly Detector Tests
 */

import { AnomalyDetector } from '../detectors/anomaly-detector';
import { ViolationType, FraudContext } from '../types';

describe("AnomalyDetector", () => {
  let detector: AnomalyDetector;

  beforeEach(() => {
    detector = new AnomalyDetector();
  });

  describe('Structural Anomalies', () => {
    it('should detect deep object nesting', async () => {
      // Create deeply nested object
      let obj: any = {};
      let current = obj;
      for (let i = 0; i < 15; i++) {
        current.next = {};
        current = current.next;
      }

      const result = await detector.detect(obj);

      expect(result.passed).toBe(false);
      expect(result.violations.some(v => 
        v.type === ViolationType.UNUSUAL_BEHAVIOR && 
        v.message.includes('deep object nesting')
      )).toBe(true);
    });

    it('should detect unusually large objects', async () => {
      const largeObj: any = {};
      for (let i = 0; i < 1500; i++) {
        largeObj[`prop${i}`] = i;
      }

      const result = await detector.detect(largeObj);

      expect(result.passed).toBe(false);
      expect(result.violations.some(v => 
        v.type === ViolationType.UNUSUAL_BEHAVIOR && 
        v.message.includes('large object')
      )).toBe(true);
    });

    it('should detect circular references', async () => {
      const obj: any = { a: 1 };
      obj.self = obj;

      const result = await detector.detect(obj);

      expect(result.passed).toBe(false);
      expect(result.violations.some(v => 
        v.type === ViolationType.PATTERN_DEVIATION && 
        v.message.includes('Circular reference')
      )).toBe(true);
    });
  });

  describe('Value Anomalies', () => {
    it('should detect statistical outliers', async () => {
      const data = {
        values: [10, 12, 11, 10, 11, 12, 11, 10, 11, 1000] // 1000 is an outlier
      };

      const result = await detector.detect(data);

      expect(result.passed).toBe(false);
      expect(result.violations.some(v => 
        v.type === ViolationType.STATISTICAL_ANOMALY && 
        v.message.includes('outlier')
      )).toBe(true);
    });

    it('should detect repeating patterns in numeric values', async () => {
      const data = {
        sequence: [1, 2, 3, 1, 2, 3, 1, 2, 3, 1, 2, 3]
      };

      const result = await detector.detect(data);

      expect(result.passed).toBe(false);
      expect(result.violations.some(v => 
        v.type === ViolationType.PATTERN_DEVIATION && 
        v.message.includes('Repeating pattern')
      )).toBe(true);
    });
  });

  describe('Pattern Anomalies', () => {
    it('should detect repeated characters', async () => {
      const input = {
        data: "normaltext" + 'a'.repeat(15) + "moretext"
      };

      const result = await detector.detect(input);

      expect(result.passed).toBe(false);
      expect(result.violations.some(v => 
        v.type === ViolationType.SUSPICIOUS_PATTERN && 
        v.message.includes('Repeated characters')
      )).toBe(true);
    });

    it('should detect long hex strings', async () => {
      const input = {
        hash: "0123456789abcdef0123456789abcdef0123456789abcdef"
      };

      const result = await detector.detect(input);

      expect(result.passed).toBe(false);
      expect(result.violations.some(v => 
        v.type === ViolationType.SUSPICIOUS_PATTERN && 
        v.message.includes('Long hex strings')
      )).toBe(true);
    });

    it('should detect embedded base64 data', async () => {
      const input = {
        image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
      };

      const result = await detector.detect(input);

      expect(result.passed).toBe(false);
      expect(result.violations.some(v => 
        v.type === ViolationType.SUSPICIOUS_PATTERN && 
        v.message.includes('Embedded base64 data')
      )).toBe(true);
    });
  });

  describe('Behavioral Anomalies', () => {
    it('should detect unusual request sizes for a user', async () => {
      const context: FraudContext = {
        userId: 'test-user-123'
      };

      // Establish baseline with normal requests
      for (let i = 0; i < 15; i++) {
        await detector.detect({ data: 'x'.repeat(100) }, context);
      }

      // Send anomalous request
      const anomalousInput = { data: 'x'.repeat(10000) };
      const result = await detector.detect(anomalousInput, context);

      expect(result.passed).toBe(false);
      expect(result.violations.some(v => 
        v.type === ViolationType.UNUSUAL_BEHAVIOR && 
        v.message.includes('Unusual request size')
      )).toBe(true);
    });
  });

  describe('Normal Input', () => {
    it('should pass normal objects', async () => {
      const normalObj = {
        name: 'John Doe',
        age: 30,
        email: 'john@example.com',
        address: {
          street: '123 Main St',
          city: 'Anytown',
          zip: '12345'
        }
      };

      const result = await detector.detect(normalObj);

      expect(result.passed).toBe(true);
      expect(result.violations.length).toBe(0);
    });

    it('should pass normal arrays', async () => {
      const normalArray = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const result = await detector.detect({ values: normalArray });

      expect(result.passed).toBe(true);
      expect(result.violations.length).toBe(0);
    });
  });

  describe('Scoring', () => {
    it('should calculate appropriate scores', async () => {
      const anomalousObj: any = {
        a: 'x'.repeat(15), // Repeated characters
        b: [1000, 1, 2, 3, 1, 2, 3], // Outlier + pattern
      };
      anomalousObj.circular = anomalousObj; // Circular reference

      const result = await detector.detect(anomalousObj);

      expect(result.score).toBeGreaterThan(30);
      expect(result.score).toBeLessThanOrEqual(100);
    });
  });

  describe('Edge Cases', () => {
    it('should handle null and undefined', async () => {
      const resultNull = await detector.detect(null);
      const resultUndefined = await detector.detect(undefined);

      expect(resultNull.passed).toBe(true);
      expect(resultUndefined.passed).toBe(true);
    });

    it('should handle empty objects and arrays', async () => {
      const resultEmptyObj = await detector.detect({});
      const resultEmptyArr = await detector.detect([]);

      expect(resultEmptyObj.passed).toBe(true);
      expect(resultEmptyArr.passed).toBe(true);
    });
  });
});