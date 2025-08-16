import { generateAppCoverageReport } from './index';
import { IntegratedCoverageService } from './services/integrated-coverage-service';

jest.mock('./services/integrated-coverage-service');

describe('Coverage Aggregator Index', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("generateAppCoverageReport", () => {
    it('should create service with default paths when not provided', async () => {
      const mockGenerateIntegratedReport = jest.fn().mockResolvedValue(undefined);
      (IntegratedCoverageService as jest.MockedClass<typeof IntegratedCoverageService>).mockImplementation(() => ({
        generateIntegratedReport: mockGenerateIntegratedReport
      } as any));

      await generateAppCoverageReport();

      expect(IntegratedCoverageService).toHaveBeenCalledWith(
        undefined,
        undefined
      );
      expect(mockGenerateIntegratedReport).toHaveBeenCalled();
    });

    it('should create service with custom paths when provided', async () => {
      const customLayerPath = '/custom/layer';
      const customOutputDir = '/custom/output';
      const mockGenerateIntegratedReport = jest.fn().mockResolvedValue(undefined);
      (IntegratedCoverageService as jest.MockedClass<typeof IntegratedCoverageService>).mockImplementation(() => ({
        generateIntegratedReport: mockGenerateIntegratedReport
      } as any));

      await generateAppCoverageReport(customLayerPath, customOutputDir);

      expect(IntegratedCoverageService).toHaveBeenCalledWith(
        customLayerPath,
        customOutputDir
      );
      expect(mockGenerateIntegratedReport).toHaveBeenCalled();
    });

    it('should propagate errors from service', async () => {
      const error = new Error('Service error');
      const mockGenerateIntegratedReport = jest.fn().mockRejectedValue(error);
      (IntegratedCoverageService as jest.MockedClass<typeof IntegratedCoverageService>).mockImplementation(() => ({
        generateIntegratedReport: mockGenerateIntegratedReport
      } as any));

      await expect(generateAppCoverageReport()).rejects.toThrow('Service error');
    });
  });

  describe('exports', () => {
    it('should export all necessary components', () => {
      const exports = require('./index');

      expect(exports.CoverageAggregator).toBeDefined();
      expect(exports.CoverageReportGenerator).toBeDefined();
      expect(exports.SetupAggregatorAdapter).toBeDefined();
      expect(exports.IntegratedCoverageService).toBeDefined();
      expect(exports.generateAppCoverageReport).toBeDefined();
    });
  });
});