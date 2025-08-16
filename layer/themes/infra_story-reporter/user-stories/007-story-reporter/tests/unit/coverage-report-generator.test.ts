import { CoverageReportGenerator } from '../../../../src/services/coverage-report-generator';
import * as fs from 'fs/promises';
import { path } from '../../../../../infra_external-log-lib/src';

describe("CoverageReportGenerator", () => {
  let generator: CoverageReportGenerator;
  const testDir = path.join(__dirname, 'test-output');

  beforeEach(async () => {
    generator = new CoverageReportGenerator();
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe("generate", () => {
    it('should include pass field in metadata when all thresholds are met', async () => {
      const results = {
        branchCoverage: { percentage: 85, covered: 85, total: 100, details: [] },
        systemTestClassCoverage: { percentage: 95, coveredClasses: 95, totalClasses: 100, details: [] },
        duplicationCheck: { percentage: 3, duplicatedLines: 30, totalLines: 1000, duplicates: [] }
      };

      await generator.generate(testDir, 'test', results);
      
      // Read the JSON report
      const reportDir = path.join(testDir, 'gen', 'coverage-reports');
      const files = await fs.readdir(reportDir);
      const jsonFile = files.find(f => f.endsWith('.json'));
      const jsonContent = await fs.readFile(path.join(reportDir, jsonFile!), 'utf-8');
      const report = JSON.parse(jsonContent);

      expect(report.metadata.pass).toBe(true);
      expect(report.metadata.summary.description).toContain('✅ All coverage requirements met');
    });

    it('should include pass field as false when thresholds are not met', async () => {
      const results = {
        branchCoverage: { percentage: 70, covered: 70, total: 100, details: [] },
        systemTestClassCoverage: { percentage: 85, coveredClasses: 85, totalClasses: 100, details: [] },
        duplicationCheck: { percentage: 10, duplicatedLines: 100, totalLines: 1000, duplicates: [] }
      };

      await generator.generate(testDir, 'test', results);
      
      // Read the JSON report
      const reportDir = path.join(testDir, 'gen', 'coverage-reports');
      const files = await fs.readdir(reportDir);
      const jsonFile = files.find(f => f.endsWith('.json'));
      const jsonContent = await fs.readFile(path.join(reportDir, jsonFile!), 'utf-8');
      const report = JSON.parse(jsonContent);

      expect(report.metadata.pass).toBe(false);
      expect(report.metadata.summary.description).toContain('❌ Coverage requirements not met');
      expect(report.metadata.summary.description).toContain('Branch coverage 70.0% (min 80%)');
      expect(report.metadata.summary.description).toContain('System test coverage 85.0% (min 90%)');
      expect(report.metadata.summary.description).toContain('Code duplication 10.0% (max 5%)');
    });

    it('should generate markdown report with pass/fail status', async () => {
      const results = {
        branchCoverage: { percentage: 85, covered: 85, total: 100, details: [] },
        systemTestClassCoverage: { percentage: 95, coveredClasses: 95, totalClasses: 100, details: [] },
        duplicationCheck: { percentage: 3, duplicatedLines: 30, totalLines: 1000, duplicates: [] }
      };

      const reportPath = await generator.generate(testDir, 'test', results);
      const mdContent = await fs.readFile(reportPath, 'utf-8');

      expect(mdContent).toContain('**Status**: ✅ PASS');
      expect(mdContent).toContain('✅ All coverage requirements met');
    });

    it('should generate HTML report with pass/fail status', async () => {
      const results = {
        branchCoverage: { percentage: 70, covered: 70, total: 100, details: [] },
        systemTestClassCoverage: { percentage: 85, coveredClasses: 85, totalClasses: 100, details: [] },
        duplicationCheck: { percentage: 10, duplicatedLines: 100, totalLines: 1000, duplicates: [] }
      };

      await generator.generate(testDir, 'test', results);
      
      // Read the HTML report
      const reportDir = path.join(testDir, 'gen', 'coverage-reports');
      const files = await fs.readdir(reportDir);
      const htmlFile = files.find(f => f.endsWith('.html'));
      const htmlContent = await fs.readFile(path.join(reportDir, htmlFile!), 'utf-8');

      expect(htmlContent).toContain('<strong>Status:</strong>');
      expect(htmlContent).toContain('❌ FAIL');
      expect(htmlContent).toContain('❌ Coverage requirements not met');
    });
  });
});