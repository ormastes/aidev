/**
 * HTML Parser Module
 * Fast HTML5 parser with DOM tree construction and error recovery
 */

export interface DOMNode {
  type: 'element' | 'text' | 'comment' | 'document';
  name?: string;
  attributes?: Record<string, string>;
  children?: DOMNode[];
  text?: string;
  parent?: DOMNode;
}

export interface ParseOptions {
  fragment?: boolean;
  streaming?: boolean;
  errorRecovery?: boolean;
  preserveWhitespace?: boolean;
  lowerCaseTags?: boolean;
  lowerCaseAttributes?: boolean;
}

export class HTMLParser {
  private options: ParseOptions;
  private html: string = '';
  private position: number = 0;
  private currentNode: DOMNode | null = null;
  private root: DOMNode | null = null;
  private errors: string[] = [];
  
  // Self-closing tags
  private readonly voidElements = new Set([
    'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
    'link', 'meta', 'param', 'source', 'track', 'wbr'
  ]);
  
  // Block-level elements
  private readonly blockElements = new Set([
    'address', 'article', 'aside', 'blockquote', 'canvas', 'dd', 'div',
    'dl', 'dt', 'fieldset', 'figcaption', 'figure', 'footer', 'form',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'hr', 'li', 'main',
    'nav', 'noscript', 'ol', 'p', 'pre', 'section', 'table', 'tfoot',
    'ul', 'video'
  ]);

  constructor(options: ParseOptions = {}) {
    this.options = {
      fragment: false,
      streaming: false,
      errorRecovery: true,
      preserveWhitespace: false,
      lowerCaseTags: true,
      lowerCaseAttributes: true,
      ...options
    };
  }

  parse(html: string): DOMNode {
    this.html = html;
    this.position = 0;
    this.errors = [];
    
    // Create root document node
    this.root = {
      type: 'document',
      children: []
    };
    
    this.currentNode = this.root;
    
    // Parse the HTML
    while (this.position < this.html.length) {
      if (this.html[this.position] === '<') {
        this.parseTag();
      } else {
        this.parseText();
      }
    }
    
    return this.root;
  }

  private parseTag(): void {
    const next = this.html[this.position + 1];
    
    if (next === '!') {
      if (this.html.substr(this.position + 2, 2) === '--') {
        this.parseComment();
      } else if (this.html.substr(this.position + 2, 7).toLowerCase() === 'doctype') {
        this.parseDoctype();
      } else {
        this.parseCDATA();
      }
    } else if (next === '/') {
      this.parseClosingTag();
    } else {
      this.parseOpeningTag();
    }
  }

  private parseOpeningTag(): void {
    this.position++; // Skip '<'
    
    const tagMatch = this.html.substr(this.position).match(/^([a-zA-Z][a-zA-Z0-9-]*)/);
    if (!tagMatch) {
      this.addError('Invalid tag name');
      return;
    }
    
    let tagName = tagMatch[1];
    if (this.options.lowerCaseTags) {
      tagName = tagName.toLowerCase();
    }
    
    this.position += tagName.length;
    
    // Parse attributes
    const attributes = this.parseAttributes();
    
    // Skip to end of tag
    this.skipWhitespace();
    
    const selfClosing = this.html[this.position] === '/';
    if (selfClosing) {
      this.position++;
    }
    
    if (this.html[this.position] === '>') {
      this.position++;
    } else {
      this.addError('Expected ">" to close tag');
    }
    
    // Create element node
    const element: DOMNode = {
      type: 'element',
      name: tagName,
      attributes,
      children: [],
      parent: this.currentNode
    };
    
    // Add to parent
    if (this.currentNode && this.currentNode.children) {
      this.currentNode.children.push(element);
    }
    
    // Handle void elements and self-closing tags
    if (!selfClosing && !this.voidElements.has(tagName)) {
      this.currentNode = element;
    }
  }

  private parseClosingTag(): void {
    this.position += 2; // Skip '</'
    
    const tagMatch = this.html.substr(this.position).match(/^([a-zA-Z][a-zA-Z0-9-]*)/);
    if (!tagMatch) {
      this.addError('Invalid closing tag');
      return;
    }
    
    let tagName = tagMatch[1];
    if (this.options.lowerCaseTags) {
      tagName = tagName.toLowerCase();
    }
    
    this.position += tagName.length;
    
    // Skip to '>'
    while (this.position < this.html.length && this.html[this.position] !== '>') {
      this.position++;
    }
    this.position++; // Skip '>'
    
    // Find matching opening tag
    let node = this.currentNode;
    while (node && node.type !== 'document') {
      if (node.name === tagName) {
        this.currentNode = node.parent || this.root;
        return;
      }
      node = node.parent;
    }
    
    if (this.options.errorRecovery) {
      // Tag mismatch - try to recover
      this.addError(`Unmatched closing tag: ${tagName}`);
    }
  }

  private parseAttributes(): Record<string, string> {
    const attributes: Record<string, string> = {};
    
    while (this.position < this.html.length) {
      this.skipWhitespace();
      
      // Check for end of tag
      if (this.html[this.position] === '>' || this.html[this.position] === '/') {
        break;
      }
      
      // Parse attribute name
      const nameMatch = this.html.substr(this.position).match(/^([a-zA-Z][a-zA-Z0-9-:]*)/);
      if (!nameMatch) {
        break;
      }
      
      let attrName = nameMatch[1];
      if (this.options.lowerCaseAttributes) {
        attrName = attrName.toLowerCase();
      }
      
      this.position += attrName.length;
      this.skipWhitespace();
      
      // Check for value
      if (this.html[this.position] === '=') {
        this.position++;
        this.skipWhitespace();
        
        const value = this.parseAttributeValue();
        attributes[attrName] = value;
      } else {
        // Boolean attribute
        attributes[attrName] = '';
      }
    }
    
    return attributes;
  }

  private parseAttributeValue(): string {
    const quote = this.html[this.position];
    
    if (quote === '"' || quote === "'") {
      this.position++;
      let value = '';
      
      while (this.position < this.html.length && this.html[this.position] !== quote) {
        if (this.html[this.position] === '&') {
          value += this.parseEntity();
        } else {
          value += this.html[this.position];
          this.position++;
        }
      }
      
      this.position++; // Skip closing quote
      return value;
    } else {
      // Unquoted attribute value
      const match = this.html.substr(this.position).match(/^[^\s>]+/);
      if (match) {
        this.position += match[0].length;
        return match[0];
      }
      return '';
    }
  }

  private parseText(): void {
    let text = '';
    
    while (this.position < this.html.length && this.html[this.position] !== '<') {
      if (this.html[this.position] === '&') {
        text += this.parseEntity();
      } else {
        text += this.html[this.position];
        this.position++;
      }
    }
    
    if (!this.options.preserveWhitespace) {
      text = text.trim();
    }
    
    if (text && this.currentNode && this.currentNode.children) {
      this.currentNode.children.push({
        type: 'text',
        text,
        parent: this.currentNode
      });
    }
  }

  private parseComment(): void {
    this.position += 4; // Skip '<!--'
    
    let comment = '';
    while (this.position < this.html.length) {
      if (this.html.substr(this.position, 3) === '-->') {
        this.position += 3;
        break;
      }
      comment += this.html[this.position];
      this.position++;
    }
    
    if (this.currentNode && this.currentNode.children) {
      this.currentNode.children.push({
        type: 'comment',
        text: comment,
        parent: this.currentNode
      });
    }
  }

  private parseDoctype(): void {
    // Skip DOCTYPE declaration
    while (this.position < this.html.length && this.html[this.position] !== '>') {
      this.position++;
    }
    this.position++;
  }

  private parseCDATA(): void {
    if (this.html.substr(this.position, 9) === '<![CDATA[') {
      this.position += 9;
      let text = '';
      
      while (this.position < this.html.length) {
        if (this.html.substr(this.position, 3) === ']]>') {
          this.position += 3;
          break;
        }
        text += this.html[this.position];
        this.position++;
      }
      
      if (this.currentNode && this.currentNode.children) {
        this.currentNode.children.push({
          type: 'text',
          text,
          parent: this.currentNode
        });
      }
    }
  }

  private parseEntity(): string {
    const entities: Record<string, string> = {
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&apos;': "'",
      '&nbsp;': ' '
    };
    
    const match = this.html.substr(this.position).match(/^&[a-zA-Z]+;|&#[0-9]+;|&#x[0-9a-fA-F]+;/);
    if (match) {
      const entity = match[0];
      this.position += entity.length;
      
      if (entities[entity]) {
        return entities[entity];
      }
      
      // Numeric entity
      if (entity.startsWith('&#x')) {
        const code = parseInt(entity.slice(3, -1), 16);
        return String.fromCharCode(code);
      } else if (entity.startsWith('&#')) {
        const code = parseInt(entity.slice(2, -1), 10);
        return String.fromCharCode(code);
      }
      
      return entity;
    }
    
    this.position++;
    return '&';
  }

  private skipWhitespace(): void {
    while (this.position < this.html.length && /\s/.test(this.html[this.position])) {
      this.position++;
    }
  }

  private addError(message: string): void {
    this.errors.push(`${message} at position ${this.position}`);
    if (!this.options.errorRecovery) {
      throw new Error(message);
    }
  }

  getErrors(): string[] {
    return this.errors;
  }
}

export class DOMTraversal {
  static getElementById(root: DOMNode, id: string): DOMNode | null {
    if (root.type === 'element' && root.attributes?.id === id) {
      return root;
    }
    
    if (root.children) {
      for (const child of root.children) {
        const found = this.getElementById(child, id);
        if (found) return found;
      }
    }
    
    return null;
  }

  static getElementsByTagName(root: DOMNode, tagName: string): DOMNode[] {
    const elements: DOMNode[] = [];
    
    if (root.type === 'element' && root.name === tagName.toLowerCase()) {
      elements.push(root);
    }
    
    if (root.children) {
      for (const child of root.children) {
        elements.push(...this.getElementsByTagName(child, tagName));
      }
    }
    
    return elements;
  }

  static getElementsByClassName(root: DOMNode, className: string): DOMNode[] {
    const elements: DOMNode[] = [];
    
    if (root.type === 'element' && root.attributes?.class) {
      const classes = root.attributes.class.split(/\s+/);
      if (classes.includes(className)) {
        elements.push(root);
      }
    }
    
    if (root.children) {
      for (const child of root.children) {
        elements.push(...this.getElementsByClassName(child, className));
      }
    }
    
    return elements;
  }

  static getTextContent(node: DOMNode): string {
    if (node.type === 'text') {
      return node.text || '';
    }
    
    let text = '';
    if (node.children) {
      for (const child of node.children) {
        text += this.getTextContent(child);
      }
    }
    
    return text;
  }

  static getAttribute(node: DOMNode, name: string): string | null {
    if (node.type === 'element' && node.attributes) {
      return node.attributes[name] || null;
    }
    return null;
  }

  static hasAttribute(node: DOMNode, name: string): boolean {
    return node.type === 'element' && node.attributes !== undefined && name in node.attributes;
  }

  static getParent(node: DOMNode): DOMNode | null {
    return node.parent || null;
  }

  static getChildren(node: DOMNode): DOMNode[] {
    return node.children || [];
  }

  static getSiblings(node: DOMNode): DOMNode[] {
    const parent = node.parent;
    if (!parent || !parent.children) return [];
    
    return parent.children.filter(child => child !== node);
  }

  static getNextSibling(node: DOMNode): DOMNode | null {
    const parent = node.parent;
    if (!parent || !parent.children) return null;
    
    const index = parent.children.indexOf(node);
    if (index >= 0 && index < parent.children.length - 1) {
      return parent.children[index + 1];
    }
    
    return null;
  }

  static getPreviousSibling(node: DOMNode): DOMNode | null {
    const parent = node.parent;
    if (!parent || !parent.children) return null;
    
    const index = parent.children.indexOf(node);
    if (index > 0) {
      return parent.children[index - 1];
    }
    
    return null;
  }
}

export default HTMLParser;