/**
 * Unit tests for EmbeddedAppManager
 */

import { EmbeddedAppManager, EmbeddedAppConfig } from '../../children/EmbeddedAppManager';
import { EmbeddedAppTester } from '../../children/EmbeddedAppTester';

describe("EmbeddedAppManager", () => {
  let manager: EmbeddedAppManager;
  let config: EmbeddedAppConfig;

  beforeEach(() => {
    config = {
      appName: 'TestApp',
      parentUrl: 'http://localhost:3000',
      embeddedUrl: 'http://localhost:3001',
      iframeId: 'test-iframe',
      sandboxAttributes: ['allow-scripts', 'allow-same-origin'],
      allowedOrigins: ['http://localhost:3001']
    };
    
    // Mock window object for Node.js environment
    global.window = {
      location: { href: 'http://localhost:3000' },
      addEventListener: jest.fn(),
      self: {},
      top: {},
      parent: {}
    } as any;
    
    global.document = {
      getElementById: jest.fn(),
      createElement: jest.fn(() => ({
        style: {},
        sandbox: { value: '' }
      })),
      body: {
        scrollWidth: 800,
        scrollHeight: 600,
        requestPointerLock: jest.fn()
      }
    } as any;

    manager = new EmbeddedAppManager(config);
  });

  afterEach(() => {
    delete global.window;
    delete global.document;
  });

  describe("constructor", () => {
    it('should initialize with provided config', () => {
      expect(manager).toBeDefined();
    });

    it('should setup message handling if window exists', () => {
      expect(window.addEventListener).toHaveBeenCalledWith('message', expect.any(Function));
    });
  });

  describe("onMessage", () => {
    it('should register message handlers', () => {
      const handler = jest.fn();
      manager.onMessage('test-message', handler);
      
      // Simulate message event
      const messageEvent = new MessageEvent('message', {
        data: { type: 'test-message', payload: 'test' },
        origin: 'http://localhost:3001'
      });
      
      // Get the registered event listener
      const eventListener = (window.addEventListener as jest.Mock).mock.calls[0][1];
      eventListener(messageEvent);
      
      expect(handler).toHaveBeenCalledWith('test', 'http://localhost:3001');
    });

    it('should reject messages from unauthorized origins', () => {
      const handler = jest.fn();
      manager.onMessage('test-message', handler);
      
      const messageEvent = new MessageEvent('message', {
        data: { type: 'test-message', payload: 'test' },
        origin: 'http://evil.com'
      });
      
      const eventListener = (window.addEventListener as jest.Mock).mock.calls[0][1];
      eventListener(messageEvent);
      
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('static methods', () => {
    describe("isEmbedded", () => {
      it('should return false when not in iframe', () => {
        global.window.self = global.window.top;
        expect(EmbeddedAppManager.isEmbedded()).toBe(false);
      });

      it('should return true when in iframe', () => {
        global.window.self = {};
        global.window.top = { different: true } as any;
        expect(EmbeddedAppManager.isEmbedded()).toBe(true);
      });

      it('should return false when window is undefined', () => {
        const originalWindow = global.window;
        delete global.window;
        expect(EmbeddedAppManager.isEmbedded()).toBe(false);
        global.window = originalWindow;
      });
    });

    describe("getParentWindow", () => {
      it('should return null when not embedded', () => {
        global.window.self = global.window.top;
        expect(EmbeddedAppManager.getParentWindow()).toBeNull();
      });

      it('should return parent window when embedded', () => {
        global.window.self = {};
        global.window.top = { different: true } as any;
        global.window.parent = { isParent: true } as any;
        expect(EmbeddedAppManager.getParentWindow()).toEqual({ isParent: true });
      });
    });
  });

  describe("embedApp", () => {
    it('should throw error when called from child', () => {
      // Make it think it's a child
      global.window.location.href = 'http://localhost:3001';
      const childManager = new EmbeddedAppManager(config);
      
      expect(() => childManager.embedApp("container")).toThrow(
        'embedApp can only be called from parent application'
      );
    });

    it('should throw error when container not found', () => {
      (document.getElementById as jest.Mock).mockReturnValue(null);
      
      expect(() => manager.embedApp('non-existent')).toThrow(
        'Container element non-existent not found'
      );
    });

    it('should create and append iframe when container exists', () => {
      const mockContainer = {
        appendChild: jest.fn()
      };
      const mockIframe = {
        style: {},
        sandbox: { value: '' }
      };
      
      (document.getElementById as jest.Mock).mockReturnValue(mockContainer);
      (document.createElement as jest.Mock).mockReturnValue(mockIframe);
      
      const iframe = manager.embedApp("container");
      
      expect(document.createElement).toHaveBeenCalledWith('iframe');
      expect(mockIframe.src).toBe('http://localhost:3001');
      expect(mockIframe.id).toBe('test-iframe');
      expect(mockIframe.sandbox.value).toBe('allow-scripts allow-same-origin');
      expect(mockContainer.appendChild).toHaveBeenCalledWith(mockIframe);
      expect(iframe).toBe(mockIframe);
    });
  });

  describe("sendMessage", () => {
    it('should send message from parent to child iframe', () => {
      const mockIframe = {
        contentWindow: {
          postMessage: jest.fn()
        }
      };
      
      // Setup as parent with iframe
      manager['iframe'] = mockIframe as any;
      manager["isParent"] = true;
      
      manager.sendMessage('test', { data: 'value' });
      
      expect(mockIframe.contentWindow.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'test',
          payload: { data: 'value' },
          source: 'TestApp'
        }),
        'http://localhost:3001'
      );
    });

    it('should send message from child to parent', () => {
      global.window.parent = {
        postMessage: jest.fn()
      } as any;
      
      // Setup as child
      manager["isParent"] = false;
      
      manager.sendMessage('test', { data: 'value' });
      
      expect(global.window.parent.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'test',
          payload: { data: 'value' },
          source: 'TestApp'
        }),
        'http://localhost:3000'
      );
    });
  });
});

describe("EmbeddedAppTester", () => {
  let manager: EmbeddedAppManager;
  let tester: EmbeddedAppTester;
  let config: EmbeddedAppConfig;

  beforeEach(() => {
    config = {
      appName: 'TestApp',
      parentUrl: 'http://localhost:3000',
      embeddedUrl: 'http://localhost:3001'
    };

    global.window = {
      location: { href: 'http://localhost:3000' },
      addEventListener: jest.fn(),
      self: {},
      top: {},
      open: jest.fn()
    } as any;
    
    global.document = {
      createElement: jest.fn(() => ({
        submit: jest.fn()
      })),
      body: {
        scrollWidth: 800,
        scrollHeight: 600,
        requestPointerLock: jest.fn()
      },
      addEventListener: jest.fn()
    } as any;

    manager = new EmbeddedAppManager(config);
    tester = new EmbeddedAppTester(manager);
  });

  afterEach(() => {
    delete global.window;
    delete global.document;
  });

  describe("testCommunication", () => {
    it('should resolve true when ping response received', async () => {
      // Mock the message handling
      jest.spyOn(manager, "onMessage").mockImplementation((type, handler) => {
        if (type === 'ping-response') {
          // Simulate immediate response
          setTimeout(() => handler({ id: expect.any(String) }, 'http://localhost:3001'), 10);
        }
      });
      
      jest.spyOn(manager, "sendMessage").mockImplementation(() => {});
      
      const result = await tester.testCommunication();
      expect(result).toBe(true);
      expect(manager.sendMessage).toHaveBeenCalledWith('ping', expect.objectContaining({ id: expect.any(String) }));
    });

    it('should resolve false on timeout', async () => {
      jest.spyOn(manager, "onMessage").mockImplementation(() => {});
      jest.spyOn(manager, "sendMessage").mockImplementation(() => {});
      
      const result = await Promise.race([
        tester.testCommunication(),
        new Promise(resolve => setTimeout(() => resolve(false), 100))
      ]);
      
      expect(result).toBe(false);
    });
  });

  describe("testSandboxRestrictions", () => {
    it('should test various sandbox restrictions', () => {
      const results = tester.testSandboxRestrictions();
      
      expect(results).toHaveProperty('scripts');
      expect(results).toHaveProperty('forms');
      expect(results).toHaveProperty('popups');
      expect(results).toHaveProperty("pointerLock");
      expect(results).toHaveProperty("sameOrigin");
    });

    it('should return empty object when document is undefined', () => {
      delete global.document;
      const results = tester.testSandboxRestrictions();
      expect(results).toEqual({});
    });
  });

  describe("testResponsiveBehavior", () => {
    it('should send resize messages for different viewport sizes', () => {
      jest.spyOn(manager, "sendMessage").mockImplementation(() => {});
      
      tester.testResponsiveBehavior();
      
      expect(manager.sendMessage).toHaveBeenCalledTimes(3);
      expect(manager.sendMessage).toHaveBeenCalledWith('test-resize', { width: 320, height: 568 });
      expect(manager.sendMessage).toHaveBeenCalledWith('test-resize', { width: 768, height: 1024 });
      expect(manager.sendMessage).toHaveBeenCalledWith('test-resize', { width: 1920, height: 1080 });
    });
  });

  describe("testEventPropagation", () => {
    it('should setup event listeners for propagation testing', () => {
      jest.spyOn(manager, "sendMessage").mockImplementation(() => {});
      
      tester.testEventPropagation();
      
      expect(document.addEventListener).toHaveBeenCalledTimes(4);
      expect(document.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
      expect(document.addEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
      expect(document.addEventListener).toHaveBeenCalledWith('scroll', expect.any(Function));
      expect(document.addEventListener).toHaveBeenCalledWith('resize', expect.any(Function));
    });

    it('should not setup listeners when document is undefined', () => {
      delete global.document;
      expect(() => tester.testEventPropagation()).not.toThrow();
    });
  });
});