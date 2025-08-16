/**
 * VFNameIdWrapper - Name-based entity storage with schema validation
 * 
 * This class extends VFFileWrapper to provide name-based entity storage
 * with support for multiple entities with the same name, schema validation,
 * and query-based filtering.
 */

import { VFFileWrapper, QueryParams } from './VFFileWrapper';
import Ajv from 'ajv';
import { randomUUID as uuidv4 } from 'crypto';
import * as fs from 'fs/promises';
import { path } from '../../infra_external-log-lib/src';

export interface Entity {
  id: string;
  name: string;
  data: any;
  createdAt: string;
  updatedAt: string;
  [key: string]: any;
}

export interface NameIdStorage {
  [name: string]: Entity[];
}

export interface SearchParams {
  name?: string;
  id?: string;
  [key: string]: any;
}

export class VFNameIdWrapper extends VFFileWrapper {
  private ajv: Ajv;
  private schema: any;
  private schemaPath: string;

  constructor(basePath: string = '', schemaPath?: string) {
    super(basePath);
    this.ajv = new Ajv({ allErrors: true });
    this.schemaPath = schemaPath || path.join(basePath, 'schemas', 'name-id-wrapper.schema.json');
  }

  /**
   * Initialize schema validator
   */
  private async initializeSchema(): Promise<void> {
    if (!this.schema) {
      try {
        const schemaContent = await fs.readFile(this.schemaPath, 'utf-8');
        this.schema = JSON.parse(schemaContent);
      } catch (error) {
        // If schema doesn't exist, use a default schema
        this.schema = {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            data: { type: 'object' }
          },
          required: ['name', 'data']
        };
      }
    }
  }

  /**
   * Read entities with filtering support
   * @param filePath Path to storage file
   * @returns Filtered entities based on query parameters
   */
  async read(filePath: string): Promise<Entity[] | NameIdStorage> {
    const { path: cleanPath, params } = this.parseQueryParams(filePath);
    const storage = await this.readStorage(cleanPath);
    
    // If no params, return full storage
    if (Object.keys(params).length === 0) {
      return storage;
    }

    // Apply filters
    return this.filterEntities(storage, params);
  }

  /**
   * Write entity to storage
   * @param filePath Path to storage file
   * @param content Entity or storage to write
   */
  async write(filePath: string, content: Entity | NameIdStorage): Promise<void> {
    await this.initializeSchema();
    
    const { path: cleanPath } = this.parseQueryParams(filePath);
    
    // Check if content is a single entity or full storage
    if (this.isEntity(content)) {
      // Ensure entity has required fields
      if (!content.name || !content.data) {
        throw new Error('Schema validation failed: missing required fields "name" and "data"');
      }
      
      // Validate entity
      await this.validateEntity(content);
      
      // Add to existing storage
      const storage = await this.readStorage(cleanPath);
      await this.addEntityToStorage(storage, content);
      await super.write(cleanPath, storage);
    } else {
      // Validate all entities in storage
      for (const entities of Object.values(content)) {
        if (Array.isArray(entities)) {
          for (const entity of entities) {
            await this.validateEntity(entity);
          }
        }
      }
      await super.write(cleanPath, content);
    }
  }

  /**
   * Add a new entity
   * @param name Entity name
   * @param data Entity data
   * @param filePath Storage file path
   * @returns Created entity ID
   */
  async addEntity(name: string, data: any, filePath: string): Promise<string> {
    const entity: Entity = {
      id: uuidv4(),
      name,
      data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await this.write(filePath, entity);
    return entity.id;
  }

  /**
   * Get entities by name
   * @param name Entity name
   * @param filePath Storage file path
   * @returns Array of entities with the given name
   */
  async getEntities(name: string, filePath: string): Promise<Entity[]> {
    const queryPath = `${filePath}?name=${encodeURIComponent(name)}`;
    return await this.read(queryPath) as Entity[];
  }

  /**
   * Get entities by tag
   * @param tag Tag to search for
   * @param filePath Storage file path
   * @returns Array of entities with the given tag
   */
  async getEntitiesByTag(tag: string, filePath: string): Promise<Entity[]> {
    const queryPath = `${filePath}?tag=${encodeURIComponent(tag)}`;
    return await this.read(queryPath) as Entity[];
  }

  /**
   * Get entities by multiple tags (OR operation)
   * @param tags Array of tags to search for
   * @param filePath Storage file path
   * @returns Array of entities with any of the given tags
   */
  async getEntitiesByTags(tags: string[], filePath: string): Promise<Entity[]> {
    const queryParams = tags.map(tag => `tag=${encodeURIComponent(tag)}`).join('&');
    const queryPath = `${filePath}?${queryParams}`;
    return await this.read(queryPath) as Entity[];
  }

  /**
   * Update an entity
   * @param id Entity ID
   * @param updates Partial entity updates
   * @param filePath Storage file path
   */
  async updateEntity(id: string, updates: Partial<Entity>, filePath: string): Promise<void> {
    const storage = await this.readStorage(filePath);
    
    for (const name in storage) {
      const entities = storage[name];
      const index = entities.findIndex(e => e.id === id);
      
      if (index !== -1) {
        const entity = entities[index];
        const updatedEntity = {
          ...entity,
          ...updates,
          id: entity.id, // Preserve ID
          updatedAt: new Date().toISOString()
        };
        
        await this.validateEntity(updatedEntity);
        entities[index] = updatedEntity;
        await super.write(filePath, storage);
        return;
      }
    }
    
    throw new Error(`Entity with ID ${id} not found`);
  }

  /**
   * Delete an entity
   * @param id Entity ID
   * @param filePath Storage file path
   */
  async deleteEntity(id: string, filePath: string): Promise<void> {
    const storage = await this.readStorage(filePath);
    
    for (const name in storage) {
      const entities = storage[name];
      const index = entities.findIndex(e => e.id === id);
      
      if (index !== -1) {
        entities.splice(index, 1);
        
        // Remove name key if no entities left
        if (entities.length === 0) {
          delete storage[name];
        }
        
        await super.write(filePath, storage);
        return;
      }
    }
    
    throw new Error(`Entity with ID ${id} not found`);
  }

  /**
   * Validate entity against schema
   * @param entity Entity to validate
   */
  async validateSchema(entity: Entity): Promise<boolean> {
    await this.initializeSchema();
    const validate = this.ajv.compile(this.schema);
    return validate(entity) as boolean;
  }

  /**
   * Read storage from file
   * @param filePath Path to storage file
   * @returns Storage object
   */
  private async readStorage(filePath: string): Promise<NameIdStorage> {
    try {
      const content = await super.read(filePath);
      return content || {};
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        return {};
      }
      throw error;
    }
  }

  /**
   * Check if content is an entity
   * @param content Content to check
   * @returns True if content is an entity
   */
  private isEntity(content: any): content is Entity {
    return content && typeof content === 'object' && 
           ('name' in content || 'data' in content) &&
           !Array.isArray(content) &&
           !('high' in content || 'medium' in content || 'low' in content); // Not a storage object
  }

  /**
   * Validate entity and throw if invalid
   * @param entity Entity to validate
   */
  private async validateEntity(entity: Entity): Promise<void> {
    const isValid = await this.validateSchema(entity);
    if (!isValid) {
      const errors = this.ajv.errors?.map(e => `${e.instancePath} ${e.message}`).join(', ');
      throw new Error(`Schema validation failed: ${errors}`);
    }
  }

  /**
   * Add entity to storage
   * @param storage Storage object
   * @param entity Entity to add
   */
  private async addEntityToStorage(storage: NameIdStorage, entity: Entity): Promise<void> {
    if (!storage[entity.name]) {
      storage[entity.name] = [];
    }
    storage[entity.name].push(entity);
  }

  /**
   * Filter entities based on query parameters
   * @param storage Storage object
   * @param params Query parameters
   * @returns Filtered entities
   */
  private filterEntities(storage: NameIdStorage, params: QueryParams): Entity[] {
    let results: Entity[] = [];
    
    // Flatten all entities
    for (const entities of Object.values(storage)) {
      results.push(...entities);
    }
    
    // Apply filters
    if (params.name) {
      const name = Array.isArray(params.name) ? params.name[0] : params.name;
      results = results.filter(e => e.name === name);
    }
    
    if (params.id) {
      const id = Array.isArray(params.id) ? params.id[0] : params.id;
      results = results.filter(e => e.id === id);
    }
    
    // Handle tag searches specially
    if (params.tag || params.tags) {
      const searchTags = params.tag || params.tags;
      const tagList = Array.isArray(searchTags) ? searchTags : [searchTags];
      
      results = results.filter(e => {
        // Check if entity has tags
        const entityTags = e.tags || (e.data && e.data.tags) || [];
        if (!Array.isArray(entityTags) || entityTags.length === 0) {
          return false;
        }
        
        // Check if any of the search tags match any of the entity tags
        return tagList.some(searchTag => 
          searchTag && entityTags.some(entityTag => 
            entityTag.toLowerCase() === searchTag.toLowerCase()
          )
        );
      });
    }
    
    // Apply custom filters on data properties
    for (const [key, value] of Object.entries(params)) {
      if (key !== 'name' && key !== 'id' && key !== 'tag' && key !== 'tags') {
        const filterValue = Array.isArray(value) ? value[0] : value;
        results = results.filter(e => {
          // Check in data object
          if (e.data && key in e.data) {
            const dataValue = e.data[key];
            // Convert string 'true'/'false' to boolean for comparison
            if (filterValue === 'true' && dataValue === true) return true;
            if (filterValue === 'false' && dataValue === false) return true;
            if (dataValue === filterValue) return true;
          }
          // Check in entity root
          if (key in e && e[key] === filterValue) {
            return true;
          }
          return false;
        });
      }
    }
    
    return results;
  }
}