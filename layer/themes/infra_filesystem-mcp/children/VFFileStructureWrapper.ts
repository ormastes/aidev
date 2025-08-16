/**
 * VFFileStructureWrapper - File structure validation and management
 * 
 * This class extends VFFileWrapper to provide file structure validation
 * based on FILE_STRUCTURE.vf.json templates and rules.
 */

import { VFFileWrapper } from './VFFileWrapper';
import { path } from '../../infra_external-log-lib/src';
import * as fs from 'fs/promises';
import { getFileAPI, FileType } from '../../infra_external-log-lib/pipe';

const fileAPI = getFileAPI();


export interface StructureNode {
  name: string;
  type: "directory" | 'file' | 'template_ref';
  template?: string;
  required?: boolean;
  pattern?: string;
  children?: StructureNode[];
  description?: string;
}

export interface Template {
  id: string;
  type: "directory" | 'file';
  inherits?: string;
  description?: string;
  required_children?: StructureNode[];
  optional_children?: StructureNode[];
  allowed_patterns?: string[];
  forbidden_patterns?: string[];
  freeze?: boolean;
  freeze_message?: string;
}

export interface FileStructure {
  metadata: {
    version: string;
    created_at: string;
    updated_at: string;
    description?: string;
  };
  templates: Record<string, Template>;
  structure: StructureNode;
  validation_rules?: Record<string, any>;
}

export class VFFileStructureWrapper extends VFFileWrapper {
  private structureCache: FileStructure | null = null;
  private expandedStructureCache: Map<string, StructureNode[]> = new Map();

  constructor(basePath: string = '') {
    super(basePath);
  }

  /**
   * Load file structure definition
   */
  async loadStructure(structureFile: string = 'FILE_STRUCTURE.vf.json'): Promise<FileStructure> {
    if (!this.structureCache) {
      const content = await super.read(structureFile);
      this.structureCache = content as FileStructure;
    }
    return this.structureCache;
  }

  /**
   * Validate a file/directory path against the structure
   */
  async validatePath(filePath: string, isDirectory: boolean = false): Promise<{ valid: boolean; message?: string }> {
    const structure = await this.loadStructure();
    
    // Normalize path
    const normalizedPath = path.normalize(filePath).replace(/\\/g, '/');
    const parts = normalizedPath.split('/').filter(p => p && p !== '.');
    
    // Start from root structure
    let currentNodes: StructureNode[] = [structure.structure];
    let depth = 0;

    // If validating root level file, get children from root template
    if (parts.length === 1 && structure.structure.template) {
      const rootTemplate = structure.templates[structure.structure.template];
      if (rootTemplate) {
        currentNodes = await this.getNodeChildren(structure.structure, structure.templates);
        
        // Also add platform-specific files as valid nodes
        const platformFiles = this.getPlatformSpecificFiles(structure);
        if (platformFiles) {
          for (const platformType of Object.values(platformFiles)) {
            if (Array.isArray(platformType)) {
              for (const file of platformType) {
                currentNodes.push({
                  name: file.name,
                  type: 'file',
                  pattern: file.pattern
                });
              }
            }
          }
        }
      }
    }

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLastPart = i === parts.length - 1;
      
      // For the first part, if we haven't already loaded children from template, do it now
      if (i === 0 && parts.length > 1 && currentNodes.length === 1 && currentNodes[0] === structure.structure) {
        currentNodes = await this.getNodeChildren(structure.structure, structure.templates);
      }
      
      // Find matching node
      const matchedNode = this.findMatchingNode(currentNodes, part, structure.templates);
      
      if (!matchedNode) {
        // If this is the last part and no pattern matches, check if parent allows arbitrary files
        if (isLastPart && currentNodes.length === 0) {
          // Directory has no defined children, allow any file
          return { valid: true };
        }
        
        return {
          valid: false,
          message: `Path component "${part}" at depth ${i} does not match any allowed pattern`
        };
      }

      // Check if this is the target file/directory
      if (isLastPart) {
        if (isDirectory && matchedNode.type === 'file') {
          return {
            valid: false,
            message: `"${part}" must be a file, not a directory`
          };
        }
        if (!isDirectory && matchedNode.type === "directory") {
          return {
            valid: false,
            message: `"${part}" must be a directory, not a file`
          };
        }
        return { valid: true };
      }

      // Get children for next iteration
      currentNodes = await this.getNodeChildren(matchedNode, structure.templates);
    }

    return { valid: true };
  }

  /**
   * Find a node that matches the given name
   */
  private async findMatchingNode(nodes: StructureNode[], name: string, templates: Record<string, Template>): StructureNode | null {
    for (const node of nodes) {
      // Exact match
      if (node.name === name) {
        return node;
      }

      // Pattern match
      if (node.name === '*' && node.pattern) {
        const regex = new RegExp(node.pattern);
        if (regex.test(name)) {
          // Create a concrete node from the pattern
          return {
            ...node,
            name: name
          };
        }
      }

      // Template reference with pattern
      if (node.type === 'template_ref' && node.template && node.pattern) {
        const regex = new RegExp(node.pattern);
        if (regex.test(name)) {
          const template = templates[node.template];
          if (template) {
            return {
              name: name,
              type: template.type,
              template: node.template,
              children: node.children
            };
          }
        }
      }
    }

    return null;
  }

  /**
   * Get children of a node, expanding templates as needed
   */
  private async getNodeChildren(node: StructureNode, templates: Record<string, Template>): Promise<StructureNode[]> {
    const cacheKey = `${node.name}:${node.template || 'none'}`;
    
    if (this.expandedStructureCache.has(cacheKey)) {
      return this.expandedStructureCache.get(cacheKey)!;
    }

    let children: StructureNode[] = [];

    // Add direct children
    if (node.children) {
      children.push(...node.children);
    }

    // Expand template if present
    if (node.template) {
      const template = await this.expandTemplate(node.template, templates);
      if (template.required_children) {
        children.push(...template.required_children);
      }
      if (template.optional_children) {
        children.push(...template.optional_children.map(child => ({ ...child, required: false })));
      }
    }

    this.expandedStructureCache.set(cacheKey, children);
    return children;
  }

  /**
   * Expand a template, including inherited templates
   */
  private async expandTemplate(templateId: string, templates: Record<string, Template>): Promise<Template> {
    const template = templates[templateId];
    if (!template) {
      throw new Error(`Template "${templateId}" not found`);
    }

    // If template inherits from another, merge them
    if (template.inherits) {
      const parent = await this.expandTemplate(template.inherits, templates);
      return {
        ...parent,
        ...template,
        required_children: [
          ...(parent.required_children || []),
          ...(template.required_children || [])
        ],
        optional_children: [
          ...(parent.optional_children || []),
          ...(template.optional_children || [])
        ]
      };
    }

    return template;
  }

  /**
   * Generate a tree view of the file structure
   */
  async generateTree(maxDepth: number = 3): Promise<string> {
    const structure = await this.loadStructure();
    return this.nodeToTree(structure.structure, '', 0, maxDepth, structure.templates);
  }

  /**
   * Convert a node to tree representation
   */
  private async nodeToTree(
    node: StructureNode, 
    prefix: string, 
    depth: number, 
    maxDepth: number,
    templates: Record<string, Template>
  ): Promise<string> {
    if (depth > maxDepth) {
      return '';
    }

    let result = `${prefix}${node.name}`;
    if (node.type === "directory" || node.template) {
      result += '/';
    }
    if (node.description) {
      result += ` # ${node.description}`;
    }
    if (node.template) {
      result += ` [${node.template}]`;
    }
    result += '\n';

    // Get children
    const children = await this.getNodeChildren(node, templates);
    
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      const isLast = i === children.length - 1;
      const childPrefix = prefix + (isLast ? '└── ' : '├── ');
      const grandchildPrefix = prefix + (isLast ? '    ' : '│   ');
      
      result += await this.nodeToTree(child, childPrefix, depth + 1, maxDepth, templates);
      
      // Add grandchildren with proper indentation
      if (child.children || child.template) {
        const grandchildren = await this.getNodeChildren(child, templates);
        for (const grandchild of grandchildren) {
          result += await this.nodeToTree(grandchild, grandchildPrefix, depth + 2, maxDepth, templates);
        }
      }
    }

    return result;
  }

  /**
   * Validate write operation against structure
   */
  async validateWrite(filePath: string, isDirectory: boolean = false): Promise<{ valid: boolean; message?: string }> {
    const structure = await this.loadStructure();
    
    // First check freeze validation
    const freezeValidation = await this.checkFreezeStatus(filePath, structure);
    if (!freezeValidation.valid) {
      return freezeValidation;
    }
    
    const validation = await this.validatePath(filePath, isDirectory);
    
    if (!validation.valid) {
      return {
        valid: false,
        message: `Platform required file write validation failed: ${validation.message}. Use FILE_STRUCTURE.vf.json to create proper structure.`
      };
    }

    return { valid: true };
  }

  /**
   * Check if a path is in a frozen directory
   */
  private async checkFreezeStatus(filePath: string, structure: FileStructure): Promise<{ valid: boolean; message?: string }> {
    // Normalize path
    const normalizedPath = path.normalize(filePath).replace(/\\/g, '/');
    const parts = normalizedPath.split('/').filter(p => p && p !== '.');
    
    // Check if it's a root file
    if (parts.length === 1) {
      // Check if root is frozen
      if (structure.structure.template) {
        const rootTemplate = structure.templates[structure.structure.template];
        if (rootTemplate && rootTemplate.freeze) {
          // Check if it's a platform-specific file
          const platformFiles = this.getPlatformSpecificFiles(structure);
          const isAllowed = this.isAllowedRootFile(parts[0], rootTemplate, platformFiles);
          
          if (!isAllowed) {
            return {
              valid: false,
              message: rootTemplate.freeze_message || 'Root directory is frozen. Create files in appropriate subdirectories.'
            };
          }
        }
      }
    }
    
    // Check freeze status along the path
    let currentNodes: StructureNode[] = [structure.structure];
    let currentPath = '';
    
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      
      const matchedNode = this.findMatchingNode(currentNodes, part, structure.templates);
      if (!matchedNode) {
        break;
      }
      
      // Check if this directory is frozen
      if (matchedNode.template) {
        const template = structure.templates[matchedNode.template];
        if (template && template.freeze) {
          // Check if the file being created is in allowed subdirectories
          const remainingPath = parts.slice(i + 1).join('/');
          const isAllowedInFrozen = await this.isAllowedInFrozenDirectory(
            remainingPath, 
            matchedNode, 
            template, 
            structure.templates
          );
          
          if (!isAllowedInFrozen) {
            return {
              valid: false,
              message: template.freeze_message || `Directory ${currentPath} is frozen. Create files in appropriate subdirectories.`
            };
          }
        }
      }
      
      currentNodes = await this.getNodeChildren(matchedNode, structure.templates);
    }
    
    return { valid: true };
  }

  /**
   * Check if a file is allowed at root level
   */
  private async isAllowedRootFile(fileName: string, rootTemplate: Template, platformFiles: any): boolean {
    // Check required children
    if (rootTemplate.required_children) {
      for (const child of rootTemplate.required_children) {
        if (child.name === fileName) {
          return true;
        }
        // Check if child is a pattern match
        if (child.pattern && new RegExp(child.pattern).test(fileName)) {
          return true;
        }
      }
    }
    
    // Check optional children
    if (rootTemplate.optional_children) {
      for (const child of rootTemplate.optional_children) {
        if (child.name === fileName) {
          return true;
        }
        // Check if child is a pattern match
        if (child.pattern && new RegExp(child.pattern).test(fileName)) {
          return true;
        }
      }
    }
    
    // Check platform-specific files
    if (platformFiles) {
      for (const platformType of Object.values(platformFiles)) {
        if (Array.isArray(platformType)) {
          for (const file of platformType) {
            if (file.name === fileName || (file.pattern && new RegExp(file.pattern).test(fileName))) {
              return true;
            }
          }
        }
      }
    }
    
    return false;
  }

  /**
   * Check if a file is allowed in a frozen directory
   */
  private async isAllowedInFrozenDirectory(
    remainingPath: string, 
    node: StructureNode, 
    template: Template, 
    templates: Record<string, Template>
  ): Promise<boolean> {
    const parts = remainingPath.split('/');
    const children = await this.getNodeChildren(node, templates);
    
    // Check if the immediate child directory is allowed
    for (const child of children) {
      if (child.name === parts[0] || 
          (child.pattern && new RegExp(child.pattern).test(parts[0]))) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Get platform-specific files from structure
   */
  private async getPlatformSpecificFiles(structure: FileStructure): any {
    // Check if platform_specific_root_files is referenced in templates
    if (structure.templates.workspace && (structure.templates.workspace as any).platform_files) {
      const ref = (structure.templates.workspace as any).platform_files;
      if (ref && ref.startsWith('$ref:')) {
        const refName = ref.substring(5);
        return (structure as any)[refName];
      }
    }
    
    return (structure as any).platform_specific_root_files || {};
  }

  /**
   * Get allowed children for a directory path
   */
  async getAllowedChildren(dirPath: string): Promise<StructureNode[]> {
    const structure = await this.loadStructure();
    
    // Normalize path
    const normalizedPath = path.normalize(dirPath).replace(/\\/g, '/');
    const parts = normalizedPath.split('/').filter(p => p && p !== '.');
    
    // Navigate to the directory
    let currentNodes: StructureNode[] = [structure.structure];
    
    for (const part of parts) {
      const matchedNode = this.findMatchingNode(currentNodes, part, structure.templates);
      if (!matchedNode) {
        return [];
      }
      currentNodes = await this.getNodeChildren(matchedNode, structure.templates);
    }

    return currentNodes;
  }

  /**
   * Create required structure for a path
   */
  async createRequiredStructure(targetPath: string): Promise<string[]> {
    const structure = await this.loadStructure();
    const created: string[] = [];
    
    // Normalize path
    const normalizedPath = path.normalize(targetPath).replace(/\\/g, '/');
    const parts = normalizedPath.split('/').filter(p => p && p !== '.');
    
    let currentPath = this.basePath;
    let currentNodes: StructureNode[] = [structure.structure];
    
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const matchedNode = this.findMatchingNode(currentNodes, part, structure.templates);
      
      if (!matchedNode) {
        throw new Error(`Cannot create structure: "${part}" doesn't match allowed patterns at ${currentPath}`);
      }

      currentPath = path.join(currentPath, part);
      
      // Create directory if it doesn't exist and is a directory type
      if (matchedNode.type === "directory" || matchedNode.template) {
        try {
          await fs.access(currentPath);
        } catch {
          await fileAPI.createDirectory(currentPath);
          created.push(currentPath);
        }

        // Create required children if this is the target directory
        if (i === parts.length - 1) {
          const children = await this.getNodeChildren(matchedNode, structure.templates);
          for (const child of children.filter(c => c.required !== false)) {
            const childPath = path.join(currentPath, child.name);
            
            if (child.type === "directory") {
              try {
                await fs.access(childPath);
              } catch {
                await fileAPI.createDirectory(childPath);
                created.push(childPath);
              }
            } else if (child.type === 'file') {
              try {
                await fs.access(childPath);
              } catch {
                await fileAPI.createFile(childPath, '');
                created.push(childPath);
              }
            }
          }
        }
      }

      currentNodes = await this.getNodeChildren(matchedNode, { type: FileType.TEMPORARY });
    }

    return created;
  }
}