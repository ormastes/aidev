import { fs } from '../../layer/themes/infra_external-log-lib/src';
import { path } from '../../layer/themes/infra_external-log-lib/src';

describe('Architecture Documentation', () => {
  const docsDir = path.join(__dirname, '../docs');
  
  const requiredDocs = [
    'ARCHITECTURE.md',
    'INTEGRATION_PATTERNS.md',
    'WORKFLOW_COMPOSITION.md',
    'API_REFERENCE.md',
    'BEST_PRACTICES.md'
  ];
  
  test('all required documentation files exist', () => {
    for (const doc of requiredDocs) {
      const filePath = path.join(docsDir, doc);
      expect(fs.existsSync(filePath)).toBe(true);
    }
  });
  
  test('documentation files have content', () => {
    for (const doc of requiredDocs) {
      const filePath = path.join(docsDir, doc);
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content.length).toBeGreaterThan(1000); // At least 1KB of content
    }
  });
  
  test('documentation follows consistent structure', () => {
    for (const doc of requiredDocs) {
      const filePath = path.join(docsDir, doc);
      const content = fs.readFileSync(filePath, 'utf-8');
      
      // Should have a main heading
      expect(content).toMatch(/^# .+/m);
      
      // Should have table of contents
      expect(content).toMatch(/## Table of Contents/);
      
      // Should have overview or introduction
      expect(content).toMatch(/## (Overview|Introduction|Philosophy)/);
    }
  });
  
  test('cross-references are valid', () => {
    const crossRefs = [
      { from: 'ARCHITECTURE.md', to: ['INTEGRATION_PATTERNS.md', 'WORKFLOW_COMPOSITION.md'] },
      { from: 'INTEGRATION_PATTERNS.md', to: ['WORKFLOW_COMPOSITION.md'] },
      { from: 'WORKFLOW_COMPOSITION.md', to: ['API_REFERENCE.md', 'BEST_PRACTICES.md'] },
      { from: 'API_REFERENCE.md', to: ['BEST_PRACTICES.md'] }
    ];
    
    for (const ref of crossRefs) {
      const fromPath = path.join(docsDir, ref.from);
      const content = fs.readFileSync(fromPath, 'utf-8');
      
      for (const toFile of ref.to) {
        expect(content).toContain(toFile);
      }
    }
  });
});