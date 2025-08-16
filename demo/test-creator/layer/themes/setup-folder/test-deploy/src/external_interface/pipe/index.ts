/**
 * External interface layer pipe gateway
 * All external access to external_interface layer must go through this file
 */

// Export external_interface functionality here
export { EnvGenerator } from '../services/env-generator/env-generator';
export type { EnvConfig, EnvGeneratorOptions } from '../services/env-generator/env-generator';

export { TokenService } from '../services/token-service/token-service';
export type { TokenConfig, TokenServiceOptions } from '../services/token-service/token-service';

export { ServiceDiscovery } from '../services/service-discovery/service-discovery';
export type { ServiceConfig, ServiceInfo } from '../services/service-discovery/service-discovery';

export { ConfigManager } from '../services/config-manager/config-manager';
export type { 
  PortRange, 
  EnvironmentConfig, 
  DatabaseConfig, 
  FeatureFlags, 
  GlobalConfig,
  ConfigurationFile 
} from '../services/config-manager/config-manager';
