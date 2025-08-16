import { fs } from '../../../../../infra_external-log-lib/src';
import { LayerValidator } from '../../src/core/layer-validator';
import { LayerType, LayerConfig, DependencyType } from '../../src/interfaces/layer';

// Mock fs module
jest.mock('fs');
const mockedFs = fs as jest.Mocked<typeof fs>;

describe("LayerValidator", () => {
  let layerValidator: LayerValidator;

  beforeEach(() => {
    layerValidator = new LayerValidator();
    jest.clearAllMocks();
  });

  describe("constructor", () => {
    it('should create LayerValidator instance', () => {
      expect(layerValidator).toBeDefined();
    });
  });

  describe("validateDependencies", () => {
    let coreLayer: LayerConfig;
    let sharedLayer: LayerConfig;
    let themesLayer: LayerConfig;
    let infraLayer: LayerConfig;

    beforeEach(() => {
      coreLayer = { 
        name: 'core', 
        type: LayerType.Core, 
        dependencies: [], 
        path: '/core', 
        exports: [], 
        version: '1.0.0' 
      };
      sharedLayer = { 
        name: 'shared', 
        type: LayerType.Shared, 
        dependencies: [LayerType.Core], 
        path: '/shared', 
        exports: [], 
        version: '1.0.0' 
      };
      themesLayer = { 
        name: 'themes', 
        type: LayerType.Themes, 
        dependencies: [LayerType.Core, LayerType.Shared], 
        path: '/themes', 
        exports: [], 
        version: '1.0.0' 
      };
      infraLayer = { 
        name: "infrastructure", 
        type: LayerType.Infrastructure, 
        dependencies: [LayerType.Core, LayerType.Shared], 
        path: '/infrastructure', 
        exports: [], 
        version: '1.0.0' 
      };
    });

    it('should allow valid dependencies', () => {
      const result = layerValidator.validateDependencies(sharedLayer, coreLayer);
      
      expect(result.valid).toBe(true);
      expect(result.from).toBe('shared');
      expect(result.to).toBe('core');
      expect(result.type).toBe(DependencyType.Import);
    });

    it('should reject Core depending on other layers', () => {
      const result = layerValidator.validateDependencies(coreLayer, sharedLayer);
      
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Core layer cannot depend on other layers');
    });

    it('should reject Shared depending on non-Core layers', () => {
      const result = layerValidator.validateDependencies(sharedLayer, themesLayer);
      
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Shared layer can only depend on Core layer');
    });

    it('should reject Themes depending on Infrastructure', () => {
      const result = layerValidator.validateDependencies(themesLayer, infraLayer);
      
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Themes and Infrastructure layers cannot depend on each other');
    });

    it('should reject Infrastructure depending on Themes', () => {
      const result = layerValidator.validateDependencies(infraLayer, themesLayer);
      
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Themes and Infrastructure layers cannot depend on each other');
    });

    it('should reject hierarchy violations', () => {
      const result = layerValidator.validateDependencies(coreLayer, themesLayer);
      
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Core layer cannot depend on other layers');
    });

    it('should allow same layer dependencies', () => {
      const result = layerValidator.validateDependencies(coreLayer, coreLayer);
      
      expect(result.valid).toBe(true);
    });
  });

  describe("validateStructure", () => {
    beforeEach(() => {
      mockedFs.existsSync.mockClear();
    });

    it('should validate correct layer structure', () => {
      mockedFs.existsSync.mockImplementation((path: any) => {
        const pathStr = path.toString();
        return pathStr.includes('pipe') || pathStr.includes('index.ts');
      });

      const result = layerValidator.validateStructure('/test/layer');
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing pipe directory', () => {
      mockedFs.existsSync.mockImplementation((path: any) => {
        const pathStr = path.toString();
        if (pathStr.includes('pipe') && !pathStr.includes('index.ts')) {
          return false;
        }
        return pathStr.includes('index.ts');
      });

      const result = layerValidator.validateStructure('/test/layer');
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing required directory: pipe');
    });

    it('should detect missing index.ts', () => {
      mockedFs.existsSync.mockImplementation((path: any) => {
        const pathStr = path.toString();
        if (pathStr.endsWith('index.ts') && !pathStr.includes('pipe')) {
          return false;
        }
        return true;
      });

      const result = layerValidator.validateStructure('/test/layer');
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing index.ts file');
    });

    it('should detect missing pipe/index.ts', () => {
      mockedFs.existsSync.mockImplementation((path: any) => {
        const pathStr = path.toString();
        if (pathStr.includes('pipe/index.ts')) {
          return false;
        }
        return true;
      });

      const result = layerValidator.validateStructure('/test/layer');
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing pipe/index.ts file');
    });

    it('should collect multiple errors', () => {
      mockedFs.existsSync.mockReturnValue(false);

      const result = layerValidator.validateStructure('/test/layer');
      
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(3);
    });
  });

  describe("checkCircularDependencies", () => {
    it('should detect no circular dependencies in valid structure', () => {
      const layers = new Map([
        ['core', { 
          name: 'core', 
          type: LayerType.Core, 
          dependencies: [], 
          path: '/core', 
          exports: [], 
          version: '1.0.0' 
        }],
        ['shared', { 
          name: 'shared', 
          type: LayerType.Shared, 
          dependencies: [LayerType.Core], 
          path: '/shared', 
          exports: [], 
          version: '1.0.0' 
        }],
        ['themes', { 
          name: 'themes', 
          type: LayerType.Themes, 
          dependencies: [LayerType.Core, LayerType.Shared], 
          path: '/themes', 
          exports: [], 
          version: '1.0.0' 
        }]
      ]);

      const result = layerValidator.checkCircularDependencies(layers);
      
      expect(result.hasCircular).toBe(false);
      expect(result.cycles).toHaveLength(0);
    });

    it('should handle empty layers map', () => {
      const layers = new Map();

      const result = layerValidator.checkCircularDependencies(layers);
      
      expect(result.hasCircular).toBe(false);
      expect(result.cycles).toHaveLength(0);
    });
  });

  describe("validateImport", () => {
    let layers: Map<string, LayerConfig>;
    let themesLayer: LayerConfig;

    beforeEach(() => {
      const coreLayer = { 
        name: 'core', 
        type: LayerType.Core, 
        dependencies: [], 
        path: '/core', 
        exports: [], 
        version: '1.0.0' 
      };
      const sharedLayer = { 
        name: 'shared', 
        type: LayerType.Shared, 
        dependencies: [LayerType.Core], 
        path: '/shared', 
        exports: [], 
        version: '1.0.0' 
      };
      themesLayer = { 
        name: 'user-auth', 
        type: LayerType.Themes, 
        dependencies: [LayerType.Core, LayerType.Shared], 
        path: '/themes/user-auth', 
        exports: [], 
        version: '1.0.0' 
      };
      
      layers = new Map([
        ['core', coreLayer],
        ['shared', sharedLayer],
        ['user-auth', themesLayer]
      ]);
    });

    it('should validate core imports', () => {
      const result = layerValidator.validateImport('@core/utils', themesLayer, layers);
      
      expect(result.valid).toBe(true);
    });

    it('should validate shared imports', () => {
      const result = layerValidator.validateImport('@shared/types', themesLayer, layers);
      
      expect(result.valid).toBe(true);
    });

    it('should reject unknown imports', () => {
      const result = layerValidator.validateImport('@unknown/module', themesLayer, layers);
      
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Unknown import target');
    });

    it('should reject invalid layer dependencies through imports', () => {
      const coreLayer = layers.get('core')!;
      const result = layerValidator.validateImport('@shared/types', coreLayer, layers);
      
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Core layer cannot depend on other layers');
    });
  });

  describe('error handling', () => {
    it('should handle undefined layer types gracefully', () => {
      const unknownLayer = { 
        name: 'unknown', 
        type: 999 as unknown as LayerType, 
        dependencies: [], 
        path: '/unknown', 
        exports: [], 
        version: '1.0.0' 
      };
      const coreLayer = { 
        name: 'core', 
        type: LayerType.Core, 
        dependencies: [], 
        path: '/core', 
        exports: [], 
        version: '1.0.0' 
      };

      const result = layerValidator.validateDependencies(unknownLayer, coreLayer);
      
      // With unknown layer type, the validation may pass with hierarchy check
      expect(result).toBeDefined();
      expect(result.from).toBe('unknown');
      expect(result.to).toBe('core');
    });

    it('should handle file system errors gracefully', () => {
      mockedFs.existsSync.mockImplementation(() => {
        throw new Error('File system error');
      });

      expect(() => layerValidator.validateStructure('/test/path')).toThrow('File system error');
    });
  });

  describe('edge cases', () => {
    it('should handle empty layer names', () => {
      const emptyLayer = { 
        name: '', 
        type: LayerType.Core, 
        dependencies: [], 
        path: '/empty', 
        exports: [], 
        version: '1.0.0' 
      };
      const coreLayer = { 
        name: 'core', 
        type: LayerType.Core, 
        dependencies: [], 
        path: '/core', 
        exports: [], 
        version: '1.0.0' 
      };

      const result = layerValidator.validateDependencies(emptyLayer, coreLayer);
      
      expect(result.from).toBe('');
      expect(result.to).toBe('core');
    });

    it('should handle very long paths', () => {
      const longPath = '/very/long/path/' + 'a'.repeat(1000);
      mockedFs.existsSync.mockReturnValue(true);

      const result = layerValidator.validateStructure(longPath);
      
      expect(result.valid).toBe(true);
    });

    it('should handle layers with many dependencies', () => {
      const layers = new Map();
      for (let i = 0; i < 100; i++) {
        layers.set(`layer${i}`, {
          name: `layer${i}`,
          type: LayerType.Themes,
          dependencies: [LayerType.Core],
          path: `/layer${i}`,
          exports: [],
          version: '1.0.0'
        });
      }

      const result = layerValidator.checkCircularDependencies(layers);
      
      expect(result.hasCircular).toBe(false);
    });
  });
});