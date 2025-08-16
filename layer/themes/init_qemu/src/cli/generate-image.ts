#!/usr/bin/env node
/**
 * QEMU Image Generator
 * Generates QEMU images in gen/ folder
 */

import { MockImageBuilder } from '../services/MockImageBuilder';
import { Command } from "commander";
import chalk from 'chalk';

const builder = new MockImageBuilder();
const program = new Command();

program
  .name('qemu-generate')
  .description('Generate QEMU images in gen/ folder')
  .version('1.0.0');

// Generate Ubuntu image
program
  .command('ubuntu [name]')
  .description('Generate Ubuntu QEMU image')
  .option('-v, --version <version>', 'Ubuntu version', '22.04')
  .option('-s, --size <size>', 'Disk size', '20G')
  .action(async (name, options) => {
    try {
      const imageName = name || `ubuntu-${options.version}`;
      console.log(chalk.cyan('🔨 Generating Ubuntu QEMU image...'));
      
      const imagePath = await builder.createUbuntuMockImage(
        imageName,
        options.version,
        options.size
      );
      
      console.log(chalk.green('\n✅ Ubuntu image generated successfully!'));
      console.log(chalk.white(`📁 Image: ${imagePath}`));
      console.log(chalk.gray('\n📝 Image details:'));
      console.log(chalk.gray(`  • Distro: Ubuntu ${options.version}`));
      console.log(chalk.gray(`  • Size: ${options.size}`));
      console.log(chalk.gray(`  • Format: qcow2`));
      console.log(chalk.gray(`  • Location: gen/qemu-images/`));
      
    } catch (error: any) {
      console.error(chalk.red(`❌ Error: ${error.message}`));
      process.exit(1);
    }
  });

// Generate Alpine image
program
  .command('alpine [name]')
  .description('Generate Alpine Linux QEMU image')
  .option('-v, --version <version>', 'Alpine version', '3.18')
  .option('-s, --size <size>', 'Disk size', '2G')
  .action(async (name, options) => {
    try {
      const imageName = name || `alpine-${options.version}`;
      console.log(chalk.cyan('🔨 Generating Alpine QEMU image...'));
      
      const imagePath = await builder.createAlpineMockImage(
        imageName,
        options.version,
        options.size
      );
      
      console.log(chalk.green('\n✅ Alpine image generated successfully!'));
      console.log(chalk.white(`📁 Image: ${imagePath}`));
      console.log(chalk.gray('\n📝 Image details:'));
      console.log(chalk.gray(`  • Distro: Alpine ${options.version}`));
      console.log(chalk.gray(`  • Size: ${options.size}`));
      console.log(chalk.gray(`  • Format: qcow2`));
      
    } catch (error: any) {
      console.error(chalk.red(`❌ Error: ${error.message}`));
      process.exit(1);
    }
  });

// Generate custom image
program
  .command('custom <name>')
  .description('Generate custom QEMU image')
  .option('-s, --size <size>', 'Disk size', '10G')
  .option('-f, --format <format>', 'Image format', 'qcow2')
  .option('-d, --distro <distro>', "Distribution", 'linux')
  .option('-v, --version <version>', 'Version', '1.0')
  .action(async (name, options) => {
    try {
      console.log(chalk.cyan('🔨 Generating custom QEMU image...'));
      
      const imagePath = await builder.createMockImage({
        name,
        size: options.size,
        format: options.format,
        distro: options.distro,
        version: options.version
      });
      
      console.log(chalk.green('\n✅ Custom image generated successfully!'));
      console.log(chalk.white(`📁 Image: ${imagePath}`));
      
    } catch (error: any) {
      console.error(chalk.red(`❌ Error: ${error.message}`));
      process.exit(1);
    }
  });

// List images
program
  .command('list')
  .description('List all generated images')
  .action(async () => {
    try {
      const images = await builder.listImages();
      
      if (images.length === 0) {
        console.log(chalk.yellow('📭 No images found in gen/qemu-images/'));
        console.log(chalk.gray('Generate your first image with:'));
        console.log(chalk.cyan('  bun run src/cli/generate-image.ts ubuntu'));
        return;
      }

      console.log(chalk.cyan('\n📦 Generated QEMU Images:\n'));
      console.log(chalk.gray('─'.repeat(70)));
      
      for (const image of images) {
        console.log(chalk.white(`\n📀 ${image.name}`));
        console.log(chalk.gray(`   ID: ${image.id}`));
        console.log(chalk.gray(`   Distro: ${image.distro} ${image.version}`));
        console.log(chalk.gray(`   Size: ${image.size} (Virtual)`));
        console.log(chalk.gray(`   Format: ${image.format}`));
        console.log(chalk.gray(`   Created: ${new Date(image.created).toLocaleString()}`));
        console.log(chalk.gray(`   Path: ${image.path}`));
      }
      
      console.log(chalk.gray('\n' + '─'.repeat(70)));
      console.log(chalk.cyan(`📊 Total: ${images.length} image(s)\n`));
      
    } catch (error: any) {
      console.error(chalk.red(`❌ Error: ${error.message}`));
      process.exit(1);
    }
  });

// Init command
program
  .command('init')
  .description('Generate sample configuration')
  .option('-o, --output <path>', 'Output path', 'image-config.json')
  .action(async (options) => {
    try {
      await builder.generateSampleConfig(options.output);
      console.log(chalk.green(`✅ Sample configuration saved to ${options.output}`));
      
    } catch (error: any) {
      console.error(chalk.red(`❌ Error: ${error.message}`));
      process.exit(1);
    }
  });

// Quick start command
program
  .command("quickstart")
  .description('Generate a set of demo images')
  .action(async () => {
    try {
      console.log(chalk.cyan('🚀 Quick Start - Generating demo QEMU images...\n'));
      
      // Generate Ubuntu image
      console.log(chalk.blue('1️⃣  Creating Ubuntu 22.04 image...'));
      await builder.createUbuntuMockImage('ubuntu-demo', '22.04', '20G');
      
      // Generate Alpine image
      console.log(chalk.blue('\n2️⃣  Creating Alpine 3.18 image...'));
      await builder.createAlpineMockImage('alpine-demo', '3.18', '2G');
      
      // Generate custom development image
      console.log(chalk.blue('\n3️⃣  Creating development image...'));
      await builder.createMockImage({
        name: 'dev-environment',
        size: '50G',
        format: 'qcow2',
        distro: 'ubuntu',
        version: '24.04'
      });
      
      console.log(chalk.green('\n✨ Quick start complete! 3 demo images generated.\n'));
      
      // List all images
      const images = await builder.listImages();
      console.log(chalk.cyan('📦 Generated images:'));
      for (const image of images) {
        console.log(chalk.white(`  • ${image.name} (${image.size})`));
      }
      
      console.log(chalk.gray('\n📂 All images saved in: gen/qemu-images/'));
      console.log(chalk.gray('📋 View details with: bun run src/cli/generate-image.ts list'));
      
    } catch (error: any) {
      console.error(chalk.red(`❌ Error: ${error.message}`));
      process.exit(1);
    }
  });

program.parse();

// Show help if no command
if (!process.argv.slice(2).length) {
  console.log(chalk.cyan('🖥️  QEMU Image Generator\n'));
  console.log(chalk.gray('Generate QEMU virtual machine images in gen/ folder\n'));
  program.outputHelp();
  console.log(chalk.gray('\n💡 Quick start:'));
  console.log(chalk.cyan('   bun run src/cli/generate-image.ts quickstart\n'));
}