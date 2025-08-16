import { Command } from 'commander';
import chalk from 'chalk';
import * as fs from 'fs-extra';
import { path } from '../../../../../../../infra_external-log-lib/src';

export const configCommand = new Command('config')
  .description('Manage environment configurations')
  .argument('[action]', 'Action to perform (show, get, set)', 'show')
  .option('--env <environment>', 'Environment name (test, demo, staging, production)')
  .option('--service <service>', 'Service name')
  .option('--port <port>', 'Port number (for set action)')
  .option('--db-type <type>', 'Database type (postgres, sqlite)')
  .action(async (action: string, options: any) => {
    try {
      const configPath = path.join(process.cwd(), 'config', 'environments.json');
      
      if (!await fs.pathExists(configPath)) {
        console.error(chalk.red('No environments.json found in config/'));
        console.log(chalk.yellow('Creating default configuration...'));
        await createDefaultConfig(configPath);
      }
      
      const config = await fs.readJson(configPath);
      
      switch (action) {
        case 'show':
          showConfig(config, options);
          break;
        case 'get':
          getConfig(config, options);
          break;
        case 'set':
          await setConfig(config, configPath, options);
          break;
        default:
          console.error(chalk.red(`Unknown action: ${action}`));
          process.exit(1);
      }
    } catch (error) {
      console.error(chalk.red('Error:'), error);
      process.exit(1);
    }
  });

async function createDefaultConfig(configPath: string) {
  const defaultConfig = {
    "environments": {
      "test": {
        "port_range": { "start": 3100, "end": 3199 },
        "db_prefix": "test",
        "services": {
          "main": 3100,
          "api": 3101,
          "websocket": 3102
        }
      },
      "demo": {
        "port_range": { "start": 3300, "end": 3399 },
        "db_prefix": "demo",
        "services": {
          "main": 3300,
          "api": 3301,
          "websocket": 3302
        }
      },
      "staging": {
        "port_range": { "start": 3400, "end": 3449 },
        "db_prefix": "staging",
        "services": {
          "main": 3400,
          "api": 3401,
          "websocket": 3402
        }
      },
      "production": {
        "port_range": { "start": 3450, "end": 3499 },
        "db_prefix": "prod",
        "services": {
          "main": 3456,
          "api": 3457,
          "websocket": 3458
        }
      }
    },
    "database": {
      "postgres": {
        "host": "localhost",
        "port": 5432,
        "default_user": "ai_dev_user"
      },
      "sqlite": {
        "path": "./data/${env}_${app}.db"
      }
    },
    "features": {
      "mcp_enabled": true,
      "vf_mode_default": true,
      "auto_backup": false
    }
  };
  
  await fs.ensureDir(path.dirname(configPath));
  await fs.writeJson(configPath, defaultConfig, { spaces: 2 });
  console.log(chalk.green('✅ Created default environments.json'));
}

function showConfig(config: any, options: any) {
  if (options.env) {
    // Show specific environment
    if (!config.environments[options.env]) {
      console.error(chalk.red(`Unknown environment: ${options.env}`));
      console.log(chalk.yellow(`Available: ${Object.keys(config.environments).join(', ')}`));
      return;
    }
    
    const envConfig = config.environments[options.env] as any;
    console.log(chalk.blue(`\n📋 Configuration for ${options.env}:\n`));
    console.log(`Port Range: ${envConfig.port_range.start}-${envConfig.port_range.end}`);
    console.log(`DB Prefix: ${envConfig.db_prefix}`);
    console.log('\nServices:');
    for (const [service, port] of Object.entries(envConfig.services as any)) {
      console.log(`  ${service}: ${port}`);
    }
  } else {
    // Show all environments
    console.log(chalk.blue('\n📋 All Environments:\n'));
    for (const [env, envConfig] of Object.entries(config.environments as any)) {
      const cfg = envConfig as any;
      console.log(chalk.green(`${env}:`));
      console.log(`  Port Range: ${cfg.port_range.start}-${cfg.port_range.end}`);
      console.log(`  DB Prefix: ${cfg.db_prefix}`);
      console.log(`  Main Port: ${cfg.services.main}`);
    }
    
    console.log(chalk.blue('\n🗄️  Database Configuration:'));
    console.log(`PostgreSQL: ${config.database.postgres.host}:${config.database.postgres.port}`);
    console.log(`SQLite Path: ${config.database.sqlite.path}`);
    
    console.log(chalk.blue('\n⚙️  Features:'));
    for (const [feature, enabled] of Object.entries(config.features)) {
      console.log(`  ${feature}: ${enabled}`);
    }
  }
}

function getConfig(config: any, options: any) {
  if (!options.env) {
    console.error(chalk.red('--env is required for get action'));
    return;
  }
  
  const envConfig = config.environments[options.env];
  if (!envConfig) {
    console.error(chalk.red(`Unknown environment: ${options.env}`));
    return;
  }
  
  if (options.service) {
    const port = envConfig.services[options.service];
    if (port) {
      console.log(port);
    } else {
      console.error(chalk.red(`Unknown service: ${options.service}`));
      process.exit(1);
    }
  } else if (options.dbType) {
    const dbConfig = config.database[options.dbType];
    if (dbConfig) {
      console.log(JSON.stringify(dbConfig, null, 2));
    } else {
      console.error(chalk.red(`Unknown database type: ${options.dbType}`));
      process.exit(1);
    }
  } else {
    console.log(JSON.stringify(envConfig, null, 2));
  }
}

async function setConfig(config: any, configPath: string, options: any) {
  if (!options.env || !options.service || !options.port) {
    console.error(chalk.red('--env, --service, and --port are required for set action'));
    return;
  }
  
  const envConfig = config.environments[options.env];
  if (!envConfig) {
    console.error(chalk.red(`Unknown environment: ${options.env}`));
    return;
  }
  
  const port = parseInt(options.port);
  if (isNaN(port)) {
    console.error(chalk.red('Port must be a number'));
    return;
  }
  
  // Check if port is in valid range
  if (port < envConfig.port_range.start || port > envConfig.port_range.end) {
    console.error(chalk.red(`Port ${port} is outside valid range for ${options.env}: ${envConfig.port_range.start}-${envConfig.port_range.end}`));
    return;
  }
  
  envConfig.services[options.service] = port;
  await fs.writeJson(configPath, config, { spaces: 2 });
  
  console.log(chalk.green(`✅ Set ${options.env}.${options.service} = ${port}`));
}