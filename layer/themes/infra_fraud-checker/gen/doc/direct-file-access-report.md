# Direct File Access Detection Report

Generated: 2025-08-13T06:21:44.774Z

## Summary

- Total Files Scanned: 145
- Files with Direct Access: 58
- Total Violations: 445

### Violations by Severity

- 🔴 Critical: 113
- 🟠 High: 30
- 🟡 Medium: 214
- 🟢 Low: 88

## Violations by Theme

### root (312 violations)

#### children/ExternalLibraryDetector.ts

- Line 196: `report += '3. Example: Replace `import fs from "fs"` with `import { fs } from "@...`
  - Type: fs-import (high)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Import: import { auditedFS } from '../../infra_external-log-lib/pipe';

#### children/FraudReportGenerator.ts

- Line 127: `<head>`
  - Type: shell-command (medium)
  - Recommendation: Shell commands bypass auditing. Consider using auditedFS methods instead
- Line 229: `</head>`
  - Type: shell-command (medium)
  - Recommendation: Shell commands bypass auditing. Consider using auditedFS methods instead

#### examples/example.ts

- Line 3: `import * as fs from 'fs/promises';`
  - Type: fs-promises-import (high)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Import: import { auditedFS } from '../../infra_external-log-lib/pipe';
- Line 67: `await fs.mkdir(testDir, { recursive: true });`
  - Type: fs-method-call (critical)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName
- Line 70: `await fs.writeFile(`
  - Type: fs-method-call (critical)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName
- Line 98: `await fs.writeFile(`
  - Type: fs-method-call (critical)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName
- Line 125: `await fs.writeFile(`
  - Type: fs-method-call (critical)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName
- ... and 5 more violations

#### external/FileSystemWrapper.d.ts

- Line 1: `import * as fs from 'fs/promises';`
  - Type: fs-promises-import (high)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Import: import { auditedFS } from '../../infra_external-log-lib/pipe';

#### external/FileSystemWrapper.ts

- Line 1: `import * as fs from 'fs/promises';`
  - Type: fs-promises-import (high)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Import: import { auditedFS } from '../../infra_external-log-lib/pipe';
- Line 35: `const content = await fs.readFile(absolutePath, encoding);`
  - Type: fs-method-call (critical)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName
- Line 54: `await fs.mkdir(path.dirname(absolutePath), { recursive: true });`
  - Type: fs-method-call (critical)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName
- Line 55: `await fs.writeFile(absolutePath, content, encoding);`
  - Type: fs-method-call (critical)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName
- Line 73: `const files = await fs.readdir(absolutePath);`
  - Type: fs-method-call (critical)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName
- ... and 3 more violations

#### src/cli/fraud-analyzer.ts

- Line 169: `await auditedFS.mkdir(request.outputPath, { recursive: true });`
  - Type: shell-command (medium)
  - Recommendation: Shell commands bypass auditing. Consider using auditedFS methods instead
- Line 353: `await auditedFS.mkdir(request.outputPath, { recursive: true });`
  - Type: shell-command (medium)
  - Recommendation: Shell commands bypass auditing. Consider using auditedFS methods instead

#### src/detectors/unauthorized-file-detector.ts

- Line 363: ``mkdir.*${dirName}`,`
  - Type: shell-command (medium)
  - Recommendation: Shell commands bypass auditing. Consider using auditedFS methods instead
- Line 365: ``fs\\.mkdir.*${dirName}`,`
  - Type: shell-command (medium)
  - Recommendation: Shell commands bypass auditing. Consider using auditedFS methods instead

#### src/detectors/web-ui-test-detector.ts

- Line 316: `'   - tap() - touch interactions',`
  - Type: shell-command (medium)
  - Recommendation: Shell commands bypass auditing. Consider using auditedFS methods instead

#### src/services/fraud-analyzer-service.ts

- Line 157: `await auditedFS.mkdir(outputDir, { recursive: true });`
  - Type: shell-command (medium)
  - Recommendation: Shell commands bypass auditing. Consider using auditedFS methods instead

#### tests/integration/cli-script.test.ts

- Line 3: `import * as fs from 'fs/promises';`
  - Type: fs-promises-import (low)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Import: import { auditedFS } from '../../infra_external-log-lib/pipe';
- Line 26: `const files = await fs.readdir(tempDir);`
  - Type: fs-method-call (medium)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName
- Line 55: `await fs.writeFile(testFile, ``
  - Type: fs-method-call (medium)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName
- Line 81: `await fs.writeFile(testFile, ``
  - Type: fs-method-call (medium)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName
- Line 107: `await fs.writeFile(testFile, ``
  - Type: fs-method-call (medium)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName
- ... and 33 more violations

#### tests/integration/pipe-integration.test.ts

- Line 2: `import * as fs from 'fs/promises';`
  - Type: fs-promises-import (low)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Import: import { auditedFS } from '../../infra_external-log-lib/pipe';
- Line 19: `const files = await fs.readdir(tempDir);`
  - Type: fs-method-call (medium)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName
- Line 39: `await fs.writeFile(testFile, ``
  - Type: fs-method-call (medium)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName
- Line 64: `await fs.writeFile(testFile, ``
  - Type: fs-method-call (medium)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName
- Line 198: `const jsonExists = await fs.access(outputPath).then(() => true).catch(() => fals...`
  - Type: fs-method-call (medium)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName
- ... and 11 more violations

#### tests/integration/real-coverage.test.ts

- Line 6: `import * as fs from 'fs/promises';`
  - Type: fs-promises-import (low)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Import: import { auditedFS } from '../../infra_external-log-lib/pipe';
- Line 27: `await fs.writeFile(testFile, ``
  - Type: fs-method-call (medium)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName
- Line 48: `{ path: testFile, content: await fs.readFile(testFile, 'utf-8') }`
  - Type: fs-method-call (medium)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName
- Line 179: `const savedReport = JSON.parse(await fs.readFile(reportPath, 'utf-8'));`
  - Type: fs-method-call (medium)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName
- Line 184: `const htmlExists = await fs.access(htmlPath).then(() => true).catch(() => false)...`
  - Type: fs-method-call (medium)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName
- ... and 1 more violations

#### tests/performance/stress-tests.test.ts

- Line 4: `import * as fs from 'fs/promises';`
  - Type: fs-promises-import (low)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Import: import { auditedFS } from '../../infra_external-log-lib/pipe';
- Line 21: `const files = await fs.readdir(tempDir);`
  - Type: fs-method-call (medium)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName
- Line 32: `await fs.writeFile(testFile, largeTestContent);`
  - Type: fs-method-call (medium)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName
- Line 49: `await fs.writeFile(testFile, deeplyNestedContent);`
  - Type: fs-method-call (medium)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName
- Line 117: `await fs.writeFile(testFile, complexTestContent);`
  - Type: fs-method-call (medium)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName
- ... and 14 more violations

#### tests/unit/FileSystemWrapper.test.ts

- Line 2: `import * as fs from 'fs/promises';`
  - Type: fs-promises-import (low)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Import: import { auditedFS } from '../../infra_external-log-lib/pipe';
- Line 112: `mockFs.mkdir.mockResolvedValue(undefined);`
  - Type: shell-command (low)
  - Recommendation: Shell commands bypass auditing. Consider using auditedFS methods instead
- Line 117: `expect(mockFs.mkdir).toHaveBeenCalledWith(expectedDir, { recursive: true });`
  - Type: shell-command (low)
  - Recommendation: Shell commands bypass auditing. Consider using auditedFS methods instead
- Line 129: `mockFs.mkdir.mockResolvedValue(undefined);`
  - Type: shell-command (low)
  - Recommendation: Shell commands bypass auditing. Consider using auditedFS methods instead
- Line 142: `mockFs.mkdir.mockResolvedValue(undefined);`
  - Type: shell-command (low)
  - Recommendation: Shell commands bypass auditing. Consider using auditedFS methods instead
- ... and 4 more violations

#### tests/unit/UnauthorizedFileDetector.test.ts

- Line 6: `import * as fs from 'fs';`
  - Type: fs-import (low)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Import: import { auditedFS } from '../../infra_external-log-lib/pipe';
- Line 30: `fs.mkdirSync(path.join(tempDir, 'coverage'));`
  - Type: fs-sync-method-call (medium)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName
- Line 31: `fs.mkdirSync(path.join(tempDir, 'deploy'));`
  - Type: fs-sync-method-call (medium)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName
- Line 32: `fs.mkdirSync(path.join(tempDir, 'src'));`
  - Type: fs-sync-method-call (medium)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName
- Line 49: `fs.writeFileSync(path.join(tempDir, 'file.bak'), 'backup');`
  - Type: fs-sync-method-call (medium)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName
- ... and 19 more violations

#### tests/unit/WebUITestDetector.test.ts

- Line 3: `import * as fs from 'fs';`
  - Type: fs-import (low)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Import: import { auditedFS } from '../../infra_external-log-lib/pipe';
- Line 23: `fs.writeFileSync(testFile, ``
  - Type: fs-sync-method-call (medium)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName
- Line 43: `fs.writeFileSync(testFile, ``
  - Type: fs-sync-method-call (medium)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName
- Line 66: `fs.writeFileSync(testFile, ``
  - Type: fs-sync-method-call (medium)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName
- Line 88: `fs.writeFileSync(testFile, ``
  - Type: fs-sync-method-call (medium)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName
- ... and 8 more violations

#### children/ExternalLibraryDetector.js

- Line 189: `report += '3. Example: Replace `import fs from "fs"` with `import { fs } from "@...`
  - Type: fs-import (high)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Import: import { auditedFS } from '../../infra_external-log-lib/pipe';
- Line 42: `const path = __importStar(require("path"));`
  - Type: path-require (low)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead

#### children/FraudChecker.js

- Line 39: `const path = __importStar(require("path"));`
  - Type: path-require (low)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead

#### children/FraudReportGenerator.js

- Line 87: `<head>`
  - Type: shell-command (medium)
  - Recommendation: Shell commands bypass auditing. Consider using auditedFS methods instead
- Line 189: `</head>`
  - Type: shell-command (medium)
  - Recommendation: Shell commands bypass auditing. Consider using auditedFS methods instead

#### examples/example.js

- Line 91: `await fs.mkdir(testDir, { recursive: true });`
  - Type: fs-method-call (critical)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName
- Line 93: `await fs.writeFile(path.join(testDir, 'auth.stest.js'), `// System test - should...`
  - Type: fs-method-call (critical)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName
- Line 117: `await fs.writeFile(path.join(testDir, 'database.envtest.js'), `// Environment te...`
  - Type: fs-method-call (critical)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName
- Line 140: `await fs.writeFile(path.join(testDir, 'payment.etest.js'), `// External test - s...`
  - Type: fs-method-call (critical)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName
- Line 156: `await fs.writeFile(path.join(testDir, 'checkout.stest.js'), `// System test - pr...`
  - Type: fs-method-call (critical)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName
- ... and 5 more violations

#### external/FileSystemWrapper.js

- Line 60: `const content = await fs.readFile(absolutePath, encoding);`
  - Type: fs-method-call (critical)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName
- Line 76: `await fs.mkdir(path.dirname(absolutePath), { recursive: true });`
  - Type: fs-method-call (critical)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName
- Line 77: `await fs.writeFile(absolutePath, content, encoding);`
  - Type: fs-method-call (critical)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName
- Line 92: `const files = await fs.readdir(absolutePath);`
  - Type: fs-method-call (critical)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName
- Line 106: `return await fs.stat(absolutePath);`
  - Type: fs-method-call (critical)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName
- ... and 3 more violations

#### src/cli/fraud-analyzer.js

- Line 65: `const requestData = await fs.readFile(requestFile, 'utf8');`
  - Type: fs-method-call (critical)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName
- Line 130: `await fs.mkdir(request.outputPath, { recursive: true });`
  - Type: fs-method-call (critical)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName
- Line 298: `await fs.mkdir(request.outputPath, { recursive: true });`
  - Type: fs-method-call (critical)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName
- Line 312: `await fs.writeFile(jsonPath, JSON.stringify(report, null, 2));`
  - Type: fs-method-call (critical)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName
- Line 482: `await fs.writeFile(outputPath, markdown);`
  - Type: fs-method-call (critical)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName
- ... and 3 more violations

#### src/detectors/base-detector.js

- Line 37: `const fs_1 = require("fs");`
  - Type: fs-require (high)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Import: import { auditedFS } from '../../infra_external-log-lib/pipe';

#### src/detectors/web-ui-test-detector.js

- Line 264: `recommendations.push('🚫 Forbidden Non-User Actions:', '   - No page.evaluate() ...`
  - Type: shell-command (medium)
  - Recommendation: Shell commands bypass auditing. Consider using auditedFS methods instead

#### src/reporters/fraud-report-generator.js

- Line 41: `await fs.writeFile(outputPath, JSON.stringify(report, null, 2));`
  - Type: fs-method-call (critical)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName
- Line 81: `await fs.writeFile(outputPath, markdown);`
  - Type: fs-method-call (critical)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName
- Line 38: `const path = __importStar(require("path"));`
  - Type: path-require (low)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead

#### src/services/code-smell-detector.js

- Line 71: `const content = await fs.readFile(filePath, 'utf8');`
  - Type: fs-method-call (critical)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName
- Line 38: `const path = __importStar(require("path"));`
  - Type: path-require (low)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead

#### src/services/dependency-fraud-detector.js

- Line 59: `const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));`
  - Type: fs-method-call (critical)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName
- Line 103: `await fs.access(p);`
  - Type: fs-method-call (critical)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName
- Line 38: `const path = __importStar(require("path"));`
  - Type: path-require (low)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead

#### src/services/fraud-analyzer-service.js

- Line 150: `await fs.mkdir(outputDir, { recursive: true });`
  - Type: fs-method-call (critical)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName
- Line 45: `const path = __importStar(require("path"));`
  - Type: path-require (low)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead
- Line 150: `await fs.mkdir(outputDir, { recursive: true });`
  - Type: shell-command (medium)
  - Recommendation: Shell commands bypass auditing. Consider using auditedFS methods instead

#### src/services/mock-detection-service.js

- Line 104: `const content = await fs.readFile(filePath, 'utf8');`
  - Type: fs-method-call (critical)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName
- Line 38: `const path = __importStar(require("path"));`
  - Type: path-require (low)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead

#### src/services/rule-suggestion-analyzer.js

- Line 115: `const content = await fs.readFile(file, 'utf8');`
  - Type: fs-method-call (critical)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName
- Line 183: `const content = await fs.readFile(file, 'utf8');`
  - Type: fs-method-call (critical)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName
- Line 249: `const content = await fs.readFile(file, 'utf8');`
  - Type: fs-method-call (critical)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName
- Line 316: `const content = await fs.readFile(file, 'utf8');`
  - Type: fs-method-call (critical)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName
- Line 350: `const content = await fs.readFile(file, 'utf8');`
  - Type: fs-method-call (critical)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName
- ... and 2 more violations

#### src/services/security-vulnerability-detector.js

- Line 71: `const content = await fs.readFile(filePath, 'utf8');`
  - Type: fs-method-call (critical)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName
- Line 38: `const path = __importStar(require("path"));`
  - Type: path-require (low)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead

#### src/services/test-coverage-fraud-detector.js

- Line 76: `const content = await fs.readFile(filePath, 'utf8');`
  - Type: fs-method-call (critical)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName
- Line 38: `const path = __importStar(require("path"));`
  - Type: path-require (low)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead

#### tests/integration/cli-script.test.js

- Line 56: `const files = await fs.readdir(tempDir);`
  - Type: fs-method-call (medium)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName
- Line 80: `await fs.writeFile(testFile, ``
  - Type: fs-method-call (medium)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName
- Line 105: `await fs.writeFile(testFile, ``
  - Type: fs-method-call (medium)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName
- Line 130: `await fs.writeFile(testFile, ``
  - Type: fs-method-call (medium)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName
- Line 151: `const reportExists = await fs.access(outputFile).then(() => true).catch(() => fa...`
  - Type: fs-method-call (medium)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName
- ... and 33 more violations

#### tests/integration/pipe-integration.test.js

- Line 50: `const files = await fs.readdir(tempDir);`
  - Type: fs-method-call (medium)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName
- Line 66: `await fs.writeFile(testFile, ``
  - Type: fs-method-call (medium)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName
- Line 86: `await fs.writeFile(testFile, ``
  - Type: fs-method-call (medium)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName
- Line 196: `const jsonExists = await fs.access(outputPath).then(() => true).catch(() => fals...`
  - Type: fs-method-call (medium)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName
- Line 197: `const htmlExists = await fs.access(outputPath.replace('.json', '.html')).then(()...`
  - Type: fs-method-call (medium)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName
- ... and 11 more violations

#### tests/integration/real-coverage.test.js

- Line 57: `await fs.writeFile(testFile, ``
  - Type: fs-method-call (medium)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName
- Line 77: `{ path: testFile, content: await fs.readFile(testFile, 'utf-8') }`
  - Type: fs-method-call (medium)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName
- Line 189: `const savedReport = JSON.parse(await fs.readFile(reportPath, 'utf-8'));`
  - Type: fs-method-call (medium)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName
- Line 193: `const htmlExists = await fs.access(htmlPath).then(() => true).catch(() => false)...`
  - Type: fs-method-call (medium)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName
- Line 42: `const path = __importStar(require("path"));`
  - Type: path-require (low)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead
- ... and 1 more violations

#### tests/performance/stress-tests.test.js

- Line 52: `const files = await fs.readdir(tempDir);`
  - Type: fs-method-call (medium)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName
- Line 61: `await fs.writeFile(testFile, largeTestContent);`
  - Type: fs-method-call (medium)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName
- Line 74: `await fs.writeFile(testFile, deeplyNestedContent);`
  - Type: fs-method-call (medium)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName
- Line 137: `await fs.writeFile(testFile, complexTestContent);`
  - Type: fs-method-call (medium)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName
- Line 168: `filePromises.push(fs.writeFile(fileName, content));`
  - Type: fs-method-call (medium)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName
- ... and 14 more violations

#### tests/unit/FileSystemWrapper.test.js

- Line 38: `const path = __importStar(require("path"));`
  - Type: path-require (low)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead
- Line 121: `mockFs.mkdir.mockResolvedValue(undefined);`
  - Type: shell-command (low)
  - Recommendation: Shell commands bypass auditing. Consider using auditedFS methods instead
- Line 124: `expect(mockFs.mkdir).toHaveBeenCalledWith(expectedDir, { recursive: true });`
  - Type: shell-command (low)
  - Recommendation: Shell commands bypass auditing. Consider using auditedFS methods instead
- Line 133: `mockFs.mkdir.mockResolvedValue(undefined);`
  - Type: shell-command (low)
  - Recommendation: Shell commands bypass auditing. Consider using auditedFS methods instead
- Line 142: `mockFs.mkdir.mockResolvedValue(undefined);`
  - Type: shell-command (low)
  - Recommendation: Shell commands bypass auditing. Consider using auditedFS methods instead
- ... and 4 more violations

#### tests/unit/WebUITestDetector.test.js

- Line 38: `const fs = __importStar(require("fs"));`
  - Type: fs-require (low)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Import: import { auditedFS } from '../../infra_external-log-lib/pipe';
- Line 54: `fs.writeFileSync(testFile, ``
  - Type: fs-sync-method-call (medium)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName
- Line 71: `fs.writeFileSync(testFile, ``
  - Type: fs-sync-method-call (medium)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName
- Line 89: `fs.writeFileSync(testFile, ``
  - Type: fs-sync-method-call (medium)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName
- Line 106: `fs.writeFileSync(testFile, ``
  - Type: fs-sync-method-call (medium)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName
- ... and 9 more violations

### scripts (133 violations)

#### scripts/check-all-themes-comprehensive.ts

- Line 8: `import * as fs from 'fs';`
  - Type: fs-import (high)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Import: import { auditedFS } from '../../infra_external-log-lib/pipe';
- Line 80: `const entries = fs.readdirSync(this.themesPath, { withFileTypes: true });`
  - Type: fs-sync-method-call (critical)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName
- Line 99: `const entries = fs.readdirSync(dir, { withFileTypes: true });`
  - Type: fs-sync-method-call (critical)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName
- Line 143: `const content = fs.readFileSync(file, 'utf-8');`
  - Type: fs-sync-method-call (critical)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName
- Line 156: `const content = fs.readFileSync(file, 'utf-8');`
  - Type: fs-sync-method-call (critical)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName
- ... and 6 more violations

#### scripts/check-external-lib-usage.ts

- Line 8: `import * as fs from 'fs';`
  - Type: fs-import (high)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Import: import { auditedFS } from '../../infra_external-log-lib/pipe';
- Line 166: `console.log('   - import fs from "fs" → import { fs } from "layer/themes/externa...`
  - Type: fs-import (high)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Import: import { auditedFS } from '../../infra_external-log-lib/pipe';
- Line 244: `markdown += 'import fs from "fs";\n';`
  - Type: fs-import (high)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Import: import { auditedFS } from '../../infra_external-log-lib/pipe';
- Line 32: `const entries = fs.readdirSync(this.themesPath, { withFileTypes: true });`
  - Type: fs-sync-method-call (critical)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName
- Line 50: `const entries = fs.readdirSync(dir, { withFileTypes: true });`
  - Type: fs-sync-method-call (critical)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName
- ... and 5 more violations

#### scripts/check-fraud.ts

- Line 8: `import * as fs from 'fs/promises';`
  - Type: fs-promises-import (high)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Import: import { auditedFS } from '../../infra_external-log-lib/pipe';
- Line 47: `const content = await fs.readFile(file, 'utf8');`
  - Type: fs-method-call (critical)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName
- Line 87: `await fs.writeFile(mdPath, markdown);`
  - Type: fs-method-call (critical)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName
- Line 164: `const entries = await fs.readdir(currentDir, { withFileTypes: true });`
  - Type: fs-method-call (critical)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName

#### scripts/check-unauthorized-files.ts

- Line 11: `import * as fs from 'fs';`
  - Type: fs-import (high)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Import: import { auditedFS } from '../../infra_external-log-lib/pipe';
- Line 115: `fs.mkdirSync(reportDir, { recursive: true });`
  - Type: fs-sync-method-call (critical)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName
- Line 118: `fs.writeFileSync(reportPath, report);`
  - Type: fs-sync-method-call (critical)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName
- Line 150: `const stats = fs.statSync(path.join(process.cwd(), creator));`
  - Type: fs-sync-method-call (critical)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName

#### scripts/scan-themes-web-ui.ts

- Line 7: `import * as fs from 'fs';`
  - Type: fs-import (high)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Import: import { auditedFS } from '../../infra_external-log-lib/pipe';
- Line 47: `const stat = await fs.promises.stat(themePath);`
  - Type: fs-promises-method-call (critical)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName
- Line 139: `const packageJson = JSON.parse(await fs.promises.readFile(packageJsonPath, 'utf8...`
  - Type: fs-promises-method-call (critical)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName
- Line 250: `await fs.promises.mkdir(reportPath, { recursive: true });`
  - Type: fs-promises-method-call (critical)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName
- Line 255: `await fs.promises.writeFile(reportFile, JSON.stringify(results, null, 2));`
  - Type: fs-promises-method-call (critical)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName
- ... and 2 more violations

#### scripts/check-all-themes-comprehensive.js

- Line 42: `const fs = __importStar(require("fs"));`
  - Type: fs-require (high)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Import: import { auditedFS } from '../../infra_external-log-lib/pipe';
- Line 74: `const entries = fs.readdirSync(this.themesPath, { withFileTypes: true });`
  - Type: fs-sync-method-call (critical)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName
- Line 92: `const entries = fs.readdirSync(dir, { withFileTypes: true });`
  - Type: fs-sync-method-call (critical)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName
- Line 132: `const content = fs.readFileSync(file, 'utf-8');`
  - Type: fs-sync-method-call (critical)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName
- Line 145: `const content = fs.readFileSync(file, 'utf-8');`
  - Type: fs-sync-method-call (critical)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName
- ... and 7 more violations

#### scripts/check-external-lib-usage.js

- Line 42: `const fs = __importStar(require("fs"));`
  - Type: fs-require (high)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Import: import { auditedFS } from '../../infra_external-log-lib/pipe';
- Line 175: `console.log('   - import fs from "fs" → import { fs } from "layer/themes/externa...`
  - Type: fs-import (high)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Import: import { auditedFS } from '../../infra_external-log-lib/pipe';
- Line 243: `markdown += 'import fs from "fs";\n';`
  - Type: fs-import (high)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Import: import { auditedFS } from '../../infra_external-log-lib/pipe';
- Line 57: `const entries = fs.readdirSync(this.themesPath, { withFileTypes: true });`
  - Type: fs-sync-method-call (critical)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName
- Line 74: `const entries = fs.readdirSync(dir, { withFileTypes: true });`
  - Type: fs-sync-method-call (critical)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName
- ... and 6 more violations

#### scripts/check-fixes-progress.js

- Line 3: `const path = require('path');`
  - Type: path-require (low)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead

#### scripts/check-fraud.js

- Line 65: `const content = await fs.readFile(file, 'utf8');`
  - Type: fs-method-call (critical)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName
- Line 97: `await fs.writeFile(mdPath, markdown);`
  - Type: fs-method-call (critical)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName
- Line 165: `const entries = await fs.readdir(currentDir, { withFileTypes: true });`
  - Type: fs-method-call (critical)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName
- Line 40: `const path = __importStar(require("path"));`
  - Type: path-require (low)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead

#### scripts/check-web-ui-tests.js

- Line 13: `const fs = require('fs').promises;`
  - Type: fs-require (high)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Import: import { auditedFS } from '../../infra_external-log-lib/pipe';
- Line 39: `await fs.writeFile(requestFile, JSON.stringify(request, null, 2));`
  - Type: fs-method-call (critical)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName
- Line 60: `await fs.unlink(requestFile);`
  - Type: fs-method-call (critical)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName
- Line 14: `const path = require('path');`
  - Type: path-require (low)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead

#### scripts/detect-direct-file-access.js

- Line 386: `report += 'const data = fs.readFileSync(\'file.txt\', \'utf8\');\n';`
  - Type: fs-sync-method-call (critical)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName
- Line 387: `report += 'fs.writeFileSync(\'output.txt\', data);\n';`
  - Type: fs-sync-method-call (critical)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName
- Line 11: `const path = require("path");`
  - Type: path-require (low)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead
- Line 46: `pattern: /fs\.(readFile|writeFile|appendFile|unlink|mkdir|rmdir|readdir|stat|acc...`
  - Type: shell-command (medium)
  - Recommendation: Shell commands bypass auditing. Consider using auditedFS methods instead
- Line 46: `pattern: /fs\.(readFile|writeFile|appendFile|unlink|mkdir|rmdir|readdir|stat|acc...`
  - Type: shell-command (medium)
  - Recommendation: Shell commands bypass auditing. Consider using auditedFS methods instead
- ... and 18 more violations

#### scripts/direct-portal-test.js

- Line 8: `const fs = require('fs').promises;`
  - Type: fs-require (high)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Import: import { auditedFS } from '../../infra_external-log-lib/pipe';
- Line 24: `await fs.access(testFile);`
  - Type: fs-method-call (critical)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName
- Line 7: `const path = require('path');`
  - Type: path-require (low)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead

#### scripts/fix-fs-imports.js

- Line 3: `const fs = require('fs');`
  - Type: fs-require (high)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Import: import { auditedFS } from '../../infra_external-log-lib/pipe';
- Line 43: `if (content.includes("import * as fs from 'fs'")) {`
  - Type: fs-import (high)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Import: import { auditedFS } from '../../infra_external-log-lib/pipe';
- Line 45: `"import * as fs from 'fs';",`
  - Type: fs-import (high)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Import: import { auditedFS } from '../../infra_external-log-lib/pipe';
- Line 51: `if (content.includes("import { promises as fs } from 'fs'")) {`
  - Type: fs-import-destructured (high)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Import: import { auditedFS } from '../../infra_external-log-lib/pipe';
- Line 53: `"import { promises as fs } from 'fs';",`
  - Type: fs-import-destructured (high)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Import: import { auditedFS } from '../../infra_external-log-lib/pipe';
- ... and 7 more violations

#### scripts/quick-test-scanner.js

- Line 5: `const fs = require('fs');`
  - Type: fs-require (high)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Import: import { auditedFS } from '../../infra_external-log-lib/pipe';
- Line 40: `const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));`
  - Type: fs-sync-method-call (critical)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName
- Line 4: `const path = require('path');`
  - Type: path-require (low)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead

#### scripts/run-all-fraud-checks.js

- Line 1: `const fs = require('fs');`
  - Type: fs-require (high)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Import: import { auditedFS } from '../../infra_external-log-lib/pipe';
- Line 14: `themes = fs.readdirSync(themesDir, { withFileTypes: true })`
  - Type: fs-sync-method-call (critical)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName
- Line 67: `const content = fs.readFileSync(file, 'utf-8');`
  - Type: fs-sync-method-call (critical)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName
- Line 161: `fs.mkdirSync(outputDir, { recursive: true });`
  - Type: fs-sync-method-call (critical)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName
- Line 165: `fs.writeFileSync(jsonPath, JSON.stringify(results, null, 2));`
  - Type: fs-sync-method-call (critical)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName
- ... and 3 more violations

#### scripts/scan-portal-tests.js

- Line 8: `const fs = require('fs').promises;`
  - Type: fs-require (high)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Import: import { auditedFS } from '../../infra_external-log-lib/pipe';
- Line 100: `await fs.mkdir(path.dirname(reportPath), { recursive: true });`
  - Type: fs-method-call (critical)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName
- Line 101: `await fs.writeFile(reportPath, JSON.stringify(results, null, 2));`
  - Type: fs-method-call (critical)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName
- Line 7: `const path = require('path');`
  - Type: path-require (low)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead
- Line 100: `await fs.mkdir(path.dirname(reportPath), { recursive: true });`
  - Type: shell-command (medium)
  - Recommendation: Shell commands bypass auditing. Consider using auditedFS methods instead

#### scripts/scan-themes-web-ui-now.js

- Line 9: `const path = require('path');`
  - Type: path-require (low)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead

#### scripts/scan-themes-web-ui.js

- Line 41: `const fs = __importStar(require("fs"));`
  - Type: fs-require (high)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Import: import { auditedFS } from '../../infra_external-log-lib/pipe';
- Line 77: `const stat = await fs.promises.stat(themePath);`
  - Type: fs-promises-method-call (critical)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName
- Line 156: `const packageJson = JSON.parse(await fs.promises.readFile(packageJsonPath, 'utf8...`
  - Type: fs-promises-method-call (critical)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName
- Line 250: `await fs.promises.mkdir(reportPath, { recursive: true });`
  - Type: fs-promises-method-call (critical)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName
- Line 253: `await fs.promises.writeFile(reportFile, JSON.stringify(results, null, 2));`
  - Type: fs-promises-method-call (critical)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName
- ... and 3 more violations

#### scripts/test-portal-aidev.js

- Line 7: `const path = require('path');`
  - Type: path-require (low)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead

#### scripts/verify-single-file.js

- Line 3: `const path = require('path');`
  - Type: path-require (low)
  - Recommendation: Use auditedFS from 'infra_external-log-lib/pipe' instead

## Critical Violations (Immediate Action Required)

- **examples/example.ts:67**
  - Code: `await fs.mkdir(testDir, { recursive: true });`
  - Method: mkdir
  - Fix: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName

- **examples/example.ts:70**
  - Code: `await fs.writeFile(`
  - Method: writeFile
  - Fix: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName

- **examples/example.ts:98**
  - Code: `await fs.writeFile(`
  - Method: writeFile
  - Fix: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName

- **examples/example.ts:125**
  - Code: `await fs.writeFile(`
  - Method: writeFile
  - Fix: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName

- **examples/example.ts:145**
  - Code: `await fs.writeFile(`
  - Method: writeFile
  - Fix: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName

- **examples/example.ts:183**
  - Code: `await fs.writeFile(`
  - Method: writeFile
  - Fix: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName

- **external/FileSystemWrapper.ts:35**
  - Code: `const content = await fs.readFile(absolutePath, encoding);`
  - Method: readFile
  - Fix: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName

- **external/FileSystemWrapper.ts:54**
  - Code: `await fs.mkdir(path.dirname(absolutePath), { recursive: true });`
  - Method: mkdir
  - Fix: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName

- **external/FileSystemWrapper.ts:55**
  - Code: `await fs.writeFile(absolutePath, content, encoding);`
  - Method: writeFile
  - Fix: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName

- **external/FileSystemWrapper.ts:73**
  - Code: `const files = await fs.readdir(absolutePath);`
  - Method: readdir
  - Fix: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName

- **external/FileSystemWrapper.ts:89**
  - Code: `return await fs.stat(absolutePath);`
  - Method: stat
  - Fix: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName

- **external/FileSystemWrapper.ts:101**
  - Code: `await fs.access(absolutePath);`
  - Method: access
  - Fix: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName

- **scripts/check-all-themes-comprehensive.ts:80**
  - Code: `const entries = fs.readdirSync(this.themesPath, { withFileTypes: true });`
  - Method: readdirSync
  - Fix: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName

- **scripts/check-all-themes-comprehensive.ts:99**
  - Code: `const entries = fs.readdirSync(dir, { withFileTypes: true });`
  - Method: readdirSync
  - Fix: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName

- **scripts/check-all-themes-comprehensive.ts:143**
  - Code: `const content = fs.readFileSync(file, 'utf-8');`
  - Method: readFileSync
  - Fix: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName

- **scripts/check-all-themes-comprehensive.ts:156**
  - Code: `const content = fs.readFileSync(file, 'utf-8');`
  - Method: readFileSync
  - Fix: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName

- **scripts/check-all-themes-comprehensive.ts:192**
  - Code: `const content = fs.readFileSync(file, 'utf-8');`
  - Method: readFileSync
  - Fix: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName

- **scripts/check-all-themes-comprehensive.ts:206**
  - Code: `const content = fs.readFileSync(file, 'utf-8');`
  - Method: readFileSync
  - Fix: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName

- **scripts/check-all-themes-comprehensive.ts:397**
  - Code: `fs.mkdirSync(reportDir, { recursive: true });`
  - Method: mkdirSync
  - Fix: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName

- **scripts/check-all-themes-comprehensive.ts:402**
  - Code: `fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));`
  - Method: writeFileSync
  - Fix: Use auditedFS from 'infra_external-log-lib/pipe' instead. Replace fs.methodName with auditedFS.methodName

... and 93 more critical violations

## Recommendations

1. **Replace all direct fs imports** with `auditedFS` from `infra_external-log-lib/pipe`
2. **Update all file operations** to use the audited methods
3. **Test files** may keep direct access but should document why
4. **Shell commands** should be replaced with programmatic file operations
5. **Child processes** accessing files should be reviewed for audit requirements

## Migration Guide

### Before (Direct Access):
```typescript
import * as fs from 'fs';
const data = fs.readFileSync('file.txt', 'utf8');
fs.writeFileSync('output.txt', data);
```

### After (Audited Access):
```typescript
import { auditedFS } from '../../infra_external-log-lib/pipe';
const data = await auditedFS.readFile('file.txt', 'utf8');
await auditedFS.writeFile('output.txt', data);
```

## Next Steps

⚠️ **URGENT**: Fix all critical violations immediately
🔶 **HIGH PRIORITY**: Address high severity violations
📋 Review and update all themes to use audited file access
✅ Enable file access auditing in production
