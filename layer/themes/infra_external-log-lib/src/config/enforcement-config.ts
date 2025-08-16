/**
 * Strict Enforcement Configuration for File Creation API
 * Only sample/demo themes are exempt from using the FileCreationAPI
 */

export interface EnforcementConfig {
  mode: 'strict' | 'warn' | 'monitor' | 'bypass';
  exemptPatterns: string[];
  requireTypeForAll: boolean;
  autoRouting: boolean;
  blockDirectFS: boolean;
}

/**
 * Themes/paths that are EXEMPT from FileCreationAPI requirement
 * These are sample applications that can use original fs interfaces
 */

export const EXEMPT_FILES = [
  // System files that are part of File API infrastructure
  '**/compliance*.js',
  '**/fraud-check*.js',
  '**/rollback*.js',
  '**/file-api*.js',
  '**/audit-logger*',
  '**/system-monitor*',
  '**/setup-compliance-alerts.js',
  '**/run-fraud-check.js',
  '**/run-compliance-dashboard.js',
  '**/run-project-fraud-check.ts',
  '**/security/audit-logger.ts',
  '**/fraud-checker/demo.ts',
  
  // File API implementation files themselves
  '**/FileCreationAPI.ts',
  '**/MCPIntegratedFileManager.ts',
  '**/FileCreationFraudChecker.ts',
  '**/enforcement-config.ts',
  
  // MCP server files (infrastructure)
  '**/infra_filesystem-mcp/**/*.js',
  
  // CLI framework examples
  '**/cli-framework/**/examples/**',
  '**/plugin-example.ts'
];

export const EXEMPT_THEMES = [
  // Sample/Demo applications
  'mate_dealer',
  'sample_*',
  'demo_*',
  'example_*',
  
  // Demo directories within themes
  '**/demo/**',
  '**/demos/**',
  '**/examples/**',
  '**/samples/**',
  
  // Test fixtures (but not production tests)
  '**/fixtures/**',
  '**/mocks/**',
  
  // Specific demo apps mentioned in requirements
  'layer/apps/mate_dealer/**',
  'layer/demos/**',
  'layer/samples/**'
];

/**
 * Themes that MUST use FileCreationAPI with automatic folder routing
 * All themes not in EXEMPT_THEMES are automatically included
 */
export const ENFORCED_THEMES = [
  'init_*',
  'infra_*',
  'portal_*',
  'tool_*',
  'check_*',
  'llm-agent_*',
  'mcp_*',
  "research",
  'shared',
  'layer/themes/**',
  'layer/epics/**',
  'scripts/**',
  'common/**',
  'config/**'
];

/**
 * File type routing configuration
 * Maps file types to their automatic folder destinations
 */
export const TYPE_ROUTING_MAP: Record<string, string> = {
  'doc': 'gen/doc',
  "document": 'gen/doc',
  'report': 'gen/reports',
  'temp': 'temp',
  "temporary": 'temp',
  'log': 'gen/logs',
  'data': 'data',
  'cache': 'data/cache',
  'config': 'config',
  'test': 'test',
  'source': 'src',
  "generated": 'gen',
  'gen': 'gen',
  'demo': 'demo',
  'script': 'scripts',
  'fixture': "fixtures",
  "coverage": "coverage",
  'build': 'build',
  'dist': 'dist',
  'output': 'output'
};

/**
 * Strict type requirements
 * These patterns MUST specify a type - no default allowed
 */
export const REQUIRE_TYPE_PATTERNS = [
  '**/*.json',
  '**/*.xml',
  '**/*.yaml',
  '**/*.yml',
  '**/*.md',
  '**/*.txt',
  '**/*.log',
  '**/*.csv',
  '**/*.html',
  '**/*.css',
  '**/*.sql'
];

export class EnforcementValidator {
  private config: EnforcementConfig;

  constructor(config?: Partial<EnforcementConfig>) {
    this.config = {
      mode: 'strict',
      exemptPatterns: EXEMPT_THEMES,
      requireTypeForAll: true,
      autoRouting: true,
      blockDirectFS: true,
      ...config
    };
  }

  /**
   * Check if a file path is exempt from FileCreationAPI requirement
   */
  isExempt(filePath: string): boolean {
    // Check if path matches any exempt pattern
    for (const pattern of this.config.exemptPatterns) {
      if (this.matchesPattern(filePath, pattern)) {
        return true;
      }
    }
    
    // Check if it's a known sample/demo theme
    const themeName = this.extractThemeName(filePath);
    if (themeName) {
      if (themeName.startsWith('sample_') || 
          themeName.startsWith('demo_') ||
          themeName.startsWith('example_') ||
          themeName === 'mate_dealer') {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Check if a file MUST use FileCreationAPI
   */
  mustUseFileAPI(filePath: string): boolean {
    // If exempt, doesn't need to use FileAPI
    if (this.isExempt(filePath)) {
      return false;
    }
    
    // In strict mode, all non-exempt files must use FileAPI
    if (this.config.mode === 'strict') {
      return true;
    }
    
    // Check if path matches enforced patterns
    for (const pattern of ENFORCED_THEMES) {
      if (this.matchesPattern(filePath, pattern)) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Check if a file type is required for a given path
   */
  isTypeRequired(filePath: string): boolean {
    if (!this.config.requireTypeForAll) {
      return false;
    }
    
    // Exempt paths don't require type
    if (this.isExempt(filePath)) {
      return false;
    }
    
    // Check against patterns that require type
    for (const pattern of REQUIRE_TYPE_PATTERNS) {
      if (this.matchesPattern(filePath, pattern)) {
        return true;
      }
    }
    
    // All non-exempt files require type in strict mode
    return this.config.mode === 'strict';
  }

  /**
   * Get the automatic folder for a file type
   */
  getAutoFolder(fileType: string): string | null {
    if (!this.config.autoRouting) {
      return null;
    }
    
    const folder = TYPE_ROUTING_MAP[fileType.toLowerCase()];
    return folder || null;
  }

  /**
   * Validate a file operation
   */
  validateOperation(filePath: string, options?: { type?: string; folder?: string }): {
    valid: boolean;
    errors: string[];
    warnings: string[];
    autoFolder?: string;
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    let autoFolder: string | undefined;
    
    // Check if file must use FileAPI
    if (this.mustUseFileAPI(filePath)) {
      // Check if type is provided
      if (!options?.type && this.isTypeRequired(filePath)) {
        errors.push(`File type is required for: ${filePath}`);
      }
      
      // Get auto folder if type is provided
      if (options?.type) {
        const folder = this.getAutoFolder(options.type);
        if (folder) {
          autoFolder = folder;
          
          // Warn if manual folder differs from auto folder
          if (options.folder && options.folder !== folder) {
            warnings.push(`Manual folder '${options.folder}' differs from auto-routed folder '${folder}' for type '${options.type}'`);
          }
        }
      }
    } else {
      // File is exempt
      warnings.push(`File is exempt from FileCreationAPI: ${filePath}`);
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings,
      autoFolder
    };
  }

  /**
   * Extract theme name from file path
   */
  private extractThemeName(filePath: string): string | null {
    const themeMatch = filePath.match(/layer\/themes\/([^\/]+)/);
    if (themeMatch) {
      return themeMatch[1];
    }
    
    const appMatch = filePath.match(/layer\/apps\/([^\/]+)/);
    if (appMatch) {
      return appMatch[1];
    }
    
    return null;
  }

  /**
   * Check if a path matches a pattern (supports wildcards)
   */
  private matchesPattern(path: string, pattern: string): boolean {
    // Convert pattern to regex
    const regexPattern = pattern
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.')
      .replace(/\//g, '\\/')
      .replace(/\./g, '\\.');
    
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(path);
  }

  /**
   * Get enforcement report for a file
   */
  getEnforcementReport(filePath: string): {
    theme: string | null;
    isExempt: boolean;
    mustUseAPI: boolean;
    requiresType: boolean;
    enforcementLevel: 'none' | "optional" | "required" | 'strict';
  } {
    const theme = this.extractThemeName(filePath);
    const isExempt = this.isExempt(filePath);
    const mustUseAPI = this.mustUseFileAPI(filePath);
    const requiresType = this.isTypeRequired(filePath);
    
    let enforcementLevel: 'none' | "optional" | "required" | 'strict';
    if (isExempt) {
      enforcementLevel = 'none';
    } else if (mustUseAPI && requiresType) {
      enforcementLevel = 'strict';
    } else if (mustUseAPI) {
      enforcementLevel = "required";
    } else {
      enforcementLevel = "optional";
    }
    
    return {
      theme,
      isExempt,
      mustUseAPI,
      requiresType,
      enforcementLevel
    };
  }
}

// Export singleton instance with strict configuration
export const strictEnforcement = new EnforcementValidator({
  mode: 'strict',
  requireTypeForAll: true,
  autoRouting: true,
  blockDirectFS: true
});

// Export function to check if direct fs is allowed
export function isDirectFSAllowed(filePath: string): boolean {
  // Check if file is in exempt files list
  if (EXEMPT_FILES && EXEMPT_FILES.some(pattern => {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return regex.test(filePath);
  })) {
    return true;
  }
  
  // Check if file matches exempt themes
  if (EXEMPT_THEMES.some(pattern => {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return regex.test(filePath);
  })) {
    return true;
  }
  
  // Original exemption logic
  return strictEnforcement.isExempt(filePath);
}

// Export function to validate file operations
export function validateFileOperation(
  filePath: string, 
  options?: { type?: string; folder?: string }
): { valid: boolean; errors: string[]; autoFolder?: string } {
  return strictEnforcement.validateOperation(filePath, options);
}