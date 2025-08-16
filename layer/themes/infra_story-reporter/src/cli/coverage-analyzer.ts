import { fileAPI } from '../utils/file-api';
#!/usr/bin/env node

import * as fs from 'fs/promises';
import { path } from '../../../infra_external-log-lib/src';
import { BranchCoverageAnalyzer } from '../services/branch-coverage-analyzer';
import { SystemTestClassCoverageAnalyzer } from '../services/system-test-class-coverage-analyzer';
import { DuplicationChecker } from '../services/duplication-checker';
import { CoverageReportGenerator } from '../services/coverage-report-generator';

interface AnalysisRequest {
  type: string;
  mode: 'app' | 'epic' | 'theme' | 'story' | 'user_story';
  targetPath: string;
  timestamp: string;
  outputPath?: string;
  outputPrefix?: string;
  analyses: Array<{
    type: string;
    enabled: boolean;
    config?: any;
  }>;
}

interface AnalysisResult {
  branchCoverage?: {
    percentage: number;
    covered: number;
    total: number;
    details: any[];
  };
  systemTestClassCoverage?: {
    percentage: number;
    coveredClasses: number;
    totalClasses: number;
    details: any[];
  };
  duplicationCheck?: {
    percentage: number;
    duplicatedLines: number;
    totalLines: number;
    duplicates: any[];
  };
}

class CoverageAnalyzerCLI {
  private branchAnalyzer: BranchCoverageAnalyzer;
  private systemTestAnalyzer: SystemTestClassCoverageAnalyzer;
  private duplicationChecker: DuplicationChecker;
  private reportGenerator: CoverageReportGenerator;

  constructor() {
    this.branchAnalyzer = new BranchCoverageAnalyzer();
    this.systemTestAnalyzer = new SystemTestClassCoverageAnalyzer();
    this.duplicationChecker = new DuplicationChecker();
    this.reportGenerator = new CoverageReportGenerator();
  }

  async run(requestFile: string): Promise<void> {
    try {
      // Read analysis request
      const requestData = await fileAPI.readFile(requestFile, 'utf8');
      const request: AnalysisRequest = JSON.parse(requestData);

      console.log(`Analyzing ${request.mode}: ${path.basename(request.targetPath)}`);
      console.log('');

      const results: AnalysisResult = {};

      // Run requested analyses
      for (const analysis of request.analyses) {
        if (!analysis.enabled) continue;

        switch (analysis.type) {
          case 'branch-coverage':
            console.log('🔍 Running Branch Coverage Analysis...');
            results.branchCoverage = await this.branchAnalyzer.analyze(
              request.targetPath,
              request.mode
            );
            this.printBranchCoverage(results.branchCoverage);
            break;

          case 'system-test-class-coverage':
            console.log('🔍 Running System Test Class Coverage Analysis...');
            results.systemTestClassCoverage = await this.systemTestAnalyzer.analyze(
              request.targetPath,
              request.mode
            );
            this.printSystemTestClassCoverage(results.systemTestClassCoverage);
            break;

          case 'duplication-check':
            console.log('🔍 Running Code Duplication Check...');
            results.duplicationCheck = await this.duplicationChecker.analyze(
              request.targetPath,
              request.mode,
              analysis.config
            );
            this.printDuplicationCheck(results.duplicationCheck);
            break;
        }
      }

      // Generate comprehensive report
      console.log('\n📊 Generating Comprehensive Report...');
      
      // Use outputPath and outputPrefix if provided
      if (request.outputPath && request.outputPrefix) {
        await this.reportGenerator.generateWithPath(
          request.targetPath,
          request.mode,
          results,
          request.outputPath,
          request.outputPrefix,
          request.timestamp
        );
        console.log(`✅ Reports saved to: ${request.outputPath}/${request.outputPrefix}.*`);
      } else {
        const reportPath = await this.reportGenerator.generate(
          request.targetPath,
          request.mode,
          results
        );
        console.log(`✅ Report saved to: ${reportPath}`);
      }

    } catch (error) {
      console.error('❌ Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  }

  private printBranchCoverage(coverage: any): void {
    console.log('\n📈 Branch Coverage Results:');
    console.log(`   Total Branches: ${coverage.total}`);
    console.log(`   Covered Branches: ${coverage.covered}`);
    console.log(`   Coverage: ${coverage.percentage.toFixed(2)}%`);
    
    if (coverage.percentage < 80) {
      console.log('   ⚠️  Warning: Branch coverage is below 80%');
    } else {
      console.log('   ✅ Good branch coverage!');
    }
    console.log('');
  }

  private printSystemTestClassCoverage(coverage: any): void {
    console.log('\n🧪 System Test Class Coverage:');
    console.log(`   Total Classes: ${coverage.totalClasses}`);
    console.log(`   Covered Classes: ${coverage.coveredClasses}`);
    console.log(`   Coverage: ${coverage.percentage.toFixed(2)}%`);
    
    if (coverage.percentage < 90) {
      console.log('   ⚠️  Warning: System test class coverage is below 90%');
    } else {
      console.log('   ✅ Excellent system test coverage!');
    }
    console.log('');
  }

  private printDuplicationCheck(duplication: any): void {
    console.log('\n🔄 Code Duplication Results:');
    console.log(`   Total Lines: ${duplication.totalLines}`);
    console.log(`   Duplicated Lines: ${duplication.duplicatedLines}`);
    console.log(`   Duplication: ${duplication.percentage.toFixed(2)}%`);
    
    if (duplication.percentage > 5) {
      console.log('   ⚠️  Warning: Code duplication exceeds 5%');
      console.log(`   Found ${duplication.duplicates.length} duplicate blocks`);
    } else {
      console.log('   ✅ Low code duplication!');
    }
    console.log('');
  }
}

// Main execution
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length !== 1) {
    console.error('Usage: coverage-analyzer <request-file.json>');
    process.exit(1);
  }

  const analyzer = new CoverageAnalyzerCLI();
  analyzer.run(args[0]).catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { CoverageAnalyzerCLI };