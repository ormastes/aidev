#!/usr/bin/env python3
"""
Migrated from: migrate-tests-to-themes.sh
Auto-generated Python - 2025-08-16T04:57:27.774Z
"""

import os
import sys
import subprocess
import shutil
import glob
from pathlib import Path

def main():
    # Script to migrate test files from root to appropriate theme directories
    # and clean up root test directories
    print("Starting test migration to theme directories...")
    # Create archive directory for original files
    subprocess.run("ARCHIVE_DIR="gen/test-migration-archive-$(date +%Y%m%d-%H%M%S)"", shell=True)
    Path(""$ARCHIVE_DIR"").mkdir(parents=True, exist_ok=True)
    # Move test files to archive (preserving originals for reference)
    print("Archiving original test files...")
    # Archive test/ directory files
    if -d "test" :; then
    print("Archiving test/ directory...")
    shutil.copy2("-r test", ""$ARCHIVE_DIR/"")
    # Move specific files to their themes (already converted to Cucumber)
    print("✓ test/system/filesystem-mcp-system.spec.ts -> infra_filesystem-mcp/features/")
    print("✓ test/system/mcp-integration-system.spec.ts -> mcp/features/")
    print("✓ test/system/coverage-aggregation-system.spec.ts -> infra_python-coverage/features/")
    print("✓ test/system/docker-integration-system.spec.ts -> init_docker/features/")
    print("✓ test/system/llm-coordination-system.spec.ts -> llm-agent_coordinator-claude/features/")
    print("✓ test/validation/* -> infra_test-as-manual/features/")
    # Archive test-error-output/ directory
    if -d "test-error-output" :; then
    print("Archiving test-error-output/ directory...")
    shutil.copy2("-r test-error-output", ""$ARCHIVE_DIR/"")
    print("✓ test-error-output/test-error-cli.js -> infra_test-as-manual/features/")
    # Archive tests/ directory
    if -d "tests" :; then
    print("Archiving tests/ directory...")
    shutil.copy2("-r tests", ""$ARCHIVE_DIR/"")
    print("✓ tests/integration/ollama-role-configuration.itest.ts -> llm-agent_ollama/features/")
    print("✓ tests/system/enhanced-fraud-checker.stest.ts -> infra_fraud-checker/features/")
    print("✓ tests/system/ollama-chat-space-role-enablement.stest.ts -> llm-agent_ollama/features/")
    # Create migration report
    subprocess.run("cat > "$ARCHIVE_DIR/migration-report.md" << EOF", shell=True)
    # Test Migration Report
    subprocess.run("Generated: $(date)", shell=True)
    # # Files Migrated
    # ## From test/ directory:
    subprocess.run("- system/filesystem-mcp-system.spec.ts → layer/themes/infra_filesystem-mcp/features/filesystem-mcp-system.feature", shell=True)
    subprocess.run("- system/mcp-integration-system.spec.ts → layer/epics/mcp/features/mcp-integration.feature", shell=True)
    subprocess.run("- system/coverage-aggregation-system.spec.ts → layer/themes/infra_python-coverage/features/", shell=True)
    subprocess.run("- system/data-import-export-system.spec.ts → layer/themes/infra_filesystem-mcp/features/", shell=True)
    subprocess.run("- system/docker-integration-system.spec.ts → layer/themes/init_docker/features/", shell=True)
    subprocess.run("- system/embedded-apps-system.spec.ts → layer/themes/portal_aidev/features/", shell=True)
    subprocess.run("- system/llm-coordination-system.spec.ts → layer/themes/llm-agent_coordinator-claude/features/", shell=True)
    subprocess.run("- system/python-environment-system.spec.ts → layer/themes/init_env-config/features/", shell=True)
    subprocess.run("- system/qemu-development-system.spec.ts → layer/themes/init_qemu/features/", shell=True)
    subprocess.run("- system/realtime-updates-system.spec.ts → layer/epics/infra/features/", shell=True)
    subprocess.run("- validation/test-failure-detection.test.ts → layer/themes/infra_test-as-manual/features/test-failure-detection.feature", shell=True)
    subprocess.run("- validation/verify-test-effectiveness.test.ts → layer/themes/infra_test-as-manual/features/test-effectiveness-verification.feature", shell=True)
    # ## From test-error-output/ directory:
    subprocess.run("- test-error-cli.js → layer/themes/infra_test-as-manual/features/", shell=True)
    # ## From tests/ directory:
    subprocess.run("- integration/ollama-role-configuration.itest.ts → layer/themes/llm-agent_ollama/features/ollama-integration.feature", shell=True)
    subprocess.run("- system/enhanced-fraud-checker.stest.ts → layer/themes/infra_fraud-checker/features/enhanced-fraud-detection.feature", shell=True)
    subprocess.run("- system/ollama-chat-space-role-enablement.stest.ts → layer/themes/llm-agent_ollama/features/ollama-integration.feature", shell=True)
    # # Conversion Notes
    subprocess.run("- All tests have been converted to Cucumber format (.feature files)", shell=True)
    subprocess.run("- Tests support both @automated and @manual execution modes", shell=True)
    subprocess.run("- Step definitions have been created for automated scenarios", shell=True)
    subprocess.run("- Manual scenarios include detailed validation steps", shell=True)
    # # Next Steps
    subprocess.run("1. Review converted feature files in each theme directory", shell=True)
    subprocess.run("2. Run automated tests using: \`cucumber-js --profile automated\`", shell=True)
    subprocess.run("3. Generate manual test guides using: \`cucumber-js --profile manual\`", shell=True)
    subprocess.run("4. Update CI/CD pipelines to use new test locations", shell=True)
    subprocess.run("EOF", shell=True)
    print("")
    print("Migration report created at: $ARCHIVE_DIR/migration-report.md")
    # Clean up root test directories (after confirmation)
    print("")
    print("Original files have been archived to: $ARCHIVE_DIR")
    print("")
    subprocess.run("read -p "Do you want to remove the original test directories from root? (y/n) " -n 1 -r", shell=True)
    print("")
    if [ $REPLY =~ ^[Yy]$ ]:; then
    print("Removing root test directories...")
    shutil.rmtree("test/", ignore_errors=True)
    shutil.rmtree("test-error-output/", ignore_errors=True)
    shutil.rmtree("tests/", ignore_errors=True)
    print("✓ Root test directories removed")
    else:
    print("Original directories preserved. You can manually remove them later.")
    print("")
    print("Test migration complete!")
    print("Archive location: $ARCHIVE_DIR")
    print("")
    print("To run the migrated tests:")
    print("  - Automated: cd layer/themes/<theme> && cucumber-js --profile automated")
    print("  - Manual: cd layer/themes/<theme> && cucumber-js --profile manual")

if __name__ == "__main__":
    main()