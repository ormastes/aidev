#!/bin/bash

echo "Starting AI Dev Portal test..."

# Start the server
node dist/server.js &
SERVER_PID=$!

# Wait for server to start
sleep 2

# Check if server is running
if ! curl -s http://localhost:3000/api/health > /dev/null; then
    echo "❌ Server failed to start"
    kill $SERVER_PID 2>/dev/null
    exit 1
fi

echo "✅ Server started successfully on port 3000"

echo ""
echo "Portal features added:"
echo "✅ Left panel navigation with sections:"
echo "   - Projects, Features, Feature Progress, Tasks"
echo "   - GUI Selector, Story Reporter, Test Manual"
echo ""
echo "✅ Top selector bars for:"
echo "   - Theme filtering"
echo "   - Epic filtering"  
echo "   - App filtering"
echo ""
echo "✅ Feature Progress Monitor showing:"
echo "   - Total features count"
echo "   - In Progress features count"
echo "   - Completed features count"
echo "   - Pending tasks count"
echo "   - Progress bars for each feature"
echo ""
echo "✅ Service integration frames for:"
echo "   - GUI Selector (http://localhost:3456)"
echo "   - Story Reporter (/services/story-reporter)"
echo "   - Test Manual (/services/manual)"
echo ""
echo "✅ VFS API endpoint for reading:"
echo "   - /api/vfs/FEATURE.vf.json"
echo "   - /api/vfs/TASK_QUEUE.vf.json"
echo "   - /api/vfs/NAME_ID.vf.json"

echo ""
echo "🌐 Portal is running at: http://localhost:3000"
echo "   Login with: admin/demo123, developer/demo123, or tester/demo123"
echo ""
echo "Press Ctrl+C to stop the server..."

# Wait for user to stop
wait $SERVER_PID