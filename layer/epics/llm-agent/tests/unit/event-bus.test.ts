import { EventBus, getEventBus, EventTypes } from '../../children/src/infrastructure/event-bus';
import { Event, EventFilter } from '../../children/xlib/interfaces/infrastructure.interfaces';

describe('EventBus Unit Tests', () => {
  let eventBus: EventBus;

  beforeEach(() => {
    eventBus = new EventBus();
  });

  describe('Event Filtering - Edge Cases', () => {
    it('should handle array type filters', async () => {
      await eventBus.createTopic('filter-test');

      const receivedEvents: Event[] = [];
      const subscription = eventBus.subscribe('filter-test', (event) => {
        receivedEvents.push(event);
      });

      subscription.filter = { 
        type: [EventTypes.AGENT_STARTED, EventTypes.AGENT_STOPPED] 
      };

      await eventBus.publish('filter-test', 
        EventBus.createEvent(EventTypes.AGENT_STARTED, 'agent1', {})
      );
      await eventBus.publish('filter-test', 
        EventBus.createEvent(EventTypes.AGENT_ERROR, 'agent1', {})
      );
      await eventBus.publish('filter-test', 
        EventBus.createEvent(EventTypes.AGENT_STOPPED, 'agent1', {})
      );

      expect(receivedEvents).toHaveLength(2);
      expect(receivedEvents[0].type).toBe(EventTypes.AGENT_STARTED);
      expect(receivedEvents[1].type).toBe(EventTypes.AGENT_STOPPED);
    });

    it('should handle array source filters', async () => {
      await eventBus.createTopic('source-filter');

      const receivedEvents: Event[] = [];
      const subscription = eventBus.subscribe('source-filter', (event) => {
        receivedEvents.push(event);
      });

      subscription.filter = { 
        source: ['agent1', 'agent2'] 
      };

      await eventBus.publish('source-filter', 
        EventBus.createEvent('test', 'agent1', {})
      );
      await eventBus.publish('source-filter', 
        EventBus.createEvent('test', 'agent3', {})
      );
      await eventBus.publish('source-filter', 
        EventBus.createEvent('test', 'agent2', {})
      );

      expect(receivedEvents).toHaveLength(2);
      expect(receivedEvents[0].source).toBe('agent1');
      expect(receivedEvents[1].source).toBe('agent2');
    });

    it('should handle metadata filters', async () => {
      await eventBus.createTopic('metadata-filter');

      const receivedEvents: Event[] = [];
      const subscription = eventBus.subscribe('metadata-filter', (event) => {
        receivedEvents.push(event);
      });

      subscription.filter = { 
        metadata: { env: "production", region: 'us-east' }
      };

      await eventBus.publish('metadata-filter', 
        EventBus.createEvent('test', 'source', {}, { env: "production", region: 'us-east' })
      );
      await eventBus.publish('metadata-filter', 
        EventBus.createEvent('test', 'source', {}, { env: "development", region: 'us-east' })
      );
      await eventBus.publish('metadata-filter', 
        EventBus.createEvent('test', 'source', {}, { env: "production" })
      );

      expect(receivedEvents).toHaveLength(1);
      expect(receivedEvents[0].metadata).toEqual({ env: "production", region: 'us-east' });
    });

    it('should handle event without metadata when filter expects metadata', async () => {
      await eventBus.createTopic('no-metadata');

      const receivedEvents: Event[] = [];
      const subscription = eventBus.subscribe('no-metadata', (event) => {
        receivedEvents.push(event);
      });

      subscription.filter = { 
        metadata: { required: 'value' }
      };

      await eventBus.publish('no-metadata', 
        EventBus.createEvent('test', 'source', {})
      );

      expect(receivedEvents).toHaveLength(0);
    });
  });

  describe('getEventBus singleton', () => {
    it('should return singleton instance', () => {
      const instance1 = getEventBus();
      const instance2 = getEventBus();
      
      expect(instance1).toBe(instance2);
    });

    it('should maintain state across calls', async () => {
      const bus = getEventBus();
      await bus.createTopic('singleton-test');
      
      const anotherRef = getEventBus();
      expect(anotherRef.listTopics()).toContain('singleton-test');
    });
  });

  describe('Error scenarios', () => {
    it('should handle publish to non-existent topic', async () => {
      const event = EventBus.createEvent('test', 'source', {});
      
      // Should throw error for non-existent topic
      await expect(eventBus.publish('non-existent', event)).rejects.toThrow('Topic non-existent does not exist');
    });

    it('should handle publishAsync to non-existent topic', () => {
      const event = EventBus.createEvent('test', 'source', {});
      
      // Should not throw
      expect(() => eventBus.publishAsync('non-existent', event)).not.toThrow();
    });

    it('should handle delete non-existent topic', async () => {
      // Should throw error for non-existent topic
      await expect(eventBus.deleteTopic('non-existent')).rejects.toThrow('Topic non-existent does not exist');
    });

    it('should handle subscription to non-existent topic', () => {
      const handler = jest.fn();
      
      // Should create topic automatically or handle gracefully
      const subscription = eventBus.subscribe('auto-created', handler);
      expect(subscription).toBeDefined();
      expect(subscription.topic).toBe('auto-created');
    });
  });

  describe('Multiple filter conditions', () => {
    it('should apply all filter conditions', async () => {
      await eventBus.createTopic('multi-filter');

      const receivedEvents: Event[] = [];
      const subscription = eventBus.subscribe('multi-filter', (event) => {
        receivedEvents.push(event);
      });

      subscription.filter = { 
        type: EventTypes.TASK_COMPLETED,
        source: 'worker-1',
        metadata: { priority: 'high' }
      };

      // Should match - all conditions met
      await eventBus.publish('multi-filter', 
        EventBus.createEvent(EventTypes.TASK_COMPLETED, 'worker-1', {}, { priority: 'high' })
      );

      // Should not match - wrong type
      await eventBus.publish('multi-filter', 
        EventBus.createEvent(EventTypes.TASK_STARTED, 'worker-1', {}, { priority: 'high' })
      );

      // Should not match - wrong source
      await eventBus.publish('multi-filter', 
        EventBus.createEvent(EventTypes.TASK_COMPLETED, 'worker-2', {}, { priority: 'high' })
      );

      // Should not match - wrong metadata
      await eventBus.publish('multi-filter', 
        EventBus.createEvent(EventTypes.TASK_COMPLETED, 'worker-1', {}, { priority: 'low' })
      );

      expect(receivedEvents).toHaveLength(1);
    });
  });
});