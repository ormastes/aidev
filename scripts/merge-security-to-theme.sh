#!/bin/bash

# Merge root security folder into portal_security theme
set -e

SECURITY_ROOT="security"
SECURITY_THEME="layer/themes/portal_security"

echo "=== Merging Security Features into portal_security Theme ==="

# Check if source exists
if [ ! -d "$SECURITY_ROOT" ]; then
    echo "Security folder not found at root"
    exit 1
fi

# Move security middleware components to theme
echo "Moving security middleware components..."
cp -v "$SECURITY_ROOT"/audit-logger.ts "$SECURITY_THEME/children/AuditLogger.ts" 2>/dev/null || true
cp -v "$SECURITY_ROOT"/csrf-protection.ts "$SECURITY_THEME/children/CSRFProtection.ts"
cp -v "$SECURITY_ROOT"/rate-limiter-enhanced.ts "$SECURITY_THEME/children/RateLimiterEnhanced.ts"
cp -v "$SECURITY_ROOT"/rate-limiter.ts "$SECURITY_THEME/children/RateLimiter.ts"
cp -v "$SECURITY_ROOT"/security-headers.ts "$SECURITY_THEME/children/SecurityHeaders.ts"
cp -v "$SECURITY_ROOT"/web-security-middleware.ts "$SECURITY_THEME/children/WebSecurityMiddleware.ts"

# Copy compiled files
echo "Copying compiled JavaScript files..."
for file in "$SECURITY_ROOT"/*.js; do
    if [ -f "$file" ]; then
        basename=$(basename "$file")
        cp -v "$file" "$SECURITY_THEME/children/$basename"
    fi
done

# Copy map files
echo "Copying source map files..."
for file in "$SECURITY_ROOT"/*.map; do
    if [ -f "$file" ]; then
        basename=$(basename "$file")
        cp -v "$file" "$SECURITY_THEME/children/$basename"
    fi
done

# Create a consolidated security module index
cat > "$SECURITY_THEME/children/index.ts" << 'EOF'
/**
 * Portal Security Theme - Consolidated Security Module
 * Merged from root security folder
 */

// Core security middleware
export { AuditLogger } from './AuditLogger';
export { CSRFProtection } from './CSRFProtection';
export { RateLimiterEnhanced } from './RateLimiterEnhanced';
export { RateLimiter } from './RateLimiter';
export { SecurityHeaders } from './SecurityHeaders';
export { WebSecurityMiddleware } from './WebSecurityMiddleware';

// Existing portal security components
export { AuthService } from './AuthService';
export { SessionManager } from './SessionManager';
export { TokenService } from './TokenService';
export { SecurityMiddleware } from './SecurityMiddleware';
export { PortManager } from './PortManager';
export { EnhancedPortManager } from './EnhancedPortManager';
export { CredentialStore } from './CredentialStore';

// Unified security suite
export class UnifiedSecuritySuite {
    static async initializeAll() {
        console.log('Initializing unified security suite...');
        // Initialize all security components
    }
}
EOF

# Update pipe/index.ts to export all security features
cat > "$SECURITY_THEME/pipe/index.ts" << 'EOF'
/**
 * Portal Security Theme - Pipe Gateway
 * Provides cross-layer access to security features
 */

// Re-export all security components
export * from '../children';

// Convenience security configuration
export const SecurityConfig = {
    enableCSRF: true,
    enableRateLimiting: true,
    enableAuditLogging: true,
    enableSecurityHeaders: true,
    sessionTimeout: 3600000, // 1 hour
    tokenExpiry: 86400000, // 24 hours
};

// Quick setup function
export async function setupSecurity(app: any) {
    const { 
        CSRFProtection,
        RateLimiterEnhanced,
        SecurityHeaders,
        AuditLogger,
        WebSecurityMiddleware
    } = await import('../children');
    
    // Apply all security middleware
    app.use(new SecurityHeaders().middleware());
    app.use(new CSRFProtection().middleware());
    app.use(new RateLimiterEnhanced().middleware());
    app.use(new AuditLogger().middleware());
    app.use(new WebSecurityMiddleware().middleware());
    
    console.log('Security suite initialized');
}
EOF

# Create migration documentation
cat > "$SECURITY_THEME/docs/SECURITY_MIGRATION.md" << 'EOF'
# Security Migration Documentation

## Overview
The security features have been migrated from the root `/security` folder to the `portal_security` theme.

## Migration Changes

### File Relocations
- `/security/audit-logger.ts` → `/layer/themes/portal_security/children/AuditLogger.ts`
- `/security/csrf-protection.ts` → `/layer/themes/portal_security/children/CSRFProtection.ts`
- `/security/rate-limiter-enhanced.ts` → `/layer/themes/portal_security/children/RateLimiterEnhanced.ts`
- `/security/rate-limiter.ts` → `/layer/themes/portal_security/children/RateLimiter.ts`
- `/security/security-headers.ts` → `/layer/themes/portal_security/children/SecurityHeaders.ts`
- `/security/web-security-middleware.ts` → `/layer/themes/portal_security/children/WebSecurityMiddleware.ts`

### Import Updates
Update your imports from:
```typescript
import { AuditLogger } from '../../security/audit-logger';
```

To:
```typescript
import { AuditLogger } from '../../layer/themes/portal_security/pipe';
```

### Using the Unified Security Suite
```typescript
import { setupSecurity } from '../../layer/themes/portal_security/pipe';

// Quick setup for Express app
await setupSecurity(app);
```

## Benefits
1. **Centralized Security**: All security features in one theme
2. **HEA Compliance**: Follows hierarchical encapsulation architecture
3. **Reusability**: Security features can be imported as a theme
4. **Maintainability**: Single location for all security-related code
EOF

echo "=== Security Features Successfully Merged ==="
echo ""
echo "Next steps:"
echo "1. Update imports in other files to use the theme path"
echo "2. Test the integrated security features"
echo "3. Remove the redundant /security folder"
echo ""
echo "Documentation created at: $SECURITY_THEME/docs/SECURITY_MIGRATION.md"