/**
 * Service name conversion utilities to reduce duplication
 */

export class ServiceNameUtils {
  /**
   * Converts a service name to environment variable format
   * Example: "my-service" -> "MY_SERVICE"
   */
  static toEnvVar(serviceName: string): string {
    return serviceName.toUpperCase().replace(/-/g, '_');
  }

  /**
   * Converts a service name to a port environment variable name
   * Example: "my-service" -> "SERVICE_MY_SERVICE_PORT"
   */
  static toPortEnvVar(serviceName: string): string {
    return `SERVICE_${this.toEnvVar(serviceName)}_PORT`;
  }

  /**
   * Converts a service name to a host environment variable name
   * Example: "my-service" -> "SERVICE_MY_SERVICE_HOST"
   */
  static toHostEnvVar(serviceName: string): string {
    return `SERVICE_${this.toEnvVar(serviceName)}_HOST`;
  }

  /**
   * Converts a service name to a URL environment variable name
   * Example: "my-service" -> "SERVICE_MY_SERVICE_URL"
   */
  static toUrlEnvVar(serviceName: string): string {
    return `SERVICE_${this.toEnvVar(serviceName)}_URL`;
  }

  /**
   * Converts environment variable name to service name
   * Example: "MY_SERVICE" -> "my-service"
   */
  static fromEnvVar(envVarName: string): string {
    return envVarName.toLowerCase().replace(/_/g, '-');
  }

  /**
   * Extracts service name from port environment variable
   * Example: "SERVICE_MY_SERVICE_PORT" -> "my-service"
   */
  static fromPortEnvVar(portEnvVar: string): string {
    const match = portEnvVar.match(/^SERVICE_(.+)_PORT$/);
    if (!match) {
      throw new Error(`Invalid port environment variable format: ${portEnvVar}`);
    }
    return this.fromEnvVar(match[1]);
  }

  /**
   * Normalizes a service name to kebab-case
   * Example: "MyService" -> "my-service"
   */
  static normalize(serviceName: string): string {
    return serviceName
      .replace(/([A-Z])/g, '-$1')
      .replace(/^-/, '')
      .replace(/--+/g, '-')
      .toLowerCase();
  }

  /**
   * Converts service name to Docker image name
   * Example: "my-service" -> "aidev/my-service:latest"
   */
  static toDockerImage(serviceName: string, tag: string = 'latest'): string {
    return `aidev/${serviceName}:${tag}`;
  }

  /**
   * Validates if a string is a valid service name
   */
  static isValidServiceName(name: string): boolean {
    // Service name should only contain lowercase letters, numbers, and hyphens
    // Should not start or end with a hyphen
    return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(name);
  }

  /**
   * Generates all standard environment variable names for a service
   */
  static generateEnvVars(serviceName: string): Record<string, string> {
    const normalized = this.normalize(serviceName);
    return {
      port: this.toPortEnvVar(normalized),
      host: this.toHostEnvVar(normalized),
      url: this.toUrlEnvVar(normalized),
      name: this.toEnvVar(normalized)
    };
  }
}

export const serviceNameUtils = ServiceNameUtils;