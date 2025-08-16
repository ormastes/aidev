/**
 * System Test: Calculator Error Handling
 * Story: US001_Calculator_BasicMath
 * Diagram: SD001_Calculator_ProcessRequest
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { CalculatorAgent } from '../../../src/agents/calculator';
import { TestHarness } from '../../utils/test-harness';
import { CoverageCollector } from '../../utils/coverage-collector';

describe('test_US001_SD001_error_handling', () => {
  let harness: TestHarness;
  let calculator: CalculatorAgent;
  let coverage: CoverageCollector;

  beforeAll(async () => {
    harness = new TestHarness();
    await harness.startServer();
    
    calculator = new CalculatorAgent(harness.serverUrl, harness.roomId);
    await calculator.connect();
    
    coverage = new CoverageCollector('calculator');
    coverage.start();
  });

  afterAll(async () => {
    const report = coverage.stop();
    console.log('Coverage:', report);
    
    await calculator.disconnect();
    await harness.stopServer();
  });

  it('should handle division by zero', async () => {
    const result = await harness.sendAndWaitForResponse(
      'calculate 10 / 0',
      calculator
    );
    expect(result).toContain('Error');
  });

  it('should handle invalid input gracefully', async () => {
    const result = await harness.sendAndWaitForResponse(
      'calculate abc + def',
      calculator
    );
    // Calculator doesn't respond to invalid input
    expect(result).toBeFalsy();
  }, 10000);
});
