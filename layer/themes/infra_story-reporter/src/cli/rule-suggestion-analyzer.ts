#!/usr/bin/env node

import * as fs from 'fs/promises';
import { path } from '../../../infra_external-log-lib/src';
import { RuleSuggestionAnalyzer } from '../services/rule-suggestion-analyzer';
import { getFileAPI, FileType } from '../../../infra_external-log-lib/pipe';

const fileAPI = getFileAPI();


interface AnalysisRequest {
  type: string;
  mode: 'app' | 'epic' | 'theme' | 'user_story';
  targetPath: string;
  timestamp: string;
  outputPath?: string;
  outputPrefix?: string;
  checks: Array<{
    type: string;
    enabled: boolean;
    severity: string;
    description: string;
  }>;
  retrospectivePatterns?: {
    requiredSections: string[];
    filePatterns: string[];
  };
  storyReportPatterns?: {
    requiredFields: string[];
    filePatterns: string[];
  };
}

class RuleSuggestionAnalyzerCLI {
  private analyzer: RuleSuggestionAnalyzer;

  constructor() {
    this.analyzer = new RuleSuggestionAnalyzer();
  }

  async run(requestFile: string): Promise<void> {
    try {
      // Read the analysis request
      const requestContent = await fileAPI.readFile(requestFile, 'utf-8');
      const request: AnalysisRequest = JSON.parse(requestContent);

      console.log(`\n🔍 Running Rule Suggestion Analysis...`);
      console.log(`📁 Target: ${request.targetPath}`);
      console.log(`📋 Mode: ${request.mode}`);

      // Analyze retrospectives
      const retrospectivePatterns = request.retrospectivePatterns?.filePatterns || [
        '**/retrospective.md',
        '**/retrospect.md',
        '**/gen/history/retrospect/*.md',
        '**/docs/retrospective.md'
      ];

      console.log('\n📖 Analyzing retrospective documents...');
      const retrospectives = await this.analyzer.analyzeRetrospectives(
        request.targetPath,
        retrospectivePatterns
      );
      console.log(`Found ${retrospectives.length} retrospective(s)`);

      // Analyze story reports
      const storyReportPatterns = request.storyReportPatterns?.filePatterns || [
        '**/story-report.json',
        '**/gen/reports/story-report-*.json'
      ];

      console.log('\n📊 Analyzing story reports...');
      const storyReports = await this.analyzer.analyzeStoryReports(
        request.targetPath,
        storyReportPatterns
      );
      console.log(`Found ${storyReports.length} story report(s)`);

      // Generate report
      console.log('\n📝 Generating analysis report...');
      const report = this.analyzer.generateReport(retrospectives, storyReports, request.mode);

      // Prepare output
      const output = {
        metadata: {
          type: 'rule-suggestion-analysis',
          mode: request.mode,
          targetPath: request.targetPath,
          timestamp: request.timestamp,
          pass: report.summary.highSeverityFailed === 0,
          summary: report.summary
        },
        checks: report.checks,
        details: report.details
      };

      // Save results
      const outputPath = request.outputPath || path.join(request.targetPath, 'gen');
      const outputPrefix = request.outputPrefix || 'rule-suggestion-check';

      await fileAPI.createDirectory(outputPath);

      // Save JSON report
      const jsonFile = path.join(outputPath, `${outputPrefix}.json`);
      await fileAPI.createFile(jsonFile, JSON.stringify(output, { type: FileType.TEMPORARY }));

      // Save Markdown report
      const mdFile = path.join(outputPath, `${outputPrefix}.md`);
      await fileAPI.createFile(mdFile, this.generateMarkdownReport(output));

      // Display summary
      console.log('\n✨ Analysis Complete!');
      console.log(`\n📊 Summary:`);
      console.log(`   Total Checks: ${report.summary.totalChecks}`);
      console.log(`   ✅ Passed: ${report.summary.passed}`);
      console.log(`   ❌ Failed: ${report.summary.failed}`);
      console.log(`   🔴 High Severity Failed: ${report.summary.highSeverityFailed}`);

      // Exit with appropriate code
      process.exit(output.metadata.pass ? 0 : 1);

    } catch (error) {
      console.error('\n❌ Error:', { type: FileType.TEMPORARY }));
        lines.push('```');
      }
      lines.push('');
    }

    // Retrospective Details
    if (output.details.retrospectives.length > 0) {
      lines.push('## Retrospective Analysis');
      lines.push('');

      for (const retro of output.details.retrospectives) {
        lines.push(`### ${retro.filePath}`);
        lines.push('');
        lines.push(`- Has Required Sections: ${retro.hasRequiredSections ? '✅' : '❌'}`);
        
        if (retro.missingSections.length > 0) {
          lines.push(`- Missing Sections: ${retro.missingSections.join(', ')}`);
        }
        
        if (retro.extractedRules.length > 0) {
          lines.push('');
          lines.push('**Extracted Rules:**');
          retro.extractedRules.forEach((rule: string) => {
            lines.push(`- ${rule}`);
          });
        }
        
        if (retro.lessonsLearned.length > 0) {
          lines.push('');
          lines.push('**Lessons Learned:**');
          retro.lessonsLearned.forEach((lesson: string) => {
            lines.push(`- ${lesson}`);
          });
        }
        
        if (retro.knowHowUpdates.length > 0) {
          lines.push('');
          lines.push('**Know-How Updates:**');
          retro.knowHowUpdates.forEach((update: string) => {
            lines.push(`- ${update}`);
          });
        }
        
        lines.push('');
      }
    }

    // Story Report Details
    if (output.details.storyReports.length > 0) {
      lines.push('## Story Report Analysis');
      lines.push('');

      for (const report of output.details.storyReports) {
        lines.push(`### ${report.filePath}`);
        lines.push('');
        lines.push(`- Has Required Fields: ${report.hasRequiredFields ? '✅' : '❌'}`);
        
        if (report.missingFields.length > 0) {
          lines.push(`- Missing Fields: ${report.missingFields.join(', ')}`);
        }
        
        if (report.status) {
          lines.push(`- Status: ${report.status}`);
        }
        
        if (report.coverage !== undefined) {
          lines.push(`- Coverage: ${report.coverage}%`);
        }
        
        lines.push('');
      }
    }

    return lines.join('\n');
  }
}

// Main execution
if (require.main === module) {
  const requestFile = process.argv[2];
  
  if (!requestFile) {
    console.error('Usage: rule-suggestion-analyzer <request-file.json>');
    process.exit(1);
  }

  const cli = new RuleSuggestionAnalyzerCLI();
  cli.run(requestFile).catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}