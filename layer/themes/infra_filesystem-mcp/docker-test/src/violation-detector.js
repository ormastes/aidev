#!/usr/bin/env node

/**
 * Violation Detection and Validation System
 * Detects and analyzes MCP rule violations
 */

const fs = require('fs').promises;
const { path } = require('../../../infra_external-log-lib/src');
const { getFileAPI, FileType } = require('../../../infra_external-log-lib/pipe');

const fileAPI = getFileAPI();


class ViolationDetector {
  constructor(config = {}) {
    this.config = {
      workspacePath: config.workspacePath || '/workspace',
      resultPath: config.resultPath || '/results',
      nameIdPath: config.nameIdPath || 'NAME_ID.vf.json',
      ...config
    };
    
    this.violations = [];
    this.validations = [];
    this.nameIdCache = null;
  }

  /**
   * Initialize detector
   */
  async initialize() {
    // Load NAME_ID.vf.json
    await this.loadNameId();
    
    // Load allowed files configuration
    this.allowedRootFiles = [
      'README.md', 'CLAUDE.md', 'package.json', 'tsconfig.json',
      '.gitignore', 'NAME_ID.vf.json', 'TASK_QUEUE.vf.json',
      'FEATURE.vf.json', 'FILE_STRUCTURE.vf.json', 'pyproject.toml',
      '.behaverc', '.python-version'
    ];
    
    this.allowedDirectories = [
      'gen/doc', 'layer/themes', 'layer/epics', 'config',
      'scripts', 'tests', 'test/system', 'common', 'demo',
      'examples', 'xlib'
    ];
    
    console.log('✅ Violation detector initialized');
  }

  /**
   * Load NAME_ID.vf.json
   */
  async loadNameId() {
    try {
      const nameIdPath = path.join(this.config.workspacePath, this.config.nameIdPath);
      const content = await fs.readFile(nameIdPath, 'utf-8');
      this.nameIdCache = JSON.parse(content);
    } catch (error) {
      console.warn('Warning: Could not load NAME_ID.vf.json:', error.message);
      this.nameIdCache = null;
    }
  }

  /**
   * Detect root file violation
   */
  detectRootFileViolation(filePath) {
    const normalized = path.normalize(filePath);
    const parts = normalized.split(path.sep).filter(p => p !== '');
    
    // Check if it's a root file
    if (parts.length === 1) {
      const fileName = parts[0];
      
      // Check if it's allowed
      if (!this.allowedRootFiles.includes(fileName)) {
        return {
          violated: true,
          type: 'ROOT_FILE_VIOLATION',
          message: `File '${fileName}' is not allowed in root directory`,
          severity: 'error',
          filePath: filePath,
          suggestion: 'Move file to appropriate directory like gen/doc/ or layer/themes/'
        };
      }
    }
    
    return { violated: false };
  }

  /**
   * Detect unauthorized directory
   */
  detectUnauthorizedDirectory(filePath) {
    const normalized = path.normalize(filePath);
    const parts = normalized.split(path.sep).filter(p => p !== '');
    
    if (parts.length > 1) {
      // Check if path starts with allowed directory
      const isAllowed = this.allowedDirectories.some(dir => {
        const dirParts = dir.split('/');
        return dirParts.every((part, index) => parts[index] === part);
      });
      
      if (!isAllowed) {
        return {
          violated: true,
          type: 'DIRECTORY_VIOLATION',
          message: `Directory '${parts[0]}' is not in allowed list`,
          severity: 'warning',
          filePath: filePath,
          suggestion: `Use one of: ${this.allowedDirectories.join(', ')}`
        };
      }
    }
    
    return { violated: false };
  }

  /**
   * Detect NAME_ID validation issues
   */
  async detectNameIdViolation(filePath, purpose) {
    if (!this.nameIdCache) {
      return {
        violated: true,
        type: 'NAME_ID_MISSING',
        message: 'NAME_ID.vf.json not available for validation',
        severity: 'warning',
        filePath: filePath
      };
    }
    
    // Check if file is already registered
    const allFiles = [];
    Object.values(this.nameIdCache.purposes || {}).forEach(category => {
      if (Array.isArray(category)) {
        allFiles.push(...category);
      }
    });
    
    const existing = allFiles.find(f => f.data?.filePath === filePath);
    if (existing) {
      return { violated: false }; // Already registered
    }
    
    // Check if registration is required
    if (!purpose) {
      return {
        violated: true,
        type: 'MISSING_PURPOSE',
        message: 'File purpose is required for NAME_ID registration',
        severity: 'error',
        filePath: filePath,
        suggestion: 'Provide a clear purpose for the file'
      };
    }
    
    return { violated: false };
  }

  /**
   * Detect duplicate purpose
   */
  detectDuplicatePurpose(purpose) {
    if (!this.nameIdCache || !purpose) {
      return { violated: false };
    }
    
    const allFiles = [];
    Object.values(this.nameIdCache.purposes || {}).forEach(category => {
      if (Array.isArray(category)) {
        allFiles.push(...category);
      }
    });
    
    const duplicates = [];
    for (const file of allFiles) {
      if (file.data?.purpose) {
        const similarity = this.calculateSimilarity(purpose, file.data.purpose);
        if (similarity > 0.7) {
          duplicates.push({
            file: file.data.filePath,
            purpose: file.data.purpose,
            similarity: Math.round(similarity * 100)
          });
        }
      }
    }
    
    if (duplicates.length > 0) {
      return {
        violated: true,
        type: 'DUPLICATE_PURPOSE',
        message: 'Files with similar purposes already exist',
        severity: 'warning',
        duplicates: duplicates,
        suggestion: 'Consider extending existing file instead of creating new one'
      };
    }
    
    return { violated: false };
  }

  /**
   * Calculate similarity between two strings
   */
  calculateSimilarity(str1, str2) {
    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();
    
    // Simple word-based similarity
    const words1 = new Set(s1.split(/\s+/));
    const words2 = new Set(s2.split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  /**
   * Detect naming convention violations
   */
  detectNamingViolation(filePath) {
    const fileName = path.basename(filePath);
    
    if (!/^[a-zA-Z0-9._-]+$/.test(fileName)) {
      return {
        violated: true,
        type: 'NAMING_CONVENTION',
        message: `File name '${fileName}' doesn't follow naming convention`,
        severity: 'warning',
        filePath: filePath,
        suggestion: 'Use only alphanumeric characters, dots, hyphens, and underscores'
      };
    }
    
    return { violated: false };
  }

  /**
   * Detect path traversal attempts
   */
  detectPathTraversal(filePath) {
    if (filePath.includes('..')) {
      return {
        violated: true,
        type: 'PATH_TRAVERSAL',
        message: 'Path traversal attempts are not allowed',
        severity: 'critical',
        filePath: filePath,
        suggestion: 'Use absolute or relative paths without ..'
      };
    }
    
    return { violated: false };
  }

  /**
   * Analyze a file operation for violations
   */
  async analyzeOperation(operation) {
    const violations = [];
    const { filePath, purpose, content, force } = operation;
    
    // Check root file violation
    const rootViolation = this.detectRootFileViolation(filePath);
    if (rootViolation.violated) {
      violations.push(rootViolation);
    }
    
    // Check directory violation
    const dirViolation = this.detectUnauthorizedDirectory(filePath);
    if (dirViolation.violated) {
      violations.push(dirViolation);
    }
    
    // Check NAME_ID violation
    const nameIdViolation = await this.detectNameIdViolation(filePath, purpose);
    if (nameIdViolation.violated) {
      violations.push(nameIdViolation);
    }
    
    // Check duplicate purpose
    const duplicateViolation = this.detectDuplicatePurpose(purpose);
    if (duplicateViolation.violated) {
      violations.push(duplicateViolation);
    }
    
    // Check naming convention
    const namingViolation = this.detectNamingViolation(filePath);
    if (namingViolation.violated) {
      violations.push(namingViolation);
    }
    
    // Check path traversal
    const traversalViolation = this.detectPathTraversal(filePath);
    if (traversalViolation.violated) {
      violations.push(traversalViolation);
    }
    
    // Store analysis result
    const result = {
      filePath,
      purpose,
      timestamp: new Date().toISOString(),
      violations,
      blocked: violations.some(v => v.severity === 'error' || v.severity === 'critical') && !force,
      forced: force,
      violationCount: violations.length
    };
    
    this.violations.push(result);
    
    return result;
  }

  /**
   * Analyze response from MCP server
   */
  analyzeResponse(response) {
    const analysis = {
      success: false,
      violations: [],
      warnings: [],
      suggestions: []
    };
    
    if (response.error) {
      analysis.violations.push({
        type: 'SERVER_ERROR',
        message: response.error.message || 'Unknown server error',
        severity: 'error'
      });
      return analysis;
    }
    
    if (response.result?.content) {
      const content = response.result.content[0]?.text;
      if (content) {
        try {
          const parsed = JSON.parse(content);
          
          analysis.success = parsed.success || parsed.allowed;
          
          if (parsed.issues) {
            analysis.violations.push(...parsed.issues);
          }
          
          if (parsed.warnings) {
            analysis.warnings.push(...parsed.warnings);
          }
          
          if (parsed.suggestions) {
            analysis.suggestions.push(...parsed.suggestions);
          }
          
          if (parsed.validation) {
            if (parsed.validation.issues) {
              analysis.violations.push(...parsed.validation.issues);
            }
            if (parsed.validation.warnings) {
              analysis.warnings.push(...parsed.validation.warnings);
            }
          }
        } catch (e) {
          // Not JSON response
          analysis.success = true; // Assume success if not error
        }
      }
    }
    
    return analysis;
  }

  /**
   * Generate violation report
   */
  async generateReport() {
    const report = {
      summary: {
        totalOperations: this.violations.length,
        blockedOperations: this.violations.filter(v => v.blocked).length,
        forcedOperations: this.violations.filter(v => v.forced).length,
        totalViolations: this.violations.reduce((sum, v) => sum + v.violationCount, 0)
      },
      byType: {},
      violations: this.violations,
      timestamp: new Date().toISOString()
    };
    
    // Count violations by type
    for (const operation of this.violations) {
      for (const violation of operation.violations) {
        if (!report.byType[violation.type]) {
          report.byType[violation.type] = {
            count: 0,
            severity: violation.severity,
            examples: []
          };
        }
        
        report.byType[violation.type].count++;
        if (report.byType[violation.type].examples.length < 3) {
          report.byType[violation.type].examples.push({
            file: operation.filePath,
            message: violation.message
          });
        }
      }
    }
    
    // Save report
    const reportPath = path.join(this.config.resultPath, `violations-${Date.now()}.json`);
    await fileAPI.createFile(reportPath, JSON.stringify(report, null, 2));
    
    // Generate markdown report
    let mdReport = '# MCP Violation Detection Report\n\n';
    mdReport += `Generated: ${report.timestamp}\n\n`;
    
    mdReport += '## Summary\n\n';
    mdReport += `- Total Operations: ${report.summary.totalOperations}\n`;
    mdReport += `- Blocked Operations: ${report.summary.blockedOperations}\n`;
    mdReport += `- Forced Operations: ${report.summary.forcedOperations}\n`;
    mdReport += `- Total Violations: ${report.summary.totalViolations}\n\n`;
    
    mdReport += '## Violations by Type\n\n';
    for (const [type, data] of Object.entries(report.byType)) {
      mdReport += `### ${type}\n`;
      mdReport += `- Count: ${data.count}\n`;
      mdReport += `- Severity: ${data.severity}\n`;
      mdReport += '- Examples:\n';
      for (const example of data.examples) {
        mdReport += `  - ${example.file}: ${example.message}\n`;
      }
      mdReport += '\n';
    }
    
    const mdPath = path.join(this.config.resultPath, `violations-${Date.now()}.md`);
    await fileAPI.createFile(mdPath, mdReport);
    
    console.log(`\n📊 Violation report saved to:`);
    console.log(`  JSON: ${reportPath}`);
    console.log(`  Markdown: ${mdPath}`);
    
    return report;
  }

  /**
   * Real-time violation monitoring
   */
  async monitorViolations(callback) {
    // Set up interval to check for new violations
    setInterval(() => {
      const recentViolations = this.violations.filter(v => {
        const age = Date.now() - new Date(v.timestamp).getTime();
        return age < 5000; // Last 5 seconds
      });
      
      if (recentViolations.length > 0) {
        callback(recentViolations);
      }
    }, 1000);
  }
}

module.exports = ViolationDetector;

// Run if executed directly
if (require.main === module) {
  const detector = new ViolationDetector({
    workspacePath: process.env.VF_BASE_PATH || '/workspace'
  });
  
  async function runTest() {
    try {
      await detector.initialize();
      
      // Test operations
      const testOperations = [
        { filePath: 'test.js', purpose: 'Test file' },
        { filePath: '../test.js', purpose: 'Path traversal attempt' },
        { filePath: 'gen/doc/api.md', purpose: 'API documentation' },
        { filePath: 'secret.key', purpose: 'Secret key file' }
      ];
      
      for (const op of testOperations) {
        const result = await detector.analyzeOperation(op);
        console.log(`File: ${op.filePath}`);
        console.log(`  Violations: ${result.violationCount}`);
        console.log(`  Blocked: ${result.blocked}`);
        if (result.violations.length > 0) {
          console.log(`  Issues: ${result.violations.map(v => v.type).join(', ')}`);
        }
        console.log('');
      }
      
      const report = await detector.generateReport();
      console.log('Report generated successfully');
      
    } catch (error) {
      console.error('Test failed:', error);
    }
  }
  
  runTest();
}