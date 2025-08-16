#!/usr/bin/env bun
/**
 * Script to migrate all direct Node.js module imports to use external-log-lib
 * This ensures all external calls go through our interception layer
 */

import { fs } from '../layer/themes/infra_external-log-lib/dist';
import { path } from '../layer/themes/infra_external-log-lib/dist';
import * as glob from 'glob';

const THEMES_DIR = path.join(__dirname, '../layer/themes');
const EXTERNAL_LOG_LIB = 'infra_external-log-lib';

// Patterns to replace
const IMPORT_PATTERNS = [
  // fs imports
  {
    pattern: /^import \* as fs from ['"]fs['"];?$/gm,
    replacement: "import { fs } from '../infra_external-log-lib/src';"
  },
  {
    pattern: /^import fs from ['"]fs['"];?$/gm,
    replacement: "import { fs } from '../infra_external-log-lib/src';"
  },
  {
    pattern: /^const fs = require\(['"]fs['"]\);?$/gm,
    replacement: "const { fs } = require('../infra_external-log-lib/src');"
  },
  
  // fs/promises imports
  {
    pattern: /^import \* as fsPromises from ['"]fs\/promises['"];?$/gm,
    replacement: "import { fsPromises } from '../infra_external-log-lib/src';"
  },
  {
    pattern: /^import fs from ['"]fs\/promises['"];?$/gm,
    replacement: "import { fsPromises as fs } from '../infra_external-log-lib/src';"
  },
  
  // path imports
  {
    pattern: /^import \* as path from ['"]path['"];?$/gm,
    replacement: "import { path } from '../infra_external-log-lib/src';"
  },
  {
    pattern: /^import path from ['"]path['"];?$/gm,
    replacement: "import { path } from '../infra_external-log-lib/src';"
  },
  {
    pattern: /^const path = require\(['"]path['"]\);?$/gm,
    replacement: "const { path } = require('../infra_external-log-lib/src');"
  },
  
  // child_process imports
  {
    pattern: /^import \* as childProcess from ['"]child_process['"];?$/gm,
    replacement: "import { childProcess } from '../infra_external-log-lib/src';"
  },
  {
    pattern: /^import \* as cp from ['"]child_process['"];?$/gm,
    replacement: "import { childProcess as cp } from '../infra_external-log-lib/src';"
  },
  {
    pattern: /^const childProcess = require\(['"]child_process['"]\);?$/gm,
    replacement: "const { childProcess } = require('../infra_external-log-lib/src');"
  },
  
  // http imports
  {
    pattern: /^import \* as http from ['"]http['"];?$/gm,
    replacement: "import { http } from '../infra_external-log-lib/src';"
  },
  {
    pattern: /^import http from ['"]http['"];?$/gm,
    replacement: "import { http } from '../infra_external-log-lib/src';"
  },
  {
    pattern: /^const http = require\(['"]http['"]\);?$/gm,
    replacement: "const { http } = require('../infra_external-log-lib/src');"
  },
  
  // https imports
  {
    pattern: /^import \* as https from ['"]https['"];?$/gm,
    replacement: "import { https } from '../infra_external-log-lib/src';"
  },
  {
    pattern: /^import https from ['"]https['"];?$/gm,
    replacement: "import { https } from '../infra_external-log-lib/src';"
  },
  {
    pattern: /^const https = require\(['"]https['"]\);?$/gm,
    replacement: "const { https } = require('../infra_external-log-lib/src');"
  },
  
  // os imports
  {
    pattern: /^import \* as os from ['"]os['"];?$/gm,
    replacement: "import { os } from '../infra_external-log-lib/src';"
  },
  {
    pattern: /^import os from ['"]os['"];?$/gm,
    replacement: "import { os } from '../infra_external-log-lib/src';"
  },
  
  // crypto imports
  {
    pattern: /^import \* as crypto from ['"]crypto['"];?$/gm,
    replacement: "import { crypto } from '../infra_external-log-lib/src';"
  },
  {
    pattern: /^import crypto from ['"]crypto['"];?$/gm,
    replacement: "import { crypto } from '../infra_external-log-lib/src';"
  },
  
  // net imports
  {
    pattern: /^import \* as net from ['"]net['"];?$/gm,
    replacement: "import { net } from '../infra_external-log-lib/src';"
  },
  
  // stream imports
  {
    pattern: /^import \* as stream from ['"]stream['"];?$/gm,
    replacement: "import { stream } from '../infra_external-log-lib/src';"
  },
  
  // events imports (EventEmitter)
  {
    pattern: /^import \{ EventEmitter \} from ['"]events['"];?$/gm,
    replacement: "import { EventEmitter } from '../infra_external-log-lib/src';"
  },
  {
    pattern: /^import \* as events from ['"]events['"];?$/gm,
    replacement: "import { events } from '../infra_external-log-lib/src';"
  },
];

interface MigrationResult {
  file: string;
  replaced: boolean;
  patterns: string[];
}

function calculateRelativePath(fromFile: string): string {
  // Calculate relative path from the file to external-log-lib
  const fromDir = path.dirname(fromFile);
  const toDir = path.join(THEMES_DIR, EXTERNAL_LOG_LIB, 'src');
  let relativePath = path.relative(fromDir, toDir);
  
  // Ensure forward slashes for imports
  relativePath = relativePath.replace(/\\/g, '/');
  
  // Add ./ if it doesn't start with ../
  if (!relativePath.startsWith('../') && !relativePath.startsWith('./')) {
    relativePath = './' + relativePath;
  }
  
  return relativePath;
}

function migrateFile(filePath: string): MigrationResult {
  const result: MigrationResult = {
    file: filePath,
    replaced: false,
    patterns: []
  };
  
  // Skip if file is in external-log-lib itself
  if (filePath.includes(EXTERNAL_LOG_LIB)) {
    return result;
  }
  
  let content = fs.readFileSync(filePath, 'utf-8');
  const originalContent = content;
  
  // Calculate the correct relative path for this file
  const relativePath = calculateRelativePath(filePath);
  
  // Apply each pattern with the correct relative path
  for (const { pattern, replacement } of IMPORT_PATTERNS) {
    const adjustedReplacement = replacement.replace(
      '../infra_external-log-lib/src',
      relativePath
    );
    
    const matches = content.match(pattern);
    if (matches) {
      content = content.replace(pattern, adjustedReplacement);
      result.patterns.push(pattern.source);
    }
  }
  
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content);
    result.replaced = true;
  }
  
  return result;
}

function findFilesToMigrate(): string[] {
  const patterns = [
    path.join(THEMES_DIR, '**/*.ts'),
    path.join(THEMES_DIR, '**/*.tsx'),
    path.join(THEMES_DIR, '**/*.js'),
    path.join(THEMES_DIR, '**/*.jsx'),
  ];
  
  const files: string[] = [];
  
  for (const pattern of patterns) {
    const matches = glob.sync(pattern, {
      ignore: [
        '**/node_modules/**',
        '**/dist/**',
        '**/build/**',
        `**/${EXTERNAL_LOG_LIB}/**`, // Don't modify external-log-lib itself
      ]
    });
    files.push(...matches);
  }
  
  return files;
}

async function main() {
  console.log('🔍 Finding files to migrate...');
  const files = findFilesToMigrate();
  console.log(`Found ${files.length} files to check`);
  
  const results: MigrationResult[] = [];
  let migratedCount = 0;
  
  for (const file of files) {
    const result = migrateFile(file);
    results.push(result);
    
    if (result.replaced) {
      migratedCount++;
      console.log(`✅ Migrated: ${path.relative(process.cwd(), file)}`);
      console.log(`   Patterns: ${result.patterns.join(', ')}`);
    }
  }
  
  console.log('\n📊 Migration Summary:');
  console.log(`Total files checked: ${files.length}`);
  console.log(`Files migrated: ${migratedCount}`);
  
  if (migratedCount > 0) {
    console.log('\n✨ Migration complete!');
    console.log('All direct Node.js module imports have been replaced with external-log-lib imports.');
    console.log('\nNext steps:');
    console.log('1. Run tests to ensure everything still works');
    console.log('2. Configure interception settings if needed');
    console.log('3. Check logs for any blocked operations');
  } else {
    console.log('\n✅ No files needed migration.');
  }
}

// Run the migration
main().catch(console.error);