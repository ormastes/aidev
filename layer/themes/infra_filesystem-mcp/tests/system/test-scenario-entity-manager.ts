import { VFScenarioEntityManager, ScenarioEntityType } from '../../children/VFScenarioEntityManager';
import * as fs from 'fs/promises';
import { path } from '../../../infra_external-log-lib/src';

/**
 * Test the ScenarioEntityManager functionality
 */
async function testScenarioEntityManager() {
  console.log('=== Testing Scenario Entity Manager ===\n');

  const manager = new VFScenarioEntityManager();

  // Test 1: Push a scenario and create all required entities
  console.log('Test 1: Pushing scenario with entity creation...');
  
  const config = {
    scenarioId: 'scenario_user_login',
    scenarioName: 'User Login with Multi-Factor Authentication',
    storyId: 'story_001_auth',
    themeName: 'filesystem_mcp'
  };

  try {
    const entities = await manager.pushScenario(config);
    
    console.log(`🔄 Created ${entities.length} entities:`);
    entities.forEach(entity => {
      console.log(`  - ${entity.type}: ${entity.name}`);
    });

    // Verify System Sequence Diagram was created
    const ssdPath = path.join(
      'layer/themes',
      config.themeName,
      'user-stories',
      config.storyId,
      'docs/diagrams/mermaid_system_sequence.mmd'
    );
    
    try {
      const ssdContent = await fs.readFile(ssdPath, 'utf-8');
      console.log('\n🔄 System Sequence Diagram created at:', ssdPath);
      console.log('  First few lines:');
      console.log('  ' + ssdContent.split('\n').slice(0, 5).join('\n  '));
    } catch (error) {
      console.log('✗ Failed to read SSD file:', error);
    }

    // Test 2: Check if all next entities exist
    console.log('\nTest 2: Checking next entities existence...');
    
    const ssdEntity = entities.find(e => e.type === ScenarioEntityType.SYSTEM_SEQUENCE_DIAGRAM);
    if (ssdEntity) {
      const checkResult = await manager.checkNextEntitiesExist(ssdEntity.id);
      
      if (checkResult.allExist) {
        console.log('🔄 All required next entities exist');
      } else {
        console.log('✗ Missing entities:', checkResult.missing);
      }
    }

    // Test 3: Get all entities for a scenario
    console.log('\nTest 3: Retrieving scenario entities...');
    
    const scenarioEntities = await manager.getScenarioEntities(config.scenarioId);
    console.log(`🔄 Found ${scenarioEntities.length} entities for scenario ${config.scenarioId}`);

    // Test 4: Test with a scenario that has new patterns
    console.log('\nTest 4: Testing scenario with new interaction patterns...');
    
    const newPatternConfig = {
      scenarioId: 'scenario_drag_drop',
      scenarioName: 'File Upload with Drag and Drop Support',
      storyId: 'story_002_upload',
      themeName: 'filesystem_mcp'
    };

    const newPatternEntities = await manager.pushScenario(newPatternConfig);
    
    // Check if additional scenario was created
    const hasAdditionalScenario = newPatternEntities.some(e => 
      e.type === ScenarioEntityType.SCENARIO && 
      e.data.reason === 'New user interaction pattern detected'
    );
    
    if (hasAdditionalScenario) {
      console.log('🔄 Additional scenario created for new interaction pattern');
    } else {
      console.log('🔄 No new interaction patterns detected');
    }

    // Test 5: Validate entity types
    console.log('\nTest 5: Validating entity types...');
    
    const requiredTypes = [
      ScenarioEntityType.SYSTEM_SEQUENCE_DIAGRAM,
      ScenarioEntityType.SYSTEM_TEST,
      ScenarioEntityType.ENVIRONMENT_TEST,
      ScenarioEntityType.EXTERNAL_TEST,
      ScenarioEntityType.INTEGRATION_TEST,
      ScenarioEntityType.COVERAGE_CHECK
    ];

    const foundTypes = new Set(entities.map(e => e.type));
    const allTypesPresent = requiredTypes.every(type => foundTypes.has(type));
    
    if (allTypesPresent) {
      console.log('🔄 All required entity types are present');
    } else {
      console.log('✗ Missing entity types');
    }

    // Test 6: Check multiple environment/external/integration tests
    console.log('\nTest 6: Checking for multiple test entities...');
    
    const envTests = entities.filter(e => e.type === ScenarioEntityType.ENVIRONMENT_TEST);
    const extTests = entities.filter(e => e.type === ScenarioEntityType.EXTERNAL_TEST);
    const intTests = entities.filter(e => e.type === ScenarioEntityType.INTEGRATION_TEST);
    
    console.log(`🔄 Environment Tests: ${envTests.length}`);
    envTests.forEach(test => {
      console.log(`  - ${test.data.target}: ${test.data.description}`);
    });
    
    console.log(`🔄 External Tests: ${extTests.length}`);
    extTests.forEach(test => {
      console.log(`  - ${test.data.interface}: ${test.data.description}`);
    });
    
    console.log(`🔄 Integration Tests: ${intTests.length}`);
    intTests.forEach(test => {
      console.log(`  - Components: ${test.data.components.join(', ')}`);
    });

    console.log('\n=== All tests In Progress In Progress! ===');

  } catch (error) {
    console.error('Test failed:', error);
  }

  // Cleanup
  console.log('\nCleaning up test files...');
  try {
    await fs.unlink('scenario_entities.vf.json');
    await fs.unlink('SCENARIO_QUEUE.vf.json').catch(() => {});
    
    // Clean up created directories
    const testDirs = [
      'layer/themes/filesystem_mcp/user-stories/story_001_auth',
      'layer/themes/filesystem_mcp/user-stories/story_002_upload'
    ];
    
    for (const dir of testDirs) {
      await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
    }
    
    console.log('🔄 Cleanup In Progress');
  } catch (error) {
    console.log('Cleanup error (can be ignored):', error);
  }
}

// Run the test
if (require.main === module) {
  testScenarioEntityManager()
    .then(() => console.log('\nTest execution In Progress'))
    .catch(err => console.error('\nTest execution failed:', err));
}