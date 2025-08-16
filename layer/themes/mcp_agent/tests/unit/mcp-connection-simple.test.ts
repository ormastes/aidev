import { MCPProtocol } from '../../children/src/domain/protocol';

describe('MCPConnection Infrastructure', () => {
  describe('MCPProtocol Helper Functions', () => {
    it('should create valid MCP request', () => {
      const request = MCPProtocol.createRequest('tools/list', { param: 'test' });

      expect(request.jsonrpc).toBe('2.0');
      expect(request.method).toBe('tools/list');
      expect(request.params).toEqual({ param: 'test' });
      expect(request.id).toBeDefined();
    });

    it('should create MCP request with custom ID', () => {
      const request = MCPProtocol.createRequest('test/method', {}, 'custom-id');

      expect(request.id).toBe('custom-id');
    });

    it('should create valid MCP response', () => {
      const response = MCPProtocol.createResponse('test-id', { result: 'success' });

      expect(response.jsonrpc).toBe('2.0');
      expect(response.id).toBe('test-id');
      expect(response.result).toEqual({ result: 'success' });
    });

    it('should create MCP response with error', () => {
      const error = { code: -1, message: 'Test error' };
      const response = MCPProtocol.createResponse('test-id', undefined, error);

      expect(response.jsonrpc).toBe('2.0');
      expect(response.id).toBe('test-id');
      expect(response.error).toEqual(error);
    });

    it('should create valid MCP notification', () => {
      const notification = MCPProtocol.createNotification('test/notification', { data: 'test' });

      expect(notification.jsonrpc).toBe('2.0');
      expect(notification.method).toBe('test/notification');
      expect(notification.params).toEqual({ data: 'test' });
    });

    it('should create MCP error object', () => {
      const error = MCPProtocol.createError(-32601, 'Method not found', { extra: 'data' });

      expect(error.code).toBe(-32601);
      expect(error.message).toBe('Method not found');
      expect(error.data).toEqual({ extra: 'data' });
    });

    it('should have standard error codes', () => {
      expect(MCPProtocol.ErrorCodes.PARSE_ERROR).toBe(-32700);
      expect(MCPProtocol.ErrorCodes.INVALID_REQUEST).toBe(-32600);
      expect(MCPProtocol.ErrorCodes.METHOD_NOT_FOUND).toBe(-32601);
      expect(MCPProtocol.ErrorCodes.INVALID_PARAMS).toBe(-32602);
      expect(MCPProtocol.ErrorCodes.INTERNAL_ERROR).toBe(-32603);
    });
  });

  describe('Protocol Type Validation', () => {
    it('should validate request structure', () => {
      const request = MCPProtocol.createRequest('test', {});
      
      expect(typeof request.jsonrpc).toBe('string');
      expect(typeof request.id).toBeDefined();
      expect(typeof request.method).toBe('string');
      expect(request).toHaveProperty('params');
    });

    it('should validate response structure', () => {
      const response = MCPProtocol.createResponse(1, { test: true });
      
      expect(typeof response.jsonrpc).toBe('string');
      expect(response.id).toBe(1);
      expect(response).toHaveProperty('result');
    });

    it('should validate notification structure', () => {
      const notification = MCPProtocol.createNotification('test');
      
      expect(typeof notification.jsonrpc).toBe('string');
      expect(typeof notification.method).toBe('string');
      expect(notification).not.toHaveProperty('id');
    });

    it('should handle missing parameters gracefully', () => {
      const request = MCPProtocol.createRequest('test');
      expect(request.params).toBeUndefined();

      const notification = MCPProtocol.createNotification('test');
      expect(notification.params).toBeUndefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty method names', () => {
      const request = MCPProtocol.createRequest('');
      expect(request.method).toBe('');
    });

    it('should handle null parameters', () => {
      const request = MCPProtocol.createRequest('test', null);
      expect(request.params).toBeNull();
    });

    it('should handle complex nested parameters', () => {
      const complexParams = {
        array: [1, 2, 3],
        object: { nested: { deep: true } },
        string: 'test',
        number: 42,
        boolean: false
      };

      const request = MCPProtocol.createRequest('complex', complexParams);
      expect(request.params).toEqual(complexParams);
    });

    it('should generate unique IDs for multiple requests', () => {
      const request1 = MCPProtocol.createRequest('test1');
      // Add small delay to ensure different timestamps
      const now = Date.now();
      while (Date.now() === now) {
        // Wait for next millisecond  
      }
      const request2 = MCPProtocol.createRequest('test2');
      
      expect(request1.id).not.toBe(request2.id);
    });

    it('should handle very large parameter objects', () => {
      const largeParams = {
        data: 'x'.repeat(10000),
        numbers: Array.from({ length: 1000 }, (_, i) => i)
      };

      const request = MCPProtocol.createRequest('large', largeParams);
      expect(request.params.data).toHaveLength(10000);
      expect(request.params.numbers).toHaveLength(1000);
    });
  });
});