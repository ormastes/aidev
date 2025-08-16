/**
 * HTML Processor for generating interactive HTML documentation
 * Provides rich formatting, navigation, and interactive features
 */

import { TestDocument, ProcessorResult, ManualGeneratorOptions } from '../core/types';
import * as Handlebars from "handlebars";

export class HTMLProcessor {
  private options: ManualGeneratorOptions;
  private handlebars: typeof Handlebars;

  constructor(options: ManualGeneratorOptions = {}) {
    this.options = options;
    this.handlebars = Handlebars.create();
    this.registerHelpers();
  }

  /**
   * Process document to HTML format
   */
  async process(document: TestDocument): Promise<ProcessorResult> {
    try {
      const html = this.generateHTML(document);
      
      return {
        success: true,
        output: html,
        format: 'html'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'HTML processing failed'
      };
    }
  }

  /**
   * Generate complete HTML document
   */
  private generateHTML(document: TestDocument): string {
    const template = this.getHTMLTemplate();
    const compiled = this.handlebars.compile(template);
    
    const context = {
      document,
      options: this.options,
      styles: this.getStyles(),
      scripts: this.getScripts(),
      formatDate: (date: Date) => new Date(date).toLocaleDateString(),
      formatDateTime: (date: Date) => new Date(date).toLocaleString()
    };
    
    return compiled(context);
  }

  /**
   * Get HTML template
   */
  private getHTMLTemplate(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{document.title}} - Test Manual</title>
    <style>{{{styles}}}</style>
</head>
<body>
    <div class="container">
        <header class="header">
            <h1>{{document.title}}</h1>
            {{#if document.version}}
            <div class="version">Version: {{document.version}}</div>
            {{/if}}
            <div class="generated">Generated: {{formatDateTime document.generatedAt}}</div>
        </header>

        <nav class="navigation" id="navigation">
            <h2>Table of Contents</h2>
            {{#if document.tableOfContents}}
            <ul class="toc">
                {{#each document.tableOfContents}}
                {{> tocItem item=this}}
                {{/each}}
            </ul>
            {{/if}}
        </nav>

        <main class="content">
            {{#if document.metadata}}
            <section class="metadata">
                <h2>Document Information</h2>
                <dl>
                    {{#if document.metadata.author}}
                    <dt>Author:</dt>
                    <dd>{{document.metadata.author}}</dd>
                    {{/if}}
                    {{#if document.metadata.tags}}
                    <dt>Tags:</dt>
                    <dd>{{#each document.metadata.tags}}<span class="tag">{{this}}</span>{{/each}}</dd>
                    {{/if}}
                    {{#if document.metadata.estimatedDuration}}
                    <dt>Estimated Duration:</dt>
                    <dd>{{document.metadata.estimatedDuration}} minutes</dd>
                    {{/if}}
                </dl>
            </section>
            {{/if}}

            {{#each document.sections}}
            <section id="{{id}}" class="section level-{{level}}">
                <h{{add level 1}}>{{title}}</h{{add level 1}}>
                <div class="section-content">{{{content}}}</div>
                
                {{#if testCases}}
                <div class="test-cases">
                    {{#each testCases}}
                    <div class="test-case priority-{{priority}}" data-test-id="{{id}}">
                        <h4>
                            <span class="test-name">{{name}}</span>
                            <span class="priority-badge">{{priority}}</span>
                        </h4>
                        
                        {{#if description}}
                        <p class="test-description">{{description}}</p>
                        {{/if}}
                        
                        {{#if preconditions}}
                        <div class="preconditions">
                            <h5>Preconditions:</h5>
                            <ul>
                            {{#each preconditions}}
                                <li>{{this}}</li>
                            {{/each}}
                            </ul>
                        </div>
                        {{/if}}
                        
                        <div class="test-steps">
                            <h5>Steps:</h5>
                            <ol>
                            {{#each steps}}
                                <li class="step step-{{type}}" data-step-id="{{id}}">
                                    <span class="step-action">{{action}}</span>
                                    {{#if expected}}
                                    <div class="step-expected">
                                        <strong>Expected:</strong> {{expected}}
                                    </div>
                                    {{/if}}
                                    {{#if screenshot}}
                                    <div class="step-screenshot">
                                        <img src="{{screenshot.filePath}}" alt="{{screenshot.caption}}" />
                                        {{#if screenshot.caption}}
                                        <p class="caption">{{screenshot.caption}}</p>
                                        {{/if}}
                                    </div>
                                    {{/if}}
                                </li>
                            {{/each}}
                            </ol>
                        </div>
                        
                        {{#if postconditions}}
                        <div class="postconditions">
                            <h5>Postconditions:</h5>
                            <ul>
                            {{#each postconditions}}
                                <li>{{this}}</li>
                            {{/each}}
                            </ul>
                        </div>
                        {{/if}}
                        
                        {{#if tags}}
                        <div class="test-tags">
                            {{#each tags}}
                            <span class="tag">{{this}}</span>
                            {{/each}}
                        </div>
                        {{/if}}
                    </div>
                    {{/each}}
                </div>
                {{/if}}
                
                {{#if subsections}}
                {{#each subsections}}
                {{> section section=this}}
                {{/each}}
                {{/if}}
            </section>
            {{/each}}

            {{#if document.glossary}}
            <section class="glossary">
                <h2>Glossary</h2>
                <dl>
                {{#each document.glossary}}
                    <dt>{{term}}</dt>
                    <dd>{{definition}}</dd>
                {{/each}}
                </dl>
            </section>
            {{/if}}

            {{#if document.index}}
            <section class="index">
                <h2>Index</h2>
                <ul class="index-list">
                {{#each document.index}}
                    <li>
                        <span class="term">{{term}}</span>
                        <span class="references">
                        {{#each references}}
                            <a href="#{{this}}">{{this}}</a>
                        {{/each}}
                        </span>
                    </li>
                {{/each}}
                </ul>
            </section>
            {{/if}}
        </main>

        <footer class="footer">
            <p>Generated by Enhanced Manual Generator</p>
            <p>{{formatDateTime document.generatedAt}}</p>
        </footer>
    </div>
    
    <button class="scroll-top" id="scrollTop" aria-label="Scroll to top">↑</button>
    
    <script>{{{scripts}}}</script>
</body>
</html>`;
  }

  /**
   * Get CSS styles
   */
  private getStyles(): string {
    return `
/* Reset and Base Styles */
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    line-height: 1.6;
    color: #333;
    background: #f5f5f5;
}

.container {
    max-width: 1400px;
    margin: 0 auto;
    display: grid;
    grid-template-columns: 300px 1fr;
    grid-template-areas:
        "header header"
        "nav content"
        "footer footer";
    gap: 20px;
    padding: 20px;
}

/* Header */
.header {
    grid-area: header;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 30px;
    border-radius: 10px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.header h1 {
    font-size: 2.5em;
    margin-bottom: 10px;
}

.version, .generated {
    opacity: 0.9;
    font-size: 0.9em;
}

/* Navigation */
.navigation {
    grid-area: nav;
    background: white;
    padding: 20px;
    border-radius: 10px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    position: sticky;
    top: 20px;
    max-height: calc(100vh - 40px);
    overflow-y: auto;
}

.navigation h2 {
    font-size: 1.2em;
    margin-bottom: 15px;
    color: #667eea;
}

.toc {
    list-style: none;
}

.toc li {
    margin: 5px 0;
}

.toc a {
    color: #333;
    text-decoration: none;
    display: block;
    padding: 5px 10px;
    border-radius: 5px;
    transition: all 0.3s ease;
}

.toc a:hover {
    background: #f0f0f0;
    color: #667eea;
    transform: translateX(5px);
}

.toc ul {
    list-style: none;
    margin-left: 20px;
}

/* Content */
.content {
    grid-area: content;
    background: white;
    padding: 30px;
    border-radius: 10px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.section {
    margin-bottom: 40px;
}

.section h2, .section h3, .section h4 {
    color: #333;
    margin: 20px 0 15px;
}

.section h2 {
    font-size: 1.8em;
    border-bottom: 2px solid #667eea;
    padding-bottom: 10px;
}

.section h3 {
    font-size: 1.4em;
}

.section h4 {
    font-size: 1.2em;
}

/* Metadata Section */
.metadata {
    background: #f8f9fa;
    padding: 20px;
    border-radius: 8px;
    margin-bottom: 30px;
}

.metadata dl {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 10px 20px;
}

.metadata dt {
    font-weight: bold;
    color: #667eea;
}

/* Test Cases */
.test-cases {
    margin-top: 20px;
}

.test-case {
    background: #f8f9fa;
    border-left: 4px solid #667eea;
    padding: 20px;
    margin: 20px 0;
    border-radius: 5px;
    transition: all 0.3s ease;
}

.test-case:hover {
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    transform: translateY(-2px);
}

.test-case.priority-critical {
    border-left-color: #dc3545;
}

.test-case.priority-high {
    border-left-color: #ff6b6b;
}

.test-case.priority-medium {
    border-left-color: #ffd93d;
}

.test-case.priority-low {
    border-left-color: #6bcf7f;
}

.test-name {
    font-weight: bold;
    color: #333;
}

.priority-badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 0.8em;
    font-weight: normal;
    margin-left: 10px;
    background: #667eea;
    color: white;
}

.test-description {
    color: #666;
    margin: 10px 0;
}

/* Test Steps */
.test-steps ol {
    counter-reset: step-counter;
    list-style: none;
}

.test-steps li {
    counter-increment: step-counter;
    position: relative;
    padding-left: 40px;
    margin: 15px 0;
}

.test-steps li::before {
    content: counter(step-counter);
    position: absolute;
    left: 0;
    top: 0;
    width: 30px;
    height: 30px;
    background: #667eea;
    color: white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
}

.step-action {
    font-weight: 500;
    display: block;
    margin-bottom: 5px;
}

.step-expected {
    background: #e8f4f8;
    padding: 8px;
    border-radius: 4px;
    margin-top: 5px;
    font-size: 0.9em;
}

.step-screenshot {
    margin-top: 10px;
}

.step-screenshot img {
    max-width: 100%;
    border: 1px solid #ddd;
    border-radius: 4px;
}

.caption {
    text-align: center;
    font-style: italic;
    color: #666;
    margin-top: 5px;
}

/* Tags */
.tag {
    display: inline-block;
    padding: 2px 8px;
    background: #e9ecef;
    border-radius: 12px;
    font-size: 0.85em;
    margin: 0 4px;
}

/* Footer */
.footer {
    grid-area: footer;
    text-align: center;
    padding: 20px;
    color: #666;
    border-top: 1px solid #ddd;
    margin-top: 40px;
}

/* Scroll to Top Button */
.scroll-top {
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 50px;
    height: 50px;
    background: #667eea;
    color: white;
    border: none;
    border-radius: 50%;
    font-size: 20px;
    cursor: pointer;
    display: none;
    transition: all 0.3s ease;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.scroll-top:hover {
    background: #764ba2;
    transform: translateY(-3px);
    box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
}

.scroll-top.visible {
    display: block;
}

/* Print Styles */
@media print {
    body {
        background: white;
    }
    
    .container {
        display: block;
        max-width: 100%;
        padding: 0;
    }
    
    .navigation {
        display: none;
    }
    
    .header {
        background: none;
        color: black;
        border-bottom: 2px solid black;
    }
    
    .scroll-top {
        display: none;
    }
    
    .test-case {
        page-break-inside: avoid;
    }
}

/* Responsive Design */
@media (max-width: 768px) {
    .container {
        grid-template-columns: 1fr;
        grid-template-areas:
            "header"
            "nav"
            "content"
            "footer";
    }
    
    .navigation {
        position: static;
        max-height: none;
    }
}`;
  }

  /**
   * Get JavaScript for interactivity
   */
  private getScripts(): string {
    return `
// Scroll to top functionality
const scrollBtn = document.getElementById("scrollTop");
window.addEventListener('scroll', () => {
    if (window.pageYOffset > 300) {
        scrollBtn.classList.add('visible');
    } else {
        scrollBtn.classList.remove('visible');
    }
});

scrollBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
});

// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });
});

// Highlight current section in navigation
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.toc a');

window.addEventListener('scroll', () => {
    let current = '';
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.clientHeight;
        if (pageYOffset >= sectionTop - 100) {
            current = section.getAttribute('id');
        }
    });

    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === '#' + current) {
            link.classList.add('active');
        }
    });
});

// Collapsible test cases
document.querySelectorAll('.test-case h4').forEach(header => {
    header.style.cursor = 'pointer';
    header.addEventListener('click', () => {
        const testCase = header.parentElement;
        testCase.classList.toggle("collapsed");
    });
});

// Search functionality (basic)
const searchBox = document.createElement('input');
searchBox.type = 'text';
searchBox.placeholder = 'Search test cases...';
searchBox.className = 'search-box';
searchBox.style.cssText = 'width: 100%; padding: 10px; margin-bottom: 20px; border: 1px solid #ddd; border-radius: 5px;';

const firstTestCases = document.querySelector('.test-cases');
if (firstTestCases) {
    firstTestCases.parentElement.insertBefore(searchBox, firstTestCases);
    
    searchBox.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        document.querySelectorAll('.test-case').forEach(testCase => {
            const text = testCase.textContent.toLowerCase();
            if (text.includes(searchTerm)) {
                testCase.style.display = 'block';
            } else {
                testCase.style.display = 'none';
            }
        });
    });
}

// Print button
const printBtn = document.createElement('button');
printBtn.textContent = 'Print';
printBtn.className = 'print-btn';
printBtn.style.cssText = 'position: fixed; top: 20px; right: 20px; padding: 10px 20px; background: #667eea; color: white; border: none; border-radius: 5px; cursor: pointer;';
printBtn.addEventListener('click', () => window.print());
document.body.appendChild(printBtn);
`;
  }

  /**
   * Register Handlebars helpers
   */
  private registerHelpers(): void {
    // Math helper
    this.handlebars.registerHelper('add', (a: number, b: number) => a + b);
    
    // Partial for TOC items
    this.handlebars.registerPartial('tocItem', `
      <li>
        <a href="#{{item.id}}">{{item.title}}</a>
        {{#if item.children}}
        <ul>
          {{#each item.children}}
          {{> tocItem item=this}}
          {{/each}}
        </ul>
        {{/if}}
      </li>
    `);
    
    // Partial for sections
    this.handlebars.registerPartial('section', `
      <section id="{{section.id}}" class="section level-{{section.level}}">
        <h{{add section.level 1}}>{{section.title}}</h{{add section.level 1}}>
        <div class="section-content">{{{section.content}}}</div>
        {{#if section.subsections}}
        {{#each section.subsections}}
        {{> section section=this}}
        {{/each}}
        {{/if}}
      </section>
    `);
  }
}

export default HTMLProcessor;