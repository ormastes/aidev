#!/usr/bin/env bun
/**
 * Migrated from: deploy.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.682Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  // MCP Server Production Deployment Script
  // Handles deployment, health checks, and rollback
  await $`set -e`;
  // Configuration
  await $`SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"`;
  await $`PROJECT_DIR="$(dirname "$SCRIPT_DIR")"`;
  await $`DEPLOYMENT_ENV="${1:-production}"`;
  await $`DEPLOYMENT_DIR="/opt/mcp-server"`;
  await $`SERVICE_NAME="mcp-server"`;
  await $`BACKUP_DIR="/var/backups/mcp-server"`;
  await $`LOG_DIR="/var/log/mcp-server"`;
  // Colors for output
  await $`RED='\033[0;31m'`;
  await $`GREEN='\033[0;32m'`;
  await $`YELLOW='\033[1;33m'`;
  await $`NC='\033[0m' # No Color`;
  // Logging function
  await $`log() {`;
  console.log("-e ");${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
  await $`}`;
  await $`error() {`;
  console.log("-e ");${RED}[ERROR]${NC} $1" >&2
  await $`}`;
  await $`warning() {`;
  console.log("-e ");${YELLOW}[WARNING]${NC} $1"
  await $`}`;
  // Check prerequisites
  await $`check_prerequisites() {`;
  await $`log "Checking prerequisites..."`;
  // Check Node.js version
  await $`if ! command -v node &> /dev/null; then`;
  await $`error "Node.js is not installed"`;
  process.exit(1);
  }
  await $`NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)`;
  if ("$NODE_VERSION" -lt 18 ) {; then
  await $`error "Node.js version 18 or higher is required"`;
  process.exit(1);
  }
  // Check npm
  await $`if ! command -v npm &> /dev/null; then`;
  await $`error "npm is not installed"`;
  process.exit(1);
  }
  // Check permissions
  if ("$DEPLOYMENT_ENV" == "production" ] && [ "$EUID" -ne 0 ) {; then
  await $`error "Production deployment requires root privileges"`;
  process.exit(1);
  }
  await $`log "Prerequisites check passed ✓"`;
  await $`}`;
  // Run tests
  await $`run_tests() {`;
  await $`log "Running tests..."`;
  process.chdir(""$PROJECT_DIR"");
  // Run security validation
  if (-f "test-security-validation.js" ) {; then
  await $`node test-security-validation.js || {`;
  await $`error "Security validation failed"`;
  process.exit(1);
  await $`}`;
  }
  // Run integration tests if available
  if (-f "test/integration/mcp-integration.test.js" ) {; then
  await $`log "Running integration tests..."`;
  await $`node test/integration/mcp-integration.test.js || {`;
  await $`warning "Integration tests failed - continue anyway? (y/n)"`;
  await $`read -r response`;
  if ("$response" != "y" ) {; then
  process.exit(1);
  }
  await $`}`;
  }
  await $`log "Tests completed ✓"`;
  await $`}`;
  // Create backup
  await $`create_backup() {`;
  await $`log "Creating backup..."`;
  if (-d "$DEPLOYMENT_DIR" ) {; then
  await mkdir(""$BACKUP_DIR"", { recursive: true });
  await $`BACKUP_FILE="$BACKUP_DIR/backup-$(date +'%Y%m%d-%H%M%S').tar.gz"`;
  await $`tar -czf "$BACKUP_FILE" -C "$DEPLOYMENT_DIR" . 2>/dev/null || true`;
  await $`log "Backup created: $BACKUP_FILE"`;
  } else {
  await $`log "No existing deployment to backup"`;
  }
  await $`}`;
  // Deploy application
  await $`deploy_application() {`;
  await $`log "Deploying application to $DEPLOYMENT_ENV..."`;
  // Create deployment directory
  await mkdir(""$DEPLOYMENT_DIR"", { recursive: true });
  await mkdir(""$LOG_DIR"", { recursive: true });
  // Copy files
  await $`log "Copying files..."`;
  await $`rsync -av --exclude='node_modules' \`;
  await $`--exclude='test' \`;
  await $`--exclude='docker-test' \`;
  await $`--exclude='*.test.js' \`;
  await $`--exclude='.git' \`;
  await $`"$PROJECT_DIR/" "$DEPLOYMENT_DIR/"`;
  // Install production dependencies
  await $`log "Installing dependencies..."`;
  process.chdir(""$DEPLOYMENT_DIR"");
  await $`npm ci --production`;
  // Set permissions
  await $`chmod +x "$DEPLOYMENT_DIR/mcp-server-strict.js"`;
  await $`chmod 600 "$DEPLOYMENT_DIR/NAME_ID.vf.json" 2>/dev/null || true`;
  await $`log "Application deployed ✓"`;
  await $`}`;
  // Create systemd service
  await $`create_service() {`;
  await $`log "Creating systemd service..."`;
  await $`cat > "/etc/systemd/system/${SERVICE_NAME}.service" << EOF`;
  await $`[Unit]`;
  await $`Description=MCP Strict Filesystem Server`;
  await $`After=network.target`;
  await $`[Service]`;
  await $`Type=simple`;
  await $`User=mcp-user`;
  await $`Group=mcp-group`;
  await $`WorkingDirectory=$DEPLOYMENT_DIR`;
  await $`Environment="NODE_ENV=production"`;
  await $`Environment="VF_BASE_PATH=$DEPLOYMENT_DIR/workspace"`;
  await $`Environment="LOG_LEVEL=info"`;
  await $`ExecStart=/usr/bin/node $DEPLOYMENT_DIR/mcp-server-strict.js`;
  await $`Restart=always`;
  await $`RestartSec=10`;
  await $`StandardOutput=append:$LOG_DIR/mcp-server.log`;
  await $`StandardError=append:$LOG_DIR/mcp-server-error.log`;
  // Security settings
  await $`NoNewPrivileges=true`;
  await $`PrivateTmp=true`;
  await $`ProtectSystem=strict`;
  await $`ProtectHome=true`;
  await $`ReadWritePaths=$DEPLOYMENT_DIR/workspace $LOG_DIR`;
  await $`[Install]`;
  await $`WantedBy=multi-user.target`;
  await $`EOF`;
  // Create service user if not exists
  await $`if ! id "mcp-user" &>/dev/null; then`;
  await $`useradd -r -s /bin/false mcp-user`;
  await $`usermod -a -G mcp-group mcp-user 2>/dev/null || groupadd mcp-group`;
  }
  // Set ownership
  await $`chown -R mcp-user:mcp-group "$DEPLOYMENT_DIR"`;
  await $`chown -R mcp-user:mcp-group "$LOG_DIR"`;
  // Reload systemd
  await $`systemctl daemon-reload`;
  await $`log "Service created ✓"`;
  await $`}`;
  // Configure nginx reverse proxy
  await $`configure_nginx() {`;
  await $`log "Configuring nginx..."`;
  await $`if command -v nginx &> /dev/null; then`;
  await $`cat > "/etc/nginx/sites-available/mcp-server" << EOF`;
  await $`server {`;
  await $`listen 80;`;
  await $`server_name mcp.example.com;`;
  await $`location / {`;
  await $`proxy_pass http://localhost:8080;`;
  await $`proxy_http_version 1.1;`;
  await $`proxy_set_header Upgrade \$http_upgrade;`;
  await $`proxy_set_header Connection 'upgrade';`;
  await $`proxy_set_header Host \$host;`;
  await $`proxy_cache_bypass \$http_upgrade;`;
  await $`proxy_set_header X-Real-IP \$remote_addr;`;
  await $`proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;`;
  await $`proxy_set_header X-Forwarded-Proto \$scheme;`;
  // Security headers
  await $`add_header X-Content-Type-Options nosniff;`;
  await $`add_header X-Frame-Options DENY;`;
  await $`add_header X-XSS-Protection "1; mode=block";`;
  await $`add_header Content-Security-Policy "default-src 'self'";`;
  await $`}`;
  // Rate limiting
  await $`limit_req_zone \$binary_remote_addr zone=mcp_limit:10m rate=10r/s;`;
  await $`limit_req zone=mcp_limit burst=20 nodelay;`;
  await $`access_log $LOG_DIR/nginx-access.log;`;
  await $`error_log $LOG_DIR/nginx-error.log;`;
  await $`}`;
  await $`EOF`;
  await $`ln -sf /etc/nginx/sites-available/mcp-server /etc/nginx/sites-enabled/`;
  await $`nginx -t && systemctl reload nginx`;
  await $`log "Nginx configured ✓"`;
  } else {
  await $`warning "Nginx not installed - skipping reverse proxy configuration"`;
  }
  await $`}`;
  // Setup monitoring
  await $`setup_monitoring() {`;
  await $`log "Setting up monitoring..."`;
  // Create monitoring script
  await $`cat > "$DEPLOYMENT_DIR/monitor.sh" << 'EOF'`;
  // Health check script
  await $`MCP_URL="http://localhost:8080/health"`;
  await $`MAX_RETRIES=3`;
  await $`RETRY_DELAY=5`;
  for (const i of [$(seq 1 $MAX_RETRIES); do]) {
  await $`if curl -f -s "$MCP_URL" > /dev/null 2>&1; then`;
  console.log("Health check passed");
  process.exit(0);
  }
  if ($i -lt $MAX_RETRIES ) {; then
  console.log("Health check failed, retrying in ${RETRY_DELAY}s...");
  await $`sleep $RETRY_DELAY`;
  }
  }
  console.log("Health check failed after $MAX_RETRIES attempts");
  process.exit(1);
  await $`EOF`;
  await $`chmod +x "$DEPLOYMENT_DIR/monitor.sh"`;
  // Create cron job for monitoring
  console.log("*/5 * * * * $DEPLOYMENT_DIR/monitor.sh || systemctl restart $SERVICE_NAME"); | \
  await $`crontab -u mcp-user -`;
  await $`log "Monitoring configured ✓"`;
  await $`}`;
  // Start service
  await $`start_service() {`;
  await $`log "Starting service..."`;
  await $`systemctl enable "$SERVICE_NAME"`;
  await $`systemctl start "$SERVICE_NAME"`;
  // Wait for service to start
  await Bun.sleep(3 * 1000);
  await $`if systemctl is-active --quiet "$SERVICE_NAME"; then`;
  await $`log "Service started successfully ✓"`;
  } else {
  await $`error "Service failed to start"`;
  await $`systemctl status "$SERVICE_NAME"`;
  process.exit(1);
  }
  await $`}`;
  // Health check
  await $`health_check() {`;
  await $`log "Performing health check..."`;
  await $`MAX_RETRIES=5`;
  await $`RETRY_DELAY=2`;
  for (const i of [$(seq 1 $MAX_RETRIES); do]) {
  await $`if curl -f -s "http://localhost:8080/health" > /dev/null 2>&1; then`;
  await $`log "Health check passed ✓"`;
  await $`return 0`;
  }
  if ($i -lt $MAX_RETRIES ) {; then
  await $`log "Waiting for service to be ready..."`;
  await $`sleep $RETRY_DELAY`;
  }
  }
  await $`error "Health check failed"`;
  await $`return 1`;
  await $`}`;
  // Rollback deployment
  await $`rollback() {`;
  await $`error "Deployment failed, rolling back..."`;
  // Stop service
  await $`systemctl stop "$SERVICE_NAME" 2>/dev/null || true`;
  // Find latest backup
  if (-d "$BACKUP_DIR" ) {; then
  await $`LATEST_BACKUP=$(ls -t "$BACKUP_DIR"/backup-*.tar.gz 2>/dev/null | head -1)`;
  if (-n "$LATEST_BACKUP" ) {; then
  await $`log "Restoring from backup: $LATEST_BACKUP"`;
  await rm(""$DEPLOYMENT_DIR"/*", { recursive: true, force: true });
  await $`tar -xzf "$LATEST_BACKUP" -C "$DEPLOYMENT_DIR"`;
  await $`systemctl start "$SERVICE_NAME"`;
  await $`if health_check; then`;
  await $`log "Rollback successful ✓"`;
  } else {
  await $`error "Rollback failed - manual intervention required"`;
  }
  } else {
  await $`error "No backup available for rollback"`;
  }
  }
  await $`}`;
  // Main deployment flow
  await $`main() {`;
  await $`log "Starting MCP Server deployment for $DEPLOYMENT_ENV"`;
  await $`log "========================================="`;
  // Set trap for rollback on error
  await $`trap rollback ERR`;
  // Execute deployment steps
  await $`check_prerequisites`;
  await $`run_tests`;
  await $`create_backup`;
  await $`deploy_application`;
  if ("$DEPLOYMENT_ENV" == "production" ) {; then
  await $`create_service`;
  await $`configure_nginx`;
  await $`setup_monitoring`;
  await $`start_service`;
  await $`health_check`;
  }
  // Clear trap on success
  await $`trap - ERR`;
  await $`log "========================================="`;
  await $`log "Deployment completed successfully! 🎉"`;
  if ("$DEPLOYMENT_ENV" == "production" ) {; then
  await $`log "Service status: $(systemctl is-active $SERVICE_NAME)"`;
  await $`log "Logs: $LOG_DIR"`;
  await $`log "Monitor: systemctl status $SERVICE_NAME"`;
  }
  await $`}`;
  // Run main function
  await $`main "$@"`;
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}