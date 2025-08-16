/**
 * Memory implementations for agents
 * Provides different strategies for agent state management
 */

import { Memory } from './types';

/**
 * In-memory storage (cleared on restart)
 */
export class InMemoryStorage implements Memory {
  private storage = new Map<string, any>();

  async store(key: string, value: any): Promise<void> {
    this.storage.set(key, value);
  }

  async retrieve(key: string): Promise<any> {
    return this.storage.get(key);
  }

  forget(key: string): Promise<void> {
    this.storage.delete(key);
  }

  async clear(): Promise<void> {
    this.storage.clear();
  }
}

/**
 * Conversation memory that maintains message history
 */
export class ConversationMemory implements Memory {
  private messages: any[] = [];
  private maxMessages: number;

  constructor(maxMessages = 100) {
    this.maxMessages = maxMessages;
  }

  async store(key: string, value: any): Promise<void> {
    if (key === 'messages') {
      this.messages = value;
      // Trim to max size
      if (this.messages.length > this.maxMessages) {
        this.messages = this.messages.slice(-this.maxMessages);
      }
    }
  }

  async retrieve(key: string): Promise<any> {
    if (key === 'messages') {
      return this.messages.length > 0 ? this.messages : undefined;
    }
    return undefined;
  }

  forget(key: string): Promise<void> {
    if (key === 'messages') {
      this.messages = [];
    }
  }

  async clear(): Promise<void> {
    this.messages = [];
  }

  // Conversation-specific methods
  addMessage(message: any): void {
    this.messages.push(message);
    if (this.messages.length > this.maxMessages) {
      this.messages.shift();
    }
  }

  getMessages(): any[] {
    return [...this.messages];
  }

  getRecentMessages(count: number): any[] {
    return this.messages.slice(-count);
  }
}

/**
 * Summary memory that stores key facts
 */
export class SummaryMemory implements Memory {
  private facts = new Map<string, string>();
  private summaries = new Map<string, string>();

  async store(key: string, value: any): Promise<void> {
    if (key.startsWith('fact:')) {
      this.facts.set(key.substring(5), String(value));
    } else if (key.startsWith('summary:')) {
      this.summaries.set(key.substring(8), String(value));
    }
  }

  async retrieve(key: string): Promise<any> {
    if (key === 'all_facts') {
      return Object.fromEntries(this.facts);
    } else if (key === 'all_summaries') {
      return Object.fromEntries(this.summaries);
    } else if (key.startsWith('fact:')) {
      return this.facts.get(key.substring(5));
    } else if (key.startsWith('summary:')) {
      return this.summaries.get(key.substring(8));
    }
    return undefined;
  }

  forget(key: string): Promise<void> {
    if (key.startsWith('fact:')) {
      this.facts.delete(key.substring(5));
    } else if (key.startsWith('summary:')) {
      this.summaries.delete(key.substring(8));
    }
  }

  async clear(): Promise<void> {
    this.facts.clear();
    this.summaries.clear();
  }

  // Summary-specific methods
  addFact(topic: string, fact: string): void {
    this.facts.set(topic, fact);
  }

  addSummary(topic: string, summary: string): void {
    this.summaries.set(topic, summary);
  }

  getFacts(): Map<string, string> {
    return new Map(this.facts);
  }

  getSummaries(): Map<string, string> {
    return new Map(this.summaries);
  }
}

/**
 * Composite memory that combines multiple strategies
 */
export class CompositeMemory implements Memory {
  private stores: Map<string, Memory> = new Map();

  addStore(name: string, store: Memory): void {
    this.stores.set(name, store);
  }

  async store(key: string, value: any): Promise<void> {
    // Route to appropriate store based on key prefix
    const [storeName, ...keyParts] = key.split(':');
    const actualKey = keyParts.join(':') || key;
    
    const store = this.stores.get(storeName) || this.stores.get('default');
    if (store) {
      await store.store(actualKey, value);
    }
  }

  async retrieve(key: string): Promise<any> {
    const [storeName, ...keyParts] = key.split(':');
    const actualKey = keyParts.join(':') || key;
    
    const store = this.stores.get(storeName) || this.stores.get('default');
    if (store) {
      return store.retrieve(actualKey);
    }
    return undefined;
  }

  forget(key: string): Promise<void> {
    const [storeName, ...keyParts] = key.split(':');
    const actualKey = keyParts.join(':') || key;
    
    const store = this.stores.get(storeName) || this.stores.get('default');
    if (store) {
      await store.forget(actualKey);
    }
  }

  async clear(): Promise<void> {
    for (const store of this.stores.values()) {
      await store.clear();
    }
  }
}