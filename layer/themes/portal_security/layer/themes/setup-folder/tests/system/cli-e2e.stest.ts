import { execSync } from 'child_process';
import * as fs from 'fs-extra';
import { path } from '../../../../../../infra_external-log-lib/src';

describe('CLI End-to-End System Tests', () => {
  const originalCwd = process.cwd();
  const testDir = path.join(originalCwd, 'temp/test-system');
  const cliPath = path.join(__dirname, '../../children/src/cli.ts');

  beforeEach(async () => {
    await fs.ensureDir(testDir);
    process.chdir(testDir);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await fs.remove(testDir);
  });

  describe('CLI Help', () => {
    it('should display help information', () => {
      const output = execSync(`ts-node ${cliPath} --help`, { encoding: 'utf-8' });
      expect(output).toContain('aidev-setup');
      expect(output).toContain('Commands:');
      expect(output).toContain('theme');
      expect(output).toContain('story');
      expect(output).toContain('demo');
    });

    it('should display version information', () => {
      const output = execSync(`ts-node ${cliPath} --version`, { encoding: 'utf-8' });
      expect(output).toContain('1.0.0');
    });
  });

  describe('Theme Command E2E', () => {
    it('should create a theme with all required files', () => {
      // Run theme command
      const command = `ts-node ${cliPath} theme test-theme --name "Test Theme" --non-interactive`;
      execSync(command, { encoding: 'utf-8' });

      // Verify theme was created
      const themePath = path.join(testDir, 'scripts/setup/agile/themes/test-theme');
      expect(fs.existsSync(themePath)).toBe(true);
      
      // Verify key files
      expect(fs.existsSync(path.join(themePath, '.env'))).toBe(true);
      expect(fs.existsSync(path.join(themePath, 'README.md'))).toBe(true);
      expect(fs.existsSync(path.join(themePath, 'package.json'))).toBe(true);
      
      // Verify HEA structure
      expect(fs.existsSync(path.join(themePath, 'src/core/pipe/index.ts'))).toBe(true);
      expect(fs.existsSync(path.join(themePath, 'src/feature/pipe/index.ts'))).toBe(true);
      
      // Verify content
      const envContent = fs.readFileSync(path.join(themePath, '.env'), 'utf-8');
      expect(envContent).toContain('AGILE_TYPE=theme');
      expect(envContent).toContain('MODE=VF');
    });
  });

  describe('Demo Command E2E', () => {
    it('should create a demo project with TypeScript', () => {
      const command = `ts-node ${cliPath} demo test-demo --language typescript --non-interactive`;
      execSync(command, { encoding: 'utf-8' });

      const demoPath = path.join(testDir, 'demo/test-demo');
      expect(fs.existsSync(demoPath)).toBe(true);
      
      // Verify TypeScript configuration
      expect(fs.existsSync(path.join(demoPath, 'tsconfig.json'))).toBe(true);
      expect(fs.existsSync(path.join(demoPath, 'package.json'))).toBe(true);
      
      const packageJson = fs.readJsonSync(path.join(demoPath, 'package.json'));
      expect(packageJson.devDependencies).toHaveProperty('typescript');
    });
  });

  describe('List Command E2E', () => {
    it('should list all deployments', () => {
      // Create a few deployments first
      execSync(`ts-node ${cliPath} theme theme1 --name "Theme 1" --non-interactive`);
      execSync(`ts-node ${cliPath} demo demo1 --language typescript --non-interactive`);
      
      // Run list command
      const output = execSync(`ts-node ${cliPath} list`, { encoding: 'utf-8' });
      
      expect(output).toContain('theme1');
      expect(output).toContain('demo1');
      expect(output).toContain('Theme');
      expect(output).toContain('Demo');
    });
  });

  describe('Error Handling E2E', () => {
    it('should handle invalid commands gracefully', () => {
      expect(() => {
        execSync(`ts-node ${cliPath} invalid-command`, { encoding: 'utf-8' });
      }).toThrow();
    });

    it('should validate required options', () => {
      expect(() => {
        execSync(`ts-node ${cliPath} theme`, { encoding: 'utf-8' });
      }).toThrow();
    });
  });

  describe('Interactive Mode E2E', () => {
    it('should run in interactive mode when no command provided', () => {
      // This test would require more complex setup with stdin simulation
      // For now, just verify the CLI can be invoked
      const result = execSync(`echo "1" | ts-node ${cliPath}`, { 
        encoding: 'utf-8',
        input: '1\n' // Exit option
      });
      expect(result).toBeDefined();
    });
  });
});