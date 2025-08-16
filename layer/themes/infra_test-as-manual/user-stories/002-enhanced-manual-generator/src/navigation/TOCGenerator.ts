/**
 * Table of Contents Generator
 * Generates multi-level table of contents for test manuals
 */

export interface TOCEntry {
  id: string;
  title: string;
  level: number;
  href: string;
  children: TOCEntry[];
  pageNumber?: number;
}

export interface TOCOptions {
  maxDepth?: number;
  includePageNumbers?: boolean;
  format?: 'html' | "markdown" | 'json';
  collapsible?: boolean;
  numbered?: boolean;
}

export class TOCGenerator {
  private entries: TOCEntry[] = [];
  private currentId = 0;

  constructor(private options: TOCOptions = {}) {
    this.options = {
      maxDepth: 3,
      includePageNumbers: false,
      format: 'html',
      collapsible: true,
      numbered: true,
      ...options
    };
  }

  /**
   * Add an entry to the table of contents
   */
  addEntry(title: string, level: number, href?: string): string {
    const id = `toc-${++this.currentId}`;
    const entry: TOCEntry = {
      id,
      title,
      level,
      href: href || `#${id}`,
      children: []
    };

    if (level === 1) {
      this.entries.push(entry);
    } else {
      const parent = this.findParentEntry(level);
      if (parent) {
        parent.children.push(entry);
      } else {
        this.entries.push(entry);
      }
    }

    return id;
  }

  /**
   * Find the appropriate parent entry for a given level
   */
  private findParentEntry(level: number): TOCEntry | null {
    const findInEntries = (entries: TOCEntry[], targetLevel: number): TOCEntry | null => {
      for (let i = entries.length - 1; i >= 0; i--) {
        const entry = entries[i];
        if (entry.level === targetLevel - 1) {
          return entry;
        }
        if (entry.children.length > 0) {
          const childResult = findInEntries(entry.children, targetLevel);
          if (childResult) return childResult;
        }
      }
      return null;
    };

    return findInEntries(this.entries, level);
  }

  /**
   * Generate the table of contents in the specified format
   */
  generate(): string {
    switch (this.options.format) {
      case "markdown":
        return this.generateMarkdown();
      case 'json':
        return this.generateJSON();
      case 'html':
      default:
        return this.generateHTML();
    }
  }

  /**
   * Generate HTML table of contents
   */
  private generateHTML(): string {
    const renderEntries = (entries: TOCEntry[], depth: number = 0): string => {
      if (depth >= (this.options.maxDepth || 3)) return '';
      
      const items = entries.map(entry => {
        const numbering = this.options.numbered ? this.getNumbering(entry) : '';
        const pageNum = this.options.includePageNumbers && entry.pageNumber 
          ? `<span class="toc-page">${entry.pageNumber}</span>` 
          : '';
        
        const hasChildren = entry.children.length > 0;
        const childrenHtml = hasChildren ? renderEntries(entry.children, depth + 1) : '';
        
        return `
          <li class="toc-item toc-level-${entry.level}">
            <a href="${entry.href}" class="toc-link">
              ${numbering ? `<span class="toc-number">${numbering}</span>` : ''}
              <span class="toc-text">${entry.title}</span>
              ${pageNum}
            </a>
            ${childrenHtml}
          </li>
        `;
      }).join('');

      return `<ul class="toc-list ${this.options.collapsible ? "collapsible" : ''}">${items}</ul>`;
    };

    return `
      <nav class="table-of-contents">
        <h2>Table of Contents</h2>
        ${renderEntries(this.entries)}
      </nav>
    `;
  }

  /**
   * Generate Markdown table of contents
   */
  private generateMarkdown(): string {
    const renderEntries = (entries: TOCEntry[], depth: number = 0, prefix: string = ''): string => {
      if (depth >= (this.options.maxDepth || 3)) return '';

      return entries.map((entry, index) => {
        const indent = '  '.repeat(depth);
        const numbering = this.options.numbered 
          ? `${prefix}${index + 1}.` 
          : '-';
        
        let line = `${indent}${numbering} [${entry.title}](${entry.href})`;
        
        if (this.options.includePageNumbers && entry.pageNumber) {
          line += ` ........... ${entry.pageNumber}`;
        }

        const childrenMd = entry.children.length > 0
          ? '\n' + renderEntries(entry.children, depth + 1, `${prefix}${index + 1}.`)
          : '';

        return line + childrenMd;
      }).join('\n');
    };

    return `## Table of Contents\n\n${renderEntries(this.entries)}`;
  }

  /**
   * Generate JSON table of contents
   */
  private generateJSON(): string {
    return JSON.stringify({
      title: 'Table of Contents',
      entries: this.entries,
      options: this.options
    }, null, 2);
  }

  /**
   * Get numbering for an entry (e.g., "1.2.3")
   */
  private getNumbering(entry: TOCEntry): string {
    const getPath = (e: TOCEntry): number[] => {
      const findPath = (entries: TOCEntry[], target: TOCEntry, currentPath: number[] = []): number[] | null => {
        for (let i = 0; i < entries.length; i++) {
          if (entries[i] === target) {
            return [...currentPath, i + 1];
          }
          const childPath = findPath(entries[i].children, target, [...currentPath, i + 1]);
          if (childPath) return childPath;
        }
        return null;
      };

      return findPath(this.entries, e) || [];
    };

    return getPath(entry).join('.');
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.entries = [];
    this.currentId = 0;
  }

  /**
   * Get all entries as a flat list
   */
  getFlatEntries(): TOCEntry[] {
    const flatten = (entries: TOCEntry[]): TOCEntry[] => {
      const result: TOCEntry[] = [];
      for (const entry of entries) {
        result.push(entry);
        if (entry.children.length > 0) {
          result.push(...flatten(entry.children));
        }
      }
      return result;
    };

    return flatten(this.entries);
  }

  /**
   * Update page numbers for PDF generation
   */
  updatePageNumbers(pageMap: Map<string, number>): void {
    const updateEntries = (entries: TOCEntry[]): void => {
      for (const entry of entries) {
        const pageNum = pageMap.get(entry.id);
        if (pageNum !== undefined) {
          entry.pageNumber = pageNum;
        }
        if (entry.children.length > 0) {
          updateEntries(entry.children);
        }
      }
    };

    updateEntries(this.entries);
  }
}