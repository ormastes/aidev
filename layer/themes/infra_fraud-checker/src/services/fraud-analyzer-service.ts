import { MockDetectionService } from './mock-detection-service';
import { TestCoverageFraudDetector } from './test-coverage-fraud-detector';
import { DependencyFraudDetector } from './dependency-fraud-detector';
import { CodeSmellDetector } from './code-smell-detector';
import { SecurityVulnerabilityDetector } from './security-vulnerability-detector';
import { FraudReportGenerator } from '../reporters/fraud-report-generator';
import { WebUITestDetector } from '../detectors/web-ui-test-detector';
import { auditedFS } from '../../../infra_external-log-lib/pipe';
import { path } from '../../../infra_external-log-lib/src';

interface FraudAnalysisRequest {
  type: string;
  mode: string;
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

export class FraudAnalyzerService {
  private mockDetector: MockDetectionService;
  private testFraudDetector: TestCoverageFraudDetector;
  private dependencyDetector: DependencyFraudDetector;
  private codeSmellDetector: CodeSmellDetector;
  private securityDetector: SecurityVulnerabilityDetector;
  private webUITestDetector: WebUITestDetector;
  private reportGenerator: FraudReportGenerator;

  constructor() {
    this.mockDetector = new MockDetectionService();
    this.testFraudDetector = new TestCoverageFraudDetector();
    this.dependencyDetector = new DependencyFraudDetector();
    this.codeSmellDetector = new CodeSmellDetector();
    this.securityDetector = new SecurityVulnerabilityDetector();
    this.webUITestDetector = new WebUITestDetector(process.cwd());
    this.reportGenerator = new FraudReportGenerator();
  }

  async analyze(request: FraudAnalysisRequest): Promise<void> {
    console.log(`\n🔍 Starting fraud analysis for ${request.targetPath}...`);
    
    const results: any = {};
    let totalIssues = 0;
    let criticalIssues = 0;

    // Run enabled checks
    for (const check of request.checks) {
      if (!check.enabled) continue;

      console.log(`\n📊 Running ${check.type} check...`);
      
      try {
        switch (check.type) {
          case 'mock-detection':
            results.mockDetection = await this.mockDetector.analyze(
              request.targetPath,
              request.mode
            );
            results.mockDetection.severity = check.severity;
            totalIssues += results.mockDetection.violations.length;
            if (check.severity === 'critical') {
              criticalIssues += results.mockDetection.violations.length;
            }
            break;

          case 'test-coverage-fraud':
            results.testCoverageFraud = await this.testFraudDetector.analyze(
              request.targetPath,
              request.mode
            );
            results.testCoverageFraud.severity = check.severity;
            totalIssues += results.testCoverageFraud.violations.length;
            if (check.severity === 'critical') {
              criticalIssues += results.testCoverageFraud.violations.length;
            }
            break;

          case 'dependency-fraud':
            results.dependencyFraud = await this.dependencyDetector.analyze(
              request.targetPath,
              request.mode
            );
            results.dependencyFraud.severity = check.severity;
            totalIssues += results.dependencyFraud.violations.length;
            if (check.severity === 'critical') {
              criticalIssues += results.dependencyFraud.violations.length;
            }
            break;

          case 'code-smell-detection':
            results.codeSmells = await this.codeSmellDetector.analyze(
              request.targetPath,
              request.mode
            );
            results.codeSmells.severity = check.severity;
            totalIssues += results.codeSmells.violations.length;
            if (check.severity === 'critical') {
              criticalIssues += results.codeSmells.criticalSmells;
            }
            break;

          case 'security-vulnerability':
            results.securityVulnerabilities = await this.securityDetector.analyze(
              request.targetPath,
              request.mode
            );
            results.securityVulnerabilities.severity = check.severity;
            totalIssues += results.securityVulnerabilities.violations.length;
            criticalIssues += results.securityVulnerabilities.criticalVulnerabilities;
            break;

          case 'web-ui-test-validation':
            const webUIReport = await this.webUITestDetector.analyze();
            results.webUITestValidation = {
              violations: webUIReport.detections,
              severity: check.severity,
              summary: webUIReport.summary,
              recommendations: webUIReport.recommendations
            };
            totalIssues += webUIReport.detections.length;
            if (check.severity === 'critical') {
              criticalIssues += webUIReport.detections.filter(d => d.severity === 'CRITICAL').length;
            }
            break;
        }
        
        console.log(`✅ ${check.type} check completed`);
      } catch (error) {
        console.error(`❌ Error in ${check.type} check:`, error);
      }
    }

    // Generate report
    const pass = criticalIssues === 0;
    const summary = `Total: ${totalIssues} issues | Critical: ${criticalIssues} | Status: ${pass ? 'PASS' : 'FAIL'}`;
    
    const report = {
      metadata: {
        targetPath: request.targetPath,
        mode: request.mode,
        timestamp: request.timestamp,
        totalIssues,
        criticalIssues,
        pass,
        summary
      },
      results
    };

    // Save reports
    const outputDir = request.outputPath;
    await auditedFS.mkdir(outputDir, { recursive: true });

    const jsonPath = path.join(outputDir, `${request.outputPrefix}.json`);
    const mdPath = path.join(outputDir, `${request.outputPrefix}.md`);

    await this.reportGenerator.generateJSON(jsonPath, report);
    await this.reportGenerator.generateMarkdown(mdPath, report);

    console.log(`\n📄 Reports generated:`);
    console.log(`   - JSON: ${jsonPath}`);
    console.log(`   - Markdown: ${mdPath}`);
    console.log(`\n✨ Fraud analysis completed!`);
    console.log(`   Total issues: ${totalIssues}`);
    console.log(`   Critical issues: ${criticalIssues}`);
  }
}