import { auditedFS } from '../../../infra_external-log-lib/pipe';
import { path } from '../../../infra_external-log-lib/src';
import { glob } from 'glob';

interface RuleSuggestionResult {
  retrospectiveFormat: RetrospectiveValidation;
  storyReportSteps: StoryReportValidation;
  ruleExtraction: RuleExtractionResult;
  knowledgeUpdates: KnowledgeUpdateResult;
  lessonsLearned: LessonsLearnedResult;
  processImprovements: ProcessImprovementResult;
  pass: boolean;
  summary: string;
}

interface RetrospectiveValidation {
  found: boolean;
  files: string[];
  missingRequiredSections: string[];
  formatValid: boolean;
  violations: ValidationViolation[];
}

interface StoryReportValidation {
  found: boolean;
  files: string[];
  missingRequiredFields: string[];
  stepsImplemented: boolean;
  violations: ValidationViolation[];
}

interface RuleExtractionResult {
  rulesFound: number;
  validRules: number;
  invalidRules: number;
  rules: ExtractedRule[];
  violations: ValidationViolation[];
}

interface KnowledgeUpdateResult {
  updatesFound: boolean;
  knowledgeFiles: string[];
  newKnowledge: string[];
  violations: ValidationViolation[];
}

interface LessonsLearnedResult {
  documented: boolean;
  sections: LessonSection[];
  quality: "excellent" | 'good' | "acceptable" | 'poor';
  violations: ValidationViolation[];
}

interface ProcessImprovementResult {
  suggestionsFound: number;
  suggestions: ProcessSuggestion[];
  violations: ValidationViolation[];
}

interface ValidationViolation {
  file: string;
  line?: number;
  type: string;
  message: string;
  severity: "critical" | 'high' | 'medium' | 'low';
}

interface ExtractedRule {
  name: string;
  category: string;
  description: string;
  rationale?: string;
  valid: boolean;
}

interface LessonSection {
  role: string;
  content: string;
  quality: string;
}

interface ProcessSuggestion {
  area: string;
  suggestion: string;
  impact: string;
}

export class RuleSuggestionAnalyzer {
  private requiredRetrospectiveSections: string[] = [];
  private requiredStoryReportFields: string[] = [];

  async analyze(request: any): Promise<RuleSuggestionResult> {
    this.requiredRetrospectiveSections = request.retrospectivePatterns?.requiredSections || [];
    this.requiredStoryReportFields = request.storyReportPatterns?.requiredFields || [];

    const results: any = {};
    let overallPass = true;

    // Run each check if enabled
    for (const check of request.checks) {
      if (!check.enabled) continue;

      switch (check.type) {
        case 'retrospective-format':
          results.retrospectiveFormat = await this.validateRetrospectiveFormat(
            request.targetPath,
            request.retrospectivePatterns?.filePatterns || []
          );
          if (!results.retrospectiveFormat.formatValid) overallPass = false;
          break;

        case 'story-report-steps':
          results.storyReportSteps = await this.validateStoryReportSteps(
            request.targetPath,
            request.storyReportPatterns?.filePatterns || []
          );
          if (!results.storyReportSteps.stepsImplemented) overallPass = false;
          break;

        case 'rule-extraction':
          results.ruleExtraction = await this.extractAndValidateRules(
            request.targetPath
          );
          if (results.ruleExtraction.invalidRules > 0) overallPass = false;
          break;

        case 'knowledge-updates':
          results.knowledgeUpdates = await this.checkKnowledgeUpdates(
            request.targetPath
          );
          break;

        case 'lessons-learned':
          results.lessonsLearned = await this.validateLessonsLearned(
            request.targetPath
          );
          if (results.lessonsLearned.quality === 'poor') overallPass = false;
          break;

        case 'process-improvements':
          results.processImprovements = await this.extractProcessImprovements(
            request.targetPath
          );
          break;
      }
    }

    return {
      ...results,
      pass: overallPass,
      summary: this.generateSummary(results, overallPass)
    };
  }

  private async validateRetrospectiveFormat(
    targetPath: string,
    filePatterns: string[]
  ): Promise<RetrospectiveValidation> {
    const files: string[] = [];
    const violations: ValidationViolation[] = [];

    // Find retrospective files
    for (const pattern of filePatterns) {
      const matches = await glob(path.join(targetPath, pattern), {
        ignore: ['**/node_modules/**']
      });
      files.push(...matches);
    }

    if (files.length === 0) {
      violations.push({
        file: targetPath,
        type: 'missing-retrospective',
        message: 'No retrospective document found',
        severity: 'high'
      });
      return {
        found: false,
        files: [],
        missingRequiredSections: this.requiredRetrospectiveSections,
        formatValid: false,
        violations
      };
    }

    // Validate each retrospective file
    const missingRequiredSections = new Set<string>(this.requiredRetrospectiveSections);
    
    for (const file of files) {
      const content = await auditedFS.readFile(file, 'utf8');
      const relativePath = path.relative(targetPath, file);

      // Check for required sections
      for (const section of this.requiredRetrospectiveSections) {
        if (content.includes(section)) {
          missingRequiredSections.delete(section);
        }
      }

      // Check for empty sections
      const lines = content.split('\n');
      let currentSection = '';
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Detect section headers
        if (line.startsWith('#') && this.requiredRetrospectiveSections.some(s => line.includes(s))) {
          currentSection = line;
        }
        
        // Check if section has content
        if (currentSection && i < lines.length - 1) {
          const nextFewLines = lines.slice(i + 1, i + 5).join(' ').trim();
          if (nextFewLines.length < 50 && !nextFewLines.includes('#')) {
            violations.push({
              file: relativePath,
              line: i + 1,
              type: 'empty-section',
              message: `Section "${currentSection}" appears to be empty or insufficient`,
              severity: 'medium'
            });
          }
        }
      }
    }

    return {
      found: true,
      files: files.map(f => path.relative(targetPath, f)),
      missingRequiredSections: Array.from(missingRequiredSections),
      formatValid: missingRequiredSections.size === 0 && violations.length === 0,
      violations
    };
  }

  private async validateStoryReportSteps(
    targetPath: string,
    filePatterns: string[]
  ): Promise<StoryReportValidation> {
    const files: string[] = [];
    const violations: ValidationViolation[] = [];

    // Find story report files
    for (const pattern of filePatterns) {
      const matches = await glob(path.join(targetPath, pattern), {
        ignore: ['**/node_modules/**']
      });
      files.push(...matches);
    }

    if (files.length === 0) {
      violations.push({
        file: targetPath,
        type: 'missing-story-report',
        message: 'No story report found',
        severity: 'medium'
      });
      return {
        found: false,
        files: [],
        missingRequiredFields: this.requiredStoryReportFields,
        stepsImplemented: false,
        violations
      };
    }

    // Validate each story report
    const missingRequiredFields = new Set<string>(this.requiredStoryReportFields);
    
    for (const file of files) {
      const content = await auditedFS.readFile(file, 'utf8');
      const relativePath = path.relative(targetPath, file);

      try {
        const report = JSON.parse(content);
        
        // Check for required fields
        for (const field of this.requiredStoryReportFields) {
          if (report[field] !== undefined) {
            missingRequiredFields.delete(field);
          }
        }

        // Validate specific fields
        if (report.status && !["completed", 'in-progress', 'pending'].includes(report.status)) {
          violations.push({
            file: relativePath,
            type: 'invalid-status',
            message: `Invalid status: ${report.status}`,
            severity: 'medium'
          });
        }

        if (report.coverage) {
          const coverage = report.coverage;
          if (coverage.line < 80 || coverage.branch < 70) {
            violations.push({
              file: relativePath,
              type: 'low-coverage',
              message: `Coverage below threshold: Line ${coverage.line}%, Branch ${coverage.branch}%`,
              severity: 'high'
            });
          }
        }

      } catch (error) {
        violations.push({
          file: relativePath,
          type: 'invalid-json',
          message: 'Failed to parse story report JSON',
          severity: "critical"
        });
      }
    }

    return {
      found: true,
      files: files.map(f => path.relative(targetPath, f)),
      missingRequiredFields: Array.from(missingRequiredFields),
      stepsImplemented: missingRequiredFields.size === 0 && violations.filter(v => v.severity === "critical").length === 0,
      violations
    };
  }

  private async extractAndValidateRules(targetPath: string): Promise<RuleExtractionResult> {
    const rules: ExtractedRule[] = [];
    const violations: ValidationViolation[] = [];
    
    // Find rule suggestion files
    const patterns = [
      '**/RULE_SUGGESTIONS.md',
      '**/rule-suggestions.md',
      '**/gen/doc/rule_suggestion/*.md',
      '**/retrospective.md'
    ];

    const files: string[] = [];
    for (const pattern of patterns) {
      const matches = await glob(path.join(targetPath, pattern), {
        ignore: ['**/node_modules/**']
      });
      files.push(...matches);
    }

    for (const file of files) {
      const content = await auditedFS.readFile(file, 'utf8');
      const relativePath = path.relative(targetPath, file);
      
      // Extract rules using regex patterns
      const rulePatterns = [
        /### Rule:\s*(.+)\n/g,
        /## Rule Name:\s*(.+)\n/g,
        /- \*\*Rule\*\*:\s*(.+)/g,
        /#### (.+Rule.+)\n/g
      ];

      for (const pattern of rulePatterns) {
        let match;
        while ((match = pattern.exec(content)) !== null) {
          const ruleName = match[1].trim();
          
          // Extract category and description
          const categoryMatch = content.match(new RegExp(`${ruleName}[\\s\\S]*?Category:\\s*(.+)`));
          const descriptionMatch = content.match(new RegExp(`${ruleName}[\\s\\S]*?Description:\\s*(.+)`));
          const rationaleMatch = content.match(new RegExp(`${ruleName}[\\s\\S]*?Rationale:\\s*(.+)`));

          const rule: ExtractedRule = {
            name: ruleName,
            category: categoryMatch ? categoryMatch[1].trim() : 'General',
            description: descriptionMatch ? descriptionMatch[1].trim() : '',
            rationale: rationaleMatch ? rationaleMatch[1].trim() : undefined,
            valid: true
          };

          // Validate rule
          if (!rule.description || rule.description.length < 10) {
            rule.valid = false;
            violations.push({
              file: relativePath,
              type: 'incomplete-rule',
              message: `Rule "${ruleName}" lacks proper description`,
              severity: 'medium'
            });
          }

          rules.push(rule);
        }
      }
    }

    const validRules = rules.filter(r => r.valid).length;
    const invalidRules = rules.filter(r => !r.valid).length;

    return {
      rulesFound: rules.length,
      validRules,
      invalidRules,
      rules,
      violations
    };
  }

  private async checkKnowledgeUpdates(targetPath: string): Promise<KnowledgeUpdateResult> {
    const knowledgeFiles: string[] = [];
    const newKnowledge: string[] = [];
    const violations: ValidationViolation[] = [];

    // Look for knowledge base updates
    const patterns = [
      '**/KNOW_HOW.md',
      '**/know-how.md',
      '**/docs/knowledge/*.md',
      '**/README.md'
    ];

    for (const pattern of patterns) {
      const matches = await glob(path.join(targetPath, pattern), {
        ignore: ['**/node_modules/**']
      });
      knowledgeFiles.push(...matches);
    }

    // Check for recent updates (simplified - in real implementation would check git history)
    for (const file of knowledgeFiles) {
      const content = await auditedFS.readFile(file, 'utf8');
      
      // Look for update markers
      if (content.includes('<!-- Updated:') || content.includes('Last Updated:')) {
        newKnowledge.push(path.relative(targetPath, file));
      }
    }

    return {
      updatesFound: newKnowledge.length > 0,
      knowledgeFiles: knowledgeFiles.map(f => path.relative(targetPath, f)),
      newKnowledge,
      violations
    };
  }

  private async validateLessonsLearned(targetPath: string): Promise<LessonsLearnedResult> {
    const sections: LessonSection[] = [];
    const violations: ValidationViolation[] = [];
    
    // Find retrospective files containing lessons learned
    const files = await glob(path.join(targetPath, '**/retrospective.md'), {
      ignore: ['**/node_modules/**']
    });

    if (files.length === 0) {
      return {
        documented: false,
        sections: [],
        quality: 'poor',
        violations: [{
          file: targetPath,
          type: 'missing-lessons',
          message: 'No lessons learned documentation found',
          severity: 'high'
        }]
      };
    }

    for (const file of files) {
      const content = await auditedFS.readFile(file, 'utf8');
      const lines = content.split('\n');
      
      // Extract lessons learned by role
      const roles = ["Developer", 'QA Engineer', 'Product Owner', 'System Architect', 'DevOps'];
      
      for (const role of roles) {
        const rolePattern = new RegExp(`### ${role} Perspective[\\s\\S]*?Lessons Learned:([\\s\\S]*?)(?=###|$)`);
        const match = content.match(rolePattern);
        
        if (match && match[1]) {
          const lessonContent = match[1].trim();
          const quality = this.assessLessonQuality(lessonContent);
          
          sections.push({
            role,
            content: lessonContent,
            quality
          });
        }
      }
    }

    // Assess overall quality
    const quality = this.assessOverallLessonQuality(sections);

    return {
      documented: sections.length > 0,
      sections,
      quality,
      violations
    };
  }

  private assessLessonQuality(content: string): string {
    const wordCount = content.split(/\s+/).length;
    
    if (wordCount < 20) return 'poor';
    if (wordCount < 50) return "acceptable";
    if (wordCount < 100) return 'good';
    return "excellent";
  }

  private assessOverallLessonQuality(sections: LessonSection[]): "excellent" | 'good' | "acceptable" | 'poor' {
    if (sections.length === 0) return 'poor';
    
    const qualityScores = {
      "excellent": 4,
      'good': 3,
      "acceptable": 2,
      'poor': 1
    };
    
    const avgScore = sections.reduce((sum, s) => sum + qualityScores[s.quality as keyof typeof qualityScores], 0) / sections.length;
    
    if (avgScore >= 3.5) return "excellent";
    if (avgScore >= 2.5) return 'good';
    if (avgScore >= 1.5) return "acceptable";
    return 'poor';
  }

  private async extractProcessImprovements(targetPath: string): Promise<ProcessImprovementResult> {
    const suggestions: ProcessSuggestion[] = [];
    const violations: ValidationViolation[] = [];
    
    // Look for process improvement suggestions in retrospectives
    const files = await glob(path.join(targetPath, '**/retrospective.md'), {
      ignore: ['**/node_modules/**']
    });

    for (const file of files) {
      const content = await auditedFS.readFile(file, 'utf8');
      
      // Extract process improvements
      const improvementPatterns = [
        /Process Improvements?:([^#]+)/g,
        /Recommendations for Future Stories:([^#]+)/g,
        /Areas for Improvement:([^#]+)/g
      ];

      for (const pattern of improvementPatterns) {
        let match;
        while ((match = pattern.exec(content)) !== null) {
          const improvementText = match[1].trim();
          const items = improvementText.split(/\n-/).filter(item => item.trim());
          
          for (const item of items) {
            if (item.length > 10) {
              suggestions.push({
                area: 'Process',
                suggestion: item.trim().replace(/^-\s*/, ''),
                impact: 'Medium'
              });
            }
          }
        }
      }
    }

    return {
      suggestionsFound: suggestions.length,
      suggestions,
      violations
    };
  }

  private generateSummary(results: any, pass: boolean): string {
    const parts: string[] = [];
    
    if (results.retrospectiveFormat) {
      parts.push(`Retrospective: ${results.retrospectiveFormat.formatValid ? '✅' : '❌'}`);
    }
    
    if (results.storyReportSteps) {
      parts.push(`Story Report: ${results.storyReportSteps.stepsImplemented ? '✅' : '❌'}`);
    }
    
    if (results.ruleExtraction) {
      parts.push(`Rules: ${results.ruleExtraction.validRules}/${results.ruleExtraction.rulesFound} valid`);
    }
    
    if (results.lessonsLearned) {
      parts.push(`Lessons: ${results.lessonsLearned.quality}`);
    }
    
    return `Overall: ${pass ? 'PASS' : 'FAIL'} | ${parts.join(' | ')}`;
  }
}