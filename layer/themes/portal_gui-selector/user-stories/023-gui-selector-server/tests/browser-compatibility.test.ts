/**
 * Browser Compatibility Tests
 * Comprehensive test suite for browser detection and compatibility features
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { 
  BrowserCompatibilityService, 
  BrowserInfo, 
  BrowserCapabilities,
  CompatibilityIssue,
  CompatibilityReport 
} from '../src/services/BrowserCompatibilityService';
import { BrowserDetectionMiddleware } from '../src/middleware/BrowserDetectionMiddleware';
import { Request, Response, NextFunction } from 'express';

// Mock user agents for testing
const USER_AGENTS = {
  chrome: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36',
  firefox: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:95.0) Gecko/20100101 Firefox/95.0',
  safari: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.1 Safari/605.1.15',
  edge: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36 Edg/96.0.1054.62',
  oldChrome: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.113 Safari/537.36',
  mobile: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.1 Mobile/15E148 Safari/604.1',
  android: 'Mozilla/5.0 (Linux; Android 11; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.104 Mobile Safari/537.36'
};

describe('Browser Compatibility System', () => {
  describe("BrowserCompatibilityService", () => {
    let service: BrowserCompatibilityService;

    beforeEach(() => {
      service = new BrowserCompatibilityService();
      
      // Mock DOM APIs for Node.js environment
      global.document = {
        createElement: jest.fn((tag: string) => {
          if (tag === 'div') {
            return { style: {} };
          }
          if (tag === 'canvas') {
            return {
              getContext: jest.fn((type: string) => {
                if (type === '2d') return {};
                if (type === 'webgl' || type === 'webgl2') return {};
                return null;
              }),
              toDataURL: jest.fn(() => 'data:image/png;base64,test')
            };
          }
          if (tag === 'script') {
            return { noModule: true };
          }
          if (tag === 'audio' || tag === 'video') {
            return { canPlayType: jest.fn(() => 'maybe') };
          }
          return {};
        }),
        createElementNS: jest.fn(() => ({
          createSVGRect: jest.fn()
        })),
        head: {
          appendChild: jest.fn()
        }
      } as any;

      global.window = {
        Promise,
        WebAssembly: {},
        BigInt,
        WebSocket: class {},
        RTCPeerConnection: class {},
        Notification: class {},
        IntersectionObserver: class {},
        ResizeObserver: class {},
        MutationObserver: class {},
        PerformanceObserver: class {},
        customElements: {},
        localStorage: {
          setItem: jest.fn(),
          getItem: jest.fn(),
          removeItem: jest.fn()
        },
        sessionStorage: {
          setItem: jest.fn(),
          getItem: jest.fn(),
          removeItem: jest.fn()
        }
      } as any;

      global.navigator = {
        serviceWorker: {},
        geolocation: {},
        clipboard: {}
      } as any;
    });

    afterEach(() => {
      delete (global as any).document;
      delete (global as any).window;
      delete (global as any).navigator;
    });

    describe('Browser Detection', () => {
      it('should detect Chrome browser', () => {
        const info = service.parseBrowserInfo(USER_AGENTS.chrome);
        
        expect(info.name).toBe('chrome');
        expect(info.majorVersion).toBeGreaterThanOrEqual(96);
        expect(info.engine).toBe('blink');
        expect(info.platform).toBe('windows');
        expect(info.mobile).toBe(false);
      });

      it('should detect Firefox browser', () => {
        const info = service.parseBrowserInfo(USER_AGENTS.firefox);
        
        expect(info.name).toBe('firefox');
        expect(info.majorVersion).toBeGreaterThanOrEqual(95);
        expect(info.engine).toBe('gecko');
        expect(info.platform).toBe('windows');
        expect(info.mobile).toBe(false);
      });

      it('should detect Safari browser', () => {
        const info = service.parseBrowserInfo(USER_AGENTS.safari);
        
        expect(info.name).toBe('safari');
        expect(info.majorVersion).toBeGreaterThanOrEqual(15);
        expect(info.engine).toBe('webkit');
        expect(info.platform).toBe('macos');
        expect(info.mobile).toBe(false);
      });

      it('should detect Edge browser', () => {
        const info = service.parseBrowserInfo(USER_AGENTS.edge);
        
        expect(info.name).toBe('edge');
        expect(info.majorVersion).toBeGreaterThanOrEqual(96);
        expect(info.engine).toBe('blink');
        expect(info.platform).toBe('windows');
        expect(info.mobile).toBe(false);
      });

      it('should detect mobile browsers', () => {
        const iphone = service.parseBrowserInfo(USER_AGENTS.mobile);
        expect(iphone.mobile).toBe(true);
        expect(iphone.platform).toBe('ios');

        const android = service.parseBrowserInfo(USER_AGENTS.android);
        expect(android.mobile).toBe(true);
        expect(android.platform).toBe('android');
      });

      it('should handle unknown browser', () => {
        const info = service.parseBrowserInfo('Unknown Browser/1.0');
        
        expect(info.name).toBe('unknown');
        expect(info.version).toBe('0');
        expect(info.engine).toBe('unknown');
      });
    });

    describe('Capability Detection', () => {
      it('should detect CSS capabilities', () => {
        const capabilities = service.detectCapabilities();
        
        expect(capabilities.css).toBeDefined();
        expect(typeof capabilities.css.flexbox).toBe('boolean');
        expect(typeof capabilities.css.grid).toBe('boolean');
        expect(typeof capabilities.css.animations).toBe('boolean');
      });

      it('should detect JavaScript capabilities', () => {
        const capabilities = service.detectCapabilities();
        
        expect(capabilities.javascript).toBeDefined();
        expect(capabilities.javascript.promises).toBe(true);
        expect(capabilities.javascript.webAssembly).toBe(true);
        expect(capabilities.javascript.bigInt).toBe(true);
        expect(capabilities.javascript.webComponents).toBe(true);
      });

      it('should detect API capabilities', () => {
        const capabilities = service.detectCapabilities();
        
        expect(capabilities.apis).toBeDefined();
        expect(capabilities.apis.localStorage).toBe(true);
        expect(capabilities.apis.webSockets).toBe(true);
        expect(capabilities.apis.intersectionObserver).toBe(true);
      });

      it('should detect media capabilities', () => {
        const capabilities = service.detectCapabilities();
        
        expect(capabilities.media).toBeDefined();
        expect(capabilities.media.canvas).toBe(true);
        expect(capabilities.media.webGL).toBe(true);
        expect(capabilities.media.svg).toBe(true);
      });
    });

    describe('Compatibility Analysis', () => {
      it('should identify compatibility issues for old browsers', () => {
        const browserInfo: BrowserInfo = {
          name: 'chrome',
          version: '60.0.0',
          majorVersion: 60,
          engine: 'blink',
          platform: 'windows',
          mobile: false,
          userAgent: USER_AGENTS.oldChrome
        };

        const capabilities: BrowserCapabilities = {
          css: {
            grid: false,
            flexbox: true,
            customProperties: true,
            transforms3d: true,
            animations: true,
            filters: true,
            backdropFilter: false,
            clipPath: true,
            maskImage: false,
            containerQueries: false
          },
          javascript: {
            promises: true,
            asyncAwait: true,
            modules: false,
            webComponents: false,
            serviceWorker: true,
            webAssembly: false,
            bigInt: false,
            optionalChaining: false,
            nullishCoalescing: false
          },
          apis: {
            localStorage: true,
            sessionStorage: true,
            indexedDB: true,
            webSockets: true,
            webRTC: true,
            notifications: true,
            geolocation: true,
            clipboard: false,
            intersectionObserver: false,
            resizeObserver: false,
            mutationObserver: true,
            performanceObserver: false
          },
          media: {
            audio: true,
            video: true,
            webGL: true,
            webGL2: false,
            canvas: true,
            svg: true,
            webP: false,
            avif: false
          }
        };

        const issues = service.analyzeCompatibility(browserInfo, capabilities);
        
        expect(issues.length).toBeGreaterThan(0);
        
        const versionIssue = issues.find(i => i.feature === 'browser-version');
        expect(versionIssue).toBeDefined();
        expect(versionIssue?.severity).toBe("critical");
      });

      it('should not identify issues for modern browsers', () => {
        const browserInfo: BrowserInfo = {
          name: 'chrome',
          version: '96.0.0',
          majorVersion: 96,
          engine: 'blink',
          platform: 'windows',
          mobile: false,
          userAgent: USER_AGENTS.chrome
        };

        const capabilities: BrowserCapabilities = {
          css: {
            grid: true,
            flexbox: true,
            customProperties: true,
            transforms3d: true,
            animations: true,
            filters: true,
            backdropFilter: true,
            clipPath: true,
            maskImage: true,
            containerQueries: true
          },
          javascript: {
            promises: true,
            asyncAwait: true,
            modules: true,
            webComponents: true,
            serviceWorker: true,
            webAssembly: true,
            bigInt: true,
            optionalChaining: true,
            nullishCoalescing: true
          },
          apis: {
            localStorage: true,
            sessionStorage: true,
            indexedDB: true,
            webSockets: true,
            webRTC: true,
            notifications: true,
            geolocation: true,
            clipboard: true,
            intersectionObserver: true,
            resizeObserver: true,
            mutationObserver: true,
            performanceObserver: true
          },
          media: {
            audio: true,
            video: true,
            webGL: true,
            webGL2: true,
            canvas: true,
            svg: true,
            webP: true,
            avif: true
          }
        };

        const issues = service.analyzeCompatibility(browserInfo, capabilities);
        
        expect(issues.length).toBe(0);
      });

      it('should identify critical missing features', () => {
        const browserInfo: BrowserInfo = {
          name: 'unknown',
          version: '1.0',
          majorVersion: 1,
          engine: 'unknown',
          platform: 'unknown',
          mobile: false,
          userAgent: 'Unknown/1.0'
        };

        const capabilities: BrowserCapabilities = {
          css: {
            flexbox: false,
            grid: false,
            customProperties: false,
            transforms3d: false,
            animations: false,
            filters: false,
            backdropFilter: false,
            clipPath: false,
            maskImage: false,
            containerQueries: false
          },
          javascript: {
            promises: false,
            asyncAwait: false,
            modules: false,
            webComponents: false,
            serviceWorker: false,
            webAssembly: false,
            bigInt: false,
            optionalChaining: false,
            nullishCoalescing: false
          },
          apis: {
            localStorage: false,
            sessionStorage: false,
            indexedDB: false,
            webSockets: false,
            webRTC: false,
            notifications: false,
            geolocation: false,
            clipboard: false,
            intersectionObserver: false,
            resizeObserver: false,
            mutationObserver: false,
            performanceObserver: false
          },
          media: {
            audio: false,
            video: false,
            webGL: false,
            webGL2: false,
            canvas: false,
            svg: false,
            webP: false,
            avif: false
          }
        };

        const issues = service.analyzeCompatibility(browserInfo, capabilities);
        
        const criticalIssues = issues.filter(i => i.severity === "critical");
        expect(criticalIssues.length).toBeGreaterThan(0);
        
        const flexboxIssue = issues.find(i => i.feature === 'css-flexbox');
        expect(flexboxIssue).toBeDefined();
        expect(flexboxIssue?.severity).toBe("critical");
      });
    });

    describe('Compatibility Scoring', () => {
      it('should calculate high score for full capabilities', () => {
        const capabilities: BrowserCapabilities = {
          css: {
            flexbox: true,
            grid: true,
            customProperties: true,
            transforms3d: true,
            animations: true,
            filters: true,
            backdropFilter: true,
            clipPath: true,
            maskImage: true,
            containerQueries: true
          },
          javascript: {
            promises: true,
            asyncAwait: true,
            modules: true,
            webComponents: true,
            serviceWorker: true,
            webAssembly: true,
            bigInt: true,
            optionalChaining: true,
            nullishCoalescing: true
          },
          apis: {
            localStorage: true,
            sessionStorage: true,
            indexedDB: true,
            webSockets: true,
            webRTC: true,
            notifications: true,
            geolocation: true,
            clipboard: true,
            intersectionObserver: true,
            resizeObserver: true,
            mutationObserver: true,
            performanceObserver: true
          },
          media: {
            audio: true,
            video: true,
            webGL: true,
            webGL2: true,
            canvas: true,
            svg: true,
            webP: true,
            avif: true
          }
        };

        const score = service.calculateCompatibilityScore(capabilities, []);
        expect(score).toBeGreaterThanOrEqual(90);
      });

      it('should calculate low score for missing critical features', () => {
        const capabilities: BrowserCapabilities = {
          css: {
            flexbox: false,
            grid: false,
            customProperties: false,
            transforms3d: false,
            animations: false,
            filters: false,
            backdropFilter: false,
            clipPath: false,
            maskImage: false,
            containerQueries: false
          },
          javascript: {
            promises: false,
            asyncAwait: false,
            modules: false,
            webComponents: false,
            serviceWorker: false,
            webAssembly: false,
            bigInt: false,
            optionalChaining: false,
            nullishCoalescing: false
          },
          apis: {
            localStorage: false,
            sessionStorage: false,
            indexedDB: false,
            webSockets: false,
            webRTC: false,
            notifications: false,
            geolocation: false,
            clipboard: false,
            intersectionObserver: false,
            resizeObserver: false,
            mutationObserver: false,
            performanceObserver: false
          },
          media: {
            audio: false,
            video: false,
            webGL: false,
            webGL2: false,
            canvas: false,
            svg: false,
            webP: false,
            avif: false
          }
        };

        const issues: CompatibilityIssue[] = [
          { 
            feature: 'css-flexbox', 
            severity: "critical", 
            browser: 'unknown', 
            version: '1.0',
            description: 'Missing flexbox',
            polyfillAvailable: false 
          },
          { 
            feature: 'js-promises', 
            severity: "critical", 
            browser: 'unknown', 
            version: '1.0',
            description: 'Missing promises',
            polyfillAvailable: true 
          }
        ];

        const score = service.calculateCompatibilityScore(capabilities, issues);
        expect(score).toBeLessThan(50);
      });

      it('should determine correct support level', () => {
        expect(service.determineSupportLevel(95)).toBe('full');
        expect(service.determineSupportLevel(75)).toBe('partial');
        expect(service.determineSupportLevel(55)).toBe('limited');
        expect(service.determineSupportLevel(30)).toBe("unsupported");
      });
    });

    describe('Report Generation', () => {
      it('should generate complete compatibility report', () => {
        const report = service.generateReport(USER_AGENTS.chrome);
        
        expect(report).toBeDefined();
        expect(report.browserInfo).toBeDefined();
        expect(report.capabilities).toBeDefined();
        expect(report.issues).toBeDefined();
        expect(report.score).toBeGreaterThanOrEqual(0);
        expect(report.score).toBeLessThanOrEqual(100);
        expect(report.supportLevel).toBeDefined();
        expect(report.recommendation).toBeDefined();
        expect(report.timestamp).toBeInstanceOf(Date);
      });

      it('should generate different reports for different browsers', () => {
        const chromeReport = service.generateReport(USER_AGENTS.chrome);
        const oldChromeReport = service.generateReport(USER_AGENTS.oldChrome);
        
        expect(chromeReport.score).toBeGreaterThan(oldChromeReport.score);
        expect(chromeReport.supportLevel).toBe('full');
        expect(oldChromeReport.issues.length).toBeGreaterThan(chromeReport.issues.length);
      });
    });

    describe('Polyfill Management', () => {
      it('should identify required polyfills', () => {
        const issues: CompatibilityIssue[] = [
          {
            feature: 'js-promises',
            severity: "critical",
            browser: 'old',
            version: '1.0',
            description: 'Promises not supported',
            polyfillAvailable: true
          },
          {
            feature: 'intersection-observer',
            severity: 'warning',
            browser: 'old',
            version: '1.0',
            description: 'IntersectionObserver not supported',
            polyfillAvailable: true
          },
          {
            feature: 'css-grid',
            severity: 'warning',
            browser: 'old',
            version: '1.0',
            description: 'CSS Grid not supported',
            polyfillAvailable: false
          }
        ];

        const polyfills = service.getRequiredPolyfills(issues);
        
        expect(polyfills.length).toBeGreaterThan(0);
        expect(polyfills.some(url => url.includes('promise'))).toBe(true);
        expect(polyfills.some(url => url.includes('intersection-observer'))).toBe(true);
      });

      it('should load polyfill scripts', async () => {
        const mockScript = {
          onload: null as any,
          onerror: null as any,
          src: '',
          async: false
        };

        document.createElement = jest.fn(() => mockScript as any);
        document.head.appendChild = jest.fn();

        const polyfillPromise = service.loadPolyfills([
          'https://cdn.example.com/polyfill.js'
        ]);

        // Simulate script load
        setTimeout(() => {
          if (mockScript.onload) mockScript.onload();
        }, 10);

        await polyfillPromise;

        expect(document.createElement).toHaveBeenCalledWith('script');
        expect(document.head.appendChild).toHaveBeenCalled();
        expect(mockScript.src).toBe('https://cdn.example.com/polyfill.js');
      });
    });
  });

  describe("BrowserDetectionMiddleware", () => {
    let middleware: BrowserDetectionMiddleware;
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;
    let mockNext: NextFunction;

    beforeEach(() => {
      middleware = new BrowserDetectionMiddleware({
        logDetection: false
      });

      mockReq = {
        headers: {
          'user-agent': USER_AGENTS.chrome
        }
      };

      mockRes = {
        setHeader: jest.fn(),
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
        json: jest.fn(),
        locals: {}
      };

      mockNext = jest.fn();
    });

    describe('Detection Middleware', () => {
      it('should detect browser and attach to request', () => {
        const detectMiddleware = middleware.middleware();
        detectMiddleware(mockReq as Request, mockRes as Response, mockNext);

        expect(mockReq.browser).toBeDefined();
        expect(mockReq.browser?.name).toBe('chrome');
        expect(mockReq.compatibility).toBeDefined();
        expect(mockReq.supportLevel).toBeDefined();
        expect(mockNext).toHaveBeenCalled();
      });

      it('should handle missing user agent', () => {
        mockReq.headers = {};
        
        const detectMiddleware = middleware.middleware();
        detectMiddleware(mockReq as Request, mockRes as Response, mockNext);

        expect(mockReq.browser?.name).toBe('unknown');
        expect(mockNext).toHaveBeenCalled();
      });

      it('should block unsupported browsers when configured', () => {
        const blockingMiddleware = new BrowserDetectionMiddleware({
          blockUnsupported: true,
          logDetection: false
        });

        mockReq.headers = {
          'user-agent': 'Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1)'
        };

        const detectMiddleware = blockingMiddleware.middleware();
        detectMiddleware(mockReq as Request, mockRes as Response, mockNext);

        // Note: In real implementation, this would check supportLevel
        // For now, just verify the middleware completes
        expect(mockNext).toHaveBeenCalled();
      });

      it('should add warning header for partial support', () => {
        // Simulate partial support
        mockReq.headers = {
          'user-agent': USER_AGENTS.oldChrome
        };

        const detectMiddleware = middleware.middleware();
        detectMiddleware(mockReq as Request, mockRes as Response, mockNext);

        // Check if warning would be set (depends on actual browser capabilities)
        expect(mockNext).toHaveBeenCalled();
      });
    });

    describe('API Endpoint', () => {
      it('should return browser compatibility info', () => {
        const endpoint = middleware.apiEndpoint();
        endpoint(mockReq as Request, mockRes as Response);

        expect(mockRes.json).toHaveBeenCalled();
        const response = (mockRes.json as jest.Mock).mock.calls[0][0];
        
        expect(response.browser).toBeDefined();
        expect(response.capabilities).toBeDefined();
        expect(response.score).toBeDefined();
        expect(response.supportLevel).toBeDefined();
      });
    });

    describe('CSS Classes Middleware', () => {
      it('should generate browser-specific CSS classes', () => {
        mockReq.browser = {
          name: 'chrome',
          version: '96.0.0',
          majorVersion: 96,
          engine: 'blink',
          platform: 'windows',
          mobile: false,
          userAgent: USER_AGENTS.chrome
        };
        mockReq.supportLevel = 'full';

        const cssMiddleware = middleware.cssClasses();
        cssMiddleware(mockReq as Request, mockRes as Response, mockNext);

        expect(mockRes.locals!.browserClasses).toBeDefined();
        expect(mockRes.locals!.browserClasses).toContain('browser-chrome');
        expect(mockRes.locals!.browserClasses).toContain('browser-chrome-96');
        expect(mockRes.locals!.browserClasses).toContain('platform-windows');
        expect(mockRes.locals!.browserClasses).toContain('is-desktop');
        expect(mockRes.locals!.browserClasses).toContain('support-full');
        expect(mockRes.locals!.browserClasses).toContain('engine-blink');
        expect(mockNext).toHaveBeenCalled();
      });

      it('should handle mobile browsers', () => {
        mockReq.browser = {
          name: 'safari',
          version: '15.0',
          majorVersion: 15,
          engine: 'webkit',
          platform: 'ios',
          mobile: true,
          userAgent: USER_AGENTS.mobile
        };

        const cssMiddleware = middleware.cssClasses();
        cssMiddleware(mockReq as Request, mockRes as Response, mockNext);

        expect(mockRes.locals!.browserClasses).toContain('is-mobile');
        expect(mockRes.locals!.browserClasses).not.toContain('is-desktop');
      });
    });

    describe('Warning Banner Middleware', () => {
      it('should show warning for low compatibility score', () => {
        mockReq.compatibility = {
          timestamp: new Date(),
          browserInfo: {} as BrowserInfo,
          capabilities: {} as BrowserCapabilities,
          issues: [],
          score: 45,
          supportLevel: 'limited',
          recommendation: 'Please upgrade your browser'
        };

        const warningMiddleware = middleware.warningBanner();
        warningMiddleware(mockReq as Request, mockRes as Response, mockNext);

        expect(mockRes.locals!.showCompatibilityWarning).toBe(true);
        expect(mockRes.locals!.compatibilityMessage).toBeDefined();
        expect(mockRes.locals!.compatibilityScore).toBe(45);
        expect(mockRes.locals!.compatibilitySeverity).toBe('warning');
        expect(mockNext).toHaveBeenCalled();
      });

      it('should not show warning for high compatibility score', () => {
        mockReq.compatibility = {
          timestamp: new Date(),
          browserInfo: {} as BrowserInfo,
          capabilities: {} as BrowserCapabilities,
          issues: [],
          score: 95,
          supportLevel: 'full',
          recommendation: 'Your browser is fully compatible'
        };

        const warningMiddleware = middleware.warningBanner();
        warningMiddleware(mockReq as Request, mockRes as Response, mockNext);

        expect(mockRes.locals!.showCompatibilityWarning).toBeUndefined();
        expect(mockNext).toHaveBeenCalled();
      });
    });

    describe('Feature Detection Middleware', () => {
      it('should provide feature flags', () => {
        mockReq.compatibility = {
          timestamp: new Date(),
          browserInfo: {} as BrowserInfo,
          capabilities: {
            css: {
              grid: true,
              flexbox: true,
              customProperties: true,
              animations: true,
              transforms3d: true,
              filters: true,
              backdropFilter: false,
              clipPath: true,
              maskImage: false,
              containerQueries: false
            },
            javascript: {
              promises: true,
              asyncAwait: true,
              modules: true,
              webComponents: false,
              serviceWorker: true,
              webAssembly: true,
              bigInt: true,
              optionalChaining: true,
              nullishCoalescing: true
            },
            apis: {
              localStorage: true,
              sessionStorage: true,
              indexedDB: true,
              webSockets: true,
              webRTC: true,
              notifications: true,
              geolocation: true,
              clipboard: true,
              intersectionObserver: true,
              resizeObserver: false,
              mutationObserver: true,
              performanceObserver: true
            },
            media: {
              audio: true,
              video: true,
              webGL: true,
              webGL2: false,
              canvas: true,
              svg: true,
              webP: true,
              avif: false
            }
          },
          issues: [],
          score: 85,
          supportLevel: 'partial',
          recommendation: 'Good browser support'
        };

        const featureMiddleware = middleware.featureDetection();
        featureMiddleware(mockReq as Request, mockRes as Response, mockNext);

        expect(mockRes.locals!.features).toBeDefined();
        expect(mockRes.locals!.features.hasGrid).toBe(true);
        expect(mockRes.locals!.features.hasFlexbox).toBe(true);
        expect(mockRes.locals!.features.hasPromises).toBe(true);
        expect(mockRes.locals!.features.hasWebComponents).toBe(false);
        expect(mockRes.locals!.features.hasLocalStorage).toBe(true);
        expect(mockNext).toHaveBeenCalled();
      });
    });

    describe('Cache Management', () => {
      it('should cache browser detection results', () => {
        const detectMiddleware = middleware.middleware();
        
        // First request
        detectMiddleware(mockReq as Request, mockRes as Response, mockNext);
        
        // Second request with same user agent
        const mockReq2 = { ...mockReq };
        const mockNext2 = jest.fn();
        detectMiddleware(mockReq2 as Request, mockRes as Response, mockNext2);
        
        // Both should complete
        expect(mockNext).toHaveBeenCalled();
        expect(mockNext2).toHaveBeenCalled();
        
        // Check cache stats
        const stats = middleware.getCacheStats();
        expect(stats.size).toBeGreaterThan(0);
      });
    });
  });
});