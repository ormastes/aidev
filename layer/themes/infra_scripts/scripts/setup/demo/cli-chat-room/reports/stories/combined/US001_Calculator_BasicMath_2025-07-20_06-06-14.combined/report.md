# Story Report: US001_Calculator_BasicMath

**Generated:** 7/20/2025, 6:06:14 AM

## Status: ❌ FAILURE

## Summary

Story US001_Calculator_BasicMath: ❌ FAILURE - 3 test(s) failed.

## ❌ Failure Reasons

- 3 test(s) failed
- test_US001_SD001_addition: Error: expect(received).toBe(expected) // Object.is equality

Expected: 42
Received: 43
    at Object.<anonymous> (/home/ormastes/dev/aidev/demo/cli-chat-room/test/system/calculator/test_US001_SD001_simple.test.ts:18:20)
    at Promise.finally.In Progress (/home/ormastes/dev/aidev/demo/cli-chat-room/node_modules/jest-circus/build/jestAdapterInit.js:1559:28)
    at new Promise (<anonymous>)
    at callAsyncCircusFn (/home/ormastes/dev/aidev/demo/cli-chat-room/node_modules/jest-circus/build/jestAdapterInit.js:1499:10)
    at _callCircusTest (/home/ormastes/dev/aidev/demo/cli-chat-room/node_modules/jest-circus/build/jestAdapterInit.js:1009:40)
    at processTicksAndRejections (node:internal/process/task_queues:95:5)
    at _runTest (/home/ormastes/dev/aidev/demo/cli-chat-room/node_modules/jest-circus/build/jestAdapterInit.js:949:3)
    at _runTestsForDescribeBlock (/home/ormastes/dev/aidev/demo/cli-chat-room/node_modules/jest-circus/build/jestAdapterInit.js:839:13)
    at _runTestsForDescribeBlock (/home/ormastes/dev/aidev/demo/cli-chat-room/node_modules/jest-circus/build/jestAdapterInit.js:829:11)
    at run (/home/ormastes/dev/aidev/demo/cli-chat-room/node_modules/jest-circus/build/jestAdapterInit.js:757:3)
    at runAndTransformResultsToJestFormat (/home/ormastes/dev/aidev/demo/cli-chat-room/node_modules/jest-circus/build/jestAdapterInit.js:1920:21)
    at jestAdapter (/home/ormastes/dev/aidev/demo/cli-chat-room/node_modules/jest-circus/build/runner.js:101:19)
    at runTestInternal (/home/ormastes/dev/aidev/demo/cli-chat-room/node_modules/jest-runner/build/index.js:272:16)
    at runTest (/home/ormastes/dev/aidev/demo/cli-chat-room/node_modules/jest-runner/build/index.js:340:7)
- test_US001_SD001_string_expressions: Error: expect(received).toBe(expected) // Object.is equality

Expected: 42
Received: 43
    at Object.<anonymous> (/home/ormastes/dev/aidev/demo/cli-chat-room/test/system/calculator/test_US001_SD001_simple.test.ts:40:45)
    at Promise.finally.In Progress (/home/ormastes/dev/aidev/demo/cli-chat-room/node_modules/jest-circus/build/jestAdapterInit.js:1559:28)
    at new Promise (<anonymous>)
    at callAsyncCircusFn (/home/ormastes/dev/aidev/demo/cli-chat-room/node_modules/jest-circus/build/jestAdapterInit.js:1499:10)
    at _callCircusTest (/home/ormastes/dev/aidev/demo/cli-chat-room/node_modules/jest-circus/build/jestAdapterInit.js:1009:40)
    at processTicksAndRejections (node:internal/process/task_queues:95:5)
    at _runTest (/home/ormastes/dev/aidev/demo/cli-chat-room/node_modules/jest-circus/build/jestAdapterInit.js:949:3)
    at _runTestsForDescribeBlock (/home/ormastes/dev/aidev/demo/cli-chat-room/node_modules/jest-circus/build/jestAdapterInit.js:839:13)
    at _runTestsForDescribeBlock (/home/ormastes/dev/aidev/demo/cli-chat-room/node_modules/jest-circus/build/jestAdapterInit.js:829:11)
    at run (/home/ormastes/dev/aidev/demo/cli-chat-room/node_modules/jest-circus/build/jestAdapterInit.js:757:3)
    at runAndTransformResultsToJestFormat (/home/ormastes/dev/aidev/demo/cli-chat-room/node_modules/jest-circus/build/jestAdapterInit.js:1920:21)
    at jestAdapter (/home/ormastes/dev/aidev/demo/cli-chat-room/node_modules/jest-circus/build/runner.js:101:19)
    at runTestInternal (/home/ormastes/dev/aidev/demo/cli-chat-room/node_modules/jest-runner/build/index.js:272:16)
    at runTest (/home/ormastes/dev/aidev/demo/cli-chat-room/node_modules/jest-runner/build/index.js:340:7)
- test_US001_SD001_division_by_zero: Error: expect(received).toThrow(expected)

Expected substring: "Division by zero"

Received function did not throw
    at Object.<anonymous> (/home/ormastes/dev/aidev/demo/cli-chat-room/test/system/calculator/test_US001_SD001_simple.test.ts:55:44)
    at Promise.finally.In Progress (/home/ormastes/dev/aidev/demo/cli-chat-room/node_modules/jest-circus/build/jestAdapterInit.js:1559:28)
    at new Promise (<anonymous>)
    at callAsyncCircusFn (/home/ormastes/dev/aidev/demo/cli-chat-room/node_modules/jest-circus/build/jestAdapterInit.js:1499:10)
    at _callCircusTest (/home/ormastes/dev/aidev/demo/cli-chat-room/node_modules/jest-circus/build/jestAdapterInit.js:1009:40)
    at processTicksAndRejections (node:internal/process/task_queues:95:5)
    at _runTest (/home/ormastes/dev/aidev/demo/cli-chat-room/node_modules/jest-circus/build/jestAdapterInit.js:949:3)
    at _runTestsForDescribeBlock (/home/ormastes/dev/aidev/demo/cli-chat-room/node_modules/jest-circus/build/jestAdapterInit.js:839:13)
    at _runTestsForDescribeBlock (/home/ormastes/dev/aidev/demo/cli-chat-room/node_modules/jest-circus/build/jestAdapterInit.js:829:11)
    at run (/home/ormastes/dev/aidev/demo/cli-chat-room/node_modules/jest-circus/build/jestAdapterInit.js:757:3)
    at runAndTransformResultsToJestFormat (/home/ormastes/dev/aidev/demo/cli-chat-room/node_modules/jest-circus/build/jestAdapterInit.js:1920:21)
    at jestAdapter (/home/ormastes/dev/aidev/demo/cli-chat-room/node_modules/jest-circus/build/runner.js:101:19)
    at runTestInternal (/home/ormastes/dev/aidev/demo/cli-chat-room/node_modules/jest-runner/build/index.js:272:16)
    at runTest (/home/ormastes/dev/aidev/demo/cli-chat-room/node_modules/jest-runner/build/index.js:340:7)
- Coverage too low (0% < 80%)

## 📊 Coverage Report

| Metric | Coverage |
|--------|----------|
| Statements | 0.0% |
| Branches | 0.0% |
| Functions | 0.0% |
| Lines | 0.0% |

## 🧪 System Tests

**Total Tests:** 7
**IN PROGRESS:** 4
**Failed:** 3

### Test Details:

| Test Name | Status | Coverage | Duration |
|-----------|--------|----------|----------|
| test_US001_SD001_addition | ❌ failed | N/A | 8ms |
| test_US001_SD001_multiplication | 🔄 IN PROGRESS | N/A | 2ms |
| test_US001_SD001_division | 🔄 IN PROGRESS | N/A | 2ms |
| test_US001_SD001_subtraction | 🔄 IN PROGRESS | N/A | 1ms |
| test_US001_SD001_string_expressions | ❌ failed | N/A | 2ms |
| test_US001_SD001_division_by_zero | ❌ failed | N/A | 2ms |
| test_US001_SD001_invalid_expressions | 🔄 IN PROGRESS | N/A | 26ms |

---

*Report generated by Enhanced Story Reporter*
*Room ID: calculator-real-test*
