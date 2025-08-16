import { Pipe, PipeMetadata, PipeRegistry } from '../interfaces/pipe';

export class PipeRegistryImpl implements PipeRegistry {
  private pipes: Map<string, Pipe> = new Map();
  private metadata: Map<string, PipeMetadata> = new Map();

  register<T extends Pipe>(name: string, pipe: T): void {
    if (this.pipes.has(name)) {
      throw new Error(`Pipe ${name} is already registered`);
    }

    this.pipes.set(name, pipe);
    this.metadata.set(name, pipe.getMetadata());
  }

  get<T extends Pipe>(name: string): T | undefined {
    return this.pipes.get(name) as T | undefined;
  }

  has(name: string): boolean {
    return this.pipes.has(name);
  }

  list(): string[] {
    return Array.from(this.pipes.keys());
  }

  getMetadata(name: string): PipeMetadata | undefined {
    return this.metadata.get(name);
  }

  /**
   * Unregister a pipe
   */
  unregister(name: string): boolean {
    const deleted = this.pipes.delete(name);
    this.metadata.delete(name);
    return deleted;
  }

  /**
   * Clear all registered pipes
   */
  clear(): void {
    this.pipes.clear();
    this.metadata.clear();
  }

  /**
   * Get pipes by layer
   */
  getByLayer(layer: string): Array<{ name: string; pipe: Pipe }> {
    const result: Array<{ name: string; pipe: Pipe }> = [];
    
    for (const [name, pipe] of this.pipes.entries()) {
      const metadata = pipe.getMetadata();
      if (metadata.layer === layer) {
        result.push({ name, pipe });
      }
    }
    
    return result;
  }

  /**
   * Validate all pipe dependencies
   */
  validateDependencies(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const availablePipes = new Set(this.pipes.keys());

    for (const [name, metadata] of this.metadata.entries()) {
      for (const dep of metadata.dependencies) {
        if (!availablePipes.has(dep)) {
          errors.push(`Pipe '${name}' depends on unregistered pipe '${dep}'`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get dependency graph
   */
  getDependencyGraph(): Map<string, string[]> {
    const graph = new Map<string, string[]>();

    for (const [name, metadata] of this.metadata.entries()) {
      graph.set(name, [...metadata.dependencies]);
    }

    return graph;
  }
}

/**
 * Global pipe registry instance
 */
export const globalPipeRegistry = new PipeRegistryImpl();

/**
 * Decorator to auto-register pipes
 */
export function RegisterPipe(name: string) {
  return function (constructor: new (...args: any[]) => Pipe) {
    // This would be used with a DI container in a real implementation
    // For now, we'll just mark it with metadata
    Reflect.defineMetadata('pipe:name', name, constructor);
    return constructor;
  };
}