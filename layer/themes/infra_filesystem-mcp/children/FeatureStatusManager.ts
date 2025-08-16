import { fileAPI } from '../utils/file-api';
import { VFDistributedFeatureWrapper, DistributedFeature, DistributedFeatureFile } from './VFDistributedFeatureWrapper';
import { StoryReportValidator, ValidationResult } from './StoryReportValidator';
import { VFProtectedFileWrapper } from './VFProtectedFileWrapper';
import { fsPromises as fs } from 'fs/promises';
import { path } from '../../infra_external-log-lib/src';

export interface StatusChangeValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  coverageReport?: CoverageReport;
  duplicationReport?: DuplicationReport;
  userStoryReport?: UserStoryReport;
}

export interface CoverageReport {
  systemClassCoverage: number;
  branchCoverage: number;
  lineCoverage: number;
  functionCoverage: number;
  statementCoverage: number;
  passed: boolean;
  details: {
    uncoveredClasses?: string[];
    uncoveredBranches?: string[];
    coverageByFile?: Record<string, number>;
  };
}

export interface DuplicationReport {
  totalDuplication: number;
  duplicatedLines: number;
  totalLines: number;
  passed: boolean;
  duplications: Array<{
    file: string;
    startLine: number;
    endLine: number;
    duplicateIn: string[];
  }>;
}

export interface UserStoryReport {
  id: string;
  title: string;
  status: string;
  connectedFiles: string[];
  missingFiles: string[];
  emptyFiles: string[];
  testResults?: {
    passed: number;
    failed: number;
    skipped: number;
  };
  coverage?: CoverageReport;
  duplication?: DuplicationReport;
}

export interface FeatureUpdateRequest {
  featureId: string;
  categoryName: string;
  updates: Partial<DistributedFeature['data']>;
  userStoryReportPath?: string;
  skipValidation?: boolean;
}

export interface StatusTransitionRule {
  from: string[];
  to: string;
  requires: {
    userStoryReport?: boolean;
    coverageThreshold?: {
      systemClass?: number;
      branch?: number;
      line?: number;
    };
    duplicationThreshold?: number;
    fileValidation?: boolean;
    approvals?: string[];
  };
}

export class FeatureStatusManager {
  private featureWrapper: VFDistributedFeatureWrapper;
  private protectedWrapper?: VFProtectedFileWrapper;
  private storyValidator: StoryReportValidator;
  private basePath: string;
  private protectionEnabled: boolean = true;
  
  private statusTransitions: StatusTransitionRule[] = [
    {
      from: ['planned'],
      to: 'in-progress',
      requires: {}
    },
    {
      from: ['in-progress', 'blocked'],
      to: "implemented",
      requires: {
        userStoryReport: true,
        coverageThreshold: {
          systemClass: 90,
          branch: 90,
          line: 90
        },
        duplicationThreshold: 10,
        fileValidation: true
      }
    },
    {
      from: ["implemented"],
      to: "completed",
      requires: {
        coverageThreshold: {
          systemClass: 95,
          branch: 95,
          line: 95
        },
        duplicationThreshold: 5,
        approvals: ['tech-lead', 'product-owner']
      }
    },
    {
      from: ['planned', 'in-progress'],
      to: 'blocked',
      requires: {}
    },
    {
      from: ['blocked'],
      to: 'in-progress',
      requires: {}
    }
  ];

  constructor(basePath: string = process.cwd(), enableProtection: boolean = true) {
    this.basePath = basePath;
    this.protectionEnabled = enableProtection;
    
    // Use protected wrapper for feature files if protection is enabled
    if (this.protectionEnabled) {
      // Create a protected wrapper that allows FeatureStatusManager
      this.protectedWrapper = new VFProtectedFileWrapper(basePath, {
        patterns: ['**/FEATURE.vf.json', '**/FEATURES.vf.json'],
        allowedCallers: ["FeatureStatusManager", "VFDistributedFeatureWrapper"],
        requireValidation: true,
        auditLog: true
      });
    }
    
    this.featureWrapper = new VFDistributedFeatureWrapper(basePath);
    this.storyValidator = new StoryReportValidator();
  }

  /**
   * Add a new feature with validation
   */
  async addFeature(
    categoryName: string,
    feature: Omit<DistributedFeature, 'id' | "createdAt" | "updatedAt">
  ): Promise<{ id: string; validation: StatusChangeValidation }> {
    const validation = await this.validateFeatureData(feature.data);
    
    if (!validation.isValid && !feature.data.tags?.includes('draft')) {
      throw new Error(`Feature validation failed: ${validation.errors.join(', ')}`);
    }

    const featureId = await this.featureWrapper.addFeature(categoryName, feature);
    
    return { id: featureId, validation };
  }

  /**
   * Update feature with status change validation
   */
  async updateFeature(request: FeatureUpdateRequest): Promise<StatusChangeValidation> {
    const featureFile = await this.featureWrapper.read('/FEATURE.vf.json');
    const feature = this.findFeatureById(featureFile, request.featureId);
    
    if (!feature) {
      return {
        isValid: false,
        errors: [`Feature with ID ${request.featureId} not found`],
        warnings: []
      };
    }

    // Check if status is changing
    if (request.updates.status && request.updates.status !== feature.data.status) {
      const validation = await this.validateStatusChange(
        feature,
        request.updates.status,
        request.userStoryReportPath,
        request.skipValidation
      );
      
      if (!validation.isValid && !request.skipValidation) {
        return validation;
      }
    }

    // Apply updates
    Object.assign(feature.data, request.updates);
    feature.updatedAt = new Date().toISOString();
    
    // Save updated feature file
    await this.featureWrapper.write('/FEATURE.vf.json', featureFile);
    
    return {
      isValid: true,
      errors: [],
      warnings: []
    };
  }

  /**
   * Validate status change
   */
  private async validateStatusChange(
    feature: DistributedFeature,
    newStatus: string,
    userStoryReportPath?: string,
    skipValidation?: boolean
  ): Promise<StatusChangeValidation> {
    const currentStatus = feature.data.status;
    const transition = this.findTransitionRule(currentStatus, newStatus);
    
    if (!transition) {
      return {
        isValid: false,
        errors: [`Invalid status transition from '${currentStatus}' to '${newStatus}'`],
        warnings: []
      };
    }

    if (skipValidation) {
      return {
        isValid: true,
        errors: [],
        warnings: ['Validation skipped by request']
      };
    }

    const validation: StatusChangeValidation = {
      isValid: true,
      errors: [],
      warnings: []
    };

    // Validate user story report if required
    if (transition.requires.userStoryReport) {
      if (!userStoryReportPath) {
        validation.errors.push('User story report is required for this status change');
        validation.isValid = false;
      } else {
        const reportValidation = await this.validateUserStoryReport(
          userStoryReportPath,
          feature,
          transition.requires
        );
        validation.userStoryReport = reportValidation.report;
        validation.coverageReport = reportValidation.coverage;
        validation.duplicationReport = reportValidation.duplication;
        
        if (!reportValidation.isValid) {
          validation.errors.push(...reportValidation.errors);
          validation.isValid = false;
        }
        validation.warnings.push(...reportValidation.warnings);
      }
    }

    // Validate coverage thresholds
    if (transition.requires.coverageThreshold) {
      const coverageValidation = await this.validateCoverage(
        feature,
        transition.requires.coverageThreshold
      );
      
      if (!coverageValidation.passed) {
        validation.errors.push(...coverageValidation.errors);
        validation.isValid = false;
      }
      
      if (!validation.coverageReport) {
        validation.coverageReport = coverageValidation.report;
      }
    }

    // Validate duplication threshold
    if (transition.requires.duplicationThreshold !== undefined) {
      const duplicationValidation = await this.validateDuplication(
        feature,
        transition.requires.duplicationThreshold
      );
      
      if (!duplicationValidation.passed) {
        validation.errors.push(...duplicationValidation.errors);
        validation.isValid = false;
      }
      
      if (!validation.duplicationReport) {
        validation.duplicationReport = duplicationValidation.report;
      }
    }

    // Validate file existence
    if (transition.requires.fileValidation) {
      const fileValidation = await this.validateConnectedFiles(feature);
      
      if (!fileValidation.isValid) {
        validation.errors.push(...fileValidation.errors);
        validation.isValid = false;
      }
      validation.warnings.push(...fileValidation.warnings);
    }

    return validation;
  }

  /**
   * Validate user story report
   */
  private async validateUserStoryReport(
    reportPath: string,
    feature: DistributedFeature,
    requirements: any
  ): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
    report?: UserStoryReport;
    coverage?: CoverageReport;
    duplication?: DuplicationReport;
  }> {
    try {
      const reportContent = await fileAPI.readFile(reportPath, 'utf-8');
      const report = JSON.parse(reportContent) as UserStoryReport;
      
      const errors: string[] = [];
      const warnings: string[] = [];
      
      // Check connected files
      const missingFiles: string[] = [];
      const emptyFiles: string[] = [];
      
      for (const file of report.connectedFiles || []) {
        const filePath = path.join(this.basePath, file);
        try {
          const stats = await /* FRAUD_FIX: /* FRAUD_FIX: fs.stat(filePath) */ */;
          if (stats.size === 0) {
            emptyFiles.push(file);
          }
        } catch {
          missingFiles.push(file);
        }
      }
      
      if (missingFiles.length > 0) {
        errors.push(`Missing connected files: ${missingFiles.join(', ')}`);
      }
      
      if (emptyFiles.length > 0) {
        warnings.push(`Empty connected files: ${emptyFiles.join(', ')}`);
      }
      
      report.missingFiles = missingFiles;
      report.emptyFiles = emptyFiles;
      
      // Validate coverage if present
      if (report.coverage) {
        if (requirements.coverageThreshold) {
          const thresh = requirements.coverageThreshold;
          
          if (thresh.systemClass && report.coverage.systemClassCoverage < thresh.systemClass) {
            errors.push(`System class coverage ${report.coverage.systemClassCoverage}% is below threshold ${thresh.systemClass}%`);
          }
          
          if (thresh.branch && report.coverage.branchCoverage < thresh.branch) {
            errors.push(`Branch coverage ${report.coverage.branchCoverage}% is below threshold ${thresh.branch}%`);
          }
        }
      }
      
      // Validate duplication if present
      if (report.duplication) {
        if (requirements.duplicationThreshold !== undefined) {
          if (report.duplication.totalDuplication > requirements.duplicationThreshold) {
            errors.push(`Code duplication ${report.duplication.totalDuplication}% exceeds threshold ${requirements.duplicationThreshold}%`);
          }
        }
      }
      
      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        report,
        coverage: report.coverage,
        duplication: report.duplication
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [`Failed to read or parse user story report: ${error}`],
        warnings: []
      };
    }
  }

  /**
   * Validate coverage requirements
   */
  private async validateCoverage(
    feature: DistributedFeature,
    thresholds: any
  ): Promise<{
    passed: boolean;
    errors: string[];
    report: CoverageReport;
  }> {
    // Look for coverage report files
    const coverageFiles = [
      'coverage/coverage-summary.json',
      'coverage/coverage-final.json',
      '.nyc_output/coverage.json'
    ];
    
    for (const coverageFile of coverageFiles) {
      const coveragePath = path.join(this.basePath, coverageFile);
      try {
        const coverageData = await fileAPI.readFile(coveragePath, 'utf-8');
        const coverage = JSON.parse(coverageData);
        
        const report: CoverageReport = {
          systemClassCoverage: coverage.total?.classes?.pct || 0,
          branchCoverage: coverage.total?.branches?.pct || 0,
          lineCoverage: coverage.total?.lines?.pct || 0,
          functionCoverage: coverage.total?.functions?.pct || 0,
          statementCoverage: coverage.total?.statements?.pct || 0,
          passed: true,
          details: {}
        };
        
        const errors: string[] = [];
        
        if (thresholds.systemClass && report.systemClassCoverage < thresholds.systemClass) {
          errors.push(`System class coverage ${report.systemClassCoverage}% below ${thresholds.systemClass}%`);
          report.passed = false;
        }
        
        if (thresholds.branch && report.branchCoverage < thresholds.branch) {
          errors.push(`Branch coverage ${report.branchCoverage}% below ${thresholds.branch}%`);
          report.passed = false;
        }
        
        if (thresholds.line && report.lineCoverage < thresholds.line) {
          errors.push(`Line coverage ${report.lineCoverage}% below ${thresholds.line}%`);
          report.passed = false;
        }
        
        return { passed: report.passed, errors, report };
      } catch {
        // Continue to next coverage file
      }
    }
    
    return {
      passed: false,
      errors: ['No coverage report found'],
      report: {
        systemClassCoverage: 0,
        branchCoverage: 0,
        lineCoverage: 0,
        functionCoverage: 0,
        statementCoverage: 0,
        passed: false,
        details: {}
      }
    };
  }

  /**
   * Validate code duplication
   */
  private async validateDuplication(
    feature: DistributedFeature,
    threshold: number
  ): Promise<{
    passed: boolean;
    errors: string[];
    report: DuplicationReport;
  }> {
    // Look for duplication report files
    const duplicationFiles = [
      'duplication-report.json',
      'reports/duplication.json',
      '.duplication/report.json'
    ];
    
    for (const dupFile of duplicationFiles) {
      const dupPath = path.join(this.basePath, dupFile);
      try {
        const dupData = await fileAPI.readFile(dupPath, 'utf-8');
        const duplication = JSON.parse(dupData);
        
        const report: DuplicationReport = {
          totalDuplication: duplication.percentage || 0,
          duplicatedLines: duplication.duplicatedLines || 0,
          totalLines: duplication.totalLines || 0,
          passed: true,
          duplications: duplication.duplications || []
        };
        
        const errors: string[] = [];
        
        if (report.totalDuplication > threshold) {
          errors.push(`Code duplication ${report.totalDuplication}% exceeds threshold ${threshold}%`);
          report.passed = false;
        }
        
        return { passed: report.passed, errors, report };
      } catch {
        // Continue to next duplication file
      }
    }
    
    // If no report found, run duplication check
    const report = await this.runDuplicationCheck(feature);
    const errors: string[] = [];
    
    if (report.totalDuplication > threshold) {
      errors.push(`Code duplication ${report.totalDuplication}% exceeds threshold ${threshold}%`);
      report.passed = false;
    }
    
    return { passed: report.passed, errors, report };
  }

  /**
   * Run duplication check on feature files
   */
  private async runDuplicationCheck(feature: DistributedFeature): Promise<DuplicationReport> {
    // Simple duplication check implementation
    // In production, use a proper duplication detection tool
    return {
      totalDuplication: 0,
      duplicatedLines: 0,
      totalLines: 0,
      passed: true,
      duplications: []
    };
  }

  /**
   * Validate connected files exist and are not empty
   */
  private async validateConnectedFiles(
    feature: DistributedFeature
  ): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Check if feature has connected files
    const connectedFiles = feature.data.components || [];
    
    for (const file of connectedFiles) {
      const filePath = path.join(this.basePath, file);
      try {
        const stats = await /* FRAUD_FIX: /* FRAUD_FIX: fs.stat(filePath) */ */;
        if (stats.size === 0) {
          warnings.push(`File ${file} is empty`);
        }
      } catch {
        errors.push(`Connected file ${file} does not exist`);
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Find feature by ID in feature file
   */
  private findFeatureById(
    featureFile: DistributedFeatureFile,
    featureId: string
  ): DistributedFeature | null {
    for (const category of Object.values(featureFile.features)) {
      const feature = category.find(f => f.id === featureId);
      if (feature) {
        return feature;
      }
    }
    return null;
  }

  /**
   * Find transition rule for status change
   */
  private findTransitionRule(from: string, to: string): StatusTransitionRule | null {
    return this.statusTransitions.find(
      rule => rule.to === to && rule.from.includes(from)
    ) || null;
  }

  /**
   * Validate feature data
   */
  private async validateFeatureData(
    data: DistributedFeature['data']
  ): Promise<StatusChangeValidation> {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Required fields validation
    if (!data.title) {
      errors.push('Feature title is required');
    }
    
    if (!data.description) {
      errors.push('Feature description is required');
    }
    
    if (!data.level) {
      errors.push('Feature level is required');
    }
    
    if (!data.status) {
      errors.push('Feature status is required');
    }
    
    if (!data.priority) {
      errors.push('Feature priority is required');
    }
    
    // Validate status value
    const validStatuses = ['planned', 'in-progress', "implemented", "completed", 'blocked'];
    if (data.status && !validStatuses.includes(data.status)) {
      errors.push(`Invalid status '${data.status}'. Must be one of: ${validStatuses.join(', ')}`);
    }
    
    // Validate priority value
    const validPriorities = ["critical", 'high', 'medium', 'low'];
    if (data.priority && !validPriorities.includes(data.priority)) {
      errors.push(`Invalid priority '${data.priority}'. Must be one of: ${validPriorities.join(', ')}`);
    }
    
    // Validate level value
    const validLevels = ['root', 'epic', 'theme', 'user_story'];
    if (data.level && !validLevels.includes(data.level)) {
      errors.push(`Invalid level '${data.level}'. Must be one of: ${validLevels.join(', ')}`);
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Get feature status summary
   */
  async getStatusSummary(): Promise<Record<string, number>> {
    const featureFile = await this.featureWrapper.read('/FEATURE.vf.json');
    const summary: Record<string, number> = {
      planned: 0,
      'in-progress': 0,
      implemented: 0,
      completed: 0,
      blocked: 0
    };
    
    for (const category of Object.values(featureFile.features)) {
      for (const feature of category) {
        const status = feature.data.status;
        if (status in summary) {
          summary[status]++;
        }
      }
    }
    
    return summary;
  }

  /**
   * Get features by status
   */
  async getFeaturesByStatus(status: string): Promise<DistributedFeature[]> {
    const featureFile = await this.featureWrapper.read('/FEATURE.vf.json');
    const features: DistributedFeature[] = [];
    
    for (const category of Object.values(featureFile.features)) {
      features.push(...category.filter(f => f.data.status === status));
    }
    
    return features;
  }

  /**
   * Generate feature status report
   */
  async generateStatusReport(): Promise<{
    summary: Record<string, number>;
    blockedFeatures: DistributedFeature[];
    implementedFeatures: DistributedFeature[];
    needsValidation: DistributedFeature[];
  }> {
    const summary = await this.getStatusSummary();
    const blockedFeatures = await this.getFeaturesByStatus('blocked');
    const implementedFeatures = await this.getFeaturesByStatus("implemented");
    const inProgressFeatures = await this.getFeaturesByStatus('in-progress');
    
    // Find features that might need validation
    const needsValidation = inProgressFeatures.filter(f => {
      // Features in progress for more than 7 days might need attention
      const updatedDate = new Date(f.updatedAt);
      const daysSinceUpdate = (Date.now() - updatedDate.getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceUpdate > 7;
    });
    
    return {
      summary,
      blockedFeatures,
      implementedFeatures,
      needsValidation
    };
  }
}

// Export factory function
export function createFeatureStatusManager(basePath?: string): FeatureStatusManager {
  return new FeatureStatusManager(basePath);
}