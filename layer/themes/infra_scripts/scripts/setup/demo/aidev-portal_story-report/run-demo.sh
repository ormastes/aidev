#!/bin/bash

# Story Reporter + AI Dev Portal Demo Runner

echo "================================================"
echo "Story Reporter + AI Dev Portal Integration Demo"
echo "================================================"
echo ""

# Set environment variables (optional)
export AI_DEV_PORTAL_HOST=${AI_DEV_PORTAL_HOST:-localhost}
export AI_DEV_PORTAL_PORT=${AI_DEV_PORTAL_PORT:-3456}

echo "Configuration:"
echo "- AI Dev Portal Host: $AI_DEV_PORTAL_HOST"
echo "- AI Dev Portal Port: $AI_DEV_PORTAL_PORT"
echo ""

# Check if ai_dev_portal is running
echo "Checking AI Dev Portal connection..."
nc -z $AI_DEV_PORTAL_HOST $AI_DEV_PORTAL_PORT 2>/dev/null
if [ $? -eq 0 ]; then
    echo "✓ AI Dev Portal is running"
else
    echo "⚠ AI Dev Portal is not running (demo will simulate responses)"
fi
echo ""

# Run the story reporter
echo "Starting Story Reporter..."
echo "------------------------"
node story-reporter.js

# Check if report was generated
REPORT_FILE=$(ls -t story-report-*.json 2>/dev/null | head -1)
if [ -n "$REPORT_FILE" ]; then
    echo ""
    echo "Latest report file: $REPORT_FILE"
    echo ""
    echo "Report contents:"
    echo "----------------"
    cat "$REPORT_FILE"
fi

echo ""
echo "Demo completed!"