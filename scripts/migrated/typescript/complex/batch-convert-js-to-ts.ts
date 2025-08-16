#!/usr/bin/env bun
/**
 * Migrated from: batch-convert-js-to-ts.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.756Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  // Batch convert JavaScript files to TypeScript
  // This script performs the actual conversion
  console.log("Starting JavaScript to TypeScript conversion...");
  console.log("==============================================");
  await $`CONVERTED_COUNT=0`;
  await $`FAILED_COUNT=0`;
  await $`FAILED_FILES=()`;
  // Function to convert a single JS file to TS
  await $`convert_js_to_ts() {`;
  await $`local js_file=$1`;
  await $`local ts_file="${js_file%.js}.ts"`;
  console.log("Converting: $js_file");
  // Check if file exists
  if (! -f "$js_file" ) {; then
  console.log("  ✗ File not found");
  await $`return 1`;
  }
  // Check if TS file already exists
  if (-f "$ts_file" ) {; then
  console.log("  ⚠ TypeScript file already exists, skipping");
  await $`return 0`;
  }
  // Copy JS file to TS
  await copyFile(""$js_file"", ""$ts_file"");
  // Add basic TypeScript modifications
  // 1. Add type annotations for common patterns
  // 2. Convert module.exports to export
  // 3. Convert require to import
  // Convert require statements to import
  await $`sed -i "s/const \([a-zA-Z_][a-zA-Z0-9_]*\) = require('\([^']*\)')/import \1 from '\2'/g" "$ts_file"`;
  await $`sed -i "s/const \([a-zA-Z_][a-zA-Z0-9_]*\) = require(\"\([^\"]*\)\")/import \1 from '\2'/g" "$ts_file"`;
  // Convert destructured require to import
  await $`sed -i "s/const {\([^}]*\)} = require('\([^']*\)')/import {\1} from '\2'/g" "$ts_file"`;
  await $`sed -i "s/const {\([^}]*\)} = require(\"\([^\"]*\)\")/import {\1} from '\2'/g" "$ts_file"`;
  // Convert module.exports to export
  await $`sed -i "s/module\.exports = {/export {/g" "$ts_file"`;
  await $`sed -i "s/module\.exports = /export default /g" "$ts_file"`;
  await $`sed -i "s/exports\.\([a-zA-Z_][a-zA-Z0-9_]*\) = /export const \1 = /g" "$ts_file"`;
  // Add .js extension to local imports if missing
  await $`sed -i "s/from '\.\//from '.\//g" "$ts_file"`;
  // Remove the original JS file
  await $`rm "$js_file"`;
  console.log("  ✓ Converted to $ts_file");
  await $`return 0`;
  await $`}`;
  // List of files to convert (from analysis)
  await $`JS_FILES=(`;
  // External log lib files
  await $`"./layer/themes/infra_external-log-lib/children/streamer/index.js"`;
  await $`"./layer/themes/infra_external-log-lib/children/parser/index.js"`;
  await $`"./layer/themes/infra_external-log-lib/children/filter/index.js"`;
  await $`"./layer/themes/infra_external-log-lib/children/capture/index.js"`;
  await $`"./layer/themes/infra_external-log-lib/children/reporter/index.js"`;
  await $`"./layer/themes/infra_external-log-lib/children/file-access-auditor/index.js"`;
  await $`"./layer/themes/infra_external-log-lib/children/aggregator/index.js"`;
  await $`"./layer/themes/infra_external-log-lib/children/audited-fs/index.js"`;
  await $`"./layer/themes/infra_external-log-lib/pipe/index.js"`;
  await $`"./layer/themes/infra_external-log-lib/src/facades/path-facade.js"`;
  await $`"./layer/themes/infra_external-log-lib/src/facades/fs-facade.js"`;
  await $`"./layer/themes/infra_external-log-lib/src/facades/child-process-facade.js"`;
  await $`"./layer/themes/infra_external-log-lib/src/monitoring/alert-handler.js"`;
  await $`"./layer/themes/infra_external-log-lib/src/file-manager/FileCreationAPI.js"`;
  await $`"./layer/themes/infra_external-log-lib/src/file-manager/MCPIntegratedFileManager.js"`;
  await $`"./layer/themes/infra_external-log-lib/src/config.js"`;
  await $`"./layer/themes/infra_external-log-lib/src/interceptors/fs-interceptor.js"`;
  await $`"./layer/themes/infra_external-log-lib/src/config/strict-mode.config.js"`;
  await $`"./layer/themes/infra_external-log-lib/src/config/enforcement-config.js"`;
  await $`"./layer/themes/infra_external-log-lib/src/utils/safe-file-operations.js"`;
  await $`"./layer/themes/infra_external-log-lib/src/utils/essential-info-extractor.js"`;
  await $`"./layer/themes/infra_external-log-lib/src/validators/FileViolationPreventer.js"`;
  await $`"./layer/themes/infra_external-log-lib/src/index.js"`;
  await $`"./layer/themes/infra_external-log-lib/src/loggers/RejectionTracker.js"`;
  await $`"./layer/themes/infra_external-log-lib/src/loggers/EventLogger.js"`;
  await $`"./layer/themes/infra_external-log-lib/src/loggers/ComprehensiveLogger.js"`;
  await $`"./layer/themes/infra_external-log-lib/src/loggers/VfJsonWatcher.js"`;
  await $`"./layer/themes/infra_external-log-lib/src/fraud-detector/FileCreationFraudChecker.js"`;
  await $`"./layer/themes/infra_external-log-lib/utils/index.js"`;
  // Lib epic files
  await $`"./layer/epics/lib/utils/math.js"`;
  await $`"./layer/epics/lib/utils/string.js"`;
  await $`"./layer/epics/lib/services/validator.js"`;
  // Other convertible files
  await $`"./layer/themes/portal_security/children/rate-limiter-enhanced.js"`;
  await $`"./layer/themes/infra_fraud-checker/src/validators/FileStructureValidator.js"`;
  await $`"./layer/themes/infra_python-coverage/tests/simple-coverage.test.js"`;
  await $`"./layer/themes/infra_external-log-lib/tests/test-facade.js"`;
  await $`"./layer/themes/infra_fraud-checker/tests/test-fraud-checker-validation.js"`;
  await $`)`;
  // Convert each file
  for (const file of ["${JS_FILES[@]}"; do]) {
  if (-f "$file" ) {; then
  await $`if convert_js_to_ts "$file"; then`;
  await $`((CONVERTED_COUNT++))`;
  } else {
  await $`((FAILED_COUNT++))`;
  await $`FAILED_FILES+=("$file")`;
  }
  }
  }
  // Also convert test files
  await $`TEST_FILES=(`;
  await $`"./layer/epics/lib/utils/math.test.js"`;
  await $`"./layer/epics/lib/utils/string.test.js"`;
  await $`"./layer/epics/lib/services/validator.test.js"`;
  await $`)`;
  for (const file of ["${TEST_FILES[@]}"; do]) {
  if (-f "$file" ) {; then
  await $`if convert_js_to_ts "$file"; then`;
  await $`((CONVERTED_COUNT++))`;
  } else {
  await $`((FAILED_COUNT++))`;
  await $`FAILED_FILES+=("$file")`;
  }
  }
  }
  console.log("");
  console.log("Conversion Summary:");
  console.log("==================");
  console.log("✓ Successfully converted: $CONVERTED_COUNT files");
  console.log("✗ Failed conversions: $FAILED_COUNT files");
  if (${#FAILED_FILES[@]} -gt 0 ) {; then
  console.log("");
  console.log("Failed files:");
  for (const file of ["${FAILED_FILES[@]}"; do]) {
  console.log("  - $file");
  }
  }
  console.log("");
  console.log("Note: Configuration files (jest.config.js, cucumber.js, etc.) have been kept as JavaScript.");
  console.log("Public JS files in demo/release folders have been preserved as they may be browser scripts.");
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}