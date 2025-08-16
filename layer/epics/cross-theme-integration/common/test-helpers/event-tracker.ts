/**
 * Event tracking utility for cross-theme integration tests
 * Helps validate event propagation across theme boundaries
 */

export interface TrackedEvent {
  timestamp: number;
  source: string;
  target?: string;
  eventType: string;
  data: any;
}

export class EventTracker {
  private events: TrackedEvent[] = [];
  private listeners = new Map<string, Function[]>();
  
  /**
   * Record an event
   */
  track(source: string, eventType: string, data: any, target?: string): void {
    const event: TrackedEvent = {
      timestamp: Date.now(),
      source,
      target,
      eventType,
      data
    };
    
    this.events.push(event);
    this.notifyListeners(event);
  }
  
  /**
   * Get all tracked events
   */
  getEvents(): TrackedEvent[] {
    return [...this.events];
  }
  
  /**
   * Get events by source
   */
  getEventsBySource(source: string): TrackedEvent[] {
    return this.events.filter(e => e.source === source);
  }
  
  /**
   * Get events by type
   */
  getEventsByType(eventType: string): TrackedEvent[] {
    return this.events.filter(e => e.eventType === eventType);
  }
  
  /**
   * Get events between themes
   */
  getEventsBetween(source: string, target: string): TrackedEvent[] {
    return this.events.filter(e => e.source === source && e.target === target);
  }
  
  /**
   * Wait for a specific event
   */
  async waitForEvent(
    predicate: (event: TrackedEvent) => boolean,
    timeout: number = 5000
  ): Promise<TrackedEvent> {
    // Check existing events
    const existing = this.events.find(predicate);
    if (existing) return existing;
    
    // Wait for new event
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.removeListener(listener);
        reject(new Error('Event wait timeout'));
      }, timeout);
      
      const listener = (event: TrackedEvent) => {
        if (predicate(event)) {
          clearTimeout(timeoutId);
          this.removeListener(listener);
          resolve(event);
        }
      };
      
      this.addListener(listener);
    });
  }
  
  /**
   * Clear all tracked events
   */
  clear(): void {
    this.events = [];
  }
  
  /**
   * Add event listener
   */
  private addListener(listener: Function): void {
    const listeners = this.listeners.get('all') || [];
    listeners.push(listener);
    this.listeners.set('all', listeners);
  }
  
  /**
   * Remove event listener
   */
  private removeListener(listener: Function): void {
    const listeners = this.listeners.get('all') || [];
    const index = listeners.indexOf(listener);
    if (index !== -1) {
      listeners.splice(index, 1);
    }
  }
  
  /**
   * Notify all listeners
   */
  private notifyListeners(event: TrackedEvent): void {
    const listeners = this.listeners.get('all') || [];
    listeners.forEach(listener => listener(event));
  }
  
  /**
   * Get event flow diagram
   */
  getEventFlow(): string {
    const flow: string[] = ['Event Flow:'];
    let lastTimestamp = 0;
    
    this.events.forEach(event => {
      const delay = lastTimestamp ? event.timestamp - lastTimestamp : 0;
      const arrow = event.target ? `--[${event.eventType}]-->` : `--[${event.eventType}]`;
      const line = event.target 
        ? `${event.source} ${arrow} ${event.target} (${delay}ms)`
        : `${event.source} ${arrow} (${delay}ms)`;
      flow.push(line);
      lastTimestamp = event.timestamp;
    });
    
    return flow.join('\n');
  }
}

// Global event tracker instance
export const globalEventTracker = new EventTracker();