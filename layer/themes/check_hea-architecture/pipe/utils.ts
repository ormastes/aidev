/**
 * Utility functions for HEA Architecture Checker
 */

import { HEAValidator, ValidationOptions } from '../children/validator';
import { HEAAnalyzer } from '../children/analyzer';
import { HEAReporter, ReportOptions } from '../children/reporter';
import { HEAFixer, FixOptions } from '../children/fixer';
import { HEARules } from '../children/rules';

/**
 * Validate a project for HEA compliance
 */
export async function validateProject(
  rootPath: string,
  options?: Partial<ValidationOptions>
): Promise<any> {
  const validator = new HEAValidator({
    rootPath,
    ...options
  });
  
  return validator.validate();
}

/**
 * Analyze project structure
 */
export async function analyzeStructure(rootPath: string): Promise<any> {
  const analyzer = new HEAAnalyzer(rootPath);
  return analyzer.analyze();
}

/**
 * Generate a compliance report
 */
export async function generateReport(
  format: ReportOptions['format'] = 'markdown',
  options?: Partial<ReportOptions>
): Promise<any> {
  const rootPath = process.cwd();
  
  // Run validation and analysis
  const validator = new HEAValidator({ rootPath });
  const analyzer = new HEAAnalyzer(rootPath);
  
  const validationResult = await validator.validate();
  const analysisResult = await analyzer.analyze();
  
  // Generate report
  const reporter = new HEAReporter({
    format,
    ...options
  });
  
  return reporter.generateReport(validationResult, analysisResult);
}

/**
 * Auto-fix HEA violations
 */
export async function autoFix(
  rootPath: string,
  options?: FixOptions
): Promise<any> {
  // Run validation to find errors
  const validator = new HEAValidator({ rootPath });
  const validationResult = await validator.validate();
  
  // Fix errors
  const fixer = new HEAFixer(options);
  return fixer.fix(validationResult.errors);
}

/**
 * Quick check for HEA compliance
 */
export async function quickCheck(rootPath: string): Promise<{
  compliant: boolean;
  score: number;
  violations: number;
  suggestions: string[];
}> {
  const analyzer = new HEAAnalyzer(rootPath);
  const result = await analyzer.analyze();
  
  return {
    compliant: result.violations.length === 0,
    score: result.score,
    violations: result.violations.length,
    suggestions: result.suggestions
  };
}

/**
 * Get all available rules
 */
export function getRules(): any[] {
  const rules = new HEARules();
  return rules.getAllRules();
}

/**
 * Check a single file
 */
export async function checkFile(
  filePath: string,
  content?: string
): Promise<any> {
  const rules = new HEARules();
  
  if (!content) {
    const fs = await import('fs');
    content = await fs.promises.readFile(filePath, 'utf8');
  }
  
  const context = {
    filePath,
    content,
    structure: {
      isPipe: filePath.includes('/pipe/'),
      isChild: filePath.includes('/children/'),
      isTheme: filePath.includes('/themes/'),
      layer: filePath.split('/').find(p => ['themes', 'modules', 'services'].includes(p))
    }
  };
  
  return rules.checkFile(context);
}

/**
 * Create a custom rule
 */
export function createCustomRule(config: {
  id: string;
  name: string;
  description: string;
  check: (context: any) => any[];
}): any {
  return {
    ...config,
    category: 'custom' as any,
    severity: 'warning' as any,
    enabled: true,
    fixable: false,
    isCustom: true,
    source: 'user'
  };
}

export default {
  validateProject,
  analyzeStructure,
  generateReport,
  autoFix,
  quickCheck,
  getRules,
  checkFile,
  createCustomRule
};