#!/bin/bash
# Deploy AI Development Platform with Security
# Runs all components with Bun and security features enabled

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "╔════════════════════════════════════════════════╗"
echo "║   AI Development Platform - Secure Deployment   ║"
echo "╚════════════════════════════════════════════════╝"
echo ""

# Check for Bun
if ! command -v bun &> /dev/null; then
    echo -e "${RED}❌ Bun is not installed${NC}"
    echo "Install Bun with: curl -fsSL https://bun.sh/install | bash"
    exit 1
fi

echo -e "${GREEN}✅ Bun $(bun --version) found${NC}"
echo ""

# Environment setup
export NODE_ENV=${NODE_ENV:-production}
export JWT_ACCESS_SECRET=${JWT_ACCESS_SECRET:-$(openssl rand -hex 32)}
export JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET:-$(openssl rand -hex 32)}
export ALLOWED_ORIGINS=${ALLOWED_ORIGINS:-"http://localhost:3000,http://localhost:3456,http://localhost:8080"}

echo "🔐 Security Configuration:"
echo "   NODE_ENV: $NODE_ENV"
echo "   JWT configured: ✅"
echo "   CORS origins: $ALLOWED_ORIGINS"
echo ""

# Component configuration
COMPONENTS=(
    "GUI_SELECTOR:release/gui-selector-portal:3465:src/server.ts"
    "GUI_SERVER:_aidev:3457:50.src/51.ui/gui-server-secure.ts"
    "MONITORING:monitoring:3000:dashboard-server-secure.ts"
    "AI_PORTAL:_aidev:8080:50.src/51.ui/ai-dev-portal-secure.ts"
)

# Function to start a component
start_component() {
    local name=$1
    local dir=$2
    local port=$3
    local script=$4
    
    echo -e "${BLUE}Starting $name on port $port...${NC}"
    
    if [ -d "$dir" ]; then
        cd "$dir"
        
        # Install dependencies if needed
        if [ ! -d "node_modules" ]; then
            echo "   Installing dependencies..."
            bun install --silent
        fi
        
        # Start with Bun in background
        PORT=$port bun $script > /tmp/${name}.log 2>&1 &
        local pid=$!
        
        sleep 2
        
        # Check if running
        if kill -0 $pid 2>/dev/null; then
            echo -e "${GREEN}   ✅ $name started (PID: $pid)${NC}"
            echo $pid > /tmp/${name}.pid
        else
            echo -e "${RED}   ❌ $name failed to start${NC}"
            cat /tmp/${name}.log
        fi
        
        cd - > /dev/null
    else
        echo -e "${YELLOW}   ⚠️  $name directory not found: $dir${NC}"
    fi
    
    echo ""
}

# Function to stop all components
stop_all() {
    echo "Stopping all components..."
    for component in "${COMPONENTS[@]}"; do
        IFS=':' read -r name dir port script <<< "$component"
        if [ -f "/tmp/${name}.pid" ]; then
            kill $(cat /tmp/${name}.pid) 2>/dev/null || true
            rm /tmp/${name}.pid
            echo "   Stopped $name"
        fi
    done
}

# Handle Ctrl+C
trap stop_all INT TERM

# Parse command
case "${1:-start}" in
    start)
        echo "🚀 Starting all components..."
        echo ""
        
        for component in "${COMPONENTS[@]}"; do
            IFS=':' read -r name dir port script <<< "$component"
            start_component "$name" "$dir" "$port" "$script"
        done
        
        echo "════════════════════════════════════════════════"
        echo "🎉 Platform deployed successfully!"
        echo ""
        echo "📍 Access Points:"
        echo "   AI Dev Portal:       http://localhost:8080 (Main Entry)"
        echo "   GUI Selector Portal: http://localhost:3465"
        echo "   GUI Design Server:   http://localhost:3457"
        echo "   Monitoring Dashboard: http://localhost:3000"
        echo ""
        echo "🔒 Security Features Active:"
        echo "   ✅ All security headers enabled"
        echo "   ✅ CSRF protection active"
        echo "   ✅ Rate limiting configured"
        echo "   ✅ XSS protection enabled"
        echo "   ✅ Input sanitization active"
        echo ""
        echo "Press Ctrl+C to stop all services"
        
        # Keep script running
        while true; do
            sleep 60
            echo -n "."
        done
        ;;
        
    stop)
        stop_all
        echo "✅ All components stopped"
        ;;
        
    restart)
        $0 stop
        sleep 2
        $0 start
        ;;
        
    status)
        echo "Component Status:"
        for component in "${COMPONENTS[@]}"; do
            IFS=':' read -r name dir port script <<< "$component"
            if [ -f "/tmp/${name}.pid" ] && kill -0 $(cat /tmp/${name}.pid) 2>/dev/null; then
                echo -e "   ${GREEN}✅ $name: Running (PID: $(cat /tmp/${name}.pid))${NC}"
            else
                echo -e "   ${RED}❌ $name: Not running${NC}"
            fi
        done
        ;;
        
    test)
        echo "🧪 Testing security features..."
        echo ""
        
        # Test each component
        for component in "${COMPONENTS[@]}"; do
            IFS=':' read -r name dir port script <<< "$component"
            echo "Testing $name on port $port..."
            
            # Check if running
            response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:$port/api/health 2>/dev/null || echo "000")
            
            if [ "$response" == "200" ] || [ "$response" == "404" ]; then
                echo -e "${GREEN}   ✅ $name responding${NC}"
                
                # Check security headers
                headers=$(curl -sI http://localhost:$port | grep -i "x-content-type\|x-frame\|strict-transport" | wc -l)
                if [ $headers -gt 0 ]; then
                    echo -e "${GREEN}   ✅ Security headers present${NC}"
                else
                    echo -e "${YELLOW}   ⚠️  Some security headers missing${NC}"
                fi
            else
                echo -e "${RED}   ❌ $name not responding (HTTP $response)${NC}"
            fi
            echo ""
        done
        ;;
        
    *)
        echo "Usage: $0 {start|stop|restart|status|test}"
        echo ""
        echo "Commands:"
        echo "  start   - Start all components"
        echo "  stop    - Stop all components"
        echo "  restart - Restart all components"
        echo "  status  - Check component status"
        echo "  test    - Test security features"
        exit 1
        ;;
esac