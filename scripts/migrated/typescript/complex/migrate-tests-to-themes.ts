#!/usr/bin/env bun
/**
 * Migrated from: migrate-tests-to-themes.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.773Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  // Script to migrate test files from root to appropriate theme directories
  // and clean up root test directories
  console.log("Starting test migration to theme directories...");
  // Create archive directory for original files
  await $`ARCHIVE_DIR="gen/test-migration-archive-$(date +%Y%m%d-%H%M%S)"`;
  await mkdir(""$ARCHIVE_DIR"", { recursive: true });
  // Move test files to archive (preserving originals for reference)
  console.log("Archiving original test files...");
  // Archive test/ directory files
  if (-d "test" ) {; then
  console.log("Archiving test/ directory...");
  await copyFile("-r test", ""$ARCHIVE_DIR/"");
  // Move specific files to their themes (already converted to Cucumber)
  console.log("✓ test/system/filesystem-mcp-system.spec.ts -> infra_filesystem-mcp/features/");
  console.log("✓ test/system/mcp-integration-system.spec.ts -> mcp/features/");
  console.log("✓ test/system/coverage-aggregation-system.spec.ts -> infra_python-coverage/features/");
  console.log("✓ test/system/docker-integration-system.spec.ts -> init_docker/features/");
  console.log("✓ test/system/llm-coordination-system.spec.ts -> llm-agent_coordinator-claude/features/");
  console.log("✓ test/validation/* -> infra_test-as-manual/features/");
  }
  // Archive test-error-output/ directory
  if (-d "test-error-output" ) {; then
  console.log("Archiving test-error-output/ directory...");
  await copyFile("-r test-error-output", ""$ARCHIVE_DIR/"");
  console.log("✓ test-error-output/test-error-cli.js -> infra_test-as-manual/features/");
  }
  // Archive tests/ directory
  if (-d "tests" ) {; then
  console.log("Archiving tests/ directory...");
  await copyFile("-r tests", ""$ARCHIVE_DIR/"");
  console.log("✓ tests/integration/ollama-role-configuration.itest.ts -> llm-agent_ollama/features/");
  console.log("✓ tests/system/enhanced-fraud-checker.stest.ts -> infra_fraud-checker/features/");
  console.log("✓ tests/system/ollama-chat-space-role-enablement.stest.ts -> llm-agent_ollama/features/");
  }
  // Create migration report
  await $`cat > "$ARCHIVE_DIR/migration-report.md" << EOF`;
  // Test Migration Report
  await $`Generated: $(date)`;
  // # Files Migrated
  // ## From test/ directory:
  await $`- system/filesystem-mcp-system.spec.ts → layer/themes/infra_filesystem-mcp/features/filesystem-mcp-system.feature`;
  await $`- system/mcp-integration-system.spec.ts → layer/epics/mcp/features/mcp-integration.feature`;
  await $`- system/coverage-aggregation-system.spec.ts → layer/themes/infra_python-coverage/features/`;
  await $`- system/data-import-export-system.spec.ts → layer/themes/infra_filesystem-mcp/features/`;
  await $`- system/docker-integration-system.spec.ts → layer/themes/init_docker/features/`;
  await $`- system/embedded-apps-system.spec.ts → layer/themes/portal_aidev/features/`;
  await $`- system/llm-coordination-system.spec.ts → layer/themes/llm-agent_coordinator-claude/features/`;
  await $`- system/python-environment-system.spec.ts → layer/themes/init_env-config/features/`;
  await $`- system/qemu-development-system.spec.ts → layer/themes/init_qemu/features/`;
  await $`- system/realtime-updates-system.spec.ts → layer/epics/infra/features/`;
  await $`- validation/test-failure-detection.test.ts → layer/themes/infra_test-as-manual/features/test-failure-detection.feature`;
  await $`- validation/verify-test-effectiveness.test.ts → layer/themes/infra_test-as-manual/features/test-effectiveness-verification.feature`;
  // ## From test-error-output/ directory:
  await $`- test-error-cli.js → layer/themes/infra_test-as-manual/features/`;
  // ## From tests/ directory:
  await $`- integration/ollama-role-configuration.itest.ts → layer/themes/llm-agent_ollama/features/ollama-integration.feature`;
  await $`- system/enhanced-fraud-checker.stest.ts → layer/themes/infra_fraud-checker/features/enhanced-fraud-detection.feature`;
  await $`- system/ollama-chat-space-role-enablement.stest.ts → layer/themes/llm-agent_ollama/features/ollama-integration.feature`;
  // # Conversion Notes
  await $`- All tests have been converted to Cucumber format (.feature files)`;
  await $`- Tests support both @automated and @manual execution modes`;
  await $`- Step definitions have been created for automated scenarios`;
  await $`- Manual scenarios include detailed validation steps`;
  // # Next Steps
  await $`1. Review converted feature files in each theme directory`;
  await $`2. Run automated tests using: \`cucumber-js --profile automated\``;
  await $`3. Generate manual test guides using: \`cucumber-js --profile manual\``;
  await $`4. Update CI/CD pipelines to use new test locations`;
  await $`EOF`;
  console.log("");
  console.log("Migration report created at: $ARCHIVE_DIR/migration-report.md");
  // Clean up root test directories (after confirmation)
  console.log("");
  console.log("Original files have been archived to: $ARCHIVE_DIR");
  console.log("");
  await $`read -p "Do you want to remove the original test directories from root? (y/n) " -n 1 -r`;
  console.log("");
  if ([ $REPLY =~ ^[Yy]$ ]) {; then
  console.log("Removing root test directories...");
  await rm("test/", { recursive: true, force: true });
  await rm("test-error-output/", { recursive: true, force: true });
  await rm("tests/", { recursive: true, force: true });
  console.log("✓ Root test directories removed");
  } else {
  console.log("Original directories preserved. You can manually remove them later.");
  }
  console.log("");
  console.log("Test migration complete!");
  console.log("Archive location: $ARCHIVE_DIR");
  console.log("");
  console.log("To run the migrated tests:");
  console.log("  - Automated: cd layer/themes/<theme> && cucumber-js --profile automated");
  console.log("  - Manual: cd layer/themes/<theme> && cucumber-js --profile manual");
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}