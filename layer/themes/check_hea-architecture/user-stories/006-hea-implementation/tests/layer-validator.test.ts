import { LayerValidator } from '../src/core/layer-validator';
import { LayerType, LayerConfig } from '../src/interfaces/layer';

describe('LayerValidator', () => {
  let validator: LayerValidator;

  beforeEach(() => {
    validator = new LayerValidator();
  });

  describe('validateDependencies', () => {
    it('should allow Core layer to depend on itself', () => {
      const coreLayer: LayerConfig = {
        name: 'core',
        type: LayerType.Core,
        path: '/layer/core',
        dependencies: [],
        exports: [],
        version: '1.0.0',
      };

      const result = validator.validateDependencies(coreLayer, coreLayer);
      expect(result.valid).toBe(true);
    });

    it('should prevent Core layer from depending on other layers', () => {
      const coreLayer: LayerConfig = {
        name: 'core',
        type: LayerType.Core,
        path: '/layer/core',
        dependencies: [],
        exports: [],
        version: '1.0.0',
      };

      const sharedLayer: LayerConfig = {
        name: 'shared',
        type: LayerType.Shared,
        path: '/layer/shared',
        dependencies: [],
        exports: [],
        version: '1.0.0',
      };

      const result = validator.validateDependencies(coreLayer, sharedLayer);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Core layer cannot depend on other layers');
    });

    it('should allow Shared layer to depend on Core', () => {
      const coreLayer: LayerConfig = {
        name: 'core',
        type: LayerType.Core,
        path: '/layer/core',
        dependencies: [],
        exports: [],
        version: '1.0.0',
      };

      const sharedLayer: LayerConfig = {
        name: 'shared',
        type: LayerType.Shared,
        path: '/layer/shared',
        dependencies: [LayerType.Core],
        exports: [],
        version: '1.0.0',
      };

      const result = validator.validateDependencies(sharedLayer, coreLayer);
      expect(result.valid).toBe(true);
    });

    it('should prevent Themes and Infrastructure from depending on each other', () => {
      const themesLayer: LayerConfig = {
        name: 'user-feature',
        type: LayerType.Themes,
        path: '/layer/themes/user-feature',
        dependencies: [],
        exports: [],
        version: '1.0.0',
      };

      const infraLayer: LayerConfig = {
        name: 'database',
        type: LayerType.Infrastructure,
        path: '/layer/infrastructure/database',
        dependencies: [],
        exports: [],
        version: '1.0.0',
      };

      const result1 = validator.validateDependencies(themesLayer, infraLayer);
      expect(result1.valid).toBe(false);
      expect(result1.reason).toContain('cannot depend on each other');

      const result2 = validator.validateDependencies(infraLayer, themesLayer);
      expect(result2.valid).toBe(false);
      expect(result2.reason).toContain('cannot depend on each other');
    });
  });

  describe('checkCircularDependencies', () => {
    it('should detect circular dependencies', () => {
      const layers = new Map<string, LayerConfig>([
        ['layer-a', {
          name: 'layer-a',
          type: LayerType.Themes,
          path: '/layer/themes/layer-a',
          dependencies: [LayerType.Themes], // Depends on other themes
          exports: [],
          version: '1.0.0',
        }],
        ['layer-b', {
          name: 'layer-b',
          type: LayerType.Themes,
          path: '/layer/themes/layer-b',
          dependencies: [LayerType.Themes], // Circular dependency
          exports: [],
          version: '1.0.0',
        }],
      ]);

      const result = validator.checkCircularDependencies(layers);
      expect(result.hasCircular).toBe(true);
      expect(result.cycles.length).toBeGreaterThan(0);
    });

    it('should not report false positives for valid dependencies', () => {
      const layers = new Map<string, LayerConfig>([
        ['core', {
          name: 'core',
          type: LayerType.Core,
          path: '/layer/core',
          dependencies: [],
          exports: [],
          version: '1.0.0',
        }],
        ['shared', {
          name: 'shared',
          type: LayerType.Shared,
          path: '/layer/shared',
          dependencies: [LayerType.Core],
          exports: [],
          version: '1.0.0',
        }],
        ['feature', {
          name: 'feature',
          type: LayerType.Themes,
          path: '/layer/themes/feature',
          dependencies: [LayerType.Core, LayerType.Shared],
          exports: [],
          version: '1.0.0',
        }],
      ]);

      const result = validator.checkCircularDependencies(layers);
      expect(result.hasCircular).toBe(false);
      expect(result.cycles.length).toBe(0);
    });
  });

  describe('validateImport', () => {
    it('should validate imports from allowed layers', () => {
      const layers = new Map<string, LayerConfig>([
        ['core', {
          name: 'core',
          type: LayerType.Core,
          path: '/layer/core',
          dependencies: [],
          exports: [],
          version: '1.0.0',
        }],
      ]);

      const sharedLayer: LayerConfig = {
        name: 'shared',
        type: LayerType.Shared,
        path: '/layer/shared',
        dependencies: [LayerType.Core],
        exports: [],
        version: '1.0.0',
      };

      const result = validator.validateImport('@core/utils', sharedLayer, layers);
      expect(result.valid).toBe(true);
    });

    it('should reject imports from forbidden layers', () => {
      const layers = new Map<string, LayerConfig>([
        ['shared', {
          name: 'shared',
          type: LayerType.Shared,
          path: '/layer/shared',
          dependencies: [],
          exports: [],
          version: '1.0.0',
        }],
      ]);

      const coreLayer: LayerConfig = {
        name: 'core',
        type: LayerType.Core,
        path: '/layer/core',
        dependencies: [],
        exports: [],
        version: '1.0.0',
      };

      const result = validator.validateImport('@shared/utils', coreLayer, layers);
      expect(result.valid).toBe(false);
    });
  });
});