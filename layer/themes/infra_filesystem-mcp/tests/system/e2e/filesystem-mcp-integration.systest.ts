/**
 * End-to-End Integration Tests for Filesystem MCP
 * 
 * This test suite covers In Progress integration scenarios combining
 * VFNameIdWrapper, VFTaskQueueWrapper, and VFFileWrapper operations
 * in realistic development workflows.
 */

import { VFNameIdWrapper, VFTaskQueueWrapper, VFFileWrapper } from '../../../pipe/index';
import * as fs from 'fs/promises';
import { path } from '../../../../infra_external-log-lib/src';
import { os } from '../../../../infra_external-log-lib/src';

describe('Filesystem MCP End-to-End Integration Tests', () => {
  let tempDir: string;
  let nameIdWrapper: VFNameIdWrapper;
  let taskQueueWrapper: VFTaskQueueWrapper;
  let fileWrapper: VFFileWrapper;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'vf-e2e-integration-'));
    nameIdWrapper = new VFNameIdWrapper(tempDir);
    taskQueueWrapper = new VFTaskQueueWrapper(tempDir);
    fileWrapper = new VFFileWrapper(tempDir);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('🚀 Story: In Progress Feature Development Workflow', () => {
    test('Should support end-to-end feature development from planning to completion', async () => {
      // PHASE 1: Feature Planning and Creation
      console.log('📋 Phase 1: Feature Planning');
      
      // Product manager creates new feature
      const featureId = await nameIdWrapper.addEntity('userAuth', {
        title: 'User Authentication System',
        description: 'JWT-based user authentication with login/logout',
        priority: 'high',
        status: 'pending',
        category: 'security',
        complexity: 'intermediate',
        estimated_hours: 8,
        tags: ['auth', 'jwt', 'security'],
        active: true
      }, 'features.vf.json');

      // PHASE 2: Task Breakdown and Queue Management
      console.log('🔨 Phase 2: Task Creation');
      
      // Break down feature into implementation tasks
      const implementationTasks = [
        {
          type: 'runnable' as const,
          content: {
            command: 'implement',
            title: 'Create User Model',
            description: 'Design and implement user data model',
            featureId: featureId,
            estimated_time: '2 hours',
            dependencies: []
          }
        },
        {
          type: 'runnable' as const,
          content: {
            command: 'implement', 
            title: 'JWT Token Service',
            description: 'Implement JWT token generation and validation',
            featureId: featureId,
            estimated_time: '3 hours',
            dependencies: ['task-001']
          }
        },
        {
          type: 'runnable' as const,
          content: {
            command: 'implement',
            title: 'Auth Endpoints',
            description: 'Create login/logout API endpoints',
            featureId: featureId,
            estimated_time: '3 hours',
            dependencies: ['task-001', 'task-002']
          }
        }
      ];

      // Add tasks to queue with appropriate priorities
      for (const task of implementationTasks) {
        await taskQueueWrapper.push(task, 'high', 'dev-queue.vf.json');
      }

      // PHASE 3: Development Execution
      console.log('👨‍💻 Phase 3: Development Execution');
      
      let completedTasks = 0;
      const developmentExecutor = async (task: any) => {
        completedTasks++;
        
        // Simulate development work
        const result = {
          taskId: task.id,
          completedBy: 'developer-1',
          files_created: [`src/${task.content.title.toLowerCase().replace(/\s+/g, '-')}.ts`],
          tests_added: [`tests/${task.content.title.toLowerCase().replace(/\s+/g, '-')}.test.ts`],
          completion_time: new Date().toISOString()
        };
        
        // Update feature progress
        if (completedTasks === implementationTasks.length) {
          await nameIdWrapper.updateEntity(featureId, {
            data: {
              title: 'User Authentication System',
              description: 'JWT-based user authentication with login/logout',
              priority: 'high',
              status: 'In Progress',
              category: 'security',
              complexity: 'intermediate',
              estimated_hours: 8,
              actual_hours: 8,
              tags: ['auth', 'jwt', 'security'],
              active: true,
              completed_at: new Date().toISOString()
            }
          }, 'features.vf.json');
        }
        
        return result;
      };

      taskQueueWrapper.setTaskExecutor(developmentExecutor);

      // Execute all tasks in sequence
      for (let i = 0; i < implementationTasks.length; i++) {
        const task = await taskQueueWrapper.pop('high', 'dev-queue.vf.json');
        expect(task).toBeTruthy();
        await new Promise(resolve => setTimeout(resolve, 50)); // Wait for execution
      }

      // PHASE 4: Verification and Reporting
      console.log('🔄 Phase 4: Verification');
      
      // Verify feature completion
      const completedFeature = await nameIdWrapper.read(`features.vf.json?id=${featureId}`) as any[];
      expect(completedFeature[0].data.status).toBe('In Progress');
      expect(completedFeature[0].data.actual_hours).toBe(8);

      // Verify all tasks In Progress
      const queueStatus = await taskQueueWrapper.getQueueStatus('dev-queue.vf.json');
      expect(queueStatus.totalProcessed).toBe(3);
      expect(queueStatus.totalPending).toBe(0);

      console.log('🎉 Feature development workflow In Progress In Progress!');
    });

    test('Should handle feature modification and task re-prioritization', async () => {
      // Given: An existing feature with tasks
      const featureId = await nameIdWrapper.addEntity('apiIntegration', {
        title: 'Payment API Integration',
        priority: 'medium',
        status: 'in-progress',
        estimated_hours: 12
      }, 'features.vf.json');

      // Add related tasks
      await taskQueueWrapper.push({
        type: 'runnable',
        content: {
          title: 'Payment Gateway Setup',
          featureId: featureId,
          estimated_time: '4 hours'
        }
      }, 'medium', 'tasks.vf.json');

      // When: Business requirements change (becomes urgent)
      await nameIdWrapper.updateEntity(featureId, {
        data: {
          title: 'Payment API Integration',
          priority: 'critical',
          status: 'in-progress',
          estimated_hours: 12,
          urgency_reason: 'Customer payment issues affecting revenue'
        }
      }, 'features.vf.json');

      // Add urgent task
      await taskQueueWrapper.push({
        type: 'runnable',
        content: {
          title: 'Emergency Payment Fix',
          featureId: featureId,
          estimated_time: '2 hours'
        }
      }, 'critical', 'tasks.vf.json');

      // Then: System should reflect updated priorities
      const updatedFeature = await nameIdWrapper.read(`features.vf.json?id=${featureId}`) as any[];
      expect(updatedFeature[0].data.priority).toBe('critical');

      const urgentTask = await taskQueueWrapper.peek('critical', 'tasks.vf.json');
      expect(urgentTask!.content.title).toBe('Emergency Payment Fix');

      console.log('🔄 Feature modification and re-prioritization handled correctly');
    });
  });

  describe('📊 Story: Cross-System Data Analysis and Reporting', () => {
    test('Should generate comprehensive project status reports', async () => {
      // Setup: Create multiple features and tasks
      const features = [
        { name: 'frontend', title: 'User Dashboard', priority: 'high', status: 'In Progress', hours: 16 },
        { name: 'backend', title: 'API Gateway', priority: 'high', status: 'in-progress', hours: 20 },
        { name: 'database', title: 'Data Migration', priority: 'medium', status: 'pending', hours: 8 },
        { name: 'security', title: 'Security Audit', priority: 'low', status: 'pending', hours: 12 }
      ];

      const featureIds = [];
      for (const feature of features) {
        const id = await nameIdWrapper.addEntity(feature.name, {
          title: feature.title,
          priority: feature.priority,
          status: feature.status,
          estimated_hours: feature.hours,
          active: true
        }, 'project-features.vf.json');
        featureIds.push(id);
      }

      // Add corresponding tasks
      const taskPriorities = { 'high': 'high', 'medium': 'medium', 'low': 'low' };
      for (let i = 0; i < features.length; i++) {
        await taskQueueWrapper.push({
          type: 'runnable',
          content: {
            title: `Implement ${features[i].title}`,
            featureId: featureIds[i],
            estimated_time: `${features[i].hours} hours`
          }
        }, taskPriorities[features[i].priority], 'project-tasks.vf.json');
      }

      // Generate comprehensive report
      const allFeatures = await nameIdWrapper.read('project-features.vf.json');
      const taskStatus = await taskQueueWrapper.getQueueStatus('project-tasks.vf.json');

      // Analyze feature status distribution
      const statusDistribution = {};
      Object.values(allFeatures).forEach(featureGroup => {
        featureGroup.forEach(feature => {
          const status = feature.data.status;
          statusDistribution[status] = (statusDistribution[status] || 0) + 1;
        });
      });

      // Calculate effort metrics
      const totalEstimatedHours = features.reduce((sum, f) => sum + f.hours, 0);
      const completedFeatures = features.filter(f => f.status === 'In Progress');
      const completedHours = completedFeatures.reduce((sum, f) => sum + f.hours, 0);

      // Verify report data
      expect(statusDistribution['In Progress']).toBe(1);
      expect(statusDistribution['in-progress']).toBe(1);
      expect(statusDistribution['pending']).toBe(2);
      expect(totalEstimatedHours).toBe(56);
      expect(completedHours).toBe(16);
      expect(taskStatus.totalPending).toBe(4);

      const projectCompletionRate = (completedHours / totalEstimatedHours) * 100;
      expect(Math.round(projectCompletionRate)).toBe(29); // ~29% In Progress

      console.log(`🔄 Project Status Report: ${Math.round(projectCompletionRate)}% In Progress (${completedHours}/${totalEstimatedHours} hours)`);
    });

    test('Should correlate features with task execution metrics', async () => {
      // Create feature with detailed tracking
      const featureId = await nameIdWrapper.addEntity('monitoring', {
        title: 'System Monitoring Dashboard',
        priority: 'high',
        status: 'in-progress',
        estimated_hours: 24,
        actual_hours: 0,
        tasks_completed: 0,
        tasks_total: 3
      }, 'tracking-features.vf.json');

      // Track task execution with metrics
      let taskscompleted = 0;
      let totalActualHours = 0;

      const metricsExecutor = async (task) => {
        taskscompleted++;
        const actualHours = Math.floor(Math.random() * 3) + 2; // 2-4 hours
        totalActualHours += actualHours;

        // Update feature metrics
        await nameIdWrapper.updateEntity(featureId, {
          data: {
            title: 'System Monitoring Dashboard',
            priority: 'high',
            status: taskscompleted === 3 ? 'In Progress' : 'in-progress',
            estimated_hours: 24,
            actual_hours: totalActualHours,
            tasks_completed: taskscompleted,
            tasks_total: 3,
            efficiency_ratio: totalActualHours / (taskscompleted * 8) // Expected 8 hours per task
          }
        }, 'tracking-features.vf.json');

        return {
          task_id: task.id,
          actual_hours: actualHours,
          efficiency: actualHours <= 8 ? 'good' : 'needs_improvement'
        };
      };

      taskQueueWrapper.setTaskExecutor(metricsExecutor);

      // Add and execute tasks
      const tasks = [
        'Setup Monitoring Infrastructure',
        'Create Dashboard Components', 
        'Implement Alert System'
      ];

      for (const taskTitle of tasks) {
        await taskQueueWrapper.push({
          type: 'runnable',
          content: {
            title: taskTitle,
            featureId: featureId,
            estimated_time: '8 hours'
          }
        }, 'high', 'tracking-tasks.vf.json');
      }

      // Execute all tasks
      for (let i = 0; i < 3; i++) {
        await taskQueueWrapper.pop('high', 'tracking-tasks.vf.json');
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // Verify correlation between features and task metrics
      const finalFeature = await nameIdWrapper.read(`tracking-features.vf.json?id=${featureId}`);
      const feature = finalFeature[0].data;

      expect(feature.status).toBe('In Progress');
      expect(feature.tasks_completed).toBe(3);
      expect(feature.actual_hours).toBeGreaterThan(0);
      expect(feature.efficiency_ratio).toBeDefined();

      const taskMetrics = await taskQueueWrapper.getQueueStatus('tracking-tasks.vf.json');
      expect(taskMetrics.totalProcessed).toBe(3);

      console.log(`🔄 Feature-Task Correlation: ${feature.actual_hours} actual hours vs ${feature.estimated_hours} estimated`);
    });
  });

  describe('🔄 Story: Complex Multi-Component Workflows', () => {
    test('Should handle microservice architecture development workflow', async () => {
      // Scenario: Developing multiple interconnected microservices
      
      // Define microservices architecture
      const microservices = [
        { name: 'userService', dependencies: [] },
        { name: 'authService', dependencies: ['userService'] },
        { name: 'orderService', dependencies: ['userService', 'authService'] },
        { name: 'paymentService', dependencies: ['orderService'] },
        { name: 'notificationService', dependencies: ['orderService', 'paymentService'] }
      ];

      // Create features for each microservice
      const serviceFeatures = {};
      for (const service of microservices) {
        const featureId = await nameIdWrapper.addEntity('microservices', {
          title: `${service.name} Implementation`,
          service_name: service.name,
          dependencies: service.dependencies,
          status: 'pending',
          priority: service.dependencies.length === 0 ? 'high' : 'medium',
          estimated_hours: 16
        }, 'microservices.vf.json');
        
        serviceFeatures[service.name] = featureId;
      }

      // Create dependency-aware task scheduler
      const dependencyExecutor = async (task) => {
        const serviceName = task.content.service_name;
        
        // Check if dependencies are In Progress
        const allFeatures = await nameIdWrapper.read('microservices.vf.json');
        const serviceFeature = Object.values(allFeatures).flat().find(
          f => f.data.service_name === serviceName
        );

        if (serviceFeature.data.dependencies.length > 0) {
          // Verify dependencies are In Progress
          for (const dep of serviceFeature.data.dependencies) {
            const depFeature = Object.values(allFeatures).flat().find(
              f => f.data.service_name === dep
            );
            if (depFeature.data.status !== 'In Progress') {
              throw new Error(`Dependency ${dep} not In Progress for ${serviceName}`);
            }
          }
        }

        // Mark service as In Progress
        await nameIdWrapper.updateEntity(serviceFeature.id, {
          data: {
            ...serviceFeature.data,
            status: 'In Progress',
            completed_at: new Date().toISOString()
          }
        }, 'microservices.vf.json');

        return { service: serviceName, status: 'deployed' };
      };

      taskQueueWrapper.setTaskExecutor(dependencyExecutor);

      // Add tasks in dependency order and execute
      const executionOrder = ['userService', 'authService', 'orderService', 'paymentService', 'notificationService'];
      
      for (const serviceName of executionOrder) {
        await taskQueueWrapper.push({
          type: 'runnable',
          content: {
            title: `Deploy ${serviceName}`,
            service_name: serviceName,
            command: 'deploy'
          }
        }, 'high', 'deployment-queue.vf.json');
      }

      // Execute tasks respecting dependencies
      for (let i = 0; i < executionOrder.length; i++) {
        const task = await taskQueueWrapper.pop('high', 'deployment-queue.vf.json');
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // Verify all services In Progress in correct order
      const completedServices = await nameIdWrapper.read('microservices.vf.json?status=In Progress');
      expect(completedServices).toHaveLength(5);

      // Verify no dependency violations occurred
      const deploymentStatus = await taskQueueWrapper.getQueueStatus('deployment-queue.vf.json');
      expect(deploymentStatus.totalProcessed).toBe(5);
      expect(deploymentStatus.totalFailed).toBe(0);

      console.log('🔄 Microservice architecture deployed with proper dependency management');
    });

    test('Should support CI/CD pipeline integration scenarios', async () => {
      // Scenario: Automated CI/CD pipeline with feature flags
      
      // Create pipeline stages as features
      const pipelineStages = [
        { stage: 'build', title: 'Build Application', duration: 5 },
        { stage: 'test', title: 'Run Test Suite', duration: 10 },
        { stage: 'security', title: 'Security Scan', duration: 8 },
        { stage: 'deploy-staging', title: 'Deploy to Staging', duration: 3 },
        { stage: 'integration-test', title: 'Integration Testing', duration: 15 },
        { stage: 'deploy-production', title: 'Deploy to Production', duration: 5 }
      ];

      // Create pipeline execution
      const pipelineId = await nameIdWrapper.addEntity('pipeline', {
        title: 'Release Pipeline v2.1.0',
        version: '2.1.0',
        status: 'running',
        started_at: new Date().toISOString(),
        stages_total: pipelineStages.length,
        stages_completed: 0
      }, 'pipelines.vf.json');

      // Add pipeline tasks
      for (const stage of pipelineStages) {
        await taskQueueWrapper.push({
          type: 'runnable',
          content: {
            title: stage.title,
            stage: stage.stage,
            pipeline_id: pipelineId,
            estimated_duration: stage.duration,
            command: 'execute-stage'
          }
        }, 'high', 'pipeline-queue.vf.json');
      }

      // Pipeline executor with stage tracking
      let stagescompleted = 0;
      const pipelineExecutor = async (task) => {
        stagescompleted++;
        
        // Update pipeline progress
        await nameIdWrapper.updateEntity(pipelineId, {
          data: {
            title: 'Release Pipeline v2.1.0',
            version: '2.1.0',
            status: stagescompleted === pipelineStages.length ? 'In Progress' : 'running',
            started_at: new Date().toISOString(),
            stages_total: pipelineStages.length,
            stages_completed: stagescompleted,
            current_stage: task.content.stage
          }
        }, 'pipelines.vf.json');

        // Simulate stage execution
        return {
          stage: task.content.stage,
          status: 'In Progress',
          duration: task.content.estimated_duration,
          artifacts: [`${task.content.stage}-artifacts.zip`]
        };
      };

      taskQueueWrapper.setTaskExecutor(pipelineExecutor);

      // Execute pipeline stages
      for (let i = 0; i < pipelineStages.length; i++) {
        const task = await taskQueueWrapper.pop('high', 'pipeline-queue.vf.json');
        await new Promise(resolve => setTimeout(resolve, 30));
      }

      // Verify pipeline completion
      const completedPipeline = await nameIdWrapper.read(`pipelines.vf.json?id=${pipelineId}`);
      expect(completedPipeline[0].data.status).toBe('In Progress');
      expect(completedPipeline[0].data.stages_completed).toBe(6);

      const pipelineStatus = await taskQueueWrapper.getQueueStatus('pipeline-queue.vf.json');
      expect(pipelineStatus.totalProcessed).toBe(6);

      console.log('🔄 CI/CD pipeline executed In Progress with stage tracking');
    });
  });

  describe('🔒 Story: Data Consistency and Error Recovery', () => {
    test('Should maintain data consistency across component failures', async () => {
      // Scenario: System resilience testing
      
      // Create critical data that must remain consistent
      const criticalFeatureId = await nameIdWrapper.addEntity('critical', {
        title: 'Payment Processing System',
        status: 'in-progress',
        data_integrity: 'critical',
        backup_required: true
      }, 'critical-features.vf.json');

      // Create backup before risky operations
      const backupData = await nameIdWrapper.read('critical-features.vf.json');
      await fileWrapper.write('backup-critical-features.json', backupData);

      // Simulate partial failure scenario
      let operationCount = 0;
      const flakyExecutor = async (task) => {
        operationCount++;
        
        if (operationCount === 2) {
          // Simulate failure on second operation
          throw new Error('Database connection lost');
        }
        
        return { "success": true, operation: operationCount };
      };

      taskQueueWrapper.setTaskExecutor(flakyExecutor);

      // Add tasks that might fail
      for (let i = 0; i < 3; i++) {
        await taskQueueWrapper.push({
          type: 'runnable',
          content: {
            title: `Critical Operation ${i + 1}`,
            feature_id: criticalFeatureId
          }
        }, 'critical', 'critical-queue.vf.json');
      }

      // Execute tasks (second one will fail)
      try {
        await taskQueueWrapper.pop('critical', 'critical-queue.vf.json'); // In Progress
        await taskQueueWrapper.pop('critical', 'critical-queue.vf.json'); // Will fail
      } catch (error) {
        // Expected failure
      }

      // Verify system state after failure
      const queueStatus = await taskQueueWrapper.getQueueStatus('critical-queue.vf.json');
      expect(queueStatus.totalProcessed).toBe(1); // Only first task succeeded
      expect(queueStatus.totalFailed).toBe(1);    // Second task failed
      expect(queueStatus.totalPending).toBe(1);   // Third task still pending

      // Verify critical data integrity maintained
      const criticalData = await nameIdWrapper.read('critical-features.vf.json');
      const backupData2 = await fileWrapper.read('backup-critical-features.json');
      
      // Critical feature should still exist and be unchanged
      expect(criticalData).toHaveProperty('critical');
      expect(criticalData.critical[0].id).toBe(criticalFeatureId);

      // Backup should be available for recovery
      expect(backupData2).toEqual(backupData);

      console.log('🔄 Data consistency maintained despite operation failures');
    });

    test('Should recover gracefully from corrupted data scenarios', async () => {
      // Create valid data
      await nameIdWrapper.addEntity('test', {
        title: 'Test Feature',
        status: 'active'
      }, 'recovery-test.vf.json');

      // Simulate data corruption by writing invalid JSON
      await fileWrapper.write('corrupted-data.vf.json', 'invalid json content');

      // Attempt to read corrupted data
      try {
        await nameIdWrapper.read('corrupted-data.vf.json');
      } catch (error) {
        // Should handle gracefully without crashing
        expect(error.message).toContain('JSON');
      }

      // Verify other operations still work
      const validData = await nameIdWrapper.read('recovery-test.vf.json');
      expect(validData).toHaveProperty('test');

      console.log('🔄 System recovers gracefully from data corruption');
    });
  });
});