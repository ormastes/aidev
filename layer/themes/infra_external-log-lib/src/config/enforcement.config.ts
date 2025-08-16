const { fileAPI } = require('../utils/file-api');
/**
 * File API Enforcement Configuration
 * Defines rules and policies for enforcing FileCreationAPI usage
 */

export interface EnforcementPolicy {
  mode: 'strict' | "moderate" | "permissive";
  rules: EnforcementRule[];
  exemptions: Exemption[];
  reporting: ReportingConfig;
}

export interface EnforcementRule {
  name: string;
  description: string;
  severity: 'error' | 'warning' | 'info';
  pattern: RegExp;
  action: 'block' | 'warn' | 'log';
  autoFix?: boolean;
}

export interface Exemption {
  path?: string;
  pattern?: RegExp;
  reason: string;
  expiresAt?: Date;
}

export interface ReportingConfig {
  logViolations: boolean;
  saveReports: boolean;
  reportPath: string;
  emailAlerts?: string[];
  slackWebhook?: string;
}

/**
 * Default enforcement rules
 */
export const DEFAULT_RULES: EnforcementRule[] = [
  {
    name: 'no-direct-writeFile',
    description: 'Prohibit direct fs.writeFile usage',
    severity: 'error',
    pattern: /fs\.writeFile(?:Sync)?\s*\(/,
    action: 'block',
    autoFix: true
  },
  {
    name: 'no-direct-promises-writeFile',
    description: 'Prohibit fs.promises.writeFile',
    severity: 'error',
    pattern: /fs\.promises\.writeFile\s*\(/,
    action: 'block',
    autoFix: true
  },
  {
    name: 'no-direct-mkdir',
    description: 'Prohibit direct directory creation',
    severity: 'warning',
    pattern: /fs\.mkdir(?:Sync)?\s*\(/,
    action: 'warn',
    autoFix: true
  },
  {
    name: 'no-backup-files',
    description: 'Prevent backup file creation',
    severity: 'error',
    pattern: /\.(bak|backup|old|orig)['"`]/,
    action: 'block',
    autoFix: false
  },
  {
    name: 'no-root-writes',
    description: 'Prevent writing to root directory',
    severity: 'error',
    pattern: /writeFile[^(]*\(['"`]\/(?!tmp|temp)/,
    action: 'block',
    autoFix: false
  },
  {
    name: 'no-shell-redirects',
    description: 'Prevent shell file redirects',
    severity: 'error',
    pattern: /exec[^(]*>[^|]/,
    action: 'block',
    autoFix: false
  }
];

/**
 * Default exemptions
 */
export const DEFAULT_EXEMPTIONS: Exemption[] = [
  {
    pattern: /node_modules/,
    reason: 'Third-party dependencies'
  },
  {
    pattern: /\.test\.(ts|js)$/,
    reason: 'Test files may need direct access for mocking'
  },
  {
    pattern: /migration|migrate/,
    reason: 'Migration scripts need direct access'
  },
  {
    path: 'scripts/init-file-api.js',
    reason: 'Initialization script needs direct access'
  },
  {
    path: 'layer/themes/infra_external-log-lib',
    reason: 'The file API implementation itself'
  }
];

/**
 * Enforcement policies by environment
 */
export const ENFORCEMENT_POLICIES: Record<string, EnforcementPolicy> = {
  production: {
    mode: 'strict',
    rules: DEFAULT_RULES.map(r => ({ ...r, action: 'block' as const })),
    exemptions: DEFAULT_EXEMPTIONS.filter(e => !e.pattern?.test('.test.')),
    reporting: {
      logViolations: true,
      saveReports: true,
      reportPath: 'logs/file-api-violations.log'
    }
  },
  
  development: {
    mode: "moderate",
    rules: DEFAULT_RULES.map(r => ({ 
      ...r, 
      action: r.severity === 'error' ? 'warn' as const : 'log' as const 
    })),
    exemptions: DEFAULT_EXEMPTIONS,
    reporting: {
      logViolations: true,
      saveReports: false,
      reportPath: 'logs/file-api-violations-dev.log'
    }
  },
  
  test: {
    mode: "permissive",
    rules: DEFAULT_RULES.map(r => ({ ...r, action: 'log' as const })),
    exemptions: [
      ...DEFAULT_EXEMPTIONS,
      { pattern: /.*/, reason: 'All files exempted in test mode' }
    ],
    reporting: {
      logViolations: false,
      saveReports: false,
      reportPath: 'logs/file-api-violations-test.log'
    }
  }
};

/**
 * Get enforcement policy for current environment
 */
export function getEnforcementPolicy(): EnforcementPolicy {
  const env = process.env.NODE_ENV || "development";
  return ENFORCEMENT_POLICIES[env] || ENFORCEMENT_POLICIES.development;
}

/**
 * Check if a file path is exempted
 */
export function isExempted(filePath: string, exemptions: Exemption[]): boolean {
  for (const exemption of exemptions) {
    if (exemption.expiresAt && new Date() > exemption.expiresAt) {
      continue;
    }
    
    if (exemption.path && filePath === exemption.path) {
      return true;
    }
    
    if (exemption.pattern && exemption.pattern.test(filePath)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Apply enforcement rules to code
 */
export function applyEnforcementRules(
  code: string,
  filePath: string,
  policy: EnforcementPolicy
): { violations: string[], fixes: string[] } {
  const violations: string[] = [];
  const fixes: string[] = [];
  
  if (isExempted(filePath, policy.exemptions)) {
    return { violations, fixes };
  }
  
  for (const rule of policy.rules) {
    if (rule.pattern.test(code)) {
      const message = `${rule.name}: ${rule.description} in ${filePath}`;
      
      switch (rule.action) {
        case 'block':
          violations.push(`[ERROR] ${message}`);
          break;
        case 'warn':
          violations.push(`[WARN] ${message}`);
          break;
        case 'log':
          violations.push(`[INFO] ${message}`);
          break;
      }
      
      if (rule.autoFix) {
        fixes.push(`Can auto-fix: ${rule.name}`);
      }
    }
  }
  
  return { violations, fixes };
}

export default {
  DEFAULT_RULES,
  DEFAULT_EXEMPTIONS,
  ENFORCEMENT_POLICIES,
  getEnforcementPolicy,
  isExempted,
  applyEnforcementRules
};