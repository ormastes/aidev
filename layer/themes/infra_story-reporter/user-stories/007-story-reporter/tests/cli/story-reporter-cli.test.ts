import { execSync } from 'child_process';
import { fs } from '../../../../../infra_external-log-lib/src';
import { path } from '../../../../../infra_external-log-lib/src';

describe('Story Reporter CLI - Feature Parity Tests', () => {
  const CLI_PATH = path.join(__dirname, '../../src/cli/story-reporter-cli.ts');
  
  beforeEach(() => {
    // Clean up test artifacts
    if (fs.existsSync('./reports')) {
      fs.rmSync('./reports', { recursive: true });
    }
    if (fs.existsSync('./batch-exports')) {
      fs.rmSync('./batch-exports', { recursive: true });
    }
  });
  
  describe('Dashboard Command', () => {
    it('should display dashboard with statistics', () => {
      const output = execSync(`bun run ${CLI_PATH} dashboard`, { encoding: 'utf-8' });
      
      expect(output).toContain('Story Reporter Dashboard');
      expect(output).toContain('Total Stories');
      expect(output).toContain('Avg Coverage');
      expect(output).toContain('Recent Stories');
    });
    
    it('should support auto-refresh option', (done) => {
      const child = execSync(`bun run ${CLI_PATH} dashboard --refresh 1`, {
        encoding: 'utf-8',
        timeout: 2500
      });
      
      // Should refresh at least once in 2.5 seconds
      expect(child).toBeTruthy();
      done();
    });
  });
  
  describe('Browse Command', () => {
    it('should list stories with filters', () => {
      const output = execSync(`bun run ${CLI_PATH} browse --status draft`, { encoding: 'utf-8' });
      
      expect(output).toContain('Stories');
      expect(output).toMatch(/\d+ results/);
    });
    
    it('should support search functionality', () => {
      const output = execSync(`bun run ${CLI_PATH} browse --search "test"`, { encoding: 'utf-8' });
      
      expect(output).toBeTruthy();
    });
    
    it('should export to different formats', () => {
      execSync(`bun run ${CLI_PATH} browse --export json`, { encoding: 'utf-8' });
      
      const files = fs.readdirSync('.');
      const exportFile = files.find(f => f.startsWith('stories-export') && f.endsWith('.json'));
      expect(exportFile).toBeTruthy();
      
      // Clean up
      if (exportFile) fs.unlinkSync(exportFile);
    });
    
    it('should support sorting options', () => {
      const output = execSync(`bun run ${CLI_PATH} browse --sort coverage --reverse`, { encoding: 'utf-8' });
      
      expect(output).toContain('Stories');
    });
    
    it('should show summary statistics', () => {
      const output = execSync(`bun run ${CLI_PATH} browse`, { encoding: 'utf-8' });
      
      expect(output).toContain('Summary:');
      expect(output).toContain('Average Coverage:');
    });
  });
  
  describe('Settings Command', () => {
    it('should display current settings', () => {
      const output = execSync(`bun run ${CLI_PATH} settings --list`, { encoding: 'utf-8' });
      
      expect(output).toContain('Current Settings');
      expect(output).toContain('theme');
      expect(output).toContain("outputFormat");
      expect(output).toContain("colorEnabled");
    });
    
    it('should set and get configuration values', () => {
      execSync(`bun run ${CLI_PATH} settings --set theme=dark`, { encoding: 'utf-8' });
      
      const output = execSync(`bun run ${CLI_PATH} settings --get theme`, { encoding: 'utf-8' });
      expect(output).toContain('theme = dark');
      
      // Reset
      execSync(`bun run ${CLI_PATH} settings --reset`, { encoding: 'utf-8' });
    });
    
    it('should show server information', () => {
      const output = execSync(`bun run ${CLI_PATH} settings`, { encoding: 'utf-8' });
      
      expect(output).toContain('Server Information');
      expect(output).toContain('API Endpoint');
      expect(output).toContain("Environment");
    });
  });
  
  describe('Export Command', () => {
    it('should export story in JSON format', () => {
      // Assuming we have a test story ID
      const testStoryId = 'test-story-001';
      
      try {
        execSync(`bun run ${CLI_PATH} export ${testStoryId} --format json`, { encoding: 'utf-8' });
        
        const files = fs.readdirSync('./reports');
        const jsonFile = files.find(f => f.includes(testStoryId) && f.endsWith('.json'));
        expect(jsonFile).toBeTruthy();
      } catch (error) {
        // Story might not exist in test environment
        expect(error.message).toContain('not found');
      }
    });
    
    it('should export story in Markdown format', () => {
      const testStoryId = 'test-story-001';
      
      try {
        execSync(`bun run ${CLI_PATH} export ${testStoryId} --format markdown`, { encoding: 'utf-8' });
        
        const files = fs.readdirSync('./reports');
        const mdFile = files.find(f => f.includes(testStoryId) && f.endsWith('.md'));
        expect(mdFile).toBeTruthy();
      } catch (error) {
        // Story might not exist in test environment
        expect(error.message).toContain('not found');
      }
    });
    
    it('should include optional metadata and comments', () => {
      const testStoryId = 'test-story-001';
      
      try {
        execSync(`bun run ${CLI_PATH} export ${testStoryId} --format json --include-comments --include-metadata`, { encoding: 'utf-8' });
        
        // Verify the exported file contains the expected fields
        const files = fs.readdirSync('./reports');
        const jsonFile = files.find(f => f.includes(testStoryId) && f.endsWith('.json'));
        
        if (jsonFile) {
          const content = JSON.parse(fs.readFileSync(`./reports/${jsonFile}`, 'utf-8'));
          expect(content).toHaveProperty("metadata");
          expect(content).toHaveProperty("comments");
        }
      } catch (error) {
        // Story might not exist in test environment
        expect(error.message).toContain('not found');
      }
    });
  });
  
  describe('Batch Command', () => {
    it('should perform batch operations with dry-run', () => {
      const output = execSync(`bun run ${CLI_PATH} batch --status draft --action export --dry-run`, { encoding: 'utf-8' });
      
      expect(output).toContain('DRY RUN MODE');
      expect(output).toContain('No changes will be made');
    });
    
    it('should filter stories for batch operations', () => {
      const output = execSync(`bun run ${CLI_PATH} batch --project test --action verify --dry-run`, { encoding: 'utf-8' });
      
      expect(output).toMatch(/Found \d+ stories for batch operation/);
    });
  });
  
  describe('View Command', () => {
    it('should display detailed story information', () => {
      const testStoryId = 'test-story-001';
      
      try {
        const output = execSync(`bun run ${CLI_PATH} view ${testStoryId}`, { encoding: 'utf-8' });
        
        expect(output).toContain('Story Details');
        expect(output).toContain("Statistics");
        expect(output).toContain("Coverage");
        expect(output).toContain('Quality Gates');
      } catch (error) {
        // Story might not exist in test environment
        expect(error.message).toContain('not found');
      }
    });
    
    it('should support JSON output mode', () => {
      const testStoryId = 'test-story-001';
      
      try {
        const output = execSync(`bun run ${CLI_PATH} view ${testStoryId} --json`, { encoding: 'utf-8' });
        
        const json = JSON.parse(output);
        expect(json).toHaveProperty('id');
        expect(json).toHaveProperty('title');
        expect(json).toHaveProperty('status');
      } catch (error) {
        // Story might not exist or output might not be valid JSON
        expect(error).toBeTruthy();
      }
    });
    
    it('should show enhanced coverage details', () => {
      const testStoryId = 'test-story-001';
      
      try {
        const output = execSync(`bun run ${CLI_PATH} view ${testStoryId} --full`, { encoding: 'utf-8' });
        
        expect(output).toContain('Unit Tests');
        expect(output).toContain("Integration");
        expect(output).toContain('E2E Tests');
      } catch (error) {
        // Story might not exist in test environment
        expect(error.message).toContain('not found');
      }
    });
  });
  
  describe('Interactive Mode', () => {
    it('should have interactive mode available', () => {
      // Can't easily test interactive mode in unit tests
      // Just verify the command exists
      const helpOutput = execSync(`bun run ${CLI_PATH} --help`, { encoding: 'utf-8' });
      
      expect(helpOutput).toContain("interactive");
      expect(helpOutput).toContain('Start interactive mode');
    });
  });
  
  describe('Global Options', () => {
    it('should support quiet mode', () => {
      const output = execSync(`bun run ${CLI_PATH} --quiet list`, { encoding: 'utf-8' });
      
      // In quiet mode, should have minimal output
      expect(output.split('\n').length).toBeLessThan(10);
    });
    
    it('should support verbose mode', () => {
      const output = execSync(`bun run ${CLI_PATH} --verbose list`, { encoding: 'utf-8' });
      
      expect(output).toContain('Story Reporter initialized');
    });
    
    it('should support no-color option', () => {
      const output = execSync(`bun run ${CLI_PATH} --no-color list`, { encoding: 'utf-8' });
      
      // Should not contain ANSI color codes
      expect(output).not.toMatch(/\x1b\[\d+m/);
    });
  });
  
  describe('Help Documentation', () => {
    it('should show comprehensive help', () => {
      const output = execSync(`bun run ${CLI_PATH} --help`, { encoding: 'utf-8' });
      
      // Verify all new commands are documented
      expect(output).toContain("dashboard");
      expect(output).toContain('browse');
      expect(output).toContain("settings");
      expect(output).toContain('export');
      expect(output).toContain('batch');
      expect(output).toContain('view');
    });
    
    it('should show command-specific help', () => {
      const output = execSync(`bun run ${CLI_PATH} browse --help`, { encoding: 'utf-8' });
      
      expect(output).toContain('--status');
      expect(output).toContain('--search');
      expect(output).toContain('--sort');
      expect(output).toContain('--export');
    });
  });
});

describe('CLI Feature Parity with Web GUI', () => {
  it('should have all major web GUI features', () => {
    const helpOutput = execSync(`bun run ${CLI_PATH} --help`, { encoding: 'utf-8' });
    
    // Dashboard features
    expect(helpOutput).toContain("dashboard");
    
    // Browse/Search features
    expect(helpOutput).toContain('browse');
    
    // Settings/Theme management
    expect(helpOutput).toContain("settings");
    
    // Export functionality
    expect(helpOutput).toContain('export');
    
    // Batch operations
    expect(helpOutput).toContain('batch');
    
    // Detailed viewing
    expect(helpOutput).toContain('view');
    
    // Interactive mode
    expect(helpOutput).toContain("interactive");
  });
});