/**
 * Pattern Registry
 * Discover and instantiate workflow patterns
 */

import { WorkflowPattern } from './types';
import {
  SequentialPattern,
  ParallelPattern,
  MapReducePattern,
  SupervisorPattern,
  RAGPattern,
  DebatePattern,
  ReflectionPattern
} from './patterns';

export class PatternRegistry {
  private static patterns = new Map<string, new () => WorkflowPattern>();
  
  static {
    // Register built-in patterns
    this.register("sequential", SequentialPattern);
    this.register("parallel", ParallelPattern);
    this.register('map-reduce', MapReducePattern);
    this.register("supervisor", SupervisorPattern);
    this.register('rag', RAGPattern);
    this.register('debate', DebatePattern);
    this.register("reflection", ReflectionPattern);
  }

  /**
   * Register a new pattern
   */
  static register(name: string, PatternClass: new () => WorkflowPattern): void {
    this.patterns.set(name, PatternClass);
  }

  /**
   * Get a pattern by name
   */
  static get(name: string): WorkflowPattern | undefined {
    const PatternClass = this.patterns.get(name);
    return PatternClass ? new PatternClass() : undefined;
  }

  /**
   * Create a pattern instance
   */
  static create(name: string): WorkflowPattern {
    const pattern = this.get(name);
    if (!pattern) {
      throw new Error(`Unknown pattern: ${name}`);
    }
    return pattern;
  }

  /**
   * List all available patterns
   */
  static list(): string[] {
    return Array.from(this.patterns.keys());
  }

  /**
   * Get pattern info
   */
  static getInfo(name: string): { name: string; description: string; minAgents: number; maxAgents?: number } | undefined {
    const pattern = this.get(name);
    if (!pattern) return undefined;
    
    return {
      name: pattern.name,
      description: pattern.description,
      minAgents: pattern.minAgents,
      maxAgents: pattern.maxAgents
    };
  }

  /**
   * Get all patterns info
   */
  static getAllInfo(): Array<{ name: string; description: string; minAgents: number; maxAgents?: number }> {
    return this.list().map(name => this.getInfo(name)!);
  }

  /**
   * Find patterns that match criteria
   */
  static find(criteria: {
    minAgents?: number;
    maxAgents?: number;
    keyword?: string;
  }): string[] {
    return this.list().filter(name => {
      const info = this.getInfo(name)!;
      
      if (criteria.minAgents && info.minAgents > criteria.minAgents) {
        return false;
      }
      
      if (criteria.maxAgents && info.maxAgents && info.maxAgents > criteria.maxAgents) {
        return false;
      }
      
      if (criteria.keyword) {
        const keyword = criteria.keyword.toLowerCase();
        return info.name.toLowerCase().includes(keyword) ||
               info.description.toLowerCase().includes(keyword);
      }
      
      return true;
    });
  }
}