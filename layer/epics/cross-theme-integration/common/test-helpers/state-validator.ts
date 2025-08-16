/**
 * State validation utility for cross-theme integration tests
 * Ensures state consistency across theme boundaries
 */

export interface StateSnapshot {
  timestamp: number;
  theme: string;
  state: Record<string, any>;
}

export interface StateValidationRule {
  name: string;
  validate: (snapshots: StateSnapshot[]) => boolean;
  errorMessage?: string;
}

export class StateValidator {
  private snapshots: StateSnapshot[] = [];
  private rules: StateValidationRule[] = [];
  
  /**
   * Capture state snapshot from a theme
   */
  captureState(theme: string, state: Record<string, any>): void {
    this.snapshots.push({
      timestamp: Date.now(),
      theme,
      state: JSON.parse(JSON.stringify(state)) // Deep clone
    });
  }
  
  /**
   * Add validation rule
   */
  addRule(rule: StateValidationRule): void {
    this.rules.push(rule);
  }
  
  /**
   * Validate all rules
   */
  validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    for (const rule of this.rules) {
      try {
        if (!rule.validate(this.snapshots)) {
          errors.push(rule.errorMessage || `Validation failed: ${rule.name}`);
        }
      } catch (error) {
        errors.push(`Rule '${rule.name}' threw error: ${error}`);
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Get snapshots for a specific theme
   */
  getSnapshotsForTheme(theme: string): StateSnapshot[] {
    return this.snapshots.filter(s => s.theme === theme);
  }
  
  /**
   * Get latest snapshot for a theme
   */
  getLatestSnapshot(theme: string): StateSnapshot | undefined {
    const themeSnapshots = this.getSnapshotsForTheme(theme);
    return themeSnapshots[themeSnapshots.length - 1];
  }
  
  /**
   * Compare states between themes
   */
  compareStates(theme1: string, theme2: string, path: string): boolean {
    const snapshot1 = this.getLatestSnapshot(theme1);
    const snapshot2 = this.getLatestSnapshot(theme2);
    
    if (!snapshot1 || !snapshot2) return false;
    
    const value1 = this.getValueAtPath(snapshot1.state, path);
    const value2 = this.getValueAtPath(snapshot2.state, path);
    
    return JSON.stringify(value1) === JSON.stringify(value2);
  }
  
  /**
   * Clear all snapshots
   */
  clear(): void {
    this.snapshots = [];
  }
  
  /**
   * Get value at path in object
   */
  private getValueAtPath(obj: any, path: string): any {
    const parts = path.split('.');
    let current = obj;
    
    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return undefined;
      }
    }
    
    return current;
  }
  
  /**
   * Generate state timeline report
   */
  getTimeline(): string {
    const timeline: string[] = ['State Timeline:'];
    
    this.snapshots.forEach((snapshot, index) => {
      const prev = index > 0 ? this.snapshots[index - 1] : null;
      const delay = prev ? snapshot.timestamp - prev.timestamp : 0;
      timeline.push(`[${delay}ms] ${snapshot.theme}: ${JSON.stringify(snapshot.state)}`);
    });
    
    return timeline.join('\n');
  }
}

// Common validation rules
export const commonRules = {
  userIdConsistency: {
    name: 'User ID Consistency',
    validate: (snapshots: StateSnapshot[]) => {
      const userIds = new Set<string>();
      
      for (const snapshot of snapshots) {
        if (snapshot.state.userId) {
          userIds.add(snapshot.state.userId);
        }
      }
      
      return userIds.size <= 1; // All themes should have same user ID
    },
    errorMessage: 'User ID is not consistent across themes'
  },
  
  sessionConsistency: {
    name: 'Session Consistency',
    validate: (snapshots: StateSnapshot[]) => {
      const sessions = new Set<string>();
      
      for (const snapshot of snapshots) {
        if (snapshot.state.sessionId) {
          sessions.add(snapshot.state.sessionId);
        }
      }
      
      return sessions.size <= 1; // All themes should share same session
    },
    errorMessage: 'Session ID is not consistent across themes'
  },
  
  dataIntegrity: {
    name: 'Data Integrity',
    validate: (snapshots: StateSnapshot[]) => {
      // Check that data is not corrupted during propagation
      for (const snapshot of snapshots) {
        if (snapshot.state.data && typeof snapshot.state.data === 'object') {
          try {
            JSON.stringify(snapshot.state.data);
          } catch {
            return false; // Data is not serializable
          }
        }
      }
      return true;
    },
    errorMessage: 'Data integrity check failed'
  }
};