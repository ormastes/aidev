export { CoverageAggregator } from './services/coverage-aggregator';
export { CoverageReportGenerator } from './services/coverage-report-generator';
export { SetupAggregatorAdapter } from './services/setup-aggregator-adapter';
export { IntegratedCoverageService } from './services/integrated-coverage-service';
export * from './models/coverage-metrics';

import { IntegratedCoverageService } from './services/integrated-coverage-service';

export async function generateAppCoverageReport(
  layerPath?: string,
  outputDir?: string
): Promise<void> {
  const service = new IntegratedCoverageService(layerPath, outputDir);
  await service.generateIntegratedReport();
}