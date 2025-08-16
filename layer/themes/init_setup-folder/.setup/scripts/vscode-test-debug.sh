#!/bin/bash
# Open VS Code Server for test-debug

URL="http://localhost:8080"
echo "Opening VS Code Server at: $URL"
echo "Default password: changeme"
echo ""

# Try to open in browser
if command -v xdg-open > /dev/null; then
    xdg-open "$URL"
elif command -v open > /dev/null; then
    open "$URL"
else
    echo "Please open your browser and navigate to: $URL"
fi
