#!/bin/bash

# Database Diff Demo Script
# Shows how to use the database diff feature

echo "==================================="
echo "🔍 Database Diff Feature Demo"
echo "==================================="
echo ""
echo "This demonstrates the database diff tracking feature"
echo "that captures before/after states of database changes"
echo "without persisting any modifications."
echo ""
echo "Key Features:"
echo "✅ Transaction-based diffs with automatic rollback"
echo "✅ Zero data persistence - changes are not saved"
echo "✅ Row-level change detection"
echo "✅ Works with PostgreSQL, MySQL, MongoDB, Redis, SQLite"
echo "✅ Easy parseable JSONL output format"
echo ""
echo "==================================="
echo "Usage:"
echo "==================================="
echo ""
echo "1. Enable database diff tracking:"
echo "   export INTERCEPT_DB_DIFF=true"
echo ""
echo "2. Run your application with the preload script:"
echo "   node --require ./dist/logging/preload-interceptors.js app.js"
echo ""
echo "3. View diff logs in real-time:"
echo "   export INTERCEPT_CONSOLE=true"
echo ""
echo "4. Check log files:"
echo "   logs/intercepted/database-diff-*.jsonl"
echo ""
echo "==================================="
echo "Example Output:"
echo "==================================="
echo ""
cat << 'EOF'
{
  "timestamp": "2024-01-20T10:30:00Z",
  "type": "db-diff",
  "database": "myapp",
  "table": "users",
  "operation": "UPDATE",
  "summary": {
    "rowsAdded": 0,
    "rowsRemoved": 0,
    "rowsModified": 1,
    "columnsChanged": ["last_login"],
    "totalChanges": 1
  },
  "changes": [
    {
      "type": "modified",
      "path": "row[id:123].last_login",
      "oldValue": null,
      "newValue": "2024-01-20T10:30:00Z"
    }
  ]
}
EOF
echo ""
echo "==================================="
echo "Try it now:"
echo "==================================="
echo ""
echo "npm run demo:db-diff"
echo ""