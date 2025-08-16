import { useEffect, useCallback } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';
import { logger } from '../services/ExternalLogger';

interface UseLoggerOptions {
  componentName?: string;
  userId?: string | null;
}

export const useLogger = (options: UseLoggerOptions = {}) => {
  const location = useLocation();
  const navigationType = useNavigationType();

  // Set user ID when it changes
  useEffect(() => {
    if (options.userId !== undefined) {
      logger.setUserId(options.userId);
    }
  }, [options.userId]);

  // Log navigation changes
  useEffect(() => {
    const fromPath = sessionStorage.getItem('lastPath') || 'initial';
    const toPath = location.pathname;

    if (fromPath !== toPath) {
      logger.logNavigation(fromPath, toPath, {
        navigationType,
        search: location.search,
        hash: location.hash,
        state: location.state
      });

      sessionStorage.setItem('lastPath', toPath);
    }
  }, [location, navigationType]);

  // Log component lifecycle
  useEffect(() => {
    if (options.componentName) {
      logger.debug(`Component mounted: ${options.componentName}`, 'LIFECYCLE');

      return () => {
        logger.debug(`Component unmounted: ${options.componentName}`, 'LIFECYCLE');
      };
    }
  }, [options.componentName]);

  // Memoized logging functions
  const logAction = useCallback((action: string, details?: Record<string, any>) => {
    logger.logUserAction(action, {
      ...details,
      component: options.componentName,
      path: location.pathname
    });
  }, [options.componentName, location.pathname]);

  const logError = useCallback((message: string, error?: Error, metadata?: Record<string, any>) => {
    logger.error(message, options.componentName || 'UNKNOWN', metadata, error);
  }, [options.componentName]);

  const logPerformance = useCallback((metricName: string, value: number, metadata?: Record<string, any>) => {
    logger.logPerformance(metricName, value, 'ms', {
      ...metadata,
      component: options.componentName,
      path: location.pathname
    });
  }, [options.componentName, location.pathname]);

  const measureAsync = useCallback(async <T,>(
    operation: () => Promise<T>,
    operationName: string,
    metadata?: Record<string, any>
  ): Promise<T> => {
    const startTime = performance.now();
    
    try {
      const result = await operation();
      const duration = performance.now() - startTime;
      
      logPerformance(operationName, duration, metadata);
      
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      
      logPerformance(operationName, duration, { ...metadata, failed: true });
      logError(`${operationName} failed`, error as Error, metadata);
      
      throw error;
    }
  }, [logPerformance, logError]);

  const measure = useCallback(<T,>(
    operation: () => T,
    operationName: string,
    metadata?: Record<string, any>
  ): T => {
    const startTime = performance.now();
    
    try {
      const result = operation();
      const duration = performance.now() - startTime;
      
      logPerformance(operationName, duration, metadata);
      
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      
      logPerformance(operationName, duration, { ...metadata, failed: true });
      logError(`${operationName} failed`, error as Error, metadata);
      
      throw error;
    }
  }, [logPerformance, logError]);

  return {
    logger,
    logAction,
    logError,
    logPerformance,
    measureAsync,
    measure
  };
};

// HOC for wrapping components with error boundaries and logging
export const withLogger = <P extends object>(
  Component: React.ComponentType<P>,
  componentName: string
) => {
  return (props: P) => {
    const { logError } = useLogger({ componentName });

    useEffect(() => {
      const handleError = (event: ErrorEvent) => {
        logError('Unhandled error', new Error(event.message), {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        });
      };

      const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
        logError('Unhandled promise rejection', new Error(String(event.reason)), {
          reason: event.reason
        });
      };

      window.addEventListener('error', handleError);
      window.addEventListener('unhandledrejection', handleUnhandledRejection);

      return () => {
        window.removeEventListener('error', handleError);
        window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      };
    }, [logError]);

    return <Component {...props} />;
  };
};