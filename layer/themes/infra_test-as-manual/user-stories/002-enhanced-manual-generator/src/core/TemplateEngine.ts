/**
 * Template Engine for rendering manual documentation
 * Supports Handlebars templates with custom helpers and partials
 */

import * as Handlebars from 'handlebars';
import * as fs from 'fs/promises';
import { path } from '../../../../../infra_external-log-lib/src';
import { TestDocument, TemplateContext } from './types';

export class TemplateEngine {
  private handlebars: typeof Handlebars;
  private templates: Map<string, Handlebars.TemplateDelegate>;
  private partials: Map<string, string>;
  private helpers: Map<string, Function>;
  private templateCache: Map<string, string>;

  constructor() {
    this.handlebars = Handlebars.create();
    this.templates = new Map();
    this.partials = new Map();
    this.helpers = new Map();
    this.templateCache = new Map();
    
    this.registerDefaultHelpers();
    this.registerDefaultPartials();
  }

  /**
   * Render document with template
   */
  async render(document: TestDocument, templateName?: string): Promise<string> {
    const template = await this.getTemplate(templateName || 'default');
    
    const context: TemplateContext = {
      document,
      options: {},
      helpers: Object.fromEntries(this.helpers),
      partials: Object.fromEntries(this.partials)
    };
    
    return template(context);
  }

  /**
   * Load template from file
   */
  async loadTemplate(templatePath: string): Promise<void> {
    const content = await fs.readFile(templatePath, 'utf-8');
    const name = path.basename(templatePath, path.extname(templatePath));
    const compiled = this.handlebars.compile(content);
    
    this.templates.set(name, compiled);
    this.templateCache.set(name, content);
  }

  /**
   * Register custom helper
   */
  registerHelper(name: string, helper: Function): void {
    this.helpers.set(name, helper);
    this.handlebars.registerHelper(name, helper as Handlebars.HelperDelegate);
  }

  /**
   * Register partial template
   */
  async registerPartial(name: string, partialPath: string): Promise<void> {
    const content = await fs.readFile(partialPath, 'utf-8');
    this.partials.set(name, content);
    this.handlebars.registerPartial(name, content);
  }

  /**
   * Compile template string
   */
  compile(templateString: string): Handlebars.TemplateDelegate {
    return this.handlebars.compile(templateString);
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    this.templates.clear();
    this.templateCache.clear();
  }

  private async getTemplate(name: string): Promise<Handlebars.TemplateDelegate> {
    // Check if template already compiled
    if (this.templates.has(name)) {
      return this.templates.get(name)!;
    }
    
    // Load built-in template
    const template = await this.loadBuiltInTemplate(name);
    this.templates.set(name, template);
    
    return template;
  }

  private async loadBuiltInTemplate(name: string): Promise<Handlebars.TemplateDelegate> {
    const templates: Record<string, string> = {
      default: this.getDefaultTemplate(),
      professional: this.getProfessionalTemplate(),
      minimal: this.getMinimalTemplate(),
      detailed: this.getDetailedTemplate()
    };
    
    const templateString = templates[name] || templates.default;
    return this.handlebars.compile(templateString);
  }

  private registerDefaultHelpers(): void {
    // String helpers
    this.registerHelper('uppercase', (str: string) => str?.toUpperCase());
    this.registerHelper('lowercase', (str: string) => str?.toLowerCase());
    this.registerHelper('capitalize', (str: string) => 
      str?.charAt(0).toUpperCase() + str?.slice(1));
    this.registerHelper('truncate', (str: string, length: number) => 
      str?.length > length ? str.substring(0, length) + '...' : str);
    
    // Date helpers
    this.registerHelper('formatDate', (date: Date) => 
      date ? new Date(date).toLocaleDateString() : '');
    this.registerHelper('formatDateTime', (date: Date) => 
      date ? new Date(date).toLocaleString() : '');
    
    // Logic helpers
    this.registerHelper('eq', (a: any, b: any) => a === b);
    this.registerHelper('ne', (a: any, b: any) => a !== b);
    this.registerHelper('lt', (a: any, b: any) => a < b);
    this.registerHelper('gt', (a: any, b: any) => a > b);
    this.registerHelper('and', (a: any, b: any) => a && b);
    this.registerHelper('or', (a: any, b: any) => a || b);
    this.registerHelper('not', (a: any) => !a);
    
    // Array helpers
    this.registerHelper('length', (arr: any[]) => arr?.length || 0);
    this.registerHelper('join', (arr: any[], separator: string) => 
      arr?.join(separator || ', '));
    this.registerHelper('first', (arr: any[]) => arr?.[0]);
    this.registerHelper('last', (arr: any[]) => arr?.[arr.length - 1]);
    
    // Object helpers
    this.registerHelper('json', (obj: any) => JSON.stringify(obj, null, 2));
    this.registerHelper('keys', (obj: object) => Object.keys(obj || {}));
    this.registerHelper('values', (obj: object) => Object.values(obj || {}));
    
    // Test-specific helpers
    this.registerHelper('stepType', (type: string) => {
      const types: Record<string, string> = {
        action: '🎯',
        assertion: '✓',
        setup: '⚙️',
        teardown: '🧹'
      };
      return types[type] || '•';
    });
    
    this.registerHelper('priority', (priority: string) => {
      const priorities: Record<string, string> = {
        critical: '🔴 Critical',
        high: '🟠 High',
        medium: '🟡 Medium',
        low: '🟢 Low'
      };
      return priorities[priority] || priority;
    });
    
    this.registerHelper('testStatus', (success: boolean) => 
      success ? '✅ Passed' : '❌ Failed');
  }

  private registerDefaultPartials(): void {
    // Register common partials
    this.handlebars.registerPartial('header', this.getHeaderPartial());
    this.handlebars.registerPartial('footer', this.getFooterPartial());
    this.handlebars.registerPartial('toc', this.getTOCPartial());
    this.handlebars.registerPartial('testCase', this.getTestCasePartial());
    this.handlebars.registerPartial('testStep', this.getTestStepPartial());
  }

  private getDefaultTemplate(): string {
    return `
# {{document.title}}

{{#if document.version}}
Version: {{document.version}}
{{/if}}

Generated: {{formatDateTime document.generatedAt}}

{{#if document.tableOfContents}}
## Table of Contents
{{> toc items=document.tableOfContents}}
{{/if}}

## Test Documentation

{{#each document.sections}}
### {{title}}

{{content}}

{{#if testCases}}
#### Test Cases
{{#each testCases}}
{{> testCase test=this}}
{{/each}}
{{/if}}

{{/each}}

{{> footer}}
`;
  }

  private getProfessionalTemplate(): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{document.title}} - Test Manual</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; max-width: 1200px; margin: 0 auto; padding: 20px; }
        h1 { color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 10px; }
        h2 { color: #34495e; margin-top: 30px; }
        h3 { color: #7f8c8d; }
        .metadata { background: #ecf0f1; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .test-case { background: #fff; border: 1px solid #ddd; border-radius: 5px; padding: 15px; margin: 15px 0; }
        .test-step { margin: 10px 0; padding: 10px; background: #f8f9fa; border-left: 3px solid #3498db; }
        .priority-critical { border-left-color: #e74c3c !important; }
        .priority-high { border-left-color: #f39c12 !important; }
        .priority-medium { border-left-color: #f1c40f !important; }
        .priority-low { border-left-color: #2ecc71 !important; }
        .toc { background: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0; }
        .toc ul { list-style-type: none; padding-left: 20px; }
        .toc a { text-decoration: none; color: #3498db; }
        .toc a:hover { text-decoration: underline; }
        @media print { 
            .no-print { display: none; }
            body { font-size: 11pt; }
        }
    </style>
</head>
<body>
    {{> header}}
    
    <h1>{{document.title}}</h1>
    
    <div class="metadata">
        {{#if document.version}}<p><strong>Version:</strong> {{document.version}}</p>{{/if}}
        <p><strong>Generated:</strong> {{formatDateTime document.generatedAt}}</p>
        {{#if document.metadata.author}}<p><strong>Author:</strong> {{document.metadata.author}}</p>{{/if}}
    </div>
    
    {{#if document.tableOfContents}}
    <div class="toc">
        <h2>Table of Contents</h2>
        {{> toc items=document.tableOfContents}}
    </div>
    {{/if}}
    
    {{#each document.sections}}
    <section id="section-{{id}}">
        <h2>{{title}}</h2>
        {{{content}}}
        
        {{#if testCases}}
        <div class="test-cases">
            <h3>Test Cases</h3>
            {{#each testCases}}
            {{> testCase test=this}}
            {{/each}}
        </div>
        {{/if}}
    </section>
    {{/each}}
    
    {{> footer}}
</body>
</html>
`;
  }

  private getMinimalTemplate(): string {
    return `
{{document.title}}
{{#each document.sections}}

{{title}}
{{content}}

{{#each testCases}}
Test: {{name}}
{{#each steps}}
  {{order}}. {{action}} → {{expected}}
{{/each}}

{{/each}}
{{/each}}
`;
  }

  private getDetailedTemplate(): string {
    return this.getProfessionalTemplate(); // Reuse professional with more details
  }

  private getHeaderPartial(): string {
    return `
<header class="no-print">
    <nav>
        <a href="#top">Top</a> | 
        <a href="#toc">Contents</a> | 
        <a href="javascript:window.print()">Print</a>
    </nav>
</header>
`;
  }

  private getFooterPartial(): string {
    return `
<footer>
    <hr>
    <p style="text-align: center; color: #7f8c8d; font-size: 0.9em;">
        Generated by Enhanced Manual Generator | {{formatDateTime document.generatedAt}}
    </p>
</footer>
`;
  }

  private getTOCPartial(): string {
    return `
<ul>
{{#each items}}
    <li>
        <a href="#{{id}}">{{title}}</a>
        {{#if children}}
        {{> toc items=children}}
        {{/if}}
    </li>
{{/each}}
</ul>
`;
  }

  private getTestCasePartial(): string {
    return `
<div class="test-case priority-{{test.priority}}">
    <h4>{{test.name}}</h4>
    {{#if test.description}}<p>{{test.description}}</p>{{/if}}
    
    {{#if test.preconditions}}
    <p><strong>Preconditions:</strong></p>
    <ul>
    {{#each test.preconditions}}
        <li>{{this}}</li>
    {{/each}}
    </ul>
    {{/if}}
    
    <p><strong>Steps:</strong></p>
    {{#each test.steps}}
    {{> testStep step=this}}
    {{/each}}
    
    {{#if test.postconditions}}
    <p><strong>Postconditions:</strong></p>
    <ul>
    {{#each test.postconditions}}
        <li>{{this}}</li>
    {{/each}}
    </ul>
    {{/if}}
    
    {{#if test.tags}}
    <p class="tags">
        <strong>Tags:</strong> {{join test.tags ", "}}
    </p>
    {{/if}}
</div>
`;
  }

  private getTestStepPartial(): string {
    return `
<div class="test-step">
    <strong>Step {{step.order}}:</strong> {{stepType step.type}} {{step.action}}
    {{#if step.expected}}
    <br><em>Expected:</em> {{step.expected}}
    {{/if}}
    {{#if step.screenshot}}
    <br><img src="{{step.screenshot.filePath}}" alt="{{step.screenshot.caption}}" style="max-width: 100%; margin-top: 10px;">
    {{/if}}
</div>
`;
  }
}

export default TemplateEngine;