/**
 * Base Server implementation
 */

import { EventEmitter } from "eventemitter3";
import { IServer, HealthStatus } from '../interfaces/base.interfaces';

export abstract class BaseServer extends EventEmitter implements IServer {
  id: string;
  name: string;
  version: string;
  protected running: boolean = false;
  protected startTime?: Date;
  protected config: any;

  constructor(id: string, name: string, version: string = '1.0.0') {
    super();
    this.id = id;
    this.name = name;
    this.version = version;
  }

  async initialize(config: any): Promise<void> {
    this.config = config;
    this.emit("initialized", { config });
  }

  async start(): Promise<void> {
    if (this.running) {
      throw new Error(`Server ${this.name} is already running`);
    }

    try {
      this.emit("starting");
      await this.onStart();
      this.running = true;
      this.startTime = new Date();
      this.emit('started');
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.running) {
      throw new Error(`Server ${this.name} is not running`);
    }

    try {
      this.emit("stopping");
      await this.onStop();
      this.running = false;
      this.startTime = undefined;
      this.emit('stopped');
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  async restart(): Promise<void> {
    if (this.running) {
      await this.stop();
    }
    await this.start();
  }

  isRunning(): boolean {
    return this.running;
  }

  async getHealth(): Promise<HealthStatus> {
    if (!this.running) {
      return {
        status: "unhealthy",
        timestamp: new Date(),
        message: 'Server is not running'
      };
    }

    try {
      const details = await this.checkHealth();
      return {
        status: 'healthy',
        timestamp: new Date(),
        details
      };
    } catch (error) {
      return {
        status: "unhealthy",
        timestamp: new Date(),
        message: error instanceof Error ? error.message : 'Health check failed',
        details: { error }
      };
    }
  }

  async shutdown(): Promise<void> {
    if (this.running) {
      await this.stop();
    }
    this.removeAllListeners();
  }

  // Protected methods to be implemented by subclasses
  protected abstract onStart(): Promise<void>;
  protected abstract onStop(): Promise<void>;
  protected abstract checkHealth(): Promise<Record<string, any>>;

  // Utility methods
  protected getUptime(): number {
    if (!this.startTime) return 0;
    return Date.now() - this.startTime.getTime();
  }

  protected log(level: 'info' | 'warn' | 'error', message: string, data?: any): void {
    this.emit('log', { level, message, data, timestamp: new Date() });
  }
}