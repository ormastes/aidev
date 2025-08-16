import { ServiceNameUtils } from '../../src/utils/service-name';

describe("ServiceNameUtils", () => {
  describe("toEnvVar", () => {
    it('should convert kebab-case to uppercase with underscores', () => {
      expect(ServiceNameUtils.toEnvVar('my-service')).toBe('MY_SERVICE');
      expect(ServiceNameUtils.toEnvVar('api-gateway')).toBe('API_GATEWAY');
      expect(ServiceNameUtils.toEnvVar('auth')).toBe('AUTH');
    });

    it('should handle already uppercase names', () => {
      expect(ServiceNameUtils.toEnvVar('MY-SERVICE')).toBe('MY_SERVICE');
    });

    it('should handle names with numbers', () => {
      expect(ServiceNameUtils.toEnvVar('service-v2')).toBe('SERVICE_V2');
      expect(ServiceNameUtils.toEnvVar('api-3-gateway')).toBe('API_3_GATEWAY');
    });
  });

  describe("toPortEnvVar", () => {
    it('should generate port environment variable name', () => {
      expect(ServiceNameUtils.toPortEnvVar('my-service')).toBe('SERVICE_MY_SERVICE_PORT');
      expect(ServiceNameUtils.toPortEnvVar('auth')).toBe('SERVICE_AUTH_PORT');
      expect(ServiceNameUtils.toPortEnvVar('api-gateway')).toBe('SERVICE_API_GATEWAY_PORT');
    });
  });

  describe("toHostEnvVar", () => {
    it('should generate host environment variable name', () => {
      expect(ServiceNameUtils.toHostEnvVar('my-service')).toBe('SERVICE_MY_SERVICE_HOST');
      expect(ServiceNameUtils.toHostEnvVar('auth')).toBe('SERVICE_AUTH_HOST');
    });
  });

  describe("toUrlEnvVar", () => {
    it('should generate URL environment variable name', () => {
      expect(ServiceNameUtils.toUrlEnvVar('my-service')).toBe('SERVICE_MY_SERVICE_URL');
      expect(ServiceNameUtils.toUrlEnvVar('api')).toBe('SERVICE_API_URL');
    });
  });

  describe("fromEnvVar", () => {
    it('should convert environment variable to service name', () => {
      expect(ServiceNameUtils.fromEnvVar('MY_SERVICE')).toBe('my-service');
      expect(ServiceNameUtils.fromEnvVar('API_GATEWAY')).toBe('api-gateway');
      expect(ServiceNameUtils.fromEnvVar('AUTH')).toBe('auth');
    });

    it('should handle mixed case', () => {
      expect(ServiceNameUtils.fromEnvVar('My_Service')).toBe('my-service');
    });
  });

  describe("fromPortEnvVar", () => {
    it('should extract service name from port env var', () => {
      expect(ServiceNameUtils.fromPortEnvVar('SERVICE_MY_SERVICE_PORT')).toBe('my-service');
      expect(ServiceNameUtils.fromPortEnvVar('SERVICE_AUTH_PORT')).toBe('auth');
      expect(ServiceNameUtils.fromPortEnvVar('SERVICE_API_GATEWAY_PORT')).toBe('api-gateway');
    });

    it('should throw error for invalid format', () => {
      expect(() => ServiceNameUtils.fromPortEnvVar('INVALID_FORMAT')).toThrow();
      expect(() => ServiceNameUtils.fromPortEnvVar('MY_SERVICE_PORT')).toThrow();
      expect(() => ServiceNameUtils.fromPortEnvVar('SERVICE_MY_SERVICE')).toThrow();
    });
  });

  describe("normalize", () => {
    it('should convert camelCase to kebab-case', () => {
      expect(ServiceNameUtils.normalize("MyService")).toBe('my-service');
      expect(ServiceNameUtils.normalize("apiGateway")).toBe('api-gateway');
      expect(ServiceNameUtils.normalize("AuthService")).toBe('auth-service');
    });

    it('should handle already normalized names', () => {
      expect(ServiceNameUtils.normalize('my-service')).toBe('my-service');
      expect(ServiceNameUtils.normalize('api-gateway')).toBe('api-gateway');
    });

    it('should handle consecutive capitals', () => {
      expect(ServiceNameUtils.normalize("APIGateway")).toBe('a-p-i-gateway');
      expect(ServiceNameUtils.normalize("HTTPServer")).toBe('h-t-t-p-server');
    });

    it('should remove leading hyphens', () => {
      expect(ServiceNameUtils.normalize('-MyService')).toBe('my-service');
    });

    it('should collapse multiple hyphens', () => {
      expect(ServiceNameUtils.normalize('my--service')).toBe('my-service');
      expect(ServiceNameUtils.normalize('api---gateway')).toBe('api-gateway');
    });
  });

  describe("toDockerImage", () => {
    it('should generate Docker image name with default tag', () => {
      expect(ServiceNameUtils.toDockerImage('my-service')).toBe('aidev/my-service:latest');
      expect(ServiceNameUtils.toDockerImage('api-gateway')).toBe('aidev/api-gateway:latest');
    });

    it('should use custom tag when provided', () => {
      expect(ServiceNameUtils.toDockerImage('my-service', 'v1.0.0')).toBe('aidev/my-service:v1.0.0');
      expect(ServiceNameUtils.toDockerImage('api', 'develop')).toBe('aidev/api:develop');
    });
  });

  describe("isValidServiceName", () => {
    it('should validate correct service names', () => {
      expect(ServiceNameUtils.isValidServiceName('my-service')).toBe(true);
      expect(ServiceNameUtils.isValidServiceName('api-gateway')).toBe(true);
      expect(ServiceNameUtils.isValidServiceName('auth')).toBe(true);
      expect(ServiceNameUtils.isValidServiceName('service-v2')).toBe(true);
      expect(ServiceNameUtils.isValidServiceName('api-3-gateway')).toBe(true);
    });

    it('should reject invalid service names', () => {
      expect(ServiceNameUtils.isValidServiceName('My-Service')).toBe(false);
      expect(ServiceNameUtils.isValidServiceName('my_service')).toBe(false);
      expect(ServiceNameUtils.isValidServiceName('-my-service')).toBe(false);
      expect(ServiceNameUtils.isValidServiceName('my-service-')).toBe(false);
      expect(ServiceNameUtils.isValidServiceName('my--service')).toBe(false);
      expect(ServiceNameUtils.isValidServiceName('my service')).toBe(false);
      expect(ServiceNameUtils.isValidServiceName('')).toBe(false);
    });
  });

  describe("generateEnvVars", () => {
    it('should generate all environment variables for a service', () => {
      const vars = ServiceNameUtils.generateEnvVars('my-service');
      
      expect(vars).toEqual({
        port: 'SERVICE_MY_SERVICE_PORT',
        host: 'SERVICE_MY_SERVICE_HOST',
        url: 'SERVICE_MY_SERVICE_URL',
        name: 'MY_SERVICE'
      });
    });

    it('should normalize service name before generating', () => {
      const vars = ServiceNameUtils.generateEnvVars("MyService");
      
      expect(vars).toEqual({
        port: 'SERVICE_MY_SERVICE_PORT',
        host: 'SERVICE_MY_SERVICE_HOST',
        url: 'SERVICE_MY_SERVICE_URL',
        name: 'MY_SERVICE'
      });
    });

    it('should handle single word services', () => {
      const vars = ServiceNameUtils.generateEnvVars('auth');
      
      expect(vars).toEqual({
        port: 'SERVICE_AUTH_PORT',
        host: 'SERVICE_AUTH_HOST',
        url: 'SERVICE_AUTH_URL',
        name: 'AUTH'
      });
    });
  });
});