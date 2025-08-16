/**
 * Browser Compatibility Service
 * Detects browser capabilities, provides polyfills, and ensures cross-browser compatibility
 */

import { ExternalLogService } from './ExternalLogService';

export interface BrowserInfo {
  name: string;
  version: string;
  majorVersion: number;
  engine: string;
  engineVersion?: string;
  platform: string;
  mobile: boolean;
  userAgent: string;
}

export interface BrowserCapabilities {
  css: {
    grid: boolean;
    flexbox: boolean;
    customProperties: boolean;
    transforms3d: boolean;
    animations: boolean;
    filters: boolean;
    backdropFilter: boolean;
    clipPath: boolean;
    maskImage: boolean;
    containerQueries: boolean;
  };
  javascript: {
    promises: boolean;
    asyncAwait: boolean;
    modules: boolean;
    webComponents: boolean;
    serviceWorker: boolean;
    webAssembly: boolean;
    bigInt: boolean;
    optionalChaining: boolean;
    nullishCoalescing: boolean;
  };
  apis: {
    localStorage: boolean;
    sessionStorage: boolean;
    indexedDB: boolean;
    webSockets: boolean;
    webRTC: boolean;
    notifications: boolean;
    geolocation: boolean;
    clipboard: boolean;
    intersectionObserver: boolean;
    resizeObserver: boolean;
    mutationObserver: boolean;
    performanceObserver: boolean;
  };
  media: {
    audio: boolean;
    video: boolean;
    webGL: boolean;
    webGL2: boolean;
    canvas: boolean;
    svg: boolean;
    webP: boolean;
    avif: boolean;
  };
}

export interface CompatibilityIssue {
  feature: string;
  severity: "critical" | 'warning' | 'info';
  browser: string;
  version: string;
  description: string;
  workaround?: string;
  polyfillAvailable: boolean;
}

export interface CompatibilityReport {
  timestamp: Date;
  browserInfo: BrowserInfo;
  capabilities: BrowserCapabilities;
  issues: CompatibilityIssue[];
  score: number; // 0-100
  recommendation: string;
  supportLevel: 'full' | 'partial' | 'limited' | "unsupported";
}

export class BrowserCompatibilityService {
  private logger: ExternalLogService;
  private minVersions: Map<string, number>;
  private polyfills: Map<string, string>;
  private featureDetectionCache: Map<string, boolean>;

  constructor() {
    this.logger = new ExternalLogService();
    this.featureDetectionCache = new Map();
    
    // Minimum supported browser versions
    this.minVersions = new Map([
      ['chrome', 90],
      ['firefox', 88],
      ['safari', 14],
      ['edge', 90],
      ['opera', 76],
      ['samsung', 14]
    ]);

    // Polyfill URLs for missing features
    this.polyfills = new Map([
      ['promise', 'https://cdn.jsdelivr.net/npm/promise-polyfill@8/dist/polyfill.min.js'],
      ['fetch', 'https://cdn.jsdelivr.net/npm/whatwg-fetch@3/dist/fetch.umd.js'],
      ['intersection-observer', 'https://cdn.jsdelivr.net/npm/intersection-observer@0.12/intersection-observer.js'],
      ['resize-observer', 'https://cdn.jsdelivr.net/npm/resize-observer-polyfill@1/dist/ResizeObserver.global.js'],
      ['custom-elements', 'https://cdn.jsdelivr.net/npm/@webcomponents/custom-elements@1/custom-elements.min.js'],
      ['object-fit', 'https://cdn.jsdelivr.net/npm/object-fit-images@3/dist/ofi.min.js'],
      ["smoothscroll", 'https://cdn.jsdelivr.net/npm/smoothscroll-polyfill@0.4/dist/smoothscroll.min.js']
    ]);
  }

  /**
   * Parse user agent string to get browser information
   */
  parseBrowserInfo(userAgent: string): BrowserInfo {
    const ua = userAgent.toLowerCase();
    let name = 'unknown';
    let version = '0';
    let engine = 'unknown';
    let platform = 'unknown';
    let mobile = false;

    // Detect mobile
    mobile = /mobile|android|iphone|ipad|phone/i.test(ua);

    // Detect platform
    if (ua.includes('windows')) platform = 'windows';
    else if (ua.includes('mac')) platform = 'macos';
    else if (ua.includes('linux')) platform = 'linux';
    else if (ua.includes('android')) platform = 'android';
    else if (ua.includes('ios') || ua.includes('iphone') || ua.includes('ipad')) platform = 'ios';

    // Detect browser and version
    if (ua.includes('edge/')) {
      name = 'edge';
      version = this.extractVersion(ua, 'edge/');
      engine = 'blink';
    } else if (ua.includes('edg/')) {
      name = 'edge';
      version = this.extractVersion(ua, 'edg/');
      engine = 'blink';
    } else if (ua.includes('chrome/')) {
      name = 'chrome';
      version = this.extractVersion(ua, 'chrome/');
      engine = 'blink';
    } else if (ua.includes('firefox/')) {
      name = 'firefox';
      version = this.extractVersion(ua, 'firefox/');
      engine = 'gecko';
    } else if (ua.includes('safari/') && !ua.includes('chrome')) {
      name = 'safari';
      if (ua.includes('version/')) {
        version = this.extractVersion(ua, 'version/');
      }
      engine = 'webkit';
    } else if (ua.includes('opera/') || ua.includes('opr/')) {
      name = 'opera';
      version = this.extractVersion(ua, ua.includes('opr/') ? 'opr/' : 'opera/');
      engine = 'blink';
    } else if (ua.includes('samsungbrowser/')) {
      name = 'samsung';
      version = this.extractVersion(ua, 'samsungbrowser/');
      engine = 'blink';
    }

    const majorVersion = parseInt(version.split('.')[0]) || 0;

    return {
      name,
      version,
      majorVersion,
      engine,
      platform,
      mobile,
      userAgent
    };
  }

  /**
   * Extract version number from user agent
   */
  private extractVersion(ua: string, pattern: string): string {
    const regex = new RegExp(pattern + '([\\d.]+)');
    const match = ua.match(regex);
    return match ? match[1] : '0';
  }

  /**
   * Detect browser capabilities
   */
  detectCapabilities(): BrowserCapabilities {
    return {
      css: this.detectCSSCapabilities(),
      javascript: this.detectJavaScriptCapabilities(),
      apis: this.detectAPICapabilities(),
      media: this.detectMediaCapabilities()
    };
  }

  /**
   * Detect CSS capabilities
   */
  private detectCSSCapabilities(): BrowserCapabilities['css'] {
    return {
      grid: this.checkCSSSupport('display', 'grid'),
      flexbox: this.checkCSSSupport('display', 'flex'),
      customProperties: this.checkCSSSupport('--test', 'test'),
      transforms3d: this.checkCSSSupport("transform", 'translateZ(0)'),
      animations: this.checkCSSSupport("animation", 'test 1s'),
      filters: this.checkCSSSupport('filter', 'blur(1px)'),
      backdropFilter: this.checkCSSSupport('backdrop-filter', 'blur(1px)'),
      clipPath: this.checkCSSSupport('clip-path', 'circle()'),
      maskImage: this.checkCSSSupport('mask-image', 'url(test)'),
      containerQueries: this.checkCSSSupport('container-type', 'inline-size')
    };
  }

  /**
   * Detect JavaScript capabilities
   */
  private detectJavaScriptCapabilities(): BrowserCapabilities["javascript"] {
    return {
      promises: typeof Promise !== "undefined",
      asyncAwait: this.checkAsyncAwaitSupport(),
      modules: "noModule" in document.createElement('script'),
      webComponents: "customElements" in window,
      serviceWorker: "serviceWorker" in navigator,
      webAssembly: typeof WebAssembly !== "undefined",
      bigInt: typeof BigInt !== "undefined",
      optionalChaining: this.checkOptionalChainingSupport(),
      nullishCoalescing: this.checkNullishCoalescingSupport()
    };
  }

  /**
   * Detect API capabilities
   */
  private detectAPICapabilities(): BrowserCapabilities['apis'] {
    return {
      localStorage: this.checkStorageSupport("localStorage"),
      sessionStorage: this.checkStorageSupport("sessionStorage"),
      indexedDB: "indexedDB" in window,
      webSockets: "WebSocket" in window,
      webRTC: "RTCPeerConnection" in window,
      notifications: "Notification" in window,
      geolocation: "geolocation" in navigator,
      clipboard: "clipboard" in navigator,
      intersectionObserver: "IntersectionObserver" in window,
      resizeObserver: "ResizeObserver" in window,
      mutationObserver: "MutationObserver" in window,
      performanceObserver: "PerformanceObserver" in window
    };
  }

  /**
   * Detect media capabilities
   */
  private detectMediaCapabilities(): BrowserCapabilities['media'] {
    return {
      audio: this.checkMediaSupport('audio'),
      video: this.checkMediaSupport('video'),
      webGL: this.checkWebGLSupport(),
      webGL2: this.checkWebGL2Support(),
      canvas: this.checkCanvasSupport(),
      svg: this.checkSVGSupport(),
      webP: this.checkImageFormatSupport('webp'),
      avif: this.checkImageFormatSupport('avif')
    };
  }

  /**
   * Check CSS support
   */
  private checkCSSSupport(property: string, value: string): boolean {
    const key = `css-${property}-${value}`;
    if (this.featureDetectionCache.has(key)) {
      return this.featureDetectionCache.get(key)!;
    }

    if (typeof document === "undefined") return false;
    
    const element = document.createElement('div');
    const style = element.style as any;
    
    // Check unprefixed
    style[property] = value;
    let supported = style[property] === value;
    
    // Check prefixed versions
    if (!supported) {
      const prefixes = ['webkit', 'moz', 'ms', 'o'];
      for (const prefix of prefixes) {
        const prefixedProp = prefix + property.charAt(0).toUpperCase() + property.slice(1);
        style[prefixedProp] = value;
        if (style[prefixedProp] === value) {
          supported = true;
          break;
        }
      }
    }
    
    this.featureDetectionCache.set(key, supported);
    return supported;
  }

  /**
   * Check async/await support
   */
  private checkAsyncAwaitSupport(): boolean {
    try {
      eval('(async function() {})');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check optional chaining support
   */
  private checkOptionalChainingSupport(): boolean {
    try {
      eval('const obj = {}; obj?.prop');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check nullish coalescing support
   */
  private checkNullishCoalescingSupport(): boolean {
    try {
      eval('null ?? "default"');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check storage support
   */
  private checkStorageSupport(type: "localStorage" | "sessionStorage"): boolean {
    try {
      const storage = window[type];
      const test = '__storage_test__';
      storage.setItem(test, test);
      storage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check media support
   */
  private checkMediaSupport(type: 'audio' | 'video'): boolean {
    if (typeof document === "undefined") return false;
    const element = document.createElement(type);
    return !!element.canPlayType;
  }

  /**
   * Check WebGL support
   */
  private checkWebGLSupport(): boolean {
    if (typeof document === "undefined") return false;
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    return !!gl;
  }

  /**
   * Check WebGL2 support
   */
  private checkWebGL2Support(): boolean {
    if (typeof document === "undefined") return false;
    const canvas = document.createElement('canvas');
    return !!canvas.getContext('webgl2');
  }

  /**
   * Check Canvas support
   */
  private checkCanvasSupport(): boolean {
    if (typeof document === "undefined") return false;
    const canvas = document.createElement('canvas');
    return !!canvas.getContext('2d');
  }

  /**
   * Check SVG support
   */
  private checkSVGSupport(): boolean {
    if (typeof document === "undefined") return false;
    return !!document.createElementNS && 
           !!document.createElementNS('http://www.w3.org/2000/svg', 'svg').createSVGRect;
  }

  /**
   * Check image format support
   */
  private checkImageFormatSupport(format: string): boolean {
    if (typeof document === "undefined") return false;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1;
    const ctx = canvas.getContext('2d');
    if (!ctx) return false;
    
    const dataUrl = canvas.toDataURL(`image/${format}`);
    return dataUrl.indexOf(`image/${format}`) === 5;
  }

  /**
   * Analyze compatibility issues
   */
  analyzeCompatibility(browserInfo: BrowserInfo, capabilities: BrowserCapabilities): CompatibilityIssue[] {
    const issues: CompatibilityIssue[] = [];

    // Check minimum version
    const minVersion = this.minVersions.get(browserInfo.name);
    if (minVersion && browserInfo.majorVersion < minVersion) {
      issues.push({
        feature: 'browser-version',
        severity: "critical",
        browser: browserInfo.name,
        version: browserInfo.version,
        description: `Your browser version is below the minimum supported version (${minVersion})`,
        workaround: 'Please update your browser to the latest version',
        polyfillAvailable: false
      });
    }

    // Check critical CSS features
    if (!capabilities.css.flexbox) {
      issues.push({
        feature: 'css-flexbox',
        severity: "critical",
        browser: browserInfo.name,
        version: browserInfo.version,
        description: 'Flexbox is not supported',
        workaround: 'Use float-based layouts as fallback',
        polyfillAvailable: false
      });
    }

    if (!capabilities.css.grid) {
      issues.push({
        feature: 'css-grid',
        severity: 'warning',
        browser: browserInfo.name,
        version: browserInfo.version,
        description: 'CSS Grid is not supported',
        workaround: 'Fallback to flexbox or table layouts',
        polyfillAvailable: false
      });
    }

    // Check JavaScript features
    if (!capabilities.javascript.promises) {
      issues.push({
        feature: 'js-promises',
        severity: "critical",
        browser: browserInfo.name,
        version: browserInfo.version,
        description: 'JavaScript Promises are not supported',
        polyfillAvailable: true
      });
    }

    if (!capabilities.javascript.webComponents) {
      issues.push({
        feature: 'web-components',
        severity: 'warning',
        browser: browserInfo.name,
        version: browserInfo.version,
        description: 'Web Components are not supported',
        polyfillAvailable: true
      });
    }

    // Check API support
    if (!capabilities.apis.localStorage) {
      issues.push({
        feature: 'local-storage',
        severity: "critical",
        browser: browserInfo.name,
        version: browserInfo.version,
        description: 'LocalStorage is not available',
        workaround: 'Use cookies or memory storage as fallback',
        polyfillAvailable: false
      });
    }

    if (!capabilities.apis.intersectionObserver) {
      issues.push({
        feature: 'intersection-observer',
        severity: 'warning',
        browser: browserInfo.name,
        version: browserInfo.version,
        description: 'IntersectionObserver API is not supported',
        workaround: 'Use scroll event listeners as fallback',
        polyfillAvailable: true
      });
    }

    return issues;
  }

  /**
   * Calculate compatibility score
   */
  calculateCompatibilityScore(capabilities: BrowserCapabilities, issues: CompatibilityIssue[]): number {
    let score = 100;
    
    // Deduct points for missing features
    const criticalIssues = issues.filter(i => i.severity === "critical").length;
    const warningIssues = issues.filter(i => i.severity === 'warning').length;
    
    score -= criticalIssues * 20;
    score -= warningIssues * 5;
    
    // Additional deductions for missing core features
    if (!capabilities.css.flexbox) score -= 10;
    if (!capabilities.javascript.promises) score -= 10;
    if (!capabilities.apis.localStorage) score -= 10;
    
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Determine support level
   */
  determineSupportLevel(score: number): CompatibilityReport["supportLevel"] {
    if (score >= 90) return 'full';
    if (score >= 70) return 'partial';
    if (score >= 50) return 'limited';
    return "unsupported";
  }

  /**
   * Generate compatibility report
   */
  generateReport(userAgent: string): CompatibilityReport {
    const browserInfo = this.parseBrowserInfo(userAgent);
    const capabilities = this.detectCapabilities();
    const issues = this.analyzeCompatibility(browserInfo, capabilities);
    const score = this.calculateCompatibilityScore(capabilities, issues);
    const supportLevel = this.determineSupportLevel(score);

    let recommendation = '';
    if (supportLevel === 'full') {
      recommendation = 'Your browser is fully compatible with all features.';
    } else if (supportLevel === 'partial') {
      recommendation = 'Your browser supports most features. Some enhancements may not be available.';
    } else if (supportLevel === 'limited') {
      recommendation = 'Your browser has limited support. Consider updating for the best experience.';
    } else {
      recommendation = 'Your browser is not supported. Please use a modern browser like Chrome, Firefox, or Safari.';
    }

    const report: CompatibilityReport = {
      timestamp: new Date(),
      browserInfo,
      capabilities,
      issues,
      score,
      recommendation,
      supportLevel
    };

    this.logger.info('Browser compatibility report generated', {
      browser: browserInfo.name,
      version: browserInfo.version,
      score,
      supportLevel
    });

    return report;
  }

  /**
   * Get required polyfills
   */
  getRequiredPolyfills(issues: CompatibilityIssue[]): string[] {
    const polyfillUrls: string[] = [];
    
    for (const issue of issues) {
      if (issue.polyfillAvailable) {
        const polyfillUrl = this.getPolyfillUrl(issue.feature);
        if (polyfillUrl) {
          polyfillUrls.push(polyfillUrl);
        }
      }
    }
    
    return polyfillUrls;
  }

  /**
   * Get polyfill URL for a feature
   */
  private getPolyfillUrl(feature: string): string | undefined {
    // Map feature names to polyfill keys
    const featureMap: Record<string, string> = {
      'js-promises': 'promise',
      'fetch-api': 'fetch',
      'intersection-observer': 'intersection-observer',
      'resize-observer': 'resize-observer',
      'web-components': 'custom-elements'
    };
    
    const polyfillKey = featureMap[feature];
    return polyfillKey ? this.polyfills.get(polyfillKey) : undefined;
  }

  /**
   * Load polyfills dynamically
   */
  async loadPolyfills(polyfillUrls: string[]): Promise<void> {
    const promises = polyfillUrls.map(url => this.loadScript(url));
    await Promise.all(promises);
    this.logger.info('Polyfills loaded successfully', { count: polyfillUrls.length });
  }

  /**
   * Load script dynamically
   */
  private loadScript(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = url;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load script: ${url}`));
      document.head.appendChild(script);
    });
  }

  /**
   * Apply browser-specific fixes
   */
  applyBrowserFixes(browserInfo: BrowserInfo): void {
    // Safari-specific fixes
    if (browserInfo.name === 'safari') {
      this.applySafariFixes();
    }
    
    // Firefox-specific fixes
    if (browserInfo.name === 'firefox') {
      this.applyFirefoxFixes();
    }
    
    // IE/Legacy Edge fixes
    if (browserInfo.name === 'ie' || (browserInfo.name === 'edge' && browserInfo.majorVersion < 79)) {
      this.applyLegacyFixes();
    }
  }

  /**
   * Apply Safari-specific fixes
   */
  private applySafariFixes(): void {
    // Fix Safari's date input
    if (typeof document !== "undefined") {
      const style = document.createElement('style');
      style.textContent = `
        input[type="date"]::-webkit-inner-spin-button,
        input[type="date"]::-webkit-calendar-picker-indicator {
          display: none;
          -webkit-appearance: none;
        }
      `;
      document.head.appendChild(style);
    }
  }

  /**
   * Apply Firefox-specific fixes
   */
  private applyFirefoxFixes(): void {
    // Fix Firefox's number input
    if (typeof document !== "undefined") {
      const style = document.createElement('style');
      style.textContent = `
        input[type="number"] {
          -moz-appearance: textfield;
        }
        input[type="number"]::-webkit-inner-spin-button,
        input[type="number"]::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
      `;
      document.head.appendChild(style);
    }
  }

  /**
   * Apply legacy browser fixes
   */
  private applyLegacyFixes(): void {
    // Add classList polyfill for IE
    if (!("classList" in document.createElement('_'))) {
      this.addClassListPolyfill();
    }
  }

  /**
   * Add classList polyfill
   */
  private addClassListPolyfill(): void {
    // Simplified classList polyfill implementation
    Object.defineProperty(Element.prototype, "classList", {
      get: function() {
        const self = this;
        return {
          add: function(className: string) {
            if (!self.className.includes(className)) {
              self.className += ' ' + className;
            }
          },
          remove: function(className: string) {
            self.className = self.className.replace(new RegExp(className, 'g'), '').trim();
          },
          contains: function(className: string) {
            return self.className.includes(className);
          },
          toggle: function(className: string) {
            if (this.contains(className)) {
              this.remove(className);
            } else {
              this.add(className);
            }
          }
        };
      }
    });
  }
}

// Export singleton instance
export const browserCompatibility = new BrowserCompatibilityService();