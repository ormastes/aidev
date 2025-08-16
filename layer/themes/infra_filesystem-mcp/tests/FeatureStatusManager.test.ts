import { FeatureStatusManager } from '../children/FeatureStatusManager';
import { VFDistributedFeatureWrapper } from '../children/VFDistributedFeatureWrapper';
import { fsPromises as fs } from 'fs/promises';
import { path } from '../../infra_external-log-lib/src';

describe("FeatureStatusManager", () => {
  const testDir = path.join(process.cwd(), 'temp', 'feature-status-test');
  let manager: FeatureStatusManager;

  beforeEach(async () => {
    // Clean up and create test directory
    await fs.rm(testDir, { recursive: true, force: true });
    await fs.mkdir(testDir, { recursive: true });
    
    // Create initial FEATURE.vf.json
    const initialFeatureFile = {
      metadata: {
        level: 'root' as const,
        path: '/FEATURE.vf.json',
        version: '1.0.0',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      features: {
        infrastructure: []
      }
    };
    
    await fs.writeFile(
      path.join(testDir, 'FEATURE.vf.json'),
      JSON.stringify(initialFeatureFile, null, 2)
    );
    
    manager = new FeatureStatusManager(testDir);
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe("addFeature", () => {
    it('should add a new feature with validation', async () => {
      const feature = {
        name: 'Test Feature',
        data: {
          title: 'Test Feature Implementation',
          description: 'This is a test feature for validation',
          level: 'theme' as const,
          status: 'planned' as const,
          priority: 'high' as const,
          tags: ['test', "validation"],
          virtual_path: '/layer/themes/test/FEATURE.vf.json'
        }
      };

      const result = await manager.addFeature("infrastructure", feature);
      
      expect(result.id).toBeDefined();
      expect(result.validation.isValid).toBe(true);
      expect(result.validation.errors).toHaveLength(0);
    });

    it('should reject feature with missing required fields', async () => {
      const invalidFeature = {
        name: 'Invalid Feature',
        data: {
          title: 'Test Feature',
          // Missing description, level, status, priority
          virtual_path: '/test.vf.json'
        } as any
      };

      await expect(manager.addFeature("infrastructure", invalidFeature))
        .rejects.toThrow('Feature validation failed');
    });

    it('should allow draft features even with validation errors', async () => {
      const draftFeature = {
        name: 'Draft Feature',
        data: {
          title: 'Draft Feature',
          description: '',  // Empty description
          level: 'theme' as const,
          status: 'planned' as const,
          priority: 'low' as const,
          tags: ['draft'],
          virtual_path: '/draft.vf.json'
        }
      };

      const result = await manager.addFeature("infrastructure", draftFeature);
      expect(result.id).toBeDefined();
    });
  });

  describe("updateFeature", () => {
    let featureId: string;

    beforeEach(async () => {
      const feature = {
        name: 'Update Test Feature',
        data: {
          title: 'Feature to Update',
          description: 'This feature will be updated',
          level: 'theme' as const,
          status: 'planned' as const,
          priority: 'medium' as const,
          virtual_path: '/update-test.vf.json'
        }
      };

      const result = await manager.addFeature("infrastructure", feature);
      featureId = result.id;
    });

    it('should allow valid status transition from planned to in-progress', async () => {
      const updateRequest = {
        featureId,
        categoryName: "infrastructure",
        updates: {
          status: 'in-progress' as const
        }
      };

      const validation = await manager.updateFeature(updateRequest);
      
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should reject invalid status transition', async () => {
      const updateRequest = {
        featureId,
        categoryName: "infrastructure",
        updates: {
          status: "completed" as const  // Can't go from planned to completed directly
        }
      };

      const validation = await manager.updateFeature(updateRequest);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain(
        "Invalid status transition from 'planned' to "completed""
      );
    });

    it('should require user story report for transition to implemented', async () => {
      // First move to in-progress
      await manager.updateFeature({
        featureId,
        categoryName: "infrastructure",
        updates: { status: 'in-progress' as const }
      });

      // Try to move to implemented without report
      const updateRequest = {
        featureId,
        categoryName: "infrastructure",
        updates: {
          status: "implemented" as const
        }
      };

      const validation = await manager.updateFeature(updateRequest);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain(
        'User story report is required for this status change'
      );
    });

    it('should validate user story report when transitioning to implemented', async () => {
      // Create a mock user story report
      const reportPath = path.join(testDir, 'story-report.json');
      const report = {
        id: 'story-001',
        title: 'Test Story',
        status: "completed",
        connectedFiles: [
          'src/feature.ts',
          'tests/feature.test.ts'
        ],
        coverage: {
          systemClassCoverage: 95,
          branchCoverage: 92,
          lineCoverage: 94,
          functionCoverage: 93,
          statementCoverage: 94
        },
        duplication: {
          totalDuplication: 5,
          duplicatedLines: 50,
          totalLines: 1000
        }
      };

      await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

      // Create the connected files
      await fs.mkdir(path.join(testDir, 'src'), { recursive: true });
      await fs.mkdir(path.join(testDir, 'tests'), { recursive: true });
      await fs.writeFile(path.join(testDir, 'src/feature.ts'), 'export function feature() {}');
      await fs.writeFile(path.join(testDir, 'tests/feature.test.ts'), 'test("feature", () => {})');

      // First move to in-progress
      await manager.updateFeature({
        featureId,
        categoryName: "infrastructure",
        updates: { status: 'in-progress' as const }
      });

      // Now try to move to implemented with report
      const updateRequest = {
        featureId,
        categoryName: "infrastructure",
        updates: {
          status: "implemented" as const
        },
        userStoryReportPath: reportPath
      };

      const validation = await manager.updateFeature(updateRequest);
      
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
      expect(validation.userStoryReport).toBeDefined();
      expect(validation.coverageReport).toBeDefined();
      expect(validation.duplicationReport).toBeDefined();
    });

    it('should fail validation if coverage is below threshold', async () => {
      // Create a mock user story report with low coverage
      const reportPath = path.join(testDir, 'low-coverage-report.json');
      const report = {
        id: 'story-002',
        title: 'Low Coverage Story',
        status: "completed",
        connectedFiles: ['src/feature.ts'],
        coverage: {
          systemClassCoverage: 80,  // Below 90% threshold
          branchCoverage: 85,       // Below 90% threshold
          lineCoverage: 88,         // Below 90% threshold
          functionCoverage: 87,
          statementCoverage: 86
        },
        duplication: {
          totalDuplication: 5,
          duplicatedLines: 50,
          totalLines: 1000
        }
      };

      await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

      // Create connected file
      await fs.mkdir(path.join(testDir, 'src'), { recursive: true });
      await fs.writeFile(path.join(testDir, 'src/feature.ts'), 'export function feature() {}');

      // Move to in-progress first
      await manager.updateFeature({
        featureId,
        categoryName: "infrastructure",
        updates: { status: 'in-progress' as const }
      });

      // Try to move to implemented
      const updateRequest = {
        featureId,
        categoryName: "infrastructure",
        updates: {
          status: "implemented" as const
        },
        userStoryReportPath: reportPath
      };

      const validation = await manager.updateFeature(updateRequest);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain(
        'System class coverage 80% is below threshold 90%'
      );
      expect(validation.errors).toContain(
        'Branch coverage 85% is below threshold 90%'
      );
    });

    it('should fail validation if duplication exceeds threshold', async () => {
      // Create a mock user story report with high duplication
      const reportPath = path.join(testDir, 'high-duplication-report.json');
      const report = {
        id: 'story-003',
        title: 'High Duplication Story',
        status: "completed",
        connectedFiles: ['src/feature.ts'],
        coverage: {
          systemClassCoverage: 95,
          branchCoverage: 93,
          lineCoverage: 94,
          functionCoverage: 93,
          statementCoverage: 94
        },
        duplication: {
          totalDuplication: 15,  // Above 10% threshold
          duplicatedLines: 150,
          totalLines: 1000
        }
      };

      await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

      // Create connected file
      await fs.mkdir(path.join(testDir, 'src'), { recursive: true });
      await fs.writeFile(path.join(testDir, 'src/feature.ts'), 'export function feature() {}');

      // Move to in-progress first
      await manager.updateFeature({
        featureId,
        categoryName: "infrastructure",
        updates: { status: 'in-progress' as const }
      });

      // Try to move to implemented
      const updateRequest = {
        featureId,
        categoryName: "infrastructure",
        updates: {
          status: "implemented" as const
        },
        userStoryReportPath: reportPath
      };

      const validation = await manager.updateFeature(updateRequest);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain(
        'Code duplication 15% exceeds threshold 10%'
      );
    });

    it('should allow skipping validation with skipValidation flag', async () => {
      // Move to in-progress first
      await manager.updateFeature({
        featureId,
        categoryName: "infrastructure",
        updates: { status: 'in-progress' as const }
      });

      // Try to move to implemented without report but with skipValidation
      const updateRequest = {
        featureId,
        categoryName: "infrastructure",
        updates: {
          status: "implemented" as const
        },
        skipValidation: true
      };

      const validation = await manager.updateFeature(updateRequest);
      
      expect(validation.isValid).toBe(true);
      expect(validation.warnings).toContain('Validation skipped by request');
    });
  });

  describe("getStatusSummary", () => {
    it('should return correct status summary', async () => {
      // Add features with different statuses
      await manager.addFeature("infrastructure", {
        name: 'Feature 1',
        data: {
          title: 'Feature 1',
          description: 'Description 1',
          level: 'theme' as const,
          status: 'planned' as const,
          priority: 'high' as const,
          virtual_path: '/f1.vf.json'
        }
      });

      await manager.addFeature("infrastructure", {
        name: 'Feature 2',
        data: {
          title: 'Feature 2',
          description: 'Description 2',
          level: 'theme' as const,
          status: 'in-progress' as const,
          priority: 'medium' as const,
          virtual_path: '/f2.vf.json'
        }
      });

      await manager.addFeature("infrastructure", {
        name: 'Feature 3',
        data: {
          title: 'Feature 3',
          description: 'Description 3',
          level: 'theme' as const,
          status: 'blocked' as const,
          priority: 'high' as const,
          virtual_path: '/f3.vf.json'
        }
      });

      const summary = await manager.getStatusSummary();
      
      expect(summary.planned).toBe(1);
      expect(summary['in-progress']).toBe(1);
      expect(summary.blocked).toBe(1);
      expect(summary.completed).toBe(0);
      expect(summary.implemented).toBe(0);
    });
  });

  describe("generateStatusReport", () => {
    it('should generate comprehensive status report', async () => {
      // Add features with various statuses
      const blockedFeature = await manager.addFeature("infrastructure", {
        name: 'Blocked Feature',
        data: {
          title: 'Blocked Feature',
          description: 'This feature is blocked',
          level: 'theme' as const,
          status: 'blocked' as const,
          priority: 'high' as const,
          virtual_path: '/blocked.vf.json'
        }
      });

      const implementedFeature = await manager.addFeature("infrastructure", {
        name: 'Implemented Feature',
        data: {
          title: 'Implemented Feature',
          description: 'This feature is implemented',
          level: 'theme' as const,
          status: "implemented" as const,
          priority: 'medium' as const,
          virtual_path: '/implemented.vf.json'
        }
      });

      // Add an old in-progress feature (simulate by updating the date)
      const oldInProgressFeature = await manager.addFeature("infrastructure", {
        name: 'Old In-Progress Feature',
        data: {
          title: 'Old In-Progress Feature',
          description: 'This feature has been in progress for too long',
          level: 'theme' as const,
          status: 'in-progress' as const,
          priority: 'high' as const,
          virtual_path: '/old-progress.vf.json'
        }
      });

      const report = await manager.generateStatusReport();
      
      expect(report.summary).toBeDefined();
      expect(report.blockedFeatures).toHaveLength(1);
      expect(report.implementedFeatures).toHaveLength(1);
      expect(report.blockedFeatures[0].data.title).toBe('Blocked Feature');
      expect(report.implementedFeatures[0].data.title).toBe('Implemented Feature');
    });
  });

  describe("getFeaturesByStatus", () => {
    it('should return features filtered by status', async () => {
      // Add multiple features with same status
      await manager.addFeature("infrastructure", {
        name: 'InProgress 1',
        data: {
          title: 'InProgress Feature 1',
          description: 'First in-progress feature',
          level: 'theme' as const,
          status: 'in-progress' as const,
          priority: 'high' as const,
          virtual_path: '/ip1.vf.json'
        }
      });

      await manager.addFeature("infrastructure", {
        name: 'InProgress 2',
        data: {
          title: 'InProgress Feature 2',
          description: 'Second in-progress feature',
          level: 'theme' as const,
          status: 'in-progress' as const,
          priority: 'medium' as const,
          virtual_path: '/ip2.vf.json'
        }
      });

      await manager.addFeature("infrastructure", {
        name: 'Planned 1',
        data: {
          title: 'Planned Feature',
          description: 'A planned feature',
          level: 'theme' as const,
          status: 'planned' as const,
          priority: 'low' as const,
          virtual_path: '/p1.vf.json'
        }
      });

      const inProgressFeatures = await manager.getFeaturesByStatus('in-progress');
      const plannedFeatures = await manager.getFeaturesByStatus('planned');
      
      expect(inProgressFeatures).toHaveLength(2);
      expect(plannedFeatures).toHaveLength(1);
      expect(inProgressFeatures[0].data.status).toBe('in-progress');
      expect(inProgressFeatures[1].data.status).toBe('in-progress');
      expect(plannedFeatures[0].data.status).toBe('planned');
    });
  });
});