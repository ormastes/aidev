/**
 * EventBus implementation for cross-component communication
 */

import { EventEmitter } from "eventemitter3";
import { v4 as uuidv4 } from 'uuid';
import {
  IEventBus,
  Event,
  EventHandler,
  Subscription,
  EventFilter,
  TopicOptions
} from '../../xlib/interfaces/infrastructure.interfaces';

interface TopicConfig {
  options: TopicOptions;
  handlers: Map<string, SubscriptionInternal>;
}

interface SubscriptionInternal extends Subscription {
  active: boolean;
}

export class EventBus implements IEventBus {
  private emitter: EventEmitter;
  private topics: Map<string, TopicConfig>;
  private subscriptions: Map<string, SubscriptionInternal>;

  constructor() {
    this.emitter = new EventEmitter();
    this.topics = new Map();
    this.subscriptions = new Map();
  }

  async publish(topic: string, event: Event): Promise<void> {
    if (!this.topics.has(topic)) {
      throw new Error(`Topic ${topic} does not exist`);
    }

    // Add timestamp if not present
    if (!event.timestamp) {
      event.timestamp = new Date();
    }

    // Add ID if not present
    if (!event.id) {
      event.id = uuidv4();
    }

    // Emit to all handlers synchronously
    const topicConfig = this.topics.get(topic)!;
    const handlers = Array.from(topicConfig.handlers.values());

    for (const subscription of handlers) {
      if (subscription.active && this.matchesFilter(event, subscription.filter)) {
        try {
          await subscription.handler(event);
        } catch (error) {
          console.error(`Error in event handler for topic ${topic}:`, error);
          // Continue with other handlers even if one fails
        }
      }
    }
  }

  publishAsync(topic: string, event: Event): void {
    // Non-blocking publish
    setImmediate(() => {
      this.publish(topic, event).catch(error => {
        console.error(`Async publish error for topic ${topic}:`, error);
      });
    });
  }

  subscribe(topic: string, handler: EventHandler): Subscription {
    if (!this.topics.has(topic)) {
      // Auto-create topic if it doesn't exist
      this.createTopicSync(topic);
    }

    const subscriptionId = uuidv4();
    const subscription: SubscriptionInternal = {
      id: subscriptionId,
      topic,
      handler,
      active: true
    };

    this.subscriptions.set(subscriptionId, subscription);
    this.topics.get(topic)!.handlers.set(subscriptionId, subscription);

    return subscription;
  }

  unsubscribe(subscription: Subscription): void {
    const sub = this.subscriptions.get(subscription.id);
    if (!sub) return;

    sub.active = false;
    
    const topicConfig = this.topics.get(sub.topic);
    if (topicConfig) {
      topicConfig.handlers.delete(subscription.id);
    }

    this.subscriptions.delete(subscription.id);
  }

  async createTopic(topic: string, options?: TopicOptions): Promise<void> {
    if (this.topics.has(topic)) {
      throw new Error(`Topic ${topic} already exists`);
    }

    this.createTopicSync(topic, options);
  }

  async deleteTopic(topic: string): Promise<void> {
    const topicConfig = this.topics.get(topic);
    if (!topicConfig) {
      throw new Error(`Topic ${topic} does not exist`);
    }

    // Unsubscribe all handlers
    for (const subscription of topicConfig.handlers.values()) {
      this.unsubscribe(subscription);
    }

    this.topics.delete(topic);
  }

  listTopics(): string[] {
    return Array.from(this.topics.keys());
  }

  // Private helper methods
  private createTopicSync(topic: string, options?: TopicOptions): void {
    this.topics.set(topic, {
      options: options || {},
      handlers: new Map()
    });
  }

  private matchesFilter(event: Event, filter?: EventFilter): boolean {
    if (!filter) return true;

    // Check type filter
    if (filter.type) {
      const types = Array.isArray(filter.type) ? filter.type : [filter.type];
      if (!types.includes(event.type)) return false;
    }

    // Check source filter
    if (filter.source) {
      const sources = Array.isArray(filter.source) ? filter.source : [filter.source];
      if (!sources.includes(event.source)) return false;
    }

    // Check metadata filter
    if (filter.metadata) {
      if (!event.metadata) return false;
      
      for (const [key, value] of Object.entries(filter.metadata)) {
        if (event.metadata[key] !== value) return false;
      }
    }

    return true;
  }

  // Utility method for creating standard events
  static createEvent(type: string, source: string, data: any, metadata?: Record<string, any>): Event {
    return {
      id: uuidv4(),
      type,
      source,
      timestamp: new Date(),
      data,
      metadata
    };
  }
}

// Singleton instance
let eventBusInstance: EventBus | null = null;

export function getEventBus(): EventBus {
  if (!eventBusInstance) {
    eventBusInstance = new EventBus();
  }
  return eventBusInstance;
}

// Event type constants
export const EventTypes = {
  // Agent events
  AGENT_STARTED: 'agent:started',
  AGENT_STOPPED: 'agent:stopped',
  AGENT_ERROR: 'agent:error',
  AGENT_MESSAGE: 'agent:message',

  // Task events
  TASK_CREATED: 'task:created',
  TASK_ASSIGNED: 'task:assigned',
  TASK_STARTED: 'task:started',
  TASK_COMPLETED: 'task:completed',
  TASK_FAILED: 'task:failed',

  // Workflow events
  WORKFLOW_STARTED: 'workflow:started',
  WORKFLOW_STEP_COMPLETED: 'workflow:step:completed',
  WORKFLOW_COMPLETED: 'workflow:completed',
  WORKFLOW_FAILED: 'workflow:failed',

  // Session events
  SESSION_CREATED: 'session:created',
  SESSION_UPDATED: 'session:updated',
  SESSION_DELETED: 'session:deleted',

  // Auth events
  AUTH_LOGIN: 'auth:login',
  AUTH_LOGOUT: 'auth:logout',
  AUTH_TOKEN_REFRESHED: 'auth:token:refreshed',
  AUTH_PERMISSION_DENIED: 'auth:permission:denied'
} as const;