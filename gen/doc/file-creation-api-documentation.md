# File Creation API Documentation

## Overview

The File Creation API is a comprehensive file management system integrated into the `infra_external-log-lib` theme. It provides controlled, validated, and audited file operations that enforce the project's FILE_STRUCTURE.vf.json rules and detect fraudulent file creation patterns.

## Features

### 1. **Centralized File Creation API** (`FileCreationAPI`)
- Type-based file routing with predefined configurations
- Automatic directory resolution based on file type
- Built-in validation and size limits
- Atomic write operations for data integrity
- Comprehensive audit logging

### 2. **File Type Classification System**
Supported file types with automatic routing:

| Type | Base Directory | Extensions | Max Size |
|------|---------------|------------|----------|
| DOCUMENT | gen/doc | .md, .txt, .pdf, .html | 10MB |
| REPORT | gen/doc | .md, .json, .html, .pdf | 5MB |
| TEMPORARY | temp | any | 100MB |
| LOG | logs | .log, .txt, .json | 50MB |
| DATA | data | .json, .csv, .xml, .yaml | 100MB |
| CONFIG | config | .json, .yaml, .toml, .env | 1MB |
| TEST | tests | .test.ts, .spec.js | 5MB |
| SOURCE | src | .ts, .js, .py, .java | 5MB |
| GENERATED | gen | any | 50MB |
| DEMO | demo | any | 10MB |
| SCRIPT | scripts | .sh, .bat, .ps1, .py | 1MB |
| FIXTURE | fixtures | any | 10MB |
| COVERAGE | coverage | .json, .html, .lcov | 50MB |
| BUILD | dist | any | 500MB |

### 3. **Filesystem MCP Integration** (`MCPIntegratedFileManager`)
- Deep integration with FILE_STRUCTURE.vf.json
- Frozen directory detection and enforcement
- Theme and user story naming pattern validation
- Automatic path suggestions for incorrect locations
- Batch validation capabilities

### 4. **Fraud Detection System** (`FileCreationFraudChecker`)
Detects and prevents:
- Direct fs module usage bypassing the API
- Backup file creation (.bak, .backup)
- Root directory file creation
- Shell redirects to files
- Eval-based file operations
- Suspicious file patterns

Severity levels:
- **Critical**: Security risks, immediate action required
- **High**: Policy violations, should be fixed
- **Medium**: Best practice violations
- **Low**: Minor issues or warnings

### 5. **Audit and Compliance**
- Complete audit trail of all file operations
- Caller tracking for accountability
- Export audit logs for compliance reporting
- Violation reports with fix suggestions

## Usage Examples

### Basic File Creation

```typescript
import { FileCreationAPI, FileType } from '@external-log-lib/file-manager';

const fileAPI = new FileCreationAPI();

// Create a document
await fileAPI.createFile('user-guide.md', '# User Guide\n...', {
  type: FileType.DOCUMENT
});
// Creates: gen/doc/user-guide.md

// Create a test file
await fileAPI.createFile('auth.test.ts', 'describe("Auth", () => {...})', {
  type: FileType.TEST
});
// Creates: tests/auth.test.ts
```

### MCP-Validated File Creation

```typescript
import { MCPIntegratedFileManager } from '@external-log-lib/file-manager';

const manager = new MCPIntegratedFileManager();

// Create with structure validation
await manager.createStructuredFile(
  'layer/themes/my-theme/user-stories/001-feature/src/index.ts',
  'export class Feature {}',
  {
    type: FileType.SOURCE,
    enforceStructure: true,
    suggestAlternatives: true
  }
);

// Create typed file in correct location
await manager.createTypedFile(
  'analysis-report.md',
  '# Analysis Report',
  FileType.REPORT
);
// Automatically creates in: gen/doc/analysis-report.md
```

### Batch Operations

```typescript
const files = [
  {
    path: 'config.json',
    content: JSON.stringify({ version: '1.0.0' }),
    options: { type: FileType.CONFIG }
  },
  {
    path: 'README.md',
    content: '# Project Documentation',
    options: { type: FileType.DOCUMENT }
  }
];

// Atomic batch creation (all or nothing)
const results = await fileAPI.createBatch(files);
```

### Fraud Detection

```typescript
import { FileCreationFraudChecker } from '@external-log-lib/fraud-detector';

const checker = new FileCreationFraudChecker();

// Scan entire project
const violations = await checker.scanDirectory('./src', {
  excludePaths: ['node_modules', '.git'],
  includeSampleApps: false
});

// Generate report
const report = await checker.generateReport({
  reportPath: 'gen/doc/fraud-report.md'
});

// Auto-fix violations where possible
for (const [filePath, result] of violations) {
  if (result.canAutoFix) {
    await checker.autoFix(filePath);
  }
}
```

### Validation and Checking

```typescript
// Check if path is allowed
const isAllowed = await manager.checkPathAllowed(
  'root-file.txt',
  FileType.TEMPORARY
);
// Returns: false (root is frozen)

// Get allowed paths for type
const allowedPaths = manager.getAllowedPaths(FileType.TEST);
// Returns: ['tests/unit/...', 'tests/integration/...', ...]

// Batch validate paths
const paths = [
  { path: 'gen/doc/valid.md', type: FileType.DOCUMENT },
  { path: 'invalid-root.txt', type: FileType.TEMPORARY }
];

const validations = await manager.batchValidate(paths);
```

## API Reference

### FileCreationAPI

#### Constructor
```typescript
new FileCreationAPI(basePath?: string, enableStrictMode?: boolean)
```

#### Methods

##### createFile
```typescript
async createFile(
  filePath: string,
  content: string | Buffer,
  options: FileCreationOptions
): Promise<FileCreationResult>
```

##### writeFile
```typescript
async writeFile(
  filePath: string,
  content: string | Buffer,
  options?: Partial<FileCreationOptions>
): Promise<FileCreationResult>
```

##### createDirectory
```typescript
async createDirectory(dirPath: string): Promise<void>
```

##### createBatch
```typescript
async createBatch(
  files: Array<{
    path: string;
    content: string | Buffer;
    options: FileCreationOptions;
  }>
): Promise<FileCreationResult[]>
```

### MCPIntegratedFileManager

#### Constructor
```typescript
new MCPIntegratedFileManager(basePath?: string)
```

#### Methods

##### createStructuredFile
```typescript
async createStructuredFile(
  filePath: string,
  content: string | Buffer,
  options: StructureAwareOptions
): Promise<FileCreationResult>
```

##### validateAgainstStructure
```typescript
async validateAgainstStructure(
  filePath: string,
  type: FileType
): Promise<MCPValidationResult>
```

##### createTypedFile
```typescript
async createTypedFile(
  fileName: string,
  content: string | Buffer,
  type: FileType,
  options?: Partial<StructureAwareOptions>
): Promise<FileCreationResult>
```

### FileCreationFraudChecker

#### Constructor
```typescript
new FileCreationFraudChecker(basePath?: string)
```

#### Methods

##### scanFile
```typescript
async scanFile(filePath: string): Promise<FraudDetectionResult>
```

##### scanDirectory
```typescript
async scanDirectory(
  dirPath: string,
  options?: FraudCheckOptions
): Promise<Map<string, FraudDetectionResult>>
```

##### autoFix
```typescript
async autoFix(filePath: string): Promise<boolean>
```

##### generateReport
```typescript
async generateReport(options?: FraudCheckOptions): Promise<string>
```

## Configuration

### Strict Mode
Enable strict mode to throw exceptions on violations:

```typescript
const fileAPI = new FileCreationAPI(basePath, true);
// or
fileAPI.setStrictModeConfig({
  enabled: true,
  inheritToChildren: true,
  throwOnViolation: true,
  logWarnings: false
});
```

### MCP Validation
Control filesystem MCP validation:

```typescript
fileAPI.setMCPValidation(true);  // Enable
fileAPI.setMCPValidation(false); // Disable
```

### Fraud Detection
Control fraud detection:

```typescript
fileAPI.setFraudDetection(true);  // Enable
fileAPI.setFraudDetection(false); // Disable
```

## Integration with Existing Code

### Migration Path

1. **Identify Direct File Operations**
   ```bash
   npm run fraud-check
   ```

2. **Review Violations**
   Check `gen/doc/fraud-report.md`

3. **Auto-Fix Where Possible**
   ```bash
   npm run fraud-check -- --auto-fix
   ```

4. **Manual Migration**
   Replace remaining direct operations:
   
   Before:
   ```typescript
   fs.writeFileSync('output.txt', data);
   ```
   
   After:
   ```typescript
   await fileAPI.createFile('output.txt', data, {
     type: FileType.TEMPORARY
   });
   ```

### Import Statements

```typescript
// Main API
import { FileCreationAPI, FileType } from '@external-log-lib/file-manager';

// MCP Integration
import { MCPIntegratedFileManager } from '@external-log-lib/file-manager';

// Fraud Detection
import { FileCreationFraudChecker } from '@external-log-lib/fraud-detector';
```

## Best Practices

1. **Always specify file type** for proper routing and validation
2. **Use atomic writes** for critical data files
3. **Enable strict mode** in production environments
4. **Regular fraud scanning** in CI/CD pipeline
5. **Review audit logs** periodically for compliance
6. **Use batch operations** for related file creation
7. **Check path validity** before attempting creation
8. **Follow naming conventions** for themes and user stories

## Error Handling

```typescript
try {
  const result = await fileAPI.createFile('file.txt', 'content', {
    type: FileType.DOCUMENT,
    enforceStructure: true
  });
  
  if (!result.success) {
    console.error('Creation failed:', result.error);
    console.log('Violations:', result.violations);
  }
} catch (error) {
  if (error instanceof FileViolationError) {
    console.error('Structure violation:', error.message);
    console.error('Path:', error.path);
    console.error('Type:', error.violationType);
  }
}
```

## CLI Commands

```bash
# Run fraud detection
npm run fraud-check

# Auto-fix violations
npm run fraud-check -- --auto-fix

# Generate structure violation report
npm run validate-structure

# Export audit log
npm run export-audit
```

## Troubleshooting

### Common Issues

1. **"Root directory is frozen"**
   - Solution: Create files in appropriate subdirectories
   - Use `getAllowedPaths()` to find valid locations

2. **"Invalid theme name"**
   - Solution: Theme names must match `^[a-z][a-z0-9_-]*$`
   - User stories must match `^\d{3}-[a-z][a-z0-9-]*$`

3. **"Extension not allowed for type"**
   - Solution: Check allowed extensions for the file type
   - Use appropriate file type or change extension

4. **"File size exceeds limit"**
   - Solution: Check size limits for file type
   - Consider splitting large files or using streaming

## Version History

- **1.0.0** - Initial release with core functionality
- **1.1.0** - Added MCP integration
- **1.2.0** - Added fraud detection system
- **1.3.0** - Enhanced audit logging and reporting

## License

This module is part of the AI Development Platform and follows the project's licensing terms.