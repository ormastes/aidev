#!/bin/bash
# Enhanced MCP Server Launcher

echo "🚀 Starting Enhanced MCP Server"
echo "================================"
echo "Base path: ${VF_BASE_PATH:-/home/ormastes/dev/aidev}"
echo "Strict mode: ${VF_STRICT_MODE:-true}"
echo ""
echo "Features enabled:"
echo "  ✅ Artifact validation"
echo "  ✅ Task dependency checking"
echo "  ✅ Feature-task linking"
echo "  ✅ Adhoc justification"
echo "  ✅ Lifecycle management"
echo ""

VF_BASE_PATH="${VF_BASE_PATH:-/home/ormastes/dev/aidev}" \
VF_STRICT_MODE="${VF_STRICT_MODE:-true}" \
NODE_ENV="production" \
exec node "/home/ormastes/dev/aidev/layer/themes/infra_filesystem-mcp/mcp-server-production.js"
