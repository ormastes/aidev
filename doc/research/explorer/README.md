# Explorer QA Agent

Autonomous web and API testing using MCP (Model Context Protocol) for the AI Development Platform.

## Overview

The Explorer is an AI-powered QA agent that automatically discovers and reports bugs by:
- Navigating web interfaces using Playwright MCP
- Testing APIs against OpenAPI specifications
- Cross-validating UI behavior with API responses
- Generating reproducible bug reports with Playwright tests

## Quick Start

### 1. Installation

```bash
# Run the setup script
./setup/install-playwright-mcp.sh

# Or manual installation
bun add -g @playwright/mcp@latest
uv pip install mcp awslabs.openapi-mcp-server[all]
bunx playwright install chromium firefox webkit
```

### 2. Configuration

Copy and configure the environment file:

```bash
cp .env.explorer .env
# Edit .env with your staging URLs and test credentials
```

Required environment variables:
- `STAGING_URL` - Your staging environment URL
- `OPENAPI_SPEC_URL` - OpenAPI specification URL
- `TEST_USER_EMAIL` - Test account email
- `TEST_USER_PASSWORD` - Test account password

### 3. Run Exploration

```bash
# Run the Explorer agent
python3 research/explorer/scripts/explorer.py

# Or use the helper script
./research/explorer/scripts/run-explorer.sh
```

## Architecture

```
research/explorer/
├── config/
│   ├── mcp-servers.json    # MCP server configurations
│   └── invariants.yaml      # Testing rules and invariants
├── findings/
│   └── [session]_*.md      # Discovered issues
├── tests/
│   └── generated/           # Auto-generated Playwright tests
└── scripts/
    ├── explorer.py          # Main Explorer agent
    └── run-explorer.sh      # Runner script
```

## MCP Servers

### Playwright MCP
Controls browser automation:
- Navigate pages
- Click elements
- Type text
- Capture screenshots
- Monitor console/network

### OpenAPI MCP
Tests API endpoints:
- Dynamic tool generation from spec
- Schema validation
- Authentication support
- Contract testing

### GitHub MCP
Files issues automatically:
- Creates detailed bug reports
- Attaches reproduction steps
- Includes generated tests
- Tags for triage

## Testing Flows

The Explorer tests these critical flows:

### 1. Authentication
- Login/logout
- Session management
- Password reset
- Token refresh

### 2. Search
- Query handling
- Result relevance
- Special character escaping
- Empty query behavior

### 3. CRUD Operations
- Create with validation
- Read with filters
- Update with versioning
- Delete with confirmation

### 4. Pagination
- Consistent ordering
- No duplicates
- Proper limits
- Total count accuracy

## Invariants

The Explorer checks these invariants across all flows:

### Global
- No 5xx errors
- No console errors
- No stack traces exposed
- No PII in errors
- Response time < 3s

### Security
- Authentication required on protected endpoints
- CSRF protection on state changes
- Security headers present
- No sensitive data in logs

### API
- Schema compliance
- Required headers present
- Rate limiting works
- CORS properly configured

## Generated Tests

For each finding, the Explorer generates a Playwright test:

```typescript
import { test, expect } from '@playwright/test';

test('authentication should not have console errors', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  await page.goto('https://staging.example.com');
  await page.click('button:has-text("Login")');
  
  // ... test implementation
  
  expect(consoleErrors).toHaveLength(0);
});
```

## Issue Reports

Issues are filed with:
- Clear title and description
- Severity and type classification
- Exact reproduction steps
- Expected vs actual behavior
- Evidence (logs, screenshots)
- Runnable test code

## Integration with Claude Code

### Add MCP servers to Claude Code:

```bash
# Playwright MCP
claude mcp add playwright bunx @playwright/mcp@latest --browser chrome

# OpenAPI MCP
claude mcp add openapi uvx awslabs.openapi-mcp-server@latest \
  --env API_NAME=aidev \
  --env API_BASE_URL=${STAGING_URL} \
  --env API_SPEC_URL=${OPENAPI_SPEC_URL}
```

### Use Explorer prompt:

```
You are an Explorer QA Agent. Use the playwright and openapi MCP tools to:
1. Navigate the staging site
2. Test critical flows 
3. Check for console/network errors
4. Validate API responses
5. Report any issues found
```

## CI/CD Integration

Add to your CI pipeline:

```yaml
# .github/workflows/explorer.yml
name: Explorer QA
on:
  schedule:
    - cron: '0 2 * * *'  # Run nightly
  workflow_dispatch:

jobs:
  explore:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - uses: actions/setup-python@v4
      
      - name: Install dependencies
        run: |
          bun add -g @playwright/mcp@latest
          uv pip install mcp awslabs.openapi-mcp-server[all]
          bunx playwright install chromium
      
      - name: Run Explorer
        env:
          STAGING_URL: ${{ secrets.STAGING_URL }}
          OPENAPI_SPEC_URL: ${{ secrets.OPENAPI_SPEC_URL }}
        run: python research/explorer/scripts/explorer.py
      
      - name: Upload findings
        uses: actions/upload-artifact@v3
        with:
          name: explorer-findings
          path: research/explorer/findings/
```

## Extending the Explorer

### Add new flows:

```python
async def _explore_payment_flow(self, session: ClientSession):
    """Test payment processing"""
    # Implement payment-specific tests
    pass
```

### Add custom invariants:

```yaml
# config/invariants.yaml
payment:
  - name: pci_compliance
    description: No card numbers in logs
    check: not contains(logs, card_regex)
    severity: critical
```

### Add new MCP servers:

```json
{
  "database": {
    "command": "npx",
    "args": ["@modelcontextprotocol/database-mcp"]
  }
}
```

## Troubleshooting

### Common Issues

1. **MCP server not starting**
   - Check Node.js version (18+)
   - Verify npm packages installed
   - Check server logs

2. **Can't find elements**
   - Use browser_snapshot first
   - Check selectors in DevTools
   - Add wait conditions

3. **API validation fails**
   - Verify OpenAPI spec URL
   - Check authentication
   - Review CORS settings

### Debug Mode

Enable verbose logging:

```bash
EXPLORER_DEBUG=true python3 research/explorer/scripts/explorer.py
```

## Best Practices

1. **Never run on production** - Always use staging
2. **Use test accounts** - Never real user data
3. **Respect rate limits** - Max 1 RPS
4. **Snapshot before action** - Improves accuracy
5. **Generate tests** - Every bug needs a test
6. **Cross-validate** - Check UI and API together

## Resources

- [MCP Protocol Docs](https://modelcontextprotocol.io)
- [Playwright MCP](https://github.com/modelcontextprotocol/playwright-mcp)
- [OpenAPI MCP](https://github.com/awslabs/openapi-mcp-server)
- [GitHub MCP](https://github.com/github/github-mcp-server)