#!/usr/bin/env bun
/**
 * Migrated from: test-multiple-db.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.721Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  // Test E2E with Multiple Database Configurations
  // Tests SQLite, PostgreSQL, and MySQL setups
  await $`set -e`;
  await $`DEMO_DIR="${1:-layer/themes/aidev-portal/release-additional/ai_dev_portal_live_demo}"`;
  await $`BASE_PORT=3500`;
  await $`TEST_RESULTS_DIR="temp/multi-db-test-results"`;
  console.log("🧪 Multi-Database E2E Testing");
  console.log("==============================");
  console.log("📍 Demo Directory: $DEMO_DIR");
  console.log("🏁 Starting port: $BASE_PORT");
  console.log("");
  // Create results directory
  await mkdir(""$TEST_RESULTS_DIR"", { recursive: true });
  // Function to test a database configuration
  await $`test_database_config() {`;
  await $`local db_type="$1"`;
  await $`local port="$2"`;
  await $`local config_file="$3"`;
  console.log("🗄️  Testing $db_type configuration on port $port...");
  // Create temporary demo directory for this test
  await $`local temp_demo="$TEST_RESULTS_DIR/demo_${db_type}_${port}"`;
  await copyFile("-r "$DEMO_DIR"", ""$temp_demo"");
  // Copy database configuration
  await copyFile(""$config_file"", ""$temp_demo/.env"");
  // Update port in configuration
  await $`sed -i "s/PORT=.*/PORT=$port/" "$temp_demo/.env"`;
  // Run E2E test
  await $`local test_result=0`;
  await $`if node scripts/e2e-click-demo-test.js "$temp_demo" --port="$port" --db-test > "$TEST_RESULTS_DIR/${db_type}_test.log" 2>&1; then`;
  console.log("  ✅ $db_type test PASSED");
  await $`test_result=1`;
  } else {
  console.log("  ❌ $db_type test FAILED");
  await $`test_result=0`;
  }
  // Copy test report
  if (-f "$temp_demo/e2e-test-report.json" ) {; then
  await copyFile(""$temp_demo/e2e-test-report.json"", ""$TEST_RESULTS_DIR/${db_type}_report.json"");
  }
  // Cleanup
  await rm(""$temp_demo"", { recursive: true, force: true });
  await $`return $test_result`;
  await $`}`;
  // Create database configuration files
  console.log("🔧 Creating database configuration files...");
  // SQLite configuration
  await $`cat > "$TEST_RESULTS_DIR/sqlite.env" << EOF`;
  // SQLite Configuration for E2E Testing
  await $`PORT=3500`;
  await $`NODE_ENV=demo`;
  await $`DB_TYPE=sqlite`;
  await $`SQLITE_PATH=./data/ai_dev_portal_demo.db`;
  await $`JWT_SECRET=demo-secret-key-sqlite`;
  await $`EOF`;
  // PostgreSQL configuration (will fail without actual PostgreSQL server)
  await $`cat > "$TEST_RESULTS_DIR/postgres.env" << EOF`;
  // PostgreSQL Configuration for E2E Testing
  await $`PORT=3501`;
  await $`NODE_ENV=demo`;
  await $`DB_TYPE=postgres`;
  await $`DB_HOST=localhost`;
  await $`DB_PORT=5432`;
  await $`DB_USER=postgres`;
  await $`DB_PASSWORD=postgres`;
  await $`DB_NAME=ai_dev_portal_test`;
  await $`JWT_SECRET=demo-secret-key-postgres`;
  await $`EOF`;
  // MySQL configuration (will fail without actual MySQL server)
  await $`cat > "$TEST_RESULTS_DIR/mysql.env" << EOF`;
  // MySQL Configuration for E2E Testing
  await $`PORT=3502`;
  await $`NODE_ENV=demo`;
  await $`DB_TYPE=mysql`;
  await $`DB_HOST=localhost`;
  await $`DB_PORT=3306`;
  await $`DB_USER=root`;
  await $`DB_PASSWORD=mysql`;
  await $`DB_NAME=ai_dev_portal_test`;
  await $`JWT_SECRET=demo-secret-key-mysql`;
  await $`EOF`;
  console.log("✅ Configuration files created");
  console.log("");
  // Test results tracking
  await $`TOTAL_TESTS=0`;
  await $`PASSED_TESTS=0`;
  // Test SQLite
  console.log("1️⃣  Testing SQLite...");
  await $`TOTAL_TESTS=$((TOTAL_TESTS + 1))`;
  await $`if test_database_config "sqlite" "3500" "$TEST_RESULTS_DIR/sqlite.env"; then`;
  await $`PASSED_TESTS=$((PASSED_TESTS + 1))`;
  }
  console.log("");
  // Test PostgreSQL (expected to fail without server)
  console.log("2️⃣  Testing PostgreSQL...");
  await $`TOTAL_TESTS=$((TOTAL_TESTS + 1))`;
  await $`if test_database_config "postgres" "3501" "$TEST_RESULTS_DIR/postgres.env"; then`;
  await $`PASSED_TESTS=$((PASSED_TESTS + 1))`;
  }
  console.log("");
  // Test MySQL (expected to fail without server)
  console.log("3️⃣  Testing MySQL...");
  await $`TOTAL_TESTS=$((TOTAL_TESTS + 1))`;
  await $`if test_database_config "mysql" "3502" "$TEST_RESULTS_DIR/mysql.env"; then`;
  await $`PASSED_TESTS=$((PASSED_TESTS + 1))`;
  }
  console.log("");
  // Generate summary report
  await $`cat > "$TEST_RESULTS_DIR/summary.json" << EOF`;
  await $`{`;
  await $`"timestamp": "$(date -Iseconds)",`;
  await $`"total_tests": $TOTAL_TESTS,`;
  await $`"passed_tests": $PASSED_TESTS,`;
  await $`"failed_tests": $((TOTAL_TESTS - PASSED_TESTS)),`;
  await $`"success_rate": "$(echo "scale=2; $PASSED_TESTS * 100 / $TOTAL_TESTS" | bc)%",`;
  await $`"configurations": [`;
  await $`{`;
  await $`"type": "sqlite",`;
  await $`"port": 3500,`;
  await $`"status": "$([ -f "$TEST_RESULTS_DIR/sqlite_report.json" ] && echo "completed" || echo "failed")"`;
  await $`},`;
  await $`{`;
  await $`"type": "postgres",`;
  await $`"port": 3501,`;
  await $`"status": "$([ -f "$TEST_RESULTS_DIR/postgres_report.json" ] && echo "completed" || echo "failed")"`;
  await $`},`;
  await $`{`;
  await $`"type": "mysql",`;
  await $`"port": 3502,`;
  await $`"status": "$([ -f "$TEST_RESULTS_DIR/mysql_report.json" ] && echo "completed" || echo "failed")"`;
  await $`}`;
  await $`],`;
  await $`"logs": {`;
  await $`"sqlite": "$TEST_RESULTS_DIR/sqlite_test.log",`;
  await $`"postgres": "$TEST_RESULTS_DIR/postgres_test.log",`;
  await $`"mysql": "$TEST_RESULTS_DIR/mysql_test.log"`;
  await $`}`;
  await $`}`;
  await $`EOF`;
  // Print final summary
  console.log("📊 Multi-Database E2E Test Summary");
  console.log("==================================");
  console.log("🧪 Total Tests: $TOTAL_TESTS");
  console.log("✅ Passed: $PASSED_TESTS");
  console.log("❌ Failed: $((TOTAL_TESTS - PASSED_TESTS))");
  console.log("📈 Success Rate: $(echo ");scale=1; $PASSED_TESTS * 100 / $TOTAL_TESTS" | bc)%"
  console.log("");
  console.log("📂 Results Directory: $TEST_RESULTS_DIR");
  console.log("📄 Summary Report: $TEST_RESULTS_DIR/summary.json");
  console.log("");
  // Show available reports
  console.log("📋 Available Reports:");
  for (const report of ["$TEST_RESULTS_DIR"/*_report.json; do]) {
  if (-f "$report" ) {; then
  await $`db_type=$(basename "$report" "_report.json")`;
  console.log("  📄 $db_type: $report");
  }
  }
  console.log("");
  console.log("📝 Test Logs:");
  for (const log of ["$TEST_RESULTS_DIR"/*_test.log; do]) {
  if (-f "$log" ) {; then
  await $`db_type=$(basename "$log" "_test.log")`;
  console.log("  📄 $db_type: $log");
  }
  }
  console.log("");
  if ($PASSED_TESTS -eq $TOTAL_TESTS ) {; then
  console.log("🎉 All database configurations passed E2E tests!");
  process.exit(0);
  await $`elif [ $PASSED_TESTS -gt 0 ]; then`;
  console.log("⚠️  Some database configurations passed, others failed (expected for missing DB servers)");
  console.log("💡 SQLite should pass, PostgreSQL/MySQL may fail without running servers");
  process.exit(0);
  } else {
  console.log("❌ All database configurations failed");
  process.exit(1);
  }
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}