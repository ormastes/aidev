#!/usr/bin/env node

import * as yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { ContainerOrchestrator, ContainerConfig, ContainerRuntime, Environment } from '../services/container-orchestrator';
import { DockerSetupService } from '../services/docker-setup';
import { QEMUSetupService } from '../services/qemu-setup';
import { fs } from '../../../infra_external-log-lib/src';
import { path } from '../../../infra_external-log-lib/src';
import * as inquirer from 'inquirer';

const orchestrator = new ContainerOrchestrator();
const dockerService = new DockerSetupService();
const qemuService = new QEMUSetupService();

yargs(hideBin(process.argv))
  .command(
    'docker <action>',
    'Docker container management',
    (yargs) => {
      return yargs
        .positional('action', {
          describe: 'Action to perform',
          choices: ['setup', 'build', 'run', 'stop', 'remove'],
          type: 'string'
        })
        .option('name', {
          alias: 'n',
          describe: 'Project name',
          type: 'string',
          demandOption: true
        })
        .option('environment', {
          alias: 'e',
          describe: 'Environment',
          choices: ['local', 'dev', 'dev-demo', 'demo', 'release'],
          default: 'dev'
        })
        .option('base-image', {
          alias: 'i',
          describe: 'Base Docker image',
          type: 'string',
          default: 'node:18-alpine'
        })
        .option('ports', {
          alias: 'p',
          describe: 'Exposed ports',
          type: 'array',
          default: [3000]
        })
        .option('volumes', {
          alias: 'v',
          describe: 'Volume mounts',
          type: 'array'
        })
        .option('cpp', {
          describe: 'Enable C++ support',
          type: 'boolean',
          default: false
        })
        .option('debug', {
          describe: 'Enable debugging',
          type: 'boolean',
          default: false
        })
        .option('hot-reload', {
          describe: 'Enable hot reload',
          type: 'boolean',
          default: false
        });
    },
    async async (argv) => {
      const action = argv.action as string;
      
      switch (action) {
        case 'setup':
          await setupDocker(argv);
          break;
        case 'build':
          await buildDocker(argv);
          break;
        case 'run':
          await runDocker(argv);
          break;
        case 'stop':
          await stopDocker(argv);
          break;
        case 'remove':
          await removeDocker(argv);
          break;
      }
    }
  )
  .command(
    'qemu <action>',
    'QEMU container management',
    (yargs) => {
      return yargs
        .positional('action', {
          describe: 'Action to perform',
          choices: ['create', 'start', 'stop', 'remove', 'exec', 'snapshot'],
          type: 'string'
        })
        .option('name', {
          alias: 'n',
          describe: 'Container name',
          type: 'string',
          demandOption: true
        })
        .option('image', {
          alias: 'i',
          describe: 'Base OS image',
          type: 'string',
          default: 'alpine:latest'
        })
        .option('architecture', {
          alias: 'a',
          describe: 'Target architecture',
          choices: ['x86_64', 'aarch64', 'armv7', 'riscv64', 'mips64'],
          default: 'x86_64'
        })
        .option('memory', {
          alias: 'm',
          describe: 'Memory allocation',
          type: 'string',
          default: '2G'
        })
        .option('cpus', {
          alias: 'c',
          describe: 'Number of CPUs',
          type: 'number',
          default: 2
        })
        .option('ports', {
          alias: 'p',
          describe: 'Port mappings (host:guest)',
          type: 'array'
        })
        .option('kvm', {
          describe: 'Enable KVM acceleration',
          type: 'boolean',
          default: false
        })
        .option('vnc', {
          describe: 'Enable VNC server',
          type: 'boolean',
          default: false
        });
    },
    async async (argv) => {
      const action = argv.action as string;
      
      switch (action) {
        case 'create':
          await createQEMU(argv);
          break;
        case 'start':
          await startQEMU(argv);
          break;
        case 'stop':
          await stopQEMU(argv);
          break;
        case 'remove':
          await removeQEMU(argv);
          break;
        case 'exec':
          await execQEMU(argv);
          break;
        case 'snapshot':
          await snapshotQEMU(argv);
          break;
      }
    }
  )
  .command(
    'deploy',
    'Deploy project with orchestrator',
    (yargs) => {
      return yargs
        .option('config', {
          alias: 'c',
          describe: 'Configuration file path',
          type: 'string'
        })
        .option('name', {
          alias: 'n',
          describe: 'Project name',
          type: 'string'
        })
        .option('runtime', {
          alias: 'r',
          describe: 'Container runtime',
          choices: ['docker', 'qemu'],
          default: 'docker'
        })
        .option('environment', {
          alias: 'e',
          describe: 'Deployment environment',
          choices: ['local', 'dev', 'dev-demo', 'demo', 'release'],
          default: 'dev'
        })
        .option('interactive', {
          alias: 'i',
          describe: 'Interactive mode',
          type: 'boolean',
          default: false
        });
    },
    async async (argv) => {
      if (argv.config) {
        await deployFromConfig(argv.config);
      } else if (argv.interactive) {
        await interactiveDeploy();
      } else {
        await deployProject(argv);
      }
    }
  )
  .command(
    'list',
    'List deployments',
    (yargs) => {
      return yargs
        .option('all', {
          alias: 'a',
          describe: 'Show all deployments',
          type: 'boolean',
          default: false
        })
        .option('format', {
          alias: 'f',
          describe: 'Output format',
          choices: ['table', 'json', 'yaml'],
          default: 'table'
        });
    },
    async async (argv) => {
      await listDeployments(argv);
    }
  )
  .command(
    'stop',
    'Stop deployments',
    (yargs) => {
      return yargs
        .option('name', {
          alias: 'n',
          describe: 'Project name to stop',
          type: 'string'
        })
        .option('all', {
          alias: 'a',
          describe: 'Stop all deployments',
          type: 'boolean',
          default: false
        });
    },
    async async (argv) => {
      if (argv.all) {
        await orchestrator.stopAll();
      } else if (argv.name) {
        await orchestrator.stopProject(argv.name);
      } else {
        console.error('Please specify --name or --all');
        process.exit(1);
      }
    }
  )
  .command(
    'health',
    'Check system health',
    {},
    async async () => {
      const health = await orchestrator.healthCheck();
      console.log('System Health Check:');
      console.log(JSON.stringify(health, null, 2));
    }
  )
  .command(
    'init',
    'Initialize container environment',
    (yargs) => {
      return yargs
        .option('type', {
          alias: 't',
          describe: 'Project type',
          choices: ['node', 'cpp', 'python', 'go'],
          default: 'node'
        })
        .option('name', {
          alias: 'n',
          describe: 'Project name',
          type: 'string',
          demandOption: true
        });
    },
    async async (argv) => {
      await initializeProject(argv);
    }
  )
  .help()
  .alias('help', 'h')
  .version()
  .alias('version', 'v')
  .argv;

// Docker command handlers
async function setupDocker(argv: any) {
  console.log(`Setting up Docker environment for ${argv.name}`);
  
  await dockerService.setupDockerEnvironment({
    projectName: argv.name,
    environment: argv.environment,
    baseImage: argv['base-image'],
    ports: argv.ports,
    volumes: argv.volumes,
    enableDebug: argv.debug,
    enableHotReload: argv['hot-reload'],
    cppSupport: argv.cpp
  });
  
  console.log('Docker environment setup complete!');
}

async function buildDocker(argv: any) {
  console.log(`Building Docker image for ${argv.name}`);
  
  await dockerService.buildImage({
    projectName: argv.name,
    environment: argv.environment
  });
  
  console.log('Docker image built successfully!');
}

async function runDocker(argv: any) {
  console.log(`Running Docker container for ${argv.name}`);
  
  await dockerService.runContainer({
    projectName: argv.name,
    environment: argv.environment
  });
  
  console.log('Docker container started!');
}

async function stopDocker(argv: any) {
  console.log(`Stopping Docker container for ${argv.name}`);
  
  await dockerService.stopContainer({
    projectName: argv.name,
    environment: argv.environment
  });
  
  console.log('Docker container stopped!');
}

async function removeDocker(argv: any) {
  console.log(`Removing Docker container for ${argv.name}`);
  
  await orchestrator.removeProject(argv.name);
  
  console.log('Docker container removed!');
}

// QEMU command handlers
async function createQEMU(argv: any) {
  console.log(`Creating QEMU container: ${argv.name}`);
  
  const ports = argv.ports?.map((p: string) => {
    const [host, guest] = p.split(':');
    return { host: parseInt(host), guest: parseInt(guest) };
  });
  
  const container = await qemuService.createContainer({
    name: argv.name,
    architecture: argv.architecture,
    memory: argv.memory,
    cpus: argv.cpus,
    diskSize: '10G',
    image: argv.image,
    networkMode: 'nat',
    ports,
    enableKVM: argv.kvm,
    enableVNC: argv.vnc
  });
  
  console.log(`QEMU container created: ${container.id}`);
}

async function startQEMU(argv: any) {
  console.log(`Starting QEMU container: ${argv.name}`);
  
  const containers = await qemuService.listContainers(true);
  const container = containers.find(c => c.name === argv.name);
  
  if (!container) {
    console.error(`Container not found: ${argv.name}`);
    process.exit(1);
  }
  
  await qemuService.startContainer(container.id);
  console.log('QEMU container started!');
}

async function stopQEMU(argv: any) {
  console.log(`Stopping QEMU container: ${argv.name}`);
  
  const containers = await qemuService.listContainers(true);
  const container = containers.find(c => c.name === argv.name);
  
  if (!container) {
    console.error(`Container not found: ${argv.name}`);
    process.exit(1);
  }
  
  await qemuService.stopContainer(container.id);
  console.log('QEMU container stopped!');
}

async function removeQEMU(argv: any) {
  console.log(`Removing QEMU container: ${argv.name}`);
  
  const containers = await qemuService.listContainers(true);
  const container = containers.find(c => c.name === argv.name);
  
  if (!container) {
    console.error(`Container not found: ${argv.name}`);
    process.exit(1);
  }
  
  await qemuService.removeContainer(container.id);
  console.log('QEMU container removed!');
}

async function execQEMU(argv: any) {
  const command = argv._.slice(2); // Get command after 'qemu exec'
  
  if (command.length === 0) {
    console.error('Please provide a command to execute');
    process.exit(1);
  }
  
  const containers = await qemuService.listContainers(true);
  const container = containers.find(c => c.name === argv.name);
  
  if (!container) {
    console.error(`Container not found: ${argv.name}`);
    process.exit(1);
  }
  
  const result = await qemuService.execCommand(container.id, command as string[]);
  console.log(result);
}

async function snapshotQEMU(argv: any) {
  const snapshotName = argv._[2] || `snapshot-${Date.now()}`;
  
  const containers = await qemuService.listContainers(true);
  const container = containers.find(c => c.name === argv.name);
  
  if (!container) {
    console.error(`Container not found: ${argv.name}`);
    process.exit(1);
  }
  
  await qemuService.createSnapshot(container.id, snapshotName);
  console.log(`Snapshot created: ${snapshotName}`);
}

// Orchestrator command handlers
async function deployProject(argv: any) {
  const config: ContainerConfig = {
    name: argv.name,
    runtime: argv.runtime as ContainerRuntime,
    environment: argv.environment as Environment,
    baseImage: 'node:18-alpine'
  };
  
  const status = await orchestrator.deployProject(config);
  console.log(`Deployment status: ${status.status}`);
  
  if (status.error) {
    console.error(`Error: ${status.error}`);
  }
}

async function deployFromConfig(configPath: string) {
  console.log(`Deploying from configuration: ${configPath}`);
  await orchestrator.importConfiguration(configPath);
}

async function interactiveDeploy() {
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'name',
      message: 'Project name:',
      validate: (input) => input.length > 0
    },
    {
      type: 'list',
      name: 'runtime',
      message: 'Container runtime:',
      choices: ['docker', 'qemu']
    },
    {
      type: 'list',
      name: 'environment',
      message: 'Environment:',
      choices: ['local', 'dev', 'dev-demo', 'demo', 'release']
    },
    {
      type: 'input',
      name: 'baseImage',
      message: 'Base image:',
      default: 'node:18-alpine'
    },
    {
      type: 'input',
      name: 'ports',
      message: 'Ports (comma-separated):',
      default: '3000',
      filter: (input) => input.split(',').map((p: string) => parseInt(p.trim()))
    },
    {
      type: 'confirm',
      name: 'cppSupport',
      message: 'Enable C++ support?',
      default: false
    },
    {
      type: 'confirm',
      name: 'enableDebug',
      message: 'Enable debugging?',
      default: false
    },
    {
      type: 'confirm',
      name: 'enableHotReload',
      message: 'Enable hot reload?',
      default: false,
      when: (answers) => answers.runtime === 'docker'
    }
  ]);
  
  const config: ContainerConfig = {
    name: answers.name,
    runtime: answers.runtime,
    environment: answers.environment,
    baseImage: answers.baseImage,
    ports: answers.ports,
    cppSupport: answers.cppSupport,
    enableDebug: answers.enableDebug,
    enableHotReload: answers.enableHotReload
  };
  
  const status = await orchestrator.deployProject(config);
  console.log(`\nDeployment complete!`);
  console.log(`Status: ${status.status}`);
  
  if (status.ports) {
    console.log('Exposed ports:');
    status.ports.forEach(p => {
      console.log(`  - ${p.host} -> ${p.container}`);
    });
  }
}

async function listDeployments(argv: any) {
  const deployments = await orchestrator.listDeployments(argv.all);
  
  if (argv.format === 'json') {
    console.log(JSON.stringify(deployments, null, 2));
  } else if (argv.format === 'yaml') {
    // Simple YAML output
    deployments.forEach(d => {
      console.log(`- name: ${d.name}`);
      console.log(`  runtime: ${d.runtime}`);
      console.log(`  status: ${d.status}`);
      if (d.containerId) console.log(`  containerId: ${d.containerId}`);
      if (d.ports) {
        console.log('  ports:');
        d.ports.forEach(p => {
          console.log(`    - host: ${p.host}`);
          console.log(`      container: ${p.container}`);
        });
      }
    });
  } else {
    // Table format
    console.log('Name\t\tRuntime\t\tStatus\t\tContainer ID');
    console.log('----\t\t-------\t\t------\t\t------------');
    deployments.forEach(d => {
      console.log(`${d.name}\t\t${d.runtime}\t\t${d.status}\t\t${d.containerId || 'N/A'}`);
    });
  }
}

async function initializeProject(argv: any) {
  console.log(`Initializing ${argv.type} project: ${argv.name}`);
  
  const projectPath = path.join(process.cwd(), argv.name);
  
  if (fs.existsSync(projectPath)) {
    console.error(`Directory already exists: ${projectPath}`);
    process.exit(1);
  }
  
  await fileAPI.createDirectory(projectPath);
  
  // Create project structure based on type
  switch (argv.type) {
    case 'node':
      await initNodeProject(projectPath, argv.name);
      break;
    case 'cpp':
      await initCppProject(projectPath, argv.name);
      break;
    case 'python':
      await initPythonProject(projectPath, argv.name);
      break;
    case 'go':
      await initGoProject(projectPath, argv.name);
      break;
  }
  
  console.log(`Project initialized at: ${projectPath}`);
  console.log(`\nNext steps:`);
  console.log(`  cd ${argv.name}`);
  console.log(`  setup-container docker setup -n ${argv.name}`);
  console.log(`  setup-container docker build -n ${argv.name}`);
  console.log(`  setup-container docker run -n ${argv.name}`);
}

async function initNodeProject(projectPath: string, name: string) {
  // Create package.json
  const packageJson = {
    name,
    version: '1.0.0',
    description: `${name} project`,
    main: 'src/index.js',
    scripts: {
      start: 'node src/index.js',
      dev: 'nodemon src/index.js',
      test: 'jest',
      build: 'tsc'
    },
    dependencies: {},
    devDependencies: {
      'nodemon': '^2.0.0',
      'jest': '^29.0.0',
      'typescript': '^5.0.0'
    }
  };
  
  await fileAPI.createFile(path.join(projectPath, 'package.json', { type: FileType.TEMPORARY }),
    JSON.stringify(packageJson, null, 2)
  );
  
  // Create source directory
  await fileAPI.createDirectory(path.join(projectPath));
  
  // Create index.js
  const indexJs = `console.log('Hello from ${name}!');

const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.listen(port, () => {
  console.log(\`Server listening on port \${port}\`);
});
`;
  
  await fileAPI.createFile(path.join(projectPath, 'src', { type: FileType.TEMPORARY }), indexJs);
}

async function initCppProject(projectPath: string, name: string) {
  // Create directories
  await fileAPI.createDirectory(path.join(projectPath));
  await fileAPI.createDirectory(path.join(projectPath));
  await fileAPI.createDirectory(path.join(projectPath));
  
  // Create CMakeLists.txt
  const cmake = `cmake_minimum_required(VERSION 3.16)
project(${name} VERSION 1.0.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

add_executable(${name} src/main.cpp)
target_include_directories(${name} PRIVATE include)

enable_testing()
add_subdirectory(tests)
`;
  
  await fileAPI.createFile(path.join(projectPath, 'CMakeLists.txt', { type: FileType.TEMPORARY }), cmake);
  
  // Create main.cpp
  const mainCpp = `#include <iostream>

int main() {
    std::cout << "Hello from ${name}!" << std::endl;
    return 0;
}
`;
  
  await fileAPI.createFile(path.join(projectPath, 'src', { type: FileType.TEMPORARY }), mainCpp);
}

async function initPythonProject(projectPath: string, name: string) {
  // Create requirements.txt
  await fileAPI.createFile(path.join(projectPath, 'requirements.txt', { type: FileType.TEMPORARY }), 'flask>=2.0.0\npytest>=7.0.0\n');
  
  // Create main.py
  const mainPy = `from flask import Flask

app = Flask(__name__)

@app.route('/')
def hello():
    return 'Hello from ${name}!'

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=3000)
`;
  
  await fileAPI.createFile(path.join(projectPath, 'main.py', { type: FileType.TEMPORARY }), mainPy);
}

async function initGoProject(projectPath: string, name: string) {
  // Create go.mod
  await fileAPI.createFile(path.join(projectPath, 'go.mod', { type: FileType.TEMPORARY }), `module ${name}\n\ngo 1.20\n`);
  
  // Create main.go
  const mainGo = `package main

import (
    "fmt"
    "net/http"
)

func main() {
    fmt.Println("Hello from ${name}!")
    
    http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
        fmt.Fprintf(w, "Hello World!")
    })
    
    fmt.Println("Server listening on port 3000")
    http.ListenAndServe(":3000", nil)
}
`;
  
  await fileAPI.createFile(path.join(projectPath, 'main.go', { type: FileType.TEMPORARY }), mainGo);
}