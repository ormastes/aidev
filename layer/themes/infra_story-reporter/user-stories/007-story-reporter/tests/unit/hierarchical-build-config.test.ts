import {
  HierarchicalBuildConfig,
  HierarchicalBuildResult,
  createHierarchicalBuildConfig,
  mergeBuildConfigs,
  validateHierarchicalBuildConfig
} from '../../src/domain/hierarchical-build-config';
import { createDefaultTestConfiguration } from '../../src/domain/test-configuration';

describe("HierarchicalBuildConfig", () => {
  describe("createHierarchicalBuildConfig", () => {
    it('should create a hierarchical build config with defaults', () => {
      const baseConfig = createDefaultTestConfiguration(
        'test-suite-1',
        ['feature1.feature'],
        ['steps1.ts']
      );
      
      const hierarchicalConfig = createHierarchicalBuildConfig(
        baseConfig,
        'theme',
        'parent-123'
      );
      
      expect(hierarchicalConfig.buildType).toBe('theme');
      expect(hierarchicalConfig.parentId).toBe('parent-123');
      expect(hierarchicalConfig.children).toEqual([]);
      expect(hierarchicalConfig.buildSettings).toBeDefined();
      expect(hierarchicalConfig.aggregation).toBeDefined();
      expect(hierarchicalConfig.executionOrder).toBeDefined();
    });

    it('should set default build settings', () => {
      const baseConfig = createDefaultTestConfiguration(
        'test-suite-1',
        ['feature1.feature'],
        ['steps1.ts']
      );
      
      const config = createHierarchicalBuildConfig(baseConfig, 'epic');
      
      expect(config.buildSettings?.workingDirectory).toBe('./');
      expect(config.buildSettings?.env).toEqual({});
      expect(config.buildSettings?.artifacts).toEqual({
        paths: [],
        includeReports: true,
        includeCoverage: true,
        includeLogs: true
      });
    });

    it('should set default aggregation settings', () => {
      const baseConfig = createDefaultTestConfiguration(
        'test-suite-1',
        ['feature1.feature'],
        ['steps1.ts']
      );
      
      const config = createHierarchicalBuildConfig(baseConfig, 'story');
      
      expect(config.aggregation?.aggregateTests).toBe(true);
      expect(config.aggregation?.aggregateCoverage).toBe(true);
      expect(config.aggregation?.aggregateLogs).toBe(true);
      expect(config.aggregation?.strategy).toBe("hierarchical");
      expect(config.aggregation?.failureHandling).toBe("continue");
    });

    it('should set default execution order settings', () => {
      const baseConfig = createDefaultTestConfiguration(
        'test-suite-1',
        ['feature1.feature'],
        ['steps1.ts']
      );
      
      const config = createHierarchicalBuildConfig(baseConfig, 'theme');
      
      expect(config.executionOrder?.priority).toBe(0);
      expect(config.executionOrder?.parallelizable).toBe(true);
      expect(config.executionOrder?.maxParallelChildren).toBe(4);
    });
  });

  describe("mergeBuildConfigs", () => {
    it('should merge parent and child configurations', () => {
      const parent = createHierarchicalBuildConfig(
        createDefaultTestConfiguration('parent', ['parent.feature'], ['parent.ts']),
        'epic'
      );
      
      const childOverrides: Partial<HierarchicalBuildConfig> = {
        testSuiteId: 'child',
        buildSettings: {
          workingDirectory: './child',
          buildCommand: 'npm run build:child',
          env: { CHILD_ENV: 'true' }
        }
      };
      
      const merged = mergeBuildConfigs(parent, childOverrides);
      
      expect(merged.testSuiteId).toBe('child');
      expect(merged.buildSettings?.workingDirectory).toBe('./child');
      expect(merged.buildSettings?.buildCommand).toBe('npm run build:child');
      expect(merged.buildSettings?.env?.CHILD_ENV).toBe('true');
    });

    it('should merge environment variables', () => {
      const parent = createHierarchicalBuildConfig(
        createDefaultTestConfiguration('parent', ['parent.feature'], ['parent.ts']),
        'epic'
      );
      parent.buildSettings!.env = { PARENT_VAR: 'parent', SHARED_VAR: 'parent' };
      
      const child: Partial<HierarchicalBuildConfig> = {
        buildSettings: {
          env: { CHILD_VAR: 'child', SHARED_VAR: 'child' }
        }
      };
      
      const merged = mergeBuildConfigs(parent, child);
      
      expect(merged.buildSettings?.env).toEqual({
        PARENT_VAR: 'parent',
        CHILD_VAR: 'child',
        SHARED_VAR: 'child' // Child overrides parent
      });
    });

    it('should merge artifact settings', () => {
      const parent = createHierarchicalBuildConfig(
        createDefaultTestConfiguration('parent', ['parent.feature'], ['parent.ts']),
        'epic'
      );
      parent.buildSettings!.artifacts = {
        paths: ['dist/**'],
        includeReports: true,
        includeCoverage: false,
        includeLogs: true
      };
      
      const child: Partial<HierarchicalBuildConfig> = {
        buildSettings: {
          artifacts: {
            paths: ['build/**'],
            includeCoverage: true
          }
        }
      };
      
      const merged = mergeBuildConfigs(parent, child);
      
      expect(merged.buildSettings?.artifacts).toEqual({
        paths: ['build/**'], // Child replaces parent
        includeReports: true, // Inherited from parent
        includeCoverage: true, // Child overrides
        includeLogs: true // Inherited from parent
      });
    });

    it('should preserve children array from child if provided', () => {
      const parent = createHierarchicalBuildConfig(
        createDefaultTestConfiguration('parent', ['parent.feature'], ['parent.ts']),
        'epic'
      );
      parent.children = [
        createHierarchicalBuildConfig(
          createDefaultTestConfiguration('old-child', ['old.feature'], ['old.ts']),
          'theme'
        )
      ];
      
      const newChild = createHierarchicalBuildConfig(
        createDefaultTestConfiguration('new-child', ['new.feature'], ['new.ts']),
        'theme'
      );
      
      const child: Partial<HierarchicalBuildConfig> = {
        children: [newChild]
      };
      
      const merged = mergeBuildConfigs(parent, child);
      
      expect(merged.children).toHaveLength(1);
      expect(merged.children[0].testSuiteId).toBe('new-child');
    });
  });

  describe("validateHierarchicalBuildConfig", () => {
    it('should validate a valid configuration', () => {
      const config = createHierarchicalBuildConfig(
        createDefaultTestConfiguration('test', ['test.feature'], ['test.ts']),
        'theme'
      );
      
      expect(() => validateHierarchicalBuildConfig(config)).not.toThrow();
    });

    it('should throw error for missing configuration', () => {
      expect(() => validateHierarchicalBuildConfig(null)).toThrow(
        'Hierarchical build configuration is required'
      );
    });

    it('should throw error for invalid build type', () => {
      const config = createHierarchicalBuildConfig(
        createDefaultTestConfiguration('test', ['test.feature'], ['test.ts']),
        'theme'
      );
      (config as any).buildType = 'invalid';
      
      expect(() => validateHierarchicalBuildConfig(config)).toThrow(
        'Invalid build type: invalid'
      );
    });

    it('should throw error if children is not an array', () => {
      const config = createHierarchicalBuildConfig(
        createDefaultTestConfiguration('test', ['test.feature'], ['test.ts']),
        'theme'
      );
      (config as any).children = 'not-an-array';
      
      expect(() => validateHierarchicalBuildConfig(config)).toThrow(
        'Children must be an array'
      );
    });

    it('should validate children recursively', () => {
      const parent = createHierarchicalBuildConfig(
        createDefaultTestConfiguration('parent', ['parent.feature'], ['parent.ts']),
        'epic'
      );
      
      const validChild = createHierarchicalBuildConfig(
        createDefaultTestConfiguration('valid-child', ['child.feature'], ['child.ts']),
        'theme'
      );
      
      const invalidChild = createHierarchicalBuildConfig(
        createDefaultTestConfiguration('invalid-child', ['child.feature'], ['child.ts']),
        'theme'
      );
      (invalidChild as any).buildType = 'invalid';
      
      parent.children = [validChild, invalidChild];
      
      expect(() => validateHierarchicalBuildConfig(parent)).toThrow(
        'Invalid build type: invalid'
      );
    });

    it('should validate aggregation strategy', () => {
      const config = createHierarchicalBuildConfig(
        createDefaultTestConfiguration('test', ['test.feature'], ['test.ts']),
        'theme'
      );
      config.aggregation!.strategy = 'invalid' as any;
      
      expect(() => validateHierarchicalBuildConfig(config)).toThrow(
        'Invalid aggregation strategy: invalid'
      );
    });

    it('should validate failure handling', () => {
      const config = createHierarchicalBuildConfig(
        createDefaultTestConfiguration('test', ['test.feature'], ['test.ts']),
        'theme'
      );
      config.aggregation!.failureHandling = 'invalid' as any;
      
      expect(() => validateHierarchicalBuildConfig(config)).toThrow(
        'Invalid failure handling: invalid'
      );
    });

    it('should allow valid aggregation strategies', () => {
      const config = createHierarchicalBuildConfig(
        createDefaultTestConfiguration('test', ['test.feature'], ['test.ts']),
        'theme'
      );
      
      const validStrategies: Array<'merge' | 'append' | "hierarchical"> = ['merge', 'append', "hierarchical"];
      
      for (const strategy of validStrategies) {
        config.aggregation!.strategy = strategy;
        expect(() => validateHierarchicalBuildConfig(config)).not.toThrow();
      }
    });

    it('should allow valid failure handling options', () => {
      const config = createHierarchicalBuildConfig(
        createDefaultTestConfiguration('test', ['test.feature'], ['test.ts']),
        'theme'
      );
      
      const validOptions: Array<'fail-fast' | "continue" | 'ignore-children'> = 
        ['fail-fast', "continue", 'ignore-children'];
      
      for (const option of validOptions) {
        config.aggregation!.failureHandling = option;
        expect(() => validateHierarchicalBuildConfig(config)).not.toThrow();
      }
    });
  });

  describe("HierarchicalBuildResult", () => {
    it('should represent build result structure', () => {
      const result: HierarchicalBuildResult = {
        buildId: 'test-build',
        buildType: 'theme',
        status: 'passed',
        startTime: new Date('2024-01-01T10:00:00Z'),
        endTime: new Date('2024-01-01T10:05:00Z'),
        duration: 300000,
        testResults: {
          total: 100,
          passed: 95,
          failed: 3,
          skipped: 2,
          errors: [
            {
              test: 'test1',
              error: 'Assertion failed',
              stack: 'at test1.spec.ts:10'
            }
          ]
        },
        coverage: {
          lines: { total: 1000, covered: 850, percentage: 85 },
          branches: { total: 200, covered: 160, percentage: 80 },
          functions: { total: 100, covered: 90, percentage: 90 },
          statements: { total: 1000, covered: 850, percentage: 85 }
        },
        artifacts: {
          reports: ['report1.html', 'report2.json'],
          coverage: ['coverage/lcov.info'],
          logs: ['build.log'],
          other: ['screenshots/test1.png']
        },
        children: [],
        aggregated: {
          testResults: {
            total: 200,
            passed: 190,
            failed: 6,
            skipped: 4
          },
          coverage: {
            lines: { total: 2000, covered: 1700, percentage: 85 },
            branches: { total: 400, covered: 320, percentage: 80 },
            functions: { total: 200, covered: 180, percentage: 90 },
            statements: { total: 2000, covered: 1700, percentage: 85 }
          }
        },
        logs: [
          {
            timestamp: new Date('2024-01-01T10:01:00Z'),
            level: 'info',
            message: 'Build started',
            source: 'build'
          }
        ],
        error: undefined
      };
      
      expect(result.buildId).toBe('test-build');
      expect(result.buildType).toBe('theme');
      expect(result.status).toBe('passed');
      expect(result.testResults?.total).toBe(100);
      expect(result.coverage?.lines.percentage).toBe(85);
      expect(result.artifacts?.reports).toHaveLength(2);
      expect(result.aggregated?.testResults?.total).toBe(200);
    });

    it('should handle failed build result', () => {
      const result: HierarchicalBuildResult = {
        buildId: 'failed-build',
        buildType: 'epic',
        status: 'failed',
        startTime: new Date('2024-01-01T10:00:00Z'),
        endTime: new Date('2024-01-01T10:01:00Z'),
        duration: 60000,
        children: [],
        error: {
          message: 'Build failed due to compilation error',
          stack: 'at src/index.ts:10',
          phase: 'build'
        }
      };
      
      expect(result.status).toBe('failed');
      expect(result.error?.message).toContain('compilation error');
      expect(result.error?.phase).toBe('build');
    });
  });
});