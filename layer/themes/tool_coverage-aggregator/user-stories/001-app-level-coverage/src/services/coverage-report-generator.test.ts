import { CoverageReportGenerator } from './coverage-report-generator';
import { AggregatedCoverage } from '../models/coverage-metrics';
import { fs } from '../../../../../infra_external-log-lib/src';
import { path } from '../../../../../infra_external-log-lib/src';

jest.mock('fs');

describe('CoverageReportGenerator', () => {
  let generator: CoverageReportGenerator;
  const mockOutputDir = '/mock/output';

  beforeEach(() => {
    generator = new CoverageReportGenerator(mockOutputDir);
    jest.clearAllMocks();
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    (fs.mkdirSync as jest.Mock).mockImplementation(() => {});
    (fs.writeFileSync as jest.Mock).mockImplementation(() => {});
  });

  describe('generateReport', () => {
    const mockAppCoverage: AggregatedCoverage = {
      name: 'Test App',
      type: 'app',
      path: '/test',
      coverage: {
        lines: { total: 1000, covered: 850, pct: 85 },
        statements: { total: 1000, covered: 850, pct: 85 },
        functions: { total: 100, covered: 90, pct: 90 },
        branches: { total: 200, covered: 160, pct: 80 }
      },
      systemTestCoverage: {
        classCount: 50,
        coveredClassCount: 40,
        classCoveragePct: 80
      },
      duplication: {
        duplicatedLines: 50,
        totalLines: 1000,
        duplicationPct: 5
      },
      children: [
        {
          name: 'theme1',
          type: 'theme',
          path: '/test/theme1',
          coverage: {
            lines: { total: 500, covered: 400, pct: 80 },
            statements: { total: 500, covered: 400, pct: 80 },
            functions: { total: 50, covered: 40, pct: 80 },
            branches: { total: 100, covered: 75, pct: 75 }
          },
          systemTestCoverage: {
            classCount: 25,
            coveredClassCount: 18,
            classCoveragePct: 72
          },
          duplication: {
            duplicatedLines: 30,
            totalLines: 500,
            duplicationPct: 6
          },
          timestamp: new Date()
        }
      ],
      timestamp: new Date()
    };

    it('should generate JSON report', async () => {
      await generator.generateReport(mockAppCoverage);

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        path.join(mockOutputDir, 'coverage-report.json'),
        expect.stringContaining('"app"')
      );
    });

    it('should generate HTML report', async () => {
      await generator.generateReport(mockAppCoverage);

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        path.join(mockOutputDir, 'coverage-report.html'),
        expect.stringContaining('<html')
      );
    });

    it('should generate summary report', async () => {
      await generator.generateReport(mockAppCoverage);

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        path.join(mockOutputDir, 'coverage-summary.md'),
        expect.stringContaining('# Coverage Summary Report')
      );
    });

    it('should create output directory if it does not exist', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      
      new CoverageReportGenerator(mockOutputDir);

      expect(fs.mkdirSync).toHaveBeenCalledWith(
        mockOutputDir,
        { recursive: true }
      );
    });
  });

  describe('threshold warnings', () => {
    it('should generate warnings for metrics below threshold', async () => {
      const lowCoverage: AggregatedCoverage = {
        name: 'Test App',
        type: 'app',
        path: '/test',
        coverage: {
          lines: { total: 100, covered: 60, pct: 60 },
          statements: { total: 100, covered: 60, pct: 60 },
          functions: { total: 10, covered: 6, pct: 60 },
          branches: { total: 20, covered: 10, pct: 50 } // Below 80% threshold
        },
        systemTestCoverage: {
          classCount: 10,
          coveredClassCount: 5,
          classCoveragePct: 50 // Below 80% threshold
        },
        duplication: {
          duplicatedLines: 20,
          totalLines: 100,
          duplicationPct: 20 // Above 5% threshold
        },
        timestamp: new Date()
      };

      await generator.generateReport(lowCoverage);

      const htmlCall = (fs.writeFileSync as jest.Mock).mock.calls.find(
        call => call[0].includes('coverage-report.html')
      );

      expect(htmlCall[1]).toContain('Coverage Warnings');
      expect(htmlCall[1]).toContain('System test class coverage');
      expect(htmlCall[1]).toContain('Branch coverage');
      expect(htmlCall[1]).toContain('Code duplication');
    });
  });

  describe('status class assignment', () => {
    it('should assign correct status classes based on thresholds', async () => {
      const coverage: AggregatedCoverage = {
        name: 'Test App',
        type: 'app',
        path: '/test',
        coverage: {
          lines: { total: 100, covered: 90, pct: 90 },
          statements: { total: 100, covered: 90, pct: 90 },
          functions: { total: 10, covered: 9, pct: 90 },
          branches: { total: 20, covered: 18, pct: 90 }
        },
        systemTestCoverage: {
          classCount: 10,
          coveredClassCount: 9,
          classCoveragePct: 90
        },
        duplication: {
          duplicatedLines: 3,
          totalLines: 100,
          duplicationPct: 3
        },
        timestamp: new Date()
      };

      await generator.generateReport(coverage);

      const htmlCall = (fs.writeFileSync as jest.Mock).mock.calls.find(
        call => call[0].includes('coverage-report.html')
      );

      // Should have 'pass' class for metrics above threshold
      expect(htmlCall[1]).toContain('pass');
      expect(htmlCall[1]).not.toContain('fail');
    });
  });
});