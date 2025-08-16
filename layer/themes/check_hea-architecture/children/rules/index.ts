/**
 * HEA Rules
 * Defines and manages HEA architecture rules
 */

import { EventEmitter } from 'node:events';

export interface Rule {
  id: string;
  name: string;
  description: string;
  category: "structure" | 'imports' | 'exports' | 'naming' | "complexity";
  severity: 'error' | 'warning' | 'info';
  enabled: boolean;
  fixable: boolean;
  examples?: {
    valid?: string[];
    invalid?: string[];
  };
  check: (context: RuleContext) => RuleViolation[];
}

export interface RuleContext {
  filePath: string;
  content: string;
  ast?: any;
  structure: {
    isTheme?: boolean;
    isPipe?: boolean;
    isChild?: boolean;
    layer?: string;
  };
  options?: RuleOptions;
}

export interface RuleViolation {
  rule: string;
  message: string;
  line: number;
  column: number;
  endLine?: number;
  endColumn?: number;
  severity: 'error' | 'warning' | 'info';
  fix?: {
    range: [number, number];
    text: string;
  };
}

export interface RuleOptions {
  [key: string]: any;
}

export interface RuleSet {
  name: string;
  description: string;
  rules: Rule[];
  extends?: string[];
}

export interface CustomRule extends Rule {
  isCustom: true;
  source: 'user' | 'plugin' | 'config';
}

export class HEARules extends EventEmitter {
  private rules: Map<string, Rule>;
  private ruleSets: Map<string, RuleSet>;
  private enabledRules: Set<string>;
  private customRules: Map<string, CustomRule>;

  constructor() {
    super();
    this.rules = new Map();
    this.ruleSets = new Map();
    this.enabledRules = new Set();
    this.customRules = new Map();
    
    this.registerDefaultRules();
    this.registerDefaultRuleSets();
  }

  private registerDefaultRules(): void {
    // Structure Rules
    this.registerRule({
      id: 'pipe-gateway-required',
      name: 'Pipe Gateway Required',
      description: 'Themes with children must have a pipe gateway',
      category: "structure",
      severity: 'error',
      enabled: true,
      fixable: true,
      check: (context) => {
        const violations: RuleViolation[] = [];
        
        if (context.structure.isTheme && !context.structure.isPipe) {
          // Check if theme has children
          const hasChildren = context.content.includes('/children/');
          if (hasChildren) {
            violations.push({
              rule: 'pipe-gateway-required',
              message: 'Theme has children but no pipe gateway',
              line: 1,
              column: 1,
              severity: 'error'
            });
          }
        }
        
        return violations;
      }
    });

    this.registerRule({
      id: 'pipe-index-only',
      name: 'Pipe Index Only',
      description: 'Pipe directories must only contain index files',
      category: "structure",
      severity: 'error',
      enabled: true,
      fixable: false,
      check: (context) => {
        const violations: RuleViolation[] = [];
        
        if (context.filePath.includes('/pipe/') && 
            !context.filePath.endsWith('/index.ts') && 
            !context.filePath.endsWith('/index.js')) {
          violations.push({
            rule: 'pipe-index-only',
            message: 'Pipe directory must only contain index.ts or index.js',
            line: 1,
            column: 1,
            severity: 'error'
          });
        }
        
        return violations;
      }
    });

    // Import Rules
    this.registerRule({
      id: 'no-cross-layer-imports',
      name: 'No Cross-Layer Imports',
      description: 'Modules should not import directly from other layers',
      category: 'imports',
      severity: 'error',
      enabled: true,
      fixable: true,
      examples: {
        invalid: [
          "import { something } from '../../../other-layer/module';"
        ],
        valid: [
          "import { something } from '../pipe';",
          "import { something } from './local-module';"
        ]
      },
      check: (context) => {
        const violations: RuleViolation[] = [];
        const importRegex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
        const lines = context.content.split('\n');
        
        lines.forEach((line, index) => {
          let match;
          while ((match = importRegex.exec(line)) !== null) {
            const importPath = match[1];
            if (importPath.includes('../../../')) {
              violations.push({
                rule: 'no-cross-layer-imports',
                message: `Cross-layer import detected: ${importPath}`,
                line: index + 1,
                column: match.index + 1,
                severity: 'error'
              });
            }
          }
        });
        
        return violations;
      }
    });

    this.registerRule({
      id: 'children-import-through-pipe',
      name: 'Children Import Through Pipe',
      description: 'Child modules must import siblings through pipe gateway',
      category: 'imports',
      severity: 'error',
      enabled: true,
      fixable: true,
      check: (context) => {
        const violations: RuleViolation[] = [];
        
        if (!context.structure.isChild) {
          return violations;
        }
        
        const importRegex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
        const lines = context.content.split('\n');
        
        lines.forEach((line, index) => {
          let match;
          while ((match = importRegex.exec(line)) !== null) {
            const importPath = match[1];
            if (importPath.includes('../children/')) {
              violations.push({
                rule: 'children-import-through-pipe',
                message: 'Children modules must import siblings through pipe gateway',
                line: index + 1,
                column: match.index + 1,
                severity: 'error'
              });
            }
          }
        });
        
        return violations;
      }
    });

    this.registerRule({
      id: 'import-from-pipe',
      name: 'Import From Pipe',
      description: 'External modules must import from pipe gateway',
      category: 'imports',
      severity: 'error',
      enabled: true,
      fixable: true,
      check: (context) => {
        const violations: RuleViolation[] = [];
        
        if (context.structure.isChild || context.structure.isPipe) {
          return violations;
        }
        
        const importRegex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
        const lines = context.content.split('\n');
        
        lines.forEach((line, index) => {
          let match;
          while ((match = importRegex.exec(line)) !== null) {
            const importPath = match[1];
            if (importPath.includes('/children/')) {
              violations.push({
                rule: 'import-from-pipe',
                message: 'External modules must import from pipe gateway, not children directly',
                line: index + 1,
                column: match.index + 1,
                severity: 'error'
              });
            }
          }
        });
        
        return violations;
      }
    });

    // Export Rules
    this.registerRule({
      id: 'pipe-must-export',
      name: 'Pipe Must Export',
      description: 'Pipe gateways must export child modules',
      category: 'exports',
      severity: 'error',
      enabled: true,
      fixable: true,
      check: (context) => {
        const violations: RuleViolation[] = [];
        
        if (!context.structure.isPipe) {
          return violations;
        }
        
        const hasExports = context.content.includes('export');
        if (!hasExports) {
          violations.push({
            rule: 'pipe-must-export',
            message: 'Pipe gateway must export child modules',
            line: 1,
            column: 1,
            severity: 'error'
          });
        }
        
        return violations;
      }
    });

    this.registerRule({
      id: 'child-default-export',
      name: 'Child Default Export',
      description: 'Child modules should have a default export',
      category: 'exports',
      severity: 'warning',
      enabled: true,
      fixable: false,
      check: (context) => {
        const violations: RuleViolation[] = [];
        
        if (!context.structure.isChild) {
          return violations;
        }
        
        const hasDefaultExport = context.content.includes('export default') ||
                                context.content.includes('exports.default');
        
        if (!hasDefaultExport) {
          violations.push({
            rule: 'child-default-export',
            message: 'Child modules should have a default export',
            line: 1,
            column: 1,
            severity: 'warning'
          });
        }
        
        return violations;
      }
    });

    // Naming Rules
    this.registerRule({
      id: 'consistent-naming',
      name: 'Consistent Naming',
      description: 'Files and directories should follow naming conventions',
      category: 'naming',
      severity: 'warning',
      enabled: true,
      fixable: false,
      check: (context) => {
        const violations: RuleViolation[] = [];
        const fileName = context.filePath.split('/').pop() || '';
        
        // Check for kebab-case in directory names
        const dirs = context.filePath.split('/');
        dirs.forEach((dir, index) => {
          if (dir && !dir.match(/^[a-z]+(-[a-z]+)*$/) && 
              dir !== 'pipe' && dir !== "children" && !dir.includes('.')) {
            violations.push({
              rule: 'consistent-naming',
              message: `Directory name should be kebab-case: ${dir}`,
              line: 1,
              column: 1,
              severity: 'warning'
            });
          }
        });
        
        return violations;
      }
    });

    // Complexity Rules
    this.registerRule({
      id: 'max-complexity',
      name: 'Maximum Complexity',
      description: 'Modules should not exceed complexity threshold',
      category: "complexity",
      severity: 'warning',
      enabled: true,
      fixable: false,
      check: (context) => {
        const violations: RuleViolation[] = [];
        const complexity = this.calculateComplexity(context.content);
        
        if (complexity > 10) {
          violations.push({
            rule: 'max-complexity',
            message: `Module complexity (${complexity}) exceeds threshold (10)`,
            line: 1,
            column: 1,
            severity: 'warning'
          });
        }
        
        return violations;
      }
    });

    this.registerRule({
      id: 'max-dependencies',
      name: 'Maximum Dependencies',
      description: 'Modules should not have too many dependencies',
      category: "complexity",
      severity: 'warning',
      enabled: true,
      fixable: false,
      check: (context) => {
        const violations: RuleViolation[] = [];
        const importCount = (context.content.match(/import\s+/g) || []).length;
        
        if (importCount > 15) {
          violations.push({
            rule: 'max-dependencies',
            message: `Too many imports (${importCount}), consider refactoring`,
            line: 1,
            column: 1,
            severity: 'warning'
          });
        }
        
        return violations;
      }
    });
  }

  private registerDefaultRuleSets(): void {
    // Strict ruleset
    this.registerRuleSet({
      name: 'strict',
      description: 'Strict HEA compliance',
      rules: Array.from(this.rules.values()).filter(r => r.severity === 'error')
    });

    // Recommended ruleset
    this.registerRuleSet({
      name: "recommended",
      description: 'Recommended HEA rules',
      rules: Array.from(this.rules.values()).filter(r => 
        r.severity === 'error' || (r.severity === 'warning' && r.category !== 'naming')
      )
    });

    // Minimal ruleset
    this.registerRuleSet({
      name: 'minimal',
      description: 'Minimal HEA rules for basic compliance',
      rules: Array.from(this.rules.values()).filter(r => 
        ['no-cross-layer-imports', 'import-from-pipe', 'pipe-gateway-required'].includes(r.id)
      )
    });
  }

  private calculateComplexity(content: string): number {
    let complexity = 1;
    
    // Count control flow statements
    const patterns = [
      /\bif\s*\(/g,
      /\belse\s+if\s*\(/g,
      /\bfor\s*\(/g,
      /\bwhile\s*\(/g,
      /\bdo\s*{/g,
      /\bswitch\s*\(/g,
      /\bcase\s+/g,
      /\bcatch\s*\(/g,
      /\?\s*.*?\s*:/g  // Ternary operators
    ];
    
    for (const pattern of patterns) {
      const matches = content.match(pattern);
      if (matches) {
        complexity += matches.length;
      }
    }
    
    return complexity;
  }

  registerRule(rule: Rule): void {
    this.rules.set(rule.id, rule);
    if (rule.enabled) {
      this.enabledRules.add(rule.id);
    }
    this.emit('rule:registered', { rule: rule.id });
  }

  registerCustomRule(rule: CustomRule): void {
    this.customRules.set(rule.id, rule);
    this.registerRule(rule);
  }

  registerRuleSet(ruleSet: RuleSet): void {
    this.ruleSets.set(ruleSet.name, ruleSet);
    this.emit('ruleset:registered', { ruleSet: ruleSet.name });
  }

  enableRule(ruleId: string): void {
    const rule = this.rules.get(ruleId);
    if (rule) {
      rule.enabled = true;
      this.enabledRules.add(ruleId);
      this.emit('rule:enabled', { rule: ruleId });
    }
  }

  disableRule(ruleId: string): void {
    const rule = this.rules.get(ruleId);
    if (rule) {
      rule.enabled = false;
      this.enabledRules.delete(ruleId);
      this.emit('rule:disabled', { rule: ruleId });
    }
  }

  useRuleSet(name: string): void {
    const ruleSet = this.ruleSets.get(name);
    if (!ruleSet) {
      throw new Error(`RuleSet ${name} not found`);
    }

    // Disable all rules first
    for (const rule of this.rules.values()) {
      rule.enabled = false;
    }
    this.enabledRules.clear();

    // Enable rules from the ruleset
    for (const rule of ruleSet.rules) {
      this.enableRule(rule.id);
    }

    this.emit('ruleset:applied', { ruleSet: name });
  }

  checkFile(context: RuleContext): RuleViolation[] {
    const violations: RuleViolation[] = [];

    for (const ruleId of this.enabledRules) {
      const rule = this.rules.get(ruleId);
      if (rule) {
        const ruleViolations = rule.check(context);
        violations.push(...ruleViolations);
      }
    }

    return violations;
  }

  getRule(ruleId: string): Rule | undefined {
    return this.rules.get(ruleId) || this.customRules.get(ruleId);
  }

  getAllRules(): Rule[] {
    return Array.from(this.rules.values());
  }

  getEnabledRules(): Rule[] {
    return Array.from(this.enabledRules)
      .map(id => this.rules.get(id))
      .filter(r => r !== undefined) as Rule[];
  }

  getRuleSet(name: string): RuleSet | undefined {
    return this.ruleSets.get(name);
  }

  getAllRuleSets(): RuleSet[] {
    return Array.from(this.ruleSets.values());
  }

  getFixableRules(): Rule[] {
    return this.getAllRules().filter(r => r.fixable);
  }

  getRulesByCategory(category: Rule["category"]): Rule[] {
    return this.getAllRules().filter(r => r.category === category);
  }

  getRulesBySeverity(severity: Rule["severity"]): Rule[] {
    return this.getAllRules().filter(r => r.severity === severity);
  }

  exportConfiguration(): any {
    return {
      enabledRules: Array.from(this.enabledRules),
      customRules: Array.from(this.customRules.values()),
      ruleSets: Array.from(this.ruleSets.values())
    };
  }

  importConfiguration(config: any): void {
    // Import custom rules
    if (config.customRules) {
      for (const rule of config.customRules) {
        this.registerCustomRule(rule);
      }
    }

    // Import rule sets
    if (config.ruleSets) {
      for (const ruleSet of config.ruleSets) {
        this.registerRuleSet(ruleSet);
      }
    }

    // Enable rules
    if (config.enabledRules) {
      for (const ruleId of config.enabledRules) {
        this.enableRule(ruleId);
      }
    }
  }
}

export default HEARules;