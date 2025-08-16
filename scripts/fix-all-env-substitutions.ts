#!/usr/bin/env bun

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

interface FixPattern {
  pattern: RegExp;
  replacement: string | ((match: string, ...args: any[]) => string);
  description: string;
}

const patterns: FixPattern[] = [
  // Fix async/await issues
  {
    pattern: /async\s+super\(\)/g,
    replacement: 'super()',
    description: 'Remove async from super() calls'
  },
  {
    pattern: /async\s+return\s+/g,
    replacement: 'return ',
    description: 'Remove async from return statements'
  },
  {
    pattern: /async\s+setTimeout/g,
    replacement: 'setTimeout',
    description: 'Remove async from setTimeout calls'
  },
  {
    pattern: /async\s+private\s+/g,
    replacement: 'private async ',
    description: 'Fix async private method declarations'
  },
  
  // Fix incorrect string literals
  {
    pattern: /:\s*"critical"/g,
    replacement: ': "critical"',
    description: 'Fix critical string literal'
  },
  {
    pattern: /:\s*"acknowledged"/g,
    replacement: ': "acknowledged"',
    description: 'Fix acknowledged string literal'
  },
  {
    pattern: /:\s*"resolved"/g,
    replacement: ': "resolved"',
    description: 'Fix resolved string literal'
  },
  {
    pattern: /:\s*"suppressed"/g,
    replacement: ': "suppressed"',
    description: 'Fix suppressed string literal'
  },
  {
    pattern: /:\s*"documentation"/g,
    replacement: ': "documentation"',
    description: 'Fix documentation string literal'
  },
  {
    pattern: /:\s*"markdown"/g,
    replacement: ': "markdown"',
    description: 'Fix markdown string literal'
  },
  {
    pattern: /:\s*"moderate"/g,
    replacement: ': "moderate"',
    description: 'Fix moderate string literal'
  },
  {
    pattern: /:\s*"significant"/g,
    replacement: ': "significant"',
    description: 'Fix significant string literal'
  },
  {
    pattern: /:\s*"improving"/g,
    replacement: ': "improving"',
    description: 'Fix improving string literal'
  },
  {
    pattern: /:\s*"declining"/g,
    replacement: ': "declining"',
    description: 'Fix declining string literal'
  },
  {
    pattern: /:\s*"critical"/g,
    replacement: ': "critical"',
    description: 'Fix critical string literal'
  },
  {
    pattern: /:\s*"comprehensive"/g,
    replacement: ': "comprehensive"',
    description: 'Fix comprehensive string literal'
  },
  {
    pattern: /:\s*"pagerduty"/g,
    replacement: ': "pagerduty"',
    description: 'Fix pagerduty string literal'
  },
  {
    pattern: /:\s*"approved"/g,
    replacement: ': "approved"',
    description: 'Fix approved string literal'
  },
  {
    pattern: /:\s*"deployed"/g,
    replacement: ': "deployed"',
    description: 'Fix deployed string literal'
  },
  {
    pattern: /:\s*"deprecated"/g,
    replacement: ': "deprecated"',
    description: 'Fix deprecated string literal'
  },
  {
    pattern: /:\s*"archived"/g,
    replacement: ': "archived"',
    description: 'Fix archived string literal'
  },
  
  // Fix array/object literals
  {
    pattern: /tags:\s*\["application"/g,
    replacement: 'tags: ["application"',
    description: 'Fix application tag array'
  },
  {
    pattern: /tags:\s*\['system',\s*"performance"\]/g,
    replacement: 'tags: [\'system\', "performance"]',
    description: 'Fix performance tag array'
  },
  {
    pattern: /tags:\s*\['system',\s*"critical"\]/g,
    replacement: 'tags: [\'system\', "critical"]',
    description: 'Fix critical tag array'
  },
  {
    pattern: /tags:\s*\['service',\s*"critical"\]/g,
    replacement: 'tags: [\'service\', "critical"]',
    description: 'Fix service critical tag array'
  },
  
  // Fix incorrect async patterns
  {
    pattern: /await fileAPI\.createDirectory/g,
    replacement: (match) => {
      // Check if it's already in an async context
      return 'fs.mkdirSync';
    },
    description: 'Fix await on non-async fileAPI calls'
  },
  
  // Fix incorrect object property values
  {
    pattern: /type:\s*FileType\.TEMPORARY/g,
    replacement: '',
    description: 'Remove incorrect FileType.TEMPORARY usage'
  },
  
  // Fix broken JSON.stringify calls
  {
    pattern: /JSON\.stringify\(([^,]+),\s*{\s*type:\s*FileType\.[^}]+\s*}\)/g,
    replacement: 'JSON.stringify($1, null, 2)',
    description: 'Fix JSON.stringify with incorrect options'
  },
  
  // Fix Date.now() calls with extra parameters
  {
    pattern: /Date\.now\(\),\s*{\s*type:\s*FileType\.[^}]+\s*}/g,
    replacement: 'Date.now()',
    description: 'Fix Date.now() calls'
  },
  
  // Fix other broken patterns
  {
    pattern: /new Date\(\)\.toISOString\(\),\s*{\s*type:\s*FileType\.[^}]+\s*}\.toISOString\(\)/g,
    replacement: 'new Date().toISOString()',
    description: 'Fix Date.toISOString() calls'
  }
];

async function fixFile(filePath: string): Promise<boolean> {
  try {
    let content = await fs.promises.readFile(filePath, 'utf-8');
    const originalContent = content;
    let changeCount = 0;

    for (const { pattern, replacement, description } of patterns) {
      const matches = content.match(pattern);
      if (matches) {
        if (typeof replacement === 'string') {
          content = content.replace(pattern, replacement);
        } else {
          content = content.replace(pattern, replacement);
        }
        changeCount += matches.length;
        console.log(`  - Fixed ${matches.length} occurrences: ${description}`);
      }
    }

    // Additional complex fixes
    // Fix broken metadata assignments
    content = content.replace(
      /const metadata: ArtifactMetadata = {\s*id: artifactId,\s*{\s*type: FileType\.\w+\s*}\.toISOString\(\)/g,
      'const metadata: ArtifactMetadata = {\n      id: artifactId,\n      type: request.type,\n      path: filePath,\n      created_at: new Date().toISOString()'
    );

    // Fix broken file write calls
    content = content.replace(
      /await fileAPI\.createFile\(([^,]+),\s*([^,]+),\s*{\s*type:\s*FileType\.\w+\s*}\)/g,
      'await fs.promises.writeFile($1, $2)'
    );

    // Fix fs.existsSync with await
    content = content.replace(
      /if\s*\(!fs\.existsSync\(([^)]+)\)\)\s*{\s*await/g,
      'if (!fs.existsSync($1)) {\n      fs.mkdirSync($1, { recursive: true });\n    }'
    );

    if (content !== originalContent) {
      await fs.promises.writeFile(filePath, content, 'utf-8');
      console.log(`✅ Fixed ${filePath}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error);
    return false;
  }
}

async function main() {
  console.log('🔍 Searching for files with syntax errors...\n');

  const patterns = [
    'layer/**/*.ts',
    'layer/**/*.tsx',
    'scripts/**/*.ts',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/build/**'
  ];

  const files = await glob(patterns, {
    ignore: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/*.d.ts']
  });

  console.log(`Found ${files.length} TypeScript files to check\n`);

  let fixedCount = 0;
  const problematicFiles: string[] = [];

  // Focus on files we know have issues
  const priorityFiles = [
    'layer/epics/infra/monitoring-dashboard/src/alerts/alert-manager.ts',
    'layer/themes/infra_filesystem-mcp/children/ArtifactManager.ts',
    'layer/themes/infra_fraud-checker/scripts/run-fraud-check.ts',
    'layer/themes/check_hea-architecture/children/reporter/index.ts',
    'layer/themes/check_hea-architecture/children/fixer/index.ts'
  ];

  // Fix priority files first
  for (const file of priorityFiles) {
    const fullPath = path.join(process.cwd(), file);
    if (fs.existsSync(fullPath)) {
      console.log(`Processing priority file: ${file}`);
      if (await fixFile(fullPath)) {
        fixedCount++;
      }
    }
  }

  // Then fix all other files
  for (const file of files) {
    if (!priorityFiles.some(pf => file.endsWith(pf))) {
      const fixed = await fixFile(file);
      if (fixed) {
        fixedCount++;
      }
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`\n✨ Fixed ${fixedCount} files`);
  
  if (problematicFiles.length > 0) {
    console.log('\n⚠️ Files that may need manual review:');
    problematicFiles.forEach(f => console.log(`  - ${f}`));
  }
}

main().catch(console.error);