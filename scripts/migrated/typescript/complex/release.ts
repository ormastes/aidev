#!/usr/bin/env bun
/**
 * Migrated from: release.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.743Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  // AI Dev Portal Release Script
  // This script packages and prepares the portal for deployment
  console.log("🚀 AI Dev Portal Release Process Started");
  console.log("========================================");
  // Set variables
  await $`RELEASE_DIR="release_$(date +%Y%m%d_%H%M%S)"`;
  await $`CURRENT_DIR=$(pwd)`;
  // Create release directory
  console.log("📁 Creating release directory: $RELEASE_DIR");
  await mkdir(""../$RELEASE_DIR"", { recursive: true });
  // Compile TypeScript files
  console.log("🔨 Compiling TypeScript files...");
  await $`bunx tsc --skipLibCheck || echo "Some TypeScript compilation warnings, continuing..."`;
  // Compile client-side TypeScript
  console.log("🔨 Compiling client-side TypeScript...");
  process.chdir("public/ts");
  await $`bunx tsc app.ts --outDir ../js --lib es2015,dom || echo "Client compilation done"`;
  process.chdir("../..");
  // Copy necessary files
  console.log("📋 Copying files to release directory...");
  await copyFile("-r public", ""../$RELEASE_DIR/"");
  await copyFile("-r data", ""../$RELEASE_DIR/"");
  await copyFile("-r config", ""../$RELEASE_DIR/"");
  await copyFile("server.js", ""../$RELEASE_DIR/"");
  await copyFile("package.json", ""../$RELEASE_DIR/"");
  await copyFile("package-lock.json", ""../$RELEASE_DIR/"");
  await copyFile("README.md "../$RELEASE_DIR/" 2>/dev/null || echo "No README", "found"");
  // Create startup script
  console.log("📝 Creating startup script...");
  await $`cat > "../$RELEASE_DIR/start.sh" << 'EOF'`;
  console.log("🌟 Starting AI Dev Portal");
  console.log("=========================");
  // Check if node_modules exists
  if (! -d "node_modules" ) {; then
  console.log("📦 Installing dependencies...");
  await $`npm install --production`;
  }
  // Initialize database if needed
  if (! -f "data/ai_dev_portal.db" ) {; then
  console.log("🗄️ Initializing database...");
  await $`node init-db.js`;
  }
  // Start the server
  console.log("🚀 Starting server on port 3400...");
  console.log("📍 Access the portal at: http://localhost:3400");
  console.log("👤 Demo users: admin, developer, tester (password: demo123)");
  console.log("");
  console.log("Press Ctrl+C to stop the server");
  await $`node server.js`;
  await $`EOF`;
  await $`chmod +x "../$RELEASE_DIR/start.sh"`;
  // Create docker file
  console.log("🐳 Creating Dockerfile...");
  await $`cat > "../$RELEASE_DIR/Dockerfile" << 'EOF'`;
  await $`FROM node:18-alpine`;
  await $`WORKDIR /app`;
  // Copy package files
  await $`COPY package*.json ./`;
  // Install dependencies
  await $`RUN npm ci --production`;
  // Copy application files
  await $`COPY . .`;
  // Expose port
  await $`EXPOSE 3400`;
  // Start the application
  await $`CMD ["node", "server.js"]`;
  await $`EOF`;
  // Create docker-compose file
  console.log("🐳 Creating docker-compose.yml...");
  await $`cat > "../$RELEASE_DIR/docker-compose.yml" << 'EOF'`;
  await $`version: '3.8'`;
  await $`services:`;
  await $`aidev-portal:`;
  await $`build: .`;
  await $`ports:`;
  await $`- "3400:3400"`;
  await $`environment:`;
  await $`- NODE_ENV=production`;
  await $`- PORT=3400`;
  await $`volumes:`;
  await $`- ./data:/app/data`;
  await $`restart: unless-stopped`;
  await $`EOF`;
  // Create deployment instructions
  console.log("📖 Creating deployment instructions...");
  await $`cat > "../$RELEASE_DIR/DEPLOYMENT.md" << 'EOF'`;
  // AI Dev Portal - Deployment Guide
  // # Features
  await $`- **App Selection**: Choose and manage multiple applications`;
  await $`- **Current App Display**: Shows selected app information`;
  await $`- **Web Server Link**: Enabled only when an app is selected`;
  await $`- **App Management**: Create, select, and view app details`;
  await $`- **Service Integration**: View integrated services per app`;
  await $`- **Status Tracking**: Monitor app status (active/inactive)`;
  // # Quick Start
  // ## Local Development
  await $````bash`;
  await $`./start.sh`;
  await $`````;
  // ## Docker Deployment
  await $````bash`;
  await $`docker-compose up -d`;
  await $`````;
  // ## Manual Start
  await $````bash`;
  await $`npm install --production`;
  await $`node server.js`;
  await $`````;
  // # Access
  await $`- URL: http://localhost:3400`;
  await $`- Demo Users:`;
  await $`- Username: admin, Password: demo123`;
  await $`- Username: developer, Password: demo123`;
  await $`- Username: tester, Password: demo123`;
  // # Configuration
  await $`- Port: 3400 (configurable via PORT environment variable)`;
  await $`- Database: SQLite (data/ai_dev_portal.db)`;
  // # Features Overview
  // ## App Selection
  await $`- Dropdown selector for quick app switching`;
  await $`- Visual card grid for app browsing`;
  await $`- Click to select functionality`;
  await $`- Maintains selection across navigation`;
  // ## Web Server Link
  await $`- Automatically disabled when no app selected`;
  await $`- Enables upon app selection`;
  await $`- Links to app-specific web server`;
  // ## App Information Display
  await $`- Current app name and template`;
  await $`- Service list`;
  await $`- Status indicators`;
  await $`- Creation date`;
  // # API Endpoints
  await $`- GET /api/apps - List all apps`;
  await $`- POST /api/apps - Create new app`;
  await $`- POST /api/apps/:id/select - Select an app`;
  await $`- GET /api/projects - List projects`;
  await $`- GET /api/features - List features`;
  await $`- GET /api/tasks - List tasks`;
  // # Testing
  await $`Run E2E tests with:`;
  await $````bash`;
  await $`bunx playwright test`;
  await $`````;
  // # Troubleshooting
  await $`- If server doesn't start, check port 3400 is available`;
  await $`- Database issues: Delete data/ai_dev_portal.db and restart`;
  await $`- Login issues: Use demo credentials listed above`;
  await $`EOF`;
  console.log("");
  console.log("✅ Release package created successfully!");
  console.log("📦 Release directory: ../$RELEASE_DIR");
  console.log("");
  console.log("To deploy:");
  console.log("  1. cd ../$RELEASE_DIR");
  console.log("  2. ./start.sh (or use Docker)");
  console.log("");
  console.log("🎉 Release complete!");
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}