/**
 * Basic node implementations for PocketFlow
 */

import { Node, NodeInput, NodeOutput } from './types';

export class InputNode implements Node {
  constructor(
    public id: string,
    public type: string = 'input'
  ) {}

  async execute(input: NodeInput): Promise<NodeOutput> {
    // For input nodes, pass through the data as-is
    return {
      data: input.data,
      success: true
    };
  }
}

export class TransformNode implements Node {
  constructor(
    public id: string,
    private transform: (data: any) => any,
    public type: string = "transform"
  ) {}

  async execute(input: NodeInput): Promise<NodeOutput> {
    try {
      const transformed = this.transform(input.data);
      return {
        data: transformed,
        success: true
      };
    } catch (error) {
      return {
        data: null,
        success: false,
        error: error as Error
      };
    }
  }
}

export class FilterNode implements Node {
  constructor(
    public id: string,
    private predicate: (data: any) => boolean,
    public type: string = 'filter'
  ) {}

  async execute(input: NodeInput): Promise<NodeOutput> {
    try {
      // Handle array filtering
      if (Array.isArray(input.data)) {
        const filtered = input.data.filter(this.predicate);
        return {
          data: filtered,
          success: true
        };
      }
      
      // Handle single item filtering
      const success = this.predicate(input.data);
      return {
        data: success ? input.data : null,
        success: true
      };
    } catch (error) {
      return {
        data: null,
        success: false,
        error: error as Error
      };
    }
  }
}

export class MapNode implements Node {
  constructor(
    public id: string,
    private mapper: (item: any) => any,
    public type: string = 'map'
  ) {}

  async execute(input: NodeInput): Promise<NodeOutput> {
    try {
      if (!Array.isArray(input.data)) {
        throw new Error('MapNode requires array input');
      }
      
      const mapped = input.data.map(this.mapper);
      return {
        data: mapped,
        success: true
      };
    } catch (error) {
      return {
        data: null,
        success: false,
        error: error as Error
      };
    }
  }
}

export class ReduceNode implements Node {
  constructor(
    public id: string,
    private reducer: (acc: any, item: any) => any,
    private initialValue: any = null,
    public type: string = 'reduce'
  ) {}

  async execute(input: NodeInput): Promise<NodeOutput> {
    try {
      if (!Array.isArray(input.data)) {
        throw new Error('ReduceNode requires array input');
      }
      
      const reduced = input.data.reduce(this.reducer, this.initialValue);
      return {
        data: reduced,
        success: true
      };
    } catch (error) {
      return {
        data: null,
        success: false,
        error: error as Error
      };
    }
  }
}

export class OutputNode implements Node {
  constructor(
    public id: string,
    public type: string = 'output'
  ) {}

  async execute(input: NodeInput): Promise<NodeOutput> {
    // Store in context for retrieval
    input.context.variables.set('output', input.data);
    return {
      data: input.data,
      success: true
    };
  }
}

export class DelayNode implements Node {
  constructor(
    public id: string,
    private delayMs: number,
    public type: string = 'delay'
  ) {}

  async execute(input: NodeInput): Promise<NodeOutput> {
    await new Promise(resolve => setTimeout(resolve, this.delayMs));
    return {
      data: input.data,
      success: true
    };
  }
}

export class ConditionalNode implements Node {
  constructor(
    public id: string,
    private condition: (data: any) => boolean,
    private trueValue: any,
    private falseValue: any,
    public type: string = "conditional"
  ) {}

  async execute(input: NodeInput): Promise<NodeOutput> {
    try {
      const result = this.condition(input.data) ? this.trueValue : this.falseValue;
      return {
        data: result,
        success: true
      };
    } catch (error) {
      return {
        data: null,
        success: false,
        error: error as Error
      };
    }
  }
}