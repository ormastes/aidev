import { EventEmitter } from 'node:events';
import { ContextSegment } from './ContextAnalyzer';
import { OptimizationResult } from './ContextOptimizer';

export interface CacheEntry {
  id: string;
  key: string;
  context: string | Record<string, any>;
  optimizedSegments?: ContextSegment[];
  optimizationResult?: OptimizationResult;
  metadata: {
    created: Date;
    accessed: Date;
    accessCount: number;
    size: number;
    ttl?: number;
  };
}

export interface CacheConfig {
  maxSize: number; // Maximum cache size in bytes
  maxEntries: number; // Maximum number of entries
  ttl: number; // Time to live in milliseconds
  evictionPolicy: 'LRU' | 'LFU' | 'FIFO';
  persistToDisk: boolean;
  diskPath?: string;
}

export interface CacheStats {
  entries: number;
  totalSize: number;
  hits: number;
  misses: number;
  evictions: number;
  hitRate: number;
}

export class ContextCache extends EventEmitter {
  private cache: Map<string, CacheEntry>;
  private config: CacheConfig;
  private stats: CacheStats;
  private accessOrder: string[]; // For LRU
  private accessFrequency: Map<string, number>; // For LFU

  constructor(config: Partial<CacheConfig> = {}) {
    super();
    
    this.config = {
      maxSize: config.maxSize || 100 * 1024 * 1024, // 100MB default
      maxEntries: config.maxEntries || 1000,
      ttl: config.ttl || 3600000, // 1 hour default
      evictionPolicy: config.evictionPolicy || 'LRU',
      persistToDisk: config.persistToDisk || false,
      diskPath: config.diskPath
    };

    this.cache = new Map();
    this.accessOrder = [];
    this.accessFrequency = new Map();
    
    this.stats = {
      entries: 0,
      totalSize: 0,
      hits: 0,
      misses: 0,
      evictions: 0,
      hitRate: 0
    };

    if (this.config.persistToDisk) {
      this.loadFromDisk();
    }

    // Start TTL cleanup interval
    this.startTTLCleanup();
  }

  private startTTLCleanup(): void {
    setInterval(() => {
      this.evictExpired();
    }, 60000); // Check every minute
  }

  generateKey(context: string | Record<string, any>): string {
    const content = typeof context === 'string' ? context : JSON.stringify(context);
    
    // Simple hash function for key generation
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    
    return `ctx_${Math.abs(hash).toString(36)}_${content.length}`;
  }

  async get(key: string): Promise<CacheEntry | null> {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      this.updateHitRate();
      this.emit('cache:miss', { key });
      return null;
    }

    // Check TTL
    if (this.isExpired(entry)) {
      this.evictEntry(key);
      this.stats.misses++;
      this.updateHitRate();
      this.emit('cache:expired', { key });
      return null;
    }

    // Update access metadata
    entry.metadata.accessed = new Date();
    entry.metadata.accessCount++;
    
    // Update access tracking for eviction policies
    this.updateAccessTracking(key);
    
    this.stats.hits++;
    this.updateHitRate();
    this.emit('cache:hit', { key });
    
    return entry;
  }

  async set(
    key: string,
    context: string | Record<string, any>,
    optimizedSegments?: ContextSegment[],
    optimizationResult?: OptimizationResult
  ): Promise<void> {
    const size = this.calculateSize(context);
    
    // Check if we need to evict entries
    while (this.needsEviction(size)) {
      this.evictNext();
    }

    const entry: CacheEntry = {
      id: `cache_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      key,
      context,
      optimizedSegments,
      optimizationResult,
      metadata: {
        created: new Date(),
        accessed: new Date(),
        accessCount: 0,
        size,
        ttl: this.config.ttl
      }
    };

    this.cache.set(key, entry);
    this.stats.entries = this.cache.size;
    this.stats.totalSize += size;
    
    this.updateAccessTracking(key);
    this.emit('cache:set', { key, size });

    if (this.config.persistToDisk) {
      this.saveToDisk();
    }
  }

  async has(key: string): Promise<boolean> {
    return this.cache.has(key) && !this.isExpired(this.cache.get(key)!);
  }

  async delete(key: string): Promise<boolean> {
    const entry = this.cache.get(key);
    if (!entry) return false;

    this.evictEntry(key);
    this.emit('cache:delete', { key });
    return true;
  }

  async clear(): Promise<void> {
    const size = this.cache.size;
    this.cache.clear();
    this.accessOrder = [];
    this.accessFrequency.clear();
    
    this.stats = {
      entries: 0,
      totalSize: 0,
      hits: 0,
      misses: 0,
      evictions: 0,
      hitRate: 0
    };

    this.emit('cache:clear', { entriesCleared: size });

    if (this.config.persistToDisk) {
      this.saveToDisk();
    }
  }

  private calculateSize(context: string | Record<string, any>): number {
    const content = typeof context === 'string' ? context : JSON.stringify(context);
    return Buffer.byteLength(content, 'utf8');
  }

  private isExpired(entry: CacheEntry): boolean {
    if (!entry.metadata.ttl) return false;
    
    const age = Date.now() - entry.metadata.created.getTime();
    return age > entry.metadata.ttl;
  }

  private needsEviction(additionalSize: number): boolean {
    return (
      this.cache.size >= this.config.maxEntries ||
      this.stats.totalSize + additionalSize > this.config.maxSize
    );
  }

  private evictNext(): void {
    let keyToEvict: string | undefined;

    switch (this.config.evictionPolicy) {
      case 'LRU':
        keyToEvict = this.getLRUKey();
        break;
      case 'LFU':
        keyToEvict = this.getLFUKey();
        break;
      case 'FIFO':
        keyToEvict = this.getFIFOKey();
        break;
    }

    if (keyToEvict) {
      this.evictEntry(keyToEvict);
    }
  }

  private getLRUKey(): string | undefined {
    // Return least recently used key
    return this.accessOrder[0];
  }

  private getLFUKey(): string | undefined {
    // Return least frequently used key
    let minFreq = Infinity;
    let lfuKey: string | undefined;

    for (const [key, freq] of this.accessFrequency.entries()) {
      if (freq < minFreq && this.cache.has(key)) {
        minFreq = freq;
        lfuKey = key;
      }
    }

    return lfuKey;
  }

  private getFIFOKey(): string | undefined {
    // Return first inserted key
    return this.cache.keys().next().value;
  }

  private evictEntry(key: string): void {
    const entry = this.cache.get(key);
    if (!entry) return;

    this.cache.delete(key);
    this.stats.entries = this.cache.size;
    this.stats.totalSize -= entry.metadata.size;
    this.stats.evictions++;

    // Update access tracking
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
    this.accessFrequency.delete(key);

    this.emit('cache:evict', { key, reason: 'policy' });
  }

  private evictExpired(): void {
    const expired: string[] = [];
    
    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        expired.push(key);
      }
    }

    for (const key of expired) {
      this.evictEntry(key);
      this.emit('cache:evict', { key, reason: 'expired' });
    }
  }

  private updateAccessTracking(key: string): void {
    // Update for LRU
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
    this.accessOrder.push(key);

    // Update for LFU
    const freq = this.accessFrequency.get(key) || 0;
    this.accessFrequency.set(key, freq + 1);
  }

  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
  }

  getStats(): CacheStats {
    return { ...this.stats };
  }

  getEntries(): CacheEntry[] {
    return Array.from(this.cache.values());
  }

  async optimize(): Promise<void> {
    // Remove expired entries
    this.evictExpired();

    // Compact cache if needed
    if (this.stats.totalSize > this.config.maxSize * 0.9) {
      // Evict 10% of least useful entries
      const toEvict = Math.ceil(this.cache.size * 0.1);
      for (let i = 0; i < toEvict; i++) {
        this.evictNext();
      }
    }

    this.emit('cache:optimized', this.getStats());
  }

  private async loadFromDisk(): Promise<void> {
    // Implementation for loading cache from disk
    // This would require filesystem operations
    this.emit('cache:load', { source: this.config.diskPath });
  }

  private async saveToDisk(): Promise<void> {
    // Implementation for saving cache to disk
    // This would require filesystem operations
    this.emit('cache:save', { destination: this.config.diskPath });
  }

  async warmup(contexts: Array<string | Record<string, any>>): Promise<void> {
    this.emit('cache:warmup:start', { count: contexts.length });
    
    for (const context of contexts) {
      const key = this.generateKey(context);
      await this.set(key, context);
    }
    
    this.emit('cache:warmup:complete', { count: contexts.length });
  }
}