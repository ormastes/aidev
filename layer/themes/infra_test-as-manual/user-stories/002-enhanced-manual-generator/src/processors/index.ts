/**
 * Multi-Format Processors
 * Export all format processors for manual documentation generation
 */

export { HTMLProcessor } from './HTMLProcessor';
export { MarkdownProcessor } from './MarkdownProcessor';
export { JSONProcessor } from './JSONProcessor';
export { PDFProcessor } from './PDFProcessor';

// Re-export types
export type { PDFOptions } from './PDFProcessor';
export type { JSONOutput } from './JSONProcessor';

/**
 * Format processor factory
 */
export class ProcessorFactory {
  static createProcessor(format: 'html' | 'pdf' | 'markdown' | 'json', options?: any) {
    switch (format) {
      case 'html':
        const { HTMLProcessor } = require('./HTMLProcessor');
        return new HTMLProcessor(options);
      
      case 'markdown':
        const { MarkdownProcessor } = require('./MarkdownProcessor');
        return new MarkdownProcessor(options);
      
      case 'json':
        const { JSONProcessor } = require('./JSONProcessor');
        return new JSONProcessor(options);
      
      case 'pdf':
        const { PDFProcessor } = require('./PDFProcessor');
        return new PDFProcessor(options);
      
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }
}