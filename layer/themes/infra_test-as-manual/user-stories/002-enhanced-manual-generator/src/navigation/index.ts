/**
 * Navigation Module
 * Exports all navigation components for test manual generation
 */

export { TOCGenerator, TOCEntry, TOCOptions } from './TOCGenerator';
export { CrossReferenceBuilder, CrossReference, LinkTarget } from './CrossReferenceBuilder';
export { SearchIndexer, SearchDocument, SearchResult, SearchOptions } from './SearchIndexer';
export { BreadcrumbGenerator, BreadcrumbItem, BreadcrumbOptions, NavigationNode } from './BreadcrumbGenerator';

/**
 * Navigation Manager
 * Coordinates all navigation components
 */
export class NavigationManager {
  public toc: TOCGenerator;
  public crossRef: CrossReferenceBuilder;
  public search: SearchIndexer;
  public breadcrumb: BreadcrumbGenerator;

  constructor() {
    this.toc = new TOCGenerator();
    this.crossRef = new CrossReferenceBuilder();
    this.search = new SearchIndexer();
    this.breadcrumb = new BreadcrumbGenerator();
  }

  /**
   * Process a document and extract navigation data
   */
  processDocument(doc: {
    id: string;
    title: string;
    content: string;
    sections?: Array<{ id: string; title: string; level: number; content: string }>;
  }): void {
    // Add to search index
    this.search.addDocument({
      id: doc.id,
      title: doc.title,
      content: doc.content,
      type: 'section'
    });

    // Register as navigation node
    this.breadcrumb.registerNode({
      id: doc.id,
      title: doc.title,
      href: `#${doc.id}`
    });

    // Process sections
    if (doc.sections) {
      doc.sections.forEach(section => {
        // Add to TOC
        this.toc.addEntry(section.title, section.level, `#${section.id}`);

        // Add to search index
        this.search.addDocument({
          id: section.id,
          title: section.title,
          content: section.content,
          type: 'section'
        });

        // Register cross-reference target
        this.crossRef.registerTarget({
          id: section.id,
          title: section.title,
          type: 'section',
          href: `#${section.id}`
        });
      });
    }
  }

  /**
   * Generate complete navigation HTML
   */
  generateNavigationHTML(): {
    toc: string;
    breadcrumb: string;
    searchBox: string;
  } {
    return {
      toc: this.toc.generate(),
      breadcrumb: this.breadcrumb.generate(),
      searchBox: this.generateSearchBoxHTML()
    };
  }

  /**
   * Generate search box HTML
   */
  private generateSearchBoxHTML(): string {
    return `
      <div class="search-container">
        <input 
          type="search" 
          id="manual-search" 
          class="search-input" 
          placeholder="Search manual..."
          autocomplete="off"
        />
        <div id="search-results" class="search-results"></div>
      </div>
      <script>
        // Search functionality would be implemented here
        const searchInput = document.getElementById('manual-search');
        const searchResults = document.getElementById('search-results');
        
        searchInput.addEventListener('input', (e) => {
          const query = e.target.value;
          if (query.length > 2) {
            // Perform search (would call search API)
            console.log('Searching for:', query);
          }
        });
      </script>
    `;
  }

  /**
   * Clear all navigation data
   */
  clear(): void {
    this.toc.clear();
    this.search.clear();
    this.breadcrumb.clear();
  }
}