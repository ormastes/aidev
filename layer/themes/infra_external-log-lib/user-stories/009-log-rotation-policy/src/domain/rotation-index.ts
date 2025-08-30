/**
 * Rotation Index Implementation
 * Maintains searchable metadata for all rotated log files
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import {
  IRotationIndex,
  RotationMetadata,
  RotationIndex as RotationIndexData,
  RotationQuery
} from './interfaces';

export class RotationIndex implements IRotationIndex {
  private readonly indexPath: string;
  private indexCache: RotationIndexData | null = null;
  private readonly lockMap: Map<string, Promise<void>> = new Map();

  constructor(indexPath: string) {
    this.indexPath = indexPath;
  }

  async addRotation(metadata: RotationMetadata): Promise<void> {
    return this.withLock('write', async () => {
      const index = await this.getIndex();
      
      // Remove any existing rotation with the same ID
      index.rotatedFiles = index.rotatedFiles.filter(r => r.id !== metadata.id);
      
      // Add new rotation metadata
      index.rotatedFiles.push(metadata);
      
      // Update statistics
      this.updateStatistics(index);
      
      // Update timestamp
      index.lastUpdated = new Date();
      
      // Save to file
      await this.saveIndex(index);
      
      // Update cache
      this.indexCache = index;
    });
  }

  async removeRotation(id: string): Promise<void> {
    return this.withLock('write', async () => {
      const index = await this.getIndex();
      
      const originalLength = index.rotatedFiles.length;
      index.rotatedFiles = index.rotatedFiles.filter(r => r.id !== id);
      
      if (index.rotatedFiles.length < originalLength) {
        // Update statistics
        this.updateStatistics(index);
        
        // Update timestamp
        index.lastUpdated = new Date();
        
        // Save to file
        await this.saveIndex(index);
        
        // Update cache
        this.indexCache = index;
      }
    });
  }

  async findRotations(query: RotationQuery): Promise<RotationMetadata[]> {
    const index = await this.getIndex();
    let results = [...index.rotatedFiles];

    // Apply filters
    if (query.originalFile) {
      results = results.filter(r => r.originalFile === query.originalFile);
    }

    if (query.dateRange) {
      results = results.filter(r => {
        const rotationTime = r.rotationTimestamp;
        return rotationTime >= query.dateRange!.start && rotationTime <= query.dateRange!.end;
      });
    }

    if (query.policies && query.policies.length > 0) {
      results = results.filter(r => 
        query.policies!.some(policy => r.policyApplied.includes(policy))
      );
    }

    if (query.compressed !== undefined) {
      results = results.filter(r => (r.compressedFile !== undefined) === query.compressed);
    }

    // Sort by rotation timestamp (newest first)
    results.sort((a, b) => b.rotationTimestamp.getTime() - a.rotationTimestamp.getTime());

    // Apply pagination
    if (query.offset !== undefined) {
      results = results.slice(query.offset);
    }

    if (query.limit !== undefined) {
      results = results.slice(0, query.limit);
    }

    return results;
  }

  async getStatistics(): Promise<RotationIndexData['statistics']> {
    const index = await this.getIndex();
    return index.statistics;
  }

  async getIndex(): Promise<RotationIndexData> {
    if (this.indexCache) {
      return { ...this.indexCache };
    }

    return this.withLock('read', async () => {
      if (this.indexCache) {
        return { ...this.indexCache };
      }

      try {
        const indexData = await fs.readFile(this.indexPath, 'utf-8');
        const index = JSON.parse(indexData, this.jsonReviver);
        this.indexCache = index;
        return { ...index };
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
          // Create new index if file doesn't exist
          const newIndex = this.createEmptyIndex();
          await this.saveIndex(newIndex);
          this.indexCache = newIndex;
          return { ...newIndex };
        }
        throw error;
      }
    });
  }

  async updateIndex(index: RotationIndexData): Promise<void> {
    return this.withLock('write', async () => {
      // Update statistics
      this.updateStatistics(index);
      
      // Update timestamp
      index.lastUpdated = new Date();
      
      // Save to file
      await this.saveIndex(index);
      
      // Update cache
      this.indexCache = index;
    });
  }

  private async saveIndex(index: RotationIndexData): Promise<void> {
    // Ensure directory exists
    await fs.mkdir(path.dirname(this.indexPath), { recursive: true });
    
    // Write with atomic operation (write to temp file, then rename)
    const tempPath = `${this.indexPath}.tmp`;
    const indexData = JSON.stringify(index, this.jsonReplacer, 2);
    
    await fs.writeFile(tempPath, indexData, 'utf-8');
    await fs.rename(tempPath, this.indexPath);
  }

  private createEmptyIndex(): RotationIndexData {
    return {
      indexVersion: '1.0.0',
      lastUpdated: new Date(),
      rotatedFiles: [],
      statistics: {
        totalFiles: 0,
        totalOriginalSize: 0,
        totalCompressedSize: 0,
        averageCompressionRatio: 0
      }
    };
  }

  private updateStatistics(index: RotationIndexData): void {
    const { rotatedFiles } = index;
    
    index.statistics = {
      totalFiles: rotatedFiles.length,
      totalOriginalSize: rotatedFiles.reduce((sum, r) => sum + r.originalSize, 0),
      totalCompressedSize: rotatedFiles.reduce((sum, r) => sum + (r.compressedSize || r.originalSize), 0),
      averageCompressionRatio: this.calculateAverageCompressionRatio(rotatedFiles)
    };
  }

  private calculateAverageCompressionRatio(rotatedFiles: RotationMetadata[]): number {
    const compressedFiles = rotatedFiles.filter(r => r.compressionRatio !== undefined);
    
    if (compressedFiles.length === 0) {
      return 0;
    }
    
    const totalRatio = compressedFiles.reduce((sum, r) => sum + (r.compressionRatio || 0), 0);
    return totalRatio / compressedFiles.length;
  }

  private async withLock<T>(operation: string, fn: () => Promise<T>): Promise<T> {
    const lockKey = `${operation}-${Date.now()}`;
    
    // Wait for any existing locks to complete
    while (this.lockMap.size > 0) {
      await Promise.all(this.lockMap.values());
    }
    
    // Acquire lock
    let resolve: () => void;
    const lockPromise = new Promise<void>(r => { resolve = r; });
    this.lockMap.set(lockKey, lockPromise);
    
    try {
      const result = await fn();
      return result;
    } finally {
      // Release lock
      this.lockMap.delete(lockKey);
      resolve!();
    }
  }

  private jsonReplacer(key: string, value: any): any {
    // Convert Date objects to ISO strings for JSON serialization
    if (value instanceof Date) {
      return { __type: 'Date', value: value.toISOString() };
    }
    return value;
  }

  private jsonReviver(key: string, value: any): any {
    // Convert ISO strings back to Date objects
    if (value && typeof value === 'object' && value.__type === 'Date') {
      return new Date(value.value);
    }
    return value;
  }
}