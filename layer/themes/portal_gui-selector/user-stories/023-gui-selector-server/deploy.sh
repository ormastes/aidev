#!/bin/bash

# GUI Selector Server Deployment Script
# This script properly integrates with portal_security theme
# NO HARDCODED PORTS - all port allocation through EnhancedPortManager

DEPLOY_TYPE=${1:-release}

echo "🚀 Deploying GUI Selector Server"
echo "================================"
echo "📋 Deploy type: $DEPLOY_TYPE"
echo "🔒 Using portal_security for port allocation"
echo ""

# Validate deploy type
if [[ ! "$DEPLOY_TYPE" =~ ^(local|dev|demo|release|production)$ ]]; then
  echo "❌ Invalid deploy type: $DEPLOY_TYPE"
  echo "Usage: $0 [local|dev|demo|release|production]"
  exit 1
fi

# Use the TypeScript deployment that integrates with portal_security
bunx tsx src/deploy-with-portal-security.ts "$DEPLOY_TYPE"

exit $?