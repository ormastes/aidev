import { 
  ErrorHandler, 
  errorHandler, 
  withErrorHandling,
  ErrorContext,
  ErrorResult 
} from '../../src/utils/error-handler';

describe('ErrorHandler', () => {
  let handler: ErrorHandler;

  beforeEach(() => {
    handler = ErrorHandler.getInstance();
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = ErrorHandler.getInstance();
      const instance2 = ErrorHandler.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('handle', () => {
    it('should handle successful operation', () => {
      const result = handler.handle(
        () => 'success',
        { operation: 'test-op' }
      );

      expect(result.success).toBe(true);
      expect(result.data).toBe('success');
      expect(result.error).toBeUndefined();
    });

    it('should handle failed operation', () => {
      const error = new Error('Test error');
      const result = handler.handle(
        () => { throw error; },
        { operation: 'test-op', component: 'TestComponent' }
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('Test error');
      expect(result.error?.context?.operation).toBe('test-op');
    });
  });

  describe('handleAsync', () => {
    it('should handle successful async operation', async () => {
      const result = await handler.handleAsync(
        async () => 'async-success',
        { operation: 'async-op' }
      );

      expect(result.success).toBe(true);
      expect(result.data).toBe('async-success');
    });

    it('should handle failed async operation', async () => {
      const result = await handler.handleAsync(
        async () => { throw new Error('Async error'); },
        { operation: 'async-op' }
      );

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Async error');
    });
  });

  describe('retry', () => {
    it('should succeed on first attempt', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      
      const result = await ErrorHandler.retry(operation, 3, 10);
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and succeed', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('First fail'))
        .mockRejectedValueOnce(new Error('Second fail'))
        .mockResolvedValue('success');
      
      const result = await ErrorHandler.retry(operation, 3, 10);
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should throw after max retries', async () => {
      const error = new Error('Always fails');
      const operation = jest.fn().mockRejectedValue(error);
      
      await expect(
        ErrorHandler.retry(operation, 2, 10)
      ).rejects.toThrow('Always fails');
      
      expect(operation).toHaveBeenCalledTimes(2);
    });
  });

  describe('createSafeWrapper', () => {
    it('should wrap function and catch errors', () => {
      const unsafeFunc = (x: number) => {
        if (x < 0) throw new Error('Negative not allowed');
        return x * 2;
      };

      const safeFunc = ErrorHandler.createSafeWrapper(unsafeFunc, -1);

      expect(safeFunc(5)).toBe(10);
      expect(safeFunc(-5)).toBe(-1);
    });

    it('should log errors to console', () => {
      const func = () => { throw new Error('Test error'); };
      const wrapped = ErrorHandler.createSafeWrapper(func);

      wrapped();
      
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('threw error'),
        expect.any(Error)
      );
    });
  });
});