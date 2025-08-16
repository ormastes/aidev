/**
 * Mock Detector Tests
 */

import { MockDetector } from '../detectors/mock-detector';
import { ViolationType } from '../types';

describe("MockDetector", () => {
  let detector: MockDetector;

  beforeEach(() => {
    detector = new MockDetector();
  });

  describe('detect', () => {
    it('should detect Jest mock usage', async () => {
      const code = `
        jest.mock('../module');
        const mockFn = jest.fn();
        mockFn.mockReturnValue(42);
      `;

      const result = await detector.detect(code);

      expect(result.passed).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.violations.some(v => v.type === ViolationType.MOCK_USAGE)).toBe(true);
      expect(result.violations.some(v => v.message.includes('jest.mock'))).toBe(true);
    });

    it('should detect Sinon stub usage', async () => {
      const code = `
        const stub = sinon.stub(obj, 'method');
        const spy = sinon.spy();
      `;

      const result = await detector.detect(code);

      expect(result.passed).toBe(false);
      expect(result.violations.some(v => v.type === ViolationType.MOCK_USAGE)).toBe(true);
      expect(result.violations.some(v => v.message.includes('sinon.stub'))).toBe(true);
    });

    it('should detect stub patterns in variable names', async () => {
      const code = `
        const userStub = { name: 'test' };
        const StubService = class {};
        const stubbedResponse = {};
      `;

      const result = await detector.detect(code);

      expect(result.passed).toBe(false);
      expect(result.violations.some(v => v.type === ViolationType.STUB_USAGE)).toBe(true);
    });

    it('should detect spy patterns', async () => {
      const code = `
        const spyFunction = () => {};
        const ResponseSpy = {};
        const spiedMethod = null;
      `;

      const result = await detector.detect(code);

      expect(result.passed).toBe(false);
      expect(result.violations.some(v => v.type === ViolationType.SPY_USAGE)).toBe(true);
    });

    it('should detect fake and dummy patterns', async () => {
      const code = `
        const fakeUser = { id: 1 };
        const DummyService = class {};
        const FakeRepository = {};
      `;

      const result = await detector.detect(code);

      expect(result.passed).toBe(false);
      expect(result.violations.some(v => v.type === ViolationType.FAKE_USAGE)).toBe(true);
    });

    it('should pass when no mocks are detected', async () => {
      const code = `
        const user = { name: 'John' };
        const service = new UserService();
        const result = service.getUser();
      `;

      const result = await detector.detect(code);

      expect(result.passed).toBe(true);
      expect(result.violations.length).toBe(0);
      expect(result.score).toBe(0);
    });

    it('should handle object input with code property', async () => {
      const input = {
        code: 'jest.mock("./module");'
      };

      const result = await detector.detect(input);

      expect(result.passed).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
    });

    it('should calculate appropriate scores', async () => {
      const highSeverityCode = `
        jest.mock('../critical');
        jest.fn();
        mockImplementation();
      `;

      const result = await detector.detect(highSeverityCode);

      expect(result.score).toBeGreaterThan(50);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('should include line numbers in violations', async () => {
      const code = `line1
jest.mock('../module');
line3
const spy = sinon.spy();`;

      const result = await detector.detect(code);

      const jestViolation = result.violations.find(v => v.evidence === 'jest.mock');
      const sinonViolation = result.violations.find(v => v.evidence === 'sinon.spy');

      expect(jestViolation?.location).toBe('line 2');
      expect(sinonViolation?.location).toBe('line 4');
    });
  });
});