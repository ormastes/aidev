#!/usr/bin/env python3
"""
Migrated from: release.sh
Auto-generated Python - 2025-08-16T04:57:27.743Z
"""

import os
import sys
import subprocess
import shutil
import glob
from pathlib import Path

def main():
    # AI Dev Portal Release Script
    # This script packages and prepares the portal for deployment
    print("🚀 AI Dev Portal Release Process Started")
    print("========================================")
    # Set variables
    subprocess.run("RELEASE_DIR="release_$(date +%Y%m%d_%H%M%S)"", shell=True)
    subprocess.run("CURRENT_DIR=$(pwd)", shell=True)
    # Create release directory
    print("📁 Creating release directory: $RELEASE_DIR")
    Path(""../$RELEASE_DIR"").mkdir(parents=True, exist_ok=True)
    # Compile TypeScript files
    print("🔨 Compiling TypeScript files...")
    subprocess.run("bunx tsc --skipLibCheck || echo "Some TypeScript compilation warnings, continuing..."", shell=True)
    # Compile client-side TypeScript
    print("🔨 Compiling client-side TypeScript...")
    os.chdir("public/ts")
    subprocess.run("bunx tsc app.ts --outDir ../js --lib es2015,dom || echo "Client compilation done"", shell=True)
    os.chdir("../..")
    # Copy necessary files
    print("📋 Copying files to release directory...")
    shutil.copy2("-r public", ""../$RELEASE_DIR/"")
    shutil.copy2("-r data", ""../$RELEASE_DIR/"")
    shutil.copy2("-r config", ""../$RELEASE_DIR/"")
    shutil.copy2("server.js", ""../$RELEASE_DIR/"")
    shutil.copy2("package.json", ""../$RELEASE_DIR/"")
    shutil.copy2("package-lock.json", ""../$RELEASE_DIR/"")
    shutil.copy2("README.md "../$RELEASE_DIR/" 2>/dev/null || echo "No README", "found"")
    # Create startup script
    print("📝 Creating startup script...")
    subprocess.run("cat > "../$RELEASE_DIR/start.sh" << 'EOF'", shell=True)
    print("🌟 Starting AI Dev Portal")
    print("=========================")
    # Check if node_modules exists
    if ! -d "node_modules" :; then
    print("📦 Installing dependencies...")
    subprocess.run("npm install --production", shell=True)
    # Initialize database if needed
    if ! -f "data/ai_dev_portal.db" :; then
    print("🗄️ Initializing database...")
    subprocess.run("node init-db.js", shell=True)
    # Start the server
    print("🚀 Starting server on port 3400...")
    print("📍 Access the portal at: http://localhost:3400")
    print("👤 Demo users: admin, developer, tester (password: demo123)")
    print("")
    print("Press Ctrl+C to stop the server")
    subprocess.run("node server.js", shell=True)
    subprocess.run("EOF", shell=True)
    subprocess.run("chmod +x "../$RELEASE_DIR/start.sh"", shell=True)
    # Create docker file
    print("🐳 Creating Dockerfile...")
    subprocess.run("cat > "../$RELEASE_DIR/Dockerfile" << 'EOF'", shell=True)
    subprocess.run("FROM node:18-alpine", shell=True)
    subprocess.run("WORKDIR /app", shell=True)
    # Copy package files
    subprocess.run("COPY package*.json ./", shell=True)
    # Install dependencies
    subprocess.run("RUN npm ci --production", shell=True)
    # Copy application files
    subprocess.run("COPY . .", shell=True)
    # Expose port
    subprocess.run("EXPOSE 3400", shell=True)
    # Start the application
    subprocess.run("CMD ["node", "server.js"]", shell=True)
    subprocess.run("EOF", shell=True)
    # Create docker-compose file
    print("🐳 Creating docker-compose.yml...")
    subprocess.run("cat > "../$RELEASE_DIR/docker-compose.yml" << 'EOF'", shell=True)
    subprocess.run("version: '3.8'", shell=True)
    subprocess.run("services:", shell=True)
    subprocess.run("aidev-portal:", shell=True)
    subprocess.run("build: .", shell=True)
    subprocess.run("ports:", shell=True)
    subprocess.run("- "3400:3400"", shell=True)
    subprocess.run("environment:", shell=True)
    subprocess.run("- NODE_ENV=production", shell=True)
    subprocess.run("- PORT=3400", shell=True)
    subprocess.run("volumes:", shell=True)
    subprocess.run("- ./data:/app/data", shell=True)
    subprocess.run("restart: unless-stopped", shell=True)
    subprocess.run("EOF", shell=True)
    # Create deployment instructions
    print("📖 Creating deployment instructions...")
    subprocess.run("cat > "../$RELEASE_DIR/DEPLOYMENT.md" << 'EOF'", shell=True)
    # AI Dev Portal - Deployment Guide
    # # Features
    subprocess.run("- **App Selection**: Choose and manage multiple applications", shell=True)
    subprocess.run("- **Current App Display**: Shows selected app information", shell=True)
    subprocess.run("- **Web Server Link**: Enabled only when an app is selected", shell=True)
    subprocess.run("- **App Management**: Create, select, and view app details", shell=True)
    subprocess.run("- **Service Integration**: View integrated services per app", shell=True)
    subprocess.run("- **Status Tracking**: Monitor app status (active/inactive)", shell=True)
    # # Quick Start
    # ## Local Development
    subprocess.run("```bash", shell=True)
    subprocess.run("./start.sh", shell=True)
    subprocess.run("```", shell=True)
    # ## Docker Deployment
    subprocess.run("```bash", shell=True)
    subprocess.run("docker-compose up -d", shell=True)
    subprocess.run("```", shell=True)
    # ## Manual Start
    subprocess.run("```bash", shell=True)
    subprocess.run("npm install --production", shell=True)
    subprocess.run("node server.js", shell=True)
    subprocess.run("```", shell=True)
    # # Access
    subprocess.run("- URL: http://localhost:3400", shell=True)
    subprocess.run("- Demo Users:", shell=True)
    subprocess.run("- Username: admin, Password: demo123", shell=True)
    subprocess.run("- Username: developer, Password: demo123", shell=True)
    subprocess.run("- Username: tester, Password: demo123", shell=True)
    # # Configuration
    subprocess.run("- Port: 3400 (configurable via PORT environment variable)", shell=True)
    subprocess.run("- Database: SQLite (data/ai_dev_portal.db)", shell=True)
    # # Features Overview
    # ## App Selection
    subprocess.run("- Dropdown selector for quick app switching", shell=True)
    subprocess.run("- Visual card grid for app browsing", shell=True)
    subprocess.run("- Click to select functionality", shell=True)
    subprocess.run("- Maintains selection across navigation", shell=True)
    # ## Web Server Link
    subprocess.run("- Automatically disabled when no app selected", shell=True)
    subprocess.run("- Enables upon app selection", shell=True)
    subprocess.run("- Links to app-specific web server", shell=True)
    # ## App Information Display
    subprocess.run("- Current app name and template", shell=True)
    subprocess.run("- Service list", shell=True)
    subprocess.run("- Status indicators", shell=True)
    subprocess.run("- Creation date", shell=True)
    # # API Endpoints
    subprocess.run("- GET /api/apps - List all apps", shell=True)
    subprocess.run("- POST /api/apps - Create new app", shell=True)
    subprocess.run("- POST /api/apps/:id/select - Select an app", shell=True)
    subprocess.run("- GET /api/projects - List projects", shell=True)
    subprocess.run("- GET /api/features - List features", shell=True)
    subprocess.run("- GET /api/tasks - List tasks", shell=True)
    # # Testing
    subprocess.run("Run E2E tests with:", shell=True)
    subprocess.run("```bash", shell=True)
    subprocess.run("bunx playwright test", shell=True)
    subprocess.run("```", shell=True)
    # # Troubleshooting
    subprocess.run("- If server doesn't start, check port 3400 is available", shell=True)
    subprocess.run("- Database issues: Delete data/ai_dev_portal.db and restart", shell=True)
    subprocess.run("- Login issues: Use demo credentials listed above", shell=True)
    subprocess.run("EOF", shell=True)
    print("")
    print("✅ Release package created successfully!")
    print("📦 Release directory: ../$RELEASE_DIR")
    print("")
    print("To deploy:")
    print("  1. cd ../$RELEASE_DIR")
    print("  2. ./start.sh (or use Docker)")
    print("")
    print("🎉 Release complete!")

if __name__ == "__main__":
    main()