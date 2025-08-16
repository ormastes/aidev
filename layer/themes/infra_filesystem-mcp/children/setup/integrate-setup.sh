#!/bin/bash

# Integration script to use setup features from the theme

set -e

echo "Setup features are now integrated into the filesystem-mcp theme"
echo "Usage:"
echo "  - Configuration templates: children/setup/templates/"
echo "  - Docker environments: docker/"
echo "  - QEMU environments: qemu/"
echo "  - Examples: examples/hello-world/"
echo ""
echo "To use setup features:"
echo "  1. Import SetupManager from children/setup/SetupManager.ts"
echo "  2. Configure using templates in children/setup/templates/"
echo "  3. Run verification with examples/hello-world/"
