/**
 * Embedded Service Viewer Component
 * UI component for displaying and managing embedded services
 */

import { EmbeddingManager } from '../portal/embedding-manager';
import { EmbeddedServiceConfig } from '../types/embedding';

export interface EmbeddedServiceViewerConfig {
  containerId: string;
  services: EmbeddedServiceConfig[];
  embeddingManager: EmbeddingManager;
  onServiceSwitch?: (serviceId: string) => void;
  showNavigation?: boolean;
}

export class EmbeddedServiceViewer {
  private containerId: string;
  private services: EmbeddedServiceConfig[];
  private embeddingManager: EmbeddingManager;
  private onServiceSwitch?: (serviceId: string) => void;
  private showNavigation: boolean;
  private currentServiceId: string | null = null;

  constructor(config: EmbeddedServiceViewerConfig) {
    this.containerId = config.containerId;
    this.services = config.services;
    this.embeddingManager = config.embeddingManager;
    this.onServiceSwitch = config.onServiceSwitch;
    this.showNavigation = config.showNavigation !== false;
  }

  /**
   * Render the viewer
   */
  render(): void {
    const container = document.getElementById(this.containerId);
    if (!container) {
      throw new Error(`Container ${this.containerId} not found`);
    }

    container.innerHTML = this.generateHTML();
    this.attachEventListeners();

    // Embed first service by default
    if (this.services.length > 0) {
      this.switchService(this.services[0].id);
    }
  }

  /**
   * Generate HTML structure
   */
  private generateHTML(): string {
    return `
      <div class="embedded-service-viewer">
        ${this.showNavigation ? this.generateNavigation() : ''}
        <div class="embedded-service-container" id="${this.containerId}-container">
          <div class="loading-overlay" id="${this.containerId}-loading">
            <div class="loading-spinner"></div>
            <div class="loading-text">Loading service...</div>
          </div>
        </div>
      </div>
      <style>
        .embedded-service-viewer {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: #f5f5f5;
        }

        .service-navigation {
          background: white;
          border-bottom: 1px solid #e0e0e0;
          padding: 0;
          display: flex;
          gap: 0;
        }

        .service-nav-item {
          padding: 1rem 1.5rem;
          border: none;
          background: transparent;
          cursor: pointer;
          font-size: 0.9rem;
          font-weight: 500;
          color: #666;
          border-bottom: 3px solid transparent;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .service-nav-item:hover {
          background: #f8f9fa;
          color: #333;
        }

        .service-nav-item.active {
          color: #667eea;
          border-bottom-color: #667eea;
        }

        .service-icon {
          font-size: 1.2rem;
        }

        .embedded-service-container {
          flex: 1;
          position: relative;
          overflow: hidden;
        }

        .embedded-service-container iframe {
          width: 100%;
          height: 100%;
          border: none;
          display: block;
        }

        .loading-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(255, 255, 255, 0.9);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .loading-overlay.hidden {
          display: none;
        }

        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 4px solid #e0e0e0;
          border-top-color: #667eea;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        .loading-text {
          margin-top: 1rem;
          color: #666;
          font-size: 0.9rem;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .error-message {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: white;
          padding: 2rem;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          text-align: center;
          max-width: 400px;
        }

        .error-icon {
          font-size: 3rem;
          color: #e74c3c;
          margin-bottom: 1rem;
        }

        .error-title {
          font-size: 1.2rem;
          font-weight: 600;
          color: #333;
          margin-bottom: 0.5rem;
        }

        .error-description {
          color: #666;
          margin-bottom: 1rem;
        }

        .retry-button {
          background: #667eea;
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 0.5rem;
          cursor: pointer;
          font-weight: 500;
        }

        .retry-button:hover {
          background: #5568d3;
        }
      </style>
    `;
  }

  /**
   * Generate navigation HTML
   */
  private generateNavigation(): string {
    const navItems = this.services.map(service => `
      <button
        class="service-nav-item"
        data-service-id="${service.id}"
        data-testid="nav-${service.id}"
      >
        ${service.icon ? `<span class="service-icon">${service.icon}</span>` : ''}
        <span>${service.name}</span>
      </button>
    `).join('');

    return `
      <nav class="service-navigation" data-testid="service-navigation">
        ${navItems}
      </nav>
    `;
  }

  /**
   * Attach event listeners
   */
  private attachEventListeners(): void {
    // Navigation click handlers
    const navItems = document.querySelectorAll('.service-nav-item');
    navItems.forEach(item => {
      item.addEventListener('click', () => {
        const serviceId = item.getAttribute('data-service-id');
        if (serviceId) {
          this.switchService(serviceId);
        }
      });
    });

    // Listen for service errors
    this.embeddingManager.onMessage('ERROR', (message, serviceId) => {
      this.showError(serviceId, message.data?.message || 'Unknown error');
    });

    // Listen for service ready
    this.embeddingManager.onMessage('READY', (message, serviceId) => {
      this.hideLoading();
    });
  }

  /**
   * Switch to a different service
   */
  async switchService(serviceId: string): Promise<void> {
    const service = this.services.find(s => s.id === serviceId);
    if (!service) {
      console.error(`Service ${serviceId} not found`);
      return;
    }

    // Update active navigation
    this.updateActiveNav(serviceId);

    // Show loading
    this.showLoading();

    try {
      // Check if already embedded
      const embeddedServices = this.embeddingManager.listEmbeddedServices();

      if (!embeddedServices.includes(serviceId)) {
        // Embed the service
        const container = document.getElementById(`${this.containerId}-container`);
        if (!container) {
          throw new Error('Container not found');
        }

        await this.embeddingManager.embedService(serviceId, service, container);
      }

      // Switch to the service
      await this.embeddingManager.switchToService(serviceId);

      this.currentServiceId = serviceId;
      this.hideLoading();

      // Call callback
      if (this.onServiceSwitch) {
        this.onServiceSwitch(serviceId);
      }
    } catch (error) {
      console.error(`Failed to switch to service ${serviceId}:`, error);
      this.showError(serviceId, error instanceof Error ? error.message : 'Failed to load service');
    }
  }

  /**
   * Update active navigation item
   */
  private updateActiveNav(serviceId: string): void {
    const navItems = document.querySelectorAll('.service-nav-item');
    navItems.forEach(item => {
      if (item.getAttribute('data-service-id') === serviceId) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });
  }

  /**
   * Show loading overlay
   */
  private showLoading(): void {
    const loading = document.getElementById(`${this.containerId}-loading`);
    if (loading) {
      loading.classList.remove('hidden');
    }
  }

  /**
   * Hide loading overlay
   */
  private hideLoading(): void {
    const loading = document.getElementById(`${this.containerId}-loading`);
    if (loading) {
      loading.classList.add('hidden');
    }
  }

  /**
   * Show error message
   */
  private showError(serviceId: string, message: string): void {
    const container = document.getElementById(`${this.containerId}-container`);
    if (!container) return;

    const errorHTML = `
      <div class="error-message" data-testid="error-message">
        <div class="error-icon">⚠️</div>
        <div class="error-title">Service Error</div>
        <div class="error-description">${message}</div>
        <button class="retry-button" onclick="window.location.reload()">
          Retry
        </button>
      </div>
    `;

    // Create temporary div to hold error
    const errorDiv = document.createElement('div');
    errorDiv.innerHTML = errorHTML;
    container.appendChild(errorDiv);

    this.hideLoading();
  }

  /**
   * Get current service
   */
  getCurrentService(): string | null {
    return this.currentServiceId;
  }

  /**
   * Add a new service to the viewer
   */
  addService(service: EmbeddedServiceConfig): void {
    this.services.push(service);
    this.render(); // Re-render to show new service
  }

  /**
   * Remove a service from the viewer
   */
  async removeService(serviceId: string): Promise<void> {
    this.services = this.services.filter(s => s.id !== serviceId);
    await this.embeddingManager.unembedService(serviceId);
    this.render(); // Re-render
  }

  /**
   * Destroy the viewer
   */
  destroy(): void {
    const container = document.getElementById(this.containerId);
    if (container) {
      container.innerHTML = '';
    }
  }
}
