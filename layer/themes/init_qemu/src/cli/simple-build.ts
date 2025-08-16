#!/usr/bin/env node
/**
 * Simple QEMU Image Builder CLI
 * Quick and easy QEMU image creation
 */

import { SimpleImageBuilder } from '../services/SimpleImageBuilder';
import { Command } from 'commander';
import chalk from 'chalk';

const builder = new SimpleImageBuilder();
const program = new Command();

program
  .name('simple-qemu-build')
  .description('Simple QEMU image builder')
  .version('1.0.0');

// Check requirements command
program
  .command('check')
  .description('Check if required tools are installed')
  .action(async () => {
    const ready = await builder.checkRequirements();
    if (ready) {
      console.log(chalk.green('\n✓ All requirements met! You can build images.'));
    } else {
      console.log(chalk.red('\n✗ Some requirements are missing. Please install them.'));
      process.exit(1);
    }
  });

// Create basic image
program
  .command('create <name>')
  .description('Create a basic QEMU disk image')
  .option('-s, --size <size>', 'Disk size (e.g., 10G)', '10G')
  .option('-f, --format <format>', 'Image format (qcow2, raw, vdi)', 'qcow2')
  .action(async (name, options) => {
    try {
      console.log(chalk.cyan('Creating QEMU image...'));
      const imagePath = await builder.createImage({
        name,
        size: options.size,
        format: options.format
      });
      console.log(chalk.green(`\n✓ Image created: ${imagePath}`));
      console.log(chalk.gray('\nTo use this image:'));
      console.log(chalk.white(`  qemu-system-x86_64 -hda ${imagePath} -m 2G`));
    } catch (error: any) {
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

// Create Ubuntu image
program
  .command('ubuntu <name>')
  .description('Create Ubuntu-based QEMU image')
  .option('-s, --size <size>', 'Disk size', '20G')
  .action(async (name, options) => {
    try {
      console.log(chalk.cyan('Creating Ubuntu QEMU image...'));
      const imagePath = await builder.createUbuntuImage(name, options.size);
      console.log(chalk.green(`\n✓ Ubuntu image created: ${imagePath}`));
      console.log(chalk.gray('\nTo boot this image:'));
      console.log(chalk.white(`  qemu-system-x86_64 -enable-kvm -m 2G \\`));
      console.log(chalk.white(`    -drive file=${imagePath},if=virtio \\`));
      console.log(chalk.white(`    -netdev user,id=net0,hostfwd=tcp::2222-:22 \\`));
      console.log(chalk.white(`    -device virtio-net,netdev=net0`));
    } catch (error: any) {
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

// Create Alpine image
program
  .command('alpine <name>')
  .description('Create Alpine Linux QEMU image')
  .option('-s, --size <size>', 'Disk size', '2G')
  .action(async (name, options) => {
    try {
      console.log(chalk.cyan('Creating Alpine QEMU image...'));
      const imagePath = await builder.createAlpineImage(name, options.size);
      console.log(chalk.green(`\n✓ Alpine image created: ${imagePath}`));
      console.log(chalk.gray('Boot script created to install Alpine'));
    } catch (error: any) {
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

// List images
program
  .command('list')
  .description('List all created images')
  .action(async () => {
    try {
      const images = await builder.listImages();
      
      if (images.length === 0) {
        console.log(chalk.yellow('No images found in gen/qemu-images/'));
        return;
      }

      console.log(chalk.cyan('\nQEMU Images:'));
      console.log(chalk.gray('─'.repeat(60)));
      
      for (const image of images) {
        console.log(chalk.white(`\n${image.name}`));
        console.log(chalk.gray(`  File: ${image.file}`));
        console.log(chalk.gray(`  Size: ${(image.size / 1024 / 1024).toFixed(2)} MB`));
        console.log(chalk.gray(`  Created: ${new Date(image.created).toLocaleString()}`));
        if (image.type) {
          console.log(chalk.gray(`  Type: ${image.type} ${image.version || ''}`));
        }
      }
      
      console.log(chalk.gray('─'.repeat(60)));
      console.log(chalk.cyan(`Total: ${images.length} image(s)`));
    } catch (error: any) {
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

// Info command
program
  .command('info <image>')
  .description('Get detailed info about an image')
  .action(async (imagePath) => {
    try {
      const info = await builder.getImageInfo(imagePath);
      if (info) {
        console.log(chalk.cyan('\nImage Information:'));
        console.log(JSON.stringify(info, null, 2));
      }
    } catch (error: any) {
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

program.parse();

// Show help if no command
if (!process.argv.slice(2).length) {
  program.outputHelp();
}