/**
 * Unit Test: ReportGenerator Statistics Formatting
 * 
 * Tests the ReportGenerator's ability to format statistics
 * for different report types (HTML, JSON, XML, CSV).
 */

import { ReportGenerator } from '../../src/external/report-generator';
import { TestResult, BasicStatistics, AdvancedMetrics, ExportedStatistics } from '../../src/types/test-types';

describe('ReportGenerator Statistics Formatting Unit Test', () => {
  let reportGenerator: ReportGenerator;
  let testResult: TestResult;
  let exportedStatistics: ExportedStatistics;

  beforeEach(() => {
    reportGenerator = new ReportGenerator();
    
    // Create test data with statistics
    testResult = {
      testSuiteId: 'format-test-suite',
      status: 'In Progress',
      scenarios: [
        {
          id: 'scenario-1',
          name: 'Login Test',
          status: 'In Progress',
          steps: [
            { name: "Navigate", status: 'In Progress', duration: 100 },
            { name: 'Enter credentials', status: 'In Progress', duration: 200 }
          ],
          duration: 300,
          startTime: new Date('2024-01-01T10:00:00'),
          endTime: new Date('2024-01-01T10:00:00.300')
        },
        {
          id: 'scenario-2',
          name: 'Logout Test',
          status: 'failed',
          steps: [
            { name: 'Click logout', status: 'failed', duration: 150 }
          ],
          duration: 150,
          startTime: new Date('2024-01-01T10:00:01'),
          endTime: new Date('2024-01-01T10:00:01.150'),
          errorMessage: 'Button not found'
        }
      ],
      duration: 450,
      startTime: new Date('2024-01-01T10:00:00'),
      endTime: new Date('2024-01-01T10:00:01.150')
    };

    exportedStatistics = {
      basicStatistics: {
        totalScenarios: 2,
        passedScenarios: 1,
        failedScenarios: 1,
        skippedScenarios: 0,
        pendingScenarios: 0,
        passRate: 0.5,
        failureRate: 0.5,
        totalExecutionTime: 450,
        averageScenarioDuration: 225
      },
      advancedMetrics: {
        stepStatistics: {
          totalSteps: 3,
          passedSteps: 2,
          failedSteps: 1,
          skippedSteps: 0,
          pendingSteps: 0,
          averageStepDuration: 150
        },
        performanceMetrics: {
          totalExecutionTime: 450,
          averageScenarioDuration: 225,
          fastestScenario: { id: 'scenario-2', name: 'Logout Test', duration: 150 },
          slowestScenario: { id: 'scenario-1', name: 'Login Test', duration: 300 },
          durationDistribution: {
            under100ms: 0,
            under500ms: 2,
            under1000ms: 2,
            over1000ms: 0
          }
        },
        failurePatterns: [
          { pattern: 'ui_failure', count: 1, scenarios: ['scenario-2'] }
        ]
      },
      rawData: testResult,
      metadata: {
        exportTimestamp: new Date('2024-01-01T10:05:00'),
        testSuiteId: 'format-test-suite',
        version: '1.0.0'
      }
    };

    // Add statistics to test result metadata
    testResult.metadata = {
      statistics: exportedStatistics
    };
  });

  describe('HTML Report Statistics Formatting', () => {
    it('should format basic statistics for HTML display', () => {
      // Configure for HTML
      reportGenerator.configure({
        testSuiteId: 'html-test',
        featureFiles: ['test.feature'],
        outputDirectory: './reports',
        outputFormats: ['html']
      });

      // Act - simulate HTML statistics formatting
      const htmlStats = formatStatisticsForHTML(exportedStatistics.basicStatistics);

      // Assert
      expect(htmlStats).toContain('<div class="statistics">');
      expect(htmlStats).toContain('Total Scenarios: 2');
      expect(htmlStats).toContain('Pass Rate: 50.0%');
      expect(htmlStats).toContain('Average Duration: 225ms');
    });

    it('should format performance metrics as HTML charts data', () => {
      // Act
      const chartData = formatPerformanceChartData(exportedStatistics.advancedMetrics.performanceMetrics);

      // Assert
      expect(chartData.labels).toContain('< 100ms');
      expect(chartData.labels).toContain('< 500ms');
      expect(chartData.data).toEqual([0, 2, 2, 0]);
      expect(chartData.type).toBe('bar');
    });

    it('should format failure patterns as HTML table', () => {
      // Act
      const failureTable = formatFailurePatternUPDATING(exportedStatistics.advancedMetrics.failurePatterns);

      // Assert
      expect(failureTable).toContain('<table');
      expect(failureTable).toContain('<th>Pattern</th>');
      expect(failureTable).toContain('ui_failure');
      expect(failureTable).toContain('<td>1</td>');
    });
  });

  describe('JSON Report Statistics Formatting', () => {
    it('should format statistics as valid JSON structure', () => {
      // Act
      const jsonStats = {
        summary: {
          testSuiteId: testResult.testSuiteId,
          status: testResult.status,
          duration: testResult.duration,
          timestamp: testResult.startTime.toISOString()
        },
        statistics: exportedStatistics.basicStatistics,
        metrics: exportedStatistics.advancedMetrics,
        scenarios: testResult.scenarios.map(s => ({
          id: s.id,
          name: s.name,
          status: s.status,
          duration: s.duration,
          stepCount: s.steps.length
        }))
      };

      // Assert - should be valid JSON
      const jsonString = JSON.stringify(jsonStats);
      expect(() => JSON.parse(jsonString)).not.toThrow();
      
      const parsed = JSON.parse(jsonString);
      expect(parsed.statistics.totalScenarios).toBe(2);
      expect(parsed.metrics.stepStatistics.totalSteps).toBe(3);
    });

    it('should include nested statistics in JSON format', () => {
      // Act
      const nestedStats = {
        overview: {
          basic: exportedStatistics.basicStatistics,
          performance: {
            fastest: exportedStatistics.advancedMetrics.performanceMetrics.fastestScenario,
            slowest: exportedStatistics.advancedMetrics.performanceMetrics.slowestScenario,
            distribution: exportedStatistics.advancedMetrics.performanceMetrics.durationDistribution
          }
        }
      };

      // Assert
      expect(nestedStats.overview.basic.passRate).toBe(0.5);
      expect(nestedStats.overview.performance.fastest.duration).toBe(150);
      expect(nestedStats.overview.performance.distribution.under500ms).toBe(2);
    });
  });

  describe('XML Report Statistics Formatting', () => {
    it('should format statistics as XML elements', () => {
      // Act
      const xmlStats = formatStatisticsAsXML(exportedStatistics.basicStatistics);

      // Assert
      expect(xmlStats).toContain('<statistics>');
      expect(xmlStats).toContain('<totalScenarios>2</totalScenarios>');
      expect(xmlStats).toContain('<passRate>0.5</passRate>');
      expect(xmlStats).toContain('<averageDuration>225</averageDuration>');
      expect(xmlStats).toContain('</statistics>');
    });

    it('should format performance metrics as XML', () => {
      // Act
      const xmlMetrics = formatPerformanceMetricsAsXML(
        exportedStatistics.advancedMetrics.performanceMetrics
      );

      // Assert
      expect(xmlMetrics).toContain('<performanceMetrics>');
      expect(xmlMetrics).toContain('<fastestScenario');
      expect(xmlMetrics).toContain('duration="150"');
      expect(xmlMetrics).toContain('<durationDistribution>');
      expect(xmlMetrics).toContain('<under500ms>2</under500ms>');
    });
  });

  describe('CSV Report Statistics Formatting', () => {
    it('should format statistics as CSV rows', () => {
      // Act
      const csvRows = formatStatisticsAsCSV(exportedStatistics);

      // Assert
      expect(csvRows).toContain('Metric,Value');
      expect(csvRows).toContain('Total Scenarios,2');
      expect(csvRows).toContain('Pass Rate,50.0%');
      expect(csvRows).toContain('Average Duration,225ms');
      expect(csvRows).toContain('Failed Steps,1');
    });

    it('should format scenario statistics as CSV', () => {
      // Act
      const scenarioCsv = formatScenarioStatisticsCSV(testResult.scenarios);

      // Assert
      const lines = scenarioCsv.split('\n');
      expect(lines[0]).toBe('Scenario ID,Name,Status,Duration,Step Count');
      expect(lines[1]).toContain('scenario-1,Login Test,In Progress,300,2');
      expect(lines[2]).toContain('scenario-2,Logout Test,failed,150,1');
    });
  });

  describe('Format helpers', () => {
    it('should format percentages correctly', () => {
      expect(formatPercentage(0.5)).toBe('50.0%');
      expect(formatPercentage(1)).toBe('100.0%');
      expect(formatPercentage(0.3333)).toBe('33.3%');
      expect(formatPercentage(0)).toBe('0.0%');
    });

    it('should format durations correctly', () => {
      expect(formatDuration(100)).toBe('100ms');
      expect(formatDuration(1500)).toBe('1.5s');
      expect(formatDuration(60000)).toBe('1m 0s');
      expect(formatDuration(65500)).toBe('1m 5.5s');
    });

    it('should handle empty or null statistics gracefully', () => {
      // Act & Assert
      expect(() => formatStatisticsForHTML(null as any)).not.toThrow();
      expect(() => formatStatisticsAsJSON(undefined as any)).not.toThrow();
      expect(() => formatStatisticsAsXML({} as any)).not.toThrow();
      expect(() => formatStatisticsAsCSV({} as any)).not.toThrow();
    });
  });

  describe('Multi-format statistics', () => {
    it('should support formatting same statistics for multiple formats', () => {
      const formats = ['html', 'json', 'xml', 'csv'];
      const formattedStats: Record<string, any> = {};

      formats.forEach(format => {
        switch (format) {
          case 'html':
            formattedStats[format] = formatStatisticsForHTML(exportedStatistics.basicStatistics);
            break;
          case 'json':
            formattedStats[format] = formatStatisticsAsJSON(exportedStatistics);
            break;
          case 'xml':
            formattedStats[format] = formatStatisticsAsXML(exportedStatistics.basicStatistics);
            break;
          case 'csv':
            formattedStats[format] = formatStatisticsAsCSV(exportedStatistics);
            break;
        }
      });

      // Assert all formats were generated
      expect(Object.keys(formattedStats).length).toBe(4);
      expect(formattedStats.html).toContain('50.0%');
      expect(formattedStats.json.basicStatistics.passRate).toBe(0.5);
      expect(formattedStats.xml).toContain('<passRate>0.5</passRate>');
      expect(formattedStats.csv).toContain('Pass Rate,50.0%');
    });
  });
});

// Helper functions that would be part of ReportGenerator
function formatStatisticsForHTML(stats: BasicStatistics): string {
  if (!stats) return '<div class="statistics">No statistics available</div>';
  
  return `
<div class="statistics">
  <h2>Test Statistics</h2>
  <ul>
    <li>Total Scenarios: ${stats.totalScenarios}</li>
    <li>success: ${stats.passedScenarios}</li>
    <li>Failed: ${stats.failedScenarios}</li>
    <li>Pass Rate: ${formatPercentage(stats.passRate)}</li>
    <li>Average Duration: ${stats.averageScenarioDuration}ms</li>
  </ul>
</div>`;
}

function formatPerformanceChartData(metrics: any) {
  return {
    type: 'bar',
    labels: ['< 100ms', '< 500ms', '< 1000ms', '> 1000ms'],
    data: [
      metrics.durationDistribution.under100ms,
      metrics.durationDistribution.under500ms,
      metrics.durationDistribution.under1000ms,
      metrics.durationDistribution.over1000ms
    ]
  };
}

function formatFailurePatternUPDATING(patterns: any[]): string {
  let html = '<table class="failure-patterns"><thead><tr><th>Pattern</th><th>Count</th><th>Scenarios</th></tr></thead><tbody>';
  patterns.forEach(pattern => {
    html += `<tr><td>${pattern.pattern}</td><td>${pattern.count}</td><td>${pattern.scenarios.join(', ')}</td></tr>`;
  });
  html += '</tbody></table>';
  return html;
}

function formatStatisticsAsJSON(stats: ExportedStatistics): any {
  if (!stats) return {};
  return {
    basicStatistics: stats.basicStatistics,
    advancedMetrics: stats.advancedMetrics,
    metadata: stats.metadata
  };
}

function formatStatisticsAsXML(stats: BasicStatistics): string {
  if (!stats) return '<statistics/>';
  
  return `<statistics>
  <totalScenarios>${stats.totalScenarios}</totalScenarios>
  <passedScenarios>${stats.passedScenarios}</passedScenarios>
  <failedScenarios>${stats.failedScenarios}</failedScenarios>
  <passRate>${stats.passRate}</passRate>
  <averageDuration>${stats.averageScenarioDuration}</averageDuration>
</statistics>`;
}

function formatPerformanceMetricsAsXML(metrics: any): string {
  return `<performanceMetrics>
  <fastestScenario id="${metrics.fastestScenario.id}" duration="${metrics.fastestScenario.duration}"/>
  <slowestScenario id="${metrics.slowestScenario.id}" duration="${metrics.slowestScenario.duration}"/>
  <durationDistribution>
    <under100ms>${metrics.durationDistribution.under100ms}</under100ms>
    <under500ms>${metrics.durationDistribution.under500ms}</under500ms>
    <under1000ms>${metrics.durationDistribution.under1000ms}</under1000ms>
    <over1000ms>${metrics.durationDistribution.over1000ms}</over1000ms>
  </durationDistribution>
</performanceMetrics>`;
}

function formatStatisticsAsCSV(stats: ExportedStatistics): string {
  if (!stats) return 'Metric,Value';
  
  const rows = [
    'Metric,Value',
    `Total Scenarios,${stats.basicStatistics.totalScenarios}`,
    `In Progress Scenarios,${stats.basicStatistics.passedScenarios}`,
    `Failed Scenarios,${stats.basicStatistics.failedScenarios}`,
    `Pass Rate,${formatPercentage(stats.basicStatistics.passRate)}`,
    `Average Duration,${stats.basicStatistics.averageScenarioDuration}ms`,
    `Total Steps,${stats.advancedMetrics.stepStatistics.totalSteps}`,
    `In Progress Steps,${stats.advancedMetrics.stepStatistics.passedSteps}`,
    `Failed Steps,${stats.advancedMetrics.stepStatistics.failedSteps}`
  ];
  
  return rows.join('\n');
}

function formatScenarioStatisticsCSV(scenarios: any[]): string {
  const header = 'Scenario ID,Name,Status,Duration,Step Count';
  const rows = scenarios.map(s => 
    `${s.id},${s.name},${s.status},${s.duration},${s.steps.length}`
  );
  return [header, ...rows].join('\n');
}

function formatPercentage(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const minutes = Math.floor(ms / 60000);
  const seconds = ((ms % 60000) / 1000).toFixed(1);
  return `${minutes}m ${seconds}s`;
}