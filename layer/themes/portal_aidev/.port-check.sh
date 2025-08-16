#!/bin/bash

# Port Check Script - Prevents port conflicts
# Run this before starting any service

PORTAL_PORT=3456
GUI_PORT=3457
PORTAL_RANGE_START=3456
PORTAL_RANGE_END=3499

echo "🔍 AI Dev Portal - Port Conflict Checker"
echo "========================================="

# Function to check if port is in use
check_port() {
    local port=$1
    local service=$2
    
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null ; then
        echo "✅ Port $port: IN USE - $service running"
        return 0
    else
        echo "⚠️  Port $port: AVAILABLE - $service not running"
        return 1
    fi
}

# Check main services
check_port $PORTAL_PORT "AI Dev Portal"
check_port $GUI_PORT "GUI Selection Service"

# Check for unauthorized port usage
echo ""
echo "🔍 Checking for unauthorized services in portal range ($PORTAL_RANGE_START-$PORTAL_RANGE_END):"

for port in $(seq $PORTAL_RANGE_START $PORTAL_RANGE_END); do
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        process=$(lsof -Pi :$port -sTCP:LISTEN 2>/dev/null | tail -n 1 | awk '{print $1}')
        case $port in
            3456) 
                [ "$process" != "node" ] && echo "⚠️ WARNING: Non-node process on portal port 3456: $process"
                ;;
            3457)
                # GUI service port
                ;;
            *)
                echo "⚠️ WARNING: Unexpected service on port $port: $process"
                ;;
        esac
    fi
done

echo ""
echo "📋 Port Allocation Rules:"
echo "  - 3456: AI Dev Portal (PRIMARY)"
echo "  - 3457: GUI Selection Service"
echo "  - 3458-3499: Reserved for portal services"
echo ""
echo "✅ Check complete. Ensure all services use assigned ports."