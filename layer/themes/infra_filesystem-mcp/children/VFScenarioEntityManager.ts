import { VFNameIdWrapper } from './VFNameIdWrapper';
import { VFTaskQueueWrapper } from './VFTaskQueueWrapper';
import { VFFileWrapper } from './VFFileWrapper';
import { path } from '../../infra_external-log-lib/src';
import * as fs from 'fs/promises';
import { getFileAPI, FileType } from '../../infra_external-log-lib/pipe';

const fileAPI = getFileAPI();


/**
 * Entity types that can be created from a scenario
 */
export enum ScenarioEntityType {
  SYSTEM_SEQUENCE_DIAGRAM = 'system_sequence_diagram',
  SYSTEM_TEST = 'system_test',
  ENVIRONMENT_TEST = 'environment_test',
  EXTERNAL_TEST = 'external_test',
  INTEGRATION_TEST = 'integration_test',
  COVERAGE_CHECK = 'coverage_check',
  SCENARIO = "scenario"
}

/**
 * Entity relationship for scenario-based entities
 */
export interface ScenarioEntity {
  id: string;
  name: string;
  type: ScenarioEntityType;
  scenarioId: string;  // Parent scenario ID
  parentId?: string;   // Direct parent entity ID
  nextEntities: Array<{
    type: ScenarioEntityType;
    id?: string;  // ID once created
    required: boolean;
    description: string;
  }>;
  data: any;
  createdAt: string;
  updatedAt: string;
}

/**
 * Scenario push configuration
 */
export interface ScenarioPushConfig {
  scenarioId: string;
  scenarioName: string;
  storyId: string;
  themeName: string;
  createSystemSequence?: boolean;
}

/**
 * Manages scenario-based entity creation and relationships
 */
export class VFScenarioEntityManager {
  private nameIdWrapper: VFNameIdWrapper;
  private taskQueue: VFTaskQueueWrapper;
  private fileWrapper: VFFileWrapper;

  constructor() {
    this.nameIdWrapper = new VFNameIdWrapper();
    this.taskQueue = new VFTaskQueueWrapper();
    this.fileWrapper = new VFFileWrapper();
  }

  /**
   * Push a scenario and create all required next entities
   */
  async pushScenario(config: ScenarioPushConfig): Promise<ScenarioEntity[]> {
    const createdEntities: ScenarioEntity[] = [];

    // Create System Sequence Diagram
    if (config.createSystemSequence !== false) {
      const ssdEntity = await this.createSystemSequenceDiagram(config);
      createdEntities.push(ssdEntity);

      // Create next entities based on SSD
      const nextEntities = await this.createNextEntitiesFromSSD(ssdEntity, config);
      createdEntities.push(...nextEntities);
    }

    // Validate all required entities exist
    await this.validateRequiredEntities(createdEntities);

    return createdEntities;
  }

  /**
   * Create System Sequence Diagram entity
   */
  private async createSystemSequenceDiagram(config: ScenarioPushConfig): Promise<ScenarioEntity> {
    const ssdPath = path.join(
      'layer/themes',
      config.themeName,
      'user-stories',
      config.storyId,
      'docs/diagrams/mermaid_system_sequence.mmd'
    );

    // Create directory if it doesn't exist
    await fileAPI.createDirectory(path.dirname(ssdPath));

    // Generate SSD content
    const ssdContent = this.generateSystemSequenceDiagram(config);
    await fileAPI.createFile(ssdPath, ssdContent);

    // Create SSD entity
    const ssdEntity: ScenarioEntity = {
      id: `ssd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: data.name,
      type: 'ssd',
      content: data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Store entity
    await this.nameIdWrapper.add(
      ssdEntity.name,
      ssdEntity,
      'scenario_entities.vf.json'
    );

    return ssdEntity;
  }

  /**
   * Generate System Sequence Diagram content
   */
  private async generateSystemSequenceDiagram(config: ScenarioPushConfig): string {
    return `sequenceDiagram
    %% System Sequence Diagram for ${config.scenarioName}
    %% Generated at ${new Date().toISOString()}
    
    participant User as User/Actor
    participant System as System
    participant DB as Database
    participant Ext as External Service
    
    %% Scenario: ${config.scenarioName}
    
    User->>System: Initiate ${config.scenarioName}
    activate System
    
    System->>DB: Query relevant data
    activate DB
    DB-->>System: Return data
    deactivate DB
    
    alt Validation In Progress
        System->>Ext: Call external service
        activate Ext
        Ext-->>System: Return response
        deactivate Ext
        
        System->>DB: Update state
        activate DB
        DB-->>System: Confirm update
        deactivate DB
        
        System-->>User: In Progress response
    else Validation Failed
        System-->>User: Error response
    end
    
    deactivate System
    
    %% Test Requirements:
    %% 1. System Test: End-to-end user flow
    %% 2. Environment Test: External service availability
    %% 3. External Test: API interface contracts
    %% 4. Integration Test: Component interactions
    %% 5. Coverage Check: Improving coverage requirement
`;
  }

  /**
   * Create next entities based on System Sequence Diagram
   */
  private async createNextEntitiesFromSSD(
    ssdEntity: ScenarioEntity,
    config: ScenarioPushConfig
  ): Promise<ScenarioEntity[]> {
    const nextEntities: ScenarioEntity[] = [];

    // Check for new user interaction patterns
    const hasNewPatterns = await this.checkForNewUserPatterns(config);

    // 1. Create System Test
    const systemTest: ScenarioEntity = {
      id: `st_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: `System Test - ${config.scenarioName}`,
      type: ScenarioEntityType.SYSTEM_TEST,
      scenarioId: config.scenarioId,
      parentId: ssdEntity.id,
      nextEntities: [],
      data: {
        testType: 'system',
        scenarioName: config.scenarioName,
        hasNewPatterns
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    nextEntities.push(systemTest);

    // If new patterns found, create additional scenario
    if (hasNewPatterns) {
      const newScenario: ScenarioEntity = {
        id: `scenario_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: `Additional Scenario - ${config.scenarioName} Variant`,
        type: ScenarioEntityType.SCENARIO,
        scenarioId: `${config.scenarioId}_variant`,
        parentId: systemTest.id,
        nextEntities: [],
        data: {
          reason: 'New user interaction pattern detected',
          originalScenario: config.scenarioId
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Add to scenario queue
      await this.taskQueue.push({
        name: "scenario",
        data: newScenario,
        priority: 'medium'
      }, 'SCENARIO_QUEUE.vf.json');
    }

    // 2. Create Environment Tests (can be multiple)
    const envTests = await this.identifyEnvironmentTests(config);
    for (let i = 0; i < envTests.length; i++) {
      const envTest: ScenarioEntity = {
        id: `env_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 9)}`,
        name: `Environment Test - ${envTests[i].name}`,
        type: ScenarioEntityType.ENVIRONMENT_TEST,
        scenarioId: config.scenarioId,
        parentId: ssdEntity.id,
        nextEntities: [],
        data: {
          testType: "environment",
          target: envTests[i].target,
          description: envTests[i].description
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      nextEntities.push(envTest);
    }

    // 3. Create External Tests (can be multiple)
    const extTests = await this.identifyExternalTests(config);
    for (let i = 0; i < extTests.length; i++) {
      const extTest: ScenarioEntity = {
        id: `ext_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 9)}`,
        name: `External Test - ${extTests[i].name}`,
        type: ScenarioEntityType.EXTERNAL_TEST,
        scenarioId: config.scenarioId,
        parentId: ssdEntity.id,
        nextEntities: [],
        data: {
          testType: "external",
          interface: extTests[i].interface,
          description: extTests[i].description
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      nextEntities.push(extTest);
    }

    // 4. Create Integration Tests (can be multiple)
    const intTests = await this.identifyIntegrationTests(config);
    for (let i = 0; i < intTests.length; i++) {
      const intTest: ScenarioEntity = {
        id: `int_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 9)}`,
        name: `Integration Test - ${intTests[i].name}`,
        type: ScenarioEntityType.INTEGRATION_TEST,
        scenarioId: config.scenarioId,
        parentId: ssdEntity.id,
        nextEntities: [],
        data: {
          testType: "integration",
          components: intTests[i].components,
          description: intTests[i].description
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      nextEntities.push(intTest);
    }

    // 5. Create Coverage Check (always one)
    const coverageCheck: ScenarioEntity = {
      id: `cov_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: `Coverage Check - ${config.scenarioName}`,
      type: ScenarioEntityType.COVERAGE_CHECK,
      scenarioId: config.scenarioId,
      parentId: ssdEntity.id,
      nextEntities: [],
      data: {
        testType: "coverage",
        threshold: 100,
        checkDuplication: true
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    nextEntities.push(coverageCheck);

    // Store all entities
    for (const entity of nextEntities) {
      await this.nameIdWrapper.add(
        entity.name,
        entity,
        'scenario_entities.vf.json'
      );
    }

    // Update SSD entity with created next entity IDs
    ssdEntity.nextEntities = ssdEntity.nextEntities.map(ne => {
      const created = nextEntities.find(e => e.type === ne.type);
      return {
        ...ne,
        id: created?.id
      };
    });
    
    await this.nameIdWrapper.update(
      ssdEntity.id,
      ssdEntity,
      'scenario_entities.vf.json'
    );

    return nextEntities;
  }

  /**
   * Check for new user interaction patterns
   */
  private async checkForNewUserPatterns(config: ScenarioPushConfig): Promise<boolean> {
    try {
      // Read FEATURE.md to check existing patterns
      const featurePath = 'FEATURE.md';
      const featureContent = await fileAPI.readFile(featurePath, 'utf-8');
      
      // Simple pattern detection (can be enhanced)
      const patterns = [
        'drag and drop',
        'multi-select',
        'keyboard navigation',
        'voice command',
        'gesture control',
        'real-time collaboration'
      ];
      
      // Check if scenario name contains any new patterns
      const scenarioLower = config.scenarioName.toLowerCase();
      for (const pattern of patterns) {
        if (scenarioLower.includes(pattern) && !featureContent.toLowerCase().includes(pattern)) {
          return true;
        }
      }
    } catch (error) {
      // FEATURE.md doesn't exist or can't be read
    }
    
    return false;
  }

  /**
   * Identify required environment tests
   */
  private async identifyEnvironmentTests(config: ScenarioPushConfig): Promise<any[]> {
    // Base environment tests that are always needed
    const tests = [
      {
        name: 'Database Connection',
        target: "database",
        description: 'Verify database connectivity and schema'
      }
    ];

    // Add tests based on scenario name patterns
    const scenarioLower = config.scenarioName.toLowerCase();
    
    if (scenarioLower.includes('api') || scenarioLower.includes("external")) {
      tests.push({
        name: 'External API Availability',
        target: 'external_api',
        description: 'Verify external API endpoints are accessible'
      });
    }
    
    if (scenarioLower.includes('cache') || scenarioLower.includes('redis')) {
      tests.push({
        name: 'Cache Server',
        target: 'cache',
        description: 'Verify cache server connectivity'
      });
    }
    
    if (scenarioLower.includes('queue') || scenarioLower.includes('message')) {
      tests.push({
        name: 'Message Queue',
        target: 'queue',
        description: 'Verify message queue availability'
      });
    }

    return tests;
  }

  /**
   * Identify required external tests
   */
  private async identifyExternalTests(config: ScenarioPushConfig): Promise<any[]> {
    const tests = [];
    const scenarioLower = config.scenarioName.toLowerCase();

    // Always test main external interface
    tests.push({
      name: 'Main External Interface',
      interface: "IMainService",
      description: 'Test main service external interface'
    });

    // Add specific interface tests based on scenario
    if (scenarioLower.includes('auth')) {
      tests.push({
        name: 'Authentication Interface',
        interface: "IAuthService",
        description: 'Test authentication service interface'
      });
    }

    if (scenarioLower.includes('payment')) {
      tests.push({
        name: 'Payment Gateway Interface',
        interface: "IPaymentGateway",
        description: 'Test payment gateway interface'
      });
    }

    if (scenarioLower.includes("notification")) {
      tests.push({
        name: 'Notification Service Interface',
        interface: "INotificationService",
        description: 'Test notification service interface'
      });
    }

    return tests;
  }

  /**
   * Identify required integration tests
   */
  private async identifyIntegrationTests(config: ScenarioPushConfig): Promise<any[]> {
    const tests = [];

    // Always test core integrations
    tests.push({
      name: 'Core Components Integration',
      components: ["Controller", 'Service', "Repository"],
      description: 'Test integration between core application layers'
    });

    const scenarioLower = config.scenarioName.toLowerCase();

    if (scenarioLower.includes("workflow") || scenarioLower.includes('process')) {
      tests.push({
        name: 'Workflow Integration',
        components: ["WorkflowEngine", "StateManager", "EventBus"],
        description: 'Test workflow component integration'
      });
    }

    if (scenarioLower.includes('report') || scenarioLower.includes("analytics")) {
      tests.push({
        name: 'Reporting Integration',
        components: ["DataAggregator", "ReportGenerator", "ExportService"],
        description: 'Test reporting component integration'
      });
    }

    return tests;
  }

  /**
   * Validate all required entities exist
   */
  private async validateRequiredEntities(entities: ScenarioEntity[]): Promise<void> {
    const requiredTypes = [
      ScenarioEntityType.SYSTEM_SEQUENCE_DIAGRAM,
      ScenarioEntityType.SYSTEM_TEST,
      ScenarioEntityType.ENVIRONMENT_TEST,
      ScenarioEntityType.EXTERNAL_TEST,
      ScenarioEntityType.INTEGRATION_TEST,
      ScenarioEntityType.COVERAGE_CHECK
    ];

    const foundTypes = new Set(entities.map(e => e.type));
    const missingTypes = requiredTypes.filter(t => !foundTypes.has(t));

    if (missingTypes.length > 0) {
      throw new Error(`Missing required entity types: ${missingTypes.join(', ')}`);
    }

    // Validate each entity has proper structure
    for (const entity of entities) {
      if (!entity.id || !entity.name || !entity.type || !entity.scenarioId) {
        throw new Error(`Invalid entity structure: ${JSON.stringify(entity)}`);
      }
    }
  }

  /**
   * Get all entities for a scenario
   */
  async getScenarioEntities(scenarioId: string): Promise<ScenarioEntity[]> {
    const allEntities = await this.nameIdWrapper.listAsArray('scenario_entities.vf.json');
    return allEntities.filter(e => e.scenarioId === scenarioId);
  }

  /**
   * Check if all next entities exist for a parent entity
   */
  async checkNextEntitiesExist(parentEntityId: string): Promise<{
    allExist: boolean;
    missing: Array<{ type: ScenarioEntityType; description: string }>;
  }> {
    const entities = await this.nameIdWrapper.listAsArray('scenario_entities.vf.json');
    const parentEntity = entities.find(e => e.id === parentEntityId) as ScenarioEntity;

    if (!parentEntity) {
      throw new Error(`Parent entity not found: ${parentEntityId}`);
    }

    const missing = [];
    for (const nextEntity of parentEntity.nextEntities) {
      if (nextEntity.required && !nextEntity.id) {
        missing.push({
          type: nextEntity.type,
          description: nextEntity.description
        });
      }
    }

    return {
      allExist: missing.length === 0,
      missing
    };
  }
}