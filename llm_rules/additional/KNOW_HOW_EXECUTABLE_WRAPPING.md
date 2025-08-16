# Know-How: Executable Wrapping and Bash Script Pitfalls

## Problem: Bash Arithmetic Increment with `set -e`

### Issue Description
When using `set -e` (exit on error) in bash scripts, the arithmetic increment operator `((var++))` can cause unexpected script termination when the variable starts at 0.

### Root Cause
```bash
set -e
COUNT=0
((COUNT++))  # This returns exit code 1 because pre-increment value 0 is "false"

# Script exits here due to set -e!
```text

The `((expression))` arithmetic evaluation returns:

- Exit code 0 if the expression evaluates to non-zero (true)

- Exit code 1 if the expression evaluates to zero (false)

Since `COUNT++` returns the pre-increment value (0), it's considered false, causing exit code 1.

### Solution
Use explicit arithmetic assignment which always returns exit code 0:
```bash

# Instead of:
((COUNT++))

# Use:
COUNT=$((COUNT + 1))
```text

## Example: Claude Complete Script Fix

### Before (Broken)
```bash
set -euo pipefail
SESSION_COUNT=0
RETRY_COUNT=0

# This line causes immediate exit when SESSION_COUNT is 0
((SESSION_COUNT++))  

# Never reaches here!
run_claude_session "$SESSION_COUNT"
```text

### After (Fixed)
```bash
set -euo pipefail
SESSION_COUNT=0
RETRY_COUNT=0

# This works correctly
SESSION_COUNT=$((SESSION_COUNT + 1))
run_claude_session "$SESSION_COUNT"
```text

## Best Practices for Executable Wrapping

### 1. Stream Processing for Real-time Output
When wrapping executables that produce streaming output (like Claude with `--output-format stream-json`):

```bash

# Good: Process output in real-time
parse_json_stream() {
    while IFS= read -r line; do
        echo "$line" >> "$json_log"  # Save raw data
        # Process and display in real-time
        if echo "$line" | grep -q '"type":"text"'; then
            # Extract and display text immediately
        fi
    done
}

echo "$PROMPT" | claude --output-format stream-json | parse_json_stream
```text

### 2. Proper Error Handling with Functions
When calling functions that may return non-zero for valid reasons:

```bash

# For display/logging purposes where failure is OK
check_status || true  # Ignore exit code

# In conditionals, no need for || true
if check_status; then
    echo "Status is good"
fi
```text

### 3. Signal Handling for Graceful Shutdown
```bash
cleanup() {
    echo "Shutting down..."
    [[ -n "${CHILD_PID:-}" ]] && kill "$CHILD_PID" 2>/dev/null
    exit 0
}

trap cleanup SIGINT SIGTERM
```text

### 4. Continuous Operation Patterns
For scripts that should run until a condition is met:

```bash

# Check multiple conditions
while [[ "$SHUTDOWN" == "false" ]]; do
    # Primary completion check
    if all_done; then
        echo "Complete!"
        break
    fi
    
    # Secondary checks
    if ! has_work; then
        echo "No work, but not done yet"
        # Continue anyway
    fi
    
    # Do work
    do_work
    
    # Retry logic
    if failed; then
        RETRY_COUNT=$((RETRY_COUNT + 1))
        if [[ $RETRY_COUNT -ge $MAX_RETRIES ]]; then
            echo "Max retries reached"
            break
        fi
        sleep $((RETRY_COUNT * DELAY))
    fi
done
```text

### 5. Testing Script Longevity
Always test that long-running scripts actually stay running:

```bash

# Test script
./script.sh &
PID=$!
sleep 5
if ps -p $PID > /dev/null; then
    echo "SUCCESS: Still running"
else
    echo "FAILED: Exited early"
    wait $PID
    echo "Exit code: $?"
fi
kill $PID 2>/dev/null
```text

## Common Pitfalls Summary

1. **Arithmetic operations with `set -e`**: Use `var=$((var + 1))` not `((var++))`

2. **Function calls for display**: Add `|| true` when the exit code doesn't matter

3. **Empty variables in conditionals**: Use `"${var:-}"` to handle unset variables

4. **Stream processing**: Don't buffer - process line by line for real-time output

5. **Child process management**: Always track PIDs and clean up in signal handlers

## Debugging Tips

1. **Use `set -x`**: Shows each command before execution

2. **Remove `set -e` temporarily**: Helps identify which command is failing

3. **Check exit codes**: `echo $?` after suspicious commands

4. **Log everything**: Both to screen and file for analysis

5. **Test incrementally**: Verify each component works before combining
