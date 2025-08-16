#!/bin/bash

# Demo Script: Story Reporter Integration with AI Dev Portal
# This script demonstrates the Story Reporter server functionality

set -e

echo "🚀 Story Reporter Demo - AI Dev Portal Integration"
echo "============================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Demo story report data
generate_story_report() {
    local title="$1"
    local status="$2"
    local coverage="$3"
    
    cat <<EOF
{
  "title": "$title",
  "description": "Automated story report demonstrating integration capabilities",
  "reporter": "demo@aidev.com",
  "status": "$status",
  "metadata": {
    "userStory": "US-DEMO-$(date +%s)",
    "testsCoverage": $coverage,
    "scenarios": [
      "User authentication flow",
      "Cross-service navigation",
      "Data persistence validation"
    ],
    "tags": ["demo", "integration", "automated"]
  },
  "content": "This story report demonstrates the complete integration between Story Reporter and AI Dev Portal. Key features tested include:\\n\\n1. **Authentication**: SSO through AI Dev Portal\\n2. **Service Discovery**: Automatic service registration\\n3. **Data Management**: CRUD operations on story reports\\n4. **UI Integration**: Embedded theme with consistent design\\n5. **Port Management**: Stage-based port allocation (3201/3301/3401)\\n\\nThe integration ensures seamless workflow between services while maintaining security and data integrity."
}
EOF
}

echo -e "${BLUE}Story Reporter Features:${NC}"
echo "1. 📝 Create and manage story reports"
echo "2. 🔍 Browse and filter reports"
echo "3. 📊 Track test coverage and metrics"
echo "4. 🌐 Stage-based deployment (dev/demo/release)"
echo "5. 🎨 AI Dev Portal theme integration"
echo "6. 🔐 Shared authentication with portal"
echo ""

echo -e "${BLUE}Port Configuration:${NC}"
echo "- Development: 3201"
echo "- Demo: 3301"
echo "- Release: 3401"
echo ""

echo -e "${BLUE}Creating Sample Story Reports...${NC}"
echo ""

# Generate sample reports
REPORTS_DIR="gen/doc/story-reporter-demo"
mkdir -p "$REPORTS_DIR"

# Report 1: E2E Test Success
echo -e "${GREEN}1. E2E Test Success Report${NC}"
generate_story_report "E2E Test: Authentication Flow" "completed" 98 > "$REPORTS_DIR/e2e-auth-success.json"
echo "   Status: ✅ Completed | Coverage: 98%"

# Report 2: Integration Test
echo -e "${GREEN}2. Integration Test Report${NC}"
generate_story_report "Integration: Service Discovery" "reviewed" 95 > "$REPORTS_DIR/integration-service-discovery.json"
echo "   Status: 🔍 Reviewed | Coverage: 95%"

# Report 3: Unit Test Report
echo -e "${GREEN}3. Unit Test Report${NC}"
generate_story_report "Unit Tests: Story CRUD Operations" "submitted" 100 > "$REPORTS_DIR/unit-crud-operations.json"
echo "   Status: 📤 Submitted | Coverage: 100%"

# Report 4: System Test Draft
echo -e "${GREEN}4. System Test Draft${NC}"
generate_story_report "System Test: Full Workflow" "draft" 85 > "$REPORTS_DIR/system-full-workflow.json"
echo "   Status: 📋 Draft | Coverage: 85%"

echo ""
echo -e "${BLUE}API Endpoints:${NC}"
echo "GET    /api/stories          - List all story reports"
echo "GET    /api/stories/:id      - Get specific report"
echo "POST   /api/stories          - Create new report"
echo "PUT    /api/stories/:id      - Update report"
echo "DELETE /api/stories/:id      - Delete report"
echo "GET    /health               - Health check"
echo ""

echo -e "${BLUE}Integration with AI Dev Portal:${NC}"
echo "✓ Automatic service registration on startup"
echo "✓ Shared JWT authentication tokens"
echo "✓ Consistent UI theme and components"
echo "✓ Cross-service navigation support"
echo "✓ Centralized configuration management"
echo ""

echo -e "${BLUE}Database Schema:${NC}"
echo "StoryReport {"
echo "  id: uuid"
echo "  title: string"
echo "  description: string"
echo "  reporter: string"
echo "  status: draft|submitted|reviewed|completed"
echo "  stage: development|demo|release"
echo "  metadata: {"
echo "    userStory?: string"
echo "    scenarios?: string[]"
echo "    testsCoverage?: number"
echo "    tags?: string[]"
echo "  }"
echo "  content: string"
echo "  timestamps: created/updated/submitted/reviewed"
echo "}"
echo ""

echo -e "${BLUE}Setup Instructions:${NC}"
echo "1. Run setup script: ./scripts/setup/setup-story-reporter.sh [environment]"
echo "2. Start server: ./start-story-reporter.sh"
echo "3. Access UI: http://localhost:[PORT]"
echo "4. API docs: http://localhost:[PORT]/api-docs"
echo ""

echo -e "${BLUE}E2E Test Workflow:${NC}"
echo "1. 🔐 Login to AI Dev Portal"
echo "2. 🦭 Navigate to Story Reporter"
echo "3. ➕ Create new story report"
echo "4. 🔍 Browse and filter reports"
echo "5. ✏️ Update report status"
echo "6. 📊 View coverage statistics"
echo "7. 🚀 Generate summary report"
echo "8. 🚪 Logout and verify"
echo ""

echo -e "${GREEN}Summary:${NC}"
echo "The Story Reporter server provides a comprehensive solution for"
echo "managing development story reports with full integration into the"
echo "AI Dev Portal ecosystem. It supports stage-based deployment,"
echo "real-time metrics tracking, and seamless authentication flow."
echo ""
echo "Sample reports saved to: $REPORTS_DIR"
echo ""
echo -e "${YELLOW}To run the full E2E test:${NC}"
echo "./scripts/test-story-reporter-e2e.sh"
echo ""
echo "✨ Demo complete!"