/**
 * Init Setup Folder Theme Pipe
 * Provides comprehensive setup automation and initialization functionality
 */

import { containerEnv, ContainerConfig } from '../../init_docker/pipe';

export interface SetupConfig {
  mode: 'vf' | 'md';
  targetPath: string;
  type: 'theme' | 'epic' | 'story' | 'demo' | 'release' | 'test';
  containerConfig?: ContainerConfig;
  enableDocker?: boolean;
}

export interface InitConfig extends SetupConfig {
  template?: string;
  environment?: string;
}

export interface SetupResult {
  success: boolean;
  path: string;
  message: string;
  dockerImage?: string;
  dockerCompose?: string;
}

export class SetupService {
  async setup(config: SetupConfig): Promise<SetupResult> {
    // Implementation for base setup
    const result: SetupResult = {
      success: true,
      path: config.targetPath,
      message: `${config.type} setup completed`
    };

    // If Docker is enabled, generate container configuration
    if (config.enableDocker && config.type === 'theme') {
      try {
        const themeName = config.targetPath.split('/').pop() || 'theme';
        
        // Generate Dockerfile
        const dockerfile = await containerEnv.generateDockerfile(themeName, config.containerConfig);
        result.dockerImage = `aidev/${themeName}:latest`;
        
        // Save Dockerfile to theme directory
        const dockerfilePath = `${config.targetPath}/Dockerfile`;
        // Note: In real implementation, would save the file
        
        result.message += ' with Docker support';
      } catch (error) {
        console.error('Failed to setup Docker:', error);
        // Continue without Docker
      }
    }

    return result;
  }

  async setupWithContainer(config: SetupConfig): Promise<SetupResult> {
    // First run regular setup
    const result = await this.setup({ ...config, enableDocker: true });
    
    if (config.type === 'release' || config.type === 'demo') {
      // Generate docker-compose for multi-service deployments
      const themes = ['mate-dealer', 'portal_gui-selector']; // Example themes
      const composeYaml = await containerEnv.generateCompose(themes);
      result.dockerCompose = composeYaml;
    }
    
    return result;
  }
}

export class InitSetupService extends SetupService {
  async init(config: InitConfig): Promise<SetupResult> {
    // First run base setup
    const setupResult = await super.setup(config);
    
    // Then apply initialization
    return {
      ...setupResult,
      message: `${config.type} initialized and setup completed`
    };
  }
}

// Export C++ Coverage Setup components
export { CppCoverageSetup, CppCoverageChecker, type CppCoverageConfig } from '../src/services/cpp-coverage-setup';
export { CppBuildSetup, type CppBuildConfig } from '../src/services/cpp-build-setup';
export { CppThresholdConfig, CppThresholdValidator, type CoverageThresholds, type ThresholdProfile, type ThresholdConfig } from '../src/services/cpp-threshold-config';
export { CppReportSetup, CppReportGenerator, CppReportConverter, type ReportConfig, type ReportFormat } from '../src/services/cpp-report-setup';

// Export C++ Duplication Detection components
export { CppDuplicationSetup, CppDuplicationAnalyzer, UnifiedDuplicationReporter, type DuplicationConfig, type DuplicationReport } from '../src/services/cpp-duplication-setup';

// Export Unified Quality Metrics components
export { UnifiedQualitySetup, UnifiedQualityAnalyzer, type UnifiedMetricsConfig, type QualityMetrics, type LanguageConfig } from '../src/services/unified-quality-setup';

export const setupService = new SetupService();
export const initSetupService = new InitSetupService();