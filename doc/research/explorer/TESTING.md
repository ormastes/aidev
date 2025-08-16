# Explorer System Testing Documentation

## Overview

The Explorer test suite verifies that the QA agent can detect real failures in test targets. It includes a vulnerable test application with intentional bugs and comprehensive tests to ensure the Explorer can find them.

## Test Architecture

```
research/explorer/
├── test-apps/
│   └── vulnerable-app/       # Intentionally buggy application
│       ├── server.js         # Express server with 8 types of bugs
│       └── package.json
├── tests/
│   ├── system/
│   │   └── explorer-system.test.js    # Node.js system tests
│   ├── playwright/
│   │   └── explorer-e2e.spec.ts       # Playwright E2E tests
│   ├── integration/
│   │   └── mcp-integration.test.py    # MCP integration tests
│   └── run-system-tests.sh            # Main test runner
```

## Vulnerable Test Application

The test app (`test-apps/vulnerable-app/server.js`) contains 8 intentional bugs:

1. **Console Errors** - JavaScript errors in browser console
2. **Stack Trace Exposure** - Full stack traces in API responses
3. **PII Leaks** - Sensitive data in error messages
4. **XSS Vulnerabilities** - Unescaped user input
5. **Slow Responses** - Performance issues (>3s)
6. **Missing Security Headers** - No X-Frame-Options, etc.
7. **API Schema Mismatch** - Response doesn't match OpenAPI spec
8. **5xx Server Errors** - Internal server errors

## Running Tests

### Quick Start

```bash
# Run all system tests
./research/explorer/tests/run-system-tests.sh
```

### Individual Test Suites

#### 1. Node.js System Tests
```bash
cd research/explorer/tests/system
node explorer-system.test.js
```

Tests:
- Vulnerable app startup
- Explorer execution
- Finding verification
- Detection accuracy

#### 2. Playwright E2E Tests
```bash
cd research/explorer/tests
bunx playwright test playwright/explorer-e2e.spec.ts
```

Tests:
- Console error detection
- XSS vulnerability detection
- Slow response detection
- Security header validation
- API schema validation
- Stack trace detection
- PII leak detection
- 5xx error detection

#### 3. Python Integration Tests
```bash
cd research/explorer/tests/integration
python3 mcp-integration.test.py
```

Tests:
- MCP server connectivity
- Browser automation
- Explorer imports
- Invariants loading
- Finding generation

## Test Execution Flow

### 1. Prerequisites Check
- Node.js 18+ required
- Python 3.10+ required
- Playwright browsers installed
- MCP SDK installed

### 2. Test App Setup
```bash
cd research/explorer/test-apps/vulnerable-app
bun install
node server.js  # Runs on port 3456
```

### 3. Explorer Execution
```bash
export STAGING_URL="http://localhost:3456"
export OPENAPI_SPEC_URL="http://localhost:3456/openapi.json"
python3 research/explorer/scripts/explorer.py
```

### 4. Verification
The test suite verifies Explorer can detect:
- ✅ Console errors
- ✅ XSS vulnerabilities
- ✅ API schema mismatches
- ✅ Missing security headers
- ✅ Slow responses (>3s)
- ✅ Exposed stack traces
- ✅ PII leaks
- ✅ 5xx server errors

## Expected Test Output

### Successful Run
```
==================================================
       EXPLORER SYSTEM TEST SUITE
==================================================

🔍 Checking prerequisites...
✅ All prerequisites satisfied

📦 Setting up vulnerable test app...
✅ Test app ready

🧪 Running Node.js system tests...
✅ Found console_error: JavaScript errors detected
✅ Found stack_trace: API endpoint exposes stack trace
✅ Found pii_leak: PII leaked in error messages
✅ Found xss_vulnerable: XSS vulnerability
✅ Found slow_response: Response time exceeds 3 seconds
✅ Found missing_headers: Missing security headers
✅ Found api_mismatch: API response doesn't match schema
✅ Found server_error: 5xx server error

📊 SUMMARY:
  Total Tests: 8
  Pass Rate: 100.0%
  Findings Detected: 8

🎉 SYSTEM TEST PASSED - Explorer can detect failures!
```

### Failed Detection
```
❌ FAILED TESTS: 2
  ❌ Missed console_error: JavaScript errors detected
  ❌ Missed api_mismatch: API response doesn't match schema

📊 SUMMARY:
  Total Tests: 8
  Pass Rate: 75.0%
  Findings Detected: 6

⚠️  SYSTEM TEST FAILED - Explorer missed critical issues
```

## Test Reports

After each run, a detailed report is generated:
```
research/explorer/tests/test-report-[timestamp].md
```

Contains:
- Test execution summary
- Environment details
- Individual test results
- Generated findings list
- Pass/fail statistics

## CI/CD Integration

### GitHub Actions
```yaml
name: Explorer System Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - uses: actions/setup-python@v4
      
      - name: Install dependencies
        run: |
          bun add -g @playwright/test
          uv pip install mcp
          bunx playwright install chromium
      
      - name: Run system tests
        run: ./research/explorer/tests/run-system-tests.sh
      
      - name: Upload test reports
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: test-reports
          path: research/explorer/tests/*.md
```

## Debugging Failed Tests

### 1. Check Prerequisites
```bash
node --version    # Should be 18+
python3 --version # Should be 3.10+
bunx playwright --version
python3 -c "import mcp"
```

### 2. Test App Manually
```bash
# Start app
cd research/explorer/test-apps/vulnerable-app
node server.js

# In another terminal, test endpoints
curl http://localhost:3456/
curl http://localhost:3456/api/users
curl http://localhost:3456/api/error
```

### 3. Run Explorer Manually
```bash
export STAGING_URL="http://localhost:3456"
export EXPLORER_DEBUG=true
python3 research/explorer/scripts/explorer.py
```

### 4. Check Findings
```bash
ls -la research/explorer/findings/
cat research/explorer/findings/*.md
```

## Extending Tests

### Add New Bug Type

1. Add bug to test app:
```javascript
// server.js
const BUGS = {
  // ...existing bugs
  NEW_BUG: true
};

// Add endpoint with bug
app.get('/api/new-bug', (req, res) => {
  if (BUGS.NEW_BUG) {
    // Buggy behavior
  }
});
```

2. Add test case:
```javascript
// explorer-system.test.js
const EXPECTED_BUGS = {
  // ...existing bugs
  new_bug: {
    type: 'error',
    severity: 'high',
    description: 'New bug description'
  }
};
```

3. Add E2E test:
```typescript
// explorer-e2e.spec.ts
test('should detect new bug', async ({ page }) => {
  // Test implementation
});
```

## Troubleshooting

### Common Issues

1. **Port 3456 in use**
   ```bash
   lsof -i :3456
   kill -9 [PID]
   ```

2. **MCP server not starting**
   ```bash
   bun add -g @playwright/mcp@latest
   uv pip install --upgrade mcp
   ```

3. **Playwright browsers missing**
   ```bash
   bunx playwright install chromium
   ```

4. **Python import errors**
   ```bash
   uv pip install mcp pyyaml
   ```

## Success Criteria

The Explorer system tests are considered successful when:

1. **Detection Rate**: Explorer finds ≥70% of intentional bugs
2. **No False Negatives**: All critical bugs (security, crashes) detected
3. **Accurate Reporting**: Findings include correct severity and type
4. **Test Generation**: Valid Playwright tests generated for each finding
5. **Performance**: Complete test suite runs in <5 minutes

## Next Steps

After verifying the Explorer works:

1. Deploy to staging environment
2. Configure for your actual application
3. Set up nightly runs in CI
4. Review and triage findings
5. Add custom invariants for your domain