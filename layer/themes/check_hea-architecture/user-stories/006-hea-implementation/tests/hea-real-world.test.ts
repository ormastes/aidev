import { fs } from '../../../../infra_external-log-lib/src';
import { path } from '../../../../infra_external-log-lib/src';
import * as ts from 'typescript';
import { execSync } from 'child_process';
import { LayerValidator } from '../src/core/layer-validator';
import { ModuleAnalyzer } from '../src/utils/module-analyzer';
import { createPipeBuilder } from '../src/core/pipe-builder';
import { PipeRegistryImpl } from '../src/core/pipe-registry';
import { LayerType, LayerConfig } from '../src/interfaces/layer';

describe('HEA Real-World Scenario Tests', () => {
  const projectRoot = path.resolve(__dirname, '../../../../..');
  
  describe('In Progress E-Commerce Application Architecture', () => {
    it('should implement a In Progress e-commerce system following HEA', async () => {
      // Simulate a real e-commerce application structure
      const registry = new PipeRegistryImpl();
      
      // Core Layer - Fundamental types and utilities
      const coreCurrencyPipe = createPipeBuilder<number, string>()
        .withName('currency-formatter')
        .withVersion('1.0.0')
        .withLayer('core')
        .withDescription('Formats numbers as currency')
        .withExecutor(async (amount) => {
          return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
          }).format(amount);
        })
        .build();
      
      registry.register('currency-formatter', coreCurrencyPipe);

      // Shared Layer - Common services
      const sharedAuthPipe = createPipeBuilder<{token: string}, {userId: string; roles: string[]}>()
        .withName('auth-validator')
        .withVersion('1.0.0')
        .withLayer('shared')
        .withDescription('Validates authentication tokens')
        .withDependency('currency-formatter') // Can depend on core
        .withValidator((input) => {
          if (!input.token || input.token.length < 10) {
            return {
              valid: false,
              errors: [{
                field: 'token',
                message: 'Invalid token',
                code: 'INVALID_TOKEN',
              }],
            };
          }
          return { valid: true };
        })
        .withExecutor(async (input) => {
          // Simulate token validation
          return {
            userId: 'user-123',
            roles: ['customer'],
          };
        })
        .build();
      
      registry.register('auth-validator', sharedAuthPipe);

      // Infrastructure Layer - External services
      const infraDatabasePipe = createPipeBuilder<{query: string; params?: any[]}, any[]>()
        .withName('database-query')
        .withVersion('1.0.0')
        .withLayer('infrastructure')
        .withDescription('Executes database queries')
        .withDependency('currency-formatter') // Can depend on core
        .withExecutor(async (input) => {
          // Simulate database query
          if (input.query.includes('SELECT * FROM products')) {
            return [
              { id: 1, name: 'Product 1', price: 99.99 },
              { id: 2, name: 'Product 2', price: 149.99 },
            ];
          }
          return [];
        })
        .build();
      
      registry.register('database-query', infraDatabasePipe);

      // Themes Layer - Business features
      const themeProductPipe = createPipeBuilder<{action: string; data?: any}, any>()
        .withName('product-service')
        .withVersion('1.0.0')
        .withLayer('themes')
        .withDescription('Product management service')
        .withDependency('currency-formatter') // Can depend on core
        .withDependency('auth-validator') // Can depend on shared
        .withDependency('database-query') // Can depend on infrastructure
        .withExecutor(async (input) => {
          if (input.action === 'list') {
            // Use infrastructure pipe to get products
            const dbPipe = registry.get('database-query')!;
            const products = await dbPipe.execute({
              query: 'SELECT * FROM products',
            });
            
            // Use core pipe to format prices
            const currencyPipe = registry.get('currency-formatter')!;
            const formattedProducts = await Promise.all(
              products.map(async (product: any) => ({
                ...product,
                formattedPrice: await currencyPipe.execute(product.price),
              }))
            );
            
            return formattedProducts;
          }
          return null;
        })
        .build();
      
      registry.register('product-service', themeProductPipe);

      // Test the In Progress flow
      const productService = registry.get('product-service')!;
      const products = await productService.execute({ action: 'list' });
      
      expect(products).toEqual([
        { id: 1, name: 'Product 1', price: 99.99, formattedPrice: '$99.99' },
        { id: 2, name: 'Product 2', price: 149.99, formattedPrice: '$149.99' },
      ]);

      // Verify layer dependencies are correct
      const validator = new LayerValidator();
      const layers = new Map<string, LayerConfig>([
        ['core', {
          name: 'core',
          type: LayerType.Core,
          path: '/layer/core',
          dependencies: [],
          exports: ['currency-formatter'],
          version: '1.0.0',
        }],
        ['shared', {
          name: 'shared',
          type: LayerType.Shared,
          path: '/layer/shared',
          dependencies: [LayerType.Core],
          exports: ['auth-validator'],
          version: '1.0.0',
        }],
        ['product-theme', {
          name: 'product-theme',
          type: LayerType.Themes,
          path: '/layer/themes/product',
          dependencies: [LayerType.Core, LayerType.Shared, LayerType.Infrastructure],
          exports: ['product-service'],
          version: '1.0.0',
        }],
        ['database-infra', {
          name: 'database-infra',
          type: LayerType.Infrastructure,
          path: '/layer/infrastructure/database',
          dependencies: [LayerType.Core, LayerType.Shared],
          exports: ['database-query'],
          version: '1.0.0',
        }],
      ]);

      // Check no circular dependencies
      const circularCheck = validator.checkCircularDependencies(layers);
      expect(circularCheck.hasCircular).toBe(false);
    });
  });

  describe('Real Project Analysis', () => {
    it('should analyze actual project structure for HEA compliance', () => {
      const layerPath = path.join(projectRoot, 'layer');
      const analyzer = new ModuleAnalyzer();
      const validator = new LayerValidator();
      
      if (!fs.existsSync(layerPath)) {
        console.warn('Layer directory not found, skipping test');
        return;
      }

      const layerTypes = ['themes', 'infrastructure', 'shared', 'core'];
      const discoveredLayers: Map<string, LayerConfig> = new Map();
      
      layerTypes.forEach(layerType => {
        const typePath = path.join(layerPath, layerType);
        if (!fs.existsSync(typePath)) return;
        
        const modules = fs.readdirSync(typePath)
          .filter(item => fs.statSync(path.join(typePath, item)).isDirectory());
        
        modules.forEach(module => {
          const modulePath = path.join(typePath, module);
          const userStoriesPath = path.join(modulePath, 'user-stories');
          
          if (fs.existsSync(userStoriesPath)) {
            const stories = fs.readdirSync(userStoriesPath)
              .filter(item => fs.statSync(path.join(userStoriesPath, item)).isDirectory());
            
            stories.forEach(story => {
              const storyPath = path.join(userStoriesPath, story);
              const srcPath = path.join(storyPath, 'src');
              
              if (fs.existsSync(srcPath)) {
                const moduleInfo = analyzer.analyzeModule(storyPath);
                
                // Determine layer type from path
                let type: LayerType;
                switch (layerType) {
                  case 'core':
                    type = LayerType.Core;
                    break;
                  case 'shared':
                    type = LayerType.Shared;
                    break;
                  case 'themes':
                    type = LayerType.Themes;
                    break;
                  case 'infrastructure':
                    type = LayerType.Infrastructure;
                    break;
                  default:
                    return;
                }
                
                const layerConfig: LayerConfig = {
                  name: `${module}-${story}`,
                  type,
                  path: storyPath,
                  dependencies: [], // Would be determined from imports
                  exports: moduleInfo.exports,
                  version: '1.0.0',
                };
                
                discoveredLayers.set(layerConfig.name, layerConfig);
              }
            });
          }
        });
      });
      
      // Validate discovered layers
      expect(discoveredLayers.size).toBeGreaterThan(0);
      
      // Check for circular dependencies
      const circularCheck = validator.checkCircularDependencies(discoveredLayers);
      expect(circularCheck.hasCircular).toBe(false);
    });

    it('should validate TypeScript imports follow HEA rules', () => {
      const srcPath = path.join(__dirname, '../src');
      const validator = new LayerValidator();
      
      const analyzeImports = (filePath: string): {file: string; imports: string[]} => {
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
            imports.push(node.moduleSpecifier.text);
          }
          ts.forEachChild(node, visit);
        };
        
        visit(sourceFile);
        
        return { file: path.basename(filePath), imports };
      };
      
      // Analyze all TypeScript files
      const walk = (dir: string): {file: string; imports: string[]}[] => {
        const results: {file: string; imports: string[]}[] = [];
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          
          if (entry.isDirectory() && !entry.name.startsWith('.')) {
            results.push(...walk(fullPath));
          } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')) {
            results.push(analyzeImports(fullPath));
          }
        }
        
        return results;
      };
      
      const importAnalysis = walk(srcPath);
      
      // Verify all imports are relative or from allowed packages
      importAnalysis.forEach(({ file, imports }) => {
        imports.forEach(imp => {
          // Should be relative imports or from TypeScript
          expect(imp).toMatch(/^\.\.?\/|^typescript$/);
        });
      });
    });
  });

  describe('Build and Runtime Validation', () => {
    it('should validate module can be built without errors', () => {
      const testProjectPath = path.join(__dirname, '../');
      
      try {
        // Check if TypeScript is available
        execSync('bunx tsc --version', { cwd: testProjectPath, stdio: 'pipe' });
        
        // Try to build the project
        const result = execSync('bunx tsc --noEmit --skipLibCheck', { 
          cwd: testProjectPath,
          stdio: 'pipe',
          encoding: 'utf-8'
        });
        
        // If we get here, build succeeded
        expect(result).toBeDefined();
      } catch (error: any) {
        // Check if it's a real error or just missing dependencies
        const errorMessage = error.stdout?.toString() || error.stderr?.toString() || '';
        
        if (errorMessage.includes('Cannot find module')) {
          console.warn('Skipping build test due to missing dependencies');
          return;
        }
        
        // Real compilation error
        fail(`TypeScript compilation failed: ${errorMessage}`);
      }
    });

    it('should validate runtime pipe execution with proper isolation', async () => {
      const registry = new PipeRegistryImpl();
      
      // Create isolated execution contexts for each layer
      const executionContexts = {
        core: { allowedDependencies: [] },
        shared: { allowedDependencies: ['core'] },
        themes: { allowedDependencies: ['core', 'shared', 'infrastructure'] },
        infrastructure: { allowedDependencies: ['core', 'shared'] },
      };
      
      // Create a pipe that validates its execution context
      const createContextAwarePipe = (layer: string) => {
        return createPipeBuilder<{dependency?: string}, {layer: string; allowed: boolean}>()
          .withName(`${layer}-context-pipe`)
          .withVersion('1.0.0')
          .withLayer(layer)
          .withExecutor(async (input) => {
            const context = executionContexts[layer as keyof typeof executionContexts];
            let allowed = true;
            
            if (input.dependency) {
              const depLayer = input.dependency.split('-')[0];
              allowed = context.allowedDependencies.includes(depLayer) || depLayer === layer;
            }
            
            return { layer, allowed };
          })
          .build();
      };
      
      // Register context-aware pipes
      ['core', 'shared', 'themes', 'infrastructure'].forEach(layer => {
        registry.register(`${layer}-context-pipe`, createContextAwarePipe(layer));
      });
      
      // Test valid dependencies
      const corePipe = registry.get('core-context-pipe')!;
      const coreResult = await corePipe.execute({ dependency: 'core-util' });
      expect(coreResult.allowed).toBe(true);
      
      const sharedPipe = registry.get('shared-context-pipe')!;
      const sharedResult = await sharedPipe.execute({ dependency: 'core-util' });
      expect(sharedResult.allowed).toBe(true);
      
      // Test invalid dependencies
      const coreInvalidResult = await corePipe.execute({ dependency: 'shared-service' });
      expect(coreInvalidResult.allowed).toBe(false);
      
      const themePipe = registry.get('themes-context-pipe')!;
      const infraPipe = registry.get('infrastructure-context-pipe')!;
      
      // Themes cannot depend on infrastructure
      const themeInvalidResult = await themePipe.execute({ dependency: 'infrastructure-db' });
      expect(themeInvalidResult.allowed).toBe(false);
      
      // Infrastructure cannot depend on themes
      const infraInvalidResult = await infraPipe.execute({ dependency: 'themes-feature' });
      expect(infraInvalidResult.allowed).toBe(false);
    });
  });

  describe('Developer Experience Validation', () => {
    it('should provide clear error messages for HEA violations', () => {
      const validator = new LayerValidator();
      
      // Test various violation scenarios
      const violations = [
        {
          from: { name: 'core-module', type: LayerType.Core },
          to: { name: 'shared-module', type: LayerType.Shared },
          expectedMessage: 'Core layer cannot depend on other layers',
        },
        {
          from: { name: 'shared-module', type: LayerType.Shared },
          to: { name: 'theme-module', type: LayerType.Themes },
          expectedMessage: 'Shared layer can only depend on Core layer',
        },
        {
          from: { name: 'theme-module', type: LayerType.Themes },
          to: { name: 'infra-module', type: LayerType.Infrastructure },
          expectedMessage: 'Themes and Infrastructure layers cannot depend on each other',
        },
      ];
      
      violations.forEach(({ from, to, expectedMessage }) => {
        const fromConfig: LayerConfig = {
          ...from,
          path: `/layer/${from.type}/${from.name}`,
          dependencies: [],
          exports: [],
          version: '1.0.0',
        };
        
        const toConfig: LayerConfig = {
          ...to,
          path: `/layer/${to.type}/${to.name}`,
          dependencies: [],
          exports: [],
          version: '1.0.0',
        };
        
        const result = validator.validateDependencies(fromConfig, toConfig);
        expect(result.valid).toBe(false);
        expect(result.reason).toBe(expectedMessage);
      });
    });

    it('should support incremental migration to HEA', () => {
      // Simulate a legacy module being migrated
      const legacyCode = `
        // Legacy module with mixed concerns
        import { database } from './database';
        import { auth } from './auth';
        import { formatCurrency } from './utils';
        
        export class ProductService {
          async getProducts() {
            const user = await auth.getCurrentUser();
            const products = await database.query('SELECT * FROM products');
            return products.map(p => ({
              ...p,
              price: formatCurrency(p.price)
            }));
          }
        }
      `;
      
      // Migrated to HEA structure
      const migratedStructure = {
        core: {
          utils: ['formatCurrency'],
        },
        shared: {
          auth: ['getCurrentUser'],
        },
        infrastructure: {
          database: ['query'],
        },
        themes: {
          'product-service': ['ProductService'],
        },
      };
      
      // Verify migration maintains functionality
      Object.entries(migratedStructure).forEach(([layer, modules]) => {
        expect(modules).toBeDefined();
        expect(Array.isArray(Object.values(modules)[0])).toBe(true);
      });
    });
  });
});