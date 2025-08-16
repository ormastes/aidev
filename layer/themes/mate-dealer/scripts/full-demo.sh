#!/bin/bash

# Complete Mate Dealer Demo Script
set -e

echo "🧉 Mate Dealer - Full Demo Experience"
echo "====================================="
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

DEMO_DIR="/home/ormastes/dev/aidev/scripts/setup/demo/mate-dealer"

# Function to wait for user
wait_for_user() {
    echo ""
    echo -e "${YELLOW}Press Enter to continue...${NC}"
    read -r
}

# Function to show section
show_section() {
    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}$1${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

# Introduction
show_section "🎯 Demo Overview"
echo "This demo showcases the Mate Dealer marketplace application with:"
echo ""
echo "✨ Features Demonstrated:"
echo "  • Secure authentication with JWT and bcrypt"
echo "  • Role-based navigation (Customer/Dealer)"
echo "  • Enhanced search and filtering"
echo "  • External logging system with debug panel"
echo "  • Responsive design with mobile support"
echo "  • Click-based E2E testing"
echo "  • GUI selector integration"
echo ""
echo "🛡️ Security Features:"
echo "  • Password hashing"
echo "  • Rate limiting"
echo "  • Security headers (Helmet)"
echo "  • Input validation"

wait_for_user

# Check dependencies
show_section "📋 Checking Dependencies"
cd "$DEMO_DIR"

if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Dependencies not installed. Running setup...${NC}"
    ./setup.sh
else
    echo -e "${GREEN}✓ Dependencies already installed${NC}"
fi

# Start servers
show_section "🚀 Starting Servers"

# Check if servers are already running
SERVER_PID=""
if ! curl -s http://localhost:3303/api/health > /dev/null 2>&1; then
    echo "Starting Mate Dealer server on port 3303..."
    npm run build > /dev/null 2>&1
    NODE_ENV=demo npm start > /tmp/mate-dealer-demo.log 2>&1 &
    SERVER_PID=$!
    sleep 5
    echo -e "${GREEN}✓ Server started${NC}"
else
    echo -e "${GREEN}✓ Server already running on port 3303${NC}"
fi

# Demo walkthrough
show_section "🎭 Interactive Demo - Customer Journey"
echo "1. Open your browser to: http://localhost:3303"
echo "2. You'll see the login page with role selection"
echo ""
echo "Customer Login:"
echo "  • Email: demo@example.com"
echo "  • Password: demo123"
echo ""
echo "Try these actions:"
echo "  • Search for 'Traditional' mate"
echo "  • Click the filter button and adjust distance/rating"
echo "  • Click on dealer cards to view details"
echo "  • Navigate through sidebar menu items"
echo "  • Try the mobile view (resize browser)"

wait_for_user

show_section "💼 Interactive Demo - Dealer Journey"
echo "1. Logout and switch to Dealer role"
echo "2. Login with same credentials"
echo ""
echo "Dealer Features:"
echo "  • View business metrics dashboard"
echo "  • Click through different tabs (Products, Customers, Analytics)"
echo "  • Navigate using the sidebar"
echo "  • Try the quick action buttons"

wait_for_user

show_section "🐛 Debug Panel Demo"
echo "Press Ctrl+Shift+D (Cmd+Shift+D on Mac) to toggle the debug panel"
echo ""
echo "Debug Panel Features:"
echo "  • View real-time logs"
echo "  • Monitor performance metrics"
echo "  • Track API requests"
echo "  • Clear logs and toggle auto-refresh"

wait_for_user

show_section "🧪 Running E2E Tests"
echo "Now let's run the comprehensive click-based E2E tests..."
echo ""

# Run E2E tests
if command -v bunx &> /dev/null; then
    echo -e "${BLUE}Running E2E tests...${NC}"
    ./run-e2e-tests.sh complete
else
    echo -e "${RED}Playwright not installed. Skipping E2E tests.${NC}"
fi

wait_for_user

show_section "🎨 GUI Selector Integration"
echo "The Mate Dealer demo integrates with the GUI Selector:"
echo ""
echo "1. Ensure GUI Selector is running on port 3456"
echo "2. Login to GUI Selector (admin/admin123)"
echo "3. Select a template for the Mate Dealer app"
echo "4. The selected theme will be applied to the app"

wait_for_user

show_section "📊 Performance & Logging"
echo "Check the application logs:"
echo ""
echo "Server logs: tail -f /tmp/mate-dealer-demo.log"
echo ""
echo "The External Logger tracks:"
echo "  • User actions and navigation"
echo "  • API request performance"
echo "  • Search and filter usage"
echo "  • Error tracking"
echo "  • Performance metrics"

wait_for_user

show_section "🔒 Security Features Demo"
echo "Security features implemented:"
echo ""
echo "1. Try logging in with wrong credentials"
echo "2. Make rapid login attempts (rate limiting)"
echo "3. Check network tab for security headers"
echo "4. JWT tokens expire after 15 minutes"
echo "5. Passwords are hashed with bcrypt"

wait_for_user

show_section "📱 Mobile Responsive Demo"
echo "Test mobile responsiveness:"
echo ""
echo "1. Resize browser to mobile width (< 768px)"
echo "2. Click hamburger menu to open navigation"
echo "3. Navigate between pages"
echo "4. Test search and filters on mobile"
echo "5. Verify touch-friendly interface"

wait_for_user

# Cleanup
show_section "🧹 Demo Complete"
echo "Thank you for exploring the Mate Dealer demo!"
echo ""
echo "Key Achievements:"
echo "  ✅ Full-stack implementation with React & Express"
echo "  ✅ Secure authentication and authorization"
echo "  ✅ Role-based navigation system"
echo "  ✅ Enhanced search and filtering"
echo "  ✅ Comprehensive E2E testing"
echo "  ✅ Production-ready security features"
echo "  ✅ External logging and monitoring"
echo "  ✅ Responsive design"
echo ""

if [ ! -z "$SERVER_PID" ]; then
    echo -e "${YELLOW}Stopping demo server...${NC}"
    kill $SERVER_PID 2>/dev/null || true
fi

echo -e "${GREEN}Demo completed successfully!${NC}"
echo ""
echo "To run again:"
echo "  cd $DEMO_DIR && npm run dev"
echo ""
echo "To run tests:"
echo "  cd $DEMO_DIR && npm run test:e2e"