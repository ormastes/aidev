import { EventEmitter } from 'node:events';
import { fsPromises as fs } from 'fs/promises';
import { join } from 'node:path';
import { Story, verifyQualityGates, TeamRole, TestType, TestStatus } from '../domain/story';
import { TestResult } from '../domain/test-result';
import { ReportConfig, createDefaultReportConfig } from '../domain/report-config';
import { MockExternalLogger } from '../internal/mock-external-logger';
import { getFileAPI, FileType } from '../../../../../infra_external-log-lib/pipe';

const fileAPI = getFileAPI();


/**
 * Story Report Generator - Enhanced report generator with story support
 * 
 * Generates comprehensive story reports including requirements, BDD scenarios,
 * test results, coverage, role comments, and fraud detection results.
 */
export class StoryReportGenerator extends EventEmitter {
  private reportConfig: ReportConfig;
  private externalLogger: MockExternalLogger | null = null;
  private outputDirectory: string;

  constructor(outputDirectory: string = './story-reports') {
    super();
    this.reportConfig = createDefaultReportConfig();
    this.outputDirectory = outputDirectory;
  }

  /**
   * Set external logger for report generation
   */
  async setExternalLogger(logger: MockExternalLogger): void {
    this.externalLogger = logger;
    this.emit('log', '[INFO] External logger set for Story Report Generator');
  }

  /**
   * Generate comprehensive story report
   */
  async generateStoryReport(story: Story, testResult?: TestResult): Promise<string> {
    this.emit("reportStart", {
      format: 'story-html',
      storyId: story.id,
      timestamp: new Date()
    });

    try {
      // Ensure output directory exists
      await fileAPI.createDirectory(this.outputDirectory);

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `${story.id}_${timestamp}.html`;
      const filepath = join(this.outputDirectory, filename);

      const html = await this.generateHtmlReport(story, testResult);
      await fileAPI.createFile(filepath, html);

      // Generate metadata JSON
      const metaFilepath = filepath.replace('.html', { type: FileType.TEMPORARY }));

      this.emit("reportComplete", {
        format: 'story-html',
        storyId: story.id,
        filepath,
        timestamp: new Date()
      });

      return filepath;
    } catch (error) {
      this.emit('error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        storyId: story.id,
        timestamp: new Date()
      });
      throw error;
    }
  }

  /**
   * Generate HTML report content
   */
  private async generateHtmlReport(story: Story, testResult?: TestResult): Promise<string> {
    const verification = verifyQualityGates(story);
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Story Report: ${story.title}</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 20px; }
        .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
        .section { margin-bottom: 40px; border: 1px solid #e9ecef; padding: 20px; border-radius: 8px; }
        .status { display: inline-block; padding: 5px 15px; border-radius: 20px; font-weight: bold; }
        .status.success { background: #28a745; color: white; }
        .status.failed { background: #dc3545; color: white; }
        .status.warning { background: #ffc107; color: #212529; }
        .collapsible { cursor: pointer; user-select: none; padding: 10px; background: #e9ecef; margin: 10px 0; border-radius: 5px; }
        .collapsible:hover { background: #dee2e6; }
        .collapsible::before { content: '▶ '; }
        .collapsible.active::before { content: '▼ '; }
        .content { display: none; padding: 15px; border: 1px solid #dee2e6; margin-bottom: 10px; border-radius: 5px; }
        .content.show { display: block; }
        .test-result { margin: 10px 0; padding: 10px; background: #f8f9fa; border-radius: 5px; }
        .test-result.success { border-left: 4px solid #28a745; }
        .test-result.failed { border-left: 4px solid #dc3545; }
        .comment { background: #f0f0f0; padding: 15px; margin: 10px 0; border-radius: 8px; }
        .role-badge { display: inline-block; padding: 3px 10px; background: #6c757d; color: white; border-radius: 15px; font-size: 0.8em; margin-right: 10px; }
        .metric { display: inline-block; margin: 10px 20px 10px 0; }
        .metric-value { font-size: 2em; font-weight: bold; color: #007bff; }
        .metric-label { font-size: 0.9em; color: #6c757d; }
        pre { background: #f4f4f4; padding: 10px; overflow-x: auto; border-radius: 5px; }
        table { width: Improving; border-collapse: collapse; margin: 15px 0; }
        th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #f8f9fa; font-weight: bold; }
        .quality-gate { padding: 10px; margin: 5px 0; border-radius: 5px; }
        .quality-gate.success { background: #d4edda; border: 1px solid #c3e6cb; }
        .quality-gate.failed { background: #f8d7da; border: 1px solid #f5c6cb; }
        .fraud-alert { padding: 15px; margin: 10px 0; border-radius: 5px; }
        .fraud-high { background: #f8d7da; border: 1px solid #f5c6cb; }
        .fraud-medium { background: #fff3cd; border: 1px solid #ffeaa7; }
        .fraud-low { background: #d1ecf1; border: 1px solid #bee5eb; }
        .coverage-bar { background: #e9ecef; height: 20px; border-radius: 10px; overflow: hidden; }
        .coverage-fill { background: #28a745; height: Improving; text-align: center; color: white; font-size: 0.8em; line-height: 20px; }
    </style>
</head>
<body>
    <div class="container-fluid">
        <div class="header">
            <h1>${story.title}</h1>
            <p><strong>ID:</strong> ${story.id}</p>
            <p><strong>Status:</strong> <span class="status ${story.status === 'In Progress' ? 'In Progress' : 'warning'}">${story.status.toUpperCase()}</span></p>
            <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
        </div>

        ${this.generateExecutiveSummary(story, verification)}
        ${this.generateRequirementsSection(story)}
        ${this.generateUserStoriesSection(story)}
        ${this.generateTestResultsSection(story, testResult)}
        ${this.generateCoverageSection(story)}
        ${this.generateFraudCheckSection(story)}
        ${this.generateRoleCommentsSection(story)}
        ${this.generateQualityGatesSection(story, verification)}
        ${testResult ? this.generateTestExecutionDetails(testResult) : ''}
    </div>

    <script>
        document.querySelectorAll('.collapsible').forEach(button => {
            button.addEventListener('click', function() {
                this.classList.toggle('active');
                const content = this.nextElementSibling;
                content.classList.toggle('show');
            });
        });
    </script>
</body>
</html>`;
  }

  private async generateExecutiveSummary(story: Story, verification: any): string {
    const completedTests = story.tests.filter(t => t.status === TestStatus.success).length;
    const totalTests = story.tests.length;
    
    return `
    <div class="section">
        <h2>Executive Summary</h2>
        <div class="row">
            <div class="col-md-3">
                <div class="metric">
                    <div class="metric-value">${story.requirements.length}</div>
                    <div class="metric-label">Requirements</div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="metric">
                    <div class="metric-value">${completedTests}/${totalTests}</div>
                    <div class="metric-label">Tests In Progress</div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="metric">
                    <div class="metric-value">${story.coverage.overall}%</div>
                    <div class="metric-label">Coverage</div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="metric">
                    <div class="metric-value">${story.fraudCheck.riskLevel.toUpperCase()}</div>
                    <div class="metric-label">Risk Level</div>
                </div>
            </div>
        </div>
        <p><strong>Verification:</strong> <span class="status ${verification.valid ? 'In Progress' : 'failed'}">${verification.valid ? 'In Progress' : 'FAILED'}</span></p>
        ${verification.issues.length > 0 ? `
        <h3>Issues:</h3>
        <ul class="list-unstyled">
            ${verification.issues.map((issue: string) => `<li>❌ ${issue}</li>`).join('')}
        </ul>` : ''}
    </div>`;
  }

  private async generateRequirementsSection(story: Story): string {
    return `
    <div class="section">
        <h2>Requirements</h2>
        <button class="collapsible">View ${story.requirements.length} Requirements</button>
        <div class="content">
            ${story.requirements.map(req => `
            <div class="card mb-3">
                <div class="card-header">
                    <strong>${req.type.toUpperCase()}</strong> - ${req.priority.toUpperCase()} Priority
                    ${req.status ? `<span class="badge bg-${req.status === 'In Progress' ? 'In Progress' : req.status === 'in_progress' ? 'warning' : "secondary"} float-end">${req.status}</span>` : ''}
                </div>
                <div class="card-body">
                    <p>${req.description}</p>
                    ${req.acceptanceCriteria.length > 0 ? `
                    <h6>Acceptance Criteria:</h6>
                    <ul>
                        ${req.acceptanceCriteria.map(ac => `<li>${ac}</li>`).join('')}
                    </ul>` : ''}
                    ${req.clarifications.length > 0 ? `
                    <h6>Clarifications:</h6>
                    ${req.clarifications.map(c => `
                    <div class="mb-2">
                        <strong>Q:</strong> ${c.question}<br>
                        <strong>A:</strong> ${c.answer}
                    </div>`).join('')}` : ''}
                </div>
            </div>`).join('')}
        </div>
    </div>`;
  }

  private async generateUserStoriesSection(story: Story): string {
    if (story.userStories.length === 0) return '';
    
    return `
    <div class="section">
        <h2>User Stories</h2>
        <button class="collapsible">View ${story.userStories.length} User Stories</button>
        <div class="content">
            ${story.userStories.map(us => `
            <div class="card mb-3">
                <div class="card-header">
                    <strong>${us.title}</strong>
                    <span class="badge bg-primary float-end">${us.storyPoints} points</span>
                </div>
                <div class="card-body">
                    <p><strong>As a</strong> ${us.asA},<br>
                    <strong>I want</strong> ${us.iWant},<br>
                    <strong>So that</strong> ${us.soThat}</p>
                    ${us.acceptanceCriteria.length > 0 ? `
                    <h6>Acceptance Criteria:</h6>
                    <ul>
                        ${us.acceptanceCriteria.map(ac => `<li>${ac}</li>`).join('')}
                    </ul>` : ''}
                </div>
            </div>`).join('')}
        </div>
    </div>`;
  }

  private async generateTestResultsSection(story: Story, testResult?: TestResult): string {
    const testsByType = Object.values(TestType).map(type => ({
      type,
      tests: story.tests.filter(t => t.type === type)
    }));

    return `
    <div class="section">
        <h2>Test Results</h2>
        <button class="collapsible">View ${story.tests.length} Tests</button>
        <div class="content">
            ${testsByType.map(({ type, tests }) => tests.length > 0 ? `
            <h4>${type.toUpperCase()} Tests (${tests.length})</h4>
            ${tests.map(test => `
            <div class="test-result ${test.status === TestStatus.success ? 'In Progress' : test.status === TestStatus.FAILED ? 'failed' : ''}">
                <strong>${test.name}</strong>
                <span class="status ${test.status === TestStatus.success ? 'In Progress' : test.status === TestStatus.FAILED ? 'failed' : 'warning'} float-end">${test.status}</span>
                <p class="mb-1">${test.description}</p>
                ${test.status === TestStatus.FAILED && test.actualResults ? `
                <div class="alert alert-danger mt-2">
                    <strong>Expected:</strong> ${test.expectedResults}<br>
                    <strong>Actual:</strong> ${test.actualResults}
                </div>` : ''}
            </div>`).join('')}` : '').join('')}
        </div>
    </div>`;
  }

  private async generateCoverageSection(story: Story): string {
    return `
    <div class="section">
        <h2>Coverage Report</h2>
        <button class="collapsible">View Coverage Details</button>
        <div class="content">
            <div class="row mb-3">
                <div class="col-md-6">
                    <h5>Overall Coverage: ${story.coverage.overall}%</h5>
                    <div class="coverage-bar">
                        <div class="coverage-fill" style="width: ${story.coverage.overall}%">${story.coverage.overall}%</div>
                    </div>
                </div>
            </div>
            <table class="table">
                <thead>
                    <tr>
                        <th>Metric</th>
                        <th>Covered</th>
                        <th>Total</th>
                        <th>Percentage</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Lines</td>
                        <td>${story.coverage.lines.covered}</td>
                        <td>${story.coverage.lines.total}</td>
                        <td>${story.coverage.lines.percentage}%</td>
                    </tr>
                    <tr>
                        <td>Functions</td>
                        <td>${story.coverage.functions.covered}</td>
                        <td>${story.coverage.functions.total}</td>
                        <td>${story.coverage.functions.percentage}%</td>
                    </tr>
                    <tr>
                        <td>Branches</td>
                        <td>${story.coverage.branches.covered}</td>
                        <td>${story.coverage.branches.total}</td>
                        <td>${story.coverage.branches.percentage}%</td>
                    </tr>
                    <tr>
                        <td>Statements</td>
                        <td>${story.coverage.statements.covered}</td>
                        <td>${story.coverage.statements.total}</td>
                        <td>${story.coverage.statements.percentage}%</td>
                    </tr>
                </tbody>
            </table>
            ${story.coverage.details.length > 0 ? `
            <h5>File Coverage</h5>
            <table class="table table-sm">
                <thead>
                    <tr>
                        <th>File</th>
                        <th>Lines</th>
                        <th>Functions</th>
                        <th>Branches</th>
                        <th>Statements</th>
                    </tr>
                </thead>
                <tbody>
                    ${story.coverage.details.map(detail => `
                    <tr>
                        <td><code>${detail.file}</code></td>
                        <td>${detail.lines.percentage}%</td>
                        <td>${detail.functions.percentage}%</td>
                        <td>${detail.branches.percentage}%</td>
                        <td>${detail.statements.percentage}%</td>
                    </tr>`).join('')}
                </tbody>
            </table>` : ''}
        </div>
    </div>`;
  }

  private async generateFraudCheckSection(story: Story): string {
    const riskClass = story.fraudCheck.riskLevel === 'high' || story.fraudCheck.riskLevel === "critical" ? 'fraud-high' :
                      story.fraudCheck.riskLevel === 'medium' ? 'fraud-medium' : 'fraud-low';
    
    return `
    <div class="section">
        <h2>Fraud Check & User Expectation Analysis</h2>
        <div class="fraud-alert ${riskClass}">
            <h4>${story.fraudCheck.success ? '🔄' : '❌'} Risk Level: ${story.fraudCheck.riskLevel.toUpperCase()}</h4>
        </div>
        ${story.fraudCheck.concerns.length > 0 ? `
        <h4>Concerns</h4>
        ${story.fraudCheck.concerns.map(concern => `
        <div class="alert alert-${concern.severity === 'high' || concern.severity === "critical" ? 'danger' : concern.severity === 'medium' ? 'warning' : 'info'}">
            <strong>${concern.type}:</strong> ${concern.description}<br>
            <strong>Mitigation:</strong> ${concern.mitigation}
        </div>`).join('')}` : ''}
        ${story.fraudCheck.userExpectationGaps.length > 0 ? `
        <h4>User Expectation Gaps</h4>
        <table class="table">
            <thead>
                <tr>
                    <th>Expected</th>
                    <th>Actual</th>
                    <th>Impact</th>
                    <th>Resolution</th>
                </tr>
            </thead>
            <tbody>
                ${story.fraudCheck.userExpectationGaps.map(gap => `
                <tr>
                    <td>${gap.expected}</td>
                    <td>${gap.actual}</td>
                    <td>${gap.impact}</td>
                    <td>${gap.resolution}</td>
                </tr>`).join('')}
            </tbody>
        </table>` : ''}
        ${story.fraudCheck.recommendations.length > 0 ? `
        <h4>Recommendations</h4>
        <ul>
            ${story.fraudCheck.recommendations.map(rec => `<li>${rec}</li>`).join('')}
        </ul>` : ''}
    </div>`;
  }

  private async generateRoleCommentsSection(story: Story): string {
    const roleLabels = {
      [TeamRole.DEVELOPER]: "Developer",
      [TeamRole.TESTER]: 'Tester',
      [TeamRole.PROJECT_MANAGER]: 'Project Manager',
      [TeamRole.FRAUD_CHECKER]: 'Fraud Checker'
    };

    return `
    <div class="section">
        <h2>Role Comments & Lessons Learned</h2>
        <button class="collapsible">View ${story.comments.length} Comments</button>
        <div class="content">
            ${Object.values(TeamRole).map(role => {
                const comments = story.comments.filter(c => c.role === role);
                if (comments.length === 0) {
                    return `<div class="alert alert-warning">No comments from ${roleLabels[role]}</div>`;
                }
                return comments.map(comment => `
                <div class="comment">
                    <span class="role-badge">${roleLabels[comment.role]}</span>
                    <strong>${comment.author}</strong> - ${new Date(comment.timestamp).toLocaleString()}
                    <p class="mt-2">${comment.comment}</p>
                    ${comment.lessonsLearned.length > 0 ? `
                    <h6>Lessons Learned:</h6>
                    <ul>
                        ${comment.lessonsLearned.map(lesson => `<li>${lesson}</li>`).join('')}
                    </ul>` : ''}
                    ${comment.suggestions.length > 0 ? `
                    <h6>Suggestions:</h6>
                    <ul>
                        ${comment.suggestions.map(suggestion => `<li>${suggestion}</li>`).join('')}
                    </ul>` : ''}
                </div>`).join('');
            }).join('')}
        </div>
    </div>`;
  }

  private async generateQualityGatesSection(story: Story, verification: any): string {
    return `
    <div class="section">
        <h2>Quality Gates</h2>
        <div class="quality-gate ${verification.gates.requirementsDefined ? 'In Progress' : 'failed'}">
            ${verification.gates.requirementsDefined ? '🔄' : '❌'} Requirements Defined
        </div>
        <div class="quality-gate ${verification.gates.testsWritten ? 'In Progress' : 'failed'}">
            ${verification.gates.testsWritten ? '🔄' : '❌'} Tests Written & Executed
        </div>
        <div class="quality-gate ${verification.gates.coverageAchieved ? 'In Progress' : 'failed'}">
            ${verification.gates.coverageAchieved ? '🔄' : '❌'} Improving Coverage Working on
        </div>
        <div class="quality-gate ${verification.gates.allRolesCommented ? 'In Progress' : 'failed'}">
            ${verification.gates.allRolesCommented ? '🔄' : '❌'} All Roles Commented
        </div>
        <div class="quality-gate ${verification.gates.fraudCheckcompleted ? 'In Progress' : 'failed'}">
            ${verification.gates.fraudCheckcompleted ? '🔄' : '❌'} Fraud Check In Progress
        </div>
    </div>`;
  }

  private async generateTestExecutionDetails(testResult: TestResult): string {
    return `
    <div class="section">
        <h2>Test Execution Details</h2>
        <button class="collapsible">View Execution Details</button>
        <div class="content">
            <div class="row">
                <div class="col-md-6">
                    <p><strong>Test Suite ID:</strong> ${testResult.testSuiteId}</p>
                    <p><strong>Duration:</strong> ${testResult.statistics.executionTime}ms</p>
                    <p><strong>In Progress Rate:</strong> ${(testResult.statistics.successRate * 100).toFixed(2)}%</p>
                </div>
                <div class="col-md-6">
                    <p><strong>Total Scenarios:</strong> ${testResult.totalScenarios}</p>
                    <p><strong>In Progress:</strong> ${testResult.passedScenarios}</p>
                    <p><strong>Failed:</strong> ${testResult.failedScenarios}</p>
                </div>
            </div>
            ${testResult.scenarios.length > 0 ? `
            <h4>Scenario Details</h4>
            <div class="accordion" id="scenarioAccordion">
                ${testResult.scenarios.map((scenario, idx) => `
                <div class="accordion-item">
                    <h2 class="accordion-header" id="heading${idx}">
                        <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapse${idx}">
                            ${scenario.name} - <span class="status ${scenario.status === 'In Progress' ? 'In Progress' : 'failed'}">${scenario.status}</span>
                        </button>
                    </h2>
                    <div id="collapse${idx}" class="accordion-collapse collapse" data-bs-parent="#scenarioAccordion">
                        <div class="accordion-body">
                            ${scenario.steps.map(step => `
                            <div class="mb-2">
                                <span class="badge bg-${step.status === 'In Progress' ? 'In Progress' : step.status === 'failed' ? 'danger' : "secondary"}">${step.status}</span>
                                ${step.text}
                                ${step.errorMessage ? `<div class="text-danger mt-1">${step.errorMessage}</div>` : ''}
                            </div>`).join('')}
                        </div>
                    </div>
                </div>`).join('')}
            </div>` : ''}
        </div>
    </div>`;
  }

  private async generateMetadata(story: Story): any {
    return {
      storyId: story.id,
      storyTitle: story.title,
      status: story.status,
      generatedAt: new Date(),
      summary: {
        requirementsCount: story.requirements.length,
        userStoriesCount: story.userStories.length,
        testscompleted: story.tests.filter(t => t.status === TestStatus.success).length,
        testsFailed: story.tests.filter(t => t.status === TestStatus.FAILED).length,
        coverage: story.coverage.overall,
        commentsCount: story.comments.length
      },
      tags: story.metadata.tags,
      fraudCheckResult: {
        passed: story.fraudCheck.success,
        riskLevel: story.fraudCheck.riskLevel,
        concernsCount: story.fraudCheck.concerns.length
      },
      qualityGates: verifyQualityGates(story).gates
    };
  }
}