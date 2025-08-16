# Runnable Comments for Story Report Validation

This feature provides runnable comments for validating story reports against test coverage criteria, including fraud detection.

## Adding New Runnable Comment Types

**IMPORTANT**: Do not modify RunnableCommentProcessor.ts to add new comment types. Instead:

1. Create a new script in `scripts/runnable/` directory
2. Name it: `runnable-{comment-type}.js`
3. The script receives parameters as command line arguments
4. Return appropriate exit codes (0 for success, non-zero for failure)

Example: For `<!-- runnable:generate-test-manual:input.ts,output.md -->`
- Create: `scripts/runnable/runnable-generate-test-manual.js`
- Called as: `node scripts/runnable/runnable-generate-test-manual.js "input.ts" "output.md"`

## Features

1. **Story Report Validation** - Validate coverage metrics and fraud checks
2. **Retrospect Verification** - Ensure retrospect documents are complete
3. **Queue Item Validation** - Validate task queue items meet requirements
4. **Task Queue Integration** - Automatic validation during queue operations

## Usage

### 1. Story Report Validation

Validates a story report JSON file against coverage criteria:

```markdown
<!-- runnable:validate-story-report:path/to/report.json,95,95,10,90 -->
```

Parameters:
- Report path
- System test class coverage threshold (%)
- Branch coverage threshold (%)
- Maximum duplication (%)
- Minimum fraud check score

Example:
```markdown
### **Retrospective Queue**
- Retrospect for user story 001
<!-- runnable:validate-story-report:gen/reports/story-report-001.json,95,95,10,90 -->
```

### 2. Retrospect Verification

Verifies retrospect documents contain required sections:

```markdown
<!-- runnable:verify-retrospect:user-story-path,retrospect-file-path -->
```

Required sections:
- Lessons Learned
- Rule Suggestions
- Know-How Updates

Example:
```markdown
<!-- runnable:verify-retrospect:user-stories/001-login,gen/history/retrospect/001-login.md -->
```

### 3. Queue Item Validation

Validates queue items meet specific requirements:

```markdown
<!-- runnable:validate-queue-item:queue-type,item-description -->
```

Queue types and requirements:
- `system-test` - Must reference environment, external, and integration tests
- `scenario` - Must reference research files
- `user-story` - Must be registered in NAME_ID.vf.json

Examples:
```markdown
<!-- runnable:validate-queue-item:system-test,System test for login (env, ext, int tests included) -->
<!-- runnable:validate-queue-item:scenario,Scenario: Login flow - research/domain/auth.md -->
<!-- runnable:validate-queue-item:user-story,001-login-story registered in NAME_ID -->
```

## API Usage

### TypeScript

```typescript
import { RunnableComments, createStoryReportValidator, createRunnableCommentProcessor } from '@aidev/filesystem-mcp';

// Create validators
const validator = createStoryReportValidator();
const processor = createRunnableCommentProcessor();

// Generate runnable comments
const comment = RunnableComments.storyReportValidation(
  'path/to/report.json',
  95, // class coverage
  95, // branch coverage
  10, // max duplication
  90  // min fraud score
);

// Validate story report
const result = await validator.validate('path/to/report.json', {
  systemTestClassCoverage: 95,
  branchCoverage: 95,
  duplication: 10,
  fraudCheckMinScore: 90
});

if (!result.passed) {
  console.log('Validation failed:', result.errors);
  console.log('Suggestions:', result.suggestions);
  
  if (result.retrospectStep?.required) {
    console.log('Retrospect required:', result.retrospectStep.message);
  }
}

// Process runnable comments in a file
const results = await processor.processFile('TASK_QUEUE.md');
results.forEach(result => {
  console.log(`${result.type}: ${result.success ? 'PASSED' : 'FAILED'} - ${result.message}`);
});
```

### Task Queue Integration

```typescript
import { TaskQueueRunnableExtension } from '@aidev/filesystem-mcp';

const taskQueue = new TaskQueueRunnableExtension();

// Validate queue item before insertion
const validation = await taskQueue.validateQueueItem(
  'system-test',
  'System test for authentication flow'
);

if (!validation.valid) {
  console.log('Errors:', validation.errors);
  console.log('Suggestions:', validation.suggestions);
}

// Execute steps after popping from queue
const stepResult = await taskQueue.executeQueueSteps(
  'retrospective',
  'after_pop',
  'Retrospect for story-001',
  { 
    reportPath: 'story-report.json',
    executionCount: 1 
  }
);

console.log('Messages:', stepResult.messages);
```

## Fraud Detection

The fraud checker detects:

1. **Skipped Tests** - Tests marked as skipped
2. **High Skip Ratio** - More than 20% of tests skipped
3. **Coverage Manipulation** - High coverage with very few tests
4. **Test Patterns** - Suspicious test patterns

Fraud scoring:
- 100: No issues detected
- 90-99: Minor issues
- 70-89: Moderate issues  
- <70: Significant issues

## Validation Criteria

### Default Thresholds

- System Test Class Coverage: 95%
- Branch Coverage: 95%
- Code Duplication: ≤10%
- Fraud Check Score: ≥90

### Custom Criteria

You can specify custom criteria when creating runnable comments:

```markdown
<!-- runnable:validate-story-report:report.json,98,98,5,95 -->
```

This sets:
- Class coverage: 98%
- Branch coverage: 98%
- Max duplication: 5%
- Min fraud score: 95

## Integration with TASK_QUEUE.md

Add runnable comments to your task queue for automatic validation:

```markdown
### **Retrospective Queue**
- Retrospect for feature X
  <!-- runnable:validate-story-report:reports/feature-x.json,95,95,10,90 -->
- Retrospect for feature Y
  <!-- runnable:verify-retrospect:stories/feature-y,gen/retrospect/y.md -->

### **System Tests Implement Queue**
- System test for login flow (env, ext, int tests)
  <!-- runnable:validate-queue-item:system-test,System test for login flow (env, ext, int tests) -->
```

The validation will run automatically when items are processed from the queue.