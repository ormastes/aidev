/**
 * Portal Embed Fix for GUI Selector and Other Web Apps
 * 
 * This module provides the implementation to fix web apps that should run
 * inside other web applications like the AI Dev Portal.
 */

import { EmbeddedAppManager } from './index';

/**
 * Enhanced portal with embedded app support
 */
export class EnhancedPortal {
  private embeddedApps: Map<string, EmbeddedAppManager> = new Map();
  private currentApp: EmbeddedAppManager | null = null;
  private container: HTMLElement;

  constructor(containerId: string = 'app-container') {
    const container = document.getElementById(containerId);
    if (!container) {
      // Create container if it doesn't exist
      this.container = document.createElement('div');
      this.container.id = containerId;
      this.container.style.cssText = `
        width: 100%;
        height: calc(100vh - 200px);
        position: relative;
        background: #f5f5f5;
        border-radius: 8px;
        overflow: hidden;
      `;
      document.body.appendChild(this.container);
    } else {
      this.container = container;
    }

    this.setupPortalEnhancements();
  }

  /**
   * Setup portal enhancements for embedded apps
   */
  private setupPortalEnhancements(): void {
    // Add styles for embedded view
    const style = document.createElement('style');
    style.textContent = `
      .embedded-app-container {
        width: 100%;
        height: 100%;
        position: relative;
        display: flex;
        flex-direction: column;
      }

      .embedded-app-header {
        background: white;
        border-bottom: 1px solid #e0e0e0;
        padding: 12px 20px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      }

      .embedded-app-title {
        font-size: 18px;
        font-weight: 600;
        color: #333;
      }

      .embedded-app-controls {
        display: flex;
        gap: 10px;
      }

      .embedded-app-btn {
        padding: 6px 12px;
        border: 1px solid #ddd;
        background: white;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        transition: all 0.2s;
      }

      .embedded-app-btn:hover {
        background: #f0f0f0;
        border-color: #999;
      }

      .embedded-app-btn.active {
        background: #007bff;
        color: white;
        border-color: #007bff;
      }

      .embedded-app-content {
        flex: 1;
        position: relative;
        background: white;
      }

      .embedded-app-iframe {
        width: 100%;
        height: 100%;
        border: none;
      }

      .embedded-app-error {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        text-align: center;
        padding: 20px;
        background: white;
        border-radius: 8px;
        box-shadow: 0 4px 8px rgba(0,0,0,0.1);
      }

      .embedded-app-loading {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .spinner {
        border: 3px solid #f3f3f3;
        border-top: 3px solid #007bff;
        border-radius: 50%;
        width: 30px;
        height: 30px;
        animation: spin 1s linear infinite;
      }

      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }

      /* Responsive styles */
      @media (max-width: 768px) {
        .embedded-app-header {
          padding: 8px 12px;
        }

        .embedded-app-title {
          font-size: 16px;
        }

        .embedded-app-btn {
          padding: 4px 8px;
          font-size: 12px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Register an app for embedding
   */
  public registerApp(
    appId: string,
    appName: string,
    embeddedUrl: string,
    options: {
      sandboxAttributes?: string[];
      allowedOrigins?: string[];
    } = {}
  ): void {
    const manager = new EmbeddedAppManager({
      appName,
      parentUrl: window.location.origin,
      embeddedUrl,
      iframeId: `embedded-${appId}`,
      sandboxAttributes: options.sandboxAttributes || [
        'allow-scripts',
        'allow-same-origin',
        'allow-forms',
        'allow-popups',
        'allow-modals'
      ],
      allowedOrigins: options.allowedOrigins || [embeddedUrl.split('/').slice(0, 3).join('/')]
    });

    // Setup standard message handlers
    manager.onMessage('resize', (payload: any) => {
      const iframe = document.getElementById(`embedded-${appId}`) as HTMLIFrameElement;
      if (iframe && payload.height) {
        iframe.style.height = `${payload.height}px`;
      }
    });

    manager.onMessage('navigate', (payload: any) => {
      if (payload.url && payload.external) {
        window.open(payload.url, '_blank');
      }
    });

    manager.onMessage('ready', () => {
      console.log(`Embedded app ${appName} is ready`);
      this.hideLoading();
    });

    this.embeddedApps.set(appId, manager);
  }

  /**
   * Launch an embedded app
   */
  public launchApp(appId: string): void {
    const manager = this.embeddedApps.get(appId);
    if (!manager) {
      console.error(`App ${appId} not registered`);
      return;
    }

    // Clear current container
    this.container.innerHTML = '';

    // Create embedded app structure
    const appContainer = document.createElement('div');
    appContainer.className = 'embedded-app-container';

    // Create header
    const header = document.createElement('div');
    header.className = 'embedded-app-header';
    header.innerHTML = `
      <div class="embedded-app-title">${manager['config'].appName}</div>
      <div class="embedded-app-controls">
        <button class="embedded-app-btn" onclick="this.refreshApp()">
          <i class="fas fa-sync-alt"></i> Refresh
        </button>
        <button class="embedded-app-btn" onclick="this.openExternal()">
          <i class="fas fa-external-link-alt"></i> Open External
        </button>
        <button class="embedded-app-btn" onclick="this.toggleFullscreen()">
          <i class="fas fa-expand"></i> Fullscreen
        </button>
      </div>
    `;

    // Create content area
    const content = document.createElement('div');
    content.className = 'embedded-app-content';

    // Show loading
    this.showLoading(content);

    // Append to container
    appContainer.appendChild(header);
    appContainer.appendChild(content);
    this.container.appendChild(appContainer);

    // Embed the app
    try {
      const iframe = manager.embedApp(content.id || 'embedded-app-content');
      
      // Handle iframe load events
      iframe.onload = () => {
        this.hideLoading();
        console.log(`App ${appId} loaded successfully`);
      };

      iframe.onerror = () => {
        this.showError(content, 'Failed to load application');
      };

      this.currentApp = manager;
    } catch (error) {
      this.showError(content, `Error embedding app: ${error.message}`);
    }
  }

  /**
   * Show loading spinner
   */
  private showLoading(container: HTMLElement): void {
    const loading = document.createElement('div');
    loading.className = 'embedded-app-loading';
    loading.innerHTML = `
      <div class="spinner"></div>
      <span>Loading application...</span>
    `;
    container.appendChild(loading);
  }

  /**
   * Hide loading spinner
   */
  private hideLoading(): void {
    const loading = this.container.querySelector('.embedded-app-loading');
    if (loading) {
      loading.remove();
    }
  }

  /**
   * Show error message
   */
  private showError(container: HTMLElement, message: string): void {
    container.innerHTML = `
      <div class="embedded-app-error">
        <i class="fas fa-exclamation-circle" style="font-size: 48px; color: #dc3545; margin-bottom: 16px;"></i>
        <h3>Application Error</h3>
        <p>${message}</p>
        <button class="embedded-app-btn" onclick="location.reload()">Reload Page</button>
      </div>
    `;
  }

  /**
   * Refresh current app
   */
  public refreshApp(): void {
    const iframe = this.container.querySelector('iframe') as HTMLIFrameElement;
    if (iframe) {
      iframe.src = iframe.src;
    }
  }

  /**
   * Open app in external window
   */
  public openExternal(): void {
    if (this.currentApp) {
      window.open(this.currentApp['config'].embeddedUrl, '_blank');
    }
  }

  /**
   * Toggle fullscreen mode
   */
  public toggleFullscreen(): void {
    if (!document.fullscreenElement) {
      this.container.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }
}

/**
 * Implementation example for AI Dev Portal
 */
export function implementPortalFix(): void {
  // This would be added to the AI Dev Portal's app.js/ts file
  const code = `
  // Add to the AI Dev Portal app.js after login success
  
  // Import or include the EnhancedPortal class
  const portal = new EnhancedPortal('apps-view');
  
  // Register GUI Selector app
  portal.registerApp(
    'gui-selector',
    'GUI Selector',
    'http://localhost:3457/gui-selector.html',
    {
      sandboxAttributes: [
        'allow-scripts',
        'allow-same-origin',
        'allow-forms',
        'allow-modals'
      ],
      allowedOrigins: ['http://localhost:3457']
    }
  );
  
  // Register other apps
  portal.registerApp(
    'story-reporter',
    'Story Reporter',
    'http://localhost:3458',
    {
      allowedOrigins: ['http://localhost:3458']
    }
  );
  
  // Modify the renderApps function to support embedded view
  function renderApps() {
    const container = getElementById('apps-list');
    container.innerHTML = '';
    
    // Add embedded/external toggle
    const toggleDiv = document.createElement('div');
    toggleDiv.className = 'view-toggle';
    toggleDiv.innerHTML = \`
      <button id="embed-view-btn" class="view-btn active">Embedded View</button>
      <button id="external-view-btn" class="view-btn">External Links</button>
    \`;
    container.appendChild(toggleDiv);
    
    // Render apps based on selected view
    const appsGrid = document.createElement('div');
    appsGrid.className = 'apps-grid';
    
    state.apps.forEach(app => {
      const appCard = document.createElement('div');
      appCard.className = 'app-card';
      appCard.innerHTML = \`
        <h3>\${escapeHtml(app.name)}</h3>
        <p class="app-template">Template: \${escapeHtml(app.template)}</p>
        <div class="app-actions">
          <button onclick="portal.launchApp('\${app.id}')" class="btn-primary">
            Open Embedded
          </button>
          <a href="\${app.webServerUrl}" target="_blank" class="btn-secondary">
            Open External
          </a>
        </div>
      \`;
      appsGrid.appendChild(appCard);
    });
    
    container.appendChild(appsGrid);
  }
  
  // Update Web Server link to support embedded view
  getElementById('webserver-link').addEventListener('click', (e) => {
    e.preventDefault();
    if (state.selectedApp && portal) {
      portal.launchApp(state.selectedApp.id);
    }
  });
  `;

  console.log('Portal fix implementation:', code);
}

/**
 * GUI Selector modifications for embedded mode
 */
export function guiSelectorEmbedFix(): void {
  const code = `
  // Add to GUI Selector's initialization code
  
  // Check if running in embedded mode
  if (window.self !== window.top) {
    // We're in an iframe
    console.log('Running in embedded mode');
    
    // Notify parent that we're ready
    window.parent.postMessage({
      type: 'ready',
      source: 'gui-selector'
    }, '*');
    
    // Adjust styles for embedded view
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    document.querySelector('.navbar')?.remove(); // Remove duplicate nav if present
    
    // Send resize requests when content changes
    const observer = new ResizeObserver(() => {
      window.parent.postMessage({
        type: 'resize',
        payload: {
          height: document.body.scrollHeight,
          width: document.body.scrollWidth
        }
      }, '*');
    });
    observer.observe(document.body);
    
    // Handle navigation within iframe
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a');
      if (link && link.href && !link.target) {
        e.preventDefault();
        // Navigate within iframe
        window.location.href = link.href;
      }
    });
    
    // Listen for commands from parent
    window.addEventListener('message', (event) => {
      if (event.data.type === 'refresh') {
        location.reload();
      } else if (event.data.type === 'navigate') {
        window.location.href = event.data.payload.url;
      }
    });
  }
  `;

  console.log('GUI Selector embed fix:', code);
}

// Export default implementation
export default {
  EnhancedPortal,
  implementPortalFix,
  guiSelectorEmbedFix
};