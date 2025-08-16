#!/bin/bash

# MCP Server Production Deployment Script
# Handles deployment, health checks, and rollback

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
DEPLOYMENT_ENV="${1:-production}"
DEPLOYMENT_DIR="/opt/mcp-server"
SERVICE_NAME="mcp-server"
BACKUP_DIR="/var/backups/mcp-server"
LOG_DIR="/var/log/mcp-server"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check Node.js version
    if ! command -v node &> /dev/null; then
        error "Node.js is not installed"
        exit 1
    fi
    
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        error "Node.js version 18 or higher is required"
        exit 1
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        error "npm is not installed"
        exit 1
    fi
    
    # Check permissions
    if [ "$DEPLOYMENT_ENV" == "production" ] && [ "$EUID" -ne 0 ]; then
        error "Production deployment requires root privileges"
        exit 1
    fi
    
    log "Prerequisites check passed ✓"
}

# Run tests
run_tests() {
    log "Running tests..."
    
    cd "$PROJECT_DIR"
    
    # Run security validation
    if [ -f "test-security-validation.js" ]; then
        node test-security-validation.js || {
            error "Security validation failed"
            exit 1
        }
    fi
    
    # Run integration tests if available
    if [ -f "test/integration/mcp-integration.test.js" ]; then
        log "Running integration tests..."
        node test/integration/mcp-integration.test.js || {
            warning "Integration tests failed - continue anyway? (y/n)"
            read -r response
            if [ "$response" != "y" ]; then
                exit 1
            fi
        }
    fi
    
    log "Tests completed ✓"
}

# Create backup
create_backup() {
    log "Creating backup..."
    
    if [ -d "$DEPLOYMENT_DIR" ]; then
        mkdir -p "$BACKUP_DIR"
        BACKUP_FILE="$BACKUP_DIR/backup-$(date +'%Y%m%d-%H%M%S').tar.gz"
        tar -czf "$BACKUP_FILE" -C "$DEPLOYMENT_DIR" . 2>/dev/null || true
        log "Backup created: $BACKUP_FILE"
    else
        log "No existing deployment to backup"
    fi
}

# Deploy application
deploy_application() {
    log "Deploying application to $DEPLOYMENT_ENV..."
    
    # Create deployment directory
    mkdir -p "$DEPLOYMENT_DIR"
    mkdir -p "$LOG_DIR"
    
    # Copy files
    log "Copying files..."
    rsync -av --exclude='node_modules' \
              --exclude='test' \
              --exclude='docker-test' \
              --exclude='*.test.js' \
              --exclude='.git' \
              "$PROJECT_DIR/" "$DEPLOYMENT_DIR/"
    
    # Install production dependencies
    log "Installing dependencies..."
    cd "$DEPLOYMENT_DIR"
    npm ci --production
    
    # Set permissions
    chmod +x "$DEPLOYMENT_DIR/mcp-server-strict.js"
    chmod 600 "$DEPLOYMENT_DIR/NAME_ID.vf.json" 2>/dev/null || true
    
    log "Application deployed ✓"
}

# Create systemd service
create_service() {
    log "Creating systemd service..."
    
    cat > "/etc/systemd/system/${SERVICE_NAME}.service" << EOF
[Unit]
Description=MCP Strict Filesystem Server
After=network.target

[Service]
Type=simple
User=mcp-user
Group=mcp-group
WorkingDirectory=$DEPLOYMENT_DIR
Environment="NODE_ENV=production"
Environment="VF_BASE_PATH=$DEPLOYMENT_DIR/workspace"
Environment="LOG_LEVEL=info"
ExecStart=/usr/bin/node $DEPLOYMENT_DIR/mcp-server-strict.js
Restart=always
RestartSec=10
StandardOutput=append:$LOG_DIR/mcp-server.log
StandardError=append:$LOG_DIR/mcp-server-error.log

# Security settings
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=$DEPLOYMENT_DIR/workspace $LOG_DIR

[Install]
WantedBy=multi-user.target
EOF
    
    # Create service user if not exists
    if ! id "mcp-user" &>/dev/null; then
        useradd -r -s /bin/false mcp-user
        usermod -a -G mcp-group mcp-user 2>/dev/null || groupadd mcp-group
    fi
    
    # Set ownership
    chown -R mcp-user:mcp-group "$DEPLOYMENT_DIR"
    chown -R mcp-user:mcp-group "$LOG_DIR"
    
    # Reload systemd
    systemctl daemon-reload
    
    log "Service created ✓"
}

# Configure nginx reverse proxy
configure_nginx() {
    log "Configuring nginx..."
    
    if command -v nginx &> /dev/null; then
        cat > "/etc/nginx/sites-available/mcp-server" << EOF
server {
    listen 80;
    server_name mcp.example.com;
    
    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # Security headers
        add_header X-Content-Type-Options nosniff;
        add_header X-Frame-Options DENY;
        add_header X-XSS-Protection "1; mode=block";
        add_header Content-Security-Policy "default-src 'self'";
    }
    
    # Rate limiting
    limit_req_zone \$binary_remote_addr zone=mcp_limit:10m rate=10r/s;
    limit_req zone=mcp_limit burst=20 nodelay;
    
    access_log $LOG_DIR/nginx-access.log;
    error_log $LOG_DIR/nginx-error.log;
}
EOF
        
        ln -sf /etc/nginx/sites-available/mcp-server /etc/nginx/sites-enabled/
        nginx -t && systemctl reload nginx
        
        log "Nginx configured ✓"
    else
        warning "Nginx not installed - skipping reverse proxy configuration"
    fi
}

# Setup monitoring
setup_monitoring() {
    log "Setting up monitoring..."
    
    # Create monitoring script
    cat > "$DEPLOYMENT_DIR/monitor.sh" << 'EOF'
#!/bin/bash
# Health check script

MCP_URL="http://localhost:8080/health"
MAX_RETRIES=3
RETRY_DELAY=5

for i in $(seq 1 $MAX_RETRIES); do
    if curl -f -s "$MCP_URL" > /dev/null 2>&1; then
        echo "Health check passed"
        exit 0
    fi
    
    if [ $i -lt $MAX_RETRIES ]; then
        echo "Health check failed, retrying in ${RETRY_DELAY}s..."
        sleep $RETRY_DELAY
    fi
done

echo "Health check failed after $MAX_RETRIES attempts"
exit 1
EOF
    
    chmod +x "$DEPLOYMENT_DIR/monitor.sh"
    
    # Create cron job for monitoring
    echo "*/5 * * * * $DEPLOYMENT_DIR/monitor.sh || systemctl restart $SERVICE_NAME" | \
        crontab -u mcp-user -
    
    log "Monitoring configured ✓"
}

# Start service
start_service() {
    log "Starting service..."
    
    systemctl enable "$SERVICE_NAME"
    systemctl start "$SERVICE_NAME"
    
    # Wait for service to start
    sleep 3
    
    if systemctl is-active --quiet "$SERVICE_NAME"; then
        log "Service started successfully ✓"
    else
        error "Service failed to start"
        systemctl status "$SERVICE_NAME"
        exit 1
    fi
}

# Health check
health_check() {
    log "Performing health check..."
    
    MAX_RETRIES=5
    RETRY_DELAY=2
    
    for i in $(seq 1 $MAX_RETRIES); do
        if curl -f -s "http://localhost:8080/health" > /dev/null 2>&1; then
            log "Health check passed ✓"
            return 0
        fi
        
        if [ $i -lt $MAX_RETRIES ]; then
            log "Waiting for service to be ready..."
            sleep $RETRY_DELAY
        fi
    done
    
    error "Health check failed"
    return 1
}

# Rollback deployment
rollback() {
    error "Deployment failed, rolling back..."
    
    # Stop service
    systemctl stop "$SERVICE_NAME" 2>/dev/null || true
    
    # Find latest backup
    if [ -d "$BACKUP_DIR" ]; then
        LATEST_BACKUP=$(ls -t "$BACKUP_DIR"/backup-*.tar.gz 2>/dev/null | head -1)
        
        if [ -n "$LATEST_BACKUP" ]; then
            log "Restoring from backup: $LATEST_BACKUP"
            
            rm -rf "$DEPLOYMENT_DIR"/*
            tar -xzf "$LATEST_BACKUP" -C "$DEPLOYMENT_DIR"
            
            systemctl start "$SERVICE_NAME"
            
            if health_check; then
                log "Rollback successful ✓"
            else
                error "Rollback failed - manual intervention required"
            fi
        else
            error "No backup available for rollback"
        fi
    fi
}

# Main deployment flow
main() {
    log "Starting MCP Server deployment for $DEPLOYMENT_ENV"
    log "========================================="
    
    # Set trap for rollback on error
    trap rollback ERR
    
    # Execute deployment steps
    check_prerequisites
    run_tests
    create_backup
    deploy_application
    
    if [ "$DEPLOYMENT_ENV" == "production" ]; then
        create_service
        configure_nginx
        setup_monitoring
        start_service
        health_check
    fi
    
    # Clear trap on success
    trap - ERR
    
    log "========================================="
    log "Deployment completed successfully! 🎉"
    
    if [ "$DEPLOYMENT_ENV" == "production" ]; then
        log "Service status: $(systemctl is-active $SERVICE_NAME)"
        log "Logs: $LOG_DIR"
        log "Monitor: systemctl status $SERVICE_NAME"
    fi
}

# Run main function
main "$@"