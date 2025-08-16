/**
 * Browser Detection Middleware
 * Detects browser capabilities and applies necessary polyfills and fixes
 */

import { Request, Response, NextFunction } from 'express';
import { BrowserCompatibilityService, BrowserInfo, CompatibilityReport } from '../services/BrowserCompatibilityService';
import { ExternalLogService } from '../services/ExternalLogService';

declare global {
  namespace Express {
    interface Request {
      browser?: BrowserInfo;
      compatibility?: CompatibilityReport;
      supportLevel?: 'full' | 'partial' | 'limited' | "unsupported";
    }
  }
}

export interface BrowserDetectionOptions {
  blockUnsupported?: boolean;
  requireModernFeatures?: boolean;
  customBlockMessage?: string;
  logDetection?: boolean;
  injectPolyfills?: boolean;
  minimumScore?: number;
  warningThreshold?: number;
}

export class BrowserDetectionMiddleware {
  private compatibilityService: BrowserCompatibilityService;
  private logger: ExternalLogService;
  private options: BrowserDetectionOptions;
  private browserCache: Map<string, CompatibilityReport>;
  private cacheTimeout: number = 3600000; // 1 hour

  constructor(options?: BrowserDetectionOptions) {
    this.compatibilityService = new BrowserCompatibilityService();
    this.logger = new ExternalLogService();
    this.browserCache = new Map();
    this.options = {
      blockUnsupported: false,
      requireModernFeatures: true,
      customBlockMessage: 'Your browser is not supported. Please use a modern browser.',
      logDetection: true,
      injectPolyfills: true,
      minimumScore: 50,
      warningThreshold: 70,
      ...options
    };

    // Clean cache periodically
    setInterval(() => this.cleanCache(), this.cacheTimeout);
  }

  /**
   * Main middleware function
   */
  middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const userAgent = req.headers['user-agent'] || '';
      
      if (!userAgent) {
        req.browser = {
          name: 'unknown',
          version: '0',
          majorVersion: 0,
          engine: 'unknown',
          platform: 'unknown',
          mobile: false,
          userAgent: ''
        };
        return next();
      }

      // Check cache
      let report = this.browserCache.get(userAgent);
      
      if (!report) {
        // Generate new report
        report = this.compatibilityService.generateReport(userAgent);
        this.browserCache.set(userAgent, report);
      }

      // Attach to request
      req.browser = report.browserInfo;
      req.compatibility = report;
      req.supportLevel = report.supportLevel;

      // Log if enabled
      if (this.options.logDetection) {
        this.logger.info('Browser detected', {
          browser: report.browserInfo.name,
          version: report.browserInfo.version,
          platform: report.browserInfo.platform,
          mobile: report.browserInfo.mobile,
          score: report.score,
          supportLevel: report.supportLevel
        });
      }

      // Block unsupported browsers if configured
      if (this.options.blockUnsupported && report.supportLevel === "unsupported") {
        return this.blockUnsupportedBrowser(req, res);
      }

      // Check minimum score
      if (report.score < this.options.minimumScore!) {
        return this.blockLowScoreBrowser(req, res, report.score);
      }

      // Add warning header for partial support
      if (report.supportLevel === 'partial' || report.supportLevel === 'limited') {
        res.setHeader('X-Browser-Warning', `Limited support: ${report.recommendation}`);
      }

      next();
    };
  }

  /**
   * API endpoint middleware for browser info
   */
  apiEndpoint() {
    return (req: Request, res: Response) => {
      const userAgent = req.headers['user-agent'] || '';
      const report = this.compatibilityService.generateReport(userAgent);
      
      res.json({
        browser: report.browserInfo,
        capabilities: report.capabilities,
        issues: report.issues,
        score: report.score,
        supportLevel: report.supportLevel,
        recommendation: report.recommendation,
        polyfills: this.compatibilityService.getRequiredPolyfills(report.issues)
      });
    };
  }

  /**
   * Polyfill injection middleware
   */
  polyfillInjector() {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!this.options.injectPolyfills || !req.compatibility) {
        return next();
      }

      const polyfills = this.compatibilityService.getRequiredPolyfills(req.compatibility.issues);
      
      if (polyfills.length > 0) {
        // Store polyfills in response locals for template rendering
        res.locals.polyfills = polyfills;
        res.locals.needsPolyfills = true;
        
        // Add header indicating polyfills are needed
        res.setHeader('X-Polyfills-Required', polyfills.length.toString());
      }

      next();
    };
  }

  /**
   * Browser-specific CSS classes middleware
   */
  cssClasses() {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!req.browser) {
        return next();
      }

      const classes = [];
      
      // Browser name
      classes.push(`browser-${req.browser.name}`);
      
      // Browser version
      classes.push(`browser-${req.browser.name}-${req.browser.majorVersion}`);
      
      // Platform
      classes.push(`platform-${req.browser.platform}`);
      
      // Mobile
      if (req.browser.mobile) {
        classes.push('is-mobile');
      } else {
        classes.push('is-desktop');
      }
      
      // Support level
      if (req.supportLevel) {
        classes.push(`support-${req.supportLevel}`);
      }
      
      // Engine
      classes.push(`engine-${req.browser.engine}`);
      
      // Store in locals for template rendering
      res.locals.browserClasses = classes.join(' ');
      
      next();
    };
  }

  /**
   * Compatibility warning banner middleware
   */
  warningBanner() {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!req.compatibility) {
        return next();
      }

      const { score, supportLevel, recommendation } = req.compatibility;
      
      if (score < this.options.warningThreshold!) {
        res.locals.showCompatibilityWarning = true;
        res.locals.compatibilityMessage = recommendation;
        res.locals.compatibilityScore = score;
        res.locals.compatibilitySeverity = 
          supportLevel === "unsupported" ? 'error' :
          supportLevel === 'limited' ? 'warning' : 'info';
      }

      next();
    };
  }

  /**
   * Browser upgrade prompt middleware
   */
  upgradePrompt() {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!req.browser || !req.compatibility) {
        return next();
      }

      const minVersion = this.getMinimumVersion(req.browser.name);
      
      if (minVersion && req.browser.majorVersion < minVersion) {
        res.locals.showUpgradePrompt = true;
        res.locals.currentVersion = req.browser.version;
        res.locals.minimumVersion = minVersion;
        res.locals.browserName = this.getBrowserDisplayName(req.browser.name);
        res.locals.downloadUrl = this.getBrowserDownloadUrl(req.browser.name);
      }

      next();
    };
  }

  /**
   * Feature detection data middleware
   */
  featureDetection() {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!req.compatibility) {
        return next();
      }

      // Create feature flags for templates
      const features = req.compatibility.capabilities;
      
      res.locals.features = {
        hasGrid: features.css.grid,
        hasFlexbox: features.css.flexbox,
        hasCustomProperties: features.css.customProperties,
        hasAnimations: features.css.animations,
        hasPromises: features.javascript.promises,
        hasModules: features.javascript.modules,
        hasWebComponents: features.javascript.webComponents,
        hasLocalStorage: features.apis.localStorage,
        hasWebSockets: features.apis.webSockets,
        hasIntersectionObserver: features.apis.intersectionObserver,
        hasWebGL: features.media.webGL,
        hasCanvas: features.media.canvas
      };

      next();
    };
  }

  /**
   * Block unsupported browser
   */
  private blockUnsupportedBrowser(req: Request, res: Response): void {
    const html = this.generateBlockPage(
      'Browser Not Supported',
      this.options.customBlockMessage!,
      req.browser
    );
    
    res.status(400).send(html);
  }

  /**
   * Block low score browser
   */
  private blockLowScoreBrowser(req: Request, res: Response, score: number): void {
    const message = `Your browser compatibility score (${score}) is below the minimum required (${this.options.minimumScore}). Please upgrade to a modern browser.`;
    const html = this.generateBlockPage('Insufficient Browser Support', message, req.browser);
    
    res.status(400).send(html);
  }

  /**
   * Generate block page HTML
   */
  private generateBlockPage(title: string, message: string, browser?: BrowserInfo): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            padding: 20px;
          }
          .container {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border-radius: 20px;
            padding: 40px;
            max-width: 600px;
            text-align: center;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          }
          h1 {
            margin: 0 0 20px;
            font-size: 2em;
          }
          p {
            margin: 20px 0;
            font-size: 1.1em;
            line-height: 1.6;
          }
          .browser-info {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 10px;
            padding: 20px;
            margin: 30px 0;
          }
          .browser-info h3 {
            margin: 0 0 15px;
            font-size: 1.2em;
          }
          .browser-info p {
            margin: 5px 0;
            font-size: 0.95em;
          }
          .browsers {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
            gap: 20px;
            margin: 30px 0;
          }
          .browser-card {
            background: rgba(255, 255, 255, 0.2);
            border-radius: 10px;
            padding: 15px;
            text-decoration: none;
            color: white;
            transition: transform 0.2s, background 0.2s;
          }
          .browser-card:hover {
            transform: translateY(-5px);
            background: rgba(255, 255, 255, 0.3);
          }
          .browser-icon {
            font-size: 2em;
            margin-bottom: 10px;
          }
          .browser-name {
            font-weight: bold;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>⚠️ ${title}</h1>
          <p>${message}</p>
          
          ${browser ? `
            <div class="browser-info">
              <h3>Your Browser</h3>
              <p>Browser: ${this.getBrowserDisplayName(browser.name)} ${browser.version}</p>
              <p>Platform: ${browser.platform}</p>
              ${browser.mobile ? '<p>Device: Mobile</p>' : ''}
            </div>
          ` : ''}
          
          <h2>Recommended Browsers</h2>
          <div class="browsers">
            <a href="https://www.google.com/chrome/" class="browser-card" target="_blank">
              <div class="browser-icon">🌐</div>
              <div class="browser-name">Chrome</div>
              <div>90+</div>
            </a>
            <a href="https://www.mozilla.org/firefox/" class="browser-card" target="_blank">
              <div class="browser-icon">🦊</div>
              <div class="browser-name">Firefox</div>
              <div>88+</div>
            </a>
            <a href="https://www.apple.com/safari/" class="browser-card" target="_blank">
              <div class="browser-icon">🧭</div>
              <div class="browser-name">Safari</div>
              <div>14+</div>
            </a>
            <a href="https://www.microsoft.com/edge" class="browser-card" target="_blank">
              <div class="browser-icon">🌊</div>
              <div class="browser-name">Edge</div>
              <div>90+</div>
            </a>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Get minimum version for browser
   */
  private getMinimumVersion(browserName: string): number | undefined {
    const versions: Record<string, number> = {
      chrome: 90,
      firefox: 88,
      safari: 14,
      edge: 90,
      opera: 76
    };
    return versions[browserName];
  }

  /**
   * Get browser display name
   */
  private getBrowserDisplayName(browserName: string): string {
    const names: Record<string, string> = {
      chrome: 'Google Chrome',
      firefox: 'Mozilla Firefox',
      safari: 'Safari',
      edge: 'Microsoft Edge',
      opera: 'Opera',
      samsung: 'Samsung Internet',
      unknown: 'Unknown Browser'
    };
    return names[browserName] || browserName;
  }

  /**
   * Get browser download URL
   */
  private getBrowserDownloadUrl(browserName: string): string {
    const urls: Record<string, string> = {
      chrome: 'https://www.google.com/chrome/',
      firefox: 'https://www.mozilla.org/firefox/',
      safari: 'https://www.apple.com/safari/',
      edge: 'https://www.microsoft.com/edge',
      opera: 'https://www.opera.com/'
    };
    return urls[browserName] || 'https://browsehappy.com/';
  }

  /**
   * Clean cache
   */
  private cleanCache(): void {
    this.browserCache.clear();
    this.logger.info('Browser detection cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; entries: string[] } {
    return {
      size: this.browserCache.size,
      entries: Array.from(this.browserCache.keys())
    };
  }
}

// Export singleton instance
export const browserDetection = new BrowserDetectionMiddleware();