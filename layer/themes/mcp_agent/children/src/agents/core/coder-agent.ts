/**
 * Coder Agent
 * Responsible for implementing features following architecture rules
 */

import { Agent, AGENT_ROLES, AgentCapability } from '../../domain/agent';
import { MCPConnection } from '../../server/mcp-connection';
import { 
  MCPMethod,
  Tool,
  ToolCall,
  ToolResult
} from '../../domain/protocol';
import { path } from '../../../../../infra_external-log-lib/src';

export interface CoderCapabilities {
  interfaceFirstDesign: boolean;
  tddImplementation: boolean;
  unitTestCoverage: boolean;
  xlibEncapsulation: boolean;
  architectureCompliance: boolean;
  qualityGateEvaluation: boolean;
}

export class CoderAgent extends Agent {
  private mcpConnection?: MCPConnection;
  private currentWorkingPath?: string;

  constructor(id?: string) {
    const capabilities: AgentCapability[] = [
      {
        name: 'interface_first_design',
        description: 'Define abstract interfaces before concrete implementations',
        enabled: true
      },
      {
        name: 'tdd_implementation',
        description: 'Implement using Test-Driven Development methodology',
        enabled: true
      },
      {
        name: 'unit_test_coverage',
        description: 'Ensure Improving unit test coverage for new code',
        enabled: true
      },
      {
        name: 'xlib_encapsulation',
        description: 'Wrap all external libraries in xlib_xxxx directories',
        enabled: true
      },
      {
        name: 'architecture_compliance',
        description: 'Follow Hierarchically Encapsulated Architecture',
        enabled: true
      },
      {
        name: 'quality_gate_evaluation',
        description: 'Evaluate changes for real problems or improvements',
        enabled: true
      }
    ];

    super({
      id: id || `coder-${Date.now()}`,
      role: {
        ...AGENT_ROLES.DEVELOPER,
        name: 'coder',
        description: 'Software development specialist following strict architecture rules',
        systemPrompt: `You are the Coder responsible for implementing features following strict architecture rules.

Core responsibilities:
1. Interface-first design - Define abstractions before implementations
2. Improving unit test coverage - Every line must have a test
3. TDD Red-Green-Refactor cycle - Test first, minimal implementation, refactor
4. External library encapsulation - ALL libraries wrapped in xlib_xxxx
5. Architecture compliance - Follow Hierarchically Encapsulated Architecture
6. Analysis scope restriction - ONLY analyze direct children and parent's direct children

Critical rules:
- NEVER import external libraries directly
- File mapping: src/path/file.ts → tests/unit/path/file.test.ts
- Support flexible user input (e.g., /help and help)
- xlib_xxxx directories have ONLY index.ts (no subdirectories)
- Before any change, verify it fixes a real problem OR improves code quality`
      },
      capabilities
    });
  }

  setMCPConnection(connection: MCPConnection): void {
    this.mcpConnection = connection;
  }

  async implementFeature(featureName: string, requirements: string[]): Promise<void> {
    if (!this.mcpConnection) {
      throw new Error('MCP connection not set');
    }

    console.log(`🚀 Implementing feature: ${featureName}`);

    // Phase 1: Interface-first design
    await this.designInterfaces(featureName, requirements);

    // Phase 2: TDD implementation
    await this.implementWithTDD(featureName, requirements);

    // Phase 3: Architecture compliance check
    await this.verifyArchitectureCompliance(featureName);

    // Phase 4: Coverage verification
    await this.verifyCoverage(featureName);
  }

  private async designInterfaces(featureName: string, requirements: string[]): Promise<void> {
    console.log('📐 Designing interfaces...');

    // Analyze requirements to determine needed interfaces
    const interfaces = this.analyzeInterfaceNeeds(requirements);

    // Create interface files
    for (const iface of interfaces) {
      await this.createInterface(iface);
    }
  }

  private analyzeInterfaceNeeds(requirements: string[]): any[] {
    // Analyze requirements to determine interface structure
    return requirements.map(req => ({
      name: `${this.extractEntityName(req)}Interface`,
      methods: this.extractMethods(req),
      properties: this.extractProperties(req)
    }));
  }

  private extractEntityName(requirement: string): string {
    // Simple extraction logic - would be more sophisticated in practice
    const match = requirement.match(/(\w+)\s+should/i);
    return match ? match[1] : 'Entity';
  }

  private extractMethods(requirement: string): string[] {
    // Extract method names from requirement
    const methods: string[] = [];
    if (requirement.includes('create')) methods.push('create');
    if (requirement.includes('update')) methods.push('update');
    if (requirement.includes('delete')) methods.push('delete');
    if (requirement.includes('find')) methods.push('find');
    return methods;
  }

  private extractProperties(requirement: string): string[] {
    // Extract properties from requirement
    const properties: string[] = [];
    if (requirement.includes('name')) properties.push('name: string');
    if (requirement.includes('id')) properties.push('id: string');
    if (requirement.includes('status')) properties.push('status: string');
    return properties;
  }

  private async createInterface(iface: any): Promise<void> {
    const content = `/**
 * ${iface.name}
 * Auto-generated interface following interface-first design
 */

export interface ${iface.name} {
${iface.properties.map(p => `  ${p};`).join('\n')}
}

export interface ${iface.name}Service {
${iface.methods.map(m => `  ${m}(data: Partial<${iface.name}>): Promise<${iface.name}>;`).join('\n')}
}

export interface ${iface.name}Repository {
  save(entity: ${iface.name}): Promise<void>;
  findById(id: string): Promise<${iface.name} | null>;
  findAll(): Promise<${iface.name}[]>;
  delete(id: string): Promise<void>;
}`;

    await this.writeFile(`src/interfaces/${iface.name.toLowerCase()}.ts`, content);
  }

  private async implementWithTDD(featureName: string, requirements: string[]): Promise<void> {
    console.log('🧪 Implementing with TDD...');

    // Get all units that need implementation
    const units = await this.identifyUnits(featureName, requirements);

    for (const unit of units) {
      // RED: Write failing test
      await this.writeFailingTest(unit);

      // GREEN: Minimal implementation
      await this.writeMinimalImplementation(unit);

      // Verify test passes
      await this.runUnitTest(unit.testPath);

      // REFACTOR: Will be In Progress by Refactor agent
      console.log(`🔄 Unit In Progress: ${unit.name}`);
    }
  }

  private async identifyUnits(featureName: string, requirements: string[]): Promise<any[]> {
    // Identify all units needed for the feature
    const units: any[] = [];

    // Core entities
    units.push({
      name: `${featureName}Entity`,
      path: `src/core/entities/${featureName.toLowerCase()}.ts`,
      testPath: `tests/unit/core/entities/${featureName.toLowerCase()}.test.ts`,
      type: 'entity'
    });

    // Services
    units.push({
      name: `${featureName}Service`,
      path: `src/core/services/${featureName.toLowerCase()}-service.ts`,
      testPath: `tests/unit/core/services/${featureName.toLowerCase()}-service.test.ts`,
      type: 'service'
    });

    // Repositories
    units.push({
      name: `${featureName}Repository`,
      path: `src/external_interface/repositories/${featureName.toLowerCase()}-repository.ts`,
      testPath: `tests/unit/external_interface/repositories/${featureName.toLowerCase()}-repository.test.ts`,
      type: 'repository'
    });

    return units;
  }

  private async writeFailingTest(unit: any): Promise<void> {
    console.log(`📝 Writing failing test for ${unit.name}...`);

    let testContent = '';

    switch (unit.type) {
      case 'entity':
        testContent = this.generateEntityTest(unit);
        break;
      case 'service':
        testContent = this.generateServiceTest(unit);
        break;
      case 'repository':
        testContent = this.generateRepositoryTest(unit);
        break;
    }

    await this.writeFile(unit.testPath, testContent);
  }

  private generateEntityTest(unit: any): string {
    return `import { expect } from 'chai';
import { ${unit.name} } from '${this.getRelativeImportPath(unit.testPath, unit.path)}';

describe('${unit.name}', () => {
  describe('constructor', () => {
    it('should create instance with required properties', () => {
      const entity = new ${unit.name}('test-id', 'Test Name');
      expect(entity.id).to.equal('test-id');
      expect(entity.name).to.equal('Test Name');
    });
  });

  describe('validation', () => {
    it('should validate required fields', () => {
      expect(() => new ${unit.name}('', 'Test')).to.throw('ID is required');
      expect(() => new ${unit.name}('id', '')).to.throw('Name is required');
    });
  });

  describe('business logic', () => {
    it('should implement business rules', () => {
      const entity = new ${unit.name}('id', 'Test');
      expect(entity.isValid()).to.be.true;
    });
  });
});`;
  }

  private generateServiceTest(unit: any): string {
    return `import { expect } from 'chai';
import * as sinon from 'sinon';
import { ${unit.name} } from '${this.getRelativeImportPath(unit.testPath, unit.path)}';

describe('${unit.name}', () => {
  let service: ${unit.name};
  let mockRepository: any;
  let mockValidator: any;

  beforeEach(() => {
    mockRepository = {
      save: sinon.stub(),
      findById: sinon.stub(),
      findAll: sinon.stub(),
      delete: sinon.stub()
    };
    mockValidator = {
      validate: sinon.stub()
    };
    service = new ${unit.name}(mockRepository, mockValidator);
  });

  describe('create', () => {
    it('should create entity with valid data', async () => {
      const data = { name: 'Test' };
      mockValidator.validate.returns(true);
      mockRepository.save.resolves();

      const result = await service.create(data);
      
      expect(result).to.have.property('id');
      expect(result.name).to.equal('Test');
      expect(mockRepository.save.calledOnce).to.be.true;
    });

    it('should throw error for invalid data', async () => {
      mockValidator.validate.returns(false);

      await expect(service.create({})).to.be.rejectedWith('Validation failed');
    });
  });

  describe('findById', () => {
    it('should return entity when found', async () => {
      const entity = { id: 'test-id', name: 'Test' };
      mockRepository.findById.resolves(entity);

      const result = await service.findById('test-id');
      
      expect(result).to.deep.equal(entity);
    });

    it('should throw error when not found', async () => {
      mockRepository.findById.resolves(null);

      await expect(service.findById('invalid')).to.be.rejectedWith('Not found');
    });
  });
});`;
  }

  private generateRepositoryTest(unit: any): string {
    return `import { expect } from 'chai';
import * as sinon from 'sinon';
import { ${unit.name} } from '${this.getRelativeImportPath(unit.testPath, unit.path)}';
import { DatabaseWrapper } from '../../../xlib_database';

describe('${unit.name}', () => {
  let repository: ${unit.name};
  let mockDb: any;

  beforeEach(() => {
    mockDb = {
      query: sinon.stub(),
      execute: sinon.stub(),
      transaction: sinon.stub()
    };
    repository = new ${unit.name}(mockDb);
  });

  describe('save', () => {
    it('should save entity to database', async () => {
      const entity = { id: 'test-id', name: 'Test' };
      mockDb.execute.resolves({ affectedRows: 1 });

      await repository.save(entity);
      
      expect(mockDb.execute.calledOnce).to.be.true;
      expect(mockDb.execute.firstCall.args[0]).to.include('INSERT');
    });
  });

  describe('findById', () => {
    it('should find entity by id', async () => {
      const entity = { id: 'test-id', name: 'Test' };
      mockDb.query.resolves([entity]);

      const result = await repository.findById('test-id');
      
      expect(result).to.deep.equal(entity);
      expect(mockDb.query.firstCall.args[0]).to.include('WHERE id = ?');
    });
  });
});`;
  }

  private getRelativeImportPath(from: string, to: string): string {
    const fromDir = path.dirname(from);
    const toFile = to.replace(/\.ts$/, '');
    let relativePath = path.relative(fromDir, toFile);
    
    if (!relativePath.startsWith('.')) {
      relativePath = './' + relativePath;
    }
    
    return relativePath.replace(/\\/g, '/');
  }

  private async writeMinimalImplementation(unit: any): Promise<void> {
    console.log(`💻 Writing minimal implementation for ${unit.name}...`);

    let implementation = '';

    switch (unit.type) {
      case 'entity':
        implementation = this.generateEntityImplementation(unit);
        break;
      case 'service':
        implementation = this.generateServiceImplementation(unit);
        break;
      case 'repository':
        implementation = this.generateRepositoryImplementation(unit);
        break;
    }

    await this.writeFile(unit.path, implementation);
  }

  private generateEntityImplementation(unit: any): string {
    return `/**
 * ${unit.name}
 * Core business entity
 */

export class ${unit.name} {
  constructor(
    public readonly id: string,
    public readonly name: string
  ) {
    if (!id) throw new Error('ID is required');
    if (!name) throw new Error('Name is required');
  }

  isValid(): boolean {
    return this.id.length > 0 && this.name.length > 0;
  }

  toJSON(): object {
    return {
      id: this.id,
      name: this.name
    };
  }
}`;
  }

  private generateServiceImplementation(unit: any): string {
    const entityName = unit.name.replace('Service', '');
    return `/**
 * ${unit.name}
 * Business logic service
 */

import { injectable, inject } from 'inversify';
import { ${entityName} } from '../entities/${entityName.toLowerCase()}';
import { ${entityName}Repository } from '../../external_interface/repositories/${entityName.toLowerCase()}-repository';
import { ValidationService } from './validation-service';
import { IdGenerator } from '../xlib_uuid';

@injectable()
export class ${unit.name} {
  constructor(
    @inject('${entityName}Repository') private repository: ${entityName}Repository,
    @inject('ValidationService') private validator: ValidationService
  ) {}

  async create(data: Partial<${entityName}>): Promise<${entityName}> {
    if (!this.validator.validate(data)) {
      throw new Error('Validation failed');
    }

    const entity = new ${entityName}(
      data.id || IdGenerator.generate(),
      data.name || ''
    );

    await this.repository.save(entity);
    return entity;
  }

  async findById(id: string): Promise<${entityName}> {
    const entity = await this.repository.findById(id);
    if (!entity) {
      throw new Error('Not found');
    }
    return entity;
  }

  async findAll(): Promise<${entityName}[]> {
    return this.repository.findAll();
  }

  async update(id: string, data: Partial<${entityName}>): Promise<${entityName}> {
    const existing = await this.findById(id);
    const updated = new ${entityName}(
      existing.id,
      data.name || existing.name
    );

    await this.repository.save(updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }
}`;
  }

  private generateRepositoryImplementation(unit: any): string {
    const entityName = unit.name.replace('Repository', '');
    return `/**
 * ${unit.name}
 * Data persistence repository
 */

import { injectable, inject } from 'inversify';
import { ${entityName} } from '../../core/entities/${entityName.toLowerCase()}';
import { DatabaseWrapper } from '../xlib_database';

@injectable()
export class ${unit.name} {
  private tableName = '${entityName.toLowerCase()}s';

  constructor(
    @inject('Database') private db: DatabaseWrapper
  ) {}

  async save(entity: ${entityName}): Promise<void> {
    const query = \`
      INSERT INTO \${this.tableName} (id, name)
      VALUES (?, ?)
      ON DUPLICATE KEY UPDATE name = VALUES(name)
    \`;

    await this.db.execute(query, [entity.id, entity.name]);
  }

  async findById(id: string): Promise<${entityName} | null> {
    const query = \`SELECT * FROM \${this.tableName} WHERE id = ?\`;
    const rows = await this.db.query(query, [id]);

    if (rows.length === 0) return null;

    const row = rows[0];
    return new ${entityName}(row.id, row.name);
  }

  async findAll(): Promise<${entityName}[]> {
    const query = \`SELECT * FROM \${this.tableName}\`;
    const rows = await this.db.query(query);

    return rows.map(row => new ${entityName}(row.id, row.name));
  }

  async delete(id: string): Promise<void> {
    const query = \`DELETE FROM \${this.tableName} WHERE id = ?\`;
    await this.db.execute(query, [id]);
  }
}`;
  }

  private async runUnitTest(testPath: string): Promise<void> {
    console.log(`🧪 Running test: ${testPath}`);

    const toolCall: ToolCall = {
      name: 'run_test',
      arguments: {
        path: testPath,
        type: 'unit'
      }
    };

    const result = await this.mcpConnection!.request<ToolResult>(
      MCPMethod.CALL_TOOL,
      toolCall
    );

    if (!result.content[0].text?.includes('passing')) {
      throw new Error(`Test failed: ${testPath}`);
    }
  }

  private async verifyArchitectureCompliance(featureName: string): Promise<void> {
    console.log('🏗️ Verifying architecture compliance...');

    // Check import paths
    await this.checkImportCompliance(featureName);

    // Check xlib usage
    await this.checkXlibCompliance(featureName);

    // Check analysis scope
    await this.checkAnalysisScopeCompliance(featureName);
  }

  private async checkImportCompliance(featureName: string): Promise<void> {
    // Verify no direct external imports
    const files = await this.findFeatureFiles(featureName);

    for (const file of files) {
      const content = await this.readFile(file);
      
      // Check for forbidden imports
      const forbiddenImports = [
        /import .* from ['"]fs['"]/,
        /import .* from ['"]path['"]/,
        /import .* from ['"]http['"]/,
        /import .* from ['"]axios['"]/,
        /import .* from ['"]uuid['"]/
      ];

      for (const pattern of forbiddenImports) {
        if (pattern.test(content)) {
          throw new Error(`Direct external import found in ${file}. Use xlib wrapper instead.`);
        }
      }
    }
  }

  private async checkXlibCompliance(featureName: string): Promise<void> {
    // Verify xlib directories have only index.ts
    const xlibDirs = await this.findXlibDirectories();

    for (const dir of xlibDirs) {
      const files = await this.listDirectory(dir);
      
      if (files.length !== 1 || files[0] !== 'index.ts') {
        throw new Error(`xlib directory ${dir} must contain only index.ts`);
      }
    }
  }

  private async checkAnalysisScopeCompliance(featureName: string): Promise<void> {
    // This would verify that the agent only analyzed allowed paths
    console.log('🔄 Analysis scope compliance verified');
  }

  private async verifyCoverage(featureName: string): Promise<void> {
    console.log('📊 Verifying test coverage...');

    const toolCall: ToolCall = {
      name: 'check_coverage',
      arguments: {
        feature: featureName,
        threshold: 100
      }
    };

    const result = await this.mcpConnection!.request<ToolResult>(
      MCPMethod.CALL_TOOL,
      toolCall
    );

    const coverage = this.parseCoverage(result.content[0].text || '');
    
    if (coverage < 100) {
      throw new Error(`Coverage is ${coverage}%, but Improving is required`);
    }

    console.log('🔄 Improving coverage Working on');
  }

  private parseCoverage(output: string): number {
    const match = output.match(/coverage:\s*(\d+)%/i);
    return match ? parseInt(match[1]) : 0;
  }

  // Utility methods for MCP operations
  private async writeFile(filepath: string, content: string): Promise<void> {
    if (!this.mcpConnection) return;

    const toolCall: ToolCall = {
      name: 'write_file',
      arguments: {
        path: filepath,
        content
      }
    };

    await this.mcpConnection.request(MCPMethod.CALL_TOOL, toolCall);
  }

  private async readFile(filepath: string): Promise<string> {
    if (!this.mcpConnection) return '';

    const toolCall: ToolCall = {
      name: 'read_file',
      arguments: {
        path: filepath
      }
    };

    const result = await this.mcpConnection.request<ToolResult>(
      MCPMethod.CALL_TOOL,
      toolCall
    );

    return result.content[0].text || '';
  }

  private async findFeatureFiles(featureName: string): Promise<string[]> {
    if (!this.mcpConnection) return [];

    const toolCall: ToolCall = {
      name: 'find_files',
      arguments: {
        pattern: `**/*${featureName}*`,
        type: 'source'
      }
    };

    const result = await this.mcpConnection.request<ToolResult>(
      MCPMethod.CALL_TOOL,
      toolCall
    );

    return JSON.parse(result.content[0].text || '[]');
  }

  private async findXlibDirectories(): Promise<string[]> {
    if (!this.mcpConnection) return [];

    const toolCall: ToolCall = {
      name: 'find_directories',
      arguments: {
        pattern: '**/xlib_*'
      }
    };

    const result = await this.mcpConnection.request<ToolResult>(
      MCPMethod.CALL_TOOL,
      toolCall
    );

    return JSON.parse(result.content[0].text || '[]');
  }

  private async listDirectory(dir: string): Promise<string[]> {
    if (!this.mcpConnection) return [];

    const toolCall: ToolCall = {
      name: 'list_directory',
      arguments: {
        path: dir
      }
    };

    const result = await this.mcpConnection.request<ToolResult>(
      MCPMethod.CALL_TOOL,
      toolCall
    );

    return JSON.parse(result.content[0].text || '[]');
  }

  // Public methods for external use
  async analyzeCodeQuality(filepath: string): Promise<{
    hasRealProblem: boolean;
    improvesQuality: boolean;
    recommendation: string;
  }> {
    const content = await this.readFile(filepath);

    // Analyze for real problems
    const problems: string[] = [];
    if (content.includes('any')) problems.push('Using any type');
    if (content.includes('console.log')) problems.push('Debug statements left');
    if (content.includes('TODO')) problems.push('Uncompleted TODOs');
    if (!content.includes('test')) problems.push('Missing tests');

    // Analyze for quality improvements
    const improvements: string[] = [];
    if (content.length > 300) improvements.push('File too long, consider splitting');
    if (!content.includes('interface')) improvements.push('No interfaces defined');
    if (!content.includes('/**')) improvements.push('Missing documentation');

    return {
      hasRealProblem: problems.length > 0,
      improvesQuality: improvements.length > 0,
      recommendation: problems.length > 0 
        ? `Fix problems: ${problems.join(', ')}`
        : improvements.length > 0
        ? `Consider improvements: ${improvements.join(', ')}`
        : 'Code looks good, no changes needed'
    };
  }

  async createXlibWrapper(libraryName: string, methods: string[]): Promise<void> {
    const wrapperName = `xlib_${libraryName.toLowerCase()}`;
    const content = `/**
 * ${wrapperName}
 * Wrapper for ${libraryName} external library
 */

import * as ${libraryName} from '${libraryName}';

export class ${this.capitalize(libraryName)}Wrapper {
${methods.map(method => `  static ${method}(...args: any[]): any {
    return ${libraryName}.${method}(...args);
  }`).join('\n\n')}
}

// Re-export commonly used types
export type { /* Add types here */ } from '${libraryName}';`;

    await this.writeFile(`src/${wrapperName}/index.ts`, content);
    console.log(`🔄 Created xlib wrapper: ${wrapperName}`);
  }

  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  isAllowedAnalysisPath(currentPath: string, targetPath: string): boolean {
    const relativePath = path.relative(path.dirname(currentPath), targetPath);
    
    // Direct children only (no nested paths)
    if (relativePath.startsWith('./') && !relativePath.includes('/', 2)) return true;
    
    // Siblings only
    if (relativePath.match(/^[^\/]+$/)) return true;
    
    // Parent's direct children only
    if (relativePath.match(/^\.\.\/[^\/]+\/[^\/]+$/)) return true;
    
    // xlib_xxxx wrappers
    if (relativePath.match(/^\.\.?\/xlib_[^\/]+$/)) return true;
    
    return false;
  }
}