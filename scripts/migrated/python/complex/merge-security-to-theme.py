#!/usr/bin/env python3
"""
Migrated from: merge-security-to-theme.sh
Auto-generated Python - 2025-08-16T04:57:27.742Z
"""

import os
import sys
import subprocess
import shutil
import glob
from pathlib import Path

def main():
    # Merge root security folder into portal_security theme
    subprocess.run("set -e", shell=True)
    subprocess.run("SECURITY_ROOT="security"", shell=True)
    subprocess.run("SECURITY_THEME="layer/themes/portal_security"", shell=True)
    print("=== Merging Security Features into portal_security Theme ===")
    # Check if source exists
    if ! -d "$SECURITY_ROOT" :; then
    print("Security folder not found at root")
    sys.exit(1)
    # Move security middleware components to theme
    print("Moving security middleware components...")
    shutil.copy2("-v "$SECURITY_ROOT"/audit-logger.ts "$SECURITY_THEME/children/AuditLogger.ts" 2>/dev/null ||", "true")
    shutil.copy2("-v "$SECURITY_ROOT"/csrf-protection.ts", ""$SECURITY_THEME/children/CSRFProtection.ts"")
    shutil.copy2("-v "$SECURITY_ROOT"/rate-limiter-enhanced.ts", ""$SECURITY_THEME/children/RateLimiterEnhanced.ts"")
    shutil.copy2("-v "$SECURITY_ROOT"/rate-limiter.ts", ""$SECURITY_THEME/children/RateLimiter.ts"")
    shutil.copy2("-v "$SECURITY_ROOT"/security-headers.ts", ""$SECURITY_THEME/children/SecurityHeaders.ts"")
    shutil.copy2("-v "$SECURITY_ROOT"/web-security-middleware.ts", ""$SECURITY_THEME/children/WebSecurityMiddleware.ts"")
    # Copy compiled files
    print("Copying compiled JavaScript files...")
    for file in ["$SECURITY_ROOT"/*.js; do]:
    if -f "$file" :; then
    subprocess.run("basename=$(basename "$file")", shell=True)
    shutil.copy2("-v "$file"", ""$SECURITY_THEME/children/$basename"")
    # Copy map files
    print("Copying source map files...")
    for file in ["$SECURITY_ROOT"/*.map; do]:
    if -f "$file" :; then
    subprocess.run("basename=$(basename "$file")", shell=True)
    shutil.copy2("-v "$file"", ""$SECURITY_THEME/children/$basename"")
    # Create a consolidated security module index
    subprocess.run("cat > "$SECURITY_THEME/children/index.ts" << 'EOF'", shell=True)
    subprocess.run("/**", shell=True)
    subprocess.run("* Portal Security Theme - Consolidated Security Module", shell=True)
    subprocess.run("* Merged from root security folder", shell=True)
    subprocess.run("*/", shell=True)
    subprocess.run("// Core security middleware", shell=True)
    subprocess.run("export { AuditLogger } from './AuditLogger';", shell=True)
    subprocess.run("export { CSRFProtection } from './CSRFProtection';", shell=True)
    subprocess.run("export { RateLimiterEnhanced } from './RateLimiterEnhanced';", shell=True)
    subprocess.run("export { RateLimiter } from './RateLimiter';", shell=True)
    subprocess.run("export { SecurityHeaders } from './SecurityHeaders';", shell=True)
    subprocess.run("export { WebSecurityMiddleware } from './WebSecurityMiddleware';", shell=True)
    subprocess.run("// Existing portal security components", shell=True)
    subprocess.run("export { AuthService } from './AuthService';", shell=True)
    subprocess.run("export { SessionManager } from './SessionManager';", shell=True)
    subprocess.run("export { TokenService } from './TokenService';", shell=True)
    subprocess.run("export { SecurityMiddleware } from './SecurityMiddleware';", shell=True)
    subprocess.run("export { PortManager } from './PortManager';", shell=True)
    subprocess.run("export { EnhancedPortManager } from './EnhancedPortManager';", shell=True)
    subprocess.run("export { CredentialStore } from './CredentialStore';", shell=True)
    subprocess.run("// Unified security suite", shell=True)
    subprocess.run("export class UnifiedSecuritySuite {", shell=True)
    subprocess.run("static async initializeAll() {", shell=True)
    subprocess.run("console.log('Initializing unified security suite...');", shell=True)
    subprocess.run("// Initialize all security components", shell=True)
    subprocess.run("}", shell=True)
    subprocess.run("}", shell=True)
    subprocess.run("EOF", shell=True)
    # Update pipe/index.ts to export all security features
    subprocess.run("cat > "$SECURITY_THEME/pipe/index.ts" << 'EOF'", shell=True)
    subprocess.run("/**", shell=True)
    subprocess.run("* Portal Security Theme - Pipe Gateway", shell=True)
    subprocess.run("* Provides cross-layer access to security features", shell=True)
    subprocess.run("*/", shell=True)
    subprocess.run("// Re-export all security components", shell=True)
    subprocess.run("export * from '../children';", shell=True)
    subprocess.run("// Convenience security configuration", shell=True)
    os.environ["const SecurityConfig "] = " {"
    subprocess.run("enableCSRF: true,", shell=True)
    subprocess.run("enableRateLimiting: true,", shell=True)
    subprocess.run("enableAuditLogging: true,", shell=True)
    subprocess.run("enableSecurityHeaders: true,", shell=True)
    subprocess.run("sessionTimeout: 3600000, // 1 hour", shell=True)
    subprocess.run("tokenExpiry: 86400000, // 24 hours", shell=True)
    subprocess.run("};", shell=True)
    subprocess.run("// Quick setup function", shell=True)
    subprocess.run("export async function setupSecurity(app: any) {", shell=True)
    subprocess.run("const {", shell=True)
    subprocess.run("CSRFProtection,", shell=True)
    subprocess.run("RateLimiterEnhanced,", shell=True)
    subprocess.run("SecurityHeaders,", shell=True)
    subprocess.run("AuditLogger,", shell=True)
    subprocess.run("WebSecurityMiddleware", shell=True)
    subprocess.run("} = await import('../children');", shell=True)
    subprocess.run("// Apply all security middleware", shell=True)
    subprocess.run("app.use(new SecurityHeaders().middleware());", shell=True)
    subprocess.run("app.use(new CSRFProtection().middleware());", shell=True)
    subprocess.run("app.use(new RateLimiterEnhanced().middleware());", shell=True)
    subprocess.run("app.use(new AuditLogger().middleware());", shell=True)
    subprocess.run("app.use(new WebSecurityMiddleware().middleware());", shell=True)
    subprocess.run("console.log('Security suite initialized');", shell=True)
    subprocess.run("}", shell=True)
    subprocess.run("EOF", shell=True)
    # Create migration documentation
    subprocess.run("cat > "$SECURITY_THEME/docs/SECURITY_MIGRATION.md" << 'EOF'", shell=True)
    # Security Migration Documentation
    # # Overview
    subprocess.run("The security features have been migrated from the root `/security` folder to the `portal_security` theme.", shell=True)
    # # Migration Changes
    # ## File Relocations
    subprocess.run("- `/security/audit-logger.ts` → `/layer/themes/portal_security/children/AuditLogger.ts`", shell=True)
    subprocess.run("- `/security/csrf-protection.ts` → `/layer/themes/portal_security/children/CSRFProtection.ts`", shell=True)
    subprocess.run("- `/security/rate-limiter-enhanced.ts` → `/layer/themes/portal_security/children/RateLimiterEnhanced.ts`", shell=True)
    subprocess.run("- `/security/rate-limiter.ts` → `/layer/themes/portal_security/children/RateLimiter.ts`", shell=True)
    subprocess.run("- `/security/security-headers.ts` → `/layer/themes/portal_security/children/SecurityHeaders.ts`", shell=True)
    subprocess.run("- `/security/web-security-middleware.ts` → `/layer/themes/portal_security/children/WebSecurityMiddleware.ts`", shell=True)
    # ## Import Updates
    subprocess.run("Update your imports from:", shell=True)
    subprocess.run("```typescript", shell=True)
    subprocess.run("import { AuditLogger } from '../../security/audit-logger';", shell=True)
    subprocess.run("```", shell=True)
    subprocess.run("To:", shell=True)
    subprocess.run("```typescript", shell=True)
    subprocess.run("import { AuditLogger } from '../../layer/themes/portal_security/pipe';", shell=True)
    subprocess.run("```", shell=True)
    # ## Using the Unified Security Suite
    subprocess.run("```typescript", shell=True)
    subprocess.run("import { setupSecurity } from '../../layer/themes/portal_security/pipe';", shell=True)
    subprocess.run("// Quick setup for Express app", shell=True)
    subprocess.run("await setupSecurity(app);", shell=True)
    subprocess.run("```", shell=True)
    # # Benefits
    subprocess.run("1. **Centralized Security**: All security features in one theme", shell=True)
    subprocess.run("2. **HEA Compliance**: Follows hierarchical encapsulation architecture", shell=True)
    subprocess.run("3. **Reusability**: Security features can be imported as a theme", shell=True)
    subprocess.run("4. **Maintainability**: Single location for all security-related code", shell=True)
    subprocess.run("EOF", shell=True)
    print("=== Security Features Successfully Merged ===")
    print("")
    print("Next steps:")
    print("1. Update imports in other files to use the theme path")
    print("2. Test the integrated security features")
    print("3. Remove the redundant /security folder")
    print("")
    print("Documentation created at: $SECURITY_THEME/docs/SECURITY_MIGRATION.md")

if __name__ == "__main__":
    main()