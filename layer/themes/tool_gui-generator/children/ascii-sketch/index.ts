/**
 * ASCII Sketch Generator
 * Creates text-based UI mockups from requirements
 */

export interface Component {
  type: 'header' | 'sidebar' | 'main' | 'footer' | 'widget' | 'nav' | 'form' | 'table' | 'card';
  name: string;
  position?: { x: number; y: number };
  size?: { width: number; height: number };
  children?: Component[];
}

export interface LayoutConfig {
  type: 'dashboard' | 'form' | 'list' | 'detail' | 'landing' | 'admin';
  sections: string[];
  responsive?: boolean;
  components?: Component[];
}

export interface Layout {
  config: LayoutConfig;
  components: Component[];
  render(): string;
  export(format: 'txt' | 'md' | 'svg'): string;
}

export interface NavigationFlow {
  from: string;
  to: string;
  action: string;
}

export class ASCIISketch {
  private width: number = 80;
  private height: number = 40;
  private components: Component[] = [];
  private navigationFlows: NavigationFlow[] = [];
  private charset: 'ascii' | 'unicode' = 'unicode';

  constructor(options?: { width?: number; height?: number; charset?: 'ascii' | 'unicode' }) {
    if (options?.width) this.width = options.width;
    if (options?.height) this.height = options.height;
    if (options?.charset) this.charset = options.charset;
  }

  createLayout(config: LayoutConfig): Layout {
    const layout = new LayoutImpl(config, this.width, this.height, this.charset);
    
    // Add default sections based on layout type
    if (config.type === 'dashboard') {
      this.addDashboardSections(layout);
    } else if (config.type === 'form') {
      this.addFormSections(layout);
    } else if (config.type === 'landing') {
      this.addLandingSections(layout);
    }
    
    // Add custom components
    if (config.components) {
      config.components.forEach(comp => layout.addComponent(comp));
    }
    
    return layout;
  }

  addComponent(component: Component): void {
    this.components.push(component);
  }

  addNavigation(flow: NavigationFlow): void {
    this.navigationFlows.push(flow);
  }

  render(): string {
    const layout = this.createLayout({
      type: 'dashboard',
      sections: ['header', 'main'],
      components: this.components
    });
    return layout.render();
  }

  private addDashboardSections(layout: LayoutImpl): void {
    layout.addComponent({
      type: 'header',
      name: 'Header',
      position: { x: 0, y: 0 },
      size: { width: this.width, height: 3 }
    });
    
    layout.addComponent({
      type: 'sidebar',
      name: 'Sidebar',
      position: { x: 0, y: 3 },
      size: { width: 20, height: this.height - 6 }
    });
    
    layout.addComponent({
      type: 'main',
      name: 'Main Content',
      position: { x: 20, y: 3 },
      size: { width: this.width - 20, height: this.height - 6 }
    });
    
    layout.addComponent({
      type: 'footer',
      name: 'Footer',
      position: { x: 0, y: this.height - 3 },
      size: { width: this.width, height: 3 }
    });
  }

  private addFormSections(layout: LayoutImpl): void {
    layout.addComponent({
      type: 'header',
      name: 'Form Header',
      position: { x: 0, y: 0 },
      size: { width: this.width, height: 3 }
    });
    
    layout.addComponent({
      type: 'form',
      name: 'Form Fields',
      position: { x: 10, y: 5 },
      size: { width: this.width - 20, height: this.height - 10 }
    });
  }

  private addLandingSections(layout: LayoutImpl): void {
    layout.addComponent({
      type: 'header',
      name: 'Hero Section',
      position: { x: 0, y: 0 },
      size: { width: this.width, height: 10 }
    });
    
    layout.addComponent({
      type: 'main',
      name: 'Features',
      position: { x: 0, y: 10 },
      size: { width: this.width, height: this.height - 15 }
    });
    
    layout.addComponent({
      type: 'footer',
      name: 'CTA Section',
      position: { x: 0, y: this.height - 5 },
      size: { width: this.width, height: 5 }
    });
  }
}

class LayoutImpl implements Layout {
  config: LayoutConfig;
  components: Component[] = [];
  private width: number;
  private height: number;
  private charset: 'ascii' | 'unicode';
  private grid: string[][];

  constructor(config: LayoutConfig, width: number, height: number, charset: 'ascii' | 'unicode') {
    this.config = config;
    this.width = width;
    this.height = height;
    this.charset = charset;
    this.grid = Array(height).fill(null).map(() => Array(width).fill(' '));
  }

  addComponent(component: Component): void {
    this.components.push(component);
  }

  render(): string {
    // Clear grid
    this.grid = Array(this.height).fill(null).map(() => Array(this.width).fill(' '));
    
    // Draw border
    this.drawBorder();
    
    // Draw components
    this.components.forEach(comp => this.drawComponent(comp));
    
    // Convert grid to string
    return this.grid.map(row => row.join('')).join('\n');
  }

  private drawBorder(): void {
    const chars = this.charset === 'unicode' 
      ? { tl: '┌', tr: '┐', bl: '└', br: '┘', h: '─', v: '│', cross: '┼', th: '┬', bh: '┴', lv: '├', rv: '┤' }
      : { tl: '+', tr: '+', bl: '+', br: '+', h: '-', v: '|', cross: '+', th: '+', bh: '+', lv: '+', rv: '+' };
    
    // Top border
    this.grid[0][0] = chars.tl;
    this.grid[0][this.width - 1] = chars.tr;
    for (let x = 1; x < this.width - 1; x++) {
      this.grid[0][x] = chars.h;
    }
    
    // Bottom border
    this.grid[this.height - 1][0] = chars.bl;
    this.grid[this.height - 1][this.width - 1] = chars.br;
    for (let x = 1; x < this.width - 1; x++) {
      this.grid[this.height - 1][x] = chars.h;
    }
    
    // Side borders
    for (let y = 1; y < this.height - 1; y++) {
      this.grid[y][0] = chars.v;
      this.grid[y][this.width - 1] = chars.v;
    }
  }

  private drawComponent(component: Component): void {
    if (!component.position || !component.size) return;
    
    const { x, y } = component.position;
    const { width, height } = component.size;
    
    const chars = this.charset === 'unicode'
      ? { tl: '┌', tr: '┐', bl: '└', br: '┘', h: '─', v: '│' }
      : { tl: '+', tr: '+', bl: '+', br: '+', h: '-', v: '|' };
    
    // Draw component border
    for (let dx = 0; dx < width; dx++) {
      if (x + dx < this.width) {
        if (y < this.height) this.grid[y][x + dx] = chars.h;
        if (y + height - 1 < this.height) this.grid[y + height - 1][x + dx] = chars.h;
      }
    }
    
    for (let dy = 0; dy < height; dy++) {
      if (y + dy < this.height) {
        if (x < this.width) this.grid[y + dy][x] = chars.v;
        if (x + width - 1 < this.width) this.grid[y + dy][x + width - 1] = chars.v;
      }
    }
    
    // Draw corners
    if (y < this.height && x < this.width) this.grid[y][x] = chars.tl;
    if (y < this.height && x + width - 1 < this.width) this.grid[y][x + width - 1] = chars.tr;
    if (y + height - 1 < this.height && x < this.width) this.grid[y + height - 1][x] = chars.bl;
    if (y + height - 1 < this.height && x + width - 1 < this.width) this.grid[y + height - 1][x + width - 1] = chars.br;
    
    // Add component name
    const name = component.name.substring(0, width - 4);
    const nameX = x + Math.floor((width - name.length) / 2);
    const nameY = y + 1;
    
    if (nameY < this.height) {
      for (let i = 0; i < name.length; i++) {
        if (nameX + i < this.width) {
          this.grid[nameY][nameX + i] = name[i];
        }
      }
    }
  }

  export(format: 'txt' | 'md' | 'svg'): string {
    const rendered = this.render();
    
    switch (format) {
      case 'txt':
        return rendered;
      
      case 'md':
        return '```\n' + rendered + '\n```';
      
      case 'svg':
        return this.renderAsSVG();
      
      default:
        return rendered;
    }
  }

  private renderAsSVG(): string {
    const charWidth = 8;
    const charHeight = 16;
    const svgWidth = this.width * charWidth;
    const svgHeight = this.height * charHeight;
    
    let svg = `<svg width="${svgWidth}" height="${svgHeight}" xmlns="http://www.w3.org/2000/svg">\n`;
    svg += `  <rect width="${svgWidth}" height="${svgHeight}" fill="white"/>\n`;
    svg += `  <style>text { font-family: monospace; font-size: 14px; }</style>\n`;
    
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const char = this.grid[y][x];
        if (char !== ' ') {
          const svgX = x * charWidth;
          const svgY = (y + 1) * charHeight - 4;
          svg += `  <text x="${svgX}" y="${svgY}">${this.escapeXML(char)}</text>\n`;
        }
      }
    }
    
    svg += '</svg>';
    return svg;
  }

  private escapeXML(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}

export default ASCIISketch;