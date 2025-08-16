#!/usr/bin/env bun
/**
 * Migrated from: merge-security-to-theme.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.742Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  // Merge root security folder into portal_security theme
  await $`set -e`;
  await $`SECURITY_ROOT="security"`;
  await $`SECURITY_THEME="layer/themes/portal_security"`;
  console.log("=== Merging Security Features into portal_security Theme ===");
  // Check if source exists
  if (! -d "$SECURITY_ROOT" ) {; then
  console.log("Security folder not found at root");
  process.exit(1);
  }
  // Move security middleware components to theme
  console.log("Moving security middleware components...");
  await copyFile("-v "$SECURITY_ROOT"/audit-logger.ts "$SECURITY_THEME/children/AuditLogger.ts" 2>/dev/null ||", "true");
  await copyFile("-v "$SECURITY_ROOT"/csrf-protection.ts", ""$SECURITY_THEME/children/CSRFProtection.ts"");
  await copyFile("-v "$SECURITY_ROOT"/rate-limiter-enhanced.ts", ""$SECURITY_THEME/children/RateLimiterEnhanced.ts"");
  await copyFile("-v "$SECURITY_ROOT"/rate-limiter.ts", ""$SECURITY_THEME/children/RateLimiter.ts"");
  await copyFile("-v "$SECURITY_ROOT"/security-headers.ts", ""$SECURITY_THEME/children/SecurityHeaders.ts"");
  await copyFile("-v "$SECURITY_ROOT"/web-security-middleware.ts", ""$SECURITY_THEME/children/WebSecurityMiddleware.ts"");
  // Copy compiled files
  console.log("Copying compiled JavaScript files...");
  for (const file of ["$SECURITY_ROOT"/*.js; do]) {
  if (-f "$file" ) {; then
  await $`basename=$(basename "$file")`;
  await copyFile("-v "$file"", ""$SECURITY_THEME/children/$basename"");
  }
  }
  // Copy map files
  console.log("Copying source map files...");
  for (const file of ["$SECURITY_ROOT"/*.map; do]) {
  if (-f "$file" ) {; then
  await $`basename=$(basename "$file")`;
  await copyFile("-v "$file"", ""$SECURITY_THEME/children/$basename"");
  }
  }
  // Create a consolidated security module index
  await $`cat > "$SECURITY_THEME/children/index.ts" << 'EOF'`;
  await $`/**`;
  await $`* Portal Security Theme - Consolidated Security Module`;
  await $`* Merged from root security folder`;
  await $`*/`;
  // Core security middleware
  await $`export { AuditLogger } from './AuditLogger';`;
  await $`export { CSRFProtection } from './CSRFProtection';`;
  await $`export { RateLimiterEnhanced } from './RateLimiterEnhanced';`;
  await $`export { RateLimiter } from './RateLimiter';`;
  await $`export { SecurityHeaders } from './SecurityHeaders';`;
  await $`export { WebSecurityMiddleware } from './WebSecurityMiddleware';`;
  // Existing portal security components
  await $`export { AuthService } from './AuthService';`;
  await $`export { SessionManager } from './SessionManager';`;
  await $`export { TokenService } from './TokenService';`;
  await $`export { SecurityMiddleware } from './SecurityMiddleware';`;
  await $`export { PortManager } from './PortManager';`;
  await $`export { EnhancedPortManager } from './EnhancedPortManager';`;
  await $`export { CredentialStore } from './CredentialStore';`;
  // Unified security suite
  await $`export class UnifiedSecuritySuite {`;
  await $`static async initializeAll() {`;
  await $`console.log('Initializing unified security suite...');`;
  // Initialize all security components
  await $`}`;
  await $`}`;
  await $`EOF`;
  // Update pipe/index.ts to export all security features
  await $`cat > "$SECURITY_THEME/pipe/index.ts" << 'EOF'`;
  await $`/**`;
  await $`* Portal Security Theme - Pipe Gateway`;
  await $`* Provides cross-layer access to security features`;
  await $`*/`;
  // Re-export all security components
  await $`export * from '../children';`;
  // Convenience security configuration
  process.env.const SecurityConfig  = " {";
  await $`enableCSRF: true,`;
  await $`enableRateLimiting: true,`;
  await $`enableAuditLogging: true,`;
  await $`enableSecurityHeaders: true,`;
  await $`sessionTimeout: 3600000, // 1 hour`;
  await $`tokenExpiry: 86400000, // 24 hours`;
  await $`};`;
  // Quick setup function
  await $`export async function setupSecurity(app: any) {`;
  await $`const {`;
  await $`CSRFProtection,`;
  await $`RateLimiterEnhanced,`;
  await $`SecurityHeaders,`;
  await $`AuditLogger,`;
  await $`WebSecurityMiddleware`;
  await $`} = await import('../children');`;
  // Apply all security middleware
  await $`app.use(new SecurityHeaders().middleware());`;
  await $`app.use(new CSRFProtection().middleware());`;
  await $`app.use(new RateLimiterEnhanced().middleware());`;
  await $`app.use(new AuditLogger().middleware());`;
  await $`app.use(new WebSecurityMiddleware().middleware());`;
  await $`console.log('Security suite initialized');`;
  await $`}`;
  await $`EOF`;
  // Create migration documentation
  await $`cat > "$SECURITY_THEME/docs/SECURITY_MIGRATION.md" << 'EOF'`;
  // Security Migration Documentation
  // # Overview
  await $`The security features have been migrated from the root `/security` folder to the `portal_security` theme.`;
  // # Migration Changes
  // ## File Relocations
  await $`- `/security/audit-logger.ts` → `/layer/themes/portal_security/children/AuditLogger.ts``;
  await $`- `/security/csrf-protection.ts` → `/layer/themes/portal_security/children/CSRFProtection.ts``;
  await $`- `/security/rate-limiter-enhanced.ts` → `/layer/themes/portal_security/children/RateLimiterEnhanced.ts``;
  await $`- `/security/rate-limiter.ts` → `/layer/themes/portal_security/children/RateLimiter.ts``;
  await $`- `/security/security-headers.ts` → `/layer/themes/portal_security/children/SecurityHeaders.ts``;
  await $`- `/security/web-security-middleware.ts` → `/layer/themes/portal_security/children/WebSecurityMiddleware.ts``;
  // ## Import Updates
  await $`Update your imports from:`;
  await $````typescript`;
  await $`import { AuditLogger } from '../../security/audit-logger';`;
  await $`````;
  await $`To:`;
  await $````typescript`;
  await $`import { AuditLogger } from '../../layer/themes/portal_security/pipe';`;
  await $`````;
  // ## Using the Unified Security Suite
  await $````typescript`;
  await $`import { setupSecurity } from '../../layer/themes/portal_security/pipe';`;
  // Quick setup for Express app
  await $`await setupSecurity(app);`;
  await $`````;
  // # Benefits
  await $`1. **Centralized Security**: All security features in one theme`;
  await $`2. **HEA Compliance**: Follows hierarchical encapsulation architecture`;
  await $`3. **Reusability**: Security features can be imported as a theme`;
  await $`4. **Maintainability**: Single location for all security-related code`;
  await $`EOF`;
  console.log("=== Security Features Successfully Merged ===");
  console.log("");
  console.log("Next steps:");
  console.log("1. Update imports in other files to use the theme path");
  console.log("2. Test the integrated security features");
  console.log("3. Remove the redundant /security folder");
  console.log("");
  console.log("Documentation created at: $SECURITY_THEME/docs/SECURITY_MIGRATION.md");
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}