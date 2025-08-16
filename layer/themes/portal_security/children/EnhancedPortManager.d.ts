import { Server } from 'net';
export type DeployType = 'local' | 'dev' | 'demo' | 'release' | 'production';
export type AppType = 'predefined' | 'dynamic';
export interface AppRegistration {
    appId: string;
    appName: string;
    type: AppType;
    deployType: DeployType;
    assignedPort?: number;
    requestedPort?: number;
    ipAddress?: string;
    pid?: number;
    startTime?: Date;
    status: 'registered' | 'active' | 'inactive' | 'blocked';
}
export interface PortRange {
    deployType: DeployType;
    prefix: number;
    start: number;
    end: number;
}
/**
 * EnhancedPortManager - Central authority for ALL port allocations
 * No web theme can open a port without going through this manager
 */
export declare class EnhancedPortManager {
    private static instance;
    private registrations;
    private activePorts;
    private portRanges;
    private predefinedApps;
    private configFile;
    private originalListen;
    private interceptActive;
    private constructor();
    static getInstance(): EnhancedPortManager;
    /**
     * Register an app and get assigned port
     * This is THE ONLY WAY to get a port
     */
    registerApp(options: {
        appId: string;
        deployType: DeployType;
        requestedPort?: number;
        ipAddress?: string;
    }): {
        success: boolean;
        port?: number;
        message?: string;
    };
    /**
     * Get port for predefined app
     */
    private getPortForPredefined;
    /**
     * Get next available port for dynamic apps
     */
    private getNextAvailablePort;
    /**
     * Check if port is available
     */
    private isPortAvailable;
    /**
     * Check if port is actually in use on the network
     */
    private isPortInUse;
    /**
     * Intercept ALL port binding attempts
     * This is the enforcement mechanism
     */
    private interceptPortBinding;
    /**
     * Extract port from listen() arguments
     */
    private extractPort;
    /**
     * Open port for web theme (mandatory API)
     * ALL web themes MUST use this method
     */
    openPort(appId: string, deployType: DeployType, options?: {
        requestedPort?: number;
        ipAddress?: string;
    }): Promise<Server>;
    /**
     * Update app registration if port manager doesn't like current setup
     */
    updateRegistration(appId: string, deployType: DeployType, newPort?: number): boolean;
    /**
     * Get all registrations
     */
    getAllRegistrations(): AppRegistration[];
    /**
     * Get active ports
     */
    getActivePorts(): Map<number, AppRegistration>;
    /**
     * Log security violation
     */
    private logViolation;
    /**
     * Save configuration to disk
     */
    private saveConfiguration;
    /**
     * Load configuration from disk
     */
    private loadConfiguration;
    /**
     * Generate report of port usage
     */
    generateReport(): string;
}
//# sourceMappingURL=EnhancedPortManager.d.ts.map