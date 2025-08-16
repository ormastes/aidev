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
