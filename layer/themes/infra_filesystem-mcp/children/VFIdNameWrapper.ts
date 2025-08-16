/**
 * VFIdNameWrapper - ID_NAME.vf.json specific implementation with index management
 * 
 * This class extends VFFileWrapper to provide specialized handling for ID_NAME.vf.json files
 * with automatic index building and maintenance for fast lookups by name, namespace, tag, and extension.
 */

import { VFFileWrapper, QueryParams } from './VFFileWrapper';
import { path } from '../../infra_external-log-lib/src';

export interface NameIdItem {
  id: string;
  type: string;
  namespace: string;
  name: string;
  full_path: string;
  extension?: string;
  description?: string;
  tags?: string[];
  created_at?: string;
  updated_at?: string;
  metadata?: Record<string, any>;
}

export interface IdNameStorage {
  metadata: {
    version: string;
    created_at: string;
    updated_at: string;
    total_items: number;
    description?: string;
  };
  types: {
    [key: string]: NameIdItem[];
  };
  indices?: {
    by_name: { [key: string]: string[] };
    by_namespace: { [key: string]: string[] };
    by_tag: { [key: string]: string[] };
    by_extension: { [key: string]: string[] };
  };
}

export class VFIdNameWrapper extends VFFileWrapper {
  constructor(basePath: string = '') {
    super(basePath);
  }

  /**
   * Read ID_NAME storage with filtering support
   * @param filePath Path to ID_NAME.vf.json file
   * @returns Filtered items based on query parameters or full storage
   */
  async read(filePath: string): Promise<NameIdItem[] | IdNameStorage> {
    const { path: cleanPath, params } = this.parseQueryParams(filePath);
    const storage = await this.readStorage(cleanPath);
    
    // If no params, return full storage
    if (Object.keys(params).length === 0) {
      return storage;
    }

    // Apply filters and return items
    return this.searchItems(storage, params);
  }

  /**
   * Write ID_NAME storage with automatic index rebuilding
   * @param filePath Path to ID_NAME.vf.json file
   * @param content Items to add or full storage to write
   */
  async write(filePath: string, content: NameIdItem | NameIdItem[] | IdNameStorage): Promise<void> {
    const { path: cleanPath } = this.parseQueryParams(filePath);
    
    let storage: IdNameStorage;
    
    if (this.isIdNameStorage(content)) {
      storage = content;
    } else {
      // Read existing storage
      storage = await this.readStorage(cleanPath);
      
      // Add new items
      const items = Array.isArray(content) ? content : [content];
      for (const item of items) {
        await this.addItem(storage, item);
      }
    }
    
    // Rebuild indices before saving
    this.rebuildIndices(storage);
    
    // Update metadata
    storage.metadata.updated_at = new Date().toISOString();
    
    await super.write(cleanPath, storage);
  }

  /**
   * Add a new item to storage
   * @param storage Storage object
   * @param item Item to add
   */
  private async addItem(storage: IdNameStorage, item: NameIdItem): Promise<void> {
    // Ensure type array exists
    if (!storage.types[item.type]) {
      storage.types[item.type] = [];
    }
    
    // Add timestamps if not present
    if (!item.created_at) {
      item.created_at = new Date().toISOString();
    }
    item.updated_at = new Date().toISOString();
    
    // Add to type array
    storage.types[item.type].push(item);
    storage.metadata.total_items++;
  }

  /**
   * Search items based on query parameters
   * @param storage Storage object
   * @param params Query parameters
   * @returns Filtered items
   */
  private searchItems(storage: IdNameStorage, params: QueryParams): NameIdItem[] {
    let results: NameIdItem[] = [];
    
    // Get all items first
    for (const typeItems of Object.values(storage.types)) {
      results.push(...typeItems);
    }
    
    // Apply name filter
    if (params.name) {
      const searchName = (Array.isArray(params.name) ? params.name[0] : params.name).toLowerCase();
      results = results.filter(item => item.name.toLowerCase() === searchName);
    }
    
    // Apply tag filter (OR logic for multiple tags, but AND with other filters)
    if (params.tag || params.tags) {
      const searchTags = params.tag || params.tags;
      const tagList = Array.isArray(searchTags) ? searchTags : [searchTags];
      
      results = results.filter(item => {
        if (!item.tags || !Array.isArray(item.tags)) return false;
        return tagList.some(tag => tag && item.tags!.includes(tag));
      });
    }
    
    // Apply namespace filter
    if (params.namespace) {
      const searchNamespace = Array.isArray(params.namespace) ? params.namespace[0] : params.namespace;
      results = results.filter(item => item.namespace === searchNamespace);
    }
    
    // Apply extension filter
    if (params.extension) {
      const searchExt = Array.isArray(params.extension) ? params.extension[0] : params.extension;
      results = results.filter(item => item.extension === searchExt);
    }
    
    // Apply type filter
    if (params.type) {
      const searchType = Array.isArray(params.type) ? params.type[0] : params.type;
      results = results.filter(item => item.type === searchType);
    }
    
    // Apply custom filters
    for (const [key, value] of Object.entries(params)) {
      if (!['name', 'tag', 'tags', "namespace", "extension", 'type'].includes(key)) {
        const filterValue = Array.isArray(value) ? value[0] : value;
        results = results.filter(item => {
          if (key in item && item[key as keyof NameIdItem] === filterValue) {
            return true;
          }
          if (item.metadata && key in item.metadata && item.metadata[key] === filterValue) {
            return true;
          }
          return false;
        });
      }
    }
    
    return results;
  }

  /**
   * Rebuild all indices from types data
   * @param storage Storage object
   */
  private rebuildIndices(storage: IdNameStorage): void {
    // Initialize indices
    storage.indices = {
      by_name: {},
      by_namespace: {},
      by_tag: {},
      by_extension: {}
    };
    
    // Build indices
    for (const typeItems of Object.values(storage.types)) {
      for (const item of typeItems) {
        // Index by name (lowercase for case-insensitive search)
        const nameLower = item.name.toLowerCase();
        if (!storage.indices.by_name[nameLower]) {
          storage.indices.by_name[nameLower] = [];
        }
        storage.indices.by_name[nameLower].push(item.id);
        
        // Index by namespace
        if (!storage.indices.by_namespace[item.namespace]) {
          storage.indices.by_namespace[item.namespace] = [];
        }
        storage.indices.by_namespace[item.namespace].push(item.id);
        
        // Index by tags
        if (item.tags && Array.isArray(item.tags)) {
          for (const tag of item.tags) {
            const tagLower = tag.toLowerCase();
            if (!storage.indices.by_tag[tagLower]) {
              storage.indices.by_tag[tagLower] = [];
            }
            storage.indices.by_tag[tagLower].push(item.id);
          }
        }
        
        // Index by extension
        if (item.extension) {
          if (!storage.indices.by_extension[item.extension]) {
            storage.indices.by_extension[item.extension] = [];
          }
          storage.indices.by_extension[item.extension].push(item.id);
        }
      }
    }
  }

  /**
   * Read storage from file
   * @param filePath Path to storage file
   * @returns Storage object
   */
  private async readStorage(filePath: string): Promise<IdNameStorage> {
    try {
      const content = await super.read(filePath);
      
      // Handle null content (file doesn't exist)
      if (content === null) {
        return this.createEmptyStorage();
      }
      
      const storage = content as IdNameStorage;
      
      // Rebuild indices if they don't exist
      if (!storage.indices) {
        this.rebuildIndices(storage);
      }
      
      return storage;
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        // Return empty storage structure
        return this.createEmptyStorage();
      }
      throw error;
    }
  }

  private createEmptyStorage(): IdNameStorage {
    return {
      metadata: {
        version: '1.0.0',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        total_items: 0
      },
      types: {
        file: [],
        directory: [],
        function: [],
        class: [],
        method: [],
        variable: [],
        constant: [],
        interface: [],
        type: [],
        module: [],
        namespace: [],
        component: [],
        concept: [],
        service: [],
        entity: [],
        schema: [],
        config: [],
        test: [],
        script: [],
        other: []
      },
      indices: {
        by_name: {},
        by_namespace: {},
        by_tag: {},
        by_extension: {}
      }
    };
  }

  /**
   * Check if content is IdNameStorage
   * @param content Content to check
   * @returns True if content is IdNameStorage
   */
  private isIdNameStorage(content: any): content is IdNameStorage {
    return content && 
           typeof content === 'object' && 
           "metadata" in content &&
           'types' in content &&
           typeof content.metadata === 'object' &&
           typeof content.types === 'object';
  }

  /**
   * Get items by tag
   * @param tag Tag to search for
   * @param filePath Storage file path
   * @returns Array of items with the given tag
   */
  async getItemsByTag(tag: string, filePath: string): Promise<NameIdItem[]> {
    const queryPath = `${filePath}?tag=${encodeURIComponent(tag)}`;
    return await this.read(queryPath) as NameIdItem[];
  }

  /**
   * Get items by multiple tags (OR operation)
   * @param tags Array of tags to search for
   * @param filePath Storage file path
   * @returns Array of items with any of the given tags
   */
  async getItemsByTags(tags: string[], filePath: string): Promise<NameIdItem[]> {
    const queryParams = tags.map(tag => `tag=${encodeURIComponent(tag)}`).join('&');
    const queryPath = `${filePath}?${queryParams}`;
    return await this.read(queryPath) as NameIdItem[];
  }

  /**
   * Get items by name
   * @param name Name to search for (case-insensitive)
   * @param filePath Storage file path
   * @returns Array of items with the given name
   */
  async getItemsByName(name: string, filePath: string): Promise<NameIdItem[]> {
    const queryPath = `${filePath}?name=${encodeURIComponent(name)}`;
    return await this.read(queryPath) as NameIdItem[];
  }

  /**
   * Get items by type
   * @param type Type to filter by
   * @param filePath Storage file path
   * @returns Array of items of the given type
   */
  async getItemsByType(type: string, filePath: string): Promise<NameIdItem[]> {
    const storage = await this.readStorage(filePath);
    return storage.types[type] || [];
  }

  /**
   * Remove an item by ID
   * @param id Item ID to remove
   * @param filePath Storage file path
   */
  async removeItem(id: string, filePath: string): Promise<void> {
    const storage = await this.readStorage(filePath);
    
    // Find and remove item
    for (const type in storage.types) {
      const items = storage.types[type];
      const index = items.findIndex(item => item.id === id);
      
      if (index !== -1) {
        items.splice(index, 1);
        storage.metadata.total_items--;
        
        // Rebuild indices and save
        this.rebuildIndices(storage);
        storage.metadata.updated_at = new Date().toISOString();
        await super.write(filePath, storage);
        return;
      }
    }
    
    throw new Error(`Item with ID ${id} not found`);
  }

  /**
   * Update an item
   * @param id Item ID
   * @param updates Partial item updates
   * @param filePath Storage file path
   */
  async updateItem(id: string, updates: Partial<NameIdItem>, filePath: string): Promise<void> {
    const storage = await this.readStorage(filePath);
    
    // Find and update item
    for (const type in storage.types) {
      const items = storage.types[type];
      const index = items.findIndex(item => item.id === id);
      
      if (index !== -1) {
        const item = items[index];
        
        // Filter out undefined values from updates
        const filteredUpdates: any = {};
        for (const [key, value] of Object.entries(updates)) {
          if (value !== undefined) {
            filteredUpdates[key] = value;
          }
        }
        
        const updatedItem = {
          ...item,
          ...filteredUpdates,
          id: item.id, // Preserve ID
          updated_at: new Date().toISOString()
        };
        
        // If type changed, move to new type array
        if (updates.type && updates.type !== item.type) {
          items.splice(index, 1);
          if (!storage.types[updates.type]) {
            storage.types[updates.type] = [];
          }
          storage.types[updates.type].push(updatedItem);
        } else {
          items[index] = updatedItem;
        }
        
        // Rebuild indices and save
        this.rebuildIndices(storage);
        storage.metadata.updated_at = new Date().toISOString();
        await super.write(filePath, storage);
        return;
      }
    }
    
    throw new Error(`Item with ID ${id} not found`);
  }
}