#!/bin/bash
# File API Compliance Alert Monitor
# Runs hourly to check compliance and trigger alerts

LOG_FILE="/home/ormastes/dev/aidev/gen/doc/compliance-alerts.log"
CONFIG_FILE="/home/ormastes/dev/aidev/config/compliance-alerts.json"

# Function to check compliance
check_compliance() {
    echo "[$(date)] Running compliance check..." >> "$LOG_FILE"
    
    # Run compliance scan
    npm run file-api:scan:prod 2>/dev/null | tee -a "$LOG_FILE"
    
    # Extract metrics
    VIOLATIONS=$(grep "Total violations:" "$LOG_FILE" | tail -1 | awk '{print $3}')
    COMPLIANCE_RATE=$(echo "scale=1; (1011 - $VIOLATIONS) / 1011 * 100" | bc)
    
    # Check thresholds
    if (( $(echo "$COMPLIANCE_RATE < 90" | bc -l) )); then
        trigger_alert "critical" "Compliance rate critically low: $COMPLIANCE_RATE%"
    elif (( $(echo "$COMPLIANCE_RATE < 95" | bc -l) )); then
        trigger_alert "warning" "Compliance rate below warning threshold: $COMPLIANCE_RATE%"
    elif (( $(echo "$COMPLIANCE_RATE < 99" | bc -l) )); then
        trigger_alert "info" "Compliance rate below target: $COMPLIANCE_RATE%"
    fi
}

# Function to trigger alerts
trigger_alert() {
    SEVERITY=$1
    MESSAGE=$2
    
    echo "[$(date)] [$SEVERITY] $MESSAGE" >> "$LOG_FILE"
    
    # Console notification
    if [ "$SEVERITY" = "critical" ]; then
        echo -e "\033[0;31m🚨 CRITICAL ALERT: $MESSAGE\033[0m"
    elif [ "$SEVERITY" = "warning" ]; then
        echo -e "\033[0;33m⚠️  WARNING: $MESSAGE\033[0m"
    else
        echo -e "\033[0;34mℹ️  INFO: $MESSAGE\033[0m"
    fi
    
    # Auto-fix if enabled
    if [ "$SEVERITY" = "critical" ] || [ "$SEVERITY" = "warning" ]; then
        echo "🔧 Attempting auto-fix..." >> "$LOG_FILE"
        npm run file-api:fix 2>&1 >> "$LOG_FILE"
    fi
}

# Main execution
check_compliance
