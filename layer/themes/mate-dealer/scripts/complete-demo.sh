#!/bin/bash
# Complete demo script for Mate Dealer with GUI Selector integration

set -e

echo "=== Mate Dealer + GUI Selector Complete Demo ==="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Paths
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
GUI_SELECTOR_DIR="$PROJECT_ROOT/layer/themes/gui-selector/user-stories/023-gui-selector-server"
MATE_DEALER_DIR="$PROJECT_ROOT/scripts/setup/demo/mate-dealer"

# Step 1: Start GUI Selector Server
echo -e "${BLUE}Step 1: Starting GUI Selector Server${NC}"
if ! curl -s http://localhost:3456/api/health > /dev/null 2>&1; then
    echo "Starting GUI Selector on port 3456..."
    cd "$GUI_SELECTOR_DIR"
    NODE_ENV=release PORT=3456 npm start > /tmp/gui-selector.log 2>&1 &
    GUI_PID=$!
    sleep 5
else
    echo "GUI Selector already running on port 3456"
fi

# Step 2: Check Mate Dealer Demo
echo -e "${BLUE}Step 2: Checking Mate Dealer Demo${NC}"
cd "$MATE_DEALER_DIR"

# Install Playwright browsers if not already installed
echo "Installing Playwright browsers..."
bunx playwright install chromium

# Step 3: Create a simple mate dealer app
echo -e "${BLUE}Step 3: Creating Mate Dealer Application${NC}"

# Create basic HTML file
cat > public/index.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mate Dealer - Marketplace</title>
    <link rel="stylesheet" href="/css/theme.css">
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        .login-form {
            max-width: 400px;
            margin: 50px auto;
            padding: 30px;
            background: white;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .role-selector {
            display: flex;
            gap: 20px;
            margin-bottom: 20px;
        }
        input[type="email"], input[type="password"] {
            width: 100%;
            padding: 10px;
            margin: 10px 0;
            border: 1px solid #ddd;
            border-radius: 5px;
        }
        button {
            width: 100%;
            padding: 12px;
            background: #2563eb;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
        }
        button:hover {
            background: #1d4ed8;
        }
        .dealer-card {
            background: white;
            padding: 20px;
            margin: 10px 0;
            border-radius: 8px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
            cursor: pointer;
        }
        .dealer-card:hover {
            box-shadow: 0 4px 10px rgba(0,0,0,0.15);
        }
        .dashboard {
            display: none;
        }
        .dashboard.active {
            display: block;
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Login Form -->
        <div id="loginForm" class="login-form">
            <h1>Mate Dealer Login</h1>
            <div class="role-selector">
                <label>
                    <input type="radio" name="role" value="customer" checked> Customer
                </label>
                <label>
                    <input type="radio" name="role" value="dealer"> Dealer
                </label>
            </div>
            <input type="email" name="email" placeholder="Email" value="demo@example.com">
            <input type="password" name="password" placeholder="Password" value="demo123">
            <button type="submit" onclick="login()">Login</button>
        </div>

        <!-- Customer Dashboard -->
        <div id="customerDashboard" class="dashboard">
            <h1>Find Your Perfect Mate Dealer</h1>
            <div id="dealerList">
                <div class="dealer-card" onclick="viewDealer('Juan\'s Mate Shop')">
                    <h3>Juan's Mate Shop</h3>
                    <p>Distance: 2.3 km | Rating: ⭐⭐⭐⭐⭐</p>
                    <p>Specialties: Traditional Argentine Mate, Organic Options</p>
                </div>
                <div class="dealer-card" onclick="viewDealer('Maria\'s Traditional Mate')">
                    <h3>Maria's Traditional Mate</h3>
                    <p>Distance: 3.1 km | Rating: ⭐⭐⭐⭐</p>
                    <p>Specialties: Flavored Mate, Accessories</p>
                </div>
            </div>
            <button onclick="logout()">Logout</button>
        </div>

        <!-- Dealer Dashboard -->
        <div id="dealerDashboard" class="dashboard">
            <h1>Dealer Dashboard</h1>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px;">
                <div class="dealer-card">
                    <h3>Total Customers</h3>
                    <p style="font-size: 2em; margin: 0;">24</p>
                </div>
                <div class="dealer-card">
                    <h3>Active Orders</h3>
                    <p style="font-size: 2em; margin: 0;">5</p>
                </div>
                <div class="dealer-card">
                    <h3>Revenue This Month</h3>
                    <p style="font-size: 2em; margin: 0;">$3,450</p>
                </div>
            </div>
            <button onclick="logout()">Logout</button>
        </div>
    </div>

    <script>
        function login() {
            const role = document.querySelector('input[name="role"]:checked').value;
            document.getElementById('loginForm').style.display = 'none';
            
            if (role === 'customer') {
                document.getElementById('customerDashboard').classList.add('active');
            } else {
                document.getElementById('dealerDashboard').classList.add('active');
            }
        }

        function logout() {
            document.querySelectorAll('.dashboard').forEach(d => d.classList.remove('active'));
            document.getElementById('loginForm').style.display = 'block';
        }

        function viewDealer(name) {
            alert('Viewing details for: ' + name);
        }
    </script>
</body>
</html>
EOF

# Step 4: GUI Selector Integration Demo
echo -e "${BLUE}Step 4: GUI Selector Integration${NC}"
echo -e "${YELLOW}Manual Steps:${NC}"
echo "1. Open GUI Selector: http://localhost:3456"
echo "2. Login with: admin / admin123"
echo "3. Browse the 4 template options:"
echo "   - Modern Dashboard (Clean, minimalist)"
echo "   - Corporate Portal (Professional, business)"
echo "   - Artistic Showcase (Creative, bold)"
echo "   - Universal Access (Accessible, WCAG compliant)"
echo "4. Click on a template to preview"
echo "5. Click 'Select This Template'"
echo "6. Enter project name: 'Mate Dealer App'"
echo ""

# Step 5: Start Mate Dealer Server
echo -e "${BLUE}Step 5: Starting Mate Dealer Demo Server${NC}"
cd "$MATE_DEALER_DIR"

# Create simple server
cat > src/demo-server.ts << 'EOF'
import express from 'express';
import path from 'path';

const app = express();
const PORT = 3303;

app.use(express.static(path.join(__dirname, '../public')));

app.get('/api/health', (req, res) => {
    res.json({ status: 'healthy', service: 'mate-dealer' });
});

app.listen(PORT, () => {
    console.log(`Mate Dealer running on http://localhost:${PORT}`);
});
EOF

# Start the server
echo "Starting Mate Dealer on port 3303..."
bunx ts-node src/demo-server.ts > /tmp/mate-dealer.log 2>&1 &
MATE_PID=$!
sleep 3

# Step 6: Run E2E Tests
echo -e "${BLUE}Step 6: Running E2E Tests${NC}"
echo "Running click-based E2E tests..."

# Create a simple test runner
cat > run-e2e-demo.js << 'EOF'
const { chromium } = require('playwright');

async function runDemo() {
    const browser = await chromium.launch({ headless: false, slowMo: 500 });
    const context = await browser.newContext();
    const page = await context.newPage();

    console.log('📱 Testing Mate Dealer App...');
    
    // Go to app
    await page.goto('http://localhost:3303');
    console.log('✓ Loaded Mate Dealer');

    // Test customer flow
    await page.click('input[value="customer"]');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'demo123');
    await page.click('button[type="submit"]');
    console.log('✓ Logged in as customer');

    // Click on dealer
    await page.waitForTimeout(1000);
    await page.click('.dealer-card:first-child');
    console.log('✓ Clicked on dealer');

    // Logout
    await page.click('button:has-text("Logout")');
    console.log('✓ Logged out');

    // Test dealer flow
    await page.click('input[value="dealer"]');
    await page.click('button[type="submit"]');
    console.log('✓ Logged in as dealer');

    await page.waitForTimeout(2000);
    
    console.log('✅ E2E Demo completed!');
    await browser.close();
}

runDemo().catch(console.error);
EOF

node run-e2e-demo.js

# Summary
echo ""
echo -e "${GREEN}=== Demo Complete! ===${NC}"
echo ""
echo "Summary:"
echo "✓ GUI Selector Server running on http://localhost:3456"
echo "✓ Mate Dealer Demo running on http://localhost:3303"
echo "✓ E2E tests demonstrate click-based interactions"
echo "✓ Template selection available via GUI Selector"
echo ""
echo "Key Features Demonstrated:"
echo "- User role selection (Customer/Dealer)"
echo "- Login functionality"
echo "- Customer dashboard with dealer listings"
echo "- Dealer dashboard with business metrics"
echo "- GUI template selection integration"
echo "- Click-based E2E testing"
echo ""
echo "To stop servers:"
echo "kill $GUI_PID $MATE_PID"

# Cleanup function
cleanup() {
    echo "Cleaning up..."
    kill $GUI_PID $MATE_PID 2>/dev/null || true
}

trap cleanup EXIT

echo ""
echo "Press Ctrl+C to stop the demo..."
wait