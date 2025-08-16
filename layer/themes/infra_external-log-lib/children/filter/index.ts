/**
 * Log Filter Module
 * Advanced filtering and querying of logs
 */

export type FilterOperator = 
  | 'equals' 
  | 'not_equals'
  | 'contains' 
  | 'not_contains'
  | 'starts_with' 
  | 'ends_with'
  | 'regex'
  | 'gt' 
  | 'gte' 
  | 'lt' 
  | 'lte'
  | 'in' 
  | 'not_in'
  | 'exists' 
  | 'not_exists';

export interface FilterRule {
  field: string;
  operator: FilterOperator;
  value: any;
  caseSensitive?: boolean;
}

export interface FilterGroup {
  operator: 'and' | 'or';
  rules: (FilterRule | FilterGroup)[];
}

export interface FilterConfig {
  rules?: (FilterRule | FilterGroup)[];
  presets?: FilterPreset[];
  defaultOperator?: 'and' | 'or';
  maxDepth?: number;
}

export interface FilterPreset {
  name: string;
  description?: string;
  filter: FilterGroup;
  enabled?: boolean;
}

export class LogFilter {
  private config: FilterConfig;
  private compiledFilters: Map<string, CompiledFilter>;
  private activePresets: Set<string>;

  constructor(config: FilterConfig = {}) {
    this.config = {
      defaultOperator: 'and',
      maxDepth: 10,
      ...config,
    };
    this.compiledFilters = new Map();
    this.activePresets = new Set();
    
    this.compilePresets();
  }

  filter(log: any): boolean {
    // Check preset filters first
    for (const presetName of this.activePresets) {
      const preset = this.config.presets?.find(p => p.name === presetName);
      if (preset && !this.evaluateFilterGroup(log, preset.filter)) {
        return false;
      }
    }

    // Check custom rules
    if (!this.config.rules || this.config.rules.length === 0) {
      return true;
    }

    const filterGroup: FilterGroup = {
      operator: this.config.defaultOperator || 'and',
      rules: this.config.rules,
    };

    return this.evaluateFilterGroup(log, filterGroup);
  }

  private evaluateFilterGroup(log: any, group: FilterGroup, depth: number = 0): boolean {
    if (depth > (this.config.maxDepth || 10)) {
      throw new Error('Filter depth exceeded maximum allowed depth');
    }

    const results = group.rules.map(rule => {
      if ('operator' in rule && 'rules' in rule) {
        // It's a nested group
        return this.evaluateFilterGroup(log, rule as FilterGroup, depth + 1);
      } else {
        // It's a simple rule
        return this.evaluateRule(log, rule as FilterRule);
      }
    });

    if (group.operator === 'and') {
      return results.every(r => r);
    } else {
      return results.some(r => r);
    }
  }

  private evaluateRule(log: any, rule: FilterRule): boolean {
    const fieldValue = this.getFieldValue(log, rule.field);
    
    switch (rule.operator) {
      case 'equals':
        return this.equals(fieldValue, rule.value, rule.caseSensitive);
      case 'not_equals':
        return !this.equals(fieldValue, rule.value, rule.caseSensitive);
      case 'contains':
        return this.contains(fieldValue, rule.value, rule.caseSensitive);
      case 'not_contains':
        return !this.contains(fieldValue, rule.value, rule.caseSensitive);
      case 'starts_with':
        return this.startsWith(fieldValue, rule.value, rule.caseSensitive);
      case 'ends_with':
        return this.endsWith(fieldValue, rule.value, rule.caseSensitive);
      case 'regex':
        return this.matchesRegex(fieldValue, rule.value, rule.caseSensitive);
      case 'gt':
        return this.greaterThan(fieldValue, rule.value);
      case 'gte':
        return this.greaterThanOrEqual(fieldValue, rule.value);
      case 'lt':
        return this.lessThan(fieldValue, rule.value);
      case 'lte':
        return this.lessThanOrEqual(fieldValue, rule.value);
      case 'in':
        return this.isIn(fieldValue, rule.value);
      case 'not_in':
        return !this.isIn(fieldValue, rule.value);
      case 'exists':
        return fieldValue !== undefined && fieldValue !== null;
      case 'not_exists':
        return fieldValue === undefined || fieldValue === null;
      default:
        return true;
    }
  }

  private getFieldValue(log: any, field: string): any {
    // Support nested field access with dot notation
    const parts = field.split('.');
    let value = log;

    for (const part of parts) {
      if (value === null || value === undefined) {
        return undefined;
      }
      
      // Support array index access
      const arrayMatch = part.match(/^(.+)\[(\d+)\]$/);
      if (arrayMatch) {
        const [, key, index] = arrayMatch;
        value = value[key]?.[parseInt(index, 10)];
      } else {
        value = value[part];
      }
    }

    return value;
  }

  private equals(value: any, compareValue: any, caseSensitive?: boolean): boolean {
    if (typeof value === 'string' && typeof compareValue === 'string' && !caseSensitive) {
      return value.toLowerCase() === compareValue.toLowerCase();
    }
    return value === compareValue;
  }

  private contains(value: any, searchValue: any, caseSensitive?: boolean): boolean {
    if (value === null || value === undefined) return false;
    
    const str = String(value);
    const search = String(searchValue);
    
    if (!caseSensitive) {
      return str.toLowerCase().includes(search.toLowerCase());
    }
    return str.includes(search);
  }

  private startsWith(value: any, searchValue: any, caseSensitive?: boolean): boolean {
    if (value === null || value === undefined) return false;
    
    const str = String(value);
    const search = String(searchValue);
    
    if (!caseSensitive) {
      return str.toLowerCase().startsWith(search.toLowerCase());
    }
    return str.startsWith(search);
  }

  private endsWith(value: any, searchValue: any, caseSensitive?: boolean): boolean {
    if (value === null || value === undefined) return false;
    
    const str = String(value);
    const search = String(searchValue);
    
    if (!caseSensitive) {
      return str.toLowerCase().endsWith(search.toLowerCase());
    }
    return str.endsWith(search);
  }

  private matchesRegex(value: any, pattern: string, caseSensitive?: boolean): boolean {
    if (value === null || value === undefined) return false;
    
    try {
      const flags = caseSensitive ? '' : 'i';
      const regex = new RegExp(pattern, flags);
      return regex.test(String(value));
    } catch {
      return false;
    }
  }

  private greaterThan(value: any, compareValue: any): boolean {
    if (value === null || value === undefined) return false;
    return value > compareValue;
  }

  private greaterThanOrEqual(value: any, compareValue: any): boolean {
    if (value === null || value === undefined) return false;
    return value >= compareValue;
  }

  private lessThan(value: any, compareValue: any): boolean {
    if (value === null || value === undefined) return false;
    return value < compareValue;
  }

  private lessThanOrEqual(value: any, compareValue: any): boolean {
    if (value === null || value === undefined) return false;
    return value <= compareValue;
  }

  private isIn(value: any, list: any[]): boolean {
    if (!Array.isArray(list)) return false;
    return list.includes(value);
  }

  private compilePresets(): void {
    if (!this.config.presets) return;

    for (const preset of this.config.presets) {
      if (preset.enabled !== false) {
        this.activePresets.add(preset.name);
      }
      
      // Pre-compile regex patterns for performance
      this.compileFilterGroup(preset.name, preset.filter);
    }
  }

  private compileFilterGroup(id: string, group: FilterGroup): void {
    for (const rule of group.rules) {
      if ('operator' in rule && 'rules' in rule) {
        this.compileFilterGroup(`${id}_nested`, rule as FilterGroup);
      } else {
        const filterRule = rule as FilterRule;
        if (filterRule.operator === 'regex') {
          const key = `${id}_${filterRule.field}_${filterRule.value}`;
          if (!this.compiledFilters.has(key)) {
            try {
              const flags = filterRule.caseSensitive ? '' : 'i';
              const regex = new RegExp(filterRule.value, flags);
              this.compiledFilters.set(key, { regex, rule: filterRule });
            } catch (error) {
              console.error(`Failed to compile regex filter: ${filterRule.value}`, error);
            }
          }
        }
      }
    }
  }

  enablePreset(name: string): void {
    const preset = this.config.presets?.find(p => p.name === name);
    if (preset) {
      this.activePresets.add(name);
      preset.enabled = true;
    }
  }

  disablePreset(name: string): void {
    this.activePresets.delete(name);
    const preset = this.config.presets?.find(p => p.name === name);
    if (preset) {
      preset.enabled = false;
    }
  }

  addRule(rule: FilterRule | FilterGroup): void {
    if (!this.config.rules) {
      this.config.rules = [];
    }
    this.config.rules.push(rule);
  }

  removeRule(index: number): void {
    if (this.config.rules && index >= 0 && index < this.config.rules.length) {
      this.config.rules.splice(index, 1);
    }
  }

  clearRules(): void {
    this.config.rules = [];
  }

  getActiveFilters(): { rules: (FilterRule | FilterGroup)[]; presets: string[] } {
    return {
      rules: this.config.rules || [],
      presets: Array.from(this.activePresets),
    };
  }

  static createErrorFilter(): FilterPreset {
    return {
      name: 'errors',
      description: 'Filter for error and fatal logs',
      filter: {
        operator: 'or',
        rules: [
          { field: 'level', operator: 'equals', value: 'error' },
          { field: 'level', operator: 'equals', value: 'fatal' },
        ],
      },
    };
  }

  static createTimeRangeFilter(start: Date, end: Date): FilterPreset {
    return {
      name: 'timeRange',
      description: `Logs between ${start.toISOString()} and ${end.toISOString()}`,
      filter: {
        operator: 'and',
        rules: [
          { field: 'timestamp', operator: 'gte', value: start },
          { field: 'timestamp', operator: 'lte', value: end },
        ],
      },
    };
  }

  static createSourceFilter(sources: string[]): FilterPreset {
    return {
      name: 'sources',
      description: `Logs from sources: ${sources.join(', ')}`,
      filter: {
        operator: 'or',
        rules: sources.map(source => ({
          field: 'source',
          operator: 'equals' as FilterOperator,
          value: source,
        })),
      },
    };
  }
}

interface CompiledFilter {
  regex: RegExp;
  rule: FilterRule;
}

export default LogFilter;