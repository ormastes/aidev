/**
 * EmbeddedAppManager - Manual testing for embedded web applications
 * 
 * This module provides utilities and test patterns for web applications
 * that run inside other web applications (e.g., via iframes or embedded views).
 * 
 * Key Features:
 * - Cross-origin communication handling
 * - Iframe sandboxing and security testing
 * - Parent-child window message passing
 * - Responsive sizing within containers
 * - Event propagation between nested contexts
 */

export interface EmbeddedAppConfig {
  appName: string;
  parentUrl: string;
  embeddedUrl: string;
  iframeId?: string;
  sandboxAttributes?: string[];
  allowedOrigins?: string[];
  messageProtocol?: MessageProtocol;
}

export interface MessageProtocol {
  version: string;
  commands: {
    [key: string]: {
      request: any;
      response: any;
    };
  };
}

export class EmbeddedAppManager {
  private config: EmbeddedAppConfig;
  private messageHandlers: Map<string, Function> = new Map();
  private iframe?: HTMLIFrameElement;
  private isParent: boolean;

  constructor(config: EmbeddedAppConfig) {
    this.config = config;
    this.isParent = typeof window !== "undefined" && window.location.href.includes(config.parentUrl);
    if (typeof window !== "undefined") {
      this.setupMessageHandling();
    }
  }

  /**
   * Setup cross-origin message handling
   */
  private setupMessageHandling(): void {
    window.addEventListener('message', (event) => {
      // Validate origin
      if (this.config.allowedOrigins && 
          !this.config.allowedOrigins.includes(event.origin)) {
        console.warn(`Rejected message from unauthorized origin: ${event.origin}`);
        return;
      }

      // Process message
      this.handleMessage(event.data, event.origin);
    });
  }

  /**
   * Handle incoming messages
   */
  private handleMessage(data: any, origin: string): void {
    if (typeof data !== 'object' || !data.type) {
      return;
    }

    const handler = this.messageHandlers.get(data.type);
    if (handler) {
      handler(data.payload, origin);
    }
  }

  /**
   * Register a message handler
   */
  public onMessage(type: string, handler: Function): void {
    this.messageHandlers.set(type, handler);
  }

  /**
   * Send message to parent or child window
   */
  public sendMessage(type: string, payload: any, targetOrigin?: string): void {
    const message = {
      type,
      payload,
      timestamp: Date.now(),
      source: this.config.appName
    };

    if (typeof window === "undefined") {
      return;
    }

    if (this.isParent && this.iframe) {
      // Parent sending to child iframe
      this.iframe.contentWindow?.postMessage(
        message, 
        targetOrigin || this.config.embeddedUrl
      );
    } else if (!this.isParent && window.parent) {
      // Child sending to parent
      window.parent.postMessage(
        message,
        targetOrigin || this.config.parentUrl
      );
    }
  }

  /**
   * Create and embed iframe (for parent app)
   */
  public embedApp(containerId: string): HTMLIFrameElement {
    if (!this.isParent) {
      throw new Error('embedApp can only be called from parent application');
    }

    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Container element ${containerId} not found`);
    }

    // Create iframe
    this.iframe = document.createElement('iframe');
    this.iframe.src = this.config.embeddedUrl;
    this.iframe.id = this.config.iframeId || 'embedded-app';
    
    // Set sandbox attributes if specified
    if (this.config.sandboxAttributes) {
      this.iframe.sandbox.value = this.config.sandboxAttributes.join(' ');
    }

    // Set iframe styles for responsive embedding
    this.iframe.style.width = '100%';
    this.iframe.style.height = '100%';
    this.iframe.style.border = 'none';

    container.appendChild(this.iframe);
    return this.iframe;
  }

  /**
   * Check if running in iframe
   */
  public static isEmbedded(): boolean {
    if (typeof window === "undefined") {
      return false;
    }
    try {
      return window.self !== window.top;
    } catch (e) {
      // Blocked by same-origin policy
      return true;
    }
  }

  /**
   * Get parent window reference if embedded
   */
  public static getParentWindow(): Window | null {
    if (typeof window === "undefined") {
      return null;
    }
    if (this.isEmbedded()) {
      return window.parent;
    }
    return null;
  }

  /**
   * Resize iframe to content (for dynamic content)
   */
  public requestResize(width?: number, height?: number): void {
    if (!EmbeddedAppManager.isEmbedded()) {
      return;
    }

    this.sendMessage('resize', {
      width: width || (typeof document !== "undefined" ? document.body.scrollWidth : 0),
      height: height || (typeof document !== "undefined" ? document.body.scrollHeight : 0)
    });
  }

  /**
   * Request full screen mode
   */
  public requestFullscreen(): void {
    if (!EmbeddedAppManager.isEmbedded()) {
      return;
    }

    this.sendMessage("fullscreen", { enable: true });
  }

  /**
   * Exit full screen mode
   */
  public exitFullscreen(): void {
    if (!EmbeddedAppManager.isEmbedded()) {
      return;
    }

    this.sendMessage("fullscreen", { enable: false });
  }
}