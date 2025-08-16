import { fs } from '../../../../infra_external-log-lib/src';
import { path } from '../../../../infra_external-log-lib/src';
import * as ts from 'typescript';
import { DependencyGraph } from '../src/utils/dependency-graph-advanced';
import { ModuleAnalyzer } from '../src/utils/module-analyzer';
import { LayerValidator } from '../src/core/layer-validator';
import { LayerType, LayerConfig, DependencyInfo } from '../src/interfaces/layer';

describe('Dependency Graph System Tests', () => {
  const projectRoot = path.resolve(__dirname, '../../../../..');
  
  describe('Real Project Dependency Analysis', () => {
    it('should build In Progress dependency graph from actual project', () => {
      // Given: The system is in a valid state
      // When: build In Progress dependency graph from actual project
      // Then: The expected behavior occurs
      const layerPath = path.join(projectRoot, 'layer');
      const graph = new DependencyGraph();
      const analyzer = new ModuleAnalyzer();
      
      if (!fs.existsSync(layerPath)) {
        console.warn('Layer directory not found, skipping test');
        return;
      }

      // Discover all modules in the project
      const discoverModules = (dir: string, layerType: string): void => {
        if (!fs.existsSync(dir)) return;
        
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          if (!entry.isDirectory()) continue;
          
          const fullPath = path.join(dir, entry.name);
          const userStoriesPath = path.join(fullPath, 'user-stories');
          
          if (fs.existsSync(userStoriesPath)) {
            const stories = fs.readdirSync(userStoriesPath, { withFileTypes: true })
              .filter(e => e.isDirectory());
            
            stories.forEach(story => {
              const storyPath = path.join(userStoriesPath, story.name);
              const srcPath = path.join(storyPath, 'src');
              
              if (fs.existsSync(srcPath)) {
                const moduleInfo = analyzer.analyzeModule(storyPath);
                graph.addNode(`${layerType}/${entry.name}/${story.name}`, {
                  layer: layerType,
                  module: moduleInfo,
                });
                
                // Analyze imports to build edges
                moduleInfo.imports.forEach(imp => {
                  if (imp.startsWith('@')) {
                    const [, targetLayer, ...pathParts] = imp.split('/');
                    const targetNode = `${targetLayer}/${pathParts.join('/')}`;
                    graph.addEdge(
                      `${layerType}/${entry.name}/${story.name}`,
                      targetNode
                    );
                  }
                });
              }
            });
          }
        }
      };

      // Discover modules in each layer
      ['core', 'shared', 'themes', 'infrastructure'].forEach(layerType => {
        discoverModules(path.join(layerPath, layerType), layerType);
      });

      // Validate the graph has nodes
      const nodes = graph.getNodes();
      expect(nodes.length).toBeGreaterThan(0);
      
      // Check for cycles
      const cycles = graph.findCycles();
      expect(cycles).toHaveLength(0);
      
      // Get topological order
      const sorted = graph.topologicalSort();
      expect(sorted).toBeDefined();
      
      if (sorted) {
        // Core modules should come first
        const coreModules = sorted.filter(node => node.startsWith('core/'));
        const firstNonCoreIndex = sorted.findIndex(node => !node.startsWith('core/'));
        
        if (coreModules.length > 0 && firstNonCoreIndex !== -1) {
          const lastCoreIndex = sorted.lastIndexOf(sorted.filter(n => n.startsWith('core/'))[coreModules.length - 1]);
          expect(lastCoreIndex).toBeLessThan(firstNonCoreIndex);
        }
      }
    });

    it('should detect and visualize dependency paths', () => {
      // Given: The system is in a valid state
      // When: detect and visualize dependency paths
      // Then: The expected behavior occurs
      const graph = new DependencyGraph();
      
      // Build a sample dependency graph
      const modules = [
        { id: 'core/utils', layer: 'core', deps: [] },
        { id: 'core/types', layer: 'core', deps: [] },
        { id: 'shared/auth', layer: 'shared', deps: ['core/utils', 'core/types'] },
        { id: 'shared/logger', layer: 'shared', deps: ['core/utils'] },
        { id: 'themes/user-mgmt', layer: 'themes', deps: ['shared/auth', 'core/types'] },
        { id: 'themes/products', layer: 'themes', deps: ['shared/logger', 'core/utils'] },
        { id: 'infra/database', layer: 'infrastructure', deps: ['core/types', 'shared/logger'] },
      ];
      
      // Add nodes and edges
      modules.forEach(module => {
        graph.addNode(module.id, { layer: module.layer });
        module.deps.forEach(dep => {
          graph.addEdge(module.id, dep);
        });
      });
      
      // Find all paths from themes to core
      const paths = graph.findAllPaths('themes/user-mgmt', 'core/utils');
      expect(paths.length).toBeGreaterThan(0);
      
      // Verify paths go through allowed layers
      paths.forEach(path => {
        for (let i = 0; i < path.length - 1; i++) {
          const from = path[i];
          const to = path[i + 1];
          
          const fromLayer = from.split('/')[0];
          const toLayer = to.split('/')[0];
          
          // Validate layer transitions
          if (fromLayer === 'themes') {
            expect(['themes', 'shared', 'core']).toContain(toLayer);
          } else if (fromLayer === 'shared') {
            expect(['shared', 'core']).toContain(toLayer);
          } else if (fromLayer === 'core') {
            expect(toLayer).toBe('core');
          }
        }
      });
    });

    it('should calculate module impact analysis', () => {
      // Given: The system is in a valid state
      // When: calculate module impact analysis
      // Then: The expected behavior occurs
      const graph = new DependencyGraph();
      
      // Build dependency graph
      const dependencies = [
        ['app/main', 'themes/user-feature'],
        ['themes/user-feature', 'shared/auth'],
        ['themes/user-feature', 'shared/validation'],
        ['themes/admin-feature', 'shared/auth'],
        ['shared/auth', 'core/crypto'],
        ['shared/validation', 'core/types'],
        ['infra/email', 'shared/auth'],
      ];
      
      dependencies.forEach(([from, to]) => {
        graph.addNode(from);
        graph.addNode(to);
        graph.addEdge(from, to);
      });
      
      // Calculate impact of changing core/crypto
      const impactedModules = graph.getImpactedModules('core/crypto');
      
      expect(impactedModules).toContain('shared/auth');
      expect(impactedModules).toContain('themes/user-feature');
      expect(impactedModules).toContain('themes/admin-feature');
      expect(impactedModules).toContain('infra/email');
      expect(impactedModules).toContain('app/main');
      
      // Core modules should have high impact
      const coreImpact = graph.getImpactedModules('core/types');
      const sharedImpact = graph.getImpactedModules('shared/validation');
      
      expect(coreImpact.length).toBeGreaterThanOrEqual(sharedImpact.length);
    });
  });

  describe('Import Resolution Analysis', () => {
    it('should trace import chains through real files', () => {
      // Given: The system is in a valid state
      // When: trace import chains through real files
      // Then: The expected behavior occurs
      const srcPath = path.join(__dirname, '../src');
      const importChains: Map<string, string[]> = new Map();
      
      const analyzeImportChain = (filePath: string, chain: string[] = []): void => {
        if (chain.includes(filePath)) return; // Prevent cycles
        
        const newChain = [...chain, filePath];
        const content = fs.readFileSync(filePath, 'utf-8');
        const sourceFile = ts.createSourceFile(
          filePath,
          content,
          ts.ScriptTarget.Latest,
          true
        );
        
        const imports: string[] = [];
        
        const visit = (node: ts.Node) => {
          if (ts.isImportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
            const importPath = node.moduleSpecifier.text;
            if (importPath.startsWith('.')) {
              const resolvedPath = path.resolve(path.dirname(filePath), importPath);
              const withExtension = resolvedPath.endsWith('.ts') ? resolvedPath : `${resolvedPath}.ts`;
              
              if (fs.existsSync(withExtension)) {
                imports.push(withExtension);
                analyzeImportChain(withExtension, newChain);
              }
            }
          }
          ts.forEachChild(node, visit);
        };
        
        visit(sourceFile);
        importChains.set(filePath, imports);
      };
      
      // Start from index.ts
      const indexPath = path.join(srcPath, 'index.ts');
      if (fs.existsSync(indexPath)) {
        analyzeImportChain(indexPath);
        
        // Verify no circular imports
        for (const [file, imports] of importChains.entries()) {
          imports.forEach(imp => {
            const impImports = importChains.get(imp) || [];
            expect(impImports).not.toContain(file);
          });
        }
      }
    });

    it('should validate layer boundaries in import statements', () => {
      // Given: The system is in a valid state
      // When: validate layer boundaries in import statements
      // Then: The expected behavior occurs
      const validator = new LayerValidator();
      const violations: string[] = [];
      
      // Mock layer configuration based on file paths
      const getLayerFromPath = (filePath: string): LayerType | null => {
        if (filePath.includes('/core/')) return LayerType.Core;
        if (filePath.includes('/shared/')) return LayerType.Shared;
        if (filePath.includes('/themes/')) return LayerType.Themes;
        if (filePath.includes('/infrastructure/')) return LayerType.Infrastructure;
        return null;
      };
      
      const validateFileImports = (filePath: string): void => {
        const fromLayer = getLayerFromPath(filePath);
        if (!fromLayer) return;
        
        const content = fs.readFileSync(filePath, 'utf-8');
        const sourceFile = ts.createSourceFile(
          filePath,
          content,
          ts.ScriptTarget.Latest,
          true
        );
        
        const visit = (node: ts.Node) => {
          if (ts.isImportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
            const importPath = node.moduleSpecifier.text;
            
            // Check for layer imports (e.g., @core/, @shared/)
            const layerMatch = importPath.match(/^@(core|shared|themes|infrastructure)\//);
            if (layerMatch) {
              const toLayer = layerMatch[1] as keyof typeof LayerType;
              
              const fromConfig: LayerConfig = {
                name: path.basename(filePath),
                type: fromLayer,
                path: filePath,
                dependencies: [],
                exports: [],
                version: '1.0.0',
              };
              
              const toConfig: LayerConfig = {
                name: 'imported-module',
                type: LayerType[toLayer.charAt(0).toUpperCase() + toLayer.slice(1) as keyof typeof LayerType],
                path: importPath,
                dependencies: [],
                exports: [],
                version: '1.0.0',
              };
              
              const validation = validator.validateDependencies(fromConfig, toConfig);
              if (!validation.valid) {
                violations.push(`${filePath}: ${validation.reason}`);
              }
            }
          }
          ts.forEachChild(node, visit);
        };
        
        visit(sourceFile);
      };
      
      // Validate all TypeScript files in src
      const srcPath = path.join(__dirname, '../src');
      const walkDir = (dir: string): void => {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          
          if (entry.isDirectory() && !entry.name.startsWith('.')) {
            walkDir(fullPath);
          } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')) {
            validateFileImports(fullPath);
          }
        }
      };
      
      if (fs.existsSync(srcPath)) {
        walkDir(srcPath);
        
        // Should have no violations
        expect(violations).toHaveLength(0);
      }
    });
  });

  describe('Dependency Metrics', () => {
    it('should calculate coupling and cohesion metrics', () => {
      // Given: The system is in a valid state
      // When: calculate coupling and cohesion metrics
      // Then: The expected behavior occurs
      const graph = new DependencyGraph();
      
      // Build a sample module structure
      const layers = {
        core: ['utils', 'types', 'errors'],
        shared: ['auth', 'logger', 'cache'],
        themes: ['users', 'products', 'orders'],
        infrastructure: ['database', 'redis', 'email'],
      };
      
      // Add nodes
      Object.entries(layers).forEach(([layer, modules]) => {
        modules.forEach(module => {
          graph.addNode(`${layer}/${module}`, { layer });
        });
      });
      
      // Add dependencies (following HEA rules)
      const dependencies = [
        // Shared depends on Core
        ['shared/auth', 'core/utils'],
        ['shared/auth', 'core/types'],
        ['shared/logger', 'core/utils'],
        ['shared/cache', 'core/types'],
        
        // Themes depend on Core and Shared
        ['themes/users', 'shared/auth'],
        ['themes/users', 'core/types'],
        ['themes/products', 'shared/cache'],
        ['themes/products', 'core/types'],
        ['themes/orders', 'shared/auth'],
        ['themes/orders', 'themes/products'],
        
        // Infrastructure depends on Core and Shared
        ['infrastructure/database', 'core/types'],
        ['infrastructure/redis', 'shared/cache'],
        ['infrastructure/email', 'shared/logger'],
      ];
      
      dependencies.forEach(([from, to]) => {
        graph.addEdge(from, to);
      });
      
      // Calculate metrics
      const metrics = graph.calculateMetrics();
      
      // Core modules should have high fan-out (many modules depend on them)
      expect(metrics.fanOut.get('core/types')).toBeGreaterThan(3);
      expect(metrics.fanOut.get('core/utils')).toBeGreaterThan(1);
      
      // Theme modules should have lower fan-out
      expect(metrics.fanOut.get('themes/users') || 0).toBeLessThanOrEqual(1);
      
      // Calculate layer cohesion
      const layerCohesion = graph.calculateLayerCohesion();
      
      // Core should have high cohesion (tightly integrated)
      expect(layerCohesion.get('core')).toBeGreaterThan(0);
      
      // Infrastructure should have lower cohesion (more independent)
      expect(layerCohesion.get('infrastructure')).toBeLessThanOrEqual(
        layerCohesion.get('core') || 0
      );
    });

    it('should identify architectural hotspots', () => {
      // Given: The system is in a valid state
      // When: identify architectural hotspots
      // Then: The expected behavior occurs
      const graph = new DependencyGraph();
      
      // Create a complex dependency structure
      const modules = [
        // Core hotspot - many depend on it
        { id: 'core/config', deps: [] },
        
        // Everything depends on config
        { id: 'core/utils', deps: ['core/config'] },
        { id: 'shared/auth', deps: ['core/config', 'core/utils'] },
        { id: 'shared/logger', deps: ['core/config'] },
        { id: 'themes/feature1', deps: ['core/config', 'shared/auth'] },
        { id: 'themes/feature2', deps: ['core/config', 'shared/logger'] },
        { id: 'infra/db', deps: ['core/config'] },
      ];
      
      modules.forEach(({ id, deps }) => {
        graph.addNode(id);
        deps.forEach(dep => {
          graph.addNode(dep);
          graph.addEdge(id, dep);
        });
      });
      
      // Identify hotspots
      const hotspots = graph.identifyHotspots(2); // Modules with 2+ dependents
      
      expect(hotspots).toContain('core/config');
      expect(hotspots.length).toBeGreaterThanOrEqual(1);
      
      // Config should be the biggest hotspot
      const impactScores = new Map<string, number>();
      graph.getNodes().forEach(node => {
        const impacted = graph.getImpactedModules(node);
        impactScores.set(node, impacted.length);
      });
      
      const configScore = impactScores.get('core/config') || 0;
      const maxScore = Math.max(...Array.from(impactScores.values()));
      
      expect(configScore).toBe(maxScore);
    });
  });
});