import { fs } from '../../../infra_external-log-lib/src';
import { path } from '../../../infra_external-log-lib/src';

describe('typescript-config theme', () => {
  const configPath = path.join(__dirname, '../../user-stories/004-strict-typescript/config');

  describe('tsconfig files', () => {
    it('should have base tsconfig', () => {
      const baseConfigPath = path.join(configPath, 'tsconfig.base.json');
      expect(fs.existsSync(baseConfigPath)).toBe(true);
    });

    it('should have all required config variants', () => {
      const configFiles = [
        'tsconfig.base.json',
        'tsconfig.build.json',
        'tsconfig.dev.json',
        'tsconfig.root.json',
        'tsconfig.test.json'
      ];

      configFiles.forEach(file => {
        const filePath = path.join(configPath, file);
        expect(fs.existsSync(filePath)).toBe(true);
      });
    });
  });

  describe('strict mode configuration', () => {
    let baseConfig: any;

    beforeAll(() => {
      const baseConfigPath = path.join(configPath, 'tsconfig.base.json');
      const configContent = fs.readFileSync(baseConfigPath, 'utf8');
      baseConfig = JSON.parse(configContent);
    });

    it('should have strict mode enabled', () => {
      expect(baseConfig.compilerOptions.strict).toBe(true);
    });

    it('should have all strict type checking options enabled', () => {
      const strictOptions = [
        'noImplicitAny',
        'strictNullChecks',
        'strictFunctionTypes',
        'strictBindCallApply',
        'strictPropertyInitialization',
        'noImplicitThis',
        'useUnknownInCatchVariables',
        'alwaysStrict'
      ];

      strictOptions.forEach(option => {
        expect(baseConfig.compilerOptions[option]).toBe(true);
      });
    });

    it('should have additional type safety options enabled', () => {
      const safeguards = [
        'noUnusedLocals',
        'noUnusedParameters',
        'exactOptionalPropertyTypes',
        'noImplicitReturns',
        'noFallthroughCasesInSwitch',
        'noUncheckedIndexedAccess',
        'noImplicitOverride',
        'noPropertyAccessFromIndexSignature'
      ];

      safeguards.forEach(option => {
        expect(baseConfig.compilerOptions[option]).toBe(true);
      });
    });

    it('should target modern JavaScript', () => {
      expect(baseConfig.compilerOptions.target).toBe('ES2022');
      expect(baseConfig.compilerOptions.lib).toContain('ES2022');
    });

    it('should use NodeNext module resolution', () => {
      expect(baseConfig.compilerOptions.module).toBe('NodeNext');
      expect(baseConfig.compilerOptions.moduleResolution).toBe('NodeNext');
    });
  });

  describe('path mapping', () => {
    let baseConfig: any;

    beforeAll(() => {
      const baseConfigPath = path.join(configPath, 'tsconfig.base.json');
      const configContent = fs.readFileSync(baseConfigPath, 'utf8');
      baseConfig = JSON.parse(configContent);
    });

    it('should have path aliases configured', () => {
      expect(baseConfig.compilerOptions.paths).toBeDefined();
      expect(baseConfig.compilerOptions.baseUrl).toBe('.');
    });

    it('should have correct path mappings', () => {
      const expectedPaths = {
        '@aidev/*': ['./layer/*'],
        '@themes/*': ['./layer/themes/*'],
        '@shared/*': ['./layer/shared/*'],
        '@core/*': ['./layer/core/*'],
        '@test/*': ['./test/*'],
        '@types/*': ['./types/*']
      };

      expect(baseConfig.compilerOptions.paths).toEqual(expectedPaths);
    });
  });

  describe('compilation settings', () => {
    let baseConfig: any;

    beforeAll(() => {
      const baseConfigPath = path.join(configPath, 'tsconfig.base.json');
      const configContent = fs.readFileSync(baseConfigPath, 'utf8');
      baseConfig = JSON.parse(configContent);
    });

    it('should generate declaration files', () => {
      expect(baseConfig.compilerOptions.declaration).toBe(true);
      expect(baseConfig.compilerOptions.declarationMap).toBe(true);
    });

    it('should generate source maps', () => {
      expect(baseConfig.compilerOptions.sourceMap).toBe(true);
    });

    it('should have proper module interop settings', () => {
      expect(baseConfig.compilerOptions.esModuleInterop).toBe(true);
      expect(baseConfig.compilerOptions.allowSyntheticDefaultImports).toBe(true);
      expect(baseConfig.compilerOptions.isolatedModules).toBe(true);
    });

    it('should exclude test files from compilation', () => {
      expect(baseConfig.exclude).toContain('**/*.test.ts');
      expect(baseConfig.exclude).toContain('**/*.spec.ts');
      expect(baseConfig.exclude).toContain('**/*.test.tsx');
      expect(baseConfig.exclude).toContain('**/*.spec.tsx');
    });
  });

  describe('error handling', () => {
    let baseConfig: any;

    beforeAll(() => {
      const baseConfigPath = path.join(configPath, 'tsconfig.base.json');
      const configContent = fs.readFileSync(baseConfigPath, 'utf8');
      baseConfig = JSON.parse(configContent);
    });

    it('should not emit on error', () => {
      expect(baseConfig.compilerOptions.noEmitOnError).toBe(true);
    });

    it('should show full error messages', () => {
      expect(baseConfig.compilerOptions.noErrorTruncation).toBe(true);
    });

    it('should use pretty output', () => {
      expect(baseConfig.compilerOptions.pretty).toBe(true);
    });
  });

  describe('performance settings', () => {
    let baseConfig: any;

    beforeAll(() => {
      const baseConfigPath = path.join(configPath, 'tsconfig.base.json');
      const configContent = fs.readFileSync(baseConfigPath, 'utf8');
      baseConfig = JSON.parse(configContent);
    });

    it('should skip library type checking', () => {
      expect(baseConfig.compilerOptions.skipLibCheck).toBe(true);
      expect(baseConfig.compilerOptions.skipDefaultLibCheck).toBe(true);
    });

    it('should have solution mode optimizations', () => {
      expect(baseConfig.compilerOptions.disableSolutionSearching).toBe(true);
      expect(baseConfig.compilerOptions.disableSourceOfProjectReferenceRedirect).toBe(true);
    });
  });
});