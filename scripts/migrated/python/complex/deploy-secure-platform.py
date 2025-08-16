#!/usr/bin/env python3
"""
Migrated from: deploy-secure-platform.sh
Auto-generated Python - 2025-08-16T04:57:27.719Z
"""

import os
import sys
import subprocess
import shutil
import glob
from pathlib import Path

def main():
    # Deploy AI Development Platform with Security
    # Runs all components with Bun and security features enabled
    subprocess.run("set -e", shell=True)
    # Colors for output
    subprocess.run("GREEN='\033[0;32m'", shell=True)
    subprocess.run("BLUE='\033[0;34m'", shell=True)
    subprocess.run("YELLOW='\033[1;33m'", shell=True)
    subprocess.run("RED='\033[0;31m'", shell=True)
    subprocess.run("NC='\033[0m' # No Color", shell=True)
    print("╔════════════════════════════════════════════════╗")
    print("║   AI Development Platform - Secure Deployment   ║")
    print("╚════════════════════════════════════════════════╝")
    print("")
    # Check for Bun
    subprocess.run("if ! command -v bun &> /dev/null; then", shell=True)
    print("-e ")${RED}❌ Bun is not installed${NC}"
    print("Install Bun with: curl -fsSL https://bun.sh/install | bash")
    sys.exit(1)
    print("-e ")${GREEN}✅ Bun $(bun --version) found${NC}"
    print("")
    # Environment setup
    os.environ["NODE_ENV"] = "${NODE_ENV:-production}"
    os.environ["JWT_ACCESS_SECRET"] = "${JWT_ACCESS_SECRET:-$(openssl rand -hex 32)}"
    os.environ["JWT_REFRESH_SECRET"] = "${JWT_REFRESH_SECRET:-$(openssl rand -hex 32)}"
    os.environ["ALLOWED_ORIGINS"] = "${ALLOWED_ORIGINS:-"http://localhost:3000,http://localhost:3456,http://localhost:8080"}"
    print("🔐 Security Configuration:")
    print("   NODE_ENV: $NODE_ENV")
    print("   JWT configured: ✅")
    print("   CORS origins: $ALLOWED_ORIGINS")
    print("")
    # Component configuration
    subprocess.run("COMPONENTS=(", shell=True)
    subprocess.run(""GUI_SELECTOR:release/gui-selector-portal:3465:src/server.ts"", shell=True)
    subprocess.run(""GUI_SERVER:_aidev:3457:50.src/51.ui/gui-server-secure.ts"", shell=True)
    subprocess.run(""MONITORING:monitoring:3000:dashboard-server-secure.ts"", shell=True)
    subprocess.run(""AI_PORTAL:_aidev:8080:50.src/51.ui/ai-dev-portal-secure.ts"", shell=True)
    subprocess.run(")", shell=True)
    # Function to start a component
    subprocess.run("start_component() {", shell=True)
    subprocess.run("local name=$1", shell=True)
    subprocess.run("local dir=$2", shell=True)
    subprocess.run("local port=$3", shell=True)
    subprocess.run("local script=$4", shell=True)
    print("-e ")${BLUE}Starting $name on port $port...${NC}"
    if -d "$dir" :; then
    os.chdir(""$dir"")
    # Install dependencies if needed
    if ! -d "node_modules" :; then
    print("   Installing dependencies...")
    subprocess.run("bun install --silent", shell=True)
    # Start with Bun in background
    subprocess.run("PORT=$port bun $script > /tmp/${name}.log 2>&1 &", shell=True)
    subprocess.run("local pid=$!", shell=True)
    time.sleep(2)
    # Check if running
    subprocess.run("if kill -0 $pid 2>/dev/null; then", shell=True)
    print("-e ")${GREEN}   ✅ $name started (PID: $pid)${NC}"
    print("$pid > /tmp/${name}.pid")
    else:
    print("-e ")${RED}   ❌ $name failed to start${NC}"
    subprocess.run("cat /tmp/${name}.log", shell=True)
    os.chdir("- > /dev/null")
    else:
    print("-e ")${YELLOW}   ⚠️  $name directory not found: $dir${NC}"
    print("")
    subprocess.run("}", shell=True)
    # Function to stop all components
    subprocess.run("stop_all() {", shell=True)
    print("Stopping all components...")
    for component in ["${COMPONENTS[@]}"; do]:
    subprocess.run("IFS=':' read -r name dir port script <<< "$component"", shell=True)
    if -f "/tmp/${name}.pid" :; then
    subprocess.run("kill $(cat /tmp/${name}.pid) 2>/dev/null || true", shell=True)
    subprocess.run("rm /tmp/${name}.pid", shell=True)
    print("   Stopped $name")
    subprocess.run("}", shell=True)
    # Handle Ctrl+C
    subprocess.run("trap stop_all INT TERM", shell=True)
    # Parse command
    subprocess.run("case "${1:-start}" in", shell=True)
    subprocess.run("start)", shell=True)
    print("🚀 Starting all components...")
    print("")
    for component in ["${COMPONENTS[@]}"; do]:
    subprocess.run("IFS=':' read -r name dir port script <<< "$component"", shell=True)
    subprocess.run("start_component "$name" "$dir" "$port" "$script"", shell=True)
    print("════════════════════════════════════════════════")
    print("🎉 Platform deployed successfully!")
    print("")
    print("📍 Access Points:")
    print("   AI Dev Portal:       http://localhost:8080 (Main Entry)")
    print("   GUI Selector Portal: http://localhost:3465")
    print("   GUI Design Server:   http://localhost:3457")
    print("   Monitoring Dashboard: http://localhost:3000")
    print("")
    print("🔒 Security Features Active:")
    print("   ✅ All security headers enabled")
    print("   ✅ CSRF protection active")
    print("   ✅ Rate limiting configured")
    print("   ✅ XSS protection enabled")
    print("   ✅ Input sanitization active")
    print("")
    print("Press Ctrl+C to stop all services")
    # Keep script running
    while true; do:
    time.sleep(60)
    print("-n ")."
    subprocess.run(";;", shell=True)
    subprocess.run("stop)", shell=True)
    subprocess.run("stop_all", shell=True)
    print("✅ All components stopped")
    subprocess.run(";;", shell=True)
    subprocess.run("restart)", shell=True)
    subprocess.run("$0 stop", shell=True)
    time.sleep(2)
    subprocess.run("$0 start", shell=True)
    subprocess.run(";;", shell=True)
    subprocess.run("status)", shell=True)
    print("Component Status:")
    for component in ["${COMPONENTS[@]}"; do]:
    subprocess.run("IFS=':' read -r name dir port script <<< "$component"", shell=True)
    if -f "/tmp/${name}.pid" : && kill -0 $(cat /tmp/${name}.pid) 2>/dev/null; then
    print("-e ")   ${GREEN}✅ $name: Running (PID: $(cat /tmp/${name}.pid))${NC}"
    else:
    print("-e ")   ${RED}❌ $name: Not running${NC}"
    subprocess.run(";;", shell=True)
    subprocess.run("test)", shell=True)
    print("🧪 Testing security features...")
    print("")
    # Test each component
    for component in ["${COMPONENTS[@]}"; do]:
    subprocess.run("IFS=':' read -r name dir port script <<< "$component"", shell=True)
    print("Testing $name on port $port...")
    # Check if running
    subprocess.run("response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:$port/api/health 2>/dev/null || echo "000")", shell=True)
    if "$response" == "200" ] || [ "$response" == "404" :; then
    print("-e ")${GREEN}   ✅ $name responding${NC}"
    # Check security headers
    subprocess.run("headers=$(curl -sI http://localhost:$port | grep -i "x-content-type\|x-frame\|strict-transport" | wc -l)", shell=True)
    if $headers -gt 0 :; then
    print("-e ")${GREEN}   ✅ Security headers present${NC}"
    else:
    print("-e ")${YELLOW}   ⚠️  Some security headers missing${NC}"
    else:
    print("-e ")${RED}   ❌ $name not responding (HTTP $response)${NC}"
    print("")
    subprocess.run(";;", shell=True)
    subprocess.run("*)", shell=True)
    print("Usage: $0 {start|stop|restart|status|test}")
    print("")
    print("Commands:")
    print("  start   - Start all components")
    print("  stop    - Stop all components")
    print("  restart - Restart all components")
    print("  status  - Check component status")
    print("  test    - Test security features")
    sys.exit(1)
    subprocess.run(";;", shell=True)
    subprocess.run("esac", shell=True)

if __name__ == "__main__":
    main()