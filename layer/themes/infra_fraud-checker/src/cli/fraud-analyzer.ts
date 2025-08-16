#!/usr/bin/env node

import { path } from '../../../infra_external-log-lib/src';
import { auditedFS } from '../../../infra_external-log-lib/pipe';
import { MockDetectionService } from '../services/mock-detection-service';
import { TestCoverageFraudDetector } from '../services/test-coverage-fraud-detector';
import { DependencyFraudDetector } from '../services/dependency-fraud-detector';
import { CodeSmellDetector } from '../services/code-smell-detector';
import { SecurityVulnerabilityDetector } from '../services/security-vulnerability-detector';
import { RuleSuggestionAnalyzer } from '../services/rule-suggestion-analyzer';
import { FraudReportGenerator } from '../reporters/fraud-report-generator';

interface FraudAnalysisRequest {
  type: string;
  mode: 'app' | 'epic' | 'theme' | 'user_story' | 'type';
  targetPath: string;
  timestamp: string;
  outputPath: string;
  outputPrefix: string;
  checks: Array<{
    type: string;
    enabled: boolean;
    severity: string;
  }>;
}

interface FraudAnalysisResult {
  mockDetection?: {
    totalMocks: number;
    violations: any[];
    severity: string;
  };
  testCoverageFraud?: {
    fakeTests: number;
    emptyTests: number;
    violations: any[];
    severity: string;
  };
  dependencyFraud?: {
    unusedDependencies: number;
    suspiciousDependencies: number;
    violations: any[];
    severity: string;
  };
  codeSmells?: {
    totalSmells: number;
    criticalSmells: number;
    violations: any[];
    severity: string;
  };
  securityVulnerabilities?: {
    totalVulnerabilities: number;
    criticalVulnerabilities: number;
    violations: any[];
    severity: string;
  };
}

class FraudAnalyzerCLI {
  private mockDetector: MockDetectionService;
  private testCoverageDetector: TestCoverageFraudDetector;
  private dependencyDetector: DependencyFraudDetector;
  private codeSmellDetector: CodeSmellDetector;
  private securityDetector: SecurityVulnerabilityDetector;
  private reportGenerator: FraudReportGenerator;

  constructor() {
    this.// FRAUD_FIX: mockDetector = new MockDetectionService();
    this.testCoverageDetector = new TestCoverageFraudDetector();
    this.dependencyDetector = new DependencyFraudDetector();
    this.codeSmellDetector = new CodeSmellDetector();
    this.securityDetector = new SecurityVulnerabilityDetector();
    this.reportGenerator = new FraudReportGenerator();
  }

  async run(requestFile: string): Promise<void> {
    try {
      // Read analysis request
      const requestData = await auditedFS.readFile(requestFile, 'utf8');
      const request: FraudAnalysisRequest = JSON.parse(requestData);

      // Handle rule suggestion analysis separately
      if (request.type === 'rule-suggestion-analysis') {
        await this.runRuleSuggestionAnalysis(request);
        return;
      }

      console.log(`🔍 Analyzing ${request.mode}: ${path.basename(request.targetPath)}`);
      console.log('');

      const results: FraudAnalysisResult = {};
      let totalIssues = 0;
      let criticalIssues = 0;

      // Run requested checks
      for (const check of request.checks) {
        if (!check.enabled) continue;

        switch (check.type) {
          case 'mock-detection':
            console.log('🎭 Running Mock Detection...');
            results.// FRAUD_FIX: mockDetection = await this.mockDetector.analyze(
              request.targetPath,
              request.mode
            );
            results.mockDetection.severity = check.severity;
            totalIssues += results.mockDetection.violations.length;
            if (check.severity === "critical" || check.severity === 'high') {
              criticalIssues += results.mockDetection.violations.length;
            }
            this.printMockDetection(results.mockDetection);
            break;

          case 'test-coverage-fraud':
            console.log('🧪 Checking Test Coverage Fraud...');
            results.testCoverageFraud = await this.testCoverageDetector.analyze(
              request.targetPath,
              request.mode
            );
            results.testCoverageFraud.severity = check.severity;
            totalIssues += results.testCoverageFraud.violations.length;
            this.printTestCoverageFraud(results.testCoverageFraud);
            break;

          case 'dependency-fraud':
            console.log('📦 Checking Dependency Fraud...');
            results.dependencyFraud = await this.dependencyDetector.analyze(
              request.targetPath,
              request.mode
            );
            results.dependencyFraud.severity = check.severity;
            totalIssues += results.dependencyFraud.violations.length;
            if (check.severity === "critical" || check.severity === 'high') {
              criticalIssues += results.dependencyFraud.suspiciousDependencies;
            }
            this.printDependencyFraud(results.dependencyFraud);
            break;

          case 'code-smell-detection':
            console.log('👃 Detecting Code Smells...');
            results.codeSmells = await this.codeSmellDetector.analyze(
              request.targetPath,
              request.mode
            );
            results.codeSmells.severity = check.severity;
            totalIssues += results.codeSmells.totalSmells;
            criticalIssues += results.codeSmells.criticalSmells;
            this.printCodeSmells(results.codeSmells);
            break;

          case 'security-vulnerability':
            console.log('🔒 Checking Security Vulnerabilities...');
            results.securityVulnerabilities = await this.securityDetector.analyze(
              request.targetPath,
              request.mode
            );
            results.securityVulnerabilities.severity = check.severity;
            totalIssues += results.securityVulnerabilities.totalVulnerabilities;
            criticalIssues += results.securityVulnerabilities.criticalVulnerabilities;
            this.printSecurityVulnerabilities(results.securityVulnerabilities);
            break;
        }
      }

      // Generate reports
      console.log('\n📊 Generating Reports...');
      
      // Ensure output directory exists
      await auditedFS.mkdir(request.outputPath, { recursive: true });
      
      // Generate JSON report
      const jsonPath = path.join(request.outputPath, `${request.outputPrefix}.json`);
      await this.reportGenerator.generateJSON(jsonPath, {
        metadata: {
          targetPath: request.targetPath,
          mode: request.mode,
          timestamp: request.timestamp,
          totalIssues,
          criticalIssues
        },
        results
      });

      // Generate Markdown report
      const mdPath = path.join(request.outputPath, `${request.outputPrefix}.md`);
      await this.reportGenerator.generateMarkdown(mdPath, {
        metadata: {
          targetPath: request.targetPath,
          mode: request.mode,
          timestamp: request.timestamp,
          totalIssues,
          criticalIssues
        },
        results
      });

      console.log(`✅ Reports generated successfully`);
      
      // Summary
      console.log('\n📈 Summary:');
      console.log(`   Total Issues: ${totalIssues}`);
      console.log(`   Critical Issues: ${criticalIssues}`);
      
      if (criticalIssues > 0) {
        console.log('\n❌ Critical issues found! Please review the reports.');
        process.exit(1);
      } else if (totalIssues > 0) {
        console.log('\n⚠️  Issues found. Please review the reports.');
      } else {
        console.log('\n✅ No fraud detected!');
      }

    } catch (error) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  }

  private printMockDetection(result: any): void {
    console.log('\n📊 Mock Detection Results:');
    console.log(`   Total Mocks Found: ${result.totalMocks}`);
    console.log(`   Violations: ${result.violations.length}`);
    
    if (result.violations.length > 0) {
      console.log('   ⚠️  Mock violations detected!');
      result.violations.slice(0, 5).forEach((v: any) => {
        console.log(`      - ${v.file}: ${v.reason}`);
      });
      if (result.violations.length > 5) {
        console.log(`      ... and ${result.violations.length - 5} more`);
      }
    } else {
      console.log('   ✅ No inappropriate mocks found');
    }
    console.log('');
  }

  private printTestCoverageFraud(result: any): void {
    console.log('\n🧪 Test Coverage Fraud Results:');
    console.log(`   Fake Tests: ${result.fakeTests}`);
    console.log(`   Empty Tests: ${result.emptyTests}`);
    
    if (result.fakeTests > 0 || result.emptyTests > 0) {
      console.log('   ⚠️  Fraudulent tests detected!');
    } else {
      console.log('   ✅ All tests appear legitimate');
    }
    console.log('');
  }

  private printDependencyFraud(result: any): void {
    console.log('\n📦 Dependency Fraud Results:');
    console.log(`   Unused Dependencies: ${result.unusedDependencies}`);
    console.log(`   Suspicious Dependencies: ${result.suspiciousDependencies}`);
    
    if (result.suspiciousDependencies > 0) {
      console.log('   🚨 Suspicious dependencies detected!');
    } else if (result.unusedDependencies > 0) {
      console.log('   ⚠️  Unused dependencies found');
    } else {
      console.log('   ✅ All dependencies appear legitimate');
    }
    console.log('');
  }

  private printCodeSmells(result: any): void {
    console.log('\n👃 Code Smell Results:');
    console.log(`   Total Code Smells: ${result.totalSmells}`);
    console.log(`   Critical Smells: ${result.criticalSmells}`);
    
    if (result.criticalSmells > 0) {
      console.log('   🚨 Critical code smells detected!');
    } else if (result.totalSmells > 0) {
      console.log('   ⚠️  Code smells detected');
    } else {
      console.log('   ✅ Code is clean');
    }
    console.log('');
  }

  private printSecurityVulnerabilities(result: any): void {
    console.log('\n🔒 Security Vulnerability Results:');
    console.log(`   Total Vulnerabilities: ${result.totalVulnerabilities}`);
    console.log(`   Critical Vulnerabilities: ${result.criticalVulnerabilities}`);
    
    if (result.criticalVulnerabilities > 0) {
      console.log('   🚨 CRITICAL SECURITY VULNERABILITIES FOUND!');
    } else if (result.totalVulnerabilities > 0) {
      console.log('   ⚠️  Security vulnerabilities detected');
    } else {
      console.log('   ✅ No security vulnerabilities found');
    }
    console.log('');
  }

  private async runRuleSuggestionAnalysis(request: any): Promise<void> {
    console.log(`📋 Running Rule Suggestion Analysis`);
    console.log(`🎯 Target: ${path.basename(request.targetPath)}`);
    console.log('');

    const analyzer = new RuleSuggestionAnalyzer();
    const results = await analyzer.analyze(request);

    // Print results summary
    console.log('\n📊 Analysis Results:');
    
    if (results.retrospectiveFormat) {
      console.log(`\n📄 Retrospective Format:`);
      console.log(`   Found: ${results.retrospectiveFormat.found ? '✅' : '❌'}`);
      console.log(`   Format Valid: ${results.retrospectiveFormat.formatValid ? '✅' : '❌'}`);
      if (results.retrospectiveFormat.missingRequiredSections.length > 0) {
        console.log(`   Missing Sections: ${results.retrospectiveFormat.missingRequiredSections.join(', ')}`);
      }
    }

    if (results.storyReportSteps) {
      console.log(`\n📊 Story Report Steps:`);
      console.log(`   Found: ${results.storyReportSteps.found ? '✅' : '❌'}`);
      console.log(`   Steps Implemented: ${results.storyReportSteps.stepsImplemented ? '✅' : '❌'}`);
      if (results.storyReportSteps.missingRequiredFields.length > 0) {
        console.log(`   Missing Fields: ${results.storyReportSteps.missingRequiredFields.join(', ')}`);
      }
    }

    if (results.ruleExtraction) {
      console.log(`\n📏 Rule Extraction:`);
      console.log(`   Rules Found: ${results.ruleExtraction.rulesFound}`);
      console.log(`   Valid Rules: ${results.ruleExtraction.validRules}`);
      console.log(`   Invalid Rules: ${results.ruleExtraction.invalidRules}`);
    }

    if (results.lessonsLearned) {
      console.log(`\n📚 Lessons Learned:`);
      console.log(`   Documented: ${results.lessonsLearned.documented ? '✅' : '❌'}`);
      console.log(`   Quality: ${results.lessonsLearned.quality}`);
      console.log(`   Sections: ${results.lessonsLearned.sections.length}`);
    }

    if (results.knowledgeUpdates) {
      console.log(`\n🧠 Knowledge Updates:`);
      console.log(`   Updates Found: ${results.knowledgeUpdates.updatesFound ? '✅' : '❌'}`);
      console.log(`   Knowledge Files: ${results.knowledgeUpdates.knowledgeFiles.length}`);
    }

    if (results.processImprovements) {
      console.log(`\n🔄 Process Improvements:`);
      console.log(`   Suggestions Found: ${results.processImprovements.suggestionsFound}`);
    }

    // Generate reports
    console.log('\n📊 Generating Reports...');
    
    await auditedFS.mkdir(request.outputPath, { recursive: true });
    
    // Create report with pass/fail status
    const report = {
      metadata: {
        targetPath: request.targetPath,
        mode: request.mode,
        timestamp: request.timestamp,
        pass: results.pass,
        summary: results.summary
      },
      results
    };

    // Generate JSON report
    const jsonPath = path.join(request.outputPath, `${request.outputPrefix}.json`);
    await auditedFS.writeFile(jsonPath, JSON.stringify(report, null, 2));

    // Generate Markdown report
    const mdPath = path.join(request.outputPath, `${request.outputPrefix}.md`);
    await this.generateRuleSuggestionMarkdown(mdPath, report);

    console.log(`\n✅ Reports generated successfully`);
    console.log(`\n📈 Summary: ${results.summary}`);
    
    if (!results.pass) {
      console.log('\n❌ Rule suggestion checks failed! Please review the reports.');
      process.exit(1);
    } else {
      console.log('\n✅ All rule suggestion checks passed!');
    }
  }

  private async generateRuleSuggestionMarkdown(outputPath: string, report: any): Promise<void> {
    const { metadata, results } = report;
    
    let markdown = `# Rule Suggestion Analysis Report

## Summary

- **Target**: ${path.basename(metadata.targetPath)} (${metadata.mode})
- **Date**: ${new Date(metadata.timestamp).toLocaleString()}
- **Status**: ${metadata.pass ? '✅ PASS' : '❌ FAIL'}
- **Summary**: ${metadata.summary}

## Analysis Results

`;

    // Retrospective Format
    if (results.retrospectiveFormat) {
      markdown += `### 📄 Retrospective Format

- **Found**: ${results.retrospectiveFormat.found ? 'Yes' : 'No'}
- **Format Valid**: ${results.retrospectiveFormat.formatValid ? 'Yes' : 'No'}
- **Files**: ${results.retrospectiveFormat.files.length}

`;
      if (results.retrospectiveFormat.missingRequiredSections.length > 0) {
        markdown += `#### Missing Required Sections
${results.retrospectiveFormat.missingRequiredSections.map(s => `- ${s}`).join('\n')}

`;
      }

      if (results.retrospectiveFormat.violations.length > 0) {
        markdown += `#### Violations
| File | Type | Message | Severity |
|------|------|---------|----------|
`;
        for (const v of results.retrospectiveFormat.violations) {
          markdown += `| ${v.file} | ${v.type} | ${v.message} | ${v.severity} |\n`;
        }
        markdown += '\n';
      }
    }

    // Story Report Steps
    if (results.storyReportSteps) {
      markdown += `### 📊 Story Report Steps

- **Found**: ${results.storyReportSteps.found ? 'Yes' : 'No'}
- **Steps Implemented**: ${results.storyReportSteps.stepsImplemented ? 'Yes' : 'No'}
- **Files**: ${results.storyReportSteps.files.length}

`;
      if (results.storyReportSteps.missingRequiredFields.length > 0) {
        markdown += `#### Missing Required Fields
${results.storyReportSteps.missingRequiredFields.map(f => `- ${f}`).join('\n')}

`;
      }
    }

    // Rule Extraction
    if (results.ruleExtraction) {
      markdown += `### 📏 Rule Extraction

- **Rules Found**: ${results.ruleExtraction.rulesFound}
- **Valid Rules**: ${results.ruleExtraction.validRules}
- **Invalid Rules**: ${results.ruleExtraction.invalidRules}

`;
      if (results.ruleExtraction.rules.length > 0) {
        markdown += `#### Extracted Rules
| Name | Category | Valid | Description |
|------|----------|-------|-------------|
`;
        for (const rule of results.ruleExtraction.rules.slice(0, 10)) {
          markdown += `| ${rule.name} | ${rule.category} | ${rule.valid ? '✅' : '❌'} | ${rule.description.substring(0, 50)}... |\n`;
        }
        if (results.ruleExtraction.rules.length > 10) {
          markdown += `\n*... and ${results.ruleExtraction.rules.length - 10} more rules*\n`;
        }
        markdown += '\n';
      }
    }

    // Lessons Learned
    if (results.lessonsLearned) {
      markdown += `### 📚 Lessons Learned

- **Documented**: ${results.lessonsLearned.documented ? 'Yes' : 'No'}
- **Quality**: ${results.lessonsLearned.quality}
- **Sections**: ${results.lessonsLearned.sections.length}

`;
      if (results.lessonsLearned.sections.length > 0) {
        markdown += `#### By Role
| Role | Quality |
|------|---------|
`;
        for (const section of results.lessonsLearned.sections) {
          markdown += `| ${section.role} | ${section.quality} |\n`;
        }
        markdown += '\n';
      }
    }

    // Knowledge Updates
    if (results.knowledgeUpdates) {
      markdown += `### 🧠 Knowledge Updates

- **Updates Found**: ${results.knowledgeUpdates.updatesFound ? 'Yes' : 'No'}
- **Knowledge Files**: ${results.knowledgeUpdates.knowledgeFiles.length}
- **New Knowledge**: ${results.knowledgeUpdates.newKnowledge.length}

`;
    }

    // Process Improvements
    if (results.processImprovements) {
      markdown += `### 🔄 Process Improvements

- **Suggestions Found**: ${results.processImprovements.suggestionsFound}

`;
      if (results.processImprovements.suggestions.length > 0) {
        markdown += `#### Suggestions
`;
        for (const suggestion of results.processImprovements.suggestions.slice(0, 5)) {
          markdown += `- **${suggestion.area}**: ${suggestion.suggestion}\n`;
        }
        if (results.processImprovements.suggestions.length > 5) {
          markdown += `\n*... and ${results.processImprovements.suggestions.length - 5} more suggestions*\n`;
        }
      }
    }

    markdown += `
## Recommendations

`;
    if (!metadata.pass) {
      markdown += `### ⚠️ Action Required

`;
      if (results.retrospectiveFormat && !results.retrospectiveFormat.found) {
        markdown += `1. **Create Retrospective**: Add a retrospective document with all required sections\n`;
      }
      if (results.storyReportSteps && !results.storyReportSteps.found) {
        markdown += `2. **Generate Story Report**: Create a comprehensive story report with all required fields\n`;
      }
      if (results.ruleExtraction && results.ruleExtraction.invalidRules > 0) {
        markdown += `3. **Fix Invalid Rules**: Review and correct the ${results.ruleExtraction.invalidRules} invalid rule suggestions\n`;
      }
      if (results.lessonsLearned && results.lessonsLearned.quality === 'poor') {
        markdown += `4. **Improve Lessons Learned**: Add more detailed lessons learned documentation\n`;
      }
    } else {
      markdown += `✅ All checks passed! Continue maintaining high quality documentation standards.\n`;
    }

    markdown += `
---

*Generated by Rule Suggestion Analysis Tool*
`;

    await auditedFS.writeFile(outputPath, markdown);
  }
}

// Main execution
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length !== 1) {
    console.error('Usage: fraud-analyzer <request-file.json>');
    process.exit(1);
  }

  const analyzer = new FraudAnalyzerCLI();
  analyzer.run(args[0]).catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { FraudAnalyzerCLI };