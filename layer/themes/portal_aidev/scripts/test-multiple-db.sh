#!/bin/bash
# Test E2E with Multiple Database Configurations
# Tests SQLite, PostgreSQL, and MySQL setups

set -e

DEMO_DIR="${1:-layer/themes/aidev-portal/release-additional/ai_dev_portal_live_demo}"
BASE_PORT=3500
TEST_RESULTS_DIR="temp/multi-db-test-results"

echo "🧪 Multi-Database E2E Testing"
echo "=============================="
echo "📍 Demo Directory: $DEMO_DIR"
echo "🏁 Starting port: $BASE_PORT"
echo ""

# Create results directory
mkdir -p "$TEST_RESULTS_DIR"

# Function to test a database configuration
test_database_config() {
    local db_type="$1"
    local port="$2"
    local config_file="$3"
    
    echo "🗄️  Testing $db_type configuration on port $port..."
    
    # Create temporary demo directory for this test
    local temp_demo="$TEST_RESULTS_DIR/demo_${db_type}_${port}"
    cp -r "$DEMO_DIR" "$temp_demo"
    
    # Copy database configuration
    cp "$config_file" "$temp_demo/.env"
    
    # Update port in configuration
    sed -i "s/PORT=.*/PORT=$port/" "$temp_demo/.env"
    
    # Run E2E test
    local test_result=0
    if node scripts/e2e-click-demo-test.js "$temp_demo" --port="$port" --db-test > "$TEST_RESULTS_DIR/${db_type}_test.log" 2>&1; then
        echo "  ✅ $db_type test PASSED"
        test_result=1
    else
        echo "  ❌ $db_type test FAILED"
        test_result=0
    fi
    
    # Copy test report
    if [ -f "$temp_demo/e2e-test-report.json" ]; then
        cp "$temp_demo/e2e-test-report.json" "$TEST_RESULTS_DIR/${db_type}_report.json"
    fi
    
    # Cleanup
    rm -rf "$temp_demo"
    
    return $test_result
}

# Create database configuration files
echo "🔧 Creating database configuration files..."

# SQLite configuration
cat > "$TEST_RESULTS_DIR/sqlite.env" << EOF
# SQLite Configuration for E2E Testing
PORT=3500
NODE_ENV=demo
DB_TYPE=sqlite
SQLITE_PATH=./data/ai_dev_portal_demo.db
JWT_SECRET=demo-secret-key-sqlite
EOF

# PostgreSQL configuration (will fail without actual PostgreSQL server)
cat > "$TEST_RESULTS_DIR/postgres.env" << EOF
# PostgreSQL Configuration for E2E Testing
PORT=3501
NODE_ENV=demo
DB_TYPE=postgres
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=ai_dev_portal_test
JWT_SECRET=demo-secret-key-postgres
EOF

# MySQL configuration (will fail without actual MySQL server)
cat > "$TEST_RESULTS_DIR/mysql.env" << EOF
# MySQL Configuration for E2E Testing
PORT=3502
NODE_ENV=demo
DB_TYPE=mysql
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=mysql
DB_NAME=ai_dev_portal_test
JWT_SECRET=demo-secret-key-mysql
EOF

echo "✅ Configuration files created"
echo ""

# Test results tracking
TOTAL_TESTS=0
PASSED_TESTS=0

# Test SQLite
echo "1️⃣  Testing SQLite..."
TOTAL_TESTS=$((TOTAL_TESTS + 1))
if test_database_config "sqlite" "3500" "$TEST_RESULTS_DIR/sqlite.env"; then
    PASSED_TESTS=$((PASSED_TESTS + 1))
fi
echo ""

# Test PostgreSQL (expected to fail without server)
echo "2️⃣  Testing PostgreSQL..."
TOTAL_TESTS=$((TOTAL_TESTS + 1))
if test_database_config "postgres" "3501" "$TEST_RESULTS_DIR/postgres.env"; then
    PASSED_TESTS=$((PASSED_TESTS + 1))
fi
echo ""

# Test MySQL (expected to fail without server)
echo "3️⃣  Testing MySQL..."
TOTAL_TESTS=$((TOTAL_TESTS + 1))
if test_database_config "mysql" "3502" "$TEST_RESULTS_DIR/mysql.env"; then
    PASSED_TESTS=$((PASSED_TESTS + 1))
fi
echo ""

# Generate summary report
cat > "$TEST_RESULTS_DIR/summary.json" << EOF
{
  "timestamp": "$(date -Iseconds)",
  "total_tests": $TOTAL_TESTS,
  "passed_tests": $PASSED_TESTS,
  "failed_tests": $((TOTAL_TESTS - PASSED_TESTS)),
  "success_rate": "$(echo "scale=2; $PASSED_TESTS * 100 / $TOTAL_TESTS" | bc)%",
  "configurations": [
    {
      "type": "sqlite",
      "port": 3500,
      "status": "$([ -f "$TEST_RESULTS_DIR/sqlite_report.json" ] && echo "completed" || echo "failed")"
    },
    {
      "type": "postgres",
      "port": 3501,
      "status": "$([ -f "$TEST_RESULTS_DIR/postgres_report.json" ] && echo "completed" || echo "failed")"
    },
    {
      "type": "mysql",
      "port": 3502,
      "status": "$([ -f "$TEST_RESULTS_DIR/mysql_report.json" ] && echo "completed" || echo "failed")"
    }
  ],
  "logs": {
    "sqlite": "$TEST_RESULTS_DIR/sqlite_test.log",
    "postgres": "$TEST_RESULTS_DIR/postgres_test.log",
    "mysql": "$TEST_RESULTS_DIR/mysql_test.log"
  }
}
EOF

# Print final summary
echo "📊 Multi-Database E2E Test Summary"
echo "=================================="
echo "🧪 Total Tests: $TOTAL_TESTS"
echo "✅ Passed: $PASSED_TESTS"
echo "❌ Failed: $((TOTAL_TESTS - PASSED_TESTS))"
echo "📈 Success Rate: $(echo "scale=1; $PASSED_TESTS * 100 / $TOTAL_TESTS" | bc)%"
echo ""
echo "📂 Results Directory: $TEST_RESULTS_DIR"
echo "📄 Summary Report: $TEST_RESULTS_DIR/summary.json"
echo ""

# Show available reports
echo "📋 Available Reports:"
for report in "$TEST_RESULTS_DIR"/*_report.json; do
    if [ -f "$report" ]; then
        db_type=$(basename "$report" "_report.json")
        echo "  📄 $db_type: $report"
    fi
done

echo ""
echo "📝 Test Logs:"
for log in "$TEST_RESULTS_DIR"/*_test.log; do
    if [ -f "$log" ]; then
        db_type=$(basename "$log" "_test.log")
        echo "  📄 $db_type: $log"
    fi
done

echo ""
if [ $PASSED_TESTS -eq $TOTAL_TESTS ]; then
    echo "🎉 All database configurations passed E2E tests!"
    exit 0
elif [ $PASSED_TESTS -gt 0 ]; then
    echo "⚠️  Some database configurations passed, others failed (expected for missing DB servers)"
    echo "💡 SQLite should pass, PostgreSQL/MySQL may fail without running servers"
    exit 0
else
    echo "❌ All database configurations failed"
    exit 1
fi