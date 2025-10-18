#!/bin/bash
# AI Dev Portal Startup Script
# Enhanced Task Queue Portal with Filtering and Search

cd "$(dirname "$0")"

# Kill any existing server on port 3456
lsof -ti:3456 | xargs -r kill -9 2>/dev/null

echo "🚀 Starting AI Dev Portal - Enhanced Task Queue Dashboard"
echo "📋 Primary display: TASK_QUEUE.vf.json"
echo "✨ Features: Filtering, Search, Expandable Details"
echo ""

# Start the enhanced server
bun run server-aidev-enhanced.ts

echo ""
echo "Portal available at: http://localhost:3456"
echo "API endpoints:"
echo "  - Task Queue: http://localhost:3456/api/tasks"
echo "  - Filtered: http://localhost:3456/api/tasks/filter"
echo "  - Health: http://localhost:3456/health"