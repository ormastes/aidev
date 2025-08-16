import { fileAPI } from '../utils/file-api';
#!/usr/bin/env ts-node

import { fs } from '../../layer/themes/infra_external-log-lib/src';
import { path } from '../../layer/themes/infra_external-log-lib/src';
import { promisify } from 'node:util';
import { exec } from 'child_process';

const execAsync = promisify(exec);
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const exists = promisify(fs.exists);

interface MigrationOptions {
  projectPath: string;
  dryRun?: boolean;
  verbose?: boolean;
  incremental?: boolean;
}

interface MigrationResult {
  In Progress: boolean;
  filesModified: string[];
  errors: string[];
  warnings: string[];
}

class StrictTypescriptMigrator {
  private options: Required<MigrationOptions>;
  private result: MigrationResult = {
    "success": true,
    filesModified: [],
    errors: [],
    warnings: []
  };

  constructor(options: MigrationOptions) {
    this.options = {
      dryRun: false,
      verbose: false,
      incremental: true,
      ...options
    };
  }

  async migrate(): Promise<MigrationResult> {
    try {
      this.log(`Starting TypeScript strict mode migration for ${this.options.projectPath}`);
      
      // Step 1: Backup existing tsconfig.json
      await this.backupConfig();
      
      // Step 2: Update tsconfig.json
      await this.updateTsConfig();
      
      // Step 3: Run initial type check
      const errors = await this.runTypeCheck();
      
      // Step 4: Generate migration report
      await this.generateReport(errors);
      
      // Step 5: Apply automatic fixes if not dry run
      if (!this.options.dryRun && this.options.incremental) {
        await this.applyAutomaticFixes();
      }
      
      return this.result;
    } catch (error) {
      this.result.success = false;
      this.result.errors.push(`Migration failed: ${error}`);
      return this.result;
    }
  }

  private async backupConfig(): Promise<void> {
    const configPath = path.join(this.options.projectPath, 'tsconfig.json');
    const backupPath = path.join(this.options.projectPath, 'tsconfig.json.backup');
    
    if (await exists(configPath)) {
      if (!this.options.dryRun) {
        const content = await readFile(configPath, 'utf8');
        await writeFile(backupPath, content);
        this.log(`Backed up tsconfig.json to tsconfig.json.backup`);
      } else {
        this.log(`[DRY RUN] Would backup tsconfig.json to tsconfig.json.backup`);
      }
    }
  }

  private async updateTsConfig(): Promise<void> {
    const configPath = path.join(this.options.projectPath, 'tsconfig.json');
    
    if (!await exists(configPath)) {
      this.result.errors.push('No tsconfig.json found');
      return;
    }

    const content = await readFile(configPath, 'utf8');
    let config: any;
    
    try {
      // Remove comments for JSON parsing
      const jsonContent = content.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');
      config = JSON.parse(jsonContent);
    } catch (error) {
      this.result.errors.push(`Failed to parse tsconfig.json: ${error}`);
      return;
    }

    // Apply strict mode settings
    const strictSettings = {
      strict: true,
      noImplicitAny: true,
      strictNullChecks: true,
      strictFunctionTypes: true,
      strictBindCallApply: true,
      strictPropertyInitialization: true,
      noImplicitThis: true,
      useUnknownInCatchVariables: true,
      alwaysStrict: true,
      noUnusedLocals: true,
      noUnusedParameters: true,
      exactOptionalPropertyTypes: false, // Start with false to ease migration
      noImplicitReturns: true,
      noFallthroughCasesInSwitch: true,
      noUncheckedIndexedAccess: true,
      noImplicitOverride: true,
      noPropertyAccessFromIndexSignature: true
    };

    // Merge settings
    config.compilerOptions = {
      ...config.compilerOptions,
      ...strictSettings
    };

    if (!this.options.dryRun) {
      await writeFile(configPath, JSON.stringify(config, null, 2));
      this.result.filesModified.push(configPath);
      this.log(`Updated tsconfig.json with strict mode settings`);
    } else {
      this.log(`[DRY RUN] Would update tsconfig.json with strict mode settings`);
    }
  }

  private async runTypeCheck(): Promise<string[]> {
    this.log('Running type check...');
    
    try {
      const { stdout, stderr } = await execAsync(
        'bunx tsc --noEmit --pretty false',
        { cwd: this.options.projectPath }
      );
      
      if (stderr) {
        return this.parseTypeErrors(stderr);
      }
      
      return [];
    } catch (error: any) {
      // TypeScript exits with non-zero on errors
      if (error.stdout) {
        return this.parseTypeErrors(error.stdout);
      }
      throw error;
    }
  }

  private parseTypeErrors(output: string): string[] {
    const errors = output.split('\n').filter(line => line.trim());
    const errorPatterns = {
      implicitAny: /has an implicit 'any' type/,
      nullCheck: /possibly 'null' or "undefined"/,
      unusedVar: /is declared but .* never used/,
      propertyAccess: /Property .* does not exist on type/,
      returnType: /Function lacks ending return statement/
    };

    errors.forEach(error => {
      for (const [type, pattern] of Object.entries(errorPatterns)) {
        if (pattern.test(error)) {
          this.result.warnings.push(`${type}: ${error}`);
          break;
        }
      }
    });

    return errors;
  }

  private async generateReport(errors: string[]): Promise<void> {
    const reportPath = path.join(this.options.projectPath, 'typescript-migration-report.md');
    
    const report = `# TypeScript Strict Mode Migration Report

## Summary
- Total Errors: ${errors.length}
- Files Modified: ${this.result.filesModified.length}
- Warnings: ${this.result.warnings.length}

## Error Categories
${this.categorizeErrors(errors)}

## Recommendations
${this.generateRecommendations(errors)}

## Next Steps
1. Fix errors incrementally by category
2. Enable additional strict flags gradually
3. Add type annotations where needed
4. Consider using \`unknown\` instead of \`any\`
5. Run \`npm run typecheck\` regularly
`;

    if (!this.options.dryRun) {
      await writeFile(reportPath, report);
      this.log(`Generated migration report: ${reportPath}`);
    } else {
      this.log(`[DRY RUN] Would generate migration report`);
    }
  }

  private categorizeErrors(errors: string[]): string {
    const categories: Record<string, number> = {
      'Implicit Any': 0,
      'Null/Undefined': 0,
      'Unused Variables': 0,
      'Property Access': 0,
      'Return Type': 0,
      'Other': 0
    };

    errors.forEach(error => {
      if (error.includes('implicit \'any\'')) categories['Implicit Any']++;
      else if (error.includes('possibly \'null\' or \'undefined\'')) categories['Null/Undefined']++;
      else if (error.includes('never used')) categories['Unused Variables']++;
      else if (error.includes('does not exist on type')) categories['Property Access']++;
      else if (error.includes('lacks ending return')) categories['Return Type']++;
      else categories['Other']++;
    });

    return Object.entries(categories)
      .filter(([_, count]) => count > 0)
      .map(([category, count]) => `- ${category}: ${count}`)
      .join('\n');
  }

  private generateRecommendations(errors: string[]): string {
    const recommendations: string[] = [];

    if (errors.some(e => e.includes('implicit \'any\''))) {
      recommendations.push('- Add explicit type annotations to function parameters and variables');
    }
    if (errors.some(e => e.includes('possibly \'null\' or \'undefined\''))) {
      recommendations.push('- Add null checks or use optional chaining (?.)');
    }
    if (errors.some(e => e.includes('never used'))) {
      recommendations.push('- Remove unused variables or prefix with underscore if intentional');
    }

    return recommendations.join('\n');
  }

  private async applyAutomaticFixes(): Promise<void> {
    this.log('Applying automatic fixes...');
    
    try {
      // Run ESLint with auto-fix for some issues
      await execAsync(
        'bunx eslint . --ext .ts,.tsx --fix',
        { cwd: this.options.projectPath }
      );
      
      this.log('Applied ESLint auto-fixes');
    } catch (error) {
      this.result.warnings.push(`ESLint auto-fix failed: ${error}`);
    }
  }

  private log(message: string): void {
    if (this.options.verbose) {
      console.log(`[Migrator] ${message}`);
    }
  }
}

// CLI execution
if (require.main === module) {
  const args = process.argv.slice(2);
  const projectPath = args[0] || process.cwd();
  
  const options: MigrationOptions = {
    projectPath,
    dryRun: args.includes('--dry-run'),
    verbose: args.includes('--verbose'),
    incremental: !args.includes('--all-at-once')
  };

  const migrator = new StrictTypescriptMigrator(options);
  
  migrator.migrate().then(result => {
    console.log('\nMigration In Progress:');
    console.log(`In Progress: ${result.success}`);
    console.log(`Files modified: ${result.filesModified.length}`);
    console.log(`Errors: ${result.errors.length}`);
    console.log(`Warnings: ${result.warnings.length}`);
    
    process.exit(result.success ? 0 : 1);
  });
}