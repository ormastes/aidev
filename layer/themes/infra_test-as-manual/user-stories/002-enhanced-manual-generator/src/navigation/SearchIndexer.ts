/**
 * Search Indexer
 * Creates and manages full-text search index for test manuals
 */

import { crypto } from '../../../../../infra_external-log-lib/src';

export interface SearchDocument {
  id: string;
  title: string;
  content: string;
  type: 'test' | 'section' | 'step' | "requirement" | 'note';
  tags?: string[];
  metadata?: Record<string, any>;
  url?: string;
}

export interface SearchResult {
  document: SearchDocument;
  score: number;
  highlights: string[];
  matchedTerms: string[];
}

export interface SearchOptions {
  fuzzy?: boolean;
  maxResults?: number;
  minScore?: number;
  fields?: string[];
  boostTitle?: number;
  boostTags?: number;
}

interface IndexEntry {
  documentId: string;
  frequency: number;
  positions: number[];
  field: string;
}

export class SearchIndexer {
  private documents: Map<string, SearchDocument> = new Map();
  private index: Map<string, IndexEntry[]> = new Map();
  private stopWords: Set<string>;
  private stemCache: Map<string, string> = new Map();

  constructor() {
    this.stopWords = new Set([
      'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for',
      'from', 'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on',
      'that', 'the', 'to', 'was', 'will', 'with', 'the', 'this',
      'then', 'when', 'where', 'which', 'should', 'must', 'can'
    ]);
  }

  /**
   * Add a document to the search index
   */
  addDocument(doc: SearchDocument): void {
    // Generate ID if not provided
    if (!doc.id) {
      doc.id = this.generateDocumentId(doc);
    }

    this.documents.set(doc.id, doc);
    this.indexDocument(doc);
  }

  /**
   * Index a document's content
   */
  private indexDocument(doc: SearchDocument): void {
    // Index title with higher weight
    this.indexField(doc.id, doc.title, 'title');

    // Index content
    this.indexField(doc.id, doc.content, 'content');

    // Index tags
    if (doc.tags) {
      doc.tags.forEach(tag => {
        this.indexField(doc.id, tag, 'tag');
      });
    }

    // Index metadata fields
    if (doc.metadata) {
      Object.entries(doc.metadata).forEach(([key, value]) => {
        if (typeof value === 'string') {
          this.indexField(doc.id, value, `metadata.${key}`);
        }
      });
    }
  }

  /**
   * Index a specific field
   */
  private indexField(documentId: string, text: string, field: string): void {
    const tokens = this.tokenize(text);
    const termFrequency = new Map<string, number[]>();

    tokens.forEach((token, position) => {
      const term = this.stem(token);
      if (!this.stopWords.has(term) && term.length > 2) {
        const positions = termFrequency.get(term) || [];
        positions.push(position);
        termFrequency.set(term, positions);
      }
    });

    termFrequency.forEach((positions, term) => {
      const entries = this.index.get(term) || [];
      entries.push({
        documentId,
        frequency: positions.length,
        positions,
        field
      });
      this.index.set(term, entries);
    });
  }

  /**
   * Search the index
   */
  search(query: string, options: SearchOptions = {}): SearchResult[] {
    const {
      fuzzy = false,
      maxResults = 10,
      minScore = 0.1,
      fields = ['title', 'content', 'tag'],
      boostTitle = 2.0,
      boostTags = 1.5
    } = options;

    const queryTerms = this.tokenize(query).map(t => this.stem(t));
    const results: Map<string, SearchResult> = new Map();

    // Search for each term
    queryTerms.forEach(term => {
      const matches = fuzzy ? this.fuzzySearch(term) : this.exactSearch(term);

      matches.forEach(match => {
        const { entry, matchedTerm } = match;
        if (!fields.length || fields.includes(entry.field)) {
          const doc = this.documents.get(entry.documentId);
          if (!doc) return;

          const resultKey = entry.documentId;
          const existing = results.get(resultKey);

          if (existing) {
            existing.score += this.calculateScore(entry, boostTitle, boostTags);
            if (!existing.matchedTerms.includes(matchedTerm)) {
              existing.matchedTerms.push(matchedTerm);
            }
          } else {
            results.set(resultKey, {
              document: doc,
              score: this.calculateScore(entry, boostTitle, boostTags),
              highlights: [],
              matchedTerms: [matchedTerm]
            });
          }
        }
      });
    });

    // Generate highlights
    results.forEach(result => {
      result.highlights = this.generateHighlights(
        result.document,
        result.matchedTerms
      );
    });

    // Sort by score and return top results
    return Array.from(results.values())
      .filter(r => r.score >= minScore)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults);
  }

  /**
   * Exact term search
   */
  private exactSearch(term: string): Array<{ entry: IndexEntry; matchedTerm: string }> {
    const entries = this.index.get(term) || [];
    return entries.map(entry => ({ entry, matchedTerm: term }));
  }

  /**
   * Fuzzy search with edit distance
   */
  private fuzzySearch(term: string, maxDistance: number = 2): Array<{ entry: IndexEntry; matchedTerm: string }> {
    const results: Array<{ entry: IndexEntry; matchedTerm: string }> = [];

    this.index.forEach((entries, indexTerm) => {
      const distance = this.levenshteinDistance(term, indexTerm);
      if (distance <= maxDistance) {
        entries.forEach(entry => {
          results.push({ entry, matchedTerm: indexTerm });
        });
      }
    });

    return results;
  }

  /**
   * Calculate score for a match
   */
  private calculateScore(entry: IndexEntry, boostTitle: number, boostTags: number): number {
    let score = entry.frequency;

    // Apply field boosts
    if (entry.field === 'title') {
      score *= boostTitle;
    } else if (entry.field === 'tag') {
      score *= boostTags;
    }

    // TF-IDF scoring
    const documentFrequency = (this.index.get(entry.field) || []).length;
    const totalDocuments = this.documents.size;
    const idf = Math.log(totalDocuments / (documentFrequency + 1));
    
    return score * idf;
  }

  /**
   * Generate text highlights
   */
  private generateHighlights(doc: SearchDocument, matchedTerms: string[]): string[] {
    const highlights: string[] = [];
    const text = doc.content;
    const sentences = text.split(/[.!?]+/);

    sentences.forEach(sentence => {
      const sentenceLower = sentence.toLowerCase();
      const hasMatch = matchedTerms.some(term => 
        sentenceLower.includes(term.toLowerCase())
      );

      if (hasMatch) {
        let highlighted = sentence.trim();
        matchedTerms.forEach(term => {
          const regex = new RegExp(`\\b(${term})\\b`, 'gi');
          highlighted = highlighted.replace(regex, '<mark>$1</mark>');
        });
        highlights.push(highlighted);
      }
    });

    return highlights.slice(0, 3); // Return top 3 highlights
  }

  /**
   * Tokenize text into words
   */
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(token => token.length > 0);
  }

  /**
   * Simple stemming algorithm
   */
  private stem(word: string): string {
    if (this.stemCache.has(word)) {
      return this.stemCache.get(word)!;
    }

    let stem = word;

    // Remove common suffixes
    const suffixes = ['ing', 'ed', 'es', 's', 'ly', 'er', 'est'];
    for (const suffix of suffixes) {
      if (stem.endsWith(suffix) && stem.length > suffix.length + 2) {
        stem = stem.slice(0, -suffix.length);
        break;
      }
    }

    this.stemCache.set(word, stem);
    return stem;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }

    return matrix[b.length][a.length];
  }

  /**
   * Generate document ID
   */
  private generateDocumentId(doc: SearchDocument): string {
    const hash = crypto.createHash('md5');
    hash.update(doc.title + doc.content);
    return hash.digest('hex').substring(0, 8);
  }

  /**
   * Get suggestions for partial queries
   */
  getSuggestions(partial: string, maxSuggestions: number = 5): string[] {
    const suggestions = new Set<string>();
    const partialLower = partial.toLowerCase();

    this.index.forEach((_, term) => {
      if (term.startsWith(partialLower)) {
        suggestions.add(term);
      }
    });

    return Array.from(suggestions)
      .sort()
      .slice(0, maxSuggestions);
  }

  /**
   * Clear the entire index
   */
  clear(): void {
    this.documents.clear();
    this.index.clear();
    this.stemCache.clear();
  }

  /**
   * Get index statistics
   */
  getStatistics(): {
    documentCount: number;
    termCount: number;
    averageDocumentLength: number;
  } {
    let totalLength = 0;
    this.documents.forEach(doc => {
      totalLength += doc.content.length;
    });

    return {
      documentCount: this.documents.size,
      termCount: this.index.size,
      averageDocumentLength: this.documents.size > 0 
        ? totalLength / this.documents.size 
        : 0
    };
  }

  /**
   * Export index for persistence
   */
  exportIndex(): string {
    return JSON.stringify({
      documents: Array.from(this.documents.entries()),
      index: Array.from(this.index.entries())
    });
  }

  /**
   * Import index from exported data
   */
  importIndex(data: string): void {
    const parsed = JSON.parse(data);
    this.documents = new Map(parsed.documents);
    this.index = new Map(parsed.index);
  }
}