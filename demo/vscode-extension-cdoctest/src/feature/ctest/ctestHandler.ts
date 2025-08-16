import * as vscode from 'vscode';
import { CTestConfig, CTestInfo, CTestResult } from './ctestConfig';
import { processCoverageAfterTestRun } from '../coverageHandler';

/**
 * Handles CTest test discovery and result parsing - adapted for runner interface
 */
export function getCTestListHandler(ctrl: vscode.TestController): (result: string) => void {
    return async (result: string) => {
        // Clear existing tests first - do this outside the try block
        ctrl.items.replace([]);
        
        try {
            // Parse result string - assuming it contains JSON output from ctest --show-only=json-v1
            const testData = JSON.parse(result);
            if (!testData.tests || !Array.isArray(testData.tests)) {
                console.warn('No tests found in CTest JSON output');
                return;
            }

            // Create test tree structure
            const testSuites = new Map<string, vscode.TestItem>();

            for (const test of testData.tests) {
                const testInfo = parseTestInfo(test);
                
                // Create or get test suite
                let suiteItem = testSuites.get(testInfo.suite);
                if (!suiteItem) {
                    suiteItem = ctrl.createTestItem(testInfo.suite, testInfo.suite);
                    suiteItem.canResolveChildren = false;
                    testSuites.set(testInfo.suite, suiteItem);
                    ctrl.items.add(suiteItem);
                }

                // Create test case
                const testItem = ctrl.createTestItem(testInfo.name, testInfo.case);
                testItem.canResolveChildren = false;
                
                // Add properties as description if available
                if (testInfo.properties.LABELS) {
                    testItem.description = `Labels: ${testInfo.properties.LABELS}`;
                }

                suiteItem.children.add(testItem);
            }

            console.log(`Discovered ${testData.tests.length} CTest tests`);
        } catch (parseError) {
            console.error('Error parsing CTest JSON output:', parseError);
        }
    };
}

/**
 * Handles CTest test execution results - adapted for runner interface
 */
export function getCTestRunHandler(
    test: vscode.TestItem,
    config: CTestConfig,
    run: vscode.TestRun,
    resolve: () => void
): (result: string) => void {
    return async (result: string) => {
        try {
            const testResult = parseTestExecutionResult(test.id, result, '', null);
            
            const duration = testResult.duration;
            
            switch (testResult.status) {
                case 'passed':
                    run.passed(test, duration);
                    break;
                case 'failed':
                    const message = new vscode.TestMessage(testResult.message || 'Test failed');
                    if (testResult.output) {
                        message.actualOutput = testResult.output;
                    }
                    run.failed(test, message, duration);
                    break;
                case 'skipped':
                    run.skipped(test);
                    break;
            }
            
            // Process coverage after test completes
            await processCoverageAfterTestRun(config, run);
        } catch (parseError) {
            console.error('Error parsing CTest result:', parseError);
            run.failed(test, new vscode.TestMessage(`Failed to parse test result: ${parseError}`));
        } finally {
            resolve();
        }
    };
}

/**
 * Parse test information from CTest JSON output
 */
function parseTestInfo(test: any): CTestInfo {
    const testName = test.name || '';
    const parts = testName.split('.');
    const suite = parts.length > 1 ? parts.slice(0, -1).join('.') : testName;
    const testCase = parts.length > 1 ? parts[parts.length - 1] : '';

    return {
        name: testName,
        command: test.command || [],
        properties: test.properties || {},
        suite,
        case: testCase
    };
}

/**
 * Parse CTest execution results
 */
function parseTestExecutionResult(testName: string, output: string, stderr: string, error: any): CTestResult {
    
    // If there was an execution error, mark as failed
    if (error && error.code !== 0) {
        return {
            name: testName,
            status: 'failed',
            duration: 0,
            message: `Test execution failed with code ${error.code}`,
            output
        };
    }

    // Parse CTest output for test status
    const lines = output.split('\n');
    
    // Look for test result patterns in CTest output
    for (const line of lines) {
        if (line.includes('Test #') && line.includes(testName)) {
            if (line.includes('Passed')) {
                return {
                    name: testName,
                    status: 'passed',
                    duration: extractDuration(output),
                    output
                };
            } else if (line.includes('Failed')) {
                return {
                    name: testName,
                    status: 'failed',
                    duration: extractDuration(output),
                    message: extractFailureMessage(output),
                    output
                };
            } else if (line.includes('Skipped')) {
                return {
                    name: testName,
                    status: 'skipped',
                    duration: 0,
                    output
                };
            }
        }
    }

    // Look for overall test summary
    if (output.includes('100% tests passed')) {
        return {
            name: testName,
            status: 'passed',
            duration: extractDuration(output),
            output
        };
    } else if (output.includes('tests failed out of')) {
        return {
            name: testName,
            status: 'failed',
            duration: extractDuration(output),
            message: extractFailureMessage(output),
            output
        };
    }

    // Default case - if we can't determine status, assume passed if no error
    return {
        name: testName,
        status: error ? 'failed' : 'passed',
        duration: 0,
        message: error ? 'Test execution error' : undefined,
        output
    };
}

/**
 * Extract test duration from CTest output
 */
function extractDuration(output: string): number {
    // Look for timing information like "0.05 sec" or "Total Test time (real) = 1.23 sec"
    const patterns = [
        /(\d+\.?\d*)\s*sec/,
        /Total Test time \(real\) = (\d+\.?\d*) sec/
    ];

    for (const pattern of patterns) {
        const match = output.match(pattern);
        if (match) {
            return parseFloat(match[1]) * 1000; // Convert to milliseconds
        }
    }

    return 0;
}

/**
 * Extract failure message from CTest output
 */
function extractFailureMessage(output: string): string {
    const lines = output.split('\n');
    const errorLines: string[] = [];

    let inFailedTest = false;
    for (const line of lines) {
        if (line.includes('Test #') && line.includes('Failed')) {
            inFailedTest = true;
            continue;
        }
        
        if (inFailedTest) {
            if (line.trim() === '' || line.includes('Test #')) {
                break; // End of this test's output
            }
            
            if (line.includes('FAILED') || 
                line.includes('Error') || 
                line.includes('Assertion') ||
                line.includes('Expected') ||
                line.includes('Actual')) {
                errorLines.push(line.trim());
            }
        }
    }

    if (errorLines.length > 0) {
        return errorLines.slice(0, 5).join('\n'); // Take first 5 error lines
    }

    // Fallback - look for any failure-related content
    const failureKeywords = ['FAILED', 'ASSERTION', 'ERROR', 'Expected', 'Actual'];
    const relevantLines = lines.filter(line => 
        failureKeywords.some(keyword => line.toUpperCase().includes(keyword))
    );

    return relevantLines.slice(0, 3).join('\n') || 'Test failed (no detailed message available)';
}