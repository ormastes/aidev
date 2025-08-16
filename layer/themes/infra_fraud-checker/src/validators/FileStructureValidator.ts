import { fileAPI } from '../utils/file-api';
/**
 * FileStructureValidator
 * 
 * On-demand validation of project file structure against FILE_STRUCTURE.vf.json
 * Uses filesystem-mcp logic to check compliance and report violations
 */

import { fs } from '../../../infra_external-log-lib/src';
import { path } from '../../../infra_external-log-lib/src';

interface FileStructureDefinition {
  metadata: {
    level: string;
    version: string;
    supports_freeze?: boolean;
    freeze_validation?: string;
  };
  templates: {
    [key: string]: TemplateDefinition;
  };
  platform_specific_root_files?: string[];
}

interface TemplateDefinition {
  id: string;
  type: "directory" | 'file';
  freeze?: boolean;
  freeze_message?: string;
  description?: string;
  comment?: string;
  required_children?: ChildDefinition[];
  optional_children?: ChildDefinition[];
  allowed_patterns?: string[];
  platform_files?: string | string[];
  children?: ChildDefinition[];
}

interface ChildDefinition {
  name: string;
  type: "directory" | 'file' | 'feature_file';
  required?: boolean;
  comment?: string;
  children?: ChildDefinition[];
  freeze?: boolean;
  freeze_message?: string;
}

export interface Violation {
  type: 'missing_required' | 'unexpected_file' | 'freeze_violation' | 'pattern_mismatch' | 'structure_mismatch';
  severity: "critical" | 'high' | 'medium' | 'low';
  path: string;
  message: string;
  suggestion?: string;
  expected?: any;
  actual?: any;
}

export interface ValidationReport {
  timestamp: string;
  version: string;
  basePath: string;
  totalChecks: number;
  violations: Violation[];
  complianceScore: number;
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  suggestions: string[];
}

export class FileStructureValidator {
  private fileStructure: FileStructureDefinition | null = null;
  private violations: Violation[] = [];
  private totalChecks = 0;
  private basePath: string;

  constructor(basePath: string = process.cwd()) {
    this.basePath = basePath;
  }

  /**
   * Load FILE_STRUCTURE.vf.json
   */
  async loadFileStructure(structurePath?: string): Promise<void> {
    const filePath = structurePath || path.join(this.basePath, 'FILE_STRUCTURE.vf.json');
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`FILE_STRUCTURE.vf.json not found at ${filePath}`);
    }

    const content = fileAPI.readFileSync(filePath, 'utf8');
    this.fileStructure = JSON.parse(content);
  }

  /**
   * Validate the entire project structure
   */
  async validate(targetPath?: string): Promise<ValidationReport> {
    if (!this.fileStructure) {
      await this.loadFileStructure();
    }

    this.violations = [];
    this.totalChecks = 0;

    const pathToValidate = targetPath || this.basePath;

    // Validate root workspace
    if (this.fileStructure!.templates.workspace) {
      await this.validateTemplate(
        pathToValidate,
        this.fileStructure!.templates.workspace,
        'root'
      );
    }

    // Validate themes
    const themesPath = path.join(pathToValidate, 'layer', 'themes');
    if (fs.existsSync(themesPath)) {
      await this.validateThemes(themesPath);
    }

    // Generate report
    return this.generateReport();
  }

  /**
   * Validate a directory against a template
   */
  private async validateTemplate(
    dirPath: string,
    template: TemplateDefinition,
    context: string
  ): Promise<void> {
    this.totalChecks++;

    // Check freeze rules
    if (template.freeze) {
      await this.checkFreezeViolations(dirPath, template);
    }

    // Check required children
    if (template.required_children) {
      for (const child of template.required_children) {
        await this.validateChild(dirPath, child, true, context);
      }
    }

    // Check optional children
    if (template.optional_children) {
      for (const child of template.optional_children) {
        await this.validateChild(dirPath, child, false, context);
      }
    }

    // Check for unexpected files in frozen directories
    if (template.freeze) {
      await this.checkUnexpectedFiles(dirPath, template);
    }

    // Check pattern matching
    if (template.allowed_patterns) {
      await this.checkPatterns(dirPath, template.allowed_patterns);
    }
  }

  /**
   * Validate a child element
   */
  private async validateChild(
    parentPath: string,
    child: ChildDefinition,
    required: boolean,
    context: string
  ): Promise<void> {
    this.totalChecks++;
    const childPath = path.join(parentPath, child.name);

    if (!fs.existsSync(childPath)) {
      if (required) {
        this.addViolation({
          type: 'missing_required',
          severity: 'high',
          path: childPath,
          message: `Required ${child.type} '${child.name}' is missing in ${context}`,
          suggestion: `Create ${child.type} at ${childPath}`,
          expected: child
        });
      }
      return;
    }

    const stat = fs.statSync(childPath);
    const isDirectory = stat.isDirectory();
    const expectedDirectory = child.type === "directory";

    if (isDirectory !== expectedDirectory) {
      this.addViolation({
        type: 'structure_mismatch',
        severity: 'medium',
        path: childPath,
        message: `Expected ${child.type} but found ${isDirectory ? "directory" : 'file'}`,
        suggestion: `Convert to ${child.type}`,
        expected: child.type,
        actual: isDirectory ? "directory" : 'file'
      });
    }

    // Recursively validate children
    if (child.children && isDirectory) {
      for (const grandchild of child.children) {
        await this.validateChild(childPath, grandchild, true, `${context}/${child.name}`);
      }
    }
  }

  /**
   * Check for freeze violations
   */
  private async checkFreezeViolations(
    dirPath: string,
    template: TemplateDefinition
  ): Promise<void> {
    // In frozen directories, only specific files/dirs are allowed
    const allowedNames = new Set<string>();

    if (template.required_children) {
      template.required_children.forEach(child => allowedNames.add(child.name));
    }
    if (template.optional_children) {
      template.optional_children.forEach(child => allowedNames.add(child.name));
    }

    // Add platform-specific files
    if (template.platform_files) {
      const platformFiles = Array.isArray(template.platform_files) 
        ? template.platform_files 
        : [template.platform_files];
      platformFiles.forEach(file => allowedNames.add(file));
    }

    // Check for violations
    if (!fs.existsSync(dirPath)) return;

    const items = fs.readdirSync(dirPath);
    for (const item of items) {
      if (item.startsWith('.')) continue; // Skip hidden files

      if (!allowedNames.has(item)) {
        const itemPath = path.join(dirPath, item);
        this.addViolation({
          type: 'freeze_violation',
          severity: 'high',
          path: itemPath,
          message: `Unexpected item '${item}' in frozen directory`,
          suggestion: template.freeze_message || `Remove or move '${item}' to an appropriate location`,
          actual: item
        });
      }
    }
  }

  /**
   * Check for unexpected files
   */
  private async checkUnexpectedFiles(
    dirPath: string,
    template: TemplateDefinition
  ): Promise<void> {
    // Already handled in checkFreezeViolations
  }

  /**
   * Check pattern matching
   */
  private async checkPatterns(
    dirPath: string,
    patterns: string[]
  ): Promise<void> {
    if (!fs.existsSync(dirPath)) return;

    const items = fs.readdirSync(dirPath);
    for (const item of items) {
      if (item.startsWith('.')) continue;

      let matchesPattern = false;
      for (const pattern of patterns) {
        const regex = new RegExp(pattern);
        if (regex.test(item)) {
          matchesPattern = true;
          break;
        }
      }

      if (!matchesPattern) {
        this.addViolation({
          type: 'pattern_mismatch',
          severity: 'medium',
          path: path.join(dirPath, item),
          message: `Item '${item}' does not match allowed patterns`,
          suggestion: `Rename to match one of: ${patterns.join(', ')}`,
          expected: patterns,
          actual: item
        });
      }
    }
  }

  /**
   * Validate all themes
   */
  private async validateThemes(themesPath: string): Promise<void> {
    const themes = fs.readdirSync(themesPath);
    
    for (const theme of themes) {
      const themePath = path.join(themesPath, theme);
      const stat = fs.statSync(themePath);
      
      if (stat.isDirectory()) {
        // Check theme name pattern
        const themePattern = /^[a-z][a-z0-9_-]*$/;
        if (!themePattern.test(theme)) {
          this.addViolation({
            type: 'pattern_mismatch',
            severity: 'medium',
            path: themePath,
            message: `Theme name '${theme}' does not match pattern ^[a-z][a-z0-9_-]*$`,
            suggestion: 'Use lowercase letters, numbers, underscores, and hyphens only',
            expected: '^[a-z][a-z0-9_-]*$',
            actual: theme
          });
        }

        // Validate theme structure
        await this.validateThemeStructure(themePath, theme);
      }
    }
  }

  /**
   * Validate individual theme structure
   */
  private async validateThemeStructure(themePath: string, themeName: string): Promise<void> {
    const requiredFiles = ['README.md', 'FEATURE.vf.json', 'TASK_QUEUE.vf.json', 'NAME_ID.vf.json'];
    const allowedDirs = [
      'user-stories', "children", 'common', "research", "resources",
      'pipe', 'tests', 'docs', 'src', 'gen', "external", 'dist',
      "coverage", "examples", 'scripts', 'node_modules',
      // Additional common directories
      'config', 'utils', "templates", 'public', 'demo', "features",
      "components", 'hooks', 'styles', 'layer', 'schemas', 'temp',
      "dockerfiles", 'helm', 'k8s', 'logs', 'vf_definitions',
      'fraud-reports', 'root-src-backup', 'release', 'llm_rules',
      'cli-ui', 'coverage_temp', 'TASK_QUEUE.md' // Some themes have .md as dirs
    ];

    // Check required files
    for (const file of requiredFiles) {
      const filePath = path.join(themePath, file);
      if (!fs.existsSync(filePath)) {
        this.addViolation({
          type: 'missing_required',
          severity: 'high',
          path: filePath,
          message: `Required file '${file}' missing in theme ${themeName}`,
          suggestion: `Create ${file} in ${themePath}`,
          expected: file
        });
      }
    }

    // Check pipe/index.ts
    const pipePath = path.join(themePath, 'pipe', 'index.ts');
    if (!fs.existsSync(pipePath)) {
      this.addViolation({
        type: 'missing_required',
        severity: "critical",
        path: pipePath,
        message: `Critical: pipe/index.ts missing in theme ${themeName}`,
        suggestion: 'Create pipe/index.ts for cross-layer communication',
        expected: 'pipe/index.ts'
      });
    }

    // Check for unexpected directories
    const items = fs.readdirSync(themePath);
    for (const item of items) {
      const itemPath = path.join(themePath, item);
      const stat = fs.statSync(itemPath);
      
      if (stat.isDirectory() && !item.startsWith('.')) {
        if (!allowedDirs.includes(item)) {
          this.addViolation({
            type: 'unexpected_file',
            severity: 'low',
            path: itemPath,
            message: `Unexpected directory '${item}' in theme ${themeName}`,
            suggestion: `Move to one of: ${allowedDirs.join(', ')}`,
            actual: item
          });
        }
      }
    }
  }

  /**
   * Add a violation to the list
   */
  private addViolation(violation: Violation): void {
    this.violations.push(violation);
  }

  /**
   * Generate the validation report
   */
  private generateReport(): ValidationReport {
    const summary = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0
    };

    this.violations.forEach(v => {
      summary[v.severity]++;
    });

    const complianceScore = this.totalChecks > 0
      ? Math.round(((this.totalChecks - this.violations.length) / this.totalChecks) * 100)
      : 100;

    const suggestions = Array.from(
      new Set(this.violations.map(v => v.suggestion).filter(s => s))
    ) as string[];

    return {
      timestamp: new Date().toISOString(),
      version: this.fileStructure?.metadata.version || '1.0.0',
      basePath: this.basePath,
      totalChecks: this.totalChecks,
      violations: this.violations,
      complianceScore,
      summary,
      suggestions
    };
  }

  /**
   * Generate markdown report
   */
  generateMarkdownReport(report: ValidationReport): string {
    let markdown = `# File Structure Validation Report

**Generated**: ${new Date(report.timestamp).toLocaleString()}
**Version**: ${report.version}
**Base Path**: ${report.basePath}
**Compliance Score**: ${report.complianceScore}%

## Summary

| Severity | Count |
|----------|-------|
| Critical | ${report.summary.critical} |
| High | ${report.summary.high} |
| Medium | ${report.summary.medium} |
| Low | ${report.summary.low} |
| **Total** | **${report.violations.length}** |

## Violations

`;

    // Group violations by severity
    const grouped = {
      critical: report.violations.filter(v => v.severity === "critical"),
      high: report.violations.filter(v => v.severity === 'high'),
      medium: report.violations.filter(v => v.severity === 'medium'),
      low: report.violations.filter(v => v.severity === 'low')
    };

    for (const [severity, violations] of Object.entries(grouped)) {
      if (violations.length === 0) continue;

      markdown += `### ${severity.toUpperCase()} (${violations.length})\n\n`;
      
      for (const violation of violations) {
        markdown += `#### ${violation.type.replace(/_/g, ' ').toUpperCase()}\n`;
        markdown += `- **Path**: \`${violation.path}\`\n`;
        markdown += `- **Message**: ${violation.message}\n`;
        if (violation.suggestion) {
          markdown += `- **Suggestion**: ${violation.suggestion}\n`;
        }
        if (violation.expected) {
          markdown += `- **Expected**: ${JSON.stringify(violation.expected)}\n`;
        }
        if (violation.actual) {
          markdown += `- **Actual**: ${JSON.stringify(violation.actual)}\n`;
        }
        markdown += '\n';
      }
    }

    if (report.suggestions.length > 0) {
      markdown += `## Recommendations\n\n`;
      report.suggestions.forEach((suggestion, i) => {
        markdown += `${i + 1}. ${suggestion}\n`;
      });
    }

    markdown += `\n## Compliance Details

- **Total Checks**: ${report.totalChecks}
- **Violations Found**: ${report.violations.length}
- **Compliance Score**: ${report.complianceScore}%

`;

    if (report.complianceScore === 100) {
      markdown += `✅ **Perfect Compliance!** The project structure fully complies with FILE_STRUCTURE.vf.json\n`;
    } else if (report.complianceScore >= 80) {
      markdown += `⚠️ **Good Compliance** with minor issues to address\n`;
    } else if (report.complianceScore >= 60) {
      markdown += `⚠️ **Fair Compliance** - significant improvements needed\n`;
    } else {
      markdown += `❌ **Poor Compliance** - major restructuring required\n`;
    }

    return markdown;
  }
}

export default FileStructureValidator;