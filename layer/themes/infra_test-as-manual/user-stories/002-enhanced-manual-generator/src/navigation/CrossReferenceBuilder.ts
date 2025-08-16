/**
 * Cross-Reference Builder
 * Manages cross-references and links between test cases and sections
 */

export interface CrossReference {
  id: string;
  source: string;
  target: string;
  type: 'test' | 'section' | "requirement" | "glossary" | "external";
  text: string;
  context?: string;
}

export interface LinkTarget {
  id: string;
  title: string;
  type: string;
  href: string;
  description?: string;
}

export class CrossReferenceBuilder {
  private references: Map<string, CrossReference> = new Map();
  private targets: Map<string, LinkTarget> = new Map();
  private orphanedLinks: Set<string> = new Set();

  /**
   * Register a link target
   */
  registerTarget(target: LinkTarget): void {
    this.targets.set(target.id, target);
    
    // Check if any orphaned links can now be resolved
    this.resolveOrphanedLinks(target.id);
  }

  /**
   * Add a cross-reference
   */
  addReference(ref: Omit<CrossReference, 'id'>): string {
    const id = `ref-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const reference: CrossReference = { ...ref, id };
    
    this.references.set(id, reference);
    
    // Check if target exists
    if (!this.targets.has(ref.target)) {
      this.orphanedLinks.add(ref.target);
    }
    
    return id;
  }

  /**
   * Build cross-reference links for a document
   */
  buildLinks(content: string): string {
    let processedContent = content;

    // Pattern to match reference markers like [[test:TC001]] or {{section:intro}}
    const refPattern = /(\[\[|\{\{)([a-zA-Z]+):([a-zA-Z0-9_-]+)(\]\]|\}\})/g;
    
    processedContent = processedContent.replace(refPattern, (match, open, type, targetId) => {
      const target = this.targets.get(targetId);
      
      if (target) {
        return this.createLink(target, type as any);
      } else {
        // Mark as orphaned for later resolution
        this.orphanedLinks.add(targetId);
        return `<span class="ref-orphaned" data-target="${targetId}">${match}</span>`;
      }
    });

    return processedContent;
  }

  /**
   * Create a formatted link
   */
  private createLink(target: LinkTarget, type: string): string {
    const linkClass = `ref-link ref-${type}`;
    const title = target.description || target.title;
    
    return `<a href="${target.href}" class="${linkClass}" title="${title}">${target.title}</a>`;
  }

  /**
   * Resolve orphaned links when new targets are registered
   */
  private resolveOrphanedLinks(targetId: string): void {
    if (this.orphanedLinks.has(targetId)) {
      this.orphanedLinks.delete(targetId);
    }
  }

  /**
   * Get all cross-references for a specific source
   */
  getReferencesForSource(sourceId: string): CrossReference[] {
    return Array.from(this.references.values())
      .filter(ref => ref.source === sourceId);
  }

  /**
   * Get all references pointing to a specific target
   */
  getReferencesToTarget(targetId: string): CrossReference[] {
    return Array.from(this.references.values())
      .filter(ref => ref.target === targetId);
  }

  /**
   * Generate a reference index
   */
  generateIndex(): string {
    const index: Map<string, LinkTarget[]> = new Map();

    // Group targets by type
    for (const target of this.targets.values()) {
      const typeTargets = index.get(target.type) || [];
      typeTargets.push(target);
      index.set(target.type, typeTargets);
    }

    // Generate HTML index
    let html = '<div class="reference-index">\n';
    html += '<h2>Reference Index</h2>\n';

    for (const [type, targets] of index) {
      html += `<section class="ref-section ref-type-${type}">\n`;
      html += `<h3>${this.formatTypeName(type)}</h3>\n`;
      html += '<ul>\n';
      
      for (const target of targets.sort((a, b) => a.title.localeCompare(b.title))) {
        const refCount = this.getReferencesToTarget(target.id).length;
        html += `<li>`;
        html += `<a href="${target.href}">${target.title}</a>`;
        if (refCount > 0) {
          html += ` <span class="ref-count">(${refCount} references)</span>`;
        }
        if (target.description) {
          html += `<br><small>${target.description}</small>`;
        }
        html += `</li>\n`;
      }
      
      html += '</ul>\n';
      html += '</section>\n';
    }

    html += '</div>\n';
    return html;
  }

  /**
   * Format type name for display
   */
  private formatTypeName(type: string): string {
    const typeNames: Record<string, string> = {
      'test': 'Test Cases',
      'section': "Sections",
      "requirement": "Requirements",
      "glossary": "Glossary",
      "external": 'External Links'
    };
    
    return typeNames[type] || type.charAt(0).toUpperCase() + type.slice(1);
  }

  /**
   * Validate all references and return orphaned links
   */
  validateReferences(): {
    valid: boolean;
    orphaned: string[];
    circular: string[][];
  } {
    const orphaned = Array.from(this.orphanedLinks);
    const circular = this.detectCircularReferences();
    
    return {
      valid: orphaned.length === 0 && circular.length === 0,
      orphaned,
      circular
    };
  }

  /**
   * Detect circular references
   */
  private detectCircularReferences(): string[][] {
    const circular: string[][] = [];
    const visited = new Set<string>();
    const path = new Set<string>();

    const dfs = (targetId: string, currentPath: string[]): boolean => {
      if (path.has(targetId)) {
        // Found circular reference
        const cycleStart = currentPath.indexOf(targetId);
        circular.push(currentPath.slice(cycleStart));
        return true;
      }

      if (visited.has(targetId)) {
        return false;
      }

      visited.add(targetId);
      path.add(targetId);
      currentPath.push(targetId);

      // Check all references from this target
      const refs = this.getReferencesForSource(targetId);
      for (const ref of refs) {
        if (dfs(ref.target, [...currentPath])) {
          return true;
        }
      }

      path.delete(targetId);
      return false;
    };

    // Check all targets
    for (const targetId of this.targets.keys()) {
      if (!visited.has(targetId)) {
        dfs(targetId, []);
      }
    }

    return circular;
  }

  /**
   * Export reference map for external use
   */
  exportReferenceMap(): {
    references: CrossReference[];
    targets: LinkTarget[];
    orphaned: string[];
  } {
    return {
      references: Array.from(this.references.values()),
      targets: Array.from(this.targets.values()),
      orphaned: Array.from(this.orphanedLinks)
    };
  }

  /**
   * Import reference map
   */
  importReferenceMap(map: {
    references: CrossReference[];
    targets: LinkTarget[];
  }): void {
    // Clear existing data
    this.references.clear();
    this.targets.clear();
    this.orphanedLinks.clear();

    // Import targets first
    for (const target of map.targets) {
      this.targets.set(target.id, target);
    }

    // Import references
    for (const ref of map.references) {
      this.references.set(ref.id, ref);
      if (!this.targets.has(ref.target)) {
        this.orphanedLinks.add(ref.target);
      }
    }
  }
}