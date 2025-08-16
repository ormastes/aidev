# File Violation Prevention

## Overview

The external-log-lib theme now includes a **File Violation Prevention** system that enforces file structure compliance based on FILE_STRUCTURE.vf.json. This feature uses filesystem-mcp logic to check file operations before execution and can prevent violations that would break the project structure.

## Features

- ✅ **Strict Mode**: Throw exceptions on violations (enabled for this theme)
- ⚠️ **Warning Mode**: Log warnings without blocking (default)
- 🔄 **Inheritance**: Apply rules to child directories
- 🛡️ **Safe Operations**: Wrapped file operations with validation
- 📋 **Configurable**: Environment-based and runtime configuration

## Default Behavior

By default, the system operates in **non-strict mode**:
- File operations are allowed
- Warnings are logged for violations
- No exceptions are thrown

## Enabling Strict Mode

### Method 1: Environment Variable
```bash
export EXTERNAL_LOG_LIB_STRICT_MODE=true
```

### Method 2: Runtime Configuration
```typescript
import { enableStrictMode } from 'layer/themes/infra_external-log-lib/pipe';

// Enable strict mode for current session
enableStrictMode();
```

### Method 3: Custom Configuration
```typescript
import { FileViolationPreventer } from 'layer/themes/infra_external-log-lib/pipe';

const preventer = new FileViolationPreventer(process.cwd(), {
  enabled: true,           // Enable checking
  inheritToChildren: true, // Apply to children
  logWarnings: false,      // Don't log warnings
  throwOnViolation: true   // Throw on violations
});
```

## Using Safe File Operations

### Safe Write File
```typescript
import { safeWriteFile } from 'layer/themes/infra_external-log-lib/pipe';

// This will check for violations before writing
await safeWriteFile('path/to/file.txt', 'content');
```

### Safe Create Directory
```typescript
import { safeMkdir } from 'layer/themes/infra_external-log-lib/pipe';

// This will check if directory creation is allowed
await safeMkdir('path/to/new/dir', { recursive: true });
```

### Safe Copy File
```typescript
import { safeCopyFile } from 'layer/themes/infra_external-log-lib/pipe';

// This will check if destination is valid
await safeCopyFile('source.txt', 'dest.txt');
```

### Check Without Executing
```typescript
import { wouldViolate } from 'layer/themes/infra_external-log-lib/pipe';

// Check if operation would violate without executing
const violates = await wouldViolate('create', 'path/to/file.txt');
if (violates) {
  console.log('This operation would violate structure rules');
}
```

## Violation Types Detected

### 1. Freeze Violations
Files created in frozen directories:
```typescript
// ❌ Root is frozen - this will be blocked
await safeWriteFile('/unauthorized.txt', 'content');

// ✅ Allowed files in frozen directories are OK
await safeWriteFile('/package.json', '{}');
```

### 2. Backup File Prevention
```typescript
// ❌ Backup files are not allowed
await safeWriteFile('file.bak', 'backup');
await safeWriteFile('file.backup', 'backup');
```

### 3. Duplicate Mock Files
```typescript
// ❌ JS mock when TS version exists
// If mock.ts exists, mock.js will be blocked
await safeWriteFile('mock.js', 'content');
```

### 4. Pattern Violations
```typescript
// ❌ Files with spaces
await safeWriteFile('file with spaces.txt', 'content');

// ❌ Invalid theme names
await safeMkdir('layer/themes/Invalid-Theme');
```

### 5. Unexpected Directories
```typescript
// ❌ Creating unexpected directories in themes
await safeMkdir('layer/themes/infra_external-log-lib/random-dir');

// ✅ Allowed directories are OK
await safeMkdir('layer/themes/infra_external-log-lib/src');
```

## Configuration Options

### StrictModeConfig Interface
```typescript
interface StrictModeConfig {
  enabled: boolean;          // Enable/disable checking
  inheritToChildren: boolean; // Apply to child directories
  logWarnings: boolean;      // Log violations as warnings
  throwOnViolation: boolean; // Throw exceptions on violations
}
```

### Path-Specific Configuration
Some paths have different rules:
- `children/` - Always strict (enforced)
- `tests/` - Relaxed rules
- `gen/` - Relaxed for generated files
- `logs/` - Relaxed for log files

## Error Handling

### FileViolationError
```typescript
try {
  await safeWriteFile('invalid.bak', 'content');
} catch (error) {
  if (error.name === 'FileViolationError') {
    console.log('Path:', error.path);
    console.log('Type:', error.violationType);
    console.log('Message:', error.message);
  }
}
```

## Integration with Existing Code

### Replace Standard fs Operations
```typescript
// Before (standard fs)
fs.writeFileSync('file.txt', 'content');

// After (with violation checking)
import { safeWriteFileSync } from 'layer/themes/infra_external-log-lib/pipe';
safeWriteFileSync('file.txt', 'content');
```

### Conditional Strict Mode
```typescript
import { isStrictModeEnabled, SafeFileOps } from 'layer/themes/infra_external-log-lib/pipe';

if (isStrictModeEnabled()) {
  // Use safe operations
  await SafeFileOps.safeWriteFile('file.txt', 'content');
} else {
  // Use standard fs
  fs.writeFileSync('file.txt', 'content');
}
```

## Testing

Run the tests to verify the system:
```bash
cd layer/themes/infra_external-log-lib
npm test -- FileViolationPreventer.test.ts
```

## Benefits

1. **Prevents Structure Violations**: Catches violations before they happen
2. **Maintains Consistency**: Enforces FILE_STRUCTURE.vf.json rules
3. **Flexible Configuration**: Strict for production, relaxed for development
4. **Child Protection**: Automatically applies to child directories
5. **Clear Error Messages**: Detailed violation information

## Example Usage in Logger

```typescript
import { 
  FileViolationPreventer,
  safeWriteFile,
  enableStrictMode 
} from 'layer/themes/infra_external-log-lib/pipe';

class SafeLogger {
  constructor(private logPath: string) {
    // Enable strict mode for this logger
    enableStrictMode();
  }

  async log(message: string) {
    const timestamp = new Date().toISOString();
    const logEntry = `${timestamp}: ${message}\n`;
    
    try {
      // Safe append to log file
      await safeAppendFile(this.logPath, logEntry);
    } catch (error) {
      if (error.name === 'FileViolationError') {
        console.error('Cannot write to log:', error.message);
        // Fallback to console
        console.log(logEntry);
      } else {
        throw error;
      }
    }
  }
}
```

## Migration Guide

To migrate existing code to use violation prevention:

1. **Import safe operations**
   ```typescript
   import { SafeFileOps } from 'layer/themes/infra_external-log-lib/pipe';
   ```

2. **Replace fs operations**
   - `fs.writeFileSync` → `SafeFileOps.safeWriteFileSync`
   - `fs.mkdirSync` → `SafeFileOps.safeMkdirSync`
   - `fs.appendFileSync` → `SafeFileOps.safeAppendFile`

3. **Add error handling**
   ```typescript
   try {
     await SafeFileOps.safeWriteFile(path, content);
   } catch (error) {
     if (error.name === 'FileViolationError') {
       // Handle violation
     }
   }
   ```

4. **Configure strict mode**
   - Set environment variable for CI/CD
   - Enable programmatically for production
   - Use warning mode for development

## Troubleshooting

### "File write blocked" errors
- Check if the path violates FILE_STRUCTURE.vf.json rules
- Verify the file isn't a backup file (.bak, .backup)
- Ensure directory isn't frozen

### Strict mode not working
- Check environment variable: `echo $EXTERNAL_LOG_LIB_STRICT_MODE`
- Verify initialization: `await preventer.initialize()`
- Check path is within theme: `preventer.isStrictModeEnabled(path)`

### Too many warnings
- Disable warnings: `preventer.setStrictModeConfig({ logWarnings: false })`
- Or switch to strict mode to fail fast

## Conclusion

The File Violation Prevention system helps maintain a clean, consistent project structure by preventing violations before they occur. It's flexible enough for development while being strict enough for production use.