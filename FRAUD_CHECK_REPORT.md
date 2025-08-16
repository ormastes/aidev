# Fraud Check Security Report

Generated: 2025-08-15T12:10:48.331Z

## Security Score: 0/100

## Summary
- Files Scanned: 9868
- Total Lines: 2356920
- Violations Found: 5254
- Execution Time: 1943ms

## Critical Issues
- **SQL_INJECTION**: Potential SQL injection vulnerability
  - File: `_aidev/50.src/53.logic/core/xlib_node_process/index.ts`
  - Fix: Use parameterized queries
- **SQL_INJECTION**: Potential SQL injection vulnerability
  - File: `_aidev/50.src/53.logic/feature/services/browser-automation/detectors/BrowserDetector.ts`
  - Fix: Use parameterized queries
- **SQL_INJECTION**: Potential SQL injection vulnerability
  - File: `_aidev/50.src/53.logic/feature/services/browser-automation/detectors/LinuxBrowserDetector.ts`
  - Fix: Use parameterized queries
- **HARDCODED_SECRET**: Hardcoded credential detected
  - File: `_aidev/70.test/integration/mcp-output-sanitization-integration.test.ts`
  - Fix: Use environment variables
- **HARDCODED_SECRET**: Hardcoded credential detected
  - File: `_aidev/70.test/integration/mcp-output-sanitization-integration.test.ts`
  - Fix: Use environment variables
- **SQL_INJECTION**: Potential SQL injection vulnerability
  - File: `_aidev/70.test/integration/simple-ollama-test.ts`
  - Fix: Use parameterized queries
- **HARDCODED_SECRET**: Hardcoded credential detected
  - File: `_aidev/70.test/integration/test-all-e2e.ts`
  - Fix: Use environment variables
- **HARDCODED_SECRET**: Hardcoded credential detected
  - File: `_aidev/70.test/integration/test-login-navigation.ts`
  - Fix: Use environment variables
- **HARDCODED_SECRET**: Hardcoded credential detected
  - File: `_aidev/70.test/unit/core/services/alert-analysis/report-formatter.test.ts`
  - Fix: Use environment variables
- **HARDCODED_SECRET**: Hardcoded credential detected
  - File: `_aidev/70.test/unit/core/services/alert-analysis/report-scheduler.test.ts`
  - Fix: Use environment variables

## High Severity Issues
- **PATH_TRAVERSAL**: Potential path traversal
  - File: `.venv/bin/activate_this.py`
- **PATH_TRAVERSAL**: Potential path traversal
  - File: `.venv/lib/python3.11/site-packages/_pytest/assertion/truncate.py`
- **PATH_TRAVERSAL**: Potential path traversal
  - File: `.venv/lib/python3.11/site-packages/_pytest/cacheprovider.py`
- **DEBUGGER_STATEMENT**: Debugger statement found
  - File: `.venv/lib/python3.11/site-packages/_pytest/debugging.py`
- **DEBUGGER_STATEMENT**: Debugger statement found
  - File: `.venv/lib/python3.11/site-packages/_pytest/doctest.py`
- **DEBUGGER_STATEMENT**: Debugger statement found
  - File: `.venv/lib/python3.11/site-packages/_pytest/hookspec.py`
- **PATH_TRAVERSAL**: Potential path traversal
  - File: `.venv/lib/python3.11/site-packages/behave/model.py`
- **PATH_TRAVERSAL**: Potential path traversal
  - File: `.venv/lib/python3.11/site-packages/mypy/stubgen.py`
- **DEBUGGER_STATEMENT**: Debugger statement found
  - File: `.venv/lib/python3.11/site-packages/mypy/test/data.py`
- **PATH_TRAVERSAL**: Potential path traversal
  - File: `.venv/lib/python3.11/site-packages/mypy/test/helpers.py`

## Top Issues
- PATH_TRAVERSAL: 3697 occurrences
- CONSOLE_STATEMENTS: 957 occurrences
- WEAK_RANDOM: 246 occurrences
- HARDCODED_SECRET: 145 occurrences
- UNRESOLVED_TODOS: 123 occurrences

## Recommendations
1. Fix all critical vulnerabilities
2. Implement security scanning
3. Use environment variables for secrets
4. Add input validation
5. Regular security audits