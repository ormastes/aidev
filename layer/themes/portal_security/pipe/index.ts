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
