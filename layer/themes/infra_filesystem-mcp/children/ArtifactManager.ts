import { VFFileWrapper } from './VFFileWrapper';
import { VFFileStructureWrapper } from './VFFileStructureWrapper';
import { VFValidatedFileWrapper } from './VFValidatedFileWrapper';
import { fsPromises as fs } from 'fs/promises';
import { path } from '../../infra_external-log-lib/src';
import { getFileAPI, FileType } from '../../infra_external-log-lib/pipe';

const fileAPI = getFileAPI();


export interface ArtifactType {
  id: string;
  name: string;
  description: string;
  extensions: string[];
  patterns: Record<string, string>;
  validation?: {
    naming?: string;
    required_sections?: Record<string, string[]>;
    must_have_tests?: boolean;
    must_have_docs?: boolean;
    requires_justification?: boolean;
  };
}

export interface ArtifactMetadata {
  id: string;
  type: string;
  path: string;
  created_at: string;
  created_by: string;
  purpose: string;
  expires_at?: string;
  tags?: string[];
  dependencies?: string[];
  related_artifacts?: string[];
  test_coverage?: number;
  documentation_link?: string;
  justification?: string;
  state?: 'draft' | 'review' | "approved" | "deployed" | "deprecated" | "archived";
}

export interface ArtifactSaveRequest {
  content: string;
  type: string;
  metadata?: Partial<ArtifactMetadata>;
  variables?: Record<string, string>;
  adhoc_reason?: string;
}

export interface ArtifactValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestedPath?: string;
  requiredTests?: string[];
  requiredDocs?: string[];
}

export class ArtifactManager {
  private basePath: string;
  private fileWrapper: VFFileWrapper;
  private structureWrapper: VFFileStructureWrapper;
  private validatedWrapper: VFValidatedFileWrapper;
  private artifactTypes: Map<string, ArtifactType> = new Map();
  private artifactManifest: Map<string, ArtifactMetadata> = new Map();
  private patterns: any;

  constructor(basePath: string = process.cwd()) {
    this.basePath = basePath;
    this.fileWrapper = new VFFileWrapper(basePath);
    this.structureWrapper = new VFFileStructureWrapper(basePath);
    this.validatedWrapper = new VFValidatedFileWrapper(basePath);
    
    // Load artifact patterns and manifest
    this.loadArtifactPatterns();
    this.loadArtifactManifest();
  }

  /**
   * Load artifact patterns from configuration
   */
  private async loadArtifactPatterns(): Promise<void> {
    try {
      const patternsPath = path.join(this.basePath, 'layer/themes/infra_filesystem-mcp/schemas/artifact_patterns.json');
      const patternsContent = await fileAPI.readFile(patternsPath, 'utf-8');
      this.patterns = JSON.parse(patternsContent);
      
      // Load artifact types
      for (const [key, type] of Object.entries(this.patterns.artifact_types)) {
        this.artifactTypes.set(key, type as ArtifactType);
      }
    } catch (error) {
      // Use default patterns if file doesn't exist
      this.loadDefaultPatterns();
    }
  }

  /**
   * Load default artifact patterns
   */
  private async loadDefaultPatterns(): void {
    const defaults: Record<string, ArtifactType> = {
      source_code: {
        id: 'source_code',
        name: 'Source Code',
        description: 'Production source code files',
        extensions: ['ts', 'js', 'tsx', 'jsx', 'py', 'cpp', 'c', 'h', 'hpp'],
        patterns: {
          theme: 'layer/themes/{epic}_{theme}/children/*.{ext}',
          user_story: 'layer/themes/{epic}_{theme}/user-stories/{story}/src/**/*.{ext}'
        }
      },
      test_code: {
        id: 'test_code',
        name: 'Test Code',
        description: 'Test files',
        extensions: ['test.ts', 'test.js', 'spec.ts', 'spec.js'],
        patterns: {
          unit: 'layer/themes/{epic}_{theme}/tests/unit/**/*.test.{ext}',
          integration: 'layer/themes/{epic}_{theme}/tests/integration/**/*.itest.{ext}',
          system: 'layer/themes/{epic}_{theme}/tests/system/**/*.systest.{ext}'
        }
      },
      documentation: {
        id: "documentation",
        name: "Documentation",
        description: 'Documentation files',
        extensions: ['md', 'mdx', 'rst'],
        patterns: {
          readme: '**/README.md',
          retrospect: 'gen/history/retrospect/{user_story}*.md',
          research: 'layer/themes/{epic}_{theme}/research/{user_story}*.research.md'
        }
      },
      sequence_diagram: {
        id: 'sequence_diagram',
        name: 'Sequence Diagram',
        description: 'UML sequence diagrams',
        extensions: ['mmd', 'puml'],
        patterns: {
          system: 'layer/themes/{epic}_{theme}/docs/diagrams/system_{user_story}_sequence.mmd',
          user_story: 'layer/themes/{epic}_{theme}/user-stories/{story}/docs/diagrams/{story}_sequence.mmd'
        }
      },
      adhoc: {
        id: 'adhoc',
        name: 'Ad-hoc Artifact',
        description: 'Temporary or experimental files',
        extensions: ['*'],
        patterns: {
          temp: 'temp/**/*',
          experimental: 'layer/themes/{epic}_{theme}/experimental/**/*'
        },
        validation: {
          requires_justification: true
        }
      }
    };

    for (const [key, type] of Object.entries(defaults)) {
      this.artifactTypes.set(key, type);
    }
  }

  /**
   * Load artifact manifest
   */
  private async loadArtifactManifest(): Promise<void> {
    try {
      const manifestPath = path.join(this.basePath, 'ARTIFACTS.vf.json');
      const manifestContent = await fileAPI.readFile(manifestPath, 'utf-8');
      const manifest = JSON.parse(manifestContent);
      
      for (const artifact of manifest.artifacts || []) {
        this.artifactManifest.set(artifact.id, artifact);
      }
    } catch {
      // Start with empty manifest if file doesn't exist
      this.artifactManifest = new Map();
    }
  }

  /**
   * Save artifact manifest
   */
  private async saveArtifactManifest(): Promise<void> {
    const manifestPath = path.join(this.basePath, 'ARTIFACTS.vf.json');
    const manifest = {
      metadata: {
        version: '1.0.0',
        updated_at: new Date().toISOString(),
        artifact_count: this.artifactManifest.size
      },
      artifacts: Array.from(this.artifactManifest.values())
    };
    
    await fileAPI.createFile(manifestPath, JSON.stringify(manifest, { type: FileType.TEMPORARY }));
  }

  /**
   * Save an artifact with validation and organization
   */
  async saveArtifact(request: ArtifactSaveRequest): Promise<{
    success: boolean;
    path?: string;
    id?: string;
    validation: ArtifactValidation;
  }> {
    // Validate the artifact request
    const validation = await this.validateArtifact(request);
    
    if (!validation.isValid) {
      return { success: false, validation };
    }

    // Determine the file path
    const filePath = validation.suggestedPath || this.generatePath(request);
    
    // Create required directories
    const dir = path.dirname(filePath);
    await fileAPI.createDirectory(dir);
    
    // Save the file
    const fullPath = path.join(this.basePath, filePath);
    await fileAPI.createFile(fullPath, request.content);
    
    // Generate artifact metadata
    const artifactId = this.generateArtifactId();
    const metadata: ArtifactMetadata = {
      id: artifactId,
      created_at: new Date().toISOString(),
      created_by: request.metadata?.created_by || 'system',
      purpose: request.metadata?.purpose || request.adhoc_reason || 'No purpose specified',
      state: 'draft',
      ...request.metadata
    };
    
    // Add to manifest
    this.artifactManifest.set(artifactId, metadata);
    await this.saveArtifactManifest();
    
    // Create required test files if needed
    if (validation.requiredTests && validation.requiredTests.length > 0) {
      await this.createTestStubs(filePath, validation.requiredTests);
    }
    
    // Create required documentation if needed
    if (validation.requiredDocs && validation.requiredDocs.length > 0) {
      await this.createDocStubs(filePath, validation.requiredDocs);
    }
    
    return {
      success: true,
      path: filePath,
      id: artifactId,
      validation
    };
  }

  /**
   * Validate an artifact before saving
   */
  async validateArtifact(request: ArtifactSaveRequest): Promise<ArtifactValidation> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const requiredTests: string[] = [];
    const requiredDocs: string[] = [];
    
    // Get artifact type
    const artifactType = this.artifactTypes.get(request.type);
    
    if (!artifactType && request.type !== 'adhoc') {
      errors.push(`Unknown artifact type: ${request.type}`);
      return { isValid: false, errors, warnings };
    }
    
    // Check adhoc justification
    if (request.type === 'adhoc' && !request.adhoc_reason) {
      errors.push('Ad-hoc artifacts require justification');
    }
    
    // Validate file extension
    if (artifactType && artifactType.extensions[0] !== '*') {
      const hasValidExtension = artifactType.extensions.some(ext => 
        request.content.includes(`.${ext}`) || request.metadata?.path?.endsWith(`.${ext}`)
      );
      
      if (!hasValidExtension) {
        warnings.push(`File extension should be one of: ${artifactType.extensions.join(', ')}`);
      }
    }
    
    // Check required tests
    if (artifactType?.validation?.must_have_tests) {
      requiredTests.push('unit', "integration");
    }
    
    // Check required documentation
    if (artifactType?.validation?.must_have_docs) {
      requiredDocs.push('README.md', 'API.md');
    }
    
    // Validate content for forbidden patterns
    if (this.patterns?.validation_rules?.content_validation?.forbidden_content) {
      for (const forbidden of this.patterns.validation_rules.content_validation.forbidden_content) {
        if (request.content.includes(forbidden)) {
          errors.push(`Content contains forbidden pattern: ${forbidden}`);
        }
      }
    }
    
    // Suggest path based on type and pattern
    const suggestedPath = this.generatePath(request);
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestedPath,
      requiredTests: requiredTests.length > 0 ? requiredTests : undefined,
      requiredDocs: requiredDocs.length > 0 ? requiredDocs : undefined
    };
  }

  /**
   * Generate a file path based on artifact type and variables
   */
  private async generatePath(request: ArtifactSaveRequest): string {
    const artifactType = this.artifactTypes.get(request.type) || this.artifactTypes.get('adhoc');
    
    if (!artifactType) {
      return `temp/unknown_${Date.now()}`;
    }
    
    // Get the first pattern as default
    const patternKey = Object.keys(artifactType.patterns)[0];
    let pattern = artifactType.patterns[patternKey];
    
    // Replace variables in pattern
    const variables = request.variables || {};
    
    // Set defaults if not provided
    variables.epic = variables.epic || 'infra';
    variables.theme = variables.theme || 'filesystem-mcp';
    variables.story = variables.story || '001-artifact';
    variables.user_story = variables.user_story || "artifact";
    variables.ext = variables.ext || this.getExtensionForType(request.type);
    
    // Replace all variables
    for (const [key, value] of Object.entries(variables)) {
      pattern = pattern.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
    }
    
    // Handle wildcards
    pattern = pattern.replace(/\*\*/g, "generated");
    pattern = pattern.replace(/\*/g, `artifact_${Date.now()}`);
    
    return pattern;
  }

  /**
   * Get default extension for artifact type
   */
  private async getExtensionForType(type: string): string {
    const extensions: Record<string, string> = {
      source_code: 'ts',
      test_code: 'test.ts',
      documentation: 'md',
      sequence_diagram: 'mmd',
      configuration: 'json',
      schema: 'schema.json',
      adhoc: 'txt'
    };
    
    return extensions[type] || 'txt';
  }

  /**
   * Generate unique artifact ID
   */
  private async generateArtifactId(): string {
    return `artifact-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Create test stub files
   */
  private async createTestStubs(artifactPath: string, testTypes: string[]): Promise<void> {
    const baseName = path.basename(artifactPath, path.extname(artifactPath));
    const artifactDir = path.dirname(artifactPath);
    
    for (const testType of testTypes) {
      const testPath = artifactDir.replace('/src/', '/tests/').replace('/children/', '/tests/');
      const testFile = path.join(testPath, testType, `${baseName}.${testType === "integration" ? 'itest' : 'test'}.ts`);
      
      const testContent = `// Auto-generated test stub for ${artifactPath}
import { describe, it, expect } from '@jest/globals';

describe('${baseName}', () => {
  it('should have tests implemented', () => {
    expect(true).toBe(false); // TODO: Implement tests
  });
});
`;
      
      const fullTestPath = path.join(this.basePath, testFile);
      await fileAPI.createDirectory(path.dirname(fullTestPath));
      
      // Only create if doesn't exist
      try {
        await fs.access(fullTestPath);
      } catch {
        await fileAPI.createFile(fullTestPath, testContent);
      }
    }
  }

  /**
   * Create documentation stub files
   */
  private async createDocStubs(artifactPath: string, docTypes: string[]) {
    const baseName = path.basename(artifactPath);
    const artifactDir = path.dirname(artifactPath);
    
    for (const docType of docTypes) {
      const docPath = path.join(artifactDir, '..', 'docs', docType);
      const docContent = `# ${baseName} Documentation

## Overview
Documentation for ${artifactPath}

## Usage
TODO: Add usage examples

## API Reference
TODO: Add API documentation

## Related Files
- Source: ${artifactPath}
- Tests: See tests/ directory
`;
      
      const fullDocPath = path.join(this.basePath, docPath);
      await fileAPI.createDirectory(path.dirname(fullDocPath));
      
      // Only create if doesn't exist
      try {
        await fs.access(fullDocPath);
      } catch {
        await fileAPI.createFile(fullDocPath, docContent);
      }
    }
  }

  /**
   * Get artifact by ID
   */
  async getArtifact(artifactId: string): Promise<ArtifactMetadata | null> {
    return this.artifactManifest.get(artifactId) || null;
  }

  /**
   * List artifacts by type
   */
  async listArtifactsByType(type: string): Promise<ArtifactMetadata[]> {
    return Array.from(this.artifactManifest.values())
      .filter(a => a.type === type);
  }

  /**
   * Update artifact state
   */
  async updateArtifactState(
    artifactId: string, 
    newState: 'draft' | 'reviewed' | 'approved' | 'deployed'
  ): Promise<boolean> {
    const artifact = this.artifactManifest.get(artifactId);
    if (!artifact) {
      return false;
    }
    
    artifact.state = newState;
    artifact.updated_at = new Date().toISOString();
    await this.saveArtifactManifest();
    
    return true;
  }

  /**
   * Search artifacts by pattern
   */
  async searchArtifacts(pattern: string): Promise<ArtifactMetadata[]> {
    const regex = new RegExp(pattern, 'i');
    return Array.from(this.artifactManifest.values())
      .filter(a => 
        regex.test(a.path) || 
        regex.test(a.purpose) || 
        a.tags?.some(t => regex.test(t))
      );
  }

  /**
   * Clean up expired artifacts
   */
  async cleanupExpiredArtifacts(): Promise<number> {
    const now = new Date();
    let cleaned = 0;
    
    for (const [id, artifact] of this.artifactManifest.entries()) {
      if (artifact.expires_at) {
        const expiryDate = new Date(artifact.expires_at);
        if (expiryDate < now) {
          // Archive the artifact
          artifact.state = "archived";
          
          // Move file to archive
          const archivePath = path.join('gen/artifacts/archive', artifact.path);
          const fullArchivePath = path.join(this.basePath, archivePath);
          const fullOriginalPath = path.join(this.basePath, artifact.path);
          
          try {
            await fileAPI.createDirectory(path.dirname(fullArchivePath));
            await fs.rename(fullOriginalPath, fullArchivePath);
            artifact.path = archivePath;
            cleaned++;
          } catch (error) {
            console.error(`Failed to archive ${artifact.path}:`, error);
          }
        }
      }
    }
    
    if (cleaned > 0) {
      await this.saveArtifactManifest();
    }
    
    return cleaned;
  }

  /**
   * Validate all artifacts against current patterns
   */
  async validateAllArtifacts(): Promise<{
    valid: number;
    invalid: number;
    issues: Array<{ id: string; path: string; errors: string[] }>;
  }> {
    let valid = 0;
    let invalid = 0;
    const issues: Array<{ id: string; path: string; errors: string[] }> = [];
    
    for (const [id, artifact] of this.artifactManifest.entries()) {
      const errors: string[] = [];
      
      // Check if file exists
      const fullPath = path.join(this.basePath, artifact.path);
      try {
        await fs.access(fullPath);
      } catch {
        errors.push('File does not exist');
      }
      
      // Check if path matches expected pattern
      const artifactType = this.artifactTypes.get(artifact.type);
      if (artifactType) {
        let matchesPattern = false;
        for (const pattern of Object.values(artifactType.patterns)) {
          // Simple pattern matching (could be improved)
          const regexPattern = pattern
            .replace(/\{[^}]+\}/g, '[^/]+')
            .replace(/\*\*/g, '.*')
            .replace(/\*/g, '[^/]*');
          
          if (new RegExp(regexPattern).test(artifact.path)) {
            matchesPattern = true;
            break;
          }
        }
        
        if (!matchesPattern) {
          errors.push(`Path does not match expected patterns for type ${artifact.type}`);
        }
      }
      
      if (errors.length > 0) {
        invalid++;
        issues.push({ id, path: artifact.path, errors });
      } else {
        valid++;
      }
    }
    
    return { valid, invalid, issues };
  }
}

// Export factory function
export function createArtifactManager(basePath?: string): ArtifactManager {
  return new ArtifactManager(basePath);
}