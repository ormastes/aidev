#!/usr/bin/env ts-node
/**
 * Example: Build Docker image for a theme
 * Usage: ts-node build-theme.ts <theme-name>
 */

import { containerEnv } from '../pipe';
import { path } from '../../infra_external-log-lib/src';

async function buildThemeImage(themeName: string) {
  console.log(`\n🐳 Building Docker image for theme: ${themeName}\n`);

  try {
    // Check if Docker is available
    const dockerAvailable = await containerEnv.isDockerAvailable();
    if (!dockerAvailable) {
      throw new Error('Docker is not installed or not running');
    }

    const version = await containerEnv.getDockerVersion();
    console.log(`✅ ${version}\n`);

    // Generate Dockerfile for the theme
    console.log('📝 Generating Dockerfile...');
    const dockerfile = await containerEnv.generateDockerfile(themeName, {
      base: 'node:18-alpine',
      ports: [3000],
      environment: {
        NODE_ENV: "production",
        THEME_NAME: themeName
      },
      healthcheck: {
        test: 'curl -f http://localhost:3000/health || exit 1',
        interval: '30s',
        timeout: '10s',
        retries: 3
      }
    });

    console.log('Generated Dockerfile:');
    console.log('-------------------');
    console.log(dockerfile);
    console.log('-------------------\n');

    // Build the Docker image
    console.log('🔨 Building Docker image...');
    const buildOutput = await containerEnv.buildImage(themeName, {
      tag: `aidev/${themeName}:latest`,
      buildArgs: {
        BUILD_DATE: new Date().toISOString()
      }
    });

    console.log('✅ Image built successfully!');
    console.log(`   Tag: aidev/${themeName}:latest\n`);

    // List all containers to show the new image
    console.log('📋 Current containers:');
    const containers = await containerEnv.listContainers(true);
    containers.forEach(container => {
      console.log(`   - ${container.name} (${container.image}): ${container.status}`);
    });

    console.log('\n✨ Done! You can now run the container with:');
    console.log(`   npm run docker:run ${themeName}`);
    console.log(`   or`);
    console.log(`   docker run -d -p 3000:3000 --name ${themeName} aidev/${themeName}:latest\n`);

  } catch (error) {
    console.error('❌ Error building image:', error);
    process.exit(1);
  }
}

// Main execution
const themeName = process.argv[2];

if (!themeName) {
  console.error('Usage: ts-node build-theme.ts <theme-name>');
  console.error('Example: ts-node build-theme.ts mate-dealer');
  process.exit(1);
}

buildThemeImage(themeName);