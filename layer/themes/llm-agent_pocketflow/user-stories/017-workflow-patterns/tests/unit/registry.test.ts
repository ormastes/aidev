import { PatternRegistry } from '../../src/registry';
import { BasePattern } from '../../src/base-pattern';
import { PocketFlow } from '../../../015-pocketflow-core/src/core';
import { Agent } from '../../../016-agent-abstraction/src/types';

// Test pattern implementation
class TestPattern extends BasePattern {
  name = 'test';
  description = 'Test pattern';
  minAgents = 1;
  maxAgents = 3;

  build(_agents: Agent[]): PocketFlow {
    return new PocketFlow();
  }
}

describe('PatternRegistry', () => {
  describe('Built-in Patterns', () => {
    it('should have all built-in patterns registered', () => {
      const patterns = PatternRegistry.list();
      
      expect(patterns).toContain('sequential');
      expect(patterns).toContain('parallel');
      expect(patterns).toContain('map-reduce');
      expect(patterns).toContain('supervisor');
      expect(patterns).toContain('rag');
      expect(patterns).toContain('debate');
      expect(patterns).toContain('reflection');
    });

    it('should get pattern by name', () => {
      const sequential = PatternRegistry.get('sequential');
      expect(sequential).toBeDefined();
      expect(sequential?.name).toBe('sequential');
    });

    it('should return undefined for unknown pattern', () => {
      const unknown = PatternRegistry.get('unknown');
      expect(unknown).toBeUndefined();
    });

    it('should create pattern instance', () => {
      const pattern = PatternRegistry.create('parallel');
      expect(pattern).toBeDefined();
      expect(pattern.name).toBe('parallel');
    });

    it('should throw for unknown pattern creation', () => {
      expect(() => PatternRegistry.create('unknown')).toThrow('Unknown pattern: unknown');
    });
  });

  describe('Pattern Registration', () => {
    beforeEach(() => {
      // Remove test pattern if it exists
      const patterns = PatternRegistry.list();
      if (patterns.includes('test')) {
        // Can't remove, so we'll just skip
      }
    });

    it('should register custom pattern', () => {
      PatternRegistry.register('custom-test', TestPattern);
      
      const pattern = PatternRegistry.get('custom-test');
      expect(pattern).toBeDefined();
      expect(pattern?.name).toBe('test');
    });
  });

  describe('Pattern Info', () => {
    it('should get pattern info', () => {
      const info = PatternRegistry.getInfo('sequential');
      
      expect(info).toBeDefined();
      expect(info?.name).toBe('sequential');
      expect(info?.description).toContain('sequence');
      expect(info?.minAgents).toBe(2);
    });

    it('should get all patterns info', () => {
      const allInfo = PatternRegistry.getAllInfo();
      
      expect(allInfo.length).toBeGreaterThanOrEqual(7);
      expect(allInfo.every(info => info.name && info.description)).toBe(true);
    });
  });

  describe('Pattern Search', () => {
    it('should find patterns by min agents', () => {
      const patterns = PatternRegistry.find({ minAgents: 1 });
      
      expect(patterns).toContain('rag');
      expect(patterns).toContain('reflection');
      expect(patterns).toContain('map-reduce');
    });

    it('should find patterns by max agents', () => {
      const patterns = PatternRegistry.find({ maxAgents: 2 });
      
      expect(patterns).toContain('rag'); // max 2
      expect(patterns).not.toContain('debate'); // max 5
    });

    it('should find patterns by keyword', () => {
      const patterns = PatternRegistry.find({ keyword: 'parallel' });
      
      expect(patterns).toContain('parallel');
      
      const ragPatterns = PatternRegistry.find({ keyword: 'retrieval' });
      expect(ragPatterns).toContain('rag');
    });

    it('should combine search criteria', () => {
      const patterns = PatternRegistry.find({
        minAgents: 1,
        keyword: 'generate'
      });
      
      expect(patterns.length).toBeGreaterThan(0);
    });
  });
});