#!/usr/bin/env bun
/**
 * Migrated from: migrate-npm-to-bun.sh
 * Converts npm/yarn commands to bun equivalents
 */

import { $ } from 'bun';
import { readFile, writeFile } from 'fs/promises';
import { glob } from 'glob';

async function main() {
  console.log("🔄 Migrating npm/yarn to bun...");
  
  // Add bun to PATH
  process.env.PATH = `${process.env.HOME}/.bun/bin:${process.env.PATH}`;
  
  // Update package.json scripts
  console.log("📦 Updating package.json scripts...");
  
  const packageJsonFiles = await glob('**/package.json', {
    ignore: ['**/node_modules/**', '**/.jj/**']
  });
  
  for (const file of packageJsonFiles) {
    try {
      const content = await readFile(file, 'utf-8');
      let updated = content
        .replace(/"npm install"/g, '"bun install"')
        .replace(/"npm run ([^"]+)"/g, '"bun run $1"')
        .replace(/"npm test"/g, '"bun test"')
        .replace(/"npm start"/g, '"bun start"')
        .replace(/"npm build"/g, '"bun build"')
        .replace(/"yarn install"/g, '"bun install"')
        .replace(/"yarn ([^"]+)"/g, '"bun $1"')
        .replace(/"npx ([^"]+)"/g, '"bunx $1"');
      
      if (content !== updated) {
        await writeFile(file, updated);
        console.log(`  ✅ Updated: ${file}`);
      }
    } catch (error) {
      console.error(`  ❌ Error updating ${file}: ${error}`);
    }
  }
  
  // Update TypeScript/JavaScript files
  console.log("📝 Updating TypeScript/JavaScript files...");
  
  const codeFiles = await glob('**/*.{ts,tsx,js,jsx}', {
    ignore: ['**/node_modules/**', '**/.jj/**', '**/dist/**', '**/build/**']
  });
  
  for (const file of codeFiles) {
    try {
      const content = await readFile(file, 'utf-8');
      let updated = content
        .replace(/'npm install'/g, "'bun install'")
        .replace(/"npm install"/g, '"bun install"')
        .replace(/`npm install/g, '`bun install')
        .replace(/'npm run ([^']+)'/g, "'bun run $1'")
        .replace(/"npm run ([^"]+)"/g, '"bun run $1"')
        .replace(/`npm run ([^`]+)`/g, '`bun run $1`')
        .replace(/'yarn ([^']+)'/g, "'bun $1'")
        .replace(/"yarn ([^"]+)"/g, '"bun $1"')
        .replace(/`yarn ([^`]+)`/g, '`bun $1`')
        .replace(/'npx ([^']+)'/g, "'bunx $1'")
        .replace(/"npx ([^"]+)"/g, '"bunx $1"')
        .replace(/`npx ([^`]+)`/g, '`bunx $1`');
      
      if (content !== updated) {
        await writeFile(file, updated);
        console.log(`  ✅ Updated: ${file}`);
      }
    } catch (error) {
      console.error(`  ❌ Error updating ${file}: ${error}`);
    }
  }
  
  // Update shell scripts
  console.log("🐚 Updating shell scripts...");
  
  const shellFiles = await glob('**/*.sh', {
    ignore: ['**/node_modules/**', '**/.jj/**']
  });
  
  for (const file of shellFiles) {
    try {
      const content = await readFile(file, 'utf-8');
      let updated = content
        .replace(/npm install/g, 'bun install')
        .replace(/npm run ([^\s;&|]+)/g, 'bun run $1')
        .replace(/npm test/g, 'bun test')
        .replace(/npm start/g, 'bun start')
        .replace(/npm build/g, 'bun build')
        .replace(/yarn install/g, 'bun install')
        .replace(/yarn ([^\s;&|]+)/g, 'bun $1')
        .replace(/npx ([^\s;&|]+)/g, 'bunx $1');
      
      if (content !== updated) {
        await writeFile(file, updated);
        console.log(`  ✅ Updated: ${file}`);
      }
    } catch (error) {
      console.error(`  ❌ Error updating ${file}: ${error}`);
    }
  }
  
  // Update Markdown files
  console.log("📚 Updating Markdown files...");
  
  const mdFiles = await glob('**/*.md', {
    ignore: ['**/node_modules/**', '**/.jj/**']
  });
  
  for (const file of mdFiles) {
    try {
      const content = await readFile(file, 'utf-8');
      let updated = content
        .replace(/npm install/g, 'bun install')
        .replace(/npm run ([^\s`]+)/g, 'bun run $1')
        .replace(/npm test/g, 'bun test')
        .replace(/npm start/g, 'bun start')
        .replace(/npm build/g, 'bun build')
        .replace(/yarn install/g, 'bun install')
        .replace(/yarn ([^\s`]+)/g, 'bun $1')
        .replace(/npx ([^\s`]+)/g, 'bunx $1');
      
      if (content !== updated) {
        await writeFile(file, updated);
        console.log(`  ✅ Updated: ${file}`);
      }
    } catch (error) {
      console.error(`  ❌ Error updating ${file}: ${error}`);
    }
  }
  
  // Update Docker files
  console.log("🐳 Updating Docker files...");
  
  const dockerFiles = await glob('**/Dockerfile*', {
    ignore: ['**/node_modules/**', '**/.jj/**']
  });
  
  for (const file of dockerFiles) {
    try {
      const content = await readFile(file, 'utf-8');
      let updated = content
        .replace(/RUN npm install/g, 'RUN bun install')
        .replace(/RUN yarn install/g, 'RUN bun install')
        .replace(/CMD \["npm", "start"\]/g, 'CMD ["bun", "start"]')
        .replace(/CMD \["yarn", "start"\]/g, 'CMD ["bun", "start"]');
      
      if (content !== updated) {
        await writeFile(file, updated);
        console.log(`  ✅ Updated: ${file}`);
      }
    } catch (error) {
      console.error(`  ❌ Error updating ${file}: ${error}`);
    }
  }
  
  console.log("\n✅ Migration to Bun complete!");
  console.log("📋 Summary:");
  console.log("  - Updated package.json scripts");
  console.log("  - Updated TypeScript/JavaScript files");
  console.log("  - Updated shell scripts");
  console.log("  - Updated Markdown documentation");
  console.log("  - Updated Docker files");
  console.log("\n💡 Next steps:");
  console.log("  1. Run 'bun install' to install dependencies");
  console.log("  2. Test your application with 'bun test'");
  console.log("  3. Start your application with 'bun start' or 'bun run dev'");
}

// Run main function
if (import.meta.main) {
  main().catch(console.error);
}