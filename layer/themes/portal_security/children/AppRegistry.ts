import { SecurityConstants } from './SecurityConstants';

export interface RegisteredApp {
  id: string;
  name: string;
  url: string;
  icon?: string;
  description?: string;
  requiresAuth?: boolean;
  order?: number;
}

export class AppRegistry {
  private static instance: AppRegistry;
  private apps: Map<string, RegisteredApp> = new Map();

  private constructor() {
    // Initialize with default apps
    this.registerDefaultApps();
  }

  static getInstance(): AppRegistry {
    if (!AppRegistry.instance) {
      AppRegistry.instance = new AppRegistry();
    }
    return AppRegistry.instance;
  }

  private registerDefaultApps(): void {
    const defaultApps: RegisteredApp[] = [
      {
        id: 'portal',
        name: 'AI Dev Portal',
        url: 'http://localhost:3400',
        icon: '🏠',
        description: 'Main development portal',
        requiresAuth: true,
        order: 1
      },
      {
        id: 'gui-selector',
        name: 'GUI Selector',
        url: 'http://localhost:3456', // Existing GUI Selector ports
        icon: '🎨',
        description: 'Design template selection',
        requiresAuth: false,
        order: 2
      },
      {
        id: 'chat-space',
        name: 'Chat Space',
        url: 'http://localhost:3300',
        icon: '💬',
        description: 'Real-time chat',
        requiresAuth: true,
        order: 3
      },
      {
        id: "pocketflow",
        name: "PocketFlow",
        url: 'http://localhost:3500',
        icon: '📋',
        description: 'Task management',
        requiresAuth: true,
        order: 4
      }
    ];

    defaultApps.forEach(app => this.register(app));
  }

  register(app: RegisteredApp): void {
    this.apps.set(app.id, app);
  }

  unregister(appId: string): void {
    this.apps.delete(appId);
  }

  get(appId: string): RegisteredApp | undefined {
    return this.apps.get(appId);
  }

  getAll(): RegisteredApp[] {
    return Array.from(this.apps.values())
      .sort((a, b) => (a.order || 999) - (b.order || 999));
  }

  getAccessibleApps(isAuthenticated: boolean): RegisteredApp[] {
    return this.getAll().filter(app => 
      !app.requiresAuth || isAuthenticated
    );
  }

  generateNavigationHTML(currentAppId: string, isAuthenticated: boolean): string {
    const apps = this.getAccessibleApps(isAuthenticated);
    
    const navItems = apps.map(app => {
      const isActive = app.id === currentAppId;
      return `
        <a href="${app.url}" 
           class="nav-item ${isActive ? 'active' : ''}"
           title="${app.description || app.name}">
          <span class="nav-icon">${app.icon || '📱'}</span>
          <span class="nav-text">${app.name}</span>
        </a>
      `;
    }).join('');

    return `
      <nav class="app-navigation">
        <style>
          .app-navigation {
            background: #2c3e50;
            padding: 0.5rem 1rem;
            display: flex;
            gap: 1rem;
            align-items: center;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .nav-item {
            color: #ecf0f1;
            text-decoration: none;
            padding: 0.5rem 1rem;
            border-radius: 4px;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            transition: background 0.2s;
          }
          .nav-item:hover {
            background: #34495e;
          }
          .nav-item.active {
            background: #3498db;
          }
          .nav-icon {
            font-size: 1.2rem;
          }
          .nav-text {
            font-size: 0.9rem;
          }
          .nav-divider {
            flex: 1;
          }
          .nav-user {
            color: #ecf0f1;
            font-size: 0.9rem;
          }
        </style>
        ${navItems}
        <div class="nav-divider"></div>
        ${isAuthenticated ? '<span class="nav-user" id="navUserInfo"></span>' : ''}
      </nav>
    `;
  }

  generateNavigationScript(): string {
    return `
      <script>
        (function() {
          // Update user info in navigation
          const updateNavUser = async () => {
            try {
              const response = await fetch('/api/auth/check');
              const data = await response.json();
              const navUserInfo = document.getElementById("navUserInfo");
              
              if (navUserInfo && data.authenticated) {
                navUserInfo.textContent = '👤 ' + data.user.username;
              }
            } catch (error) {
              console.error('Failed to update nav user info:', error);
            }
          };
          
          // Update on page load
          if (document.readyState === 'loading') {
            document.addEventListener("DOMContentLoaded", updateNavUser);
          } else {
            updateNavUser();
          }
        })();
      </script>
    `;
  }
}