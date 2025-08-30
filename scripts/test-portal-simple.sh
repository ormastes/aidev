#!/bin/bash

echo "🎭 AI Dev Portal - Test Results"
echo "================================"
echo ""

# Start portal
cd layer/themes/init_setup-folder
bun run children/services/project-aware-portal.ts > /dev/null 2>&1 &
PORTAL_PID=$!
cd ../../..
sleep 3

# Test 1: Server running
echo "1. Server Status:"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3156)
echo "   HTTP Response: $STATUS"
[[ $STATUS == "200" ]] && echo "   ✅ Server is running"

# Test 2: Projects API
echo ""
echo "2. Projects Discovery:"
PROJECTS=$(curl -s http://localhost:3156/api/projects | grep -o '"id"' | wc -l)
echo "   Found $PROJECTS projects"
[[ $PROJECTS -gt 0 ]] && echo "   ✅ Projects discovered"

# Test 3: Services API
echo ""
echo "3. Services Available:"
SERVICES=$(curl -s http://localhost:3156/api/services | grep -o '"name"' | wc -l)
echo "   Found $SERVICES services"
[[ $SERVICES -gt 0 ]] && echo "   ✅ Services discovered"

# Test 4: Service endpoints
echo ""
echo "4. Service Endpoints:"
for service in task-queue gui-selector story-reporter feature-viewer; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3156/services/$service)
  echo "   - /services/$service: $STATUS"
done

# Test 5: Portal content
echo ""
echo "5. Portal Features:"
HTML=$(curl -s http://localhost:3156)
[[ $HTML == *"AI Dev Portal"* ]] && echo "   ✅ Title present"
[[ $HTML == *"project"* ]] && echo "   ✅ Project selector present"
[[ $HTML == *"service-card"* ]] && echo "   ✅ Service cards present"
[[ $HTML == *"Modal"* ]] && echo "   ✅ Modal structure present"

# Clean up
echo ""
kill $PORTAL_PID 2>/dev/null
echo "✨ All tests complete!"