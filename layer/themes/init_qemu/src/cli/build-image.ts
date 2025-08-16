#!/usr/bin/env node
/**
 * QEMU Image Builder CLI
 * Command-line interface for building QEMU images
 */

import { Command } from "commander";
import { QEMUImageBuilder, ImageBuildConfig } from '../services/QEMUImageBuilder';
import { path } from '../../../infra_external-log-lib/src';
import * as fs from 'fs/promises';
import chalk from 'chalk';
import ora from 'ora';
import { getFileAPI, FileType } from '../../../infra_external-log-lib/pipe';

const fileAPI = getFileAPI();


const program = new Command();
const builder = new QEMUImageBuilder();

// Progress spinner
let spinner: any;

// Setup event handlers
builder.on('build:start', (data) => {
  console.log(chalk.cyan(`Starting build for ${data.config.name}...`));
});

builder.on('build:progress', (progress) => {
  if (spinner) {
    spinner.text = `${progress.stage}: ${progress.message} (${progress.progress}%)`;
  }
});

builder.on('build:complete', (image) => {
  if (spinner) spinner.succeed('Build complete!');
  console.log(chalk.green('\n✓ Image built successfully:'));
  console.log(chalk.white(`  Name: ${image.name}`));
  console.log(chalk.white(`  Path: ${image.path}`));
  console.log(chalk.white(`  Size: ${(image.size / 1024 / 1024).toFixed(2)} MB`));
  console.log(chalk.white(`  Format: ${image.format}`));
  console.log(chalk.white(`  Checksum: ${image.checksum}`));
});

builder.on('build:error', (data) => {
  if (spinner) spinner.fail('Build failed');
  console.error(chalk.red('Error:'), data.error.message);
});

program
  .name('qemu-image-builder')
  .description('Build QEMU virtual machine images')
  .version('1.0.0');

// Build Ubuntu image command
program
  .command('ubuntu')
  .description('Build Ubuntu cloud image')
  .option('-n, --name <name>', 'Image name', 'ubuntu-cloud')
  .option('-v, --version <version>', 'Ubuntu version', '24.04')
  .option('-s, --size <size>', 'Disk size', '20G')
  .option('-u, --username <username>', 'Default username', 'ubuntu')
  .option('-p, --password <password>', 'Default password', 'ubuntu')
  .option('-k, --ssh-key <path>', 'SSH public key file')
  .option('--packages <packages...>', 'Additional packages to install')
  .action(async (options) => {
    spinner = ora('Building Ubuntu image...').start();
    
    try {
      // Read SSH key if provided
      let sshKey;
      if (options.sshKey) {
        sshKey = await fileAPI.readFile(options.sshKey, 'utf-8');
      }

      const image = await builder.buildUbuntuCloudImage({
        name: options.name,
        version: options.version,
        size: options.size,
        username: options.username,
        password: options.password,
        sshKey,
        packages: options.packages
      });

      process.exit(0);
    } catch (error: any) {
      spinner.fail('Failed to build image');
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

// Build Alpine image command
program
  .command('alpine')
  .description('Build Alpine Linux image')
  .option('-n, --name <name>', 'Image name', 'alpine')
  .option('-v, --version <version>', 'Alpine version', '3.18')
  .option('-s, --size <size>', 'Disk size', '2G')
  .option('--packages <packages...>', 'Additional packages to install')
  .action(async (options) => {
    spinner = ora('Building Alpine image...').start();
    
    try {
      const image = await builder.buildAlpineImage({
        name: options.name,
        version: options.version,
        size: options.size,
        packages: options.packages
      });

      process.exit(0);
    } catch (error: any) {
      spinner.fail('Failed to build image');
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

// Build custom image command
program
  .command('custom')
  .description('Build custom image from configuration file')
  .argument('<config>', 'Configuration file path')
  .action(async (configPath) => {
    spinner = ora('Building custom image...').start();
    
    try {
      const configContent = await fileAPI.readFile(configPath, 'utf-8');
      const config: ImageBuildConfig = JSON.parse(configContent);
      
      const image = await builder.buildImage(config);
      
      process.exit(0);
    } catch (error: any) {
      spinner.fail('Failed to build image');
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

// Build kernel test image command
program
  .command('kernel')
  .description('Build kernel test image')
  .option('-n, --name <name>', 'Image name', 'kernel-test')
  .option('-k, --kernel <path>', 'Kernel image path', { required: true })
  .option('-i, --initrd <path>', 'Initrd image path')
  .option('-r, --rootfs <path>', 'Root filesystem tarball')
  .option('-s, --size <size>', 'Disk size', '10G')
  .action(async (options) => {
    spinner = ora('Building kernel test image...').start();
    
    try {
      const image = await builder.buildKernelTestImage({
        name: options.name,
        kernelPath: options.kernel,
        initrdPath: options.initrd,
        rootfsPath: options.rootfs,
        size: options.size
      });

      process.exit(0);
    } catch (error: any) {
      spinner.fail('Failed to build image');
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

// List images command
program
  .command('list')
  .description('List available images')
  .action(async () => {
    try {
      const images = await builder.listImages();
      
      if (images.length === 0) {
        console.log(chalk.yellow('No images found'));
        return;
      }

      console.log(chalk.cyan('\nAvailable QEMU Images:'));
      console.log(chalk.gray('─'.repeat(80)));
      
      for (const image of images) {
        console.log(chalk.white(`\n${image.name}`));
        console.log(chalk.gray(`  ID: ${image.id}`));
        console.log(chalk.gray(`  Distro: ${image.distro} ${image.version}`));
        console.log(chalk.gray(`  Size: ${(image.size / 1024 / 1024).toFixed(2)} MB`));
        console.log(chalk.gray(`  Format: ${image.format}`));
        console.log(chalk.gray(`  Created: ${new Date(image.created).toLocaleString()}`));
        console.log(chalk.gray(`  Path: ${image.path}`));
      }
      
      console.log(chalk.gray('─'.repeat(80)));
      console.log(chalk.cyan(`Total: ${images.length} image(s)`));
    } catch (error: any) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

// Delete image command
program
  .command('delete <name>')
  .description('Delete an image')
  .action(async (name) => {
    try {
      const success = await builder.deleteImage(name);
      
      if (success) {
        console.log(chalk.green(`✓ Image '${name}' deleted successfully`));
      } else {
        console.log(chalk.yellow(`Image '${name}' not found`));
      }
    } catch (error: any) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

// Generate sample configuration
program
  .command('init')
  .description('Generate sample configuration file')
  .option('-o, --output <path>', 'Output file path', 'image-config.json')
  .action(async (options) => {
    const sampleConfig: ImageBuildConfig = {
      name: 'my-custom-image',
      distro: 'ubuntu',
      version: '24.04',
      architecture: 'amd64',
      size: '20G',
      format: 'qcow2',
      packages: [
        'openssh-server',
        'docker.io',
        'git',
        'vim',
        'curl',
        'wget'
      ],
      users: [
        {
          username: 'admin',
          password: "PLACEHOLDER",
          groups: ['sudo', 'docker'],
          sudo: true
        }
      ],
      networkConfig: {
        hostname: 'my-vm',
        interfaces: [
          {
            name: 'eth0',
            type: 'dhcp'
          }
        ],
        dns: ['8.8.8.8', '8.8.4.4']
      },
      customScripts: [
        '#!/bin/bash',
        'echo "Custom setup script"',
        'apt-get update',
        'apt-get upgrade -y'
      ]
    };

    try {
      await fileAPI.createFile(options.output, JSON.stringify(sampleConfig, { type: FileType.TEMPORARY }));
      console.log(chalk.green(`✓ Sample configuration saved to ${options.output}`));
      console.log(chalk.gray('\nEdit this file and run:'));
      console.log(chalk.cyan(`  qemu-image-builder custom ${options.output}`));
    } catch (error: any) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

program.parse();

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}