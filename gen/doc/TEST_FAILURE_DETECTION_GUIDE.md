# Test Failure Detection Guide

## Overview

This guide documents best practices and patterns for ensuring tests can properly detect failures. Every test should be able to distinguish between passing and failing conditions to prevent false positives and false negatives.

## Core Principles

### 1. Every Test Must Have Assertions

```typescript
// ❌ Bad: Test without assertions
test('should process data', () => {
  const result = processData(input);
  // No assertion - test always passes!
});

// ✅ Good: Test with clear assertions
test('should process data correctly', () => {
  const result = processData(input);
  expect(result).toBeDefined();
  expect(result.status).toBe('success');
  expect(result.data).toHaveLength(3);
});
```

### 2. Test Both Success and Failure Cases

```typescript
describe('Error Handling', () => {
  test('should succeed with valid input', () => {
    expect(() => validateInput('valid')).not.toThrow();
  });
  
  test('should fail with invalid input', () => {
    expect(() => validateInput('')).toThrow('Input cannot be empty');
  });
});
```

### 3. Validate Failure Detection

Each test should verify it can actually catch failures:

```typescript
test('assertion can detect failures', () => {
  // Verify the assertion works
  expect(() => {
    expect(1).toBe(2);
  }).toThrow();
  
  // Now use it for actual test
  expect(myFunction()).toBe(expectedValue);
});
```

## Common Patterns

### Pattern 1: Equality Testing

```typescript
// Basic equality
expect(actual).toBe(expected);           // Strict equality (===)
expect(actual).toEqual(expected);        // Deep equality
expect(actual).toStrictEqual(expected);  // Deep equality without undefined

// Verify failure detection
expect(() => expect(1).toBe(2)).toThrow();
expect(() => expect({a: 1}).toEqual({a: 2})).toThrow();
```

### Pattern 2: Truthiness Testing

```typescript
// Truthy/Falsy checks
expect(value).toBeTruthy();
expect(value).toBeFalsy();
expect(value).toBeDefined();
expect(value).toBeUndefined();
expect(value).toBeNull();

// Verify failure detection
expect(() => expect(false).toBeTruthy()).toThrow();
expect(() => expect(true).toBeFalsy()).toThrow();
```

### Pattern 3: Exception Testing

```typescript
// Test that function throws
expect(() => throwingFunction()).toThrow();
expect(() => throwingFunction()).toThrow(Error);
expect(() => throwingFunction()).toThrow('specific message');

// Test that function doesn't throw
expect(() => safeFunction()).not.toThrow();

// Verify failure detection
expect(() => {
  expect(() => nonThrowingFunction()).toThrow();
}).toThrow();
```

### Pattern 4: Async Testing

```typescript
// Promise resolution
await expect(promise).resolves.toBe('value');
await expect(promise).rejects.toThrow('error');

// Async function testing
test('async operation', async () => {
  const result = await asyncFunction();
  expect(result).toBe('expected');
});

// Verify failure detection
await expect(
  expect(Promise.resolve('a')).resolves.toBe('b')
).rejects.toThrow();
```

### Pattern 5: Mock Testing

```typescript
// Mock function calls
const mockFn = jest.fn();
mockFn('arg1', 'arg2');

expect(mockFn).toHaveBeenCalled();
expect(mockFn).toHaveBeenCalledTimes(1);
expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2');

// Verify failure detection
expect(() => {
  expect(mockFn).toHaveBeenCalledTimes(2);
}).toThrow();
```

### Pattern 6: Array/Collection Testing

```typescript
// Array assertions
expect(array).toHaveLength(5);
expect(array).toContain(item);
expect(array).toContainEqual({id: 1});

// Verify failure detection
expect(() => {
  expect([1, 2, 3]).toHaveLength(5);
}).toThrow();
```

### Pattern 7: Object Testing

```typescript
// Object assertions
expect(obj).toHaveProperty('key');
expect(obj).toHaveProperty('key', 'value');
expect(obj).toMatchObject({subset: 'match'});

// Verify failure detection
expect(() => {
  expect({}).toHaveProperty('missing');
}).toThrow();
```

### Pattern 8: Numeric Testing

```typescript
// Numeric comparisons
expect(value).toBeGreaterThan(5);
expect(value).toBeGreaterThanOrEqual(5);
expect(value).toBeLessThan(10);
expect(value).toBeLessThanOrEqual(10);
expect(value).toBeCloseTo(0.3, 5);

// Verify failure detection
expect(() => {
  expect(3).toBeGreaterThan(5);
}).toThrow();
```

## Edge Cases and Boundary Testing

### NaN Handling

```typescript
// NaN is special - it's not equal to itself
expect(NaN).toBeNaN();
expect(5).not.toBeNaN();

// Verify failure detection
expect(() => expect(5).toBeNaN()).toThrow();
```

### Null vs Undefined

```typescript
// They are different
expect(null).toBeNull();
expect(null).not.toBeUndefined();
expect(undefined).toBeUndefined();
expect(undefined).not.toBeNull();

// Verify failure detection
expect(() => expect(null).toBeUndefined()).toThrow();
expect(() => expect(undefined).toBeNull()).toThrow();
```

### Empty Values

```typescript
// Empty arrays and objects
expect([]).toHaveLength(0);
expect([]).toEqual([]);
expect({}).toEqual({});

// Verify failure detection
expect(() => expect([]).toHaveLength(1)).toThrow();
```

## Test Validation Utilities

### Helper Function for Validation

```typescript
/**
 * Validates that a test assertion can detect failures
 */
function verifyFailureDetection(
  testFn: () => void, 
  shouldPass: boolean = false
): boolean {
  try {
    testFn();
    return shouldPass;
  } catch {
    return !shouldPass;
  }
}

// Usage
test('validates assertion effectiveness', () => {
  // Should pass
  expect(verifyFailureDetection(
    () => expect(1).toBe(1), 
    true
  )).toBe(true);
  
  // Should fail and be caught
  expect(verifyFailureDetection(
    () => expect(1).toBe(2), 
    false
  )).toBe(true);
});
```

### Comprehensive Test Validator

```typescript
describe('Test Effectiveness', () => {
  const testCases = [
    { 
      name: 'equality',
      pass: () => expect(1).toBe(1),
      fail: () => expect(1).toBe(2)
    },
    {
      name: 'truthiness',
      pass: () => expect(true).toBeTruthy(),
      fail: () => expect(false).toBeTruthy()
    },
    {
      name: 'exceptions',
      pass: () => expect(() => { throw new Error(); }).toThrow(),
      fail: () => expect(() => {}).toThrow()
    }
  ];
  
  testCases.forEach(({ name, pass, fail }) => {
    test(`${name} assertions detect failures`, () => {
      // Passing case should not throw
      expect(() => pass()).not.toThrow();
      
      // Failing case should throw
      expect(() => fail()).toThrow();
    });
  });
});
```

## Anti-Patterns to Avoid

### 1. Tests Without Assertions

```typescript
// ❌ Bad
test('loads data', async () => {
  const data = await loadData();
  console.log(data); // Just logging, no assertion
});
```

### 2. Overly Broad Assertions

```typescript
// ❌ Bad
test('returns something', () => {
  const result = compute();
  expect(result).toBeDefined(); // Too vague
});

// ✅ Good
test('computes correct value', () => {
  const result = compute();
  expect(result).toBe(42);
  expect(result).toBeGreaterThan(0);
});
```

### 3. Catching Exceptions Without Validation

```typescript
// ❌ Bad
test('handles errors', () => {
  try {
    riskyOperation();
  } catch (e) {
    // Swallowing error without assertion
  }
});

// ✅ Good
test('handles errors correctly', () => {
  expect(() => riskyOperation()).toThrow('Expected error');
});
```

### 4. Ignoring Async Errors

```typescript
// ❌ Bad
test('async operation', () => {
  asyncFunction(); // Not awaited, errors ignored
});

// ✅ Good
test('async operation', async () => {
  await expect(asyncFunction()).resolves.toBe('success');
});
```

## Running Validation

### Manual Validation

```bash
# Run validation tests
npm test test/validation/

# Run test effectiveness check
node scripts/validate-test-effectiveness.js

# Generate health report
node scripts/generate-test-health-report.js
```

### Automated Validation

```bash
# Install pre-commit hook
ln -s ../../scripts/pre-commit-test-validation.sh .git/hooks/pre-commit

# Hook will automatically:
# - Check for test anti-patterns
# - Run validation tests
# - Verify affected tests pass
```

## Metrics and Monitoring

### Key Metrics

1. **Assertion Density**: Average assertions per test
2. **Failure Detection Rate**: Percentage of tests that validate failure cases
3. **Coverage**: Line, branch, function coverage
4. **Test Isolation**: Tests that don't affect each other

### Health Score Calculation

```
Health Score = (
  Coverage * 0.4 +
  Failure Detection * 0.3 +
  Test Count Score * 0.2 +
  Issue Penalty * 0.1
) / Total Weight
```

### Target Thresholds

- **Coverage**: ≥ 80%
- **Failure Detection Score**: ≥ 80/100
- **Health Score**: ≥ 75%
- **No .only() in committed tests**
- **No tests without assertions**

## Continuous Improvement

### Regular Audits

1. Weekly: Run test health report
2. Per PR: Validate new tests detect failures
3. Monthly: Review and update validation patterns
4. Quarterly: Comprehensive test suite audit

### Team Guidelines

1. Every new test must demonstrate failure detection
2. Test reviews should verify assertions are adequate
3. Maintain validation test suite for patterns
4. Document new patterns as discovered

## Tools and Scripts

### Available Scripts

- `scripts/validate-test-effectiveness.js` - Validates test failure detection
- `scripts/generate-test-health-report.js` - Generates comprehensive health report
- `scripts/pre-commit-test-validation.sh` - Pre-commit validation hook

### Test Files

- `test/validation/test-failure-detection.test.ts` - Core validation patterns
- `test/validation/verify-test-effectiveness.test.ts` - Test effectiveness verification

## Conclusion

Effective test failure detection is crucial for maintaining a reliable test suite. By following these patterns and regularly validating test effectiveness, we ensure our tests provide real value in catching bugs and regressions.

Remember: **A test that can't fail is not a test.**