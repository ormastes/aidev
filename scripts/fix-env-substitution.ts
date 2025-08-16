#!/usr/bin/env bun

/**
 * Fix incorrect environment variable substitutions in the codebase
 * These were likely introduced by an automated security scan/fix
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

const patterns = [
  // Fix incorrect process.env.SECRET substitutions
  {
    pattern: /process\.env\.SECRET \|\| "([^"]+)"/g,
    replacement: '"$1"'
  },
  {
    pattern: /process\.env\.PASSWORD \|\| "([^"]+)"/g,
    replacement: '"$1"'
  },
  {
    pattern: /process\.env\.SECRET \|\| '([^']+)'/g,
    replacement: "'$1'"
  },
  {
    pattern: /process\.env\.PASSWORD \|\| '([^']+)'/g,
    replacement: "'$1'"
  },
  // Fix in type definitions and interfaces
  {
    pattern: /'active' \| process\.env\.SECRET \|\| "([^"]+)"/g,
    replacement: "'active' | '$1'"
  },
  {
    pattern: /process\.env\.SECRET \|\| "([^"]+)" \|/g,
    replacement: '"$1" |'
  },
  // Fix in import statements
  {
    pattern: /from process\.env\.SECRET \|\| "([^"]+)"/g,
    replacement: 'from "$1"'
  },
  // Fix in object keys
  {
    pattern: /(\s+)process\.env\.SECRET \|\| "([^"]+)":/g,
    replacement: '$1"$2":'
  },
  // Fix in JSX/HTML attributes
  {
    pattern: /className=process\.env\.SECRET \|\| "([^"]+)"/g,
    replacement: 'className="$1"'
  },
  {
    pattern: /class=process\.env\.SECRET \|\| "([^"]+)"/g,
    replacement: 'class="$1"'
  },
  {
    pattern: /name=process\.env\.SECRET \|\| "([^"]+)"/g,
    replacement: 'name="$1"'
  },
  {
    pattern: /type=process\.env\.SECRET \|\| "([^"]+)"/g,
    replacement: 'type="$1"'
  },
  {
    pattern: /placeholder=process\.env\.SECRET \|\| "([^"]+)"/g,
    replacement: 'placeholder="$1"'
  },
  // Fix typescript imports
  {
    pattern: /import \* as (\w+) from process\.env\.SECRET \|\| "([^"]+)"/g,
    replacement: 'import * as $1 from "$2"'
  },
  // Fix require statements
  {
    pattern: /require\(process\.env\.SECRET \|\| "([^"]+)"\)/g,
    replacement: 'require("$1")'
  }
];

async function fixFile(filePath: string): Promise<boolean> {
  try {
    let content = await fs.promises.readFile(filePath, 'utf-8');
    let modified = false;
    
    for (const { pattern, replacement } of patterns) {
      const matches = content.match(pattern);
      if (matches) {
        content = content.replace(pattern, replacement);
        modified = true;
        console.log(`  Fixed ${matches.length} occurrences in ${path.relative(process.cwd(), filePath)}`);
      }
    }
    
    if (modified) {
      await fs.promises.writeFile(filePath, content, 'utf-8');
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error);
    return false;
  }
}

async function main() {
  console.log('🔧 Fixing environment variable substitution issues...\n');
  
  const files = await glob('**/*.{ts,tsx,js,jsx}', {
    cwd: process.cwd(),
    absolute: true,
    ignore: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.git/**',
      '**/.jj/**',
      '**/coverage/**'
    ]
  });
  
  console.log(`Found ${files.length} files to check\n`);
  
  let fixedCount = 0;
  for (const file of files) {
    if (await fixFile(file)) {
      fixedCount++;
    }
  }
  
  console.log(`\n✅ Fixed ${fixedCount} files`);
  
  // Also fix specific known problematic files
  const knownProblematicFiles = [
    'layer/themes/infra_filesystem-mcp/children/ArtifactManager.ts',
    'layer/themes/portal_gui-selector/tests/e2e/gui-selection-real.test.ts',
    'layer/themes/portal_security/tests/integration/auth-real.itest.ts',
    'layer/epics/infra/monitoring-dashboard/src/alerts/alert-manager.ts',
    'layer/themes/check_hea-architecture/children/fixer/index.ts',
    'layer/themes/check_hea-architecture/children/reporter/index.ts',
    'layer/themes/infra_fraud-checker/scripts/run-fraud-check.ts',
    'demo/vscode-extension-cdoctest/test/e2e/python-integration-complete.test.ts',
    'demo/vscode-extension-cdoctest/test/e2e/test-execution-engine-complete.test.ts'
  ];
  
  console.log('\n🔧 Fixing known problematic files...');
  for (const file of knownProblematicFiles) {
    const fullPath = path.join(process.cwd(), file);
    if (fs.existsSync(fullPath)) {
      if (await fixFile(fullPath)) {
        console.log(`  ✅ Fixed: ${file}`);
      }
    }
  }
  
  console.log('\n✨ Environment variable substitution fixes complete!');
}

main().catch(console.error);