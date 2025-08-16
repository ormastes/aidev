import { EmbeddedAppManager, EmbeddedAppConfig, MessageProtocol } from '../../index';

describe('EmbeddedAppManager', () => {
  let manager: EmbeddedAppManager;
  let config: EmbeddedAppConfig;
  let originalLocation: Location;
  let mockAddEventListener: jest.Mock;
  let mockRemoveEventListener: jest.Mock;
  let mockPostMessage: jest.Mock;

  beforeEach(() => {
    // Save original location
    originalLocation = window.location;
    
    // Mock window.location
    delete (window as any).location;
    (window as any).location = {
      href: 'http://parent.example.com/app',
      origin: 'http://parent.example.com'
    };

    // Mock window event listeners
    mockAddEventListener = jest.fn();
    mockRemoveEventListener = jest.fn();
    window.addEventListener = mockAddEventListener;
    window.removeEventListener = mockRemoveEventListener;

    // Mock postMessage
    mockPostMessage = jest.fn();
    window.postMessage = mockPostMessage;

    // Create test config
    config = {
      appName: 'TestApp',
      parentUrl: 'parent.example.com',
      embeddedUrl: 'embedded.example.com',
      iframeId: 'test-iframe',
      sandboxAttributes: ['allow-scripts', 'allow-same-origin'],
      allowedOrigins: ['http://embedded.example.com', 'http://parent.example.com'],
      messageProtocol: {
        version: '1.0',
        commands: {
          ping: {
            request: { type: 'ping' },
            response: { type: 'pong' }
          },
          getData: {
            request: { type: 'getData', key: 'string' },
            response: { type: 'data', value: 'any' }
          }
        }
      }
    };
  });

  afterEach(() => {
    // Restore original location
    (window as any).location = originalLocation;
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with config', () => {
      manager = new EmbeddedAppManager(config);
      expect(manager).toBeInstanceOf(EmbeddedAppManager);
    });

    it('should detect parent context when URL matches parentUrl', () => {
      window.location.href = 'http://parent.example.com/page';
      manager = new EmbeddedAppManager(config);
      expect((manager as any).isParent).toBe(true);
    });

    it('should detect embedded context when URL does not match parentUrl', () => {
      window.location.href = 'http://embedded.example.com/page';
      manager = new EmbeddedAppManager(config);
      expect((manager as any).isParent).toBe(false);
    });

    it('should setup message handling on initialization', () => {
      manager = new EmbeddedAppManager(config);
      expect(mockAddEventListener).toHaveBeenCalledWith('message', expect.any(Function), false);
    });
  });

  describe('message handling', () => {
    beforeEach(() => {
      manager = new EmbeddedAppManager(config);
    });

    it('should register message handler', () => {
      const handler = jest.fn();
      (manager as any).registerHandler('test', handler);
      
      expect((manager as any).messageHandlers.has('test')).toBe(true);
    });

    it('should handle valid messages from allowed origins', () => {
      const handler = jest.fn();
      (manager as any).registerHandler('ping', handler);

      const messageEvent = new MessageEvent('message', {
        data: { command: 'ping', data: { type: 'ping' } },
        origin: 'http://embedded.example.com'
      });

      // Get the event handler that was registered
      const eventHandler = mockAddEventListener.mock.calls[0][1];
      eventHandler(messageEvent);

      expect(handler).toHaveBeenCalledWith({ type: 'ping' }, messageEvent);
    });

    it('should reject messages from disallowed origins', () => {
      const handler = jest.fn();
      (manager as any).registerHandler('ping', handler);

      const messageEvent = new MessageEvent('message', {
        data: { command: 'ping', data: { type: 'ping' } },
        origin: 'http://evil.example.com'
      });

      const eventHandler = mockAddEventListener.mock.calls[0][1];
      eventHandler(messageEvent);

      expect(handler).not.toHaveBeenCalled();
    });

    it('should ignore messages without command', () => {
      const handler = jest.fn();
      (manager as any).registerHandler('ping', handler);

      const messageEvent = new MessageEvent('message', {
        data: { data: { type: 'ping' } },
        origin: 'http://embedded.example.com'
      });

      const eventHandler = mockAddEventListener.mock.calls[0][1];
      eventHandler(messageEvent);

      expect(handler).not.toHaveBeenCalled();
    });

    it('should handle message with no registered handler gracefully', () => {
      const messageEvent = new MessageEvent('message', {
        data: { command: 'unknownCommand', data: {} },
        origin: 'http://embedded.example.com'
      });

      const eventHandler = mockAddEventListener.mock.calls[0][1];
      
      expect(() => eventHandler(messageEvent)).not.toThrow();
    });
  });

  describe('iframe management', () => {
    beforeEach(() => {
      // Set as parent context
      window.location.href = 'http://parent.example.com/page';
      manager = new EmbeddedAppManager(config);
    });

    it('should create iframe element', () => {
      const mockCreateElement = jest.spyOn(document, 'createElement');
      const mockIframe = document.createElement('iframe');
      mockCreateElement.mockReturnValue(mockIframe);

      const iframe = (manager as any).createIframe();

      expect(mockCreateElement).toHaveBeenCalledWith('iframe');
      expect(iframe.id).toBe('test-iframe');
      expect(iframe.src).toBe('http://embedded.example.com');
      expect(iframe.getAttribute('sandbox')).toBe('allow-scripts allow-same-origin');
    });

    it('should create iframe without sandbox attributes if not specified', () => {
      const configWithoutSandbox = { ...config, sandboxAttributes: undefined };
      manager = new EmbeddedAppManager(configWithoutSandbox);

      const mockCreateElement = jest.spyOn(document, 'createElement');
      const mockIframe = document.createElement('iframe');
      mockCreateElement.mockReturnValue(mockIframe);

      const iframe = (manager as any).createIframe();

      expect(iframe.getAttribute('sandbox')).toBeNull();
    });

    it('should mount iframe to container', () => {
      const container = document.createElement('div');
      const mockAppendChild = jest.spyOn(container, 'appendChild');

      (manager as any).mountIframe(container);

      expect(mockAppendChild).toHaveBeenCalled();
    });

    it('should send message to iframe', () => {
      const mockIframe = {
        contentWindow: {
          postMessage: jest.fn()
        }
      };
      (manager as any).iframe = mockIframe as any;

      (manager as any).sendMessage('ping', { type: 'ping' });

      expect(mockIframe.contentWindow.postMessage).toHaveBeenCalledWith(
        { command: 'ping', data: { type: 'ping' } },
        'http://embedded.example.com'
      );
    });

    it('should not send message if iframe has no contentWindow', () => {
      const mockIframe = {
        contentWindow: null
      };
      (manager as any).iframe = mockIframe as any;

      expect(() => (manager as any).sendMessage('ping', { type: 'ping' })).not.toThrow();
    });
  });

  describe('security features', () => {
    beforeEach(() => {
      manager = new EmbeddedAppManager(config);
    });

    it('should validate origin against allowedOrigins', () => {
      expect((manager as any).isOriginAllowed('http://embedded.example.com')).toBe(true);
      expect((manager as any).isOriginAllowed('http://parent.example.com')).toBe(true);
      expect((manager as any).isOriginAllowed('http://evil.example.com')).toBe(false);
    });

    it('should allow all origins if allowedOrigins is not specified', () => {
      const configWithoutOrigins = { ...config, allowedOrigins: undefined };
      manager = new EmbeddedAppManager(configWithoutOrigins);

      expect((manager as any).isOriginAllowed('http://any.example.com')).toBe(true);
    });

    it('should validate message protocol if specified', () => {
      const validMessage = {
        command: 'ping',
        data: { type: 'ping' }
      };

      const invalidMessage = {
        command: 'ping',
        data: { invalid: 'structure' }
      };

      expect((manager as any).validateMessage(validMessage)).toBe(true);
      expect((manager as any).validateMessage(invalidMessage)).toBe(false);
    });

    it('should skip validation if no protocol specified', () => {
      const configWithoutProtocol = { ...config, messageProtocol: undefined };
      manager = new EmbeddedAppManager(configWithoutProtocol);

      const anyMessage = {
        command: 'anything',
        data: { any: 'data' }
      };

      expect((manager as any).validateMessage(anyMessage)).toBe(true);
    });
  });

  describe('responsive sizing', () => {
    beforeEach(() => {
      window.location.href = 'http://parent.example.com/page';
      manager = new EmbeddedAppManager(config);
    });

    it('should resize iframe', () => {
      const mockIframe = document.createElement('iframe');
      (manager as any).iframe = mockIframe;

      (manager as any).resizeIframe(800, 600);

      expect(mockIframe.style.width).toBe('800px');
      expect(mockIframe.style.height).toBe('600px');
    });

    it('should handle resize messages from embedded app', () => {
      const handler = jest.fn();
      (manager as any).registerHandler('resize', handler);

      const messageEvent = new MessageEvent('message', {
        data: { command: 'resize', data: { width: 1024, height: 768 } },
        origin: 'http://embedded.example.com'
      });

      const eventHandler = mockAddEventListener.mock.calls[0][1];
      eventHandler(messageEvent);

      expect(handler).toHaveBeenCalledWith({ width: 1024, height: 768 }, messageEvent);
    });

    it('should request parent resize from embedded context', () => {
      window.location.href = 'http://embedded.example.com/page';
      manager = new EmbeddedAppManager(config);

      const mockParent = {
        postMessage: jest.fn()
      };
      (window as any).parent = mockParent;

      (manager as any).requestResize(1200, 800);

      expect(mockParent.postMessage).toHaveBeenCalledWith(
        { command: 'resize', data: { width: 1200, height: 800 } },
        'http://parent.example.com'
      );
    });
  });

  describe('cleanup', () => {
    beforeEach(() => {
      manager = new EmbeddedAppManager(config);
    });

    it('should remove event listeners on destroy', () => {
      (manager as any).destroy();

      expect(mockRemoveEventListener).toHaveBeenCalledWith('message', expect.any(Function), false);
    });

    it('should clear message handlers on destroy', () => {
      (manager as any).registerHandler('test', jest.fn());
      (manager as any).destroy();

      expect((manager as any).messageHandlers.size).toBe(0);
    });

    it('should remove iframe from DOM on destroy', () => {
      const mockIframe = document.createElement('iframe');
      const mockRemove = jest.spyOn(mockIframe, 'remove');
      document.body.appendChild(mockIframe);
      (manager as any).iframe = mockIframe;

      (manager as any).destroy();

      expect(mockRemove).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    beforeEach(() => {
      manager = new EmbeddedAppManager(config);
    });

    it('should handle malformed message data', () => {
      const messageEvent = new MessageEvent('message', {
        data: 'not an object',
        origin: 'http://embedded.example.com'
      });

      const eventHandler = mockAddEventListener.mock.calls[0][1];
      
      expect(() => eventHandler(messageEvent)).not.toThrow();
    });

    it('should handle circular reference in message data', () => {
      const circularData: any = { command: 'test' };
      circularData.self = circularData;

      const messageEvent = new MessageEvent('message', {
        data: circularData,
        origin: 'http://embedded.example.com'
      });

      const eventHandler = mockAddEventListener.mock.calls[0][1];
      
      expect(() => eventHandler(messageEvent)).not.toThrow();
    });

    it('should handle postMessage errors gracefully', () => {
      const mockIframe = {
        contentWindow: {
          postMessage: jest.fn().mockImplementation(() => {
            throw new Error('PostMessage failed');
          })
        }
      };
      (manager as any).iframe = mockIframe as any;

      expect(() => (manager as any).sendMessage('test', {})).not.toThrow();
    });
  });

  describe('advanced features', () => {
    beforeEach(() => {
      manager = new EmbeddedAppManager(config);
    });

    it('should support async message handlers', async () => {
      const asyncHandler = jest.fn().mockResolvedValue({ result: 'success' });
      (manager as any).registerHandler('async', asyncHandler);

      const messageEvent = new MessageEvent('message', {
        data: { command: 'async', data: { test: true } },
        origin: 'http://embedded.example.com'
      });

      const eventHandler = mockAddEventListener.mock.calls[0][1];
      await eventHandler(messageEvent);

      expect(asyncHandler).toHaveBeenCalled();
    });

    it('should queue messages when iframe is not ready', () => {
      window.location.href = 'http://parent.example.com/page';
      manager = new EmbeddedAppManager(config);
      
      // No iframe set yet
      (manager as any).iframe = undefined;
      
      (manager as any).sendMessage('test', { data: 'queued' });
      
      // Message should be queued
      expect((manager as any).messageQueue).toBeDefined();
    });

    it('should support custom message serialization', () => {
      const customSerializer = jest.fn().mockReturnValue('serialized');
      (manager as any).setSerializer(customSerializer);

      const mockIframe = {
        contentWindow: {
          postMessage: jest.fn()
        }
      };
      (manager as any).iframe = mockIframe as any;

      (manager as any).sendMessage('test', { complex: 'data' });

      expect(customSerializer).toHaveBeenCalledWith({ command: 'test', data: { complex: 'data' } });
    });

    it('should provide connection state', () => {
      expect((manager as any).isConnected()).toBe(false);

      const mockIframe = {
        contentWindow: {}
      };
      (manager as any).iframe = mockIframe as any;

      expect((manager as any).isConnected()).toBe(true);
    });
  });
});