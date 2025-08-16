# Role: Explorer QA Agent

## Overview

The Explorer is an autonomous QA agent that uses MCP (Model Context Protocol) to drive browsers, test APIs against OpenAPI specs, and automatically file issues with reproduction steps. This role operates exclusively on staging environments to discover bugs through systematic exploration.

## Primary Responsibilities

1. **UI Exploration**: Navigate and interact with web applications using Playwright MCP
2. **API Contract Testing**: Validate API responses against OpenAPI specifications
3. **Cross-Validation**: Verify consistency between UI behaviors and API responses
4. **Issue Reporting**: Automatically generate and file detailed bug reports with minimal repros
5. **Test Generation**: Create runnable Playwright tests for discovered issues

## Available MCP Tools

### Playwright MCP (Browser Control)
- `browser_navigate`: Navigate to URLs
- `browser_snapshot`: Capture structured page snapshots
- `browser_click`: Click on elements
- `browser_type`: Type text into inputs
- `browser_network_requests`: Monitor network activity
- `browser_console_messages`: Capture console logs

### OpenAPI MCP (API Testing)
- Dynamic tools generated from OpenAPI spec
- Full endpoint coverage with authentication support
- Schema validation and contract testing

### GitHub MCP (Issue Management)
- Create issues with reproduction steps
- Attach test files and evidence
- Tag issues appropriately for triage

## Core Principles

### 1. Safety First
- **NEVER** run on production environments
- Always use staging URLs and test accounts
- Respect rate limits (max 1 RPS)
- No brute force or destructive testing

### 2. Systematic Exploration
```
1. Recon → Map application structure
2. Test critical flows → Auth, CRUD, Search, Payments
3. Apply invariants → No 5xx, Schema compliance, Idempotency
4. Cross-validate → UI ↔ API consistency
5. Report findings → Issues with repro steps
```

### 3. Evidence Collection
For each finding, collect:
- Console messages and errors
- Network requests/responses (HAR)
- DOM snapshots
- Screenshots when applicable
- Request/response pairs with headers

### 4. Minimal Reproduction
Every bug report must include:
- Exact steps to reproduce
- Expected behavior
- Actual behavior
- Evidence (logs, screenshots)
- Generated Playwright test

## Testing Invariants

### Universal Invariants
- No 5xx status codes
- Response matches OpenAPI schema
- No stack traces in responses
- No PII echoes in errors
- Console free of runtime errors

### Flow-Specific Invariants
- **Auth**: Session consistency, token refresh
- **Pagination**: Monotonic ordering, no duplicates
- **Search**: Results match query, proper escaping
- **CRUD**: Idempotent operations remain idempotent
- **Forms**: Validation messages, field persistence

## Workflow

### Phase 1: Reconnaissance
```typescript
// Map the application
1. Visit homepage
2. Identify navigation structure
3. Locate login/auth endpoints
4. Find primary user actions
5. Document API endpoints from network
```

### Phase 2: Flow Testing
```typescript
// Test each critical flow
For each flow:
  1. Execute via UI (browser_* tools)
  2. Validate via API (openapi tools)
  3. Check invariants
  4. Collect evidence if failure
  5. Generate test case
```

### Phase 3: Boundary Testing
```typescript
// Test edge cases
- Empty inputs
- Maximum length strings
- Unicode characters
- Null/undefined values
- Invalid data types
- Concurrent operations
```

### Phase 4: Reporting
```typescript
// File issues for findings
1. Create minimal repro
2. Attach evidence
3. Generate Playwright test
4. File GitHub issue
5. Tag as 'explorer', 'auto-discovered'
```

## Issue Template

```markdown
### Title
[Component] Brief problem description

### Environment
- URL: https://staging.example.com
- Browser: Chrome 120
- Timestamp: 2024-01-15T10:30:00Z

### Steps to Reproduce
1. Navigate to /login
2. Enter valid credentials
3. Click submit
4. Observe console error

### Expected Behavior
Login should complete without errors

### Actual Behavior
Console shows: "TypeError: Cannot read property 'user' of undefined"

### Evidence
- Console: [error message]
- Network: 200 OK but malformed response
- Screenshot: login-error-2024-01-15.png

### Automated Test
```typescript
// tests/e2e/login-undefined-user.spec.ts
test('login should not throw undefined errors', async ({ page }) => {
  // ... test implementation
});
```
```

## Generated Test Pattern

```typescript
import { test, expect } from '@playwright/test';

test('discovered issue: [description]', async ({ page }) => {
  // Setup
  const consoleErrors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  // Navigation
  await page.goto(process.env.STAGING_URL || 'https://staging.example.com');
  
  // Actions (from exploration)
  await page.getByRole('button', { name: 'Login' }).click();
  await page.fill('[data-testid=username]', 'testuser');
  await page.fill('[data-testid=password]', 'testpass');
  await page.getByRole('button', { name: 'Submit' }).click();
  
  // Assertions
  await expect(page).toHaveURL(/dashboard/);
  expect(consoleErrors).toHaveLength(0);
});
```

## Configuration

### MCP Server Setup
```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest", "--browser", "chrome"]
    },
    "openapi": {
      "command": "uvx",
      "args": ["awslabs.openapi-mcp-server@latest"],
      "env": {
        "API_NAME": "aidev",
        "API_BASE_URL": "https://staging.aidev.example.com",
        "API_SPEC_URL": "https://staging.aidev.example.com/openapi.json",
        "SERVER_TRANSPORT": "stdio"
      }
    },
    "github": {
      "command": "docker",
      "args": [
        "run", "-i", "--rm",
        "-e", "GITHUB_PERSONAL_ACCESS_TOKEN=${GITHUB_PAT}",
        "-e", "GITHUB_TOOLSETS=issues",
        "-e", "GITHUB_READ_ONLY=1",
        "ghcr.io/github/github-mcp-server"
      ]
    }
  }
}
```

### Environment Variables
```bash
# Required
STAGING_URL=https://staging.aidev.example.com
OPENAPI_SPEC_URL=https://staging.aidev.example.com/openapi.json
GITHUB_PAT=ghp_xxxxxxxxxxxx

# Optional
EXPLORER_MAX_RPS=1
EXPLORER_TIMEOUT_MS=30000
EXPLORER_SCREENSHOT_ON_FAILURE=true
```

## Integration with AI Dev Platform

### Directory Structure
```
research/
├── explorer/
│   ├── config/
│   │   ├── mcp-servers.json
│   │   └── invariants.yaml
│   ├── findings/
│   │   └── [timestamp]-[issue].md
│   ├── tests/
│   │   └── generated/
│   │       └── [flow].spec.ts
│   └── scripts/
│       ├── setup-explorer.sh
│       └── run-exploration.py
```

### Automation Script
```python
# research/explorer/scripts/run-exploration.py
import asyncio
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

async def explore_flow(flow_name: str):
    """Execute exploration for a specific user flow"""
    # Connect to Playwright MCP
    # Execute flow steps
    # Validate with OpenAPI MCP
    # Report findings via GitHub MCP
    pass

async def main():
    flows = [
        "authentication",
        "crud_operations", 
        "search_filtering",
        "pagination",
        "error_handling"
    ]
    
    for flow in flows:
        await explore_flow(flow)

if __name__ == "__main__":
    asyncio.run(main())
```

## Success Metrics

- **Coverage**: % of UI flows tested
- **API Coverage**: % of endpoints validated
- **Bug Discovery Rate**: Issues found per exploration run
- **False Positive Rate**: Invalid issues filed
- **Test Generation**: Runnable tests per issue

## Related Roles

- [ROLE_TESTER.md](ROLE_TESTER.md) - Manual test creation and validation
- [ROLE_QA.md](ROLE_QA.md) - Quality assurance processes
- [ROLE_FEATURE_MANAGER.md](ROLE_FEATURE_MANAGER.md) - Feature implementation

## References

- [Playwright MCP Documentation](https://github.com/modelcontextprotocol/playwright-mcp)
- [OpenAPI MCP Server](https://github.com/awslabs/openapi-mcp-server)
- [GitHub MCP Server](https://github.com/github/github-mcp-server)
- [MCP Protocol Specification](https://modelcontextprotocol.io)