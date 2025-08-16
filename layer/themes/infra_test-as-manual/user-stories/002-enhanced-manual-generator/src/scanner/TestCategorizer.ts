/**
 * Test Categorizer for classifying and organizing test files
 * Provides intelligent categorization of tests based on content and structure
 */

import { DiscoveredTest, TestType, TestFramework } from './TestDiscovery';
import { path } from '../../../../../infra_external-log-lib/src';

export interface TestCategory {
  id: string;
  name: string;
  description: string;
  tests: DiscoveredTest[];
  subcategories?: TestCategory[];
  metadata?: CategoryMetadata;
}

export interface CategoryMetadata {
  priority?: "critical" | 'high' | 'medium' | 'low';
  coverage?: number;
  maintainer?: string;
  tags?: string[];
  dependencies?: string[];
}

export interface CategorizationRule {
  id: string;
  name: string;
  condition: (test: DiscoveredTest) => boolean;
  category: string;
  priority?: number;
}

export interface CategorizationResult {
  categories: TestCategory[];
  uncategorized: DiscoveredTest[];
  statistics: CategorizationStatistics;
}

export interface CategorizationStatistics {
  totalTests: number;
  categorizedTests: number;
  uncategorizedTests: number;
  categoryCount: number;
  averageTestsPerCategory: number;
  categorizationRate: number; // percentage
}

export class TestCategorizer {
  private rules: CategorizationRule[];
  private customCategories: Map<string, TestCategory>;

  constructor() {
    this.rules = [];
    this.customCategories = new Map();
    this.initializeDefaultRules();
    this.initializeDefaultCategories();
  }

  /**
   * Categorize tests based on rules
   */
  categorize(tests: DiscoveredTest[]): CategorizationResult {
    const categoryMap = new Map<string, TestCategory>();
    const uncategorized: DiscoveredTest[] = [];

    // Initialize categories from custom categories
    for (const [id, category] of this.customCategories) {
      categoryMap.set(id, {
        ...category,
        tests: []
      });
    }

    // Apply rules to each test
    for (const test of tests) {
      const categoryId = this.determineCategory(test);
      
      if (categoryId) {
        if (!categoryMap.has(categoryId)) {
          categoryMap.set(categoryId, this.createCategory(categoryId));
        }
        categoryMap.get(categoryId)!.tests.push(test);
      } else {
        uncategorized.push(test);
      }
    }

    // Build hierarchy
    const rootCategories = this.buildCategoryHierarchy(categoryMap);

    // Calculate statistics
    const statistics = this.calculateStatistics(tests, categoryMap, uncategorized);

    return {
      categories: rootCategories,
      uncategorized,
      statistics
    };
  }

  /**
   * Categorize by test type
   */
  categorizeByType(tests: DiscoveredTest[]): Map<TestType, DiscoveredTest[]> {
    const categories = new Map<TestType, DiscoveredTest[]>();
    
    for (const test of tests) {
      if (!categories.has(test.type)) {
        categories.set(test.type, []);
      }
      categories.get(test.type)!.push(test);
    }
    
    return categories;
  }

  /**
   * Categorize by framework
   */
  categorizeByFramework(tests: DiscoveredTest[]): Map<TestFramework, DiscoveredTest[]> {
    const categories = new Map<TestFramework, DiscoveredTest[]>();
    
    for (const test of tests) {
      if (test.framework) {
        if (!categories.has(test.framework)) {
          categories.set(test.framework, []);
        }
        categories.get(test.framework)!.push(test);
      }
    }
    
    return categories;
  }

  /**
   * Categorize by theme
   */
  categorizeByTheme(tests: DiscoveredTest[]): Map<string, DiscoveredTest[]> {
    const categories = new Map<string, DiscoveredTest[]>();
    
    for (const test of tests) {
      if (!categories.has(test.theme)) {
        categories.set(test.theme, []);
      }
      categories.get(test.theme)!.push(test);
    }
    
    return categories;
  }

  /**
   * Smart categorization using content analysis
   */
  async smartCategorize(tests: DiscoveredTest[]): Promise<CategorizationResult> {
    const enhancedTests = await this.enhanceTestsWithContent(tests);
    return this.categorize(enhancedTests);
  }

  /**
   * Add custom categorization rule
   */
  addRule(rule: CategorizationRule): void {
    this.rules.push(rule);
    // Sort by priority
    this.rules.sort((a, b) => (b.priority || 0) - (a.priority || 0));
  }

  /**
   * Remove rule by ID
   */
  removeRule(ruleId: string): boolean {
    const index = this.rules.findIndex(r => r.id === ruleId);
    if (index >= 0) {
      this.rules.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Add custom category
   */
  addCategory(category: TestCategory): void {
    this.customCategories.set(category.id, category);
  }

  /**
   * Get category by ID
   */
  getCategory(categoryId: string): TestCategory | undefined {
    return this.customCategories.get(categoryId);
  }

  /**
   * Generate category report
   */
  generateReport(result: CategorizationResult): string {
    const lines: string[] = [];
    
    lines.push('# Test Categorization Report');
    lines.push('');
    lines.push(`Generated: ${new Date().toISOString()}`);
    lines.push('');
    
    lines.push('## Statistics');
    lines.push(`- Total Tests: ${result.statistics.totalTests}`);
    lines.push(`- Categorized: ${result.statistics.categorizedTests} (${result.statistics.categorizationRate}%)`);
    lines.push(`- Uncategorized: ${result.statistics.uncategorizedTests}`);
    lines.push(`- Categories: ${result.statistics.categoryCount}`);
    lines.push(`- Average Tests per Category: ${result.statistics.averageTestsPerCategory}`);
    lines.push('');
    
    lines.push('## Categories');
    for (const category of result.categories) {
      this.addCategoryToReport(category, lines, 0);
    }
    
    if (result.uncategorized.length > 0) {
      lines.push('## Uncategorized Tests');
      for (const test of result.uncategorized) {
        lines.push(`- ${test.filePath}`);
      }
    }
    
    return lines.join('\n');
  }

  private initializeDefaultRules(): void {
    // Unit test rules
    this.addRule({
      id: 'unit-tests',
      name: 'Unit Tests',
      condition: (test) => test.type === 'unit',
      category: 'unit-tests',
      priority: 10
    });

    // Integration test rules
    this.addRule({
      id: 'integration-tests',
      name: 'Integration Tests',
      condition: (test) => test.type === "integration",
      category: 'integration-tests',
      priority: 10
    });

    // E2E test rules
    this.addRule({
      id: 'e2e-tests',
      name: 'End-to-End Tests',
      condition: (test) => test.type === 'e2e',
      category: 'e2e-tests',
      priority: 10
    });

    // BDD test rules
    this.addRule({
      id: 'bdd-tests',
      name: 'BDD Tests',
      condition: (test) => test.type === 'bdd' || test.filePath.endsWith('.feature'),
      category: 'bdd-tests',
      priority: 10
    });

    // Framework-specific rules
    this.addRule({
      id: 'jest-tests',
      name: 'Jest Tests',
      condition: (test) => test.framework === 'jest',
      category: 'jest-tests',
      priority: 5
    });

    this.addRule({
      id: 'playwright-tests',
      name: 'Playwright Tests',
      condition: (test) => test.framework === "playwright",
      category: 'playwright-tests',
      priority: 5
    });

    // Path-based rules
    this.addRule({
      id: 'api-tests',
      name: 'API Tests',
      condition: (test) => test.filePath.toLowerCase().includes('api'),
      category: 'api-tests',
      priority: 3
    });

    this.addRule({
      id: 'ui-tests',
      name: 'UI Tests',
      condition: (test) => test.filePath.toLowerCase().includes('ui') || 
                          test.filePath.toLowerCase().includes("component"),
      category: 'ui-tests',
      priority: 3
    });

    this.addRule({
      id: 'security-tests',
      name: 'Security Tests',
      condition: (test) => test.filePath.toLowerCase().includes("security") ||
                          test.filePath.toLowerCase().includes('auth'),
      category: 'security-tests',
      priority: 3
    });

    this.addRule({
      id: 'performance-tests',
      name: 'Performance Tests',
      condition: (test) => test.filePath.toLowerCase().includes("performance") ||
                          test.filePath.toLowerCase().includes('perf') ||
                          test.filePath.toLowerCase().includes("benchmark"),
      category: 'performance-tests',
      priority: 3
    });
  }

  private initializeDefaultCategories(): void {
    // Test type categories
    this.addCategory({
      id: 'unit-tests',
      name: 'Unit Tests',
      description: 'Isolated component and function tests',
      tests: [],
      metadata: { priority: 'high' }
    });

    this.addCategory({
      id: 'integration-tests',
      name: 'Integration Tests',
      description: 'Tests verifying component interactions',
      tests: [],
      metadata: { priority: 'high' }
    });

    this.addCategory({
      id: 'e2e-tests',
      name: 'End-to-End Tests',
      description: 'Full system workflow tests',
      tests: [],
      metadata: { priority: "critical" }
    });

    this.addCategory({
      id: 'bdd-tests',
      name: 'BDD Tests',
      description: 'Behavior-driven development tests',
      tests: [],
      metadata: { priority: 'high' }
    });

    // Framework categories
    this.addCategory({
      id: 'jest-tests',
      name: 'Jest Tests',
      description: 'Tests using Jest framework',
      tests: [],
      metadata: { tags: ['jest', "javascript"] }
    });

    this.addCategory({
      id: 'playwright-tests',
      name: 'Playwright Tests',
      description: 'Browser automation tests',
      tests: [],
      metadata: { tags: ["playwright", 'browser', 'e2e'] }
    });

    // Domain categories
    this.addCategory({
      id: 'api-tests',
      name: 'API Tests',
      description: 'API endpoint and service tests',
      tests: [],
      metadata: { priority: 'high', tags: ['api', 'backend'] }
    });

    this.addCategory({
      id: 'ui-tests',
      name: 'UI Tests',
      description: 'User interface and component tests',
      tests: [],
      metadata: { priority: 'medium', tags: ['ui', "frontend"] }
    });

    this.addCategory({
      id: 'security-tests',
      name: 'Security Tests',
      description: 'Security and authentication tests',
      tests: [],
      metadata: { priority: "critical", tags: ["security"] }
    });

    this.addCategory({
      id: 'performance-tests',
      name: 'Performance Tests',
      description: 'Performance and benchmark tests',
      tests: [],
      metadata: { priority: 'medium', tags: ["performance"] }
    });
  }

  private determineCategory(test: DiscoveredTest): string | null {
    // Apply rules in priority order
    for (const rule of this.rules) {
      if (rule.condition(test)) {
        return rule.category;
      }
    }
    return null;
  }

  private createCategory(categoryId: string): TestCategory {
    // Check if we have a predefined category
    const existing = this.customCategories.get(categoryId);
    if (existing) {
      return { ...existing, tests: [] };
    }

    // Create a basic category
    return {
      id: categoryId,
      name: this.formatCategoryName(categoryId),
      description: `Tests in category: ${categoryId}`,
      tests: []
    };
  }

  private formatCategoryName(categoryId: string): string {
    return categoryId
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  private buildCategoryHierarchy(categoryMap: Map<string, TestCategory>): TestCategory[] {
    // For now, return flat list
    // Could be enhanced to build actual hierarchy based on category relationships
    return Array.from(categoryMap.values()).filter(cat => cat.tests.length > 0);
  }

  private calculateStatistics(
    allTests: DiscoveredTest[],
    categoryMap: Map<string, TestCategory>,
    uncategorized: DiscoveredTest[]
  ): CategorizationStatistics {
    const totalTests = allTests.length;
    const categorizedTests = totalTests - uncategorized.length;
    const categoryCount = Array.from(categoryMap.values())
      .filter(cat => cat.tests.length > 0).length;

    return {
      totalTests,
      categorizedTests,
      uncategorizedTests: uncategorized.length,
      categoryCount,
      averageTestsPerCategory: categoryCount > 0 
        ? Math.round(categorizedTests / categoryCount) 
        : 0,
      categorizationRate: totalTests > 0 
        ? Math.round((categorizedTests / totalTests) * 100) 
        : 0
    };
  }

  private async enhanceTestsWithContent(tests: DiscoveredTest[]): Promise<DiscoveredTest[]> {
    // This could analyze file content for better categorization
    // For now, just return as-is
    return tests;
  }

  private addCategoryToReport(category: TestCategory, lines: string[], level: number): void {
    const indent = '  '.repeat(level);
    const prefix = level === 0 ? '### ' : level === 1 ? '#### ' : '- ';
    
    lines.push(`${indent}${prefix}${category.name} (${category.tests.length} tests)`);
    
    if (category.description && level === 0) {
      lines.push(`${indent}${category.description}`);
    }
    
    if (category.metadata?.priority) {
      lines.push(`${indent}Priority: ${category.metadata.priority}`);
    }
    
    if (level === 0 && category.tests.length <= 5) {
      // Show test files for small categories
      for (const test of category.tests) {
        lines.push(`${indent}  - ${path.basename(test.filePath)}`);
      }
    }
    
    if (category.subcategories) {
      for (const subcat of category.subcategories) {
        this.addCategoryToReport(subcat, lines, level + 1);
      }
    }
    
    if (level === 0) {
      lines.push('');
    }
  }
}

export default TestCategorizer;