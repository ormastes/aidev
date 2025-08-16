#!/usr/bin/env ts-node
/**
 * Example: Generate and run docker-compose for platform themes
 * Usage: ts-node compose-platform.ts
 */

import { containerEnv } from '../pipe';
import { fs } from '../../infra_external-log-lib/src';
import { path } from '../../infra_external-log-lib/src';

async function composePlatform() {
  console.log('\n🐳 Docker Compose Platform Orchestration\n');

  try {
    // Check Docker availability
    const dockerAvailable = await containerEnv.isDockerAvailable();
    if(!dockerAvailable) {
      throw new Error('Docker is not installed or not running');
    }

    // Define the themes to orchestrate
    const themes = [
      'mate-dealer',
      'portal_gui-selector',
      'portal_security',
      'infra_story-reporter'
    ];

    console.log('📦 Themes to orchestrate:');
    themes.forEach(theme => console.log(`   - ${theme}`));
    console.log();

    // Generate docker-compose.yml
    console.log('📝 Generating docker-compose.yml...');
    const composeYaml = await containerEnv.generateCompose(themes);

    // Save to file
    const composePath = path.join(process.cwd(), 'docker-compose.generated.yml');
    await fileAPI.createFile(composePath, composeYaml, { type: FileType.TEMPORARY });
    console.log(`✅ Saved to: ${composePath}\n`);

    // Display the generated compose file
    console.log('Generated docker-compose.yml:');
    console.log('----------------------------');
    console.log(composeYaml);
    console.log('----------------------------\n');

    // Validate the compose file
    console.log('🔍 Validating compose file...');
    const isValid = await containerEnv.validateComposeFile(composePath);
    if(!isValid) {
      throw new Error('Invalid docker-compose.yml generated');
    }
    console.log('✅ Compose file is valid!\n');

    // Provide instructions for running
    console.log('📋 Next steps:');
    console.log('1. Build all images:');
    console.log(`   docker-compose -f ${composePath} build\n`);
    console.log('2. Start all services:');
    console.log(`   docker-compose -f ${composePath} up -d\n`);
    console.log('3. View logs:');
    console.log(`   docker-compose -f ${composePath} logs -f\n`);
    console.log('4. Stop all services:');
    console.log(`   docker-compose -f ${composePath} down\n`);

    // Optionally start the services
    const readline = require("readline");
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.question('Would you like to start the services now? (y/n): ', async (answer) => {
      if (answer.toLowerCase() === 'y') {
        console.log('\n🚀 Starting services...');
        try {
          const output = await containerEnv.composeUp({
            file: composePath,
            detach: true,
            build: true
          });
          console.log('✅ Services started successfully!');
          console.log(output);
          
          // Show running containers
          console.log('\n📋 Running containers:');
          const containers = await containerEnv.listContainers();
          containers.forEach(container => {
            console.log(`   - ${container.name}: ${container.status}`);
          });
        } catch (error) {
          console.error('❌ Failed to start services:', error);
        }
      }
      rl.close();
      console.log('\n✨ Done!');
    });

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run the example
async composePlatform();