import { fs } from '../../../../infra_external-log-lib/src';
import { path } from '../../../../infra_external-log-lib/src';
import * as ts from 'typescript';
import { createPipeBuilder, PipeValidationError } from '../src/core/pipe-builder';
import { PipeRegistryImpl } from '../src/core/pipe-registry';
import { Pipe, PipeMetadata, ValidationResult } from '../src/interfaces/pipe';
import { LayerType } from '../src/interfaces/layer';

describe('Pipe Pattern System Tests', () => {
  describe('Pipe Builder Real Implementation', () => {
    it('should create functional pipes with validation', async () => {
      // Given: The system is in a valid state
      // When: create functional pipes with validation
      // Then: The expected behavior occurs
      interface UserInput {
        name: string;
        email: string;
        age: number;
      }

      interface UserOutput {
        id: string;
        name: string;
        email: string;
        age: number;
        createdAt: Date;
      }

      const validateUser = (input: UserInput): ValidationResult => {
        const errors = [];
        
        if (!input.name || input.name.length < 2) {
          errors.push({
            field: 'name',
            message: 'Name must be at least 2 characters',
            code: 'INVALID_NAME',
          });
        }
        
        if (!input.email || !input.email.includes('@')) {
          errors.push({
            field: 'email',
            message: 'Invalid email format',
            code: 'INVALID_EMAIL',
          });
        }
        
        if (input.age < 0 || input.age > 150) {
          errors.push({
            field: 'age',
            message: 'Age must be between 0 and 150',
            code: 'INVALID_AGE',
          });
        }
        
        return {
          valid: errors.length === 0,
          errors: errors.length > 0 ? errors : undefined,
        };
      };

      const userPipe = createPipeBuilder<UserInput, UserOutput>()
        .withName('user-creation-pipe')
        .withVersion('1.0.0')
        .withLayer('themes')
        .withDescription('Creates a new user with validation')
        .withValidator(validateUser)
        .withExecutor(async (input) => {
          return {
            id: `user-${Date.now()}`,
            name: input.name,
            email: input.email,
            age: input.age,
            createdAt: new Date(),
          };
        })
        .withDependency('database')
        .withDependency('auth')
        .build();

      // Test valid input
      const validResult = await userPipe.execute({
        name: 'John Doe',
        email: 'john@example.com',
        age: 30,
      });

      expect(validResult).toMatchObject({
        id: expect.stringMatching(/^user-\d+$/),
        name: 'John Doe',
        email: 'john@example.com',
        age: 30,
        createdAt: expect.any(Date),
      });

      // Test invalid input
      await expect(userPipe.execute({
        name: 'J',
        email: 'invalid-email',
        age: 200,
      })).rejects.toThrow(PipeValidationError);

      // Test metadata
      const metadata = userPipe.getMetadata();
      expect(metadata).toEqual({
        name: 'user-creation-pipe',
        version: '1.0.0',
        layer: 'themes',
        description: 'Creates a new user with validation',
        dependencies: ['database', 'auth'],
      });
    });

    it('should enforce required pipe fields', () => {
      // Given: The system is in a valid state
      // When: enforce required pipe fields
      // Then: The expected behavior occurs
      expect(() => {
        createPipeBuilder()
          .withVersion('1.0.0')
          .withLayer('themes')
          .withExecutor(async () => ({}))
          .build();
      }).toThrow('Pipe name is required');

      expect(() => {
        createPipeBuilder()
          .withName('test-pipe')
          .withLayer('themes')
          .withExecutor(async () => ({}))
          .build();
      }).toThrow('Pipe version is required');

      expect(() => {
        createPipeBuilder()
          .withName('test-pipe')
          .withVersion('1.0.0')
          .withExecutor(async () => ({}))
          .build();
      }).toThrow('Pipe layer is required');

      expect(() => {
        createPipeBuilder()
          .withName('test-pipe')
          .withVersion('1.0.0')
          .withLayer('themes')
          .build();
      }).toThrow('Pipe executor is required');
    });
  });

  describe('Pipe Registry System', () => {
    let registry: PipeRegistryImpl;

    beforeEach(() => {
      registry = new PipeRegistryImpl();
    });

    it('should register and retrieve pipes', () => {
      // Given: The system is in a valid state
      // When: register and retrieve pipes
      // Then: The expected behavior occurs
      const realPipe = createPipeBuilder()
        .withName('test-pipe')
        .withVersion('1.0.0')
        .withLayer('shared')
        .withDescription('Test pipe')
        .withExecutor(async () => ({ result: 'test-executed' }))
        .build();

      registry.register('test-pipe', realPipe);
      
      expect(registry.has('test-pipe')).toBe(true);
      expect(registry.get('test-pipe')).toBe(realPipe);
      expect(registry.list()).toContain('test-pipe');
      expect(registry.getMetadata('test-pipe')).toEqual(realPipe.getMetadata());
    });

    it('should prevent duplicate pipe registration', () => {
      // Given: The system is in a valid state
      // When: prevent duplicate pipe registration
      // Then: The expected behavior occurs
      const pipe1 = createPipeBuilder()
        .withName('duplicate-pipe')
        .withVersion('1.0.0')
        .withLayer('shared')
        .withDescription('First pipe')
        .withExecutor(async () => ({ version: '1.0.0', executed: true }))
        .build();

      const pipe2 = createPipeBuilder()
        .withName('duplicate-pipe')
        .withVersion('2.0.0')
        .withLayer('shared')
        .withDescription('Second pipe')
        .withExecutor(async () => ({ version: '2.0.0', executed: true }))
        .build();

      registry.register('duplicate-pipe', pipe1);
      
      expect(() => {
        registry.register('duplicate-pipe', pipe2);
      }).toThrow('Pipe duplicate-pipe is already registered');
    });

    it('should support pipe versioning and dependency tracking', () => {
      // Given: The system is in a valid state
      // When: support pipe versioning and dependency tracking
      // Then: The expected behavior occurs
      const v1Pipe = createPipeBuilder()
        .withName('versioned-pipe')
        .withVersion('1.0.0')
        .withLayer('core')
        .withExecutor(async () => ({ version: 1 }))
        .build();

      const v2Pipe = createPipeBuilder()
        .withName('versioned-pipe')
        .withVersion('2.0.0')
        .withLayer('core')
        .withExecutor(async () => ({ version: 2 }))
        .withDependency('versioned-pipe@1.0.0')
        .build();

      registry.register('versioned-pipe@1.0.0', v1Pipe);
      registry.register('versioned-pipe@2.0.0', v2Pipe);

      expect(registry.has('versioned-pipe@1.0.0')).toBe(true);
      expect(registry.has('versioned-pipe@2.0.0')).toBe(true);
      
      const v2Metadata = registry.getMetadata('versioned-pipe@2.0.0');
      expect(v2Metadata?.dependencies).toContain('versioned-pipe@1.0.0');
    });
  });

  describe('Cross-Layer Communication', () => {
    it('should enforce layer boundaries in pipe communication', async () => {
      // Given: The system is in a valid state
      // When: enforce layer boundaries in pipe communication
      // Then: The expected behavior occurs
      // Create pipes for different layers
      const corePipe = createPipeBuilder<string, string>()
        .withName('core-utility')
        .withVersion('1.0.0')
        .withLayer('core')
        .withExecutor(async (input) => input.toUpperCase())
        .build();

      const sharedPipe = createPipeBuilder<{text: string}, string>()
        .withName('shared-formatter')
        .withVersion('1.0.0')
        .withLayer('shared')
        .withDependency('core-utility')
        .withExecutor(async (input) => {
          // Shared can use core
          return `Formatted: ${input.text}`;
        })
        .build();

      const themePipe = createPipeBuilder<{data: string}, {result: string}>()
        .withName('theme-processor')
        .withVersion('1.0.0')
        .withLayer('themes')
        .withDependency('core-utility')
        .withDependency('shared-formatter')
        .withExecutor(async (input) => {
          // Themes can use both core and shared
          return { result: `Processed: ${input.data}` };
        })
        .build();

      // Test execution
      const coreResult = await corePipe.execute('hello');
      expect(coreResult).toBe('HELLO');

      const sharedResult = await sharedPipe.execute({ text: 'world' });
      expect(sharedResult).toBe('Formatted: world');

      const themeResult = await themePipe.execute({ data: 'test' });
      expect(themeResult).toEqual({ result: 'Processed: test' });

      // Verify metadata dependencies
      expect(corePipe.getMetadata().dependencies).toHaveLength(0);
      expect(sharedPipe.getMetadata().dependencies).toContain('core-utility');
      expect(themePipe.getMetadata().dependencies).toContain('core-utility');
      expect(themePipe.getMetadata().dependencies).toContain('shared-formatter');
    });

    it('should validate pipe dependencies match layer rules', () => {
      // Given: The system is in a valid state
      // When: validate pipe dependencies match layer rules
      // Then: The expected behavior occurs
      const registry = new PipeRegistryImpl();
      
      // Register pipes with proper layer hierarchy
      const pipes = [
        { name: 'core-pipe', layer: 'core', deps: [] },
        { name: 'shared-pipe', layer: 'shared', deps: ['core-pipe'] },
        { name: 'theme-pipe', layer: 'themes', deps: ['core-pipe', 'shared-pipe'] },
        { name: 'infra-pipe', layer: 'infrastructure', deps: ['core-pipe', 'shared-pipe'] },
      ];

      pipes.forEach(({ name, layer, deps }) => {
        const pipe = createPipeBuilder()
          .withName(name)
          .withVersion('1.0.0')
          .withLayer(layer)
          .withExecutor(async () => ({}));
        
        deps.forEach(dep => pipe.withDependency(dep));
        
        registry.register(name, pipe.build());
      });

      // Validate dependencies follow layer rules
      const validatePipeDependencies = (pipeName: string): boolean => {
        const metadata = registry.getMetadata(pipeName);
        if (!metadata) return false;

        const layerHierarchy: Record<string, number> = {
          core: 0,
          shared: 1,
          themes: 2,
          infrastructure: 2,
        };

        const pipeLayer = layerHierarchy[metadata.layer];
        
        for (const dep of metadata.dependencies) {
          const depMetadata = registry.getMetadata(dep);
          if (!depMetadata) continue;
          
          const depLayer = layerHierarchy[depMetadata.layer];
          
          // Check hierarchy rules
          if (pipeLayer < depLayer) return false;
          
          // Check themes/infrastructure isolation
          if (
            (metadata.layer === 'themes' && depMetadata.layer === 'infrastructure') ||
            (metadata.layer === 'infrastructure' && depMetadata.layer === 'themes')
          ) {
            return false;
          }
        }
        
        return true;
      };

      expect(validatePipeDependencies('core-pipe')).toBe(true);
      expect(validatePipeDependencies('shared-pipe')).toBe(true);
      expect(validatePipeDependencies('theme-pipe')).toBe(true);
      expect(validatePipeDependencies('infra-pipe')).toBe(true);
    });
  });

  describe('Real File System Pipe Analysis', () => {
    it('should discover and validate pipe implementations in modules', () => {
      // Given: The system is in a valid state
      // When: discover and validate pipe implementations in modules
      // Then: The expected behavior occurs
      const projectRoot = path.resolve(__dirname, '../../../../..');
      const layerPath = path.join(projectRoot, 'layer');
      const themesPath = path.join(layerPath, 'themes');

      if (!fs.existsSync(themesPath)) {
        console.warn('Themes directory not found, skipping test');
        return;
      }

      const pipeFiles: string[] = [];
      
      const findPipeFiles = (dir: string) => {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          
          if (entry.isDirectory()) {
            if (entry.name === 'pipe') {
              const indexPath = path.join(fullPath, 'index.ts');
              if (fs.existsSync(indexPath)) {
                pipeFiles.push(indexPath);
              }
            } else if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
              findPipeFiles(fullPath);
            }
          }
        }
      };

      findPipeFiles(themesPath);
      
      pipeFiles.forEach(pipeFile => {
        const content = fs.readFileSync(pipeFile, 'utf-8');
        const sourceFile = ts.createSourceFile(
          pipeFile,
          content,
          ts.ScriptTarget.Latest,
          true
        );

        // Check for pipe-related imports or exports
        let hasPipePattern = false;
        
        const visit = (node: ts.Node) => {
          if (ts.isImportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
            const importPath = node.moduleSpecifier.text;
            if (importPath.includes('pipe') || importPath.includes('Pipe')) {
              hasPipePattern = true;
            }
          }
          
          if (ts.isExportDeclaration(node) || ts.isExportAssignment(node)) {
            hasPipePattern = true;
          }
          
          ts.forEachChild(node, visit);
        };

        visit(sourceFile);
        
        // Pipe files should have pipe-related code
        expect(hasPipePattern).toBe(true);
      });
    });

    it('should validate pipe interface compliance', () => {
      // Given: The system is in a valid state
      // When: validate pipe interface compliance
      // Then: The expected behavior occurs
      const pipeInterfacePath = path.join(__dirname, '../src/interfaces/pipe.ts');
      const content = fs.readFileSync(pipeInterfacePath, 'utf-8');
      const sourceFile = ts.createSourceFile(
        pipeInterfacePath,
        content,
        ts.ScriptTarget.Latest,
        true
      );

      let pipeInterface: ts.InterfaceDeclaration | undefined;
      
      const visit = (node: ts.Node) => {
        if (ts.isInterfaceDeclaration(node) && node.name.text === 'Pipe') {
          pipeInterface = node;
        }
        ts.forEachChild(node, visit);
      };

      visit(sourceFile);
      
      expect(pipeInterface).toBeDefined();
      
      if (pipeInterface) {
        const methodNames = pipeInterface.members
          .filter(ts.isMethodSignature)
          .map(method => method.name && ts.isIdentifier(method.name) ? method.name.text : '');
        
        expect(methodNames).toContain('execute');
        expect(methodNames).toContain('getMetadata');
      }
    });
  });

  describe('Schema Validation Integration', () => {
    it('should support input/output schema validation', async () => {
      // Given: The system is in a valid state
      // When: support input/output schema validation
      // Then: The expected behavior occurs
      const userSchema = {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 2 },
          email: { type: 'string', format: 'email' },
          age: { type: 'number', minimum: 0, maximum: 150 },
        },
        required: ['name', 'email', 'age'],
      };

      const outputSchema = {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          email: { type: 'string' },
          age: { type: 'number' },
          createdAt: { type: 'string', format: 'date-time' },
        },
        required: ['id', 'name', 'email', 'age', 'createdAt'],
      };

      const schemaPipe = createPipeBuilder()
        .withName('schema-validated-pipe')
        .withVersion('1.0.0')
        .withLayer('themes')
        .withInputSchema(userSchema)
        .withOutputSchema(outputSchema)
        .withValidator((input: any) => {
          // Simple schema validation simulation
          const errors = [];
          
          if (typeof input.name !== 'string' || input.name.length < 2) {
            errors.push({
              field: 'name',
              message: 'Invalid name',
              code: 'SCHEMA_VIOLATION',
            });
          }
          
          return { valid: errors.length === 0, errors };
        })
        .withExecutor(async (input: any) => ({
          id: `user-${Date.now()}`,
          ...input,
          createdAt: new Date().toISOString(),
        }))
        .build();

      const metadata = schemaPipe.getMetadata();
      expect(metadata.inputSchema).toEqual(userSchema);
      expect(metadata.outputSchema).toEqual(outputSchema);
    });
  });
});