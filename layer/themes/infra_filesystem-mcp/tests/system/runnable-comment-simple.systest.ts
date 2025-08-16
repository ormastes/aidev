import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { execSync } from 'child_process';
import { fs } from '../../../infra_external-log-lib/src';
import { path } from '../../../infra_external-log-lib/src';

describe('System Test: Simple Runnable Comment Scripts', () => {
  const testDir = path.join(__dirname, '../../temp/test-scripts');
  const scriptDir = path.join(__dirname, '../../../../../llm_rules/steps');
  
  beforeEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
    fs.mkdirSync(testDir, { recursive: true });
    process.chdir(testDir);
  });

  afterEach(() => {
    process.chdir(__dirname);
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
  });

  it('should execute write_a__file_.js script', () => {
    // Given: The system is in a valid state
    // When: execute write_a__file_.js script
    // Then: The expected behavior occurs
    const scriptPath = path.join(scriptDir, 'write_a__file_.js');
    const outputFile = 'test-output.txt';
    const content = 'Hello from test!';
    
    // Execute script
    execSync(`node ${scriptPath} ${outputFile} "${content}"`, { encoding: 'utf8' });
    
    // Verify file was created
    expect(fs.existsSync(outputFile)).toBe(true);
    expect(fs.readFileSync(outputFile, 'utf8')).toBe(content);
  });

  it('should execute validate__type__format.js script', () => {
    // Given: The system is in a valid state
    // When: execute validate__type__format.js script
    // Then: The expected behavior occurs
    const scriptPath = path.join(scriptDir, 'validate__type__format.js');
    
    // Test valid JSON
    const result = execSync(
      `node ${scriptPath} json '{"valid": "json"}'`,
      { encoding: 'utf8' }
    );
    expect(result).toContain('Valid JSON format');
    expect(result).toContain('Validation passed for json');
    
    // Test invalid JSON
    expect(() => {
      execSync(`node ${scriptPath} json '{invalid json}'`, { encoding: 'utf8' });
    }).toThrow();
  });

  it('should execute verify__type__implementation.js script', () => {
    // Given: The system is in a valid state
    // When: execute verify__type__implementation.js script
    // Then: The expected behavior occurs
    const scriptPath = path.join(scriptDir, 'verify__type__implementation.js');
    
    // Create a test queue file
    const queueData = { queues: { test: { items: [] } } };
    fs.writeFileSync('TASK_QUEUE.vf.json', JSON.stringify(queueData, null, 2));
    
    // Verify queue implementation
    const result = execSync(
      `node ${scriptPath} queue TASK_QUEUE.vf.json`,
      { encoding: 'utf8' }
    );
    expect(result).toContain('Queue implementation verified');
    expect(result).toContain('Verification passed for queue');
  });

  it('should execute check__type__requirements.js script', () => {
    // Given: The system is in a valid state
    // When: execute check__type__requirements.js script
    // Then: The expected behavior occurs
    const scriptPath = path.join(scriptDir, 'check__type__requirements.js');
    
    // Create NAME_ID.vf.json
    const nameIdData = {
      entities: [
        { id: 'test_123', name: 'test_entity', type: 'test' }
      ]
    };
    fs.writeFileSync('NAME_ID.vf.json', JSON.stringify(nameIdData, null, 2));
    
    // Check entity requirements
    const result = execSync(
      `node ${scriptPath} entity test_123`,
      { encoding: 'utf8' }
    );
    expect(result).toContain('All requirements for entity are satisfied');
  });

  it('should execute conduct__type__retrospective.js script', () => {
    // Given: The system is in a valid state
    // When: execute conduct__type__retrospective.js script
    // Then: The expected behavior occurs
    const scriptPath = path.join(scriptDir, 'conduct__type__retrospective.js');
    const outputPath = 'retrospective.md';
    
    // Execute retrospective
    const result = execSync(
      `node ${scriptPath} feature test-feature ${outputPath}`,
      { encoding: 'utf8' }
    );
    
    expect(result).toContain('Retrospective saved to retrospective.md');
    expect(fs.existsSync(outputPath)).toBe(true);
    
    const content = fs.readFileSync(outputPath, 'utf8');
    expect(content).toContain('# Feature Retrospective');
    expect(content).toContain('test-feature');
  });

  it('should handle script execution with ScriptMatcher', () => {
    // Given: The system is in a valid state
    // When: handle script execution with ScriptMatcher
    // Then: The expected behavior occurs
    const ScriptMatcher = require(path.join(scriptDir, 'script-matcher.js'));
    const matcher = new ScriptMatcher(scriptDir);
    
    // Test pattern matching
    const script = matcher.textToScriptName('write a <file>');
    expect(script).toBe('write_a__file_.js');
    
    const script2 = matcher.textToScriptName('validate <type> format');
    expect(script2).toBe('validate__type__format.js');
    
    const script3 = matcher.textToScriptName('register <type> item');
    expect(script3).toBe('register__type__item.js');
    
    // Test finding scripts
    const scriptPath = matcher.findScript('write a <file>');
    expect(scriptPath).toContain('write_a__file_.js');
    expect(fs.existsSync(scriptPath)).toBe(true);
  });
});