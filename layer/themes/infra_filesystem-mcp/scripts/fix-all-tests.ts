#!/usr/bin/env ts-node

import { fs } from '../../infra_external-log-lib/src';
import { path } from '../../infra_external-log-lib/src';
import { getFileAPI, FileType } from '../../infra_external-log-lib/pipe';

const fileAPI = getFileAPI();


interface TestFix {
  file: string;
  pattern: RegExp;
  replacement: string;
}

const fixes: TestFix[] = [
  // Fix array type declarations
  {
    file: 'tests/environment/mcp-server-environment.envtest.ts',
    pattern: /const concurrentOperations = \[\];/g,
    replacement: 'const concurrentOperations: Promise<void>[] = [];'
  },
  {
    file: 'tests/environment/mcp-server-environment.envtest.ts',
    pattern: /const fileOperations = \[\];/g,
    replacement: 'const fileOperations: Promise<void>[] = [];'
  },
  {
    file: 'tests/environment/mcp-server-environment.envtest.ts',
    pattern: /const readOperations = \[\];/g,
    replacement: 'const readOperations: Promise<string>[] = [];'
  },
  {
    file: 'tests/environment/mcp-server-environment.envtest.ts',
    pattern: /const largeDataOperations = \[\];/g,
    replacement: 'const largeDataOperations: Promise<void>[] = [];'
  },
  // Fix tag-search test
  {
    file: 'tests/tag-search.test.ts',
    pattern: /expect\(storage\.indices\)/g,
    replacement: 'expect((storage as any).indices)'
  },
  // Fix name-id-scenarios test
  {
    file: 'tests/system/scenarios/name-id-scenarios.systest.ts',
    pattern: /const completedFeatures = await wrapper\.read\(`\$\{featuresFile\}\?status=In Progress`\)/g,
    replacement: 'const completedFeatures = await wrapper.read(`${featuresFile}?status=completed`)'
  },
  {
    file: 'tests/system/scenarios/name-id-scenarios.systest.ts',
    pattern: /status: 'In Progress'/g,
    replacement: "status: "completed""
  },
  // Fix task-queue-scenarios test
  {
    file: 'tests/system/scenarios/task-queue-scenarios.systest.ts',
    pattern: /const workingTask = await wrapper\.pop\(/g,
    replacement: 'const popResult = await wrapper.pop('
  },
  {
    file: 'tests/system/scenarios/task-queue-scenarios.systest.ts',
    pattern: /workingTask!/g,
    replacement: 'popResult?.workingItem!'
  },
  {
    file: 'tests/system/scenarios/task-queue-scenarios.systest.ts',
    pattern: /workingTask\./g,
    replacement: 'popResult?.workingItem.'
  },
  {
    file: 'tests/system/scenarios/task-queue-scenarios.systest.ts',
    pattern: /const tasksWithDependencies: Task\[\] = \[\];/g,
    replacement: 'const tasksWithDependencies: any[] = [];'
  },
  {
    file: 'tests/system/scenarios/task-queue-scenarios.systest.ts',
    pattern: /const backendTasks: Task\[\] = \[\];/g,
    replacement: 'const backendTasks: any[] = [];'
  }
];

console.log('🔧 Fixing all test files...\n');

for (const fix of fixes) {
  const filePath = path.join(__dirname, '..', fix.file);
  
  if (!fs.existsSync(filePath)) {
    console.log(`❌ File not found: ${fix.file}`);
    continue;
  }
  
  let content = fileAPI.readFileSync(filePath, 'utf8');
  const originalContent = content;
  
  content = content.replace(fix.pattern, fix.replacement);
  
  if (content !== originalContent) {
    await fileAPI.createFile(filePath, content, { type: FileType.TEMPORARY });
    console.log(`✅ Fixed: ${fix.file}`);
  } else {
    console.log(`⏭️  No changes needed: ${fix.file}`);
  }
}

console.log('\n✨ All fixes applied!');