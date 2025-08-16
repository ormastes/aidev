# Authentication Guide

The Coordinator Claude Agent supports flexible authentication with automatic fallback between local Claude CLI credentials and API keys.

## Authentication Methods

### 1. Local Claude Authentication (Default)

**Advantages:**
- No need to manage API keys
- Automatic token refresh
- Uses existing Claude CLI authentication

**Requirements:**
- Claude CLI must be installed and authenticated
- Credentials stored at `~/.claude/.credentials.json`

**Setup:**
```bash
# Install Claude CLI (if not already installed)
npm install -g @anthropic-ai/claude-cli

# Authenticate
claude auth

# Verify authentication
claude auth status
```

### 2. API Key Authentication

**Advantages:**
- Direct control over authentication
- Works in environments without Claude CLI
- Explicit and deterministic

**Setup:**
```bash
# Option 1: Environment variable
export CLAUDE_API_KEY="your-api-key"

# Option 2: Command line flag
./coordinator start --api-key your-api-key

# Option 3: .env file
echo "CLAUDE_API_KEY=your-api-key" >> .env
```

## Authentication Priority

The coordinator uses this priority order:

1. **API Key** (if provided via flag or environment)
2. **Local Claude Credentials** (if available and valid)
3. **Error** (if neither is available)

## Checking Authentication Status

### During Startup
The coordinator displays authentication status:
```
🔐 Authentication: Local Claude credentials
🔄 Started new session: coord-session-abc123
```

### Manual Check
```bash
# Run the authentication demo
./examples/auth-demo.js

# Check Claude CLI status
claude auth status

# Check for credentials file
ls -la ~/.claude/.credentials.json
```

## Troubleshooting

### Error: "No authentication found"

**Cause:** Neither API key nor local credentials are available.

**Solutions:**
1. Authenticate with Claude CLI: `claude auth`
2. Set API key: `export CLAUDE_API_KEY="your-key"`
3. Use command flag: `--api-key your-key`

### Error: "Claude access token expired"

**Cause:** Local Claude credentials have expired.

**Solutions:**
1. Re-authenticate: `claude auth`
2. Use API key instead: `--api-key your-key`
3. Disable local auth: `--no-local-auth --api-key your-key`

### Error: "Authentication failed"

**Cause:** Invalid API key or corrupted credentials.

**Solutions:**
1. Verify API key is correct
2. Clear and re-authenticate Claude CLI:
   ```bash
   claude auth logout
   claude auth
   ```
3. Check credentials file format:
   ```bash
   cat ~/.claude/.credentials.json | jq .
   ```

### Warning: "Failed to connect to Claude API"

**Cause:** Network issues or service unavailable.

**Solutions:**
1. Check internet connection
2. Verify API endpoint is accessible
3. Check for proxy/firewall issues
4. Retry with different authentication method

## Environment Variables

```bash
# Authentication
CLAUDE_API_KEY=your-api-key-here

# Model configuration
CLAUDE_MODEL=claude-opus-4-20250514
CLAUDE_MAX_TOKENS=4096
CLAUDE_TIMEOUT=60000

# Custom credentials path (advanced)
CLAUDE_CREDENTIALS_PATH=/custom/path/.credentials.json
```

## Security Considerations

### API Keys
- Never commit API keys to version control
- Use environment variables or secure vaults
- Rotate keys regularly
- Monitor usage and billing

### Local Credentials
- Stored encrypted in `~/.claude/.credentials.json`
- File permissions should be restrictive (600)
- Tokens have expiration times
- Refresh tokens enable automatic renewal

### Best Practices
1. Use local authentication for development
2. Use API keys for production/CI environments
3. Never log or expose authentication tokens
4. Implement proper error handling for auth failures
5. Monitor token expiration and renewal

## Advanced Configuration

### Custom Credentials Path
```typescript
const client = new ClaudeAPIClient({
  authOptions: {
    credentialsPath: '/custom/path/.credentials.json'
  }
});
```

### Disable Local Authentication
```bash
# Force API key only
./coordinator start --no-local-auth --api-key your-key
```

### Mixed Environments
```bash
# Development (local auth)
./coordinator start

# Production (API key)
CLAUDE_API_KEY=prod-key ./coordinator start --no-local-auth

# CI/CD (explicit key)
./coordinator start --api-key $CI_CLAUDE_KEY --no-local-auth
```

## Integration Examples

### Docker
```dockerfile
# Option 1: API key via environment
ENV CLAUDE_API_KEY=your-key
CMD ["./coordinator", "start", "--no-local-auth"]

# Option 2: Mount credentials
VOLUME ["/root/.claude"]
CMD ["./coordinator", "start"]
```

### CI/CD
```yaml
# GitHub Actions example
env:
  CLAUDE_API_KEY: ${{ secrets.CLAUDE_API_KEY }}
run: |
  ./coordinator start --no-local-auth --no-interactive
```

### Scripts
```bash
#!/bin/bash
# Auto-detect authentication method
if [ -f "$HOME/.claude/.credentials.json" ]; then
    ./coordinator start
else
    ./coordinator start --api-key "$CLAUDE_API_KEY"
fi
```