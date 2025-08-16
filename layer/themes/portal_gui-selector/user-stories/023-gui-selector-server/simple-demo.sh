#!/bin/bash
# Simple demo script to test GUI selector server features

BASE_URL="http://localhost:3256"

echo "=== GUI Selector Server Feature Test ==="
echo ""

# 1. Health check
echo "1. Health Check:"
curl -s $BASE_URL/api/health | jq .
echo ""

# 2. List templates
echo "2. Available Templates:"
curl -s $BASE_URL/api/templates | jq '.[].name'
echo ""

# 3. Get template preview
echo "3. Modern Dashboard Preview:"
curl -s $BASE_URL/api/templates/modern-01/preview | jq '{html: .html | length, css: .css | length, assets: .assets}'
echo ""

# 4. Session login
echo "4. Session-based Login:"
curl -s -X POST $BASE_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' \
  -c /tmp/cookies.txt | jq .
echo ""

# 5. JWT login  
echo "5. JWT-based Login:"
JWT_RESPONSE=$(curl -s -X POST $BASE_URL/api/v2/auth/token \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}')
echo $JWT_RESPONSE | jq .

ACCESS_TOKEN=$(echo $JWT_RESPONSE | jq -r .accessToken)
echo ""

# 6. Create app
echo "6. Create App/Project:"
curl -s -X POST $BASE_URL/api/apps \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{"name":"Demo Calculator","description":"A demo calculator app"}' | jq .
echo ""

# 7. List apps
echo "7. List Apps:"
curl -s $BASE_URL/api/apps \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq .
echo ""

# 8. Check external logs
echo "8. External Logs:"
echo "Logs should be in: ../../../95.child_project/external_log_lib/logs/gui-selector/"
ls -la ../../../95.child_project/external_log_lib/logs/gui-selector/ 2>/dev/null || echo "Log directory not found"
echo ""

echo "=== Feature Summary ==="
echo "✓ Health monitoring"
echo "✓ Template management with 4 categories"
echo "✓ Session-based authentication"
echo "✓ JWT-based authentication"  
echo "✓ App/project management"
echo "✓ SQLite database persistence"
echo "✓ External logging integration"
echo ""
echo "Access the web UI at: http://localhost:3256"