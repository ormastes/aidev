/**
 * System Test: Calculator Basic Operations
 * Story: US001_Calculator_BasicMath
 * Diagram: SD001_Calculator_ProcessRequest
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { CalculatorAgent } from '../../../src/agents/calculator';
import { TestHarness } from '../../utils/test-harness';
import { CoverageCollector } from '../../utils/coverage-collector';

describe('test_US001_SD001_basic_operations', () => {
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

  it('should perform addition correctly', async () => {
    const result = await harness.sendAndWaitForResponse(
      'calculate 25 + 17',
      calculator
    );
    expect(result).toContain('42');
  });

  it('should perform multiplication correctly', async () => {
    const result = await harness.sendAndWaitForResponse(
      'what is 100 * 3?',
      calculator
    );
    expect(result).toContain('300');
  });

  it('should perform division correctly', async () => {
    const result = await harness.sendAndWaitForResponse(
      'calculate 1000 / 25',
      calculator
    );
    expect(result).toContain('40');
  });

  it('should perform subtraction correctly', async () => {
    const result = await harness.sendAndWaitForResponse(
      'calculate 99 - 33',
      calculator
    );
    expect(result).toContain('66');
  });

  it('should track external calls as per sequence diagram', async () => {
    const externalCalls = harness.getExternalCalls();
    
    // Verify expected external calls from SD001
    expect(externalCalls).toContain('ext_cache_get');
    expect(externalCalls).toContain('ext_http_request');
    expect(externalCalls).toContain('ext_database_query');
  });
});
