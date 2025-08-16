import { TemplateInfo, PreviewData } from '../types/template';

export class TemplateService {
  private templates: TemplateInfo[] = [
    {
      id: 'modern-01',
      name: 'Modern Dashboard',
      description: 'Clean and minimalist dashboard design with contemporary aesthetics',
      category: 'modern',
      previewUrl: '/templates/modern-01/preview',
      thumbnailUrl: '/templates/modern-01/thumbnail.jpg',
      features: ["responsive", 'dark-mode', "animations", 'mobile-first'],
      metadata: {
        author: 'Design Team',
        version: '1.2.0',
        lastUpdated: '2024-01-15',
        tags: ["dashboard", 'clean', "minimalist", 'modern']
      }
    },
    {
      id: 'professional-01',
      name: 'Corporate Portal',
      description: 'Professional business application interface with formal design',
      category: "professional",
      previewUrl: '/templates/professional-01/preview',
      thumbnailUrl: '/templates/professional-01/thumbnail.jpg',
      features: ["corporate", 'formal', "structured", 'data-tables'],
      metadata: {
        author: 'Business Team',
        version: '2.1.0',
        lastUpdated: '2024-01-10',
        tags: ["business", "corporate", 'formal', "enterprise"]
      }
    },
    {
      id: 'creative-01',
      name: 'Artistic Showcase',
      description: 'Bold and creative design for portfolios and artistic projects',
      category: "creative",
      previewUrl: '/templates/creative-01/preview',
      thumbnailUrl: '/templates/creative-01/thumbnail.jpg',
      features: ["artistic", 'bold-colors', "animations", "parallax"],
      metadata: {
        author: 'Creative Team',
        version: '1.0.0',
        lastUpdated: '2024-01-20',
        tags: ["creative", "portfolio", "artistic", 'bold']
      }
    },
    {
      id: 'accessible-01',
      name: 'Universal Access',
      description: 'WCAG 2.1 AA compliant accessible design with high contrast',
      category: "accessible",
      previewUrl: '/templates/accessible-01/preview',
      thumbnailUrl: '/templates/accessible-01/thumbnail.jpg',
      features: ['wcag-compliant', 'high-contrast', 'keyboard-navigation', 'screen-reader'],
      metadata: {
        author: 'Accessibility Team',
        version: '1.1.0',
        lastUpdated: '2024-01-12',
        tags: ["accessibility", 'wcag', "inclusive", 'a11y']
      }
    }
  ];

  private previewData: { [key: string]: PreviewData } = {
    'modern-01': {
      templateId: 'modern-01',
      html: `
        <div class="modern-dashboard">
          <header class="header">
            <h1>Modern Dashboard</h1>
            <nav>
              <a href="#home">Home</a>
              <a href="#analytics">Analytics</a>
              <a href="#settings">Settings</a>
            </nav>
          </header>
          <main class="content">
            <section class="stats">
              <div class="stat-card">
                <h3>Total Users</h3>
                <p class="stat-value">1,234</p>
              </div>
              <div class="stat-card">
                <h3>Revenue</h3>
                <p class="stat-value">$45,678</p>
              </div>
              <div class="stat-card">
                <h3>Growth</h3>
                <p class="stat-value">+23%</p>
              </div>
            </section>
          </main>
        </div>
      `,
      css: `
        .modern-dashboard {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: #f5f5f5;
          min-height: 100vh;
        }
        .header {
          background: #fff;
          padding: 1rem 2rem;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .header h1 {
          margin: 0;
          color: #333;
        }
        .header nav a {
          margin-left: 2rem;
          color: #666;
          text-decoration: none;
        }
        .content {
          padding: 2rem;
        }
        .stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1.5rem;
        }
        .stat-card {
          background: #fff;
          padding: 1.5rem;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .stat-card h3 {
          margin: 0 0 0.5rem 0;
          color: #666;
          font-size: 0.875rem;
        }
        .stat-value {
          font-size: 2rem;
          font-weight: bold;
          color: #333;
          margin: 0;
        }
      `,
      javascript: 'console.log("Modern dashboard loaded");',
      assets: ['icons/dashboard.svg', 'images/hero.jpg']
    },
    'professional-01': {
      templateId: 'professional-01',
      html: `
        <div class="professional-portal">
          <header class="corp-header">
            <div class="logo">Corporate Portal</div>
            <nav class="main-nav">
              <a href="#overview">Overview</a>
              <a href="#reports">Reports</a>
              <a href="#teams">Teams</a>
              <a href="#documents">Documents</a>
            </nav>
          </header>
          <main class="corp-content">
            <h2>Business Dashboard</h2>
            <table class="data-table">
              <thead>
                <tr>
                  <th>Department</th>
                  <th>Revenue</th>
                  <th>Growth</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Sales</td>
                  <td>$1,234,567</td>
                  <td>+12%</td>
                  <td>Active</td>
                </tr>
                <tr>
                  <td>Marketing</td>
                  <td>$987,654</td>
                  <td>+8%</td>
                  <td>Active</td>
                </tr>
              </tbody>
            </table>
          </main>
        </div>
      `,
      css: `
        .professional-portal {
          font-family: Georgia, 'Times New Roman', serif;
          background: #ffffff;
          color: #333;
        }
        .corp-header {
          background: #003366;
          color: white;
          padding: 1rem 2rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .logo {
          font-size: 1.5rem;
          font-weight: bold;
        }
        .main-nav a {
          color: white;
          text-decoration: none;
          margin-left: 2rem;
        }
        .corp-content {
          padding: 2rem;
        }
        .data-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 1rem;
        }
        .data-table th,
        .data-table td {
          border: 1px solid #ddd;
          padding: 0.75rem;
          text-align: left;
        }
        .data-table th {
          background: #f5f5f5;
          font-weight: bold;
        }
      `,
      assets: ['logos/company.png', 'documents/terms.pdf']
    },
    'creative-01': {
      templateId: 'creative-01',
      html: `
        <div class="creative-showcase">
          <header class="artistic-header">
            <h1 class="glitch-text">Artistic Showcase</h1>
          </header>
          <section class="gallery">
            <div class="art-piece">
              <div class="art-frame">
                <div class="art-content">Creative Project 1</div>
              </div>
            </div>
            <div class="art-piece">
              <div class="art-frame">
                <div class="art-content">Creative Project 2</div>
              </div>
            </div>
            <div class="art-piece">
              <div class="art-frame">
                <div class="art-content">Creative Project 3</div>
              </div>
            </div>
          </section>
        </div>
      `,
      css: `
        .creative-showcase {
          background: linear-gradient(45deg, #ff6b6b, #4ecdc4);
          min-height: 100vh;
          color: white;
          padding: 2rem;
        }
        .artistic-header {
          text-align: center;
          margin-bottom: 3rem;
        }
        .glitch-text {
          font-size: 3rem;
          font-weight: bold;
          text-shadow: 2px 2px 0px #ff6b6b, -2px -2px 0px #4ecdc4;
          animation: glitch 2s infinite;
        }
        @keyframes glitch {
          0%, 100% { transform: translate(0); }
          20% { transform: translate(-2px, 2px); }
          40% { transform: translate(-2px, -2px); }
          60% { transform: translate(2px, 2px); }
          80% { transform: translate(2px, -2px); }
        }
        .gallery {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 2rem;
        }
        .art-piece {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 15px;
          padding: 1.5rem;
          backdrop-filter: blur(10px);
          transition: transform 0.3s;
        }
        .art-piece:hover {
          transform: scale(1.05);
        }
        .art-frame {
          border: 3px solid white;
          border-radius: 10px;
          padding: 2rem;
          text-align: center;
        }
        .art-content {
          font-size: 1.5rem;
        }
      `,
      javascript: 'document.addEventListener("DOMContentLoaded", () => { console.log("Creative portfolio ready"); });',
      assets: ['art/painting1.jpg', 'art/sculpture2.jpg', 'videos/demo.mp4']
    },
    'accessible-01': {
      templateId: 'accessible-01',
      html: `
        <div class="accessible-design">
          <a href="#main-content" class="skip-link">Skip to main content</a>
          <header role="banner">
            <h1>Universal Access Portal</h1>
          </header>
          <nav role="navigation" aria-label="Main navigation">
            <ul>
              <li><a href="#home">Home</a></li>
              <li><a href="#services">Services</a></li>
              <li><a href="#contact">Contact</a></li>
            </ul>
          </nav>
          <main id="main-content" role="main">
            <h2>Welcome to our accessible website</h2>
            <p>This website follows WCAG 2.1 AA guidelines to ensure it's accessible to everyone.</p>
            <section aria-labelledby="features-heading">
              <h3 id="features-heading">Accessibility Features</h3>
              <ul>
                <li>High contrast colors</li>
                <li>Keyboard navigation support</li>
                <li>Screen reader optimized</li>
                <li>Clear focus indicators</li>
              </ul>
            </section>
          </main>
        </div>
      `,
      css: `
        .accessible-design {
          font-family: Arial, sans-serif;
          font-size: 18px;
          line-height: 1.6;
          background: #ffffff;
          color: #000000;
          padding: 1rem;
        }
        .skip-link {
          position: absolute;
          top: -40px;
          left: 0;
          background: #0066cc;
          color: white;
          padding: 8px;
          text-decoration: none;
        }
        .skip-link:focus {
          top: 0;
        }
        header {
          border-bottom: 3px solid #0066cc;
          padding-bottom: 1rem;
          margin-bottom: 1rem;
        }
        h1 {
          color: #003366;
          font-size: 2rem;
        }
        nav ul {
          list-style: none;
          padding: 0;
          display: flex;
          gap: 2rem;
        }
        nav a {
          color: #0066cc;
          font-size: 1.1rem;
          text-decoration: underline;
          padding: 0.5rem;
          display: inline-block;
        }
        nav a:hover,
        nav a:focus {
          background: #0066cc;
          color: white;
          outline: 3px solid #ff9900;
          outline-offset: 2px;
        }
        main {
          max-width: 800px;
          margin: 2rem 0;
        }
        h2, h3 {
          color: #003366;
        }
        *:focus {
          outline: 3px solid #ff9900;
          outline-offset: 2px;
        }
      `,
      assets: ['audio/screen-reader.mp3', 'icons/accessible-icons.svg']
    }
  };

  async listTemplates(): Promise<TemplateInfo[]> {
    await this.simulateDelay();
    // Return deep copies to prevent mutation
    return JSON.parse(JSON.stringify(this.templates));
  }

  async getTemplate(id: string): Promise<TemplateInfo | null> {
    await this.simulateDelay();
    return this.templates.find(t => t.id === id) || null;
  }

  async getTemplatePreview(id: string): Promise<PreviewData | null> {
    await this.simulateDelay();
    return this.previewData[id] || null;
  }

  async searchTemplates(query: string): Promise<TemplateInfo[]> {
    await this.simulateDelay();
    const lowerQuery = query.toLowerCase();
    return this.templates.filter(t => 
      t.name.toLowerCase().includes(lowerQuery) ||
      t.description.toLowerCase().includes(lowerQuery) ||
      t.metadata.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
  }

  async getTemplatesByCategory(category: string): Promise<TemplateInfo[]> {
    await this.simulateDelay();
    return this.templates.filter(t => t.category === category);
  }

  private async simulateDelay(): Promise<void> {
    // Simulate async operation
    await new Promise(resolve => setTimeout(resolve, 10));
  }
}