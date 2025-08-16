#!/bin/bash

# Generate final HTML report from test results

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RESULTS_DIR="$(dirname "$SCRIPT_DIR")/results"
REPORT_FILE="$RESULTS_DIR/test-report.html"

echo "📄 Generating HTML report..."

# Start HTML document
cat > "$REPORT_FILE" << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MCP Docker Test Report</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        h1 {
            color: #2c3e50;
            border-bottom: 3px solid #3498db;
            padding-bottom: 10px;
        }
        h2 {
            color: #34495e;
            margin-top: 30px;
        }
        .summary {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            margin-bottom: 30px;
        }
        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-top: 20px;
        }
        .stat-card {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
        }
        .stat-value {
            font-size: 2em;
            font-weight: bold;
        }
        .stat-label {
            font-size: 0.9em;
            opacity: 0.9;
            margin-top: 5px;
        }
        .mode-results {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            margin-bottom: 20px;
        }
        .pass {
            color: #27ae60;
            font-weight: bold;
        }
        .fail {
            color: #e74c3c;
            font-weight: bold;
        }
        .warning {
            color: #f39c12;
            font-weight: bold;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
        }
        th, td {
            padding: 10px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }
        th {
            background-color: #f8f9fa;
            font-weight: 600;
        }
        .timestamp {
            color: #7f8c8d;
            font-size: 0.9em;
            margin-top: 30px;
            text-align: center;
        }
        .violation-badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 0.85em;
            margin: 2px;
        }
        .violation-error {
            background-color: #ff4757;
            color: white;
        }
        .violation-warning {
            background-color: #ffa502;
            color: white;
        }
        .violation-info {
            background-color: #3742fa;
            color: white;
        }
    </style>
</head>
<body>
    <h1>🧪 MCP Docker Test Report</h1>
EOF

# Read summary data
if [ -f "$RESULTS_DIR/summary.json" ]; then
    total_tests=$(jq -r '.statistics.totalTests // 0' "$RESULTS_DIR/summary.json")
    total_passed=$(jq -r '.statistics.totalPassed // 0' "$RESULTS_DIR/summary.json")
    total_failed=$(jq -r '.statistics.totalFailed // 0' "$RESULTS_DIR/summary.json")
    pass_rate=$(jq -r '.statistics.passRate // 0' "$RESULTS_DIR/summary.json")
else
    total_tests=0
    total_passed=0
    total_failed=0
    pass_rate=0
fi

# Add summary section
cat >> "$REPORT_FILE" << EOF
    <div class="summary">
        <h2>Test Summary</h2>
        <div class="stats">
            <div class="stat-card">
                <div class="stat-value">$total_tests</div>
                <div class="stat-label">Total Tests</div>
            </div>
            <div class="stat-card" style="background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);">
                <div class="stat-value">$total_passed</div>
                <div class="stat-label">Passed</div>
            </div>
            <div class="stat-card" style="background: linear-gradient(135deg, #eb3349 0%, #f45c43 100%);">
                <div class="stat-value">$total_failed</div>
                <div class="stat-label">Failed</div>
            </div>
            <div class="stat-card" style="background: linear-gradient(135deg, #FC466B 0%, #3F5EFB 100%);">
                <div class="stat-value">${pass_rate}%</div>
                <div class="stat-label">Pass Rate</div>
            </div>
        </div>
    </div>
EOF

# Add results for each mode
for mode in strict enhanced basic; do
    latest=$(ls -t "$RESULTS_DIR"/mcp-test-$mode-*.json 2>/dev/null | head -1)
    
    if [ -f "$latest" ]; then
        mode_tests=$(jq -r '.summary.totalTests // 0' "$latest")
        mode_passed=$(jq -r '.summary.totalPassed // 0' "$latest")
        mode_failed=$(jq -r '.summary.totalFailed // 0' "$latest")
        mode_rate=$(jq -r '.summary.passRate // 0' "$latest")
        
        cat >> "$REPORT_FILE" << EOF
    <div class="mode-results">
        <h2>${mode^^} Mode Results</h2>
        <table>
            <tr>
                <th>Metric</th>
                <th>Value</th>
                <th>Status</th>
            </tr>
            <tr>
                <td>Total Tests</td>
                <td>$mode_tests</td>
                <td>-</td>
            </tr>
            <tr>
                <td>Passed</td>
                <td>$mode_passed</td>
                <td class="pass">✅</td>
            </tr>
            <tr>
                <td>Failed</td>
                <td>$mode_failed</td>
                <td class="fail">$([ $mode_failed -gt 0 ] && echo "❌" || echo "✅")</td>
            </tr>
            <tr>
                <td>Pass Rate</td>
                <td>${mode_rate}%</td>
                <td class="$([ $mode_rate -ge 80 ] && echo "pass" || echo "warning")">
                    $([ $mode_rate -ge 80 ] && echo "✅" || echo "⚠️")
                </td>
            </tr>
        </table>
EOF
        
        # Add violation details if available
        violations=$(ls -t "$RESULTS_DIR"/violations-*.json 2>/dev/null | head -1)
        if [ -f "$violations" ]; then
            cat >> "$REPORT_FILE" << EOF
        <h3>Violations Detected</h3>
        <div>
EOF
            jq -r '.byType | to_entries[] | "<span class=\"violation-badge violation-\(.value.severity)\">\(.key): \(.value.count)</span>"' "$violations" >> "$REPORT_FILE" 2>/dev/null || true
            
            cat >> "$REPORT_FILE" << EOF
        </div>
EOF
        fi
        
        echo "    </div>" >> "$REPORT_FILE"
    fi
done

# Add timestamp
cat >> "$REPORT_FILE" << EOF
    <div class="timestamp">
        Report generated: $(date)
    </div>
</body>
</html>
EOF

echo "✅ HTML report generated: $REPORT_FILE"

# Open report if possible
if command -v xdg-open &> /dev/null; then
    echo "Opening report in browser..."
    xdg-open "$REPORT_FILE"
elif command -v open &> /dev/null; then
    echo "Opening report in browser..."
    open "$REPORT_FILE"
else
    echo "Report available at: $REPORT_FILE"
fi