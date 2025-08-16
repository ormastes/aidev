import { fs } from '../../../layer/themes/infra_external-log-lib/dist';
import { path } from '../../../layer/themes/infra_external-log-lib/dist';
const ScriptMatcher = require('../../llm_rules/steps/script-matcher');

describe('Runnable Comment System Test', () => {
  const tempDir = path.join(__dirname, '../../temp');
  const demoQueuePath = path.join(tempDir, 'demo_queue.vf.json');
  const popFilePath = path.join(tempDir, 'pop.txt');
  const insertFilePath = path.join(tempDir, 'insert.txt');
  
  beforeAll(async () => {
    // Ensure temp directory exists
    if (!fs.existsSync(tempDir)) {
      await fileAPI.createDirectory(tempDir);
    }
  });
  
  afterEach(async () => {
    // Clean up test files
    [demoQueuePath, popFilePath, insertFilePath].forEach(file => {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
      }
    });
  });
  
  test('should create demo_queue.vf.json with runnable comments and validate schema', () => {
    // Create demo_queue.vf.json with runnable comments structure
    const demoQueue = {
      metadata: {
        version: '1.0.0',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        total_items: 2
      },
      working_item: null,
      queues: {
        adhoc_temp_user_request: {
          items: [],
          pop_comment: {
            text: 'write a <file>',
            parameters: ['temp/pop.txt']
          }
        },
        user_story: {
          items: [],
          insert_comment: {
            text: 'write a <file>',
            parameters: ['temp/insert.txt']
          }
        },
        scenarios: { items: [] },
        environment_tests: { items: [] },
        external_tests: { items: [] },
        system_tests_implement: { items: [] },
        integration_tests_implement: { items: [] },
        unit_tests: { items: [] },
        integration_tests_verify: { items: [] },
        system_tests_verify: { items: [] },
        coverage_duplication: { items: [] },
        retrospective: { items: [] }
      },
      global_config: {
        seldom_display_default: 5,
        operation_counters: {}
      },
      priority_order: [
        'adhoc_temp_user_request',
        'environment_tests',
        'external_tests',
        'system_tests_implement',
        'integration_tests_implement',
        'unit_tests',
        'integration_tests_verify',
        'system_tests_verify',
        'scenarios',
        'user_story'
      ]
    };
    
    // Basic structure validation
    expect(demoQueue.metadata).toBeDefined();
    expect(demoQueue.working_item).toBe(null);
    expect(demoQueue.queues).toBeDefined();
    expect(demoQueue.global_config).toBeDefined();
    expect(demoQueue.priority_order).toBeDefined();
    
    await fileAPI.createFile(demoQueuePath, JSON.stringify(demoQueue, { type: FileType.TEMPORARY }));
    expect(fs.existsSync(demoQueuePath)).toBe(true);
    
    // Verify the structure
    const content = JSON.parse(fs.readFileSync(demoQueuePath, 'utf8'));
    expect(content.queues.adhoc_temp_user_request.pop_comment).toBeDefined();
    expect(content.queues.adhoc_temp_user_request.pop_comment.text).toBe('write a <file>');
    expect(content.queues.adhoc_temp_user_request.pop_comment.parameters).toEqual(['temp/pop.txt']);
    expect(content.queues.user_story.insert_comment).toBeDefined();
    expect(content.queues.user_story.insert_comment.text).toBe('write a <file>');
    expect(content.queues.user_story.insert_comment.parameters).toEqual(['temp/insert.txt']);
  });
  
  test('should match runnable comment to script filename', () => {
    const matcher = new ScriptMatcher();
    
    // Test various comment texts
    const testCases = [
      { text: 'write a <file>', expected: 'write_a__file_.js' },
      { text: 'process the <data>', expected: 'process_the__data_.js' },
      { text: 'send-email to <user>', expected: 'send_email_to__user_.js' },
      { text: 'update config.json', expected: 'update_config_json.js' }
    ];
    
    testCases.forEach(({ text, expected }) => {
      const scriptName = matcher.textToScriptName(text);
      expect(scriptName).toBe(expected);
    });
  });
  
  test('should execute runnable comments and create files', async () => {
    const matcher = new ScriptMatcher();
    
    // Execute pop comment
    const popResult = await matcher.execute('write a <file>', [popFilePath]);
    expect(popResult.success).toBe(true);
    expect(fs.existsSync(popFilePath)).toBe(true);
    
    const popContent = fs.readFileSync(popFilePath, 'utf8');
    expect(popContent).toContain('Pop operation executed at');
    
    // Execute insert comment
    const insertResult = await matcher.execute('write a <file>', [insertFilePath]);
    expect(insertResult.success).toBe(true);
    expect(fs.existsSync(insertFilePath)).toBe(true);
    
    const insertContent = fs.readFileSync(insertFilePath, 'utf8');
    expect(insertContent).toContain('Insert operation executed at');
  });
  
  test('should handle missing scripts gracefully', async () => {
    const matcher = new ScriptMatcher();
    
    const result = await matcher.execute('non existent script', ['some-param']);
    expect(result.success).toBe(false);
    expect(result.error).toContain('No script found for');
  });
  
  test('should process queue with runnable comments integration', async () => {
    // Create a more complete demo queue
    const demoQueue = {
      metadata: {
        version: '1.0.0',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        total_items: 1
      },
      working_item: null,
      queues: {
        adhoc_temp_user_request: {
          items: [
            { 
              id: 'task-001', 
              type: 'adhoc_temp_user_request',
              content: 'Process high priority data',
              parent: 'system'
            }
          ],
          pop_comment: {
            text: 'write a <file>',
            parameters: ['temp/pop.txt']
          }
        },
        user_story: {
          items: [],
          insert_comment: {
            text: 'write a <file>',
            parameters: ['temp/insert.txt']
          }
        },
        scenarios: { items: [] },
        environment_tests: { items: [] },
        external_tests: { items: [] },
        system_tests_implement: { items: [] },
        integration_tests_implement: { items: [] },
        unit_tests: { items: [] },
        integration_tests_verify: { items: [] },
        system_tests_verify: { items: [] },
        coverage_duplication: { items: [] },
        retrospective: { items: [] }
      },
      global_config: {
        seldom_display_default: 5,
        operation_counters: {}
      },
      priority_order: [
        'adhoc_temp_user_request',
        'environment_tests',
        'external_tests',
        'system_tests_implement',
        'integration_tests_implement',
        'unit_tests',
        'integration_tests_verify',
        'system_tests_verify',
        'scenarios',
        'user_story'
      ]
    };
    
    await fileAPI.createFile(demoQueuePath, JSON.stringify(demoQueue, { type: FileType.TEMPORARY }));
    
    // Read and process the queue
    const queueData = JSON.parse(fs.readFileSync(demoQueuePath, 'utf8'));
    const matcher = new ScriptMatcher();
    
    // Simulate pop operation - execute pop_comment if exists
    const adhocQueue = queueData.queues.adhoc_temp_user_request;
    if (adhocQueue.pop_comment) {
      const result = await matcher.execute(
        adhocQueue.pop_comment.text,
        adhocQueue.pop_comment.parameters
      );
      expect(result.success).toBe(true);
      expect(fs.existsSync(popFilePath)).toBe(true);
    }
    
    // Simulate insert operation - execute insert_comment if exists
    const userStoryQueue = queueData.queues.user_story;
    if (userStoryQueue.insert_comment) {
      const result = await matcher.execute(
        userStoryQueue.insert_comment.text,
        userStoryQueue.insert_comment.parameters
      );
      expect(result.success).toBe(true);
      expect(fs.existsSync(insertFilePath)).toBe(true);
    }
  });
});