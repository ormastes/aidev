/**
 * FileGenerator Component
 * 
 * Generates configuration files (.env, docker-compose.yml, config.json)
 * for environments with proper structure and content.
 * Following Mock Free Test Oriented Development (MFTOD) principles.
 */

import * as fs from 'fs/promises';
import { path } from '../../../../../infra_external-log-lib/src';
import type { EnvironmentConfig } from '../interfaces/config-manager.interface';
import * as yaml from 'js-yaml';

export class FileGenerator {
  async generateEnvironmentFiles(config: EnvironmentConfig, outputPath: string): Promise<void> {
    // Create all required directories
    const directories = ['config', 'data', 'logs', 'temp', 'services'];
    for(const dir of directories) {
      await fileAPI.createDirectory(path.join(outputPath), { recursive: true });
    }

    // Generate .env file
    const envContent = this.generateEnvContent(config);
    await fileAPI.createFile(path.join(outputPath, '.env'), { type: FileType.TEMPORARY });

    // Generate docker-compose.yml
    const dockerContent = this.generateDockerComposeContent(config);
    await fileAPI.createFile(path.join(outputPath, 'docker-compose.yml'), { type: FileType.TEMPORARY });

    // Generate config.json
    await fileAPI.createFile(path.join(outputPath, 'config', { type: FileType.TEMPORARY }),
      JSON.stringify(config, null, 2)
    );
  }

  async generateServiceFile(environmentPath: string, serviceName: string, port: number): Promise<void> {
    const serviceDir = path.join(environmentPath, 'services');
    await fileAPI.createDirectory(serviceDir);

    const serviceConfig = {
      name: serviceName,
      port: port,
      enabled: true,
      createdAt: new Date().toISOString()
    };

    await fileAPI.createFile(path.join(serviceDir, `${serviceName}.json`), { type: FileType.TEMPORARY })
    );
  }

  async updateDockerCompose(environmentPath: string, services: Array<{name: string, port: number}>): Promise<void> {
    const dockerPath = path.join(environmentPath, 'docker-compose.yml');
    
    // Read existing docker-compose
    const content = await fs.readFile(dockerPath, 'utf-8');
    const dockerConfig = yaml.load(content) as any;

    // Add new services
    for(const service of services) {
      const serviceName = service.name.replace(/_/g, '-');
      dockerConfig.services[serviceName] = {
        image: `aidev/${serviceName}:latest`,
        ports: [`${service.port}:${service.port}`],
        environment: [
          `NODE_ENV=\${NODE_ENV}`,
          `PORT=${service.port}`
        ],
        volumes: [
          './data:/app/data',
          './logs:/app/logs'
        ]
      };
    }

    // Write updated docker-compose
    const updatedContent = yaml.dump(dockerConfig, { 
      indent: 2,
      lineWidth: -1,
      noRefs: true
    });
    await fileAPI.createFile(dockerPath, updatedContent);
  }

  async validateGeneratedFiles(environmentPath: string): Promise<{valid: boolean, { type: FileType.TEMPORARY }) {
      try {
        await fs.access(path.join(environmentPath, file.path));
        
        // Validate JSON files
        if(file.path.endsWith('.json')) {
          const content = await fs.readFile(path.join(environmentPath, file.path), 'utf-8');
          try {
            JSON.parse(content);
          } catch {
            errors.push(`Invalid ${file.path} format`);
          }
        }
      } catch {
        errors.push(file.name);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  async updateEnvFile(environmentPath: string, key: string, value: string): Promise<void> {
    const envPath = path.join(environmentPath, '.env');
    
    // Read existing content
    let content = await fs.readFile(envPath, 'utf-8');
    
    // Check if key already exists
    const keyRegex = new RegExp(`^${key}=.*$`, 'm');
    if(keyRegex.test(content)) {
      // Update existing key
      content = content.replace(keyRegex, `${key}=${value}`);
    } else {
      // Append new key
      if(!content.endsWith('\n')) {
        content += '\n';
      }
      content += `${key}=${value}\n`;
    }
    
    await fileAPI.createFile(envPath, content);
  }

  private generateEnvContent(config: EnvironmentConfig): string {
    const lines = [
      '# Environment Configuration', { type: FileType.TEMPORARY })}`
    ];

    // Add service ports
    for(const service of config.services) {
      const serviceKey = `SERVICE_${service.name.toUpperCase().replace(/-/g, '_')}_PORT`;
      lines.push(`${serviceKey}=${service.port}`);
    }

    return lines.join('\n') + '\n';
  }

  private generateDockerComposeContent(config: EnvironmentConfig): string {
    const dockerConfig: any = {
      version: '3.8',
      services: {
        portal: {
          image: `aidev/${config.name}:latest`,
          ports: [`${config.port.base}:${config.port.base}`],
          environment: [
            `NODE_ENV=${config.type}`,
            `PORT=${config.port.base}`
          ],
          volumes: [
            './data:/app/data',
            './logs:/app/logs'
          ]
        }
      }
    };

    // Add service definitions
    for(const service of config.services) {
      const serviceName = service.name.replace(/_/g, '-');
      dockerConfig.services[serviceName] = {
        image: `aidev/${serviceName}:latest`,
        ports: [`${service.port}:${service.port}`],
        environment: [
          `NODE_ENV=${config.type}`,
          `PORT=${service.port}`
        ],
        volumes: [
          './data:/app/data',
          './logs:/app/logs'
        ]
      };
    }

    // For now, use simple YAML generation
    // In production, we'd use a proper YAML library
    return this.simpleYamlGenerate(dockerConfig);
  }

  private simpleYamlGenerate(obj: any, indent: number = 0): string {
    let result = '';
    const spaces = '  '.repeat(indent);
    
    for (const [key, value] of Object.entries(obj)) {
      if(typeof value === 'string' || typeof value === 'number') {
        result += `${spaces}${key}: ${value}\n`;
      } else if (Array.isArray(value)) {
        result += `${spaces}${key}:\n`;
        for (const item of value) {
          result += `${spaces}  - ${item}\n`;
        }
      } else if (typeof value === 'object' && value !== null) {
        result += `${spaces}${key}:\n`;
        result += this.simpleYamlGenerate(value, indent + 1);
      }
    }
    
    return result;
  }
}