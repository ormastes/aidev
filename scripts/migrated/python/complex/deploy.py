#!/usr/bin/env python3
"""
Migrated from: deploy.sh
Auto-generated Python - 2025-08-16T04:57:27.683Z
"""

import os
import sys
import subprocess
import shutil
import glob
from pathlib import Path

def main():
    # MCP Server Production Deployment Script
    # Handles deployment, health checks, and rollback
    subprocess.run("set -e", shell=True)
    # Configuration
    subprocess.run("SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"", shell=True)
    subprocess.run("PROJECT_DIR="$(dirname "$SCRIPT_DIR")"", shell=True)
    subprocess.run("DEPLOYMENT_ENV="${1:-production}"", shell=True)
    subprocess.run("DEPLOYMENT_DIR="/opt/mcp-server"", shell=True)
    subprocess.run("SERVICE_NAME="mcp-server"", shell=True)
    subprocess.run("BACKUP_DIR="/var/backups/mcp-server"", shell=True)
    subprocess.run("LOG_DIR="/var/log/mcp-server"", shell=True)
    # Colors for output
    subprocess.run("RED='\033[0;31m'", shell=True)
    subprocess.run("GREEN='\033[0;32m'", shell=True)
    subprocess.run("YELLOW='\033[1;33m'", shell=True)
    subprocess.run("NC='\033[0m' # No Color", shell=True)
    # Logging function
    subprocess.run("log() {", shell=True)
    print("-e ")${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
    subprocess.run("}", shell=True)
    subprocess.run("error() {", shell=True)
    print("-e ")${RED}[ERROR]${NC} $1" >&2
    subprocess.run("}", shell=True)
    subprocess.run("warning() {", shell=True)
    print("-e ")${YELLOW}[WARNING]${NC} $1"
    subprocess.run("}", shell=True)
    # Check prerequisites
    subprocess.run("check_prerequisites() {", shell=True)
    subprocess.run("log "Checking prerequisites..."", shell=True)
    # Check Node.js version
    subprocess.run("if ! command -v node &> /dev/null; then", shell=True)
    subprocess.run("error "Node.js is not installed"", shell=True)
    sys.exit(1)
    subprocess.run("NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)", shell=True)
    if "$NODE_VERSION" -lt 18 :; then
    subprocess.run("error "Node.js version 18 or higher is required"", shell=True)
    sys.exit(1)
    # Check npm
    subprocess.run("if ! command -v npm &> /dev/null; then", shell=True)
    subprocess.run("error "npm is not installed"", shell=True)
    sys.exit(1)
    # Check permissions
    if "$DEPLOYMENT_ENV" == "production" ] && [ "$EUID" -ne 0 :; then
    subprocess.run("error "Production deployment requires root privileges"", shell=True)
    sys.exit(1)
    subprocess.run("log "Prerequisites check passed ✓"", shell=True)
    subprocess.run("}", shell=True)
    # Run tests
    subprocess.run("run_tests() {", shell=True)
    subprocess.run("log "Running tests..."", shell=True)
    os.chdir(""$PROJECT_DIR"")
    # Run security validation
    if -f "test-security-validation.js" :; then
    subprocess.run("node test-security-validation.js || {", shell=True)
    subprocess.run("error "Security validation failed"", shell=True)
    sys.exit(1)
    subprocess.run("}", shell=True)
    # Run integration tests if available
    if -f "test/integration/mcp-integration.test.js" :; then
    subprocess.run("log "Running integration tests..."", shell=True)
    subprocess.run("node test/integration/mcp-integration.test.js || {", shell=True)
    subprocess.run("warning "Integration tests failed - continue anyway? (y/n)"", shell=True)
    subprocess.run("read -r response", shell=True)
    if "$response" != "y" :; then
    sys.exit(1)
    subprocess.run("}", shell=True)
    subprocess.run("log "Tests completed ✓"", shell=True)
    subprocess.run("}", shell=True)
    # Create backup
    subprocess.run("create_backup() {", shell=True)
    subprocess.run("log "Creating backup..."", shell=True)
    if -d "$DEPLOYMENT_DIR" :; then
    Path(""$BACKUP_DIR"").mkdir(parents=True, exist_ok=True)
    subprocess.run("BACKUP_FILE="$BACKUP_DIR/backup-$(date +'%Y%m%d-%H%M%S').tar.gz"", shell=True)
    subprocess.run("tar -czf "$BACKUP_FILE" -C "$DEPLOYMENT_DIR" . 2>/dev/null || true", shell=True)
    subprocess.run("log "Backup created: $BACKUP_FILE"", shell=True)
    else:
    subprocess.run("log "No existing deployment to backup"", shell=True)
    subprocess.run("}", shell=True)
    # Deploy application
    subprocess.run("deploy_application() {", shell=True)
    subprocess.run("log "Deploying application to $DEPLOYMENT_ENV..."", shell=True)
    # Create deployment directory
    Path(""$DEPLOYMENT_DIR"").mkdir(parents=True, exist_ok=True)
    Path(""$LOG_DIR"").mkdir(parents=True, exist_ok=True)
    # Copy files
    subprocess.run("log "Copying files..."", shell=True)
    subprocess.run("rsync -av --exclude='node_modules' \", shell=True)
    subprocess.run("--exclude='test' \", shell=True)
    subprocess.run("--exclude='docker-test' \", shell=True)
    subprocess.run("--exclude='*.test.js' \", shell=True)
    subprocess.run("--exclude='.git' \", shell=True)
    subprocess.run(""$PROJECT_DIR/" "$DEPLOYMENT_DIR/"", shell=True)
    # Install production dependencies
    subprocess.run("log "Installing dependencies..."", shell=True)
    os.chdir(""$DEPLOYMENT_DIR"")
    subprocess.run("npm ci --production", shell=True)
    # Set permissions
    subprocess.run("chmod +x "$DEPLOYMENT_DIR/mcp-server-strict.js"", shell=True)
    subprocess.run("chmod 600 "$DEPLOYMENT_DIR/NAME_ID.vf.json" 2>/dev/null || true", shell=True)
    subprocess.run("log "Application deployed ✓"", shell=True)
    subprocess.run("}", shell=True)
    # Create systemd service
    subprocess.run("create_service() {", shell=True)
    subprocess.run("log "Creating systemd service..."", shell=True)
    subprocess.run("cat > "/etc/systemd/system/${SERVICE_NAME}.service" << EOF", shell=True)
    subprocess.run("[Unit]", shell=True)
    subprocess.run("Description=MCP Strict Filesystem Server", shell=True)
    subprocess.run("After=network.target", shell=True)
    subprocess.run("[Service]", shell=True)
    subprocess.run("Type=simple", shell=True)
    subprocess.run("User=mcp-user", shell=True)
    subprocess.run("Group=mcp-group", shell=True)
    subprocess.run("WorkingDirectory=$DEPLOYMENT_DIR", shell=True)
    subprocess.run("Environment="NODE_ENV=production"", shell=True)
    subprocess.run("Environment="VF_BASE_PATH=$DEPLOYMENT_DIR/workspace"", shell=True)
    subprocess.run("Environment="LOG_LEVEL=info"", shell=True)
    subprocess.run("ExecStart=/usr/bin/node $DEPLOYMENT_DIR/mcp-server-strict.js", shell=True)
    subprocess.run("Restart=always", shell=True)
    subprocess.run("RestartSec=10", shell=True)
    subprocess.run("StandardOutput=append:$LOG_DIR/mcp-server.log", shell=True)
    subprocess.run("StandardError=append:$LOG_DIR/mcp-server-error.log", shell=True)
    # Security settings
    subprocess.run("NoNewPrivileges=true", shell=True)
    subprocess.run("PrivateTmp=true", shell=True)
    subprocess.run("ProtectSystem=strict", shell=True)
    subprocess.run("ProtectHome=true", shell=True)
    subprocess.run("ReadWritePaths=$DEPLOYMENT_DIR/workspace $LOG_DIR", shell=True)
    subprocess.run("[Install]", shell=True)
    subprocess.run("WantedBy=multi-user.target", shell=True)
    subprocess.run("EOF", shell=True)
    # Create service user if not exists
    subprocess.run("if ! id "mcp-user" &>/dev/null; then", shell=True)
    subprocess.run("useradd -r -s /bin/false mcp-user", shell=True)
    subprocess.run("usermod -a -G mcp-group mcp-user 2>/dev/null || groupadd mcp-group", shell=True)
    # Set ownership
    subprocess.run("chown -R mcp-user:mcp-group "$DEPLOYMENT_DIR"", shell=True)
    subprocess.run("chown -R mcp-user:mcp-group "$LOG_DIR"", shell=True)
    # Reload systemd
    subprocess.run("systemctl daemon-reload", shell=True)
    subprocess.run("log "Service created ✓"", shell=True)
    subprocess.run("}", shell=True)
    # Configure nginx reverse proxy
    subprocess.run("configure_nginx() {", shell=True)
    subprocess.run("log "Configuring nginx..."", shell=True)
    subprocess.run("if command -v nginx &> /dev/null; then", shell=True)
    subprocess.run("cat > "/etc/nginx/sites-available/mcp-server" << EOF", shell=True)
    subprocess.run("server {", shell=True)
    subprocess.run("listen 80;", shell=True)
    subprocess.run("server_name mcp.example.com;", shell=True)
    subprocess.run("location / {", shell=True)
    subprocess.run("proxy_pass http://localhost:8080;", shell=True)
    subprocess.run("proxy_http_version 1.1;", shell=True)
    subprocess.run("proxy_set_header Upgrade \$http_upgrade;", shell=True)
    subprocess.run("proxy_set_header Connection 'upgrade';", shell=True)
    subprocess.run("proxy_set_header Host \$host;", shell=True)
    subprocess.run("proxy_cache_bypass \$http_upgrade;", shell=True)
    subprocess.run("proxy_set_header X-Real-IP \$remote_addr;", shell=True)
    subprocess.run("proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;", shell=True)
    subprocess.run("proxy_set_header X-Forwarded-Proto \$scheme;", shell=True)
    # Security headers
    subprocess.run("add_header X-Content-Type-Options nosniff;", shell=True)
    subprocess.run("add_header X-Frame-Options DENY;", shell=True)
    subprocess.run("add_header X-XSS-Protection "1; mode=block";", shell=True)
    subprocess.run("add_header Content-Security-Policy "default-src 'self'";", shell=True)
    subprocess.run("}", shell=True)
    # Rate limiting
    subprocess.run("limit_req_zone \$binary_remote_addr zone=mcp_limit:10m rate=10r/s;", shell=True)
    subprocess.run("limit_req zone=mcp_limit burst=20 nodelay;", shell=True)
    subprocess.run("access_log $LOG_DIR/nginx-access.log;", shell=True)
    subprocess.run("error_log $LOG_DIR/nginx-error.log;", shell=True)
    subprocess.run("}", shell=True)
    subprocess.run("EOF", shell=True)
    subprocess.run("ln -sf /etc/nginx/sites-available/mcp-server /etc/nginx/sites-enabled/", shell=True)
    subprocess.run("nginx -t && systemctl reload nginx", shell=True)
    subprocess.run("log "Nginx configured ✓"", shell=True)
    else:
    subprocess.run("warning "Nginx not installed - skipping reverse proxy configuration"", shell=True)
    subprocess.run("}", shell=True)
    # Setup monitoring
    subprocess.run("setup_monitoring() {", shell=True)
    subprocess.run("log "Setting up monitoring..."", shell=True)
    # Create monitoring script
    subprocess.run("cat > "$DEPLOYMENT_DIR/monitor.sh" << 'EOF'", shell=True)
    # Health check script
    subprocess.run("MCP_URL="http://localhost:8080/health"", shell=True)
    subprocess.run("MAX_RETRIES=3", shell=True)
    subprocess.run("RETRY_DELAY=5", shell=True)
    for i in [$(seq 1 $MAX_RETRIES); do]:
    subprocess.run("if curl -f -s "$MCP_URL" > /dev/null 2>&1; then", shell=True)
    print("Health check passed")
    sys.exit(0)
    if $i -lt $MAX_RETRIES :; then
    print("Health check failed, retrying in ${RETRY_DELAY}s...")
    subprocess.run("sleep $RETRY_DELAY", shell=True)
    print("Health check failed after $MAX_RETRIES attempts")
    sys.exit(1)
    subprocess.run("EOF", shell=True)
    subprocess.run("chmod +x "$DEPLOYMENT_DIR/monitor.sh"", shell=True)
    # Create cron job for monitoring
    print("*/5 * * * * $DEPLOYMENT_DIR/monitor.sh || systemctl restart $SERVICE_NAME") | \
    subprocess.run("crontab -u mcp-user -", shell=True)
    subprocess.run("log "Monitoring configured ✓"", shell=True)
    subprocess.run("}", shell=True)
    # Start service
    subprocess.run("start_service() {", shell=True)
    subprocess.run("log "Starting service..."", shell=True)
    subprocess.run("systemctl enable "$SERVICE_NAME"", shell=True)
    subprocess.run("systemctl start "$SERVICE_NAME"", shell=True)
    # Wait for service to start
    time.sleep(3)
    subprocess.run("if systemctl is-active --quiet "$SERVICE_NAME"; then", shell=True)
    subprocess.run("log "Service started successfully ✓"", shell=True)
    else:
    subprocess.run("error "Service failed to start"", shell=True)
    subprocess.run("systemctl status "$SERVICE_NAME"", shell=True)
    sys.exit(1)
    subprocess.run("}", shell=True)
    # Health check
    subprocess.run("health_check() {", shell=True)
    subprocess.run("log "Performing health check..."", shell=True)
    subprocess.run("MAX_RETRIES=5", shell=True)
    subprocess.run("RETRY_DELAY=2", shell=True)
    for i in [$(seq 1 $MAX_RETRIES); do]:
    subprocess.run("if curl -f -s "http://localhost:8080/health" > /dev/null 2>&1; then", shell=True)
    subprocess.run("log "Health check passed ✓"", shell=True)
    subprocess.run("return 0", shell=True)
    if $i -lt $MAX_RETRIES :; then
    subprocess.run("log "Waiting for service to be ready..."", shell=True)
    subprocess.run("sleep $RETRY_DELAY", shell=True)
    subprocess.run("error "Health check failed"", shell=True)
    subprocess.run("return 1", shell=True)
    subprocess.run("}", shell=True)
    # Rollback deployment
    subprocess.run("rollback() {", shell=True)
    subprocess.run("error "Deployment failed, rolling back..."", shell=True)
    # Stop service
    subprocess.run("systemctl stop "$SERVICE_NAME" 2>/dev/null || true", shell=True)
    # Find latest backup
    if -d "$BACKUP_DIR" :; then
    subprocess.run("LATEST_BACKUP=$(ls -t "$BACKUP_DIR"/backup-*.tar.gz 2>/dev/null | head -1)", shell=True)
    if -n "$LATEST_BACKUP" :; then
    subprocess.run("log "Restoring from backup: $LATEST_BACKUP"", shell=True)
    shutil.rmtree(""$DEPLOYMENT_DIR"/*", ignore_errors=True)
    subprocess.run("tar -xzf "$LATEST_BACKUP" -C "$DEPLOYMENT_DIR"", shell=True)
    subprocess.run("systemctl start "$SERVICE_NAME"", shell=True)
    subprocess.run("if health_check; then", shell=True)
    subprocess.run("log "Rollback successful ✓"", shell=True)
    else:
    subprocess.run("error "Rollback failed - manual intervention required"", shell=True)
    else:
    subprocess.run("error "No backup available for rollback"", shell=True)
    subprocess.run("}", shell=True)
    # Main deployment flow
    subprocess.run("main() {", shell=True)
    subprocess.run("log "Starting MCP Server deployment for $DEPLOYMENT_ENV"", shell=True)
    subprocess.run("log "========================================="", shell=True)
    # Set trap for rollback on error
    subprocess.run("trap rollback ERR", shell=True)
    # Execute deployment steps
    subprocess.run("check_prerequisites", shell=True)
    subprocess.run("run_tests", shell=True)
    subprocess.run("create_backup", shell=True)
    subprocess.run("deploy_application", shell=True)
    if "$DEPLOYMENT_ENV" == "production" :; then
    subprocess.run("create_service", shell=True)
    subprocess.run("configure_nginx", shell=True)
    subprocess.run("setup_monitoring", shell=True)
    subprocess.run("start_service", shell=True)
    subprocess.run("health_check", shell=True)
    # Clear trap on success
    subprocess.run("trap - ERR", shell=True)
    subprocess.run("log "========================================="", shell=True)
    subprocess.run("log "Deployment completed successfully! 🎉"", shell=True)
    if "$DEPLOYMENT_ENV" == "production" :; then
    subprocess.run("log "Service status: $(systemctl is-active $SERVICE_NAME)"", shell=True)
    subprocess.run("log "Logs: $LOG_DIR"", shell=True)
    subprocess.run("log "Monitor: systemctl status $SERVICE_NAME"", shell=True)
    subprocess.run("}", shell=True)
    # Run main function
    subprocess.run("main "$@"", shell=True)

if __name__ == "__main__":
    main()