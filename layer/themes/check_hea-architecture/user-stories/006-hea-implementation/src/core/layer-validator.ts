import { LayerType, LayerConfig, DependencyInfo, DependencyType } from '../interfaces/layer';
import { path } from '../../../../../infra_external-log-lib/src';
import { fs } from '../../../../../infra_external-log-lib/src';

export class LayerValidator {
  private layerHierarchy: Map<LayerType, number> = new Map([
    [LayerType.Core, 0],
    [LayerType.Shared, 1],
    [LayerType.Themes, 2],
    [LayerType.Infrastructure, 2],
  ]);

  /**
   * Validate layer dependencies according to HEA rules
   */
  validateDependencies(from: LayerConfig, to: LayerConfig): DependencyInfo {
    const fromLevel = this.layerHierarchy.get(from.type) ?? Infinity;
    const toLevel = this.layerHierarchy.get(to.type) ?? Infinity;

    // Core layer cannot depend on anything
    if (from.type === LayerType.Core && to.type !== LayerType.Core) {
      return {
        from: from.name,
        to: to.name,
        type: DependencyType.Import,
        valid: false,
        reason: 'Core layer cannot depend on other layers',
      };
    }

    // Shared can only depend on Core
    if (from.type === LayerType.Shared && to.type !== LayerType.Core && to.type !== LayerType.Shared) {
      return {
        from: from.name,
        to: to.name,
        type: DependencyType.Import,
        valid: false,
        reason: 'Shared layer can only depend on Core layer',
      };
    }

    // Themes and Infrastructure cannot depend on each other
    if (
      (from.type === LayerType.Themes && to.type === LayerType.Infrastructure) ||
      (from.type === LayerType.Infrastructure && to.type === LayerType.Themes)
    ) {
      return {
        from: from.name,
        to: to.name,
        type: DependencyType.Import,
        valid: false,
        reason: 'Themes and Infrastructure layers cannot depend on each other',
      };
    }

    // Check hierarchy - can only depend on lower layers
    if (fromLevel < toLevel) {
      return {
        from: from.name,
        to: to.name,
        type: DependencyType.Import,
        valid: false,
        reason: `${from.type} cannot depend on ${to.type} (violates hierarchy)`,
      };
    }

    return {
      from: from.name,
      to: to.name,
      type: DependencyType.Import,
      valid: true,
    };
  }

  /**
   * Validate layer structure
   */
  validateStructure(layerPath: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check required directories
    const requiredDirs = ['pipe'];
    for (const dir of requiredDirs) {
      const dirPath = path.join(layerPath, dir);
      if (!fs.existsSync(dirPath)) {
        errors.push(`Missing required directory: ${dir}`);
      }
    }

    // Check for index.ts
    const indexPath = path.join(layerPath, 'index.ts');
    if (!fs.existsSync(indexPath)) {
      errors.push('Missing index.ts file');
    }

    // Check pipe/index.ts
    const pipeIndexPath = path.join(layerPath, 'pipe', 'index.ts');
    if (!fs.existsSync(pipeIndexPath)) {
      errors.push('Missing pipe/index.ts file');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Check for circular dependencies
   */
  checkCircularDependencies(
    layers: Map<string, LayerConfig>
  ): { hasCircular: boolean; cycles: string[][] } {
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const dfs = (layerName: string, path: string[]): void => {
      visited.add(layerName);
      recursionStack.add(layerName);
      path.push(layerName);

      const layer = layers.get(layerName);
      if (layer) {
        for (const depType of layer.dependencies) {
          // Find layers of this type
          const dependentLayers = Array.from(layers.values()).filter(
            (l) => l.type === depType
          );

          for (const depLayer of dependentLayers) {
            if (!visited.has(depLayer.name)) {
              dfs(depLayer.name, [...path]);
            } else if (recursionStack.has(depLayer.name)) {
              // Found a cycle
              const cycleStart = path.indexOf(depLayer.name);
              cycles.push([...path.slice(cycleStart), depLayer.name]);
            }
          }
        }
      }

      recursionStack.delete(layerName);
    };

    // Check each layer
    for (const layerName of layers.keys()) {
      if (!visited.has(layerName)) {
        dfs(layerName, []);
      }
    }

    return {
      hasCircular: cycles.length > 0,
      cycles,
    };
  }

  /**
   * Validate import statement
   */
  validateImport(
    importPath: string,
    fromLayer: LayerConfig,
    layers: Map<string, LayerConfig>
  ): { valid: boolean; reason?: string } {
    // Determine target layer from import path
    let targetLayer: LayerConfig | undefined;

    if (importPath.startsWith('@core/')) {
      targetLayer = Array.from(layers.values()).find((l) => l.type === LayerType.Core);
    } else if (importPath.startsWith('@shared/')) {
      targetLayer = Array.from(layers.values()).find((l) => l.type === LayerType.Shared);
    } else if (importPath.startsWith('@themes/')) {
      const themeName = importPath.split('/')[1];
      targetLayer = layers.get(themeName);
    }

    if (!targetLayer) {
      return { valid: false, reason: 'Unknown import target' };
    }

    const validation = this.validateDependencies(fromLayer, targetLayer);
    return {
      valid: validation.valid,
      reason: validation.reason,
    };
  }
}