/**
 * Design Candidates Generator
 * Creates four distinct design variations: Modern, Professional, Creative, Accessible
 */

import { Component, Layout } from '../ascii-sketch';

export interface Color {
  primary: string;
  secondary: string;
  background: string;
  text: string;
  accent: string;
  error: string;
  success: string;
  warning: string;
}

export interface Typography {
  fontFamily: string;
  fontSize: {
    base: string;
    h1: string;
    h2: string;
    h3: string;
    small: string;
  };
  lineHeight: string;
  fontWeight: {
    normal: number;
    medium: number;
    bold: number;
  };
}

export interface Spacing {
  unit: number;
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
}

export interface DesignSystem {
  colors: Color;
  typography: Typography;
  spacing: Spacing;
  borderRadius: string;
  shadow: string;
  transitions: string;
}

export interface Design {
  name: 'modern' | 'professional' | 'creative' | 'accessible';
  system: DesignSystem;
  html: string;
  css: string;
  components: Map<string, string>;
  description: string;
  features: string[];
}

export interface DesignBase {
  sketch?: Layout;
  requirements?: string[];
  components?: Component[];
  brandColors?: Partial<Color>;
}

export interface DesignSet {
  modern: Design;
  professional: Design;
  creative: Design;
  accessible: Design;
}

export class DesignCandidates {
  private modernSystem: DesignSystem = {
    colors: {
      primary: '#007AFF',
      secondary: '#5AC8FA',
      background: '#FFFFFF',
      text: '#1C1C1E',
      accent: '#FF3B30',
      error: '#FF3B30',
      success: '#34C759',
      warning: '#FF9500'
    },
    typography: {
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontSize: {
        base: '16px',
        h1: '32px',
        h2: '24px',
        h3: '20px',
        small: '14px'
      },
      lineHeight: '1.5',
      fontWeight: {
        normal: 400,
        medium: 500,
        bold: 700
      }
    },
    spacing: {
      unit: 8,
      xs: '4px',
      sm: '8px',
      md: '16px',
      lg: '24px',
      xl: '32px'
    },
    borderRadius: '12px',
    shadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
    transitions: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
  };

  private professionalSystem: DesignSystem = {
    colors: {
      primary: '#003366',
      secondary: '#4A90E2',
      background: '#F8F9FA',
      text: '#212529',
      accent: '#17A2B8',
      error: '#DC3545',
      success: '#28A745',
      warning: '#FFC107'
    },
    typography: {
      fontFamily: '"Helvetica Neue", Arial, sans-serif',
      fontSize: {
        base: '14px',
        h1: '28px',
        h2: '22px',
        h3: '18px',
        small: '12px'
      },
      lineHeight: '1.6',
      fontWeight: {
        normal: 400,
        medium: 500,
        bold: 600
      }
    },
    spacing: {
      unit: 8,
      xs: '4px',
      sm: '8px',
      md: '12px',
      lg: '20px',
      xl: '28px'
    },
    borderRadius: '4px',
    shadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    transitions: 'all 0.2s ease-in-out'
  };

  private creativeSystem: DesignSystem = {
    colors: {
      primary: '#FF6B6B',
      secondary: '#4ECDC4',
      background: '#1A1A2E',
      text: '#EAEAEA',
      accent: '#FFD93D',
      error: '#FF4757',
      success: '#6BCF7F',
      warning: '#FFA502'
    },
    typography: {
      fontFamily: '"Poppins", "Montserrat", sans-serif',
      fontSize: {
        base: '18px',
        h1: '48px',
        h2: '36px',
        h3: '24px',
        small: '14px'
      },
      lineHeight: '1.7',
      fontWeight: {
        normal: 300,
        medium: 500,
        bold: 800
      }
    },
    spacing: {
      unit: 10,
      xs: '5px',
      sm: '10px',
      md: '20px',
      lg: '30px',
      xl: '40px'
    },
    borderRadius: '20px',
    shadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
    transitions: 'all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)'
  };

  private accessibleSystem: DesignSystem = {
    colors: {
      primary: '#0066CC',
      secondary: '#008000',
      background: '#FFFFFF',
      text: '#000000',
      accent: '#CC0000',
      error: '#CC0000',
      success: '#008000',
      warning: '#FF8800'
    },
    typography: {
      fontFamily: 'Georgia, "Times New Roman", serif',
      fontSize: {
        base: '18px',
        h1: '36px',
        h2: '30px',
        h3: '24px',
        small: '16px'
      },
      lineHeight: '1.8',
      fontWeight: {
        normal: 400,
        medium: 600,
        bold: 700
      }
    },
    spacing: {
      unit: 12,
      xs: '6px',
      sm: '12px',
      md: '24px',
      lg: '36px',
      xl: '48px'
    },
    borderRadius: '4px',
    shadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
    transitions: 'none'
  };

  async generateModern(base: DesignBase): Promise<Design> {
    const components = this.generateComponents('modern', this.modernSystem, base);
    const { html, css } = this.generateMarkup('modern', this.modernSystem, base);
    
    return {
      name: 'modern',
      system: this.modernSystem,
      html,
      css,
      components,
      description: 'Clean, minimalist design with smooth animations and contemporary aesthetics',
      features: [
        'Glassmorphism effects',
        'Smooth transitions',
        'Minimalist layout',
        'SF Symbols icons',
        'Light/dark mode support'
      ]
    };
  }

  async generateProfessional(base: DesignBase): Promise<Design> {
    const components = this.generateComponents('professional', this.professionalSystem, base);
    const { html, css } = this.generateMarkup('professional', this.professionalSystem, base);
    
    return {
      name: 'professional',
      system: this.professionalSystem,
      html,
      css,
      components,
      description: 'Business-focused design with clear hierarchy and formal presentation',
      features: [
        'Clear typography',
        'Structured layout',
        'Data tables',
        'Form validation',
        'Print-friendly'
      ]
    };
  }

  async generateCreative(base: DesignBase): Promise<Design> {
    const components = this.generateComponents('creative', this.creativeSystem, base);
    const { html, css } = this.generateMarkup('creative', this.creativeSystem, base);
    
    return {
      name: 'creative',
      system: this.creativeSystem,
      html,
      css,
      components,
      description: 'Bold, artistic design with unique animations and creative layouts',
      features: [
        'Gradient backgrounds',
        'Animated elements',
        'Asymmetric layouts',
        'Custom illustrations',
        'Parallax scrolling'
      ]
    };
  }

  async generateAccessible(base: DesignBase): Promise<Design> {
    const components = this.generateComponents('accessible', this.accessibleSystem, base);
    const { html, css } = this.generateMarkup('accessible', this.accessibleSystem, base);
    
    return {
      name: 'accessible',
      system: this.accessibleSystem,
      html,
      css,
      components,
      description: 'WCAG AAA compliant design with high contrast and screen reader optimization',
      features: [
        'High contrast colors',
        'Large touch targets',
        'Clear focus indicators',
        'Skip navigation',
        'ARIA labels'
      ]
    };
  }

  async generateAll(base: DesignBase): Promise<DesignSet> {
    const [modern, professional, creative, accessible] = await Promise.all([
      this.generateModern(base),
      this.generateProfessional(base),
      this.generateCreative(base),
      this.generateAccessible(base)
    ]);
    
    return { modern, professional, creative, accessible };
  }

  private generateComponents(
    style: string,
    system: DesignSystem,
    base: DesignBase
  ): Map<string, string> {
    const components = new Map<string, string>();
    
    // Button component
    components.set('button', this.generateButton(style, system));
    
    // Card component
    components.set('card', this.generateCard(style, system));
    
    // Form input
    components.set('input', this.generateInput(style, system));
    
    // Navigation
    components.set('nav', this.generateNav(style, system));
    
    // Table
    components.set('table', this.generateTable(style, system));
    
    return components;
  }

  private generateButton(style: string, system: DesignSystem): string {
    const baseButton = `
      padding: ${system.spacing.sm} ${system.spacing.md};
      font-family: ${system.typography.fontFamily};
      font-size: ${system.typography.fontSize.base};
      font-weight: ${system.typography.fontWeight.medium};
      border-radius: ${system.borderRadius};
      border: none;
      cursor: pointer;
      transition: ${system.transitions};
    `;
    
    switch (style) {
      case 'modern':
        return `.btn-${style} {
          ${baseButton}
          background: linear-gradient(135deg, ${system.colors.primary}, ${system.colors.secondary});
          color: white;
          box-shadow: ${system.shadow};
        }
        .btn-${style}:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(0, 122, 255, 0.3);
        }`;
      
      case 'professional':
        return `.btn-${style} {
          ${baseButton}
          background: ${system.colors.primary};
          color: white;
          border: 1px solid ${system.colors.primary};
        }
        .btn-${style}:hover {
          background: white;
          color: ${system.colors.primary};
        }`;
      
      case 'creative':
        return `.btn-${style} {
          ${baseButton}
          background: ${system.colors.primary};
          color: white;
          transform: skew(-5deg);
          position: relative;
          overflow: hidden;
        }
        .btn-${style}::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: ${system.colors.accent};
          transition: left 0.3s;
        }
        .btn-${style}:hover::before {
          left: 0;
        }`;
      
      case 'accessible':
        return `.btn-${style} {
          ${baseButton}
          background: ${system.colors.primary};
          color: white;
          border: 3px solid ${system.colors.primary};
          text-decoration: underline;
        }
        .btn-${style}:focus {
          outline: 4px solid ${system.colors.warning};
          outline-offset: 2px;
        }
        .btn-${style}:hover {
          background: ${system.colors.secondary};
          border-color: ${system.colors.secondary};
        }`;
      
      default:
        return baseButton;
    }
  }

  private generateCard(style: string, system: DesignSystem): string {
    const baseCard = `
      padding: ${system.spacing.md};
      border-radius: ${system.borderRadius};
      margin-bottom: ${system.spacing.md};
    `;
    
    switch (style) {
      case 'modern':
        return `.card-${style} {
          ${baseCard}
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(10px);
          box-shadow: ${system.shadow};
        }`;
      
      case 'professional':
        return `.card-${style} {
          ${baseCard}
          background: white;
          border: 1px solid #e0e0e0;
        }`;
      
      case 'creative':
        return `.card-${style} {
          ${baseCard}
          background: linear-gradient(135deg, ${system.colors.background}, ${system.colors.primary}22);
          border-left: 4px solid ${system.colors.primary};
          transform: rotate(-1deg);
        }`;
      
      case 'accessible':
        return `.card-${style} {
          ${baseCard}
          background: white;
          border: 2px solid ${system.colors.text};
        }`;
      
      default:
        return baseCard;
    }
  }

  private generateInput(style: string, system: DesignSystem): string {
    const baseInput = `
      padding: ${system.spacing.sm};
      font-family: ${system.typography.fontFamily};
      font-size: ${system.typography.fontSize.base};
      border-radius: ${system.borderRadius};
      width: 100%;
    `;
    
    switch (style) {
      case 'modern':
        return `.input-${style} {
          ${baseInput}
          border: none;
          border-bottom: 2px solid ${system.colors.primary};
          background: transparent;
          transition: ${system.transitions};
        }
        .input-${style}:focus {
          outline: none;
          border-bottom-color: ${system.colors.secondary};
        }`;
      
      case 'professional':
        return `.input-${style} {
          ${baseInput}
          border: 1px solid #ccc;
          background: white;
        }
        .input-${style}:focus {
          outline: none;
          border-color: ${system.colors.primary};
        }`;
      
      case 'creative':
        return `.input-${style} {
          ${baseInput}
          border: 2px dashed ${system.colors.secondary};
          background: ${system.colors.background};
          color: ${system.colors.text};
        }
        .input-${style}:focus {
          outline: none;
          border-style: solid;
          border-color: ${system.colors.primary};
        }`;
      
      case 'accessible':
        return `.input-${style} {
          ${baseInput}
          border: 3px solid ${system.colors.text};
          background: white;
          font-size: ${system.typography.fontSize.base};
        }
        .input-${style}:focus {
          outline: 4px solid ${system.colors.warning};
          outline-offset: 2px;
        }`;
      
      default:
        return baseInput;
    }
  }

  private generateNav(style: string, system: DesignSystem): string {
    const baseNav = `
      display: flex;
      padding: ${system.spacing.md};
      background: ${system.colors.background};
    `;
    
    switch (style) {
      case 'modern':
        return `.nav-${style} {
          ${baseNav}
          backdrop-filter: blur(10px);
          background: rgba(255, 255, 255, 0.8);
          box-shadow: ${system.shadow};
        }`;
      
      case 'professional':
        return `.nav-${style} {
          ${baseNav}
          background: ${system.colors.primary};
          color: white;
        }`;
      
      case 'creative':
        return `.nav-${style} {
          ${baseNav}
          background: linear-gradient(90deg, ${system.colors.primary}, ${system.colors.secondary});
          clip-path: polygon(0 0, 100% 0, 95% 100%, 5% 100%);
        }`;
      
      case 'accessible':
        return `.nav-${style} {
          ${baseNav}
          background: ${system.colors.background};
          border-bottom: 3px solid ${system.colors.text};
        }
        .nav-${style} a {
          padding: ${system.spacing.sm};
          text-decoration: underline;
        }`;
      
      default:
        return baseNav;
    }
  }

  private generateTable(style: string, system: DesignSystem): string {
    const baseTable = `
      width: 100%;
      border-collapse: collapse;
      font-family: ${system.typography.fontFamily};
    `;
    
    switch (style) {
      case 'modern':
        return `.table-${style} {
          ${baseTable}
        }
        .table-${style} th {
          background: ${system.colors.primary};
          color: white;
          padding: ${system.spacing.md};
          text-align: left;
        }
        .table-${style} td {
          padding: ${system.spacing.md};
          border-bottom: 1px solid #f0f0f0;
        }`;
      
      case 'professional':
        return `.table-${style} {
          ${baseTable}
          border: 1px solid #ddd;
        }
        .table-${style} th {
          background: #f8f9fa;
          padding: ${system.spacing.sm};
          border: 1px solid #ddd;
        }
        .table-${style} td {
          padding: ${system.spacing.sm};
          border: 1px solid #ddd;
        }`;
      
      case 'creative':
        return `.table-${style} {
          ${baseTable}
        }
        .table-${style} th {
          background: ${system.colors.primary};
          color: ${system.colors.text};
          padding: ${system.spacing.md};
          transform: skew(-5deg);
        }
        .table-${style} td {
          padding: ${system.spacing.md};
          border-left: 3px solid ${system.colors.secondary};
        }`;
      
      case 'accessible':
        return `.table-${style} {
          ${baseTable}
          border: 2px solid ${system.colors.text};
        }
        .table-${style} th {
          background: ${system.colors.primary};
          color: white;
          padding: ${system.spacing.md};
          border: 2px solid ${system.colors.text};
        }
        .table-${style} td {
          padding: ${system.spacing.md};
          border: 1px solid ${system.colors.text};
        }`;
      
      default:
        return baseTable;
    }
  }

  private generateMarkup(
    style: string,
    system: DesignSystem,
    base: DesignBase
  ): { html: string; css: string } {
    const html = this.generateHTML(style, base);
    const css = this.generateCSS(style, system);
    
    return { html, css };
  }

  private generateHTML(style: string, base: DesignBase): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${style.charAt(0).toUpperCase() + style.slice(1)} Design</title>
  <link rel="stylesheet" href="${style}.css">
</head>
<body class="design-${style}">
  <nav class="nav-${style}">
    <a href="#home">Home</a>
    <a href="#features">Features</a>
    <a href="#about">About</a>
    <a href="#contact">Contact</a>
  </nav>
  
  <main class="main-${style}">
    <h1>Welcome to ${style.charAt(0).toUpperCase() + style.slice(1)} Design</h1>
    
    <div class="card-${style}">
      <h2>Feature Card</h2>
      <p>This is a sample card component showing the ${style} design style.</p>
      <button class="btn-${style}">Learn More</button>
    </div>
    
    <form class="form-${style}">
      <label for="email">Email Address</label>
      <input type="email" id="email" class="input-${style}" placeholder="Enter your email">
      
      <label for="message">Message</label>
      <textarea id="message" class="input-${style}" rows="4" placeholder="Enter your message"></textarea>
      
      <button type="submit" class="btn-${style}">Submit</button>
    </form>
    
    <table class="table-${style}">
      <thead>
        <tr>
          <th>Name</th>
          <th>Role</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>John Doe</td>
          <td>Developer</td>
          <td>Active</td>
        </tr>
        <tr>
          <td>Jane Smith</td>
          <td>Designer</td>
          <td>Active</td>
        </tr>
      </tbody>
    </table>
  </main>
  
  <footer class="footer-${style}">
    <p>&copy; 2025 ${style.charAt(0).toUpperCase() + style.slice(1)} Design. All rights reserved.</p>
  </footer>
</body>
</html>`;
  }

  private generateCSS(style: string, system: DesignSystem): string {
    const components = [
      this.generateButton(style, system),
      this.generateCard(style, system),
      this.generateInput(style, system),
      this.generateNav(style, system),
      this.generateTable(style, system)
    ];
    
    return `/* ${style.charAt(0).toUpperCase() + style.slice(1)} Design System */
    
:root {
  --primary: ${system.colors.primary};
  --secondary: ${system.colors.secondary};
  --background: ${system.colors.background};
  --text: ${system.colors.text};
  --accent: ${system.colors.accent};
  --error: ${system.colors.error};
  --success: ${system.colors.success};
  --warning: ${system.colors.warning};
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body.design-${style} {
  font-family: ${system.typography.fontFamily};
  font-size: ${system.typography.fontSize.base};
  line-height: ${system.typography.lineHeight};
  color: ${system.colors.text};
  background: ${system.colors.background};
}

h1 {
  font-size: ${system.typography.fontSize.h1};
  font-weight: ${system.typography.fontWeight.bold};
  margin-bottom: ${system.spacing.lg};
}

h2 {
  font-size: ${system.typography.fontSize.h2};
  font-weight: ${system.typography.fontWeight.medium};
  margin-bottom: ${system.spacing.md};
}

h3 {
  font-size: ${system.typography.fontSize.h3};
  font-weight: ${system.typography.fontWeight.medium};
  margin-bottom: ${system.spacing.sm};
}

.main-${style} {
  max-width: 1200px;
  margin: 0 auto;
  padding: ${system.spacing.xl};
}

.form-${style} {
  max-width: 500px;
  margin: ${system.spacing.xl} 0;
}

.form-${style} label {
  display: block;
  margin-bottom: ${system.spacing.xs};
  font-weight: ${system.typography.fontWeight.medium};
}

.form-${style} input,
.form-${style} textarea {
  margin-bottom: ${system.spacing.md};
}

.footer-${style} {
  text-align: center;
  padding: ${system.spacing.xl};
  background: ${system.colors.background};
  border-top: 1px solid ${system.colors.text}22;
}

${components.join('\n\n')}`;
  }
}

export default DesignCandidates;