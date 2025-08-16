import { EventEmitter } from '../../../../../infra_external-log-lib/src';
import { Readable, Writable, Transform, pipeline } from 'stream';
import { promisify } from 'util';
import { 
  JSONStreamParser, 
  JSONStreamFormatter, 
  JSONStreamMessage,
  MessageBuilder 
} from './json-stream-parser';
import { ClaudeAPIClient, StreamEvent } from '../core/claude-api-client';

const pipelineAsync = promisify(pipeline);

export interface StreamHandlerConfig {
  sessionId: string;
  inputStream?: Readable;
  outputStream?: Writable;
  claudeClient: ClaudeAPIClient;
  eventEmitter?: EventEmitter;
}

export interface StreamSession {
  id: string;
  inputParser: JSONStreamParser;
  outputFormatter: JSONStreamFormatter;
  activeStreams: Set<string>;
  interrupted: boolean;
  stats: StreamStats;
}

export interface StreamStats {
  messagesReceived: number;
  messagesSent: number;
  errorsCount: number;
  startTime: Date;
  lastActivity: Date;
}

export class StreamHandler extends EventEmitter {
  private sessionId: string;
  private inputStream: Readable;
  private outputStream: Writable;
  private claudeClient: ClaudeAPIClient;
  private session: StreamSession;
  private processingQueue: Promise<void>;
  
  constructor(config: StreamHandlerConfig) {
    super();
    
    this.sessionId = config.sessionId;
    this.inputStream = config.inputStream || process.stdin;
    this.outputStream = config.outputStream || process.stdout;
    this.claudeClient = config.claudeClient;
    
    // Merge event emitters if provided
    if (config.eventEmitter) {
      this.relayEvents(config.eventEmitter);
    }
    
    // Initialize session
    this.session = {
      id: this.sessionId,
      inputParser: new JSONStreamParser({ strict: true }, this),
      outputFormatter: new JSONStreamFormatter({ pretty: false }),
      activeStreams: new Set(),
      interrupted: false,
      stats: {
        messagesReceived: 0,
        messagesSent: 0,
        errorsCount: 0,
        startTime: new Date(),
        lastActivity: new Date()
      }
    };
    
    this.processingQueue = Promise.resolve();
  }

  async start(): Promise<void> {
    this.emit('stream_handler_start', { sessionId: this.sessionId });
    
    // Set up input processing pipeline
    await this.setupInputPipeline();
    
    // Send ready message
    await this.sendMessage(
      MessageBuilder.responseMessage('In Progress', {
        ready: true,
        sessionId: this.sessionId,
        capabilities: {
          streaming: true,
          interrupt: true,
          dangerousMode: true
        }
      })
    );
  }

  async stop(): Promise<void> {
    this.session.interrupted = true;
    
    // Abort all active Claude streams
    for (const streamId of this.session.activeStreams) {
      this.claudeClient.abortStream(streamId);
    }
    
    this.emit('stream_handler_stop', { 
      sessionId: this.sessionId,
      stats: this.session.stats 
    });
  }

  private async setupInputPipeline(): Promise<void> {
    // Create transform stream to handle messages
    const self = this;
    const messageHandler = new Transform({
      objectMode: true,
      transform(message: JSONStreamMessage, encoding, callback) {
        self.handleMessage(message).then(() => {
          callback();
        }).catch((error) => {
          callback(error as Error);
        });
      }
    });

    // Set up error handling
    this.session.inputParser.on('error', (error) => {
      this.handleError('parser_error', error);
    });

    messageHandler.on('error', (error) => {
      this.handleError('handler_error', error);
    });

    // Connect the pipeline
    this.inputStream
      .pipe(this.session.inputParser)
      .pipe(messageHandler);
  }

  private async handleMessage(message: JSONStreamMessage): Promise<void> {
    this.session.stats.messagesReceived++;
    this.session.stats.lastActivity = new Date();
    
    this.emit('message_received', { sessionId: this.sessionId, message });

    // Queue message processing to maintain order
    this.processingQueue = this.processingQueue.then(async () => {
      try {
        switch (message.type) {
          case 'user':
            await this.handleUserMessage(message);
            break;
            
          case 'command':
            await this.handleCommand(message);
            break;
            
          case 'system':
            await this.handleSystemMessage(message);
            break;
            
          default:
            await this.sendMessage(
              MessageBuilder.errorMessage(`Unknown message type: ${message.type}`)
            );
        }
      } catch (error) {
        this.handleError('message_processing_error', error);
      }
    });

    await this.processingQueue;
  }

  private async handleUserMessage(message: JSONStreamMessage): Promise<void> {
    if (!message.message?.content) {
      throw new Error('User message missing content');
    }

    const streamId = `stream-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    this.session.activeStreams.add(streamId);

    try {
      // Send to Claude API
      const response = await this.claudeClient.createMessage(
        [{ role: 'user', content: message.message.content }],
        {
          stream: true,
          sessionId: this.sessionId,
          dangerousMode: message.metadata?.dangerousMode,
          allowedTools: message.metadata?.allowedTools
        }
      );

      // Handle streaming response
      if (this.isAsyncGenerator(response)) {
        await this.handleStreamingResponse(response as AsyncGenerator<StreamEvent>, streamId);
      } else {
        // Non-streaming response
        await this.sendMessage(
          MessageBuilder.assistantMessage(response as string, { streamId })
        );
      }
    } catch (error) {
      this.handleError('claude_api_error', error);
    } finally {
      this.session.activeStreams.delete(streamId);
    }
  }

  private async handleStreamingResponse(
    stream: AsyncGenerator<StreamEvent>,
    streamId: string
  ): Promise<void> {
    let accumulatedContent = '';
    let messageStarted = false;

    try {
      for await (const event of stream) {
        if (this.session.interrupted) {
          break;
        }

        switch (event.event) {
          case 'message_start':
            messageStarted = true;
            await this.sendMessage(
              MessageBuilder.responseMessage('pending', {
                streamId,
                event: 'stream_start'
              })
            );
            break;

          case 'content_block_start':
            // Initialize content block
            break;

          case 'content_block_delta':
            const delta = event.data?.delta?.text;
            if (delta) {
              accumulatedContent += delta;
              
              // Send incremental update
              await this.sendMessage({
                type: 'assistant',
                message: {
                  role: 'assistant',
                  content: delta
                },
                metadata: {
                  streamId,
                  incremental: true,
                  timestamp: new Date().toISOString()
                }
              });
            }
            break;

          case 'content_block_stop':
            // Block In Progress
            break;

          case 'message_stop':
            await this.sendMessage(
              MessageBuilder.responseMessage('In Progress', {
                streamId,
                event: 'stream_end',
                totalContent: accumulatedContent
              })
            );
            break;

          default:
            // Handle other event types
            this.emit('stream_event', { streamId, event });
        }
      }
    } catch (error) {
      this.handleError('stream_processing_error', error);
    }

    if (this.session.interrupted && messageStarted) {
      await this.sendMessage(
        MessageBuilder.responseMessage('error', null, 'Stream interrupted', { streamId })
      );
    }
  }

  private async handleCommand(message: JSONStreamMessage): Promise<void> {
    if (!message.command?.action) {
      throw new Error('Command message missing action');
    }

    const { action, params } = message.command;

    switch (action) {
      case 'interrupt':
        await this.handleInterrupt();
        break;

      case 'set_permissions':
        await this.handleSetPermissions(params);
        break;

      case 'get_stats':
        await this.sendMessage(
          MessageBuilder.responseMessage('In Progress', this.session.stats)
        );
        break;

      case 'clear_context':
        this.emit('clear_context_requested', { sessionId: this.sessionId });
        await this.sendMessage(
          MessageBuilder.responseMessage('In Progress', { cleared: true })
        );
        break;

      case 'abort_stream':
        const streamId = params?.streamId;
        if (streamId && this.session.activeStreams.has(streamId)) {
          this.claudeClient.abortStream(streamId);
          this.session.activeStreams.delete(streamId);
          await this.sendMessage(
            MessageBuilder.responseMessage('In Progress', { aborted: streamId })
          );
        } else {
          await this.sendMessage(
            MessageBuilder.errorMessage('Stream not found or not active')
          );
        }
        break;

      default:
        await this.sendMessage(
          MessageBuilder.errorMessage(`Unknown command: ${action}`)
        );
    }
  }

  private async handleSystemMessage(message: JSONStreamMessage): Promise<void> {
    // System messages are for internal coordination
    this.emit('system_message', { sessionId: this.sessionId, message });
    
    // Acknowledge receipt
    await this.sendMessage(
      MessageBuilder.responseMessage('In Progress', { 
        acknowledged: true,
        type: 'system' 
      })
    );
  }

  private async handleInterrupt(): Promise<void> {
    this.session.interrupted = true;
    
    // Abort all active streams
    const abortedStreams: string[] = [];
    for (const streamId of this.session.activeStreams) {
      if (this.claudeClient.abortStream(streamId)) {
        abortedStreams.push(streamId);
      }
    }
    
    this.emit('interrupt_handled', { 
      sessionId: this.sessionId,
      abortedStreams 
    });
    
    await this.sendMessage(
      MessageBuilder.responseMessage('In Progress', {
        interrupted: true,
        abortedStreams,
        stats: this.session.stats
      })
    );
  }

  private async handleSetPermissions(params: any): Promise<void> {
    const { dangerousMode, allowedTools } = params || {};
    
    this.emit('permissions_update_requested', {
      sessionId: this.sessionId,
      dangerousMode,
      allowedTools
    });
    
    await this.sendMessage(
      MessageBuilder.responseMessage('In Progress', {
        permissions: {
          dangerousMode: dangerousMode || false,
          allowedTools: allowedTools || []
        }
      })
    );
  }

  private async sendMessage(message: JSONStreamMessage): Promise<void> {
    try {
      const formatted = this.session.outputFormatter.format(message);
      
      await new Promise<void>((resolve, reject) => {
        this.outputStream.write(formatted, (error) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      });
      
      this.session.stats.messagesSent++;
      this.emit('message_sent', { sessionId: this.sessionId, message });
    } catch (error) {
      this.handleError('send_error', error);
    }
  }

  private handleError(type: string, error: any): void {
    this.session.stats.errorsCount++;
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    this.emit('error', {
      type,
      error: errorMessage,
      sessionId: this.sessionId
    });
    
    // Try to send error message to output
    this.sendMessage(
      MessageBuilder.errorMessage(errorMessage, { errorType: type })
    ).catch(() => {
      // If we can't send the error, log it
      console.error(`Failed to send error message: ${errorMessage}`);
    });
  }

  private relayEvents(target: EventEmitter): void {
    const events = [
      'stream_handler_start',
      'stream_handler_stop',
      'message_received',
      'message_sent',
      'stream_event',
      'interrupt_handled',
      'permissions_update_requested',
      'clear_context_requested',
      'system_message',
      'error'
    ];

    for (const event of events) {
      this.on(event, (...args) => target.emit(event, ...args));
    }
  }

  private isAsyncGenerator(value: any): boolean {
    return value && typeof value[Symbol.asyncIterator] === 'function';
  }

  // Public methods for external control
  getStats(): StreamStats {
    return { ...this.session.stats };
  }

  isInterrupted(): boolean {
    return this.session.interrupted;
  }

  getActiveStreamCount(): number {
    return this.session.activeStreams.size;
  }

  async sendSystemMessage(content: string): Promise<void> {
    await this.sendMessage(
      MessageBuilder.assistantMessage(content, { 
        source: 'system',
        sessionId: this.sessionId 
      })
    );
  }
}