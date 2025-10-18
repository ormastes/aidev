/**
 * Embedding Manager
 * Manages lifecycle of embedded services in the portal
 */

import {
  EmbeddedServiceConfig,
  EmbeddingOptions,
  ServiceStatus,
  EmbeddedServiceState,
  MessageHandler,
  EmbeddingManagerInterface,
  DEFAULT_SANDBOX_PERMISSIONS,
  EmbeddingMessage
} from '../types/embedding';
import { PostMessageBridge, MessageFactory } from '../utils/postmessage';

export class EmbeddingManager implements EmbeddingManagerInterface {
  private embeddedServices: Map<string, EmbeddedServiceState> = new Map();
  private messageBridge: PostMessageBridge;
  private currentServiceId: string | null = null;

  constructor(trustedOrigins?: string[]) {
    this.messageBridge = new PostMessageBridge(trustedOrigins);
    this.setupMessageHandlers();
  }

  private setupMessageHandlers(): void {
    // Handle READY messages from embedded services
    this.messageBridge.on('READY', (message, serviceId) => {
      const state = this.embeddedServices.get(serviceId);
      if (state) {
        state.status = ServiceStatus.READY;
        state.ready = true;
        state.loadTime = Date.now() - (state.loadTime || Date.now());
        console.log(`Service ${serviceId} is ready (load time: ${state.loadTime}ms)`);
      }
    });

    // Handle ERROR messages from embedded services
    this.messageBridge.on('ERROR', (message, serviceId) => {
      const state = this.embeddedServices.get(serviceId);
      if (state && message.data) {
        state.status = ServiceStatus.ERROR;
        state.lastError = message.data.message;
        console.error(`Service ${serviceId} error:`, message.data);
      }
    });
  }

  /**
   * Embed a service in the portal
   */
  async embedService(
    serviceId: string,
    config: EmbeddedServiceConfig,
    container: HTMLElement,
    options?: EmbeddingOptions
  ): Promise<void> {
    // Check if already embedded
    if (this.embeddedServices.has(serviceId)) {
      console.warn(`Service ${serviceId} is already embedded`);
      return;
    }

    // Create iframe
    const iframe = this.createIframe(serviceId, config, options);

    // Create state
    const state: EmbeddedServiceState = {
      id: serviceId,
      status: ServiceStatus.LOADING,
      iframe,
      ready: false,
      loadTime: Date.now()
    };

    this.embeddedServices.set(serviceId, state);

    // Append to container
    container.appendChild(iframe);

    // Wait for ready signal (with timeout)
    try {
      await this.waitForReady(serviceId, 10000);
      console.log(`Service ${serviceId} embedded successfully`);
    } catch (error) {
      state.status = ServiceStatus.ERROR;
      state.lastError = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Failed to embed service ${serviceId}:`, error);
      throw error;
    }
  }

  /**
   * Create iframe element
   */
  private createIframe(
    serviceId: string,
    config: EmbeddedServiceConfig,
    options?: EmbeddingOptions
  ): HTMLIFrameElement {
    const iframe = document.createElement('iframe');

    // Set attributes
    iframe.id = `embedded-service-${serviceId}`;
    iframe.setAttribute('data-service-id', serviceId);
    iframe.src = config.url;
    iframe.title = config.name;

    // Sandbox permissions
    const sandbox = options?.sandbox || DEFAULT_SANDBOX_PERMISSIONS;
    iframe.sandbox.add(...sandbox);

    // Allow attributes
    if (options?.allowFullscreen) {
      iframe.allowFullscreen = true;
    }

    // Styling
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = 'none';
    iframe.style.display = 'block';

    // Load event
    iframe.addEventListener('load', () => {
      console.log(`Iframe loaded for service ${serviceId}`);
    });

    // Error event
    iframe.addEventListener('error', (event) => {
      console.error(`Iframe error for service ${serviceId}:`, event);
      const state = this.embeddedServices.get(serviceId);
      if (state) {
        state.status = ServiceStatus.ERROR;
        state.lastError = 'Failed to load iframe';
      }
    });

    return iframe;
  }

  /**
   * Wait for service to be ready
   */
  private async waitForReady(serviceId: string, timeout: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();

      const checkReady = () => {
        const state = this.embeddedServices.get(serviceId);

        if (!state) {
          reject(new Error(`Service ${serviceId} not found`));
          return;
        }

        if (state.ready) {
          resolve();
          return;
        }

        if (state.status === ServiceStatus.ERROR) {
          reject(new Error(state.lastError || 'Service error'));
          return;
        }

        if (Date.now() - startTime > timeout) {
          reject(new Error(`Timeout waiting for service ${serviceId} to be ready`));
          return;
        }

        setTimeout(checkReady, 100);
      };

      checkReady();
    });
  }

  /**
   * Unembed a service
   */
  async unembedService(serviceId: string): Promise<void> {
    const state = this.embeddedServices.get(serviceId);
    if (!state) {
      console.warn(`Service ${serviceId} is not embedded`);
      return;
    }

    // Remove iframe
    if (state.iframe && state.iframe.parentNode) {
      state.iframe.parentNode.removeChild(state.iframe);
    }

    // Update state
    state.status = ServiceStatus.UNLOADED;
    state.iframe = null;

    // Remove from map
    this.embeddedServices.delete(serviceId);

    console.log(`Service ${serviceId} unembedded`);
  }

  /**
   * Reload a service
   */
  async reloadService(serviceId: string): Promise<void> {
    const state = this.embeddedServices.get(serviceId);
    if (!state || !state.iframe) {
      throw new Error(`Service ${serviceId} is not embedded`);
    }

    // Send reload message
    this.sendMessage(serviceId, MessageFactory.reload());

    // Or reload iframe
    state.iframe.src = state.iframe.src;
    state.status = ServiceStatus.LOADING;
    state.ready = false;

    console.log(`Service ${serviceId} reloading`);
  }

  /**
   * Send message to embedded service
   */
  sendMessage(serviceId: string, message: EmbeddingMessage): void {
    const state = this.embeddedServices.get(serviceId);
    if (!state || !state.iframe) {
      console.error(`Cannot send message: service ${serviceId} not embedded`);
      return;
    }

    const url = new URL(state.iframe.src);
    this.messageBridge.send(state.iframe, message, url.origin);
  }

  /**
   * Register message handler
   */
  onMessage(type: string, handler: MessageHandler): void {
    this.messageBridge.on(type, handler);
  }

  /**
   * Forward authentication token to service
   */
  async forwardAuthToken(
    serviceId: string,
    token: string,
    sessionId: string,
    userId: string,
    username: string
  ): Promise<void> {
    const state = this.embeddedServices.get(serviceId);
    if (!state || !state.iframe) {
      throw new Error(`Service ${serviceId} is not embedded`);
    }

    const message = MessageFactory.authToken(token, sessionId, userId, username);
    this.sendMessage(serviceId, message);

    console.log(`Auth token forwarded to service ${serviceId}`);
  }

  /**
   * List all embedded services
   */
  listEmbeddedServices(): string[] {
    return Array.from(this.embeddedServices.keys());
  }

  /**
   * Get service status
   */
  getServiceStatus(serviceId: string): ServiceStatus {
    const state = this.embeddedServices.get(serviceId);
    return state?.status || ServiceStatus.UNLOADED;
  }

  /**
   * Get full service state
   */
  getServiceState(serviceId: string): EmbeddedServiceState | null {
    return this.embeddedServices.get(serviceId) || null;
  }

  /**
   * Check service health
   */
  async checkServiceHealth(serviceId: string): Promise<boolean> {
    const state = this.embeddedServices.get(serviceId);
    if (!state || !state.iframe) {
      return false;
    }

    return state.status === ServiceStatus.READY && state.ready;
  }

  /**
   * Switch to a different service (hide others, show target)
   */
  async switchToService(serviceId: string): Promise<void> {
    // Hide all services
    for (const [id, state] of this.embeddedServices.entries()) {
      if (state.iframe) {
        state.iframe.style.display = id === serviceId ? 'block' : 'none';
      }
    }

    this.currentServiceId = serviceId;
    console.log(`Switched to service ${serviceId}`);
  }

  /**
   * Get current active service
   */
  getCurrentService(): string | null {
    return this.currentServiceId;
  }

  /**
   * Clean up
   */
  destroy(): void {
    // Unembed all services
    const serviceIds = Array.from(this.embeddedServices.keys());
    for (const serviceId of serviceIds) {
      this.unembedService(serviceId);
    }

    this.messageBridge.destroy();
  }
}
