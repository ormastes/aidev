import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { execSync } from 'child_process';
import { fs } from '../../../infra_external-log-lib/src';
import { path } from '../../../infra_external-log-lib/src';

describe('System Test: register__type__item.js', () => {
  const testDir = path.join(__dirname, '../../temp/test-register');
  const nameIdPath = path.join(testDir, 'NAME_ID.vf.json');
  const scriptPath = path.join(__dirname, '../../../../../llm_rules/steps/register__type__item.js');

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

  it('should register a new item in NAME_ID.vf.json', () => {
    // Given: The system is in a valid state
    // When: register a new item in NAME_ID.vf.json
    // Then: The expected behavior occurs
    const result = execSync(
      `node ${scriptPath} test sample_item "A sample test item" parent_123`,
      { encoding: 'utf8' }
    );

    expect(result).toContain('Registered test item: sample_item');
    expect(fs.existsSync(nameIdPath)).toBe(true);

    const nameIdData = JSON.parse(fs.readFileSync(nameIdPath, 'utf8'));
    expect(nameIdData.entities).toHaveLength(1);
    
    const entity = nameIdData.entities[0];
    expect(entity.type).toBe('test');
    expect(entity.name).toBe('sample_item');
    expect(entity.description).toBe('A sample test item');
    expect(entity.parent_id).toBe('parent_123');
    expect(entity.id).toMatch(/^test_\d+_[a-z0-9]+$/);
  });

  it('should append to existing NAME_ID.vf.json', () => {
    // Given: The system is in a valid state
    // When: append to existing NAME_ID.vf.json
    // Then: The expected behavior occurs
    const existingData = {
      entities: [{
        id: 'existing_123',
        type: 'existing',
        name: 'existing_item'
      }]
    };
    fs.writeFileSync(nameIdPath, JSON.stringify(existingData, null, 2));

    execSync(
      `node ${scriptPath} scenario new_scenario "New scenario description" story_456`,
      { encoding: 'utf8' }
    );

    const nameIdData = JSON.parse(fs.readFileSync(nameIdPath, 'utf8'));
    expect(nameIdData.entities).toHaveLength(2);
    expect(nameIdData.entities[0].id).toBe('existing_123');
    expect(nameIdData.entities[1].type).toBe('scenario');
    expect(nameIdData.entities[1].name).toBe('new_scenario');
  });

  it('should fail with insufficient arguments', () => {
    // Given: The system is in a valid state
    // When: fail with insufficient arguments
    // Then: The expected behavior occurs
    expect(() => {
      execSync(`node ${scriptPath} test`, { encoding: 'utf8' });
    }).toThrow();
  });
});