/**
 * Context Window Manager
 * Manages context window and token optimization
 */

import { EventEmitter } from 'node:events';

export interface ContextWindow {
  id: string;
  maxTokens: number;
  usedTokens: number;
  items: ContextItem[];
  strategy: ContextStrategy;
  metadata?: ContextMetadata;
}

export interface ContextItem {
  id: string;
  type: 'message' | "document" | 'memory' | 'tool_result' | 'system';
  content: string;
  tokens: number;
  priority: ContextPriority;
  timestamp: Date;
  metadata?: {
    source?: string;
    relevance?: number;
    persistent?: boolean;
    compressed?: boolean;
  };
}

export type ContextStrategy = 
  | 'fifo'      // First In First Out
  | 'lifo'      // Last In First Out
  | "priority"  // Priority-based
  | "relevance" // Relevance-based
  | 'sliding'   // Sliding window
  | "adaptive"; // Adaptive compression

export type ContextPriority = "critical" | 'high' | 'medium' | 'low' | "optional";

export interface ContextMetadata {
  model: string;
  temperature?: number;
  compressionRatio?: number;
  lastOptimized?: Date;
  stats?: ContextStats;
}

export interface ContextToken {
  text: string;
  tokens: number;
  type?: 'text' | 'code' | 'special';
}

export interface TokenCount {
  text: number;
  code: number;
  special: number;
  total: number;
}

export interface ContextStats {
  totalItems: number;
  totalTokens: number;
  compressionRatio: number;
  evictedItems: number;
  averageRelevance: number;
}

export class ContextManager extends EventEmitter {
  private windows: Map<string, ContextWindow>;
  private activeWindow?: ContextWindow;
  private compressionCache: Map<string, string>;
  private tokenizer: Tokenizer;

  constructor() {
    super();
    this.windows = new Map();
    this.compressionCache = new Map();
    this.tokenizer = new Tokenizer();
  }

  createWindow(config: {
    maxTokens: number;
    strategy?: ContextStrategy;
    metadata?: ContextMetadata;
  }): ContextWindow {
    const id = this.generateId();
    const window: ContextWindow = {
      id,
      maxTokens: config.maxTokens,
      usedTokens: 0,
      items: [],
      strategy: config.strategy || 'sliding',
      metadata: config.metadata,
    };

    this.windows.set(id, window);
    this.activeWindow = window;
    
    this.emit("windowCreated", window);
    return window;
  }

  addItem(
    content: string | ContextItem,
    options?: {
      type?: ContextItem['type'];
      priority?: ContextPriority;
      metadata?: ContextItem["metadata"];
      windowId?: string;
    }
  ): ContextItem {
    const window = options?.windowId 
      ? this.windows.get(options.windowId)
      : this.activeWindow;
    
    if (!window) {
      throw new Error('No active context window');
    }

    const item: ContextItem = typeof content === 'string'
      ? {
          id: this.generateItemId(),
          type: options?.type || 'message',
          content,
          tokens: this.tokenizer.count(content),
          priority: options?.priority || 'medium',
          timestamp: new Date(),
          metadata: options?.metadata,
        }
      : content;

    // Check if item fits
    if (window.usedTokens + item.tokens > window.maxTokens) {
      this.optimizeWindow(window);
      
      // Check again after optimization
      if (window.usedTokens + item.tokens > window.maxTokens) {
        this.makeRoom(window, item.tokens);
      }
    }

    window.items.push(item);
    window.usedTokens += item.tokens;
    
    this.emit("itemAdded", { window, item });
    return item;
  }

  private makeRoom(window: ContextWindow, requiredTokens: number): void {
    const targetTokens = window.maxTokens - requiredTokens;
    
    switch (window.strategy) {
      case 'fifo':
        this.evictFIFO(window, targetTokens);
        break;
      case 'lifo':
        this.evictLIFO(window, targetTokens);
        break;
      case "priority":
        this.evictByPriority(window, targetTokens);
        break;
      case "relevance":
        this.evictByRelevance(window, targetTokens);
        break;
      case 'sliding':
        this.evictSliding(window, targetTokens);
        break;
      case "adaptive":
        this.evictAdaptive(window, targetTokens);
        break;
    }
  }

  private evictFIFO(window: ContextWindow, targetTokens: number): void {
    while (window.usedTokens > targetTokens && window.items.length > 0) {
      const item = window.items.shift();
      if (item && !item.metadata?.persistent) {
        window.usedTokens -= item.tokens;
        this.emit("itemEvicted", { window, item, reason: 'fifo' });
      }
    }
  }

  private evictLIFO(window: ContextWindow, targetTokens: number): void {
    while (window.usedTokens > targetTokens && window.items.length > 0) {
      const item = window.items.pop();
      if (item && !item.metadata?.persistent) {
        window.usedTokens -= item.tokens;
        this.emit("itemEvicted", { window, item, reason: 'lifo' });
      }
    }
  }

  private evictByPriority(window: ContextWindow, targetTokens: number): void {
    const priorityOrder: ContextPriority[] = ["optional", 'low', 'medium', 'high', "critical"];
    
    for (const priority of priorityOrder) {
      const candidates = window.items
        .filter(item => item.priority === priority && !item.metadata?.persistent)
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      
      for (const item of candidates) {
        if (window.usedTokens <= targetTokens) break;
        
        const index = window.items.indexOf(item);
        if (index !== -1) {
          window.items.splice(index, 1);
          window.usedTokens -= item.tokens;
          this.emit("itemEvicted", { window, item, reason: "priority" });
        }
      }
    }
  }

  private evictByRelevance(window: ContextWindow, targetTokens: number): void {
    const sortedItems = [...window.items]
      .filter(item => !item.metadata?.persistent)
      .sort((a, b) => {
        const relevanceA = a.metadata?.relevance || 0;
        const relevanceB = b.metadata?.relevance || 0;
        return relevanceA - relevanceB;
      });
    
    for (const item of sortedItems) {
      if (window.usedTokens <= targetTokens) break;
      
      const index = window.items.indexOf(item);
      if (index !== -1) {
        window.items.splice(index, 1);
        window.usedTokens -= item.tokens;
        this.emit("itemEvicted", { window, item, reason: "relevance" });
      }
    }
  }

  private evictSliding(window: ContextWindow, targetTokens: number): void {
    // Keep most recent items, evict oldest non-persistent items
    const sortedItems = [...window.items]
      .filter(item => !item.metadata?.persistent)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    
    for (const item of sortedItems) {
      if (window.usedTokens <= targetTokens) break;
      
      const index = window.items.indexOf(item);
      if (index !== -1) {
        window.items.splice(index, 1);
        window.usedTokens -= item.tokens;
        this.emit("itemEvicted", { window, item, reason: 'sliding' });
      }
    }
  }

  private evictAdaptive(window: ContextWindow, targetTokens: number): void {
    // First, try compression
    this.compressWindow(window);
    
    if (window.usedTokens <= targetTokens) return;
    
    // Then evict based on composite score
    const scoredItems = window.items
      .filter(item => !item.metadata?.persistent)
      .map(item => ({
        item,
        score: this.calculateEvictionScore(item),
      }))
      .sort((a, b) => b.score - a.score);
    
    for (const { item } of scoredItems) {
      if (window.usedTokens <= targetTokens) break;
      
      const index = window.items.indexOf(item);
      if (index !== -1) {
        window.items.splice(index, 1);
        window.usedTokens -= item.tokens;
        this.emit("itemEvicted", { window, item, reason: "adaptive" });
      }
    }
  }

  private calculateEvictionScore(item: ContextItem): number {
    let score = 0;
    
    // Priority score
    const priorityScores = {
      critical: 0,
      high: 20,
      medium: 40,
      low: 60,
      optional: 80,
    };
    score += priorityScores[item.priority];
    
    // Age score (older = higher score = more likely to evict)
    const age = Date.now() - item.timestamp.getTime();
    score += Math.min(age / 60000, 50); // Max 50 points for age
    
    // Relevance score (lower relevance = higher score)
    if (item.metadata?.relevance !== undefined) {
      score += (1 - item.metadata.relevance) * 30;
    }
    
    // Size penalty (larger items get slight preference for eviction)
    score += Math.min(item.tokens / 100, 20);
    
    return score;
  }

  optimizeWindow(window: ContextWindow): void {
    const before = window.usedTokens;
    
    // Compress items
    this.compressWindow(window);
    
    // Deduplicate
    this.deduplicateWindow(window);
    
    // Recalculate tokens
    this.recalculateTokens(window);
    
    const after = window.usedTokens;
    const saved = before - after;
    
    if (window.metadata) {
      window.metadata.lastOptimized = new Date();
      window.metadata.compressionRatio = after / before;
    }
    
    this.emit("windowOptimized", { window, saved });
  }

  private compressWindow(window: ContextWindow): void {
    for (const item of window.items) {
      if (item.metadata?.compressed) continue;
      
      const compressed = this.compressText(item.content);
      if (compressed.length < item.content.length * 0.8) {
        const oldTokens = item.tokens;
        item.content = compressed;
        item.tokens = this.tokenizer.count(compressed);
        item.metadata = { ...item.metadata, compressed: true };
        
        window.usedTokens += item.tokens - oldTokens;
      }
    }
  }

  private compressText(text: string): string {
    // Simple compression strategies
    let compressed = text;
    
    // Remove excessive whitespace
    compressed = compressed.replace(/\s+/g, ' ');
    
    // Remove code comments (careful with this)
    compressed = compressed.replace(/\/\*[\s\S]*?\*\//g, '');
    compressed = compressed.replace(/\/\/.*/g, '');
    
    // Truncate repeated content
    const lines = compressed.split('\n');
    const unique = new Set<string>();
    const result: string[] = [];
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !unique.has(trimmed)) {
        unique.add(trimmed);
        result.push(line);
      }
    }
    
    return result.join('\n');
  }

  private deduplicateWindow(window: ContextWindow): void {
    const seen = new Map<string, ContextItem>();
    const newItems: ContextItem[] = [];
    let newTokens = 0;
    
    for (const item of window.items) {
      const key = this.getItemKey(item);
      const existing = seen.get(key);
      
      if (!existing || item.timestamp > existing.timestamp) {
        if (existing) {
          const index = newItems.indexOf(existing);
          if (index !== -1) {
            newTokens -= existing.tokens;
            newItems.splice(index, 1);
          }
        }
        
        seen.set(key, item);
        newItems.push(item);
        newTokens += item.tokens;
      }
    }
    
    window.items = newItems;
    window.usedTokens = newTokens;
  }

  private getItemKey(item: ContextItem): string {
    // Create a key for deduplication
    const contentHash = this.simpleHash(item.content);
    return `${item.type}_${contentHash}`;
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  }

  private recalculateTokens(window: ContextWindow): void {
    window.usedTokens = window.items.reduce((sum, item) => sum + item.tokens, 0);
  }

  getWindow(id: string): ContextWindow | undefined {
    return this.windows.get(id);
  }

  getActiveWindow(): ContextWindow | undefined {
    return this.activeWindow;
  }

  setActiveWindow(id: string): boolean {
    const window = this.windows.get(id);
    if (window) {
      this.activeWindow = window;
      this.emit("windowActivated", window);
      return true;
    }
    return false;
  }

  clearWindow(windowId?: string): void {
    const window = windowId ? this.windows.get(windowId) : this.activeWindow;
    if (!window) return;
    
    window.items = [];
    window.usedTokens = 0;
    
    this.emit("windowCleared", window);
  }

  deleteWindow(id: string): boolean {
    const window = this.windows.get(id);
    if (!window) return false;
    
    this.windows.delete(id);
    
    if (this.activeWindow?.id === id) {
      this.activeWindow = undefined;
    }
    
    this.emit("windowDeleted", window);
    return true;
  }

  exportWindow(windowId?: string): string {
    const window = windowId ? this.windows.get(windowId) : this.activeWindow;
    if (!window) throw new Error('No window to export');
    
    return JSON.stringify(window, null, 2);
  }

  importWindow(data: string): ContextWindow {
    const parsed = JSON.parse(data);
    const window: ContextWindow = {
      ...parsed,
      id: parsed.id || this.generateId(),
      items: parsed.items || [],
    };
    
    this.windows.set(window.id, window);
    this.emit("windowImported", window);
    
    return window;
  }

  getStats(windowId?: string): ContextStats {
    const window = windowId ? this.windows.get(windowId) : this.activeWindow;
    if (!window) {
      return {
        totalItems: 0,
        totalTokens: 0,
        compressionRatio: 1,
        evictedItems: 0,
        averageRelevance: 0,
      };
    }
    
    const relevances = window.items
      .map(item => item.metadata?.relevance || 0.5)
      .filter(r => r !== undefined);
    
    return {
      totalItems: window.items.length,
      totalTokens: window.usedTokens,
      compressionRatio: window.metadata?.compressionRatio || 1,
      evictedItems: 0, // Would need to track this
      averageRelevance: relevances.length > 0
        ? relevances.reduce((a, b) => a + b, 0) / relevances.length
        : 0,
    };
  }

  private generateId(): string {
    return `window_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateItemId(): string {
    return `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

class Tokenizer {
  // Simplified tokenizer - in production, use proper tokenizer like tiktoken
  count(text: string): number {
    // Rough estimate: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }

  tokenize(text: string): ContextToken[] {
    // Simple word-based tokenization
    const words = text.split(/\s+/);
    return words.map(word => ({
      text: word,
      tokens: this.count(word),
      type: this.detectType(word),
    }));
  }

  private detectType(text: string): 'text' | 'code' | 'special' {
    if (/^[a-zA-Z]+$/.test(text)) return 'text';
    if (/^[{}()\[\];,.]$/.test(text)) return 'code';
    return 'special';
  }
}

export default ContextManager;