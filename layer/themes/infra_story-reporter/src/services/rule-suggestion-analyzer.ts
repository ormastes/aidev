import * as fs from 'fs/promises';
import { path } from '../../../infra_external-log-lib/src';

interface RuleSuggestionCheck {
  type: string;
  passed: boolean;
  message: string;
  severity: 'high' | 'medium' | 'low';
  details?: any;
}

interface RetrospectiveAnalysis {
  filePath: string;
  hasRequiredSections: boolean;
  missingSections: string[];
  extractedRules: string[];
  lessonsLearned: string[];
  knowHowUpdates: string[];
  processImprovements: string[];
}

interface StoryReportAnalysis {
  filePath: string;
  hasRequiredFields: boolean;
  missingFields: string[];
  status?: string;
  coverage?: number;
  testsPassed?: boolean;
  fraudCheckPassed?: boolean;
}

export class RuleSuggestionAnalyzer {
  private requiredRetrospectiveSections = [
    'Product Owner Perspective',
    'Developer Perspective',
    'QA Engineer Perspective',
    'System Architect Perspective',
    'DevOps Perspective',
    'Key Takeaways',
    'Lessons Learned',
    'Rule Suggestions',
    'Know-How Updates'
  ];

  private requiredStoryReportFields = [
    'storyId',
    'status',
    'coverage',
    'tests',
    'fraudCheck'
  ];

  async analyzeRetrospectives(targetPath: string, patterns: string[]): Promise<RetrospectiveAnalysis[]> {
    const results: RetrospectiveAnalysis[] = [];

    for (const pattern of patterns) {
      const files = await this.findFiles(targetPath, pattern);
      
      for (const file of files) {
        const analysis = await this.analyzeRetrospectiveFile(file);
        results.push(analysis);
      }
    }

    return results;
  }

  async analyzeStoryReports(targetPath: string, patterns: string[]): Promise<StoryReportAnalysis[]> {
    const results: StoryReportAnalysis[] = [];

    for (const pattern of patterns) {
      const files = await this.findFiles(targetPath, pattern);
      
      for (const file of files) {
        const analysis = await this.analyzeStoryReportFile(file);
        results.push(analysis);
      }
    }

    return results;
  }

  private async analyzeRetrospectiveFile(filePath: string): Promise<RetrospectiveAnalysis> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.split('\n');

      // Check for required sections
      const foundSections = new Set<string>();
      const extractedRules: string[] = [];
      const lessonsLearned: string[] = [];
      const knowHowUpdates: string[] = [];
      const processImprovements: string[] = [];

      let currentSection = '';
      let inRuleSection = false;
      let inLessonsSection = false;
      let inKnowHowSection = false;

      for (const line of lines) {
        // Check for section headers
        for (const section of this.requiredRetrospectiveSections) {
          if (line.includes(section)) {
            foundSections.add(section);
            currentSection = section;
            inRuleSection = section === 'Rule Suggestions';
            inLessonsSection = section === 'Lessons Learned';
            inKnowHowSection = section === 'Know-How Updates';
          }
        }

        // Extract content based on current section
        if (inRuleSection && line.trim().startsWith('-')) {
          extractedRules.push(line.trim().substring(1).trim());
        } else if (inLessonsSection && line.trim().startsWith('-')) {
          lessonsLearned.push(line.trim().substring(1).trim());
        } else if (inKnowHowSection && line.trim().startsWith('-')) {
          knowHowUpdates.push(line.trim().substring(1).trim());
        }

        // Look for process improvements throughout
        if (line.toLowerCase().includes('process improvement') || 
            line.toLowerCase().includes('should be improved')) {
          processImprovements.push(line.trim());
        }
      }

      const missingSections = this.requiredRetrospectiveSections.filter(
        section => !foundSections.has(section)
      );

      return {
        filePath,
        hasRequiredSections: missingSections.length === 0,
        missingSections,
        extractedRules,
        lessonsLearned,
        knowHowUpdates,
        processImprovements
      };
    } catch (error) {
      return {
        filePath,
        hasRequiredSections: false,
        missingSections: this.requiredRetrospectiveSections,
        extractedRules: [],
        lessonsLearned: [],
        knowHowUpdates: [],
        processImprovements: []
      };
    }
  }

  private async analyzeStoryReportFile(filePath: string): Promise<StoryReportAnalysis> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const report = JSON.parse(content);

      const missingFields = this.requiredStoryReportFields.filter(
        field => !(field in report)
      );

      return {
        filePath,
        hasRequiredFields: missingFields.length === 0,
        missingFields,
        status: report.status,
        coverage: report.coverage?.percentage || report.coverage,
        testsPassed: report.tests?.passed || false,
        fraudCheckPassed: report.fraudCheck?.passed || false
      };
    } catch (error) {
      return {
        filePath,
        hasRequiredFields: false,
        missingFields: this.requiredStoryReportFields,
      };
    }
  }

  private async findFiles(basePath: string, pattern: string): Promise<string[]> {
    try {
      // Simple pattern matching - look for exact filename matches
      const fileName = pattern.replace('**/', '');
      const files: string[] = [];
      
      await this.searchDirectory(basePath, fileName, files);
      return files;
    } catch (error) {
      return [];
    }
  }

  private async searchDirectory(dir: string, fileName: string, files: string[]): Promise<void> {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          await this.searchDirectory(fullPath, fileName, files);
        } else if (entry.name === fileName || entry.name.endsWith(fileName.replace('*', ''))) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Skip directories we can't read
    }
  }

  generateReport(
    retrospectives: RetrospectiveAnalysis[],
    storyReports: StoryReportAnalysis[],
    mode: string
  ): {
    checks: RuleSuggestionCheck[];
    summary: {
      totalChecks: number;
      passed: number;
      failed: number;
      highSeverityFailed: number;
    };
    details: {
      retrospectives: RetrospectiveAnalysis[];
      storyReports: StoryReportAnalysis[];
    };
  } {
    const checks: RuleSuggestionCheck[] = [];

    // Check retrospective format
    const retrospectivesWithMissingSections = retrospectives.filter(r => !r.hasRequiredSections);
    checks.push({
      type: 'retrospective-format',
      passed: retrospectivesWithMissingSections.length === 0,
      message: retrospectivesWithMissingSections.length === 0
        ? 'All retrospectives have required sections'
        : `${retrospectivesWithMissingSections.length} retrospective(s) missing required sections`,
      severity: 'high',
      details: retrospectivesWithMissingSections.map(r => ({
        file: r.filePath,
        missing: r.missingSections
      }))
    });

    // Check story report steps
    const reportsWithMissingFields = storyReports.filter(r => !r.hasRequiredFields);
    checks.push({
      type: 'story-report-steps',
      passed: reportsWithMissingFields.length === 0,
      message: reportsWithMissingFields.length === 0
        ? 'All story reports have required fields'
        : `${reportsWithMissingFields.length} story report(s) missing required fields`,
      severity: 'high',
      details: reportsWithMissingFields.map(r => ({
        file: r.filePath,
        missing: r.missingFields
      }))
    });

    // Check rule extraction
    const totalRules = retrospectives.reduce((sum, r) => sum + r.extractedRules.length, 0);
    checks.push({
      type: 'rule-extraction',
      passed: totalRules > 0,
      message: totalRules > 0
        ? `Found ${totalRules} rule suggestions`
        : 'No rule suggestions found in retrospectives',
      severity: 'medium',
      details: retrospectives.filter(r => r.extractedRules.length > 0).map(r => ({
        file: r.filePath,
        rules: r.extractedRules
      }))
    });

    // Check knowledge updates
    const totalKnowHow = retrospectives.reduce((sum, r) => sum + r.knowHowUpdates.length, 0);
    checks.push({
      type: 'knowledge-updates',
      passed: totalKnowHow > 0,
      message: totalKnowHow > 0
        ? `Found ${totalKnowHow} know-how updates`
        : 'No know-how updates found',
      severity: 'medium',
      details: retrospectives.filter(r => r.knowHowUpdates.length > 0).map(r => ({
        file: r.filePath,
        updates: r.knowHowUpdates
      }))
    });

    // Check lessons learned
    const totalLessons = retrospectives.reduce((sum, r) => sum + r.lessonsLearned.length, 0);
    checks.push({
      type: 'lessons-learned',
      passed: totalLessons > 0,
      message: totalLessons > 0
        ? `Found ${totalLessons} lessons learned`
        : 'No lessons learned documented',
      severity: 'medium',
      details: retrospectives.filter(r => r.lessonsLearned.length > 0).map(r => ({
        file: r.filePath,
        lessons: r.lessonsLearned
      }))
    });

    // Check process improvements
    const totalImprovements = retrospectives.reduce((sum, r) => sum + r.processImprovements.length, 0);
    checks.push({
      type: 'process-improvements',
      passed: true, // This is informational
      message: `Found ${totalImprovements} process improvement suggestions`,
      severity: 'low',
      details: retrospectives.filter(r => r.processImprovements.length > 0).map(r => ({
        file: r.filePath,
        improvements: r.processImprovements
      }))
    });

    const failedChecks = checks.filter(c => !c.passed);
    const highSeverityFailed = failedChecks.filter(c => c.severity === 'high').length;

    return {
      checks,
      summary: {
        totalChecks: checks.length,
        passed: checks.filter(c => c.passed).length,
        failed: failedChecks.length,
        highSeverityFailed
      },
      details: {
        retrospectives,
        storyReports
      }
    };
  }
}