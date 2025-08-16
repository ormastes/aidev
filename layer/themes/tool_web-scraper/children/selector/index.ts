/**
 * CSS Selector Engine
 * Full CSS3 selector support with custom extensions
 */

import { DOMNode, DOMTraversal } from '../parser';

export type SelectorToken = {
  type: 'tag' | 'id' | 'class' | 'attribute' | 'pseudo' | 'combinator' | 'universal';
  value: string;
  operator?: string;
  attribute?: string;
  arguments?: string[];
};

export interface SelectorGroup {
  selectors: Selector[];
}

export interface Selector {
  tokens: SelectorToken[];
}

export class CSSSelector {
  private cache: Map<string, DOMNode[]> = new Map();

  select(root: DOMNode, selector: string): DOMNode[] {
    // Check cache
    const cacheKey = `${selector}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    // Parse selector
    const selectorGroup = this.parseSelector(selector);
    
    // Execute selector
    let results: DOMNode[] = [];
    for (const sel of selectorGroup.selectors) {
      results = results.concat(this.executeSelector(root, sel));
    }

    // Remove duplicates
    results = this.unique(results);

    // Cache results
    this.cache.set(cacheKey, results);

    return results;
  }

  selectOne(root: DOMNode, selector: string): DOMNode | null {
    const results = this.select(root, selector);
    return results.length > 0 ? results[0] : null;
  }

  matches(node: DOMNode, selector: string): boolean {
    const selectorGroup = this.parseSelector(selector);
    
    for (const sel of selectorGroup.selectors) {
      if (this.matchesSelector(node, sel)) {
        return true;
      }
    }
    
    return false;
  }

  private parseSelector(selector: string): SelectorGroup {
    // Split by comma for multiple selectors
    const selectors = selector.split(',').map(s => s.trim());
    
    return {
      selectors: selectors.map(sel => this.parseSingleSelector(sel))
    };
  }

  private parseSingleSelector(selector: string): Selector {
    const tokens: SelectorToken[] = [];
    let current = '';
    let i = 0;

    while (i < selector.length) {
      const char = selector[i];

      // Universal selector
      if (char === '*') {
        if (current) {
          tokens.push(this.parseToken(current));
          current = '';
        }
        tokens.push({ type: 'universal', value: '*' });
        i++;
        continue;
      }

      // ID selector
      if (char === '#') {
        if (current) {
          tokens.push(this.parseToken(current));
          current = '';
        }
        i++;
        const id = this.readIdentifier(selector, i);
        tokens.push({ type: 'id', value: id });
        i += id.length;
        continue;
      }

      // Class selector
      if (char === '.') {
        if (current) {
          tokens.push(this.parseToken(current));
          current = '';
        }
        i++;
        const className = this.readIdentifier(selector, i);
        tokens.push({ type: 'class', value: className });
        i += className.length;
        continue;
      }

      // Attribute selector
      if (char === '[') {
        if (current) {
          tokens.push(this.parseToken(current));
          current = '';
        }
        const attr = this.parseAttributeSelector(selector, i);
        tokens.push(attr);
        i = selector.indexOf(']', i) + 1;
        continue;
      }

      // Pseudo selector
      if (char === ':') {
        if (current) {
          tokens.push(this.parseToken(current));
          current = '';
        }
        const pseudo = this.parsePseudoSelector(selector, i);
        tokens.push(pseudo);
        i += pseudo.value.length + 1; // +1 for the ':'
        if (pseudo.arguments) {
          i += pseudo.arguments.join('').length + 2; // +2 for '()'
        }
        continue;
      }

      // Combinators
      if (char === ' ' || char === '>' || char === '+' || char === '~') {
        if (current) {
          tokens.push(this.parseToken(current));
          current = '';
        }
        
        // Skip multiple spaces
        if (char === ' ') {
          while (selector[i] === ' ') i++;
          // Check if next char is a combinator
          if (selector[i] === '>' || selector[i] === '+' || selector[i] === '~') {
            tokens.push({ type: 'combinator', value: selector[i] });
            i++;
          } else {
            tokens.push({ type: 'combinator', value: ' ' });
          }
        } else {
          tokens.push({ type: 'combinator', value: char });
          i++;
          // Skip trailing spaces
          while (selector[i] === ' ') i++;
        }
        continue;
      }

      current += char;
      i++;
    }

    if (current) {
      tokens.push(this.parseToken(current));
    }

    return { tokens };
  }

  private parseToken(value: string): SelectorToken {
    // Check if it's a tag name
    if (/^[a-zA-Z][a-zA-Z0-9-]*$/.test(value)) {
      return { type: 'tag', value: value.toLowerCase() };
    }
    
    throw new Error(`Invalid selector token: ${value}`);
  }

  private readIdentifier(selector: string, start: number): string {
    let i = start;
    while (i < selector.length && /[a-zA-Z0-9-_]/.test(selector[i])) {
      i++;
    }
    return selector.substring(start, i);
  }

  private parseAttributeSelector(selector: string, start: number): SelectorToken {
    const end = selector.indexOf(']', start);
    const content = selector.substring(start + 1, end);
    
    // Parse attribute selector: [attr], [attr=value], [attr~=value], etc.
    const match = content.match(/^([a-zA-Z-]+)(?:([~|^$*]?=)"?([^"]*)"?)?$/);
    
    if (!match) {
      throw new Error(`Invalid attribute selector: [${content}]`);
    }

    const [, attribute, operator, value] = match;
    
    return {
      type: 'attribute',
      value: value || '',
      attribute,
      operator: operator || ''
    };
  }

  private parsePseudoSelector(selector: string, start: number): SelectorToken {
    let i = start + 1; // Skip ':'
    
    // Check for double colon (pseudo-element)
    if (selector[i] === ':') {
      i++;
    }

    const name = this.readIdentifier(selector, i);
    i += name.length;

    // Check for arguments
    let args: string[] = [];
    if (selector[i] === '(') {
      const end = selector.indexOf(')', i);
      const argsStr = selector.substring(i + 1, end);
      args = [argsStr];
      i = end + 1;
    }

    return {
      type: 'pseudo',
      value: name,
      arguments: args.length > 0 ? args : undefined
    };
  }

  private executeSelector(root: DOMNode, selector: Selector): DOMNode[] {
    let context: DOMNode[] = [root];
    let results: DOMNode[] = [];

    for (let i = 0; i < selector.tokens.length; i++) {
      const token = selector.tokens[i];

      if (token.type === 'combinator') {
        continue; // Combinators are handled in context
      }

      // Get previous combinator
      const prevToken = i > 0 ? selector.tokens[i - 1] : null;
      const combinator = prevToken?.type === 'combinator' ? prevToken.value : null;

      // Apply selector based on combinator
      if (combinator === '>') {
        // Child combinator
        results = [];
        for (const node of context) {
          const children = DOMTraversal.getChildren(node);
          for (const child of children) {
            if (this.matchesToken(child, token)) {
              results.push(child);
            }
          }
        }
      } else if (combinator === '+') {
        // Adjacent sibling
        results = [];
        for (const node of context) {
          const next = DOMTraversal.getNextSibling(node);
          if (next && this.matchesToken(next, token)) {
            results.push(next);
          }
        }
      } else if (combinator === '~') {
        // General sibling
        results = [];
        for (const node of context) {
          let sibling = DOMTraversal.getNextSibling(node);
          while (sibling) {
            if (this.matchesToken(sibling, token)) {
              results.push(sibling);
            }
            sibling = DOMTraversal.getNextSibling(sibling);
          }
        }
      } else {
        // Descendant combinator (space) or first token
        if (i === 0) {
          // First token - search from root
          results = this.findDescendants(root, token);
        } else {
          // Descendant combinator
          results = [];
          for (const node of context) {
            results = results.concat(this.findDescendants(node, token));
          }
        }
      }

      context = results;
    }

    return results;
  }

  private matchesSelector(node: DOMNode, selector: Selector): boolean {
    let current = node;
    
    // Process tokens from right to left
    for (let i = selector.tokens.length - 1; i >= 0; i--) {
      const token = selector.tokens[i];
      
      if (token.type === 'combinator') {
        const combinator = token.value;
        const prevToken = selector.tokens[i - 1];
        
        if (combinator === '>') {
          current = DOMTraversal.getParent(current);
          if (!current || !this.matchesToken(current, prevToken)) {
            return false;
          }
          i--; // Skip the prev token
        } else if (combinator === '+') {
          current = DOMTraversal.getPreviousSibling(current);
          if (!current || !this.matchesToken(current, prevToken)) {
            return false;
          }
          i--; // Skip the prev token
        } else if (combinator === '~') {
          let found = false;
          let sibling = DOMTraversal.getPreviousSibling(current);
          while (sibling) {
            if (this.matchesToken(sibling, prevToken)) {
              current = sibling;
              found = true;
              break;
            }
            sibling = DOMTraversal.getPreviousSibling(sibling);
          }
          if (!found) return false;
          i--; // Skip the prev token
        } else {
          // Descendant combinator
          let found = false;
          let ancestor = DOMTraversal.getParent(current);
          while (ancestor) {
            if (this.matchesToken(ancestor, prevToken)) {
              current = ancestor;
              found = true;
              break;
            }
            ancestor = DOMTraversal.getParent(ancestor);
          }
          if (!found) return false;
          i--; // Skip the prev token
        }
      } else {
        if (!this.matchesToken(current, token)) {
          return false;
        }
      }
    }
    
    return true;
  }

  private matchesToken(node: DOMNode, token: SelectorToken): boolean {
    if (node.type !== 'element') return false;

    switch (token.type) {
      case 'universal':
        return true;

      case 'tag':
        return node.name === token.value;

      case 'id':
        return node.attributes?.id === token.value;

      case 'class':
        const classes = node.attributes?.class?.split(/\s+/) || [];
        return classes.includes(token.value);

      case 'attribute':
        return this.matchesAttribute(node, token);

      case 'pseudo':
        return this.matchesPseudo(node, token);

      default:
        return false;
    }
  }

  private matchesAttribute(node: DOMNode, token: SelectorToken): boolean {
    if (!node.attributes || !token.attribute) return false;

    const attrValue = node.attributes[token.attribute];
    
    if (!token.operator) {
      // Just check if attribute exists
      return attrValue !== undefined;
    }

    if (attrValue === undefined) return false;

    const value = token.value;

    switch (token.operator) {
      case '=':
        return attrValue === value;
      case '~=':
        return attrValue.split(/\s+/).includes(value);
      case '|=':
        return attrValue === value || attrValue.startsWith(value + '-');
      case '^=':
        return attrValue.startsWith(value);
      case '$=':
        return attrValue.endsWith(value);
      case '*=':
        return attrValue.includes(value);
      default:
        return false;
    }
  }

  private matchesPseudo(node: DOMNode, token: SelectorToken): boolean {
    const parent = DOMTraversal.getParent(node);
    if (!parent) return false;

    const siblings = DOMTraversal.getChildren(parent).filter(n => n.type === 'element');
    const index = siblings.indexOf(node);

    switch (token.value) {
      case 'first-child':
        return index === 0;
      
      case 'last-child':
        return index === siblings.length - 1;
      
      case 'only-child':
        return siblings.length === 1;
      
      case 'nth-child':
        if (token.arguments) {
          const nth = this.parseNth(token.arguments[0]);
          return this.matchesNth(index + 1, nth);
        }
        return false;
      
      case 'nth-last-child':
        if (token.arguments) {
          const nth = this.parseNth(token.arguments[0]);
          return this.matchesNth(siblings.length - index, nth);
        }
        return false;
      
      case 'first-of-type':
        const sameType = siblings.filter(n => n.name === node.name);
        return sameType[0] === node;
      
      case 'last-of-type':
        const sameTypeLast = siblings.filter(n => n.name === node.name);
        return sameTypeLast[sameTypeLast.length - 1] === node;
      
      case 'empty':
        return !node.children || node.children.length === 0;
      
      case 'not':
        if (token.arguments) {
          return !this.matches(node, token.arguments[0]);
        }
        return false;
      
      default:
        return false;
    }
  }

  private parseNth(expr: string): { a: number; b: number } {
    expr = expr.trim();

    if (expr === 'even') {
      return { a: 2, b: 0 };
    }
    if (expr === 'odd') {
      return { a: 2, b: 1 };
    }

    const match = expr.match(/^(?:([+-]?\d*)n)?([+-]?\d+)?$/);
    if (!match) {
      return { a: 0, b: 0 };
    }

    const a = match[1] === '' ? 1 : match[1] === '-' ? -1 : parseInt(match[1] || '0');
    const b = parseInt(match[2] || '0');

    return { a, b };
  }

  private matchesNth(index: number, nth: { a: number; b: number }): boolean {
    if (nth.a === 0) {
      return index === nth.b;
    }
    
    const diff = index - nth.b;
    return diff % nth.a === 0 && diff / nth.a >= 0;
  }

  private findDescendants(root: DOMNode, token: SelectorToken): DOMNode[] {
    const results: DOMNode[] = [];
    
    const traverse = (node: DOMNode) => {
      if (node.type === 'element' && this.matchesToken(node, token)) {
        results.push(node);
      }
      
      if (node.children) {
        for (const child of node.children) {
          traverse(child);
        }
      }
    };
    
    // Don't check root itself for descendants
    if (root.children) {
      for (const child of root.children) {
        traverse(child);
      }
    }
    
    return results;
  }

  private unique(nodes: DOMNode[]): DOMNode[] {
    const seen = new Set<DOMNode>();
    const result: DOMNode[] = [];
    
    for (const node of nodes) {
      if (!seen.has(node)) {
        seen.add(node);
        result.push(node);
      }
    }
    
    return result;
  }

  clearCache(): void {
    this.cache.clear();
  }
}

export class XPathSelector {
  select(root: DOMNode, xpath: string): DOMNode[] {
    // Simplified XPath support
    // Convert common XPath patterns to CSS selectors
    const cssSelector = this.xpathToCSS(xpath);
    const selector = new CSSSelector();
    return selector.select(root, cssSelector);
  }

  private xpathToCSS(xpath: string): string {
    // Basic XPath to CSS conversion
    let css = xpath;
    
    // Convert // to descendant
    css = css.replace(/^\/\//, '');
    css = css.replace(/\/\//g, ' ');
    
    // Convert / to >
    css = css.replace(/\//g, ' > ');
    
    // Convert [@attr='value'] to [attr="value"]
    css = css.replace(/\[@([^=]+)='([^']+)'\]/g, '[$1="$2"]');
    css = css.replace(/\[@([^=]+)="([^"]+)"\]/g, '[$1="$2"]');
    
    // Convert [@attr] to [attr]
    css = css.replace(/\[@([^\]]+)\]/g, '[$1]');
    
    // Convert [position()=n] to :nth-child(n)
    css = css.replace(/\[position\(\)=(\d+)\]/g, ':nth-child($1)');
    
    // Convert [last()] to :last-child
    css = css.replace(/\[last\(\)\]/g, ':last-child');
    
    // Convert text() to text content (not directly supported in CSS)
    css = css.replace(/\/text\(\)/, '');
    
    return css.trim();
  }
}

export default CSSSelector;