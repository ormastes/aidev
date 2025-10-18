/**
 * PostMessage Communication Layer
 * Secure cross-origin communication between portal and embedded services
 */

import { EmbeddingMessage, MessageHandler, TRUSTED_ORIGINS } from '../types/embedding';

export class PostMessageBridge {
  private handlers: Map<string, MessageHandler[]> = new Map();
  private trustedOrigins: Set<string>;

  constructor(trustedOrigins?: string[]) {
    this.trustedOrigins = new Set(trustedOrigins || TRUSTED_ORIGINS);
    this.setupMessageListener();
  }

  private setupMessageListener(): void {
    window.addEventListener('message', this.handleMessage.bind(this));
  }

  private async handleMessage(event: MessageEvent): Promise<void> {
    // Security: Verify origin
    if (!this.isTrustedOrigin(event.origin)) {
      console.warn('Received message from untrusted origin:', event.origin);
      return;
    }

    const message = event.data as EmbeddingMessage;

    // Validate message structure
    if (!message || typeof message.type !== 'string') {
      console.warn('Invalid message format:', message);
      return;
    }

    // Add metadata
    message.source = event.origin;
    message.timestamp = message.timestamp || Date.now();

    // Call registered handlers
    const handlers = this.handlers.get(message.type) || [];
    const serviceId = this.extractServiceId(message);

    for (const handler of handlers) {
      try {
        await handler(message, serviceId);
      } catch (error) {
        console.error(`Error in message handler for ${message.type}:`, error);
      }
    }

    // Call wildcard handlers
    const wildcardHandlers = this.handlers.get('*') || [];
    for (const handler of wildcardHandlers) {
      try {
        await handler(message, serviceId);
      } catch (error) {
        console.error('Error in wildcard handler:', error);
      }
    }
  }

  private extractServiceId(message: EmbeddingMessage): string {
    if (message.data && typeof message.data === 'object' && 'serviceId' in message.data) {
      return message.data.serviceId as string;
    }
    return 'unknown';
  }

  private isTrustedOrigin(origin: string): boolean {
    return this.trustedOrigins.has(origin);
  }

  /**
   * Register message handler for specific message type
   */
  on(type: string, handler: MessageHandler): void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, []);
    }
    this.handlers.get(type)!.push(handler);
  }

  /**
   * Unregister message handler
   */
  off(type: string, handler: MessageHandler): void {
    const handlers = this.handlers.get(type);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * Send message to iframe
   */
  send(iframe: HTMLIFrameElement, message: EmbeddingMessage, targetOrigin: string): void {
    if (!iframe.contentWindow) {
      console.error('Cannot send message: iframe contentWindow not available');
      return;
    }

    // Add timestamp if not present
    if (!message.timestamp) {
      message.timestamp = Date.now();
    }

    iframe.contentWindow.postMessage(message, targetOrigin);
  }

  /**
   * Send message and wait for response
   */
  async sendAndWaitForResponse(
    iframe: HTMLIFrameElement,
    message: EmbeddingMessage,
    targetOrigin: string,
    responseType: string,
    timeout: number = 5000
  ): Promise<EmbeddingMessage> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.off(responseType, handler);
        reject(new Error(`Timeout waiting for response: ${responseType}`));
      }, timeout);

      const handler: MessageHandler = (responseMessage) => {
        clearTimeout(timeoutId);
        this.off(responseType, handler);
        resolve(responseMessage);
      };

      this.on(responseType, handler);
      this.send(iframe, message, targetOrigin);
    });
  }

  /**
   * Add trusted origin
   */
  addTrustedOrigin(origin: string): void {
    this.trustedOrigins.add(origin);
  }

  /**
   * Remove trusted origin
   */
  removeTrustedOrigin(origin: string): void {
    this.trustedOrigins.delete(origin);
  }

  /**
   * Clean up
   */
  destroy(): void {
    window.removeEventListener('message', this.handleMessage.bind(this));
    this.handlers.clear();
  }
}

/**
 * Helper function to create standard messages
 */
export const MessageFactory = {
  authToken(token: string, sessionId: string, userId: string, username: string): EmbeddingMessage {
    return {
      type: 'AUTH_TOKEN',
      data: { token, sessionId, userId, username }
    };
  },

  ready(serviceId: string, version?: string): EmbeddingMessage {
    return {
      type: 'READY',
      data: { serviceId, version }
    };
  },

  error(code: string, message: string, details?: any): EmbeddingMessage {
    return {
      type: 'ERROR',
      data: { code, message, details }
    };
  },

  reload(): EmbeddingMessage {
    return {
      type: 'RELOAD'
    };
  },

  navigate(path: string): EmbeddingMessage {
    return {
      type: 'NAVIGATE',
      data: { path }
    };
  }
};
