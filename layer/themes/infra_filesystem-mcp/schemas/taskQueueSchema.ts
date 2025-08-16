/**
 * JSON Schema definitions for Task Queue structures
 */

export const TaskSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    type: { 
      type: 'string',
      enum: ['data', 'runnable', 'empty']
    },
    priority: { 
      type: 'string',
      enum: ['high', 'medium', 'low']
    },
    content: { type: ['string', 'object', 'null'] },
    status: { 
      type: 'string',
      enum: ['pending', 'working', 'completed', 'failed']
    },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
    startedAt: { type: 'string', format: 'date-time' },
    completedAt: { type: 'string', format: 'date-time' },
    result: { type: ['string', 'object', 'null'] },
    error: { type: ['string', 'null'] },
    parent: { type: 'string' },
    metadata: { type: 'object' }
  },
  required: ['id', 'type', 'status'],
  additionalProperties: true
};

export const VFQueueStateSchema = {
  type: 'object',
  properties: {
    queues: {
      type: 'object',
      properties: {
        high: {
          type: 'array',
          items: TaskSchema
        },
        medium: {
          type: 'array',
          items: TaskSchema
        },
        low: {
          type: 'array',
          items: TaskSchema
        }
      },
      additionalProperties: {
        type: 'array',
        items: TaskSchema
      }
    },
    working: {
      anyOf: [TaskSchema, { type: 'null' }]
    },
    workingItem: {
      anyOf: [TaskSchema, { type: 'null' }]
    },
    metadata: {
      type: 'object',
      properties: {
        totalProcessed: { type: 'number', minimum: 0 },
        totalFailed: { type: 'number', minimum: 0 },
        lastProcessedAt: { type: 'string', format: 'date-time' },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' }
      },
      required: ['totalProcessed', 'totalFailed']
    },
    global_config: {
      type: 'object',
      properties: {
        all_queues_empty_comment: { type: 'string' },
        default_empty_queue_comment: { type: 'string' }
      }
    }
  },
  required: ['queues', 'metadata'],
  additionalProperties: true
};

export const VFTaskQueueSchema = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    queues: {
      type: 'object',
      patternProperties: {
        '^.*$': {
          type: 'object',
          properties: {
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  type: { type: 'string' },
                  content: { type: ['string', 'object'] },
                  status: { 
                    type: 'string',
                    enum: ['pending', 'working', 'completed', 'failed', 'empty']
                  },
                  parent: { type: 'string' },
                  created_at: { type: 'string' },
                  updated_at: { type: 'string' }
                },
                required: ['id', 'type']
              }
            },
            pop_comment: { type: 'string' },
            push_comment: { type: 'string' },
            empty_queue_comment: { type: 'string' }
          },
          required: ['items']
        }
      }
    },
    workingItem: {
      anyOf: [
        {
          type: 'object',
          properties: {
            id: { type: 'string' },
            type: { type: 'string' },
            content: { type: ['string', 'object'] },
            status: { type: 'string' },
            parent: { type: 'string' },
            created_at: { type: 'string' },
            updated_at: { type: 'string' },
            started_at: { type: 'string' }
          }
        },
        { type: 'null' }
      ]
    },
    global_config: {
      type: 'object',
      properties: {
        all_queues_empty_comment: { type: 'string' },
        default_empty_queue_comment: { type: 'string' }
      }
    },
    metadata: {
      type: 'object'
    }
  },
  required: ['queues'],
  additionalProperties: true
};