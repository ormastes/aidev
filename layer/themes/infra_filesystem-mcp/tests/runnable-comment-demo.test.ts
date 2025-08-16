/**
 * Test Suite: Runnable Comment Demo
 * 
 * Demonstrates various runnable comment scenarios and use cases
 */

import { RunnableCommentExecutor } from '../children/RunnableCommentExecutor';
import { CommentTaskExecutor } from '../children/CommentTaskExecutor';
import { fs } from '../../infra_external-log-lib/src';
import { path } from '../../infra_external-log-lib/src';

describe('Runnable Comment Demo Tests', () => {
  const testDir = path.join(__dirname, 'test-runnable-demo');
  const stepsDir = path.join(testDir, 'steps');
  
  let runnableExecutor: RunnableCommentExecutor;
  let commentExecutor: CommentTaskExecutor;

  beforeEach(async () => {
    // Create test directories
    await fs.promises.mkdir(stepsDir, { recursive: true });
    
    // Initialize executors
    runnableExecutor = new RunnableCommentExecutor(stepsDir);
    commentExecutor = CommentTaskExecutor.createWithCommentSupport(testDir);
    
    // Create mock step scripts
    await createMockSteps();
  });

  afterEach(async () => {
    // Clean up
    await fs.promises.rm(testDir, { recursive: true, force: true });
  });

  async function createMockSteps() {
    // Create a mock step for "write a <file>"
    const writeFileScript = `#!/usr/bin/env node
const { fs } = require('../../infra_external-log-lib/src');
const { path } = require('../../infra_external-log-lib/src');

const fileName = process.argv[2] || 'output.txt';
const content = process.argv[3] || 'Generated content';

fs.writeFileSync(path.join(process.cwd(), fileName), content);
console.log(\`Created file: \${fileName}\`);
`;
    await fs.promises.writeFile(
      path.join(stepsDir, 'write_a__file_.js'),
      writeFileScript,
      { mode: 0o755 }
    );

    // Create a mock step for "check <artifact>"
    const checkArtifactScript = `#!/usr/bin/env node
const artifactName = process.argv[2];

if (!artifactName) {
  console.error('Error: No artifact name provided');
  process.exit(1);
}

// Mock validation logic
const validArtifacts = ['user-data', 'config-file', 'test-result'];
if (validArtifacts.includes(artifactName)) {
  console.log(\`Artifact '\${artifactName}' is valid\`);
  process.exit(0);
} else {
  console.error(\`Artifact '\${artifactName}' not found\`);
  process.exit(1);
}
`;
    await fs.promises.writeFile(
      path.join(stepsDir, 'check__artifact_.js'),
      checkArtifactScript,
      { mode: 0o755 }
    );

    // Create a mock step for "validate <entity> dependencies"
    const validateDepsScript = `#!/usr/bin/env node
const entityName = process.argv[2];

// Mock dependency check
const dependencies = {
  'user-service': ["database", 'cache'],
  'auth-service': ["database", 'token-service'],
  'api-gateway': ['auth-service', 'user-service']
};

const deps = dependencies[entityName];
if (deps) {
  console.log(\`Entity '\${entityName}' has dependencies: \${deps.join(', ')}\`);
  process.exit(0);
} else {
  console.error(\`Unknown entity: \${entityName}\`);
  process.exit(1);
}
`;
    await fs.promises.writeFile(
      path.join(stepsDir, 'validate__entity__dependencies.js'),
      validateDepsScript,
      { mode: 0o755 }
    );
  }

  describe('Basic Runnable Comment Execution', () => {
    it('should execute "write a <file>" comment', async () => {
      const comment = {
        text: 'write a <file>',
        parameters: ['test-output.txt', 'Hello from runnable comment!']
      };
      
      const result = await runnableExecutor.execute(comment);
      
      expect(result.success).toBe(true);
      expect(result.output).toContain('Created file: test-output.txt');
      
      // Verify file was created
      const filePath = path.join(testDir, 'test-output.txt');
      const fileExists = await fs.promises.access(filePath).then(() => true).catch(() => false);
      expect(fileExists).toBe(true);
      
      if (fileExists) {
        const content = await fs.promises.readFile(filePath, 'utf-8');
        expect(content).toBe('Hello from runnable comment!');
      }
    });

    it('should handle failed comment execution', async () => {
      const comment = {
        text: 'check <artifact>',
        parameters: ['non-existent-artifact']
      };
      
      const result = await runnableExecutor.execute(comment);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('non-existent-artifact');
    });

    it('should execute parameterized comments correctly', async () => {
      const comment = {
        text: 'validate <entity> dependencies',
        parameters: ['api-gateway']
      };
      
      const result = await runnableExecutor.execute(comment);
      
      expect(result.success).toBe(true);
      expect(result.output).toContain('auth-service');
      expect(result.output).toContain('user-service');
    });
  });

  describe('Script Name Conversion', () => {
    it('should convert comment text to valid script names', () => {
      const testCases = [
        {
          input: 'write a <file>',
          expected: 'write_a__file_.js'
        },
        {
          input: 'check <system-test> requirements',
          expected: 'check__system_test__requirements.js'
        },
        {
          input: 'validate user@email.com format',
          expected: 'validate_user_email_com_format.js'
        },
        {
          input: 'process data & generate report',
          expected: 'process_data___generate_report.js'
        }
      ];
      
      testCases.forEach(({ input, expected }) => {
        const result = runnableExecutor.textToScriptName(input);
        expect(result).toBe(expected);
      });
    });
  });

  describe('Script Discovery', () => {
    it('should find existing scripts', () => {
      const script = runnableExecutor.findScript('write a <file>');
      expect(script).toBeTruthy();
      expect(script).toContain('write_a__file_.js');
    });

    it('should return null for non-existent scripts', () => {
      const script = runnableExecutor.findScript('non existent command');
      expect(script).toBeNull();
    });
  });

  describe('Comment Task Executor Integration', () => {
    it('should integrate with CommentTaskExecutor', async () => {
      // Register a custom function
      commentExecutor.registerFunction("customCheck", async (param: string) => {
        return { 
          success: true, 
          message: `Custom check passed for: ${param}` 
        };
      });
      
      // Execute using the registered function
      const executor = commentExecutor.getExecutor();
      const task = {
        id: 'test-001',
        type: "runnable",
        content: 'Execute custom check',
        runnable: {
          type: "function",
          function: "customCheck",
          args: ['test-parameter']
        }
      };
      
      const result = await executor(task);
      expect(result.result.success).toBe(true);
      expect(result.result.message).toContain('test-parameter');
    });
  });

  describe('Real-world Scenarios', () => {
    it('should handle complex workflow with multiple steps', async () => {
      // Create additional mock steps for workflow
      const createEntityScript = `#!/usr/bin/env node
const entityName = process.argv[2];
const entityType = process.argv[3] || 'service';

console.log(\`Creating \${entityType}: \${entityName}\`);
// Mock entity creation
const { fs } = require('../../infra_external-log-lib/src');
const entityData = {
  id: \`\${entityType}-\${Date.now()}\`,
  name: entityName,
  type: entityType,
  created_at: new Date().toISOString()
};

fs.writeFileSync(\`\${entityName}.entity.json\`, JSON.stringify(entityData, null, 2));
console.log(\`Entity created: \${entityName}\`);
`;
      await fs.promises.writeFile(
        path.join(stepsDir, 'create__entity__as__type_.js'),
        createEntityScript,
        { mode: 0o755 }
      );

      // Execute workflow
      const workflow = [
        {
          text: 'create <entity> as <type>',
          parameters: ['payment-service', "microservice"]
        },
        {
          text: 'validate <entity> dependencies',
          parameters: ['auth-service']
        },
        {
          text: 'write a <file>',
          parameters: ['workflow-result.txt', 'Workflow completed successfully']
        }
      ];
      
      const results = [];
      for (const step of workflow) {
        const result = await runnableExecutor.execute(step.text, step.parameters);
        results.push(result);
      }
      
      // All steps should succeed
      expect(results.every(r => r.success)).toBe(true);
      
      // Verify entity was created
      const entityFile = path.join(testDir, 'payment-service.entity.json');
      const entityExists = await fs.promises.access(entityFile).then(() => true).catch(() => false);
      expect(entityExists).toBe(true);
    });

    it('should handle conditional execution based on previous results', async () => {
      // Create a conditional step script
      const conditionalScript = `#!/usr/bin/env node
const condition = process.argv[2];
const action = process.argv[3];

if (condition === 'artifact-exists') {
  console.log(\`Condition met: executing \${action}\`);
  process.exit(0);
} else {
  console.error(\`Condition not met: \${condition}\`);
  process.exit(1);
}
`;
      await fs.promises.writeFile(
        path.join(stepsDir, 'if__condition__then__action_.js'),
        conditionalScript,
        { mode: 0o755 }
      );

      // Test conditional execution
      const checkResult = await runnableExecutor.execute('check <artifact>', ['user-data']);
      
      if (checkResult.success) {
        const conditionalResult = await runnableExecutor.execute(
          'if <condition> then <action>',
          ['artifact-exists', 'process-data']
        );
        expect(conditionalResult.success).toBe(true);
        expect(conditionalResult.output).toContain('executing process-data');
      }
    });
  });
});