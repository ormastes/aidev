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
