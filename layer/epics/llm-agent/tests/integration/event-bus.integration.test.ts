/**
 * Integration test for EventBus
 */

import { EventBus, EventTypes } from '../../children/src/infrastructure/event-bus';
import { Event } from '../../children/xlib/interfaces/infrastructure.interfaces';

describe('EventBus Integration', () => {
  let eventBus: EventBus;

  beforeEach(() => {
    eventBus = new EventBus();
  });

  describe('Topic Management', () => {
    it('should create and list topics', async () => {
      await eventBus.createTopic('test-topic');
      await eventBus.createTopic('another-topic');

      const topics = eventBus.listTopics();
      expect(topics).toContain('test-topic');
      expect(topics).toContain('another-topic');
    });

    it('should delete topics', async () => {
      await eventBus.createTopic('temp-topic');
      expect(eventBus.listTopics()).toContain('temp-topic');

      await eventBus.deleteTopic('temp-topic');
      expect(eventBus.listTopics()).not.toContain('temp-topic');
    });
  });

  describe('Event Publishing and Subscription', () => {
    it('should publish and receive events', async () => {
      await eventBus.createTopic('agent-events');

      const receivedEvents: Event[] = [];
      const subscription = eventBus.subscribe('agent-events', (event) => {
        receivedEvents.push(event);
      });

      const testEvent = EventBus.createEvent(
        EventTypes.AGENT_STARTED,
        'test-agent',
        { agentId: 'agent-001' }
      );

      await eventBus.publish('agent-events', testEvent);

      expect(receivedEvents).toHaveLength(1);
      expect(receivedEvents[0].type).toBe(EventTypes.AGENT_STARTED);
      expect(receivedEvents[0].data.agentId).toBe('agent-001');

      eventBus.unsubscribe(subscription);
    });

    it('should support async publishing', (done) => {
      eventBus.createTopic('async-topic');

      eventBus.subscribe('async-topic', (event) => {
        expect(event.type).toBe('test-async');
        done();
      });

      const event = EventBus.createEvent('test-async', 'test', {});
      eventBus.publishAsync('async-topic', event);
    });

    it('should handle multiple subscribers', async () => {
      await eventBus.createTopic('multi-sub');

      const results: string[] = [];
      
      const sub1 = eventBus.subscribe('multi-sub', () => {
        results.push('sub1');
      });

      const sub2 = eventBus.subscribe('multi-sub', () => {
        results.push('sub2');
      });

      await eventBus.publish('multi-sub', EventBus.createEvent('test', 'source', {}));

      expect(results).toEqual(['sub1', 'sub2']);

      eventBus.unsubscribe(sub1);
      eventBus.unsubscribe(sub2);
    });
  });

  describe('Event Filtering', () => {
    it('should filter events by type', async () => {
      await eventBus.createTopic('filtered-topic');

      const receivedEvents: Event[] = [];
      const subscription = eventBus.subscribe('filtered-topic', (event) => {
        receivedEvents.push(event);
      });

      // Update subscription with filter
      subscription.filter = { type: EventTypes.TASK_COMPLETED };

      await eventBus.publish('filtered-topic', 
        EventBus.createEvent(EventTypes.TASK_STARTED, 'source', {})
      );
      await eventBus.publish('filtered-topic', 
        EventBus.createEvent(EventTypes.TASK_COMPLETED, 'source', {})
      );

      expect(receivedEvents).toHaveLength(1);
      expect(receivedEvents[0].type).toBe(EventTypes.TASK_COMPLETED);
    });
  });

  describe('Error Handling', () => {
    it('should continue processing even if handler throws', async () => {
      await eventBus.createTopic('error-topic');

      const results: string[] = [];

      eventBus.subscribe('error-topic', () => {
        throw new Error('Handler 1 error');
      });

      eventBus.subscribe('error-topic', () => {
        results.push('handler2');
      });

      await eventBus.publish('error-topic', 
        EventBus.createEvent('test', 'source', {})
      );

      expect(results).toEqual(['handler2']);
    });
  });
});