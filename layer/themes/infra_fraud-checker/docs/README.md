# Fraud Checker Theme

A comprehensive test fraud detection system that analyzes test files for suspicious patterns, manipulation attempts, and quality issues. All external dependencies are properly wrapped with logging capabilities.

## Architecture

The fraud checker follows the Hierarchical Encapsulation Architecture (HEA) pattern:

```
fraud-checker/
├── pipe/              # Public API gateway
├── children/          # Core implementation classes
├── external/          # Wrapped external dependencies
├── scripts/           # CLI tools
└── tests/            # Test files
```

### External Dependencies

All external libraries are accessed through wrapper classes that integrate with the external log library:

1. **FileSystemWrapper** - Wraps all file system operations
   - Tracks read/write operations
   - Logs all file access
   - Provides metrics (bytes read/written, operation counts)

2. **ASTParserWrapper** - Wraps Babel parser for AST analysis
   - Logs parsing operations
   - Tracks parse times and errors
   - Provides parsing metrics

## Features

### 1. Fraud Detection
- **Test Manipulation**: Detects `.only`, `.skip` patterns
- **Coverage Bypass**: Finds coverage ignore comments
- **Fake Assertions**: Identifies empty tests and always-true assertions
- **Disabled Tests**: Finds commented out tests

### 2. Pattern Detection
- Regex-based pattern matching
- Customizable pattern definitions
- Severity-based scoring

### 3. Test Analysis
- Test execution metrics
- Quality assessment
- Suspicious pattern identification
- Comparison between test runs

### 4. Report Generation
- Multiple output formats (JSON, HTML, Markdown)
- Comprehensive metrics
- Visual HTML reports
- Actionable recommendations

## Usage

### As a Library

```typescript
import { createFraudChecker, createFraudReportGenerator } from '@aidev/fraud-checker';

// Create instances
const checker = createFraudChecker();
const reporter = createFraudReportGenerator();

// Set up logging
checker.onLog((entry) => {
  console.log(`[${entry.level}] ${entry.message}`);
});

// Check test files
const result = await checker.checkDirectory('./tests');

// Generate report
const report = await reporter.generateReport(result);
await reporter.saveReport(report, 'fraud-report.json');
```

### CLI Script

```bash
# Check current directory
./scripts/check-fraud.ts

# Check specific directory with output
./scripts/check-fraud.ts -d src/tests -o report.json

# Verbose mode with custom pattern
./scripts/check-fraud.ts -p "\.spec\.ts$" -v

# Generate all report formats
./scripts/check-fraud.ts -d src -o fraud-report.json -f all
```

### CLI Options

- `-d, --directory <path>` - Directory to check (default: current)
- `-p, --pattern <regex>` - File pattern to match (default: `\.(test|spec)\.(ts|js)$`)
- `-o, --output <path>` - Output file path for report
- `-f, --format <type>` - Report format: json, html, markdown, all
- `-v, --verbose` - Show detailed logging
- `-h, --help` - Show help message

## Fraud Scoring

The fraud checker uses a scoring system (0-100):

- **100**: No issues detected
- **90-99**: Minor issues
- **70-89**: Moderate issues requiring attention
- **Below 70**: Significant issues requiring immediate action

### Severity Penalties

- **Critical** (25 points): Always-true assertions, coverage manipulation
- **High** (15 points): Empty tests, `.only` usage
- **Medium** (10 points): Skipped tests, TODO tests
- **Low** (5 points): Commented tests, minor issues

## Integration with External Log Library

All external operations are logged and tracked:

```typescript
// Example log entries
[info] Reading file: /src/tests/auth.test.ts
[debug] Successfully read 2048 bytes from /src/tests/auth.test.ts
[info] Parsing test file: auth.test.ts
[debug] Successfully parsed auth.test.ts in 45ms
[info] Analyzing test patterns in auth.test.ts
[debug] Found 2 suspicious patterns in auth.test.ts
```

### Metrics Tracking

```typescript
// Get metrics from wrapped dependencies
const fsMetrics = checker.getFileSystemMetrics();
console.log('Files read:', fsMetrics.readCount);
console.log('Total bytes:', fsMetrics.totalBytesRead);

const parserMetrics = checker.getParserMetrics();
console.log('Files parsed:', parserMetrics.filesAnalyzed);
console.log('Parse time:', parserMetrics.parseTime);
```

## Detected Patterns

### Test Manipulation
- `.only` - Tests running in isolation
- `.skip` - Skipped tests
- Commented tests

### Coverage Bypass
- `istanbul ignore` comments
- `c8 ignore` comments
- Direct `__coverage__` manipulation

### Fake Assertions
- Empty test bodies
- `expect(true).toBe(true)`
- Tests with only console.log
- No assertions in test file

### Quality Issues
- Suspiciously fast tests (< 1ms)
- Duplicate/identical tests
- High skip ratios (> 20%)

## Report Examples

### JSON Report
```json
{
  "timestamp": "2025-07-23T12:00:00Z",
  "summary": {
    "overallScore": 85,
    "passed": false,
    "totalViolations": 5,
    "criticalViolations": 1,
    "recommendation": "Some issues detected. Review and improve test quality."
  },
  "violations": {
    "bySeverity": {
      "critical": [...],
      "high": [...]
    }
  }
}
```

### HTML Report
- Visual dashboard with metrics
- Color-coded violations
- Detailed recommendations
- Interactive elements

### Markdown Report
- Text-based summary
- Violation listings
- Suitable for documentation

## Best Practices

1. **Regular Checks**: Run fraud detection in CI/CD pipelines
2. **Threshold Enforcement**: Fail builds on scores below 90
3. **Monitor Trends**: Track score changes over time
4. **Address Critical Issues**: Fix critical violations immediately
5. **Review Reports**: Regularly review HTML reports for insights

## Testing

The fraud checker includes comprehensive tests:

```bash
# Run tests
npm test

# Coverage report
npm run coverage
```

## Contributing

When adding new fraud patterns:

1. Add pattern to `FraudPatternDetector`
2. Define appropriate severity
3. Add test cases
4. Update documentation

## License

MIT