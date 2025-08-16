# Mock Free Test Oriented Development (MFTOD)

## Philosophy

Write tests that verify real behavior without mocking dependencies. This ensures tests validate actual system behavior rather than mocked assumptions.

## Process

### Red → Green → Refactor

1. **Red Phase**
  - Write failing test for new functionality
  - Test must fail for the right reason
  - Verify test catches the missing implementation

2. **Green Phase**
  - Write minimal code to pass test
  - Focus on correctness, not optimization
  - All tests must pass

3. **Refactor Phase**
  - Improve code quality
  - Maintain all passing tests
  - Optimize performance if needed

## Test Levels

### 1. Unit Tests

- Test individual functions/methods

- Use real implementations where possible

- Mock only external services (databases, APIs)

### 2. Integration Tests

- Test component interactions

- Use real components

- Verify data flow between modules

### 3. System Tests

- End-to-end testing with Playwright

- Real browser interactions

- Actual user workflows

## Best Practices

1. **Prefer integration over unit tests** when possible

2. **Use real implementations** instead of mocks

3. **Test behavior, not implementation**

4. **Keep tests simple and readable**

5. **Ensure tests are deterministic**

## Coverage Requirements

- Minimum 80% code coverage

- 100% coverage for critical paths

- All user stories must have tests

- System tests for all features
