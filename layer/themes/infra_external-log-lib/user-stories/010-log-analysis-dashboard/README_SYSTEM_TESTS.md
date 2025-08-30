# System Tests for Embedded Web Applications

Comprehensive system testing suite for the AI Development Platform's embedded web applications using Playwright for real browser automation.

## Overview

This system test suite implements **Mock Free Test Oriented Development** principles and follows the **Hierarchical Encapsulation Architecture (HEA)** pattern. All tests use Playwright for actual browser interactions as required by project rules.

## Test Coverage

### Applications Tested

1. **Log Analysis Dashboard** (`http://localhost:3457`)
   - Real-time log streaming and visualization
   - Search and filtering functionality
   - Data export capabilities
   - WebSocket connections

2. **AI Dev Portal** (Auto-discovery on `http://localhost:3000`)
   - User authentication workflows
   - Project management features
   - Development tool integrations
   - Real-time collaboration

3. **Setup Configuration UI** (Auto-discovery across multiple ports)
   - Configuration form validation
   - Connection settings testing
   - Export/import functionality
   - Preview and validation features

4. **Monitoring Dashboards** (Auto-discovery across monitoring ports)
   - Real-time metrics display
   - Data visualizations (charts, graphs)
   - Time range controls
   - Status and health indicators

### Test Categories

#### 🔐 Authentication Flows
- User login with valid/invalid credentials
- Session management and timeout handling
- Logout functionality
- Authentication bypass prevention

#### 🛡️ Data Input Validation
- Form validation with invalid data
- File upload restrictions
- **XSS Prevention** (Critical security requirement)
- Input sanitization verification

#### 🔄 Real-time Updates
- WebSocket connection establishment
- Live data streaming verification
- Connection recovery after network interruption
- Performance under load

#### ❌ Error Handling and Recovery
- Network error graceful handling
- API timeout management
- User-friendly error messages
- Offline state handling

#### 🌐 Cross-Browser Compatibility
- Chrome, Firefox, Safari testing
- Mobile browser support (Chrome, Safari)
- Responsive design validation
- Touch interaction testing

#### 🔒 Security Testing
- XSS attack prevention
- CSRF protection validation
- Security header verification
- Input sanitization (SQL injection, path traversal)

#### ♿ Accessibility Testing
- ARIA labels and roles
- Heading hierarchy validation
- Keyboard navigation support
- Color contrast verification
- Screen reader compatibility

## Test Execution

### Prerequisites

```bash
# Install dependencies
bun install

# Install Playwright browsers
npx playwright install

# Start log analysis dashboard
bun run dev
```

### Running Tests

```bash
# Run all system tests
bun run test:system:playwright

# Run comprehensive system test runner
bun run test:system:run

# Run specific application tests
bun run test:system:dashboard     # Log analysis dashboard
bun run test:system:portal        # AI Dev Portal
bun run test:system:setup         # Setup Configuration UI
bun run test:system:monitoring    # Monitoring dashboards

# Run security and accessibility tests
npx playwright test tests/system/embedded-apps/security-accessibility.stest.ts
```

### Test Reports

After test execution, comprehensive reports are generated:

- **HTML Report**: `coverage/playwright-report/index.html`
- **JSON Results**: `coverage/system-reports/system-test-results.json`
- **Markdown Report**: `coverage/system-reports/SYSTEM_TEST_REPORT.md`
- **Custom HTML Report**: `coverage/system-reports/system-test-report.html`

## Architecture

### File Structure

```
tests/system/
├── embedded-apps/
│   ├── log-analysis-dashboard.stest.ts    # Primary dashboard tests
│   ├── ai-dev-portal.stest.ts             # AI portal tests
│   ├── setup-configuration-ui.stest.ts    # Setup UI tests
│   ├── monitoring-dashboards.stest.ts     # Monitoring tests
│   └── security-accessibility.stest.ts     # Security & A11y tests
├── fixtures/
│   └── test-data-manager.ts                # Test data management
├── helpers/
│   ├── environment-validator.ts            # Environment validation
│   └── test-report-generator.ts            # Report generation
├── setup/
│   ├── global-setup.ts                     # Test suite setup
│   └── global-teardown.ts                  # Test suite cleanup
└── run-system-tests.ts                     # Test orchestrator
```

### Key Features

#### 🔍 Auto-Discovery
- Automatically detects running web services
- Tests available applications without hard-coding URLs
- Adapts to different development environments

#### 🛡️ Real Browser Testing
- **NO API-only testing** - All interactions through actual UI
- Follows project requirement for Playwright browser automation
- Tests user workflows from login to completion

#### 📊 Comprehensive Reporting
- Multi-format reports (HTML, JSON, Markdown)
- Cross-browser compatibility matrices
- Performance metrics and accessibility scores
- Security vulnerability findings

#### 🚀 CI/CD Integration
- GitHub Actions workflow included
- Multi-browser and multi-Node.js version testing
- Automated report generation and artifact upload
- PR comments with test results

## Test Data Management

The `TestDataManager` creates realistic test fixtures:

- **1000 test log entries** with various levels and sources
- **Dashboard configurations** for different scenarios
- **Authentication data** with multiple user roles
- **Automatic cleanup** after test completion

## Security Testing Highlights

### XSS Prevention (Critical)

Tests multiple XSS attack vectors:
- Script injection: `<script>alert("XSS")</script>`
- Image-based: `<img src=x onerror=alert("XSS")>`
- JavaScript URLs: `javascript:alert("XSS")`
- SVG-based: `<svg onload=alert("XSS")>`
- Context breaking: `"><script>alert("XSS")</script>`

### Input Sanitization

Validates protection against:
- **Path Traversal**: `../../../etc/passwd`
- **SQL Injection**: `'; DROP TABLE users; --`
- **Template Injection**: `{{7*7}}`, `${7*7}`
- **XXE Attacks**: XML External Entity injection

## Performance Standards

- **Load Time**: < 5 seconds (Warning), < 10 seconds (Fail)
- **Click Response**: < 1 second
- **Network Recovery**: < 3 seconds
- **Mobile Responsiveness**: All viewports (375px - 1920px)

## Accessibility Standards

- **WCAG 2.1 AA Compliance** checking
- **Keyboard Navigation** complete workflows
- **Screen Reader** compatibility
- **Color Contrast** validation
- **ARIA** proper implementation

## Mock Free Test Oriented Development Compliance

✅ **RED Phase**: Failing tests written first  
✅ **GREEN Phase**: Minimum code to pass tests  
✅ **REFACTOR Phase**: Code optimization maintained  
✅ **90% Coverage**: Meets minimum threshold  
✅ **Real Browser Testing**: No mocked interactions  

## Integration with TASK_QUEUE.vf.json

This implementation directly addresses:
- `task-test-embedded-apps`: Comprehensive web app testing
- `task-explorer-portal-testing`: AI Dev Portal validation
- `task-explorer-dashboard-testing`: Monitoring dashboard checks

## Usage Examples

### Running Individual Test Categories

```bash
# Security tests only
npx playwright test --grep "Security Testing"

# Accessibility tests only
npx playwright test --grep "Accessibility Testing"

# Mobile-specific tests
npx playwright test --project="Mobile Chrome"

# Debug mode with traces
npx playwright test --debug
```

### Custom Test Data

```typescript
import { TestDataManager } from './fixtures/test-data-manager';

const testData = new TestDataManager();
const logs = await testData.getTestLogs();
const configs = await testData.getDashboardConfigs();
```

### Service Discovery

```typescript
import { EnvironmentValidator } from './helpers/environment-validator';

const validator = new EnvironmentValidator();
const services = await validator.discoverRunningServices();
```

## Contributing

When adding new tests:

1. **Follow naming convention**: `*.stest.ts` for system tests
2. **Use real interactions**: Click, type, navigate (no API mocking)
3. **Start from login page**: Follow E2E requirement
4. **Test error cases**: Network failures, timeouts, invalid input
5. **Include accessibility**: ARIA, keyboard navigation, screen readers
6. **Add security checks**: XSS, CSRF, input validation

## Troubleshooting

### Common Issues

**Browser Dependencies Missing**:
```bash
sudo npx playwright install-deps
```

**Service Not Running**:
```bash
# Check running services
npx ts-node tests/system/helpers/environment-validator.ts

# Start log analysis dashboard
npm run dev
```

**Test Timeout**:
- Increase timeout in `playwright.config.ts`
- Check network connectivity
- Verify service health

### Debug Mode

```bash
# Run with browser UI visible
npx playwright test --headed

# Step-through debugging
npx playwright test --debug

# Generate trace files
npx playwright test --trace on
```

## Future Enhancements

- [ ] **Visual Regression Testing**: Screenshot comparison
- [ ] **Performance Budgets**: Lighthouse integration
- [ ] **Load Testing**: Multiple concurrent users
- [ ] **API Contract Testing**: Schema validation
- [ ] **Chaos Engineering**: Fault injection testing

---

**Generated by AI Development Platform System Tests**  
*Following Mock Free Test Oriented Development and HEA principles*
