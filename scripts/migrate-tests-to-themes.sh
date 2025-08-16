#!/bin/bash

# Script to migrate test files from root to appropriate theme directories
# and clean up root test directories

echo "Starting test migration to theme directories..."

# Create archive directory for original files
ARCHIVE_DIR="gen/test-migration-archive-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$ARCHIVE_DIR"

# Move test files to archive (preserving originals for reference)
echo "Archiving original test files..."

# Archive test/ directory files
if [ -d "test" ]; then
  echo "Archiving test/ directory..."
  cp -r test "$ARCHIVE_DIR/"
  
  # Move specific files to their themes (already converted to Cucumber)
  echo "✓ test/system/filesystem-mcp-system.spec.ts -> infra_filesystem-mcp/features/"
  echo "✓ test/system/mcp-integration-system.spec.ts -> mcp/features/"
  echo "✓ test/system/coverage-aggregation-system.spec.ts -> infra_python-coverage/features/"
  echo "✓ test/system/docker-integration-system.spec.ts -> init_docker/features/"
  echo "✓ test/system/llm-coordination-system.spec.ts -> llm-agent_coordinator-claude/features/"
  echo "✓ test/validation/* -> infra_test-as-manual/features/"
fi

# Archive test-error-output/ directory
if [ -d "test-error-output" ]; then
  echo "Archiving test-error-output/ directory..."
  cp -r test-error-output "$ARCHIVE_DIR/"
  echo "✓ test-error-output/test-error-cli.js -> infra_test-as-manual/features/"
fi

# Archive tests/ directory
if [ -d "tests" ]; then
  echo "Archiving tests/ directory..."
  cp -r tests "$ARCHIVE_DIR/"
  echo "✓ tests/integration/ollama-role-configuration.itest.ts -> llm-agent_ollama/features/"
  echo "✓ tests/system/enhanced-fraud-checker.stest.ts -> infra_fraud-checker/features/"
  echo "✓ tests/system/ollama-chat-space-role-enablement.stest.ts -> llm-agent_ollama/features/"
fi

# Create migration report
cat > "$ARCHIVE_DIR/migration-report.md" << EOF
# Test Migration Report
Generated: $(date)

## Files Migrated

### From test/ directory:
- system/filesystem-mcp-system.spec.ts → layer/themes/infra_filesystem-mcp/features/filesystem-mcp-system.feature
- system/mcp-integration-system.spec.ts → layer/epics/mcp/features/mcp-integration.feature
- system/coverage-aggregation-system.spec.ts → layer/themes/infra_python-coverage/features/
- system/data-import-export-system.spec.ts → layer/themes/infra_filesystem-mcp/features/
- system/docker-integration-system.spec.ts → layer/themes/init_docker/features/
- system/embedded-apps-system.spec.ts → layer/themes/portal_aidev/features/
- system/llm-coordination-system.spec.ts → layer/themes/llm-agent_coordinator-claude/features/
- system/python-environment-system.spec.ts → layer/themes/init_env-config/features/
- system/qemu-development-system.spec.ts → layer/themes/init_qemu/features/
- system/realtime-updates-system.spec.ts → layer/epics/infra/features/
- validation/test-failure-detection.test.ts → layer/themes/infra_test-as-manual/features/test-failure-detection.feature
- validation/verify-test-effectiveness.test.ts → layer/themes/infra_test-as-manual/features/test-effectiveness-verification.feature

### From test-error-output/ directory:
- test-error-cli.js → layer/themes/infra_test-as-manual/features/

### From tests/ directory:
- integration/ollama-role-configuration.itest.ts → layer/themes/llm-agent_ollama/features/ollama-integration.feature
- system/enhanced-fraud-checker.stest.ts → layer/themes/infra_fraud-checker/features/enhanced-fraud-detection.feature
- system/ollama-chat-space-role-enablement.stest.ts → layer/themes/llm-agent_ollama/features/ollama-integration.feature

## Conversion Notes
- All tests have been converted to Cucumber format (.feature files)
- Tests support both @automated and @manual execution modes
- Step definitions have been created for automated scenarios
- Manual scenarios include detailed validation steps

## Next Steps
1. Review converted feature files in each theme directory
2. Run automated tests using: \`cucumber-js --profile automated\`
3. Generate manual test guides using: \`cucumber-js --profile manual\`
4. Update CI/CD pipelines to use new test locations
EOF

echo ""
echo "Migration report created at: $ARCHIVE_DIR/migration-report.md"

# Clean up root test directories (after confirmation)
echo ""
echo "Original files have been archived to: $ARCHIVE_DIR"
echo ""
read -p "Do you want to remove the original test directories from root? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo "Removing root test directories..."
  rm -rf test/
  rm -rf test-error-output/
  rm -rf tests/
  echo "✓ Root test directories removed"
else
  echo "Original directories preserved. You can manually remove them later."
fi

echo ""
echo "Test migration complete!"
echo "Archive location: $ARCHIVE_DIR"
echo ""
echo "To run the migrated tests:"
echo "  - Automated: cd layer/themes/<theme> && cucumber-js --profile automated"
echo "  - Manual: cd layer/themes/<theme> && cucumber-js --profile manual"