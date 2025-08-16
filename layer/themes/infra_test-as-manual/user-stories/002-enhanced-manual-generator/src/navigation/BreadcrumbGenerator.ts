/**
 * Breadcrumb Generator
 * Generates breadcrumb navigation for context awareness
 */

export interface BreadcrumbItem {
  id: string;
  title: string;
  href: string;
  icon?: string;
  active?: boolean;
}

export interface BreadcrumbOptions {
  separator?: string;
  homeTitle?: string;
  homeHref?: string;
  maxItems?: number;
  truncateLength?: number;
  format?: 'html' | 'json' | 'text';
  includeSchema?: boolean;
}

export interface NavigationNode {
  id: string;
  title: string;
  href: string;
  parent?: string;
  children?: string[];
  metadata?: Record<string, any>;
}

export class BreadcrumbGenerator {
  private nodes: Map<string, NavigationNode> = new Map();
  private currentPath: string[] = [];
  private options: BreadcrumbOptions;

  constructor(options: BreadcrumbOptions = {}) {
    this.options = {
      separator: '/',
      homeTitle: 'Home',
      homeHref: '/',
      maxItems: 0, // 0 means no limit
      truncateLength: 30,
      format: 'html',
      includeSchema: true,
      ...options
    };
  }

  /**
   * Register a navigation node
   */
  registerNode(node: NavigationNode): void {
    this.nodes.set(node.id, node);
    
    // Update parent's children list
    if (node.parent) {
      const parent = this.nodes.get(node.parent);
      if (parent) {
        parent.children = parent.children || [];
        if (!parent.children.includes(node.id)) {
          parent.children.push(node.id);
        }
      }
    }
  }

  /**
   * Set current navigation position
   */
  setCurrentPosition(nodeId: string): void {
    const path = this.buildPath(nodeId);
    this.currentPath = path;
  }

  /**
   * Build path from root to specified node
   */
  private buildPath(nodeId: string): string[] {
    const path: string[] = [];
    let current = this.nodes.get(nodeId);

    while (current) {
      path.unshift(current.id);
      if (current.parent) {
        current = this.nodes.get(current.parent);
      } else {
        break;
      }
    }

    return path;
  }

  /**
   * Generate breadcrumbs for current position
   */
  generate(): string {
    const items = this.getBreadcrumbItems();

    switch (this.options.format) {
      case 'json':
        return this.generateJSON(items);
      case 'text':
        return this.generateText(items);
      case 'html':
      default:
        return this.generateHTML(items);
    }
  }

  /**
   * Get breadcrumb items for current path
   */
  private getBreadcrumbItems(): BreadcrumbItem[] {
    const items: BreadcrumbItem[] = [];

    // Add home item
    if (this.options.homeTitle && this.options.homeHref) {
      items.push({
        id: 'home',
        title: this.options.homeTitle,
        href: this.options.homeHref,
        active: this.currentPath.length === 0
      });
    }

    // Add path items
    this.currentPath.forEach((nodeId, index) => {
      const node = this.nodes.get(nodeId);
      if (node) {
        items.push({
          id: node.id,
          title: this.truncateTitle(node.title),
          href: node.href,
          active: index === this.currentPath.length - 1
        });
      }
    });

    // Apply max items limit if specified
    if (this.options.maxItems && this.options.maxItems > 0 && items.length > this.options.maxItems) {
      const start = items.slice(0, 1); // Keep home
      const end = items.slice(-(this.options.maxItems - 2)); // Keep last items
      return [
        ...start,
        { id: "ellipsis", title: '...', href: '#', active: false },
        ...end
      ];
    }

    return items;
  }

  /**
   * Generate HTML breadcrumbs
   */
  private generateHTML(items: BreadcrumbItem[]): string {
    let html = '<nav aria-label="Breadcrumb"';
    
    if (this.options.includeSchema) {
      html += ' itemscope itemtype="https://schema.org/BreadcrumbList"';
    }
    
    html += '>\n';
    html += '  <ol class="breadcrumb">\n';

    items.forEach((item, index) => {
      const isLast = index === items.length - 1;
      
      html += '    <li class="breadcrumb-item';
      if (item.active) html += ' active';
      html += '"';
      
      if (this.options.includeSchema) {
        html += ` itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem"`;
      }
      
      html += '>\n';

      if (item.id === "ellipsis") {
        html += '      <span class="breadcrumb-ellipsis">...</span>\n';
      } else if (isLast && item.active) {
        html += `      <span`;
        if (this.options.includeSchema) {
          html += ` itemprop="name"`;
        }
        html += `>${item.title}</span>\n`;
        
        if (this.options.includeSchema) {
          html += `      <meta itemprop="position" content="${index + 1}" />\n`;
        }
      } else {
        html += `      <a href="${item.href}"`;
        if (this.options.includeSchema) {
          html += ` itemprop="item"`;
        }
        html += `>`;
        
        if (item.icon) {
          html += `<i class="${item.icon}"></i> `;
        }
        
        if (this.options.includeSchema) {
          html += `<span itemprop="name">`;
        }
        
        html += item.title;
        
        if (this.options.includeSchema) {
          html += `</span>`;
        }
        
        html += `</a>\n`;
        
        if (this.options.includeSchema) {
          html += `      <meta itemprop="position" content="${index + 1}" />\n`;
        }
      }

      html += '    </li>\n';

      // Add separator
      if (!isLast && this.options.separator && this.options.format === 'html') {
        html += `    <li class="breadcrumb-separator" aria-hidden="true">${this.options.separator}</li>\n`;
      }
    });

    html += '  </ol>\n';
    html += '</nav>';

    return html;
  }

  /**
   * Generate text breadcrumbs
   */
  private generateText(items: BreadcrumbItem[]): string {
    return items
      .map(item => item.id === "ellipsis" ? '...' : item.title)
      .join(` ${this.options.separator} `);
  }

  /**
   * Generate JSON breadcrumbs
   */
  private generateJSON(items: BreadcrumbItem[]): string {
    return JSON.stringify({
      items,
      currentPath: this.currentPath,
      options: this.options
    }, null, 2);
  }

  /**
   * Truncate title if too long
   */
  private truncateTitle(title: string): string {
    if (!this.options.truncateLength || title.length <= this.options.truncateLength) {
      return title;
    }

    const truncated = title.substring(0, this.options.truncateLength - 3);
    return `${truncated}...`;
  }

  /**
   * Get navigation tree structure
   */
  getNavigationTree(rootId?: string): any {
    const buildTree = (nodeId?: string): any => {
      const node = nodeId ? this.nodes.get(nodeId) : null;
      
      if (!node && nodeId) {
        return null;
      }

      // If no node specified, find root nodes
      if (!node) {
        const roots = Array.from(this.nodes.values()).filter(n => !n.parent);
        return roots.map(root => buildTree(root.id));
      }

      const result: any = {
        id: node.id,
        title: node.title,
        href: node.href,
        metadata: node.metadata,
        children: []
      };

      if (node.children) {
        result.children = node.children
          .map(childId => buildTree(childId))
          .filter(child => child !== null);
      }

      return result;
    };

    return buildTree(rootId);
  }

  /**
   * Get siblings of current node
   */
  getSiblings(nodeId?: string): NavigationNode[] {
    const targetId = nodeId || this.currentPath[this.currentPath.length - 1];
    if (!targetId) return [];

    const node = this.nodes.get(targetId);
    if (!node || !node.parent) return [];

    const parent = this.nodes.get(node.parent);
    if (!parent || !parent.children) return [];

    return parent.children
      .filter(id => id !== targetId)
      .map(id => this.nodes.get(id))
      .filter((n): n is NavigationNode => n !== undefined);
  }

  /**
   * Get previous and next navigation items
   */
  getPrevNext(nodeId?: string): {
    prev: NavigationNode | null;
    next: NavigationNode | null;
  } {
    const targetId = nodeId || this.currentPath[this.currentPath.length - 1];
    if (!targetId) return { prev: null, next: null };

    const allNodes = Array.from(this.nodes.values());
    const index = allNodes.findIndex(n => n.id === targetId);

    return {
      prev: index > 0 ? allNodes[index - 1] : null,
      next: index < allNodes.length - 1 ? allNodes[index + 1] : null
    };
  }

  /**
   * Clear all navigation data
   */
  clear(): void {
    this.nodes.clear();
    this.currentPath = [];
  }

  /**
   * Export navigation structure
   */
  export(): string {
    return JSON.stringify({
      nodes: Array.from(this.nodes.entries()),
      currentPath: this.currentPath,
      options: this.options
    });
  }

  /**
   * Import navigation structure
   */
  import(data: string): void {
    const parsed = JSON.parse(data);
    this.nodes = new Map(parsed.nodes);
    this.currentPath = parsed.currentPath || [];
    this.options = { ...this.options, ...parsed.options };
  }
}