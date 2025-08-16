import { path } from '../../../infra_external-log-lib/src';
import { auditedFS } from '../../../infra_external-log-lib/pipe';

interface FraudReport {
  metadata: {
    targetPath: string;
    mode: string;
    timestamp: string;
    totalIssues: number;
    criticalIssues: number;
    pass?: boolean;
    summary?: string;
  };
  results: any;
}

export class FraudReportGenerator {
  async generateJSON(outputPath: string, report: FraudReport): Promise<void> {
    await auditedFS.writeFile(outputPath, JSON.stringify(report, null, 2));
  }

  async generateMarkdown(outputPath: string, report: FraudReport): Promise<void> {
    const { metadata, results } = report;
    const targetName = path.basename(metadata.targetPath);

    let markdown = `# Fraud Analysis Report

## Summary

- **Target**: ${targetName} (${metadata.mode})
- **Date**: ${new Date(metadata.timestamp).toLocaleString()}
- **Total Issues**: ${metadata.totalIssues}
- **Critical Issues**: ${metadata.criticalIssues}
- **Status**: ${this.getOverallStatus(metadata.criticalIssues, metadata.totalIssues)}

## Analysis Results

`;

    // Mock Detection
    if (results.mockDetection) {
      markdown += this.generateMockDetectionSection(results.mockDetection);
    }

    // Test Coverage Fraud
    if (results.testCoverageFraud) {
      markdown += this.generateTestCoverageFraudSection(results.testCoverageFraud);
    }

    // Dependency Fraud
    if (results.dependencyFraud) {
      markdown += this.generateDependencyFraudSection(results.dependencyFraud);
    }

    // Code Smells
    if (results.codeSmells) {
      markdown += this.generateCodeSmellsSection(results.codeSmells);
    }

    // Security Vulnerabilities
    if (results.securityVulnerabilities) {
      markdown += this.generateSecuritySection(results.securityVulnerabilities);
    }

    // Recommendations
    markdown += this.generateRecommendations(report);

    await auditedFS.writeFile(outputPath, markdown);
  }

  private getOverallStatus(criticalIssues: number, totalIssues: number): string {
    if (criticalIssues > 0) return '🚨 CRITICAL';
    if (totalIssues > 10) return '⚠️ NEEDS ATTENTION';
    if (totalIssues > 0) return '⚡ MINOR ISSUES';
    return '✅ CLEAN';
  }

  private generateMockDetectionSection(mockDetection: any): string {
    let section = `### 🎭 Mock Detection

- **Total Mocks Found**: ${mockDetection.totalMocks}
- **Severity**: ${mockDetection.severity}
- **Violations**: ${mockDetection.violations.length}

`;

    if (mockDetection.violations.length > 0) {
      section += `#### Violations

| File | Line | Type | Reason |
|------|------|------|--------|
`;

      const topViolations = mockDetection.violations.slice(0, 10);
      for (const violation of topViolations) {
        section += `| ${violation.file} | ${violation.line} | ${violation.type} | ${violation.reason} |\n`;
      }

      if (mockDetection.violations.length > 10) {
        section += `\n*... and ${mockDetection.violations.length - 10} more violations*\n`;
      }
    }

    section += '\n';
    return section;
  }

  private generateTestCoverageFraudSection(testFraud: any): string {
    let section = `### 🧪 Test Coverage Fraud

- **Fake Tests**: ${testFraud.fakeTests}
- **Empty Tests**: ${testFraud.emptyTests}
- **Severity**: ${testFraud.severity}

`;

    if (testFraud.violations.length > 0) {
      section += `#### Fraudulent Tests

| File | Test Name | Type | Reason |
|------|-----------|------|--------|
`;

      const topViolations = testFraud.violations.slice(0, 10);
      for (const violation of topViolations) {
        section += `| ${violation.file} | ${violation.testName} | ${violation.type} | ${violation.reason} |\n`;
      }
    }

    section += '\n';
    return section;
  }

  private generateDependencyFraudSection(depFraud: any): string {
    let section = `### 📦 Dependency Analysis

- **Unused Dependencies**: ${depFraud.unusedDependencies}
- **Suspicious Dependencies**: ${depFraud.suspiciousDependencies}
- **Severity**: ${depFraud.severity}

`;

    if (depFraud.violations.length > 0) {
      section += `#### Dependency Issues

| Dependency | Type | Reason |
|------------|------|--------|
`;

      for (const violation of depFraud.violations) {
        section += `| ${violation.dependency} | ${violation.type} | ${violation.reason} |\n`;
      }
    }

    section += '\n';
    return section;
  }

  private generateCodeSmellsSection(codeSmells: any): string {
    let section = `### 👃 Code Quality

- **Total Code Smells**: ${codeSmells.totalSmells}
- **Critical Smells**: ${codeSmells.criticalSmells}
- **Severity**: ${codeSmells.severity}

`;

    if (codeSmells.violations.length > 0) {
      section += `#### Code Smells

| File | Line | Type | Description |
|------|------|------|-------------|
`;

      const topViolations = codeSmells.violations.slice(0, 10);
      for (const violation of topViolations) {
        section += `| ${violation.file} | ${violation.line} | ${violation.type} | ${violation.description} |\n`;
      }
    }

    section += '\n';
    return section;
  }

  private generateSecuritySection(security: any): string {
    let section = `### 🔒 Security Analysis

- **Total Vulnerabilities**: ${security.totalVulnerabilities}
- **Critical Vulnerabilities**: ${security.criticalVulnerabilities}
- **Severity**: ${security.severity}

`;

    if (security.violations.length > 0) {
      section += `#### Security Vulnerabilities

| File | Line | Type | Description | CWE |
|------|------|------|-------------|-----|
`;

      const topViolations = security.violations.slice(0, 10);
      for (const violation of topViolations) {
        section += `| ${violation.file} | ${violation.line} | ${violation.type} | ${violation.description} | ${violation.cwe || 'N/A'} |\n`;
      }
    }

    section += '\n';
    return section;
  }

  private generateRecommendations(report: FraudReport): string {
    const { metadata, results } = report;
    const recommendations: string[] = [];

    if (metadata.criticalIssues > 0) {
      recommendations.push('🚨 **IMMEDIATE ACTION REQUIRED**: Address critical security vulnerabilities immediately');
    }

    if (results.mockDetection?.violations.length > 0) {
      recommendations.push('- **Remove Mocks from Production**: Ensure no mock code exists in production files');
      recommendations.push('- **Adopt Mock-Free Testing**: Consider implementing mock-free test strategies');
    }

    if (results.testCoverageFraud?.fakeTests > 0) {
      recommendations.push('- **Fix Fraudulent Tests**: Remove or properly implement empty and fake tests');
    }

    if (results.dependencyFraud?.suspiciousDependencies > 0) {
      recommendations.push('- **Review Dependencies**: Audit and remove suspicious dependencies');
    }

    if (results.codeSmells?.criticalSmells > 0) {
      recommendations.push('- **Refactor Code**: Address critical code smells to improve maintainability');
    }

    if (results.securityVulnerabilities?.criticalVulnerabilities > 0) {
      recommendations.push('- **Security Patches**: Apply security patches and fix vulnerabilities');
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ **Keep up the good work!** Continue following best practices.');
    }

    return `## Recommendations

${recommendations.join('\n')}

## Next Steps

1. Review the detailed violations in this report
2. Prioritize critical and high-severity issues
3. Create tickets for each issue category
4. Implement fixes following the project's coding standards
5. Re-run the analysis after fixes are applied

---

*Generated by Fraud Checker Analysis Tool*
`;
  }
}