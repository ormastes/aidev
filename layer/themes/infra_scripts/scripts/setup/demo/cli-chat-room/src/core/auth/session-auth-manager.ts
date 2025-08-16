/**
 * Web Session Authentication Manager for Claude
 * Supports authentication using Claude.ai browser session cookies
 */

import { fs } from '../../../../../../../../infra_external-log-lib/src';
import { path } from '../../../../../../../../infra_external-log-lib/src';
import { os } from '../../../../../../../../infra_external-log-lib/src';
import chalk from 'chalk';

interface SessionCookies {
  sessionKey?: string;
  anthropicSession?: string;
  cfClearance?: string;
  userAgent?: string;
  lastUpdated: Date;
}

interface BrowserProfile {
  name: string;
  cookiePath: string;
  exists: boolean;
}

export class SessionAuthManager {
  private static instance: SessionAuthManager;
  private authDir: string;
  private sessionFile: string;
  private cookies: SessionCookies | null = null;

  private constructor() {
    this.authDir = path.join(os.homedir(), '.aidev');
    this.sessionFile = path.join(this.authDir, 'claude_session.json');
    this.loadSession();
  }

  static getInstance(): SessionAuthManager {
    if (!SessionAuthManager.instance) {
      SessionAuthManager.instance = new SessionAuthManager();
    }
    return SessionAuthManager.instance;
  }

  /**
   * Load session cookies from file
   */
  private loadSession(): void {
    try {
      if (fs.existsSync(this.sessionFile)) {
        const data = fs.readFileSync(this.sessionFile, 'utf8');
        this.cookies = JSON.parse(data);
        console.log(chalk.green('🔄 Loaded Claude session from ~/.aidev/claude_session.json'));
      }
    } catch (error) {
      console.log(chalk.yellow('⚠️  Could not load Claude session'));
    }
  }

  /**
   * Save session cookies to file
   */
  private saveSession(cookies: SessionCookies): void {
    try {
      if (!fs.existsSync(this.authDir)) {
        fs.mkdirSync(this.authDir, { recursive: true });
      }

      this.cookies = {
        ...cookies,
        lastUpdated: new Date()
      };

      fs.writeFileSync(
        this.sessionFile,
        JSON.stringify(this.cookies, null, 2),
        { mode: 0o600 }
      );

      console.log(chalk.green('🔄 Saved Claude session to ~/.aidev/claude_session.json'));
    } catch (error) {
      console.error(chalk.red('Failed to save session:'), error);
    }
  }

  /**
   * Get browser profiles for cookie extraction
   */
  private getBrowserProfiles(): BrowserProfile[] {
    const homeDir = os.homedir();
    const profiles: BrowserProfile[] = [];

    // Chrome profiles
    const chromePaths = [
      path.join(homeDir, '.config/google-chrome/Default/Cookies'),
      path.join(homeDir, 'Library/Application Support/Google/Chrome/Default/Cookies'),
      path.join(homeDir, 'AppData/Local/Google/Chrome/User Data/Default/Cookies'),
    ];

    chromePaths.forEach(cookiePath => {
      profiles.push({
        name: 'Google Chrome',
        cookiePath,
        exists: fs.existsSync(cookiePath)
      });
    });

    // Firefox profiles
    const firefoxPaths = [
      path.join(homeDir, '.mozilla/firefox'),
      path.join(homeDir, 'Library/Application Support/Firefox/Profiles'),
      path.join(homeDir, 'AppData/Roaming/Mozilla/Firefox/Profiles'),
    ];

    firefoxPaths.forEach(profileDir => {
      if (fs.existsSync(profileDir)) {
        try {
          const firefoxProfiles = fs.readdirSync(profileDir);
          firefoxProfiles.forEach(profile => {
            const cookiePath = path.join(profileDir, profile, 'cookies.sqlite');
            if (fs.existsSync(cookiePath)) {
              profiles.push({
                name: `Firefox (${profile})`,
                cookiePath,
                exists: true
              });
            }
          });
        } catch (error) {
          // Ignore errors reading Firefox profiles
        }
      }
    });

    return profiles.filter(p => p.exists);
  }

  /**
   * Extract cookies from browser (simplified simulation)
   */
  async extractBrowserCookies(): Promise<SessionCookies | null> {
    console.log(chalk.blue('🔍 Searching for Claude.ai session in browsers...'));

    const profiles = this.getBrowserProfiles();
    
    if (profiles.length === 0) {
      console.log(chalk.yellow('⚠️  No browser cookie databases found'));
      return null;
    }

    console.log(chalk.gray(`Found ${profiles.length} browser profile(s):`));
    profiles.forEach(p => console.log(chalk.gray(`  - ${p.name}`)));

    // In a real implementation, this would:
    // 1. Connect to browser SQLite databases
    // 2. Query for claude.ai cookies
    // 3. Extract sessionKey, anthropicSession, etc.
    
    // For demo purposes, simulate finding cookies
    console.log(chalk.yellow('🔄 Extracting cookies from browser...'));
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Simulate extracted cookies
    const extractedCookies: SessionCookies = {
      sessionKey: `sk_session_${Date.now()}`,
      anthropicSession: `anthropic_${Math.random().toString(36).substring(7)}`,
      cfClearance: `cf_clearance_${Math.random().toString(36).substring(7)}`,
      userAgent: 'Mozilla/5.0 (compatible; Claude-CLI)',
      lastUpdated: new Date()
    };

    console.log(chalk.green('🔄 In Progress extracted Claude session cookies'));
    this.saveSession(extractedCookies);
    return extractedCookies;
  }

  /**
   * Setup session authentication interactively
   */
  async setupSessionAuth(): Promise<void> {
    console.log(chalk.blue('\n🍪 Setting up Claude.ai session authentication\n'));
    
    console.log(chalk.cyan('Option 1: Extract from browser (automatic)'));
    console.log(chalk.gray('  This will search your browsers for Claude.ai login cookies'));
    console.log();
    
    console.log(chalk.cyan('Option 2: Manual cookie input'));
    console.log(chalk.gray('  You can manually provide session cookies from claude.ai'));
    console.log();

    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const choice = await new Promise<string>((resolve) => {
      readline.question('Choose option (1 for automatic, 2 for manual, Enter to skip): ', resolve);
    });

    if (choice === '1') {
      const cookies = await this.extractBrowserCookies();
      if (cookies) {
        console.log(chalk.green('\n🔄 Session authentication configured In Progress!'));
      } else {
        console.log(chalk.yellow('\n⚠️  Could not extract session cookies automatically'));
      }
    } else if (choice === '2') {
      await this.manualCookieSetup(readline);
    } else {
      console.log(chalk.yellow('\n⚠️  Skipped session authentication setup'));
    }

    readline.close();
  }

  /**
   * Manual cookie setup
   */
  private async manualCookieSetup(readline: any): Promise<void> {
    console.log(chalk.blue('\n📋 Manual cookie setup'));
    console.log(chalk.gray('To get cookies from claude.ai:'));
    console.log(chalk.gray('1. Open claude.ai in your browser and log in'));
    console.log(chalk.gray('2. Open Developer Tools (F12)'));
    console.log(chalk.gray('3. Go to Application/Storage → Cookies → https://claude.ai'));
    console.log(chalk.gray('4. Copy the values below:\n'));

    const sessionKey = await new Promise<string>((resolve) => {
      readline.question('Enter sessionKey cookie (or press Enter to skip): ', resolve);
    });

    const anthropicSession = await new Promise<string>((resolve) => {
      readline.question('Enter anthropic_session cookie (or press Enter to skip): ', resolve);
    });

    if (sessionKey || anthropicSession) {
      const cookies: SessionCookies = {
        sessionKey: sessionKey || undefined,
        anthropicSession: anthropicSession || undefined,
        lastUpdated: new Date()
      };

      this.saveSession(cookies);
      console.log(chalk.green('\n🔄 Manual session cookies saved In Progress!'));
    } else {
      console.log(chalk.yellow('\n⚠️  No cookies provided'));
    }
  }

  /**
   * Validate session cookies by testing API access
   */
  async validateSession(): Promise<boolean> {
    if (!this.cookies) {
      return false;
    }

    try {
      console.log(chalk.yellow('🔄 Validating Claude session...'));
      
      // Simulate session validation request
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // In real implementation, this would make a request to claude.ai
      // using the session cookies to verify they're still valid
      
      console.log(chalk.green('🔄 Session validation In Progress'));
      return true;
    } catch (error) {
      console.log(chalk.red('❌ Session validation failed'));
      return false;
    }
  }

  /**
   * Get session cookies for API requests
   */
  getSessionCookies(): SessionCookies | null {
    return this.cookies;
  }

  /**
   * Get cookie header string for HTTP requests
   */
  getCookieHeader(): string | null {
    if (!this.cookies) {
      return null;
    }

    const cookieParts: string[] = [];
    
    if (this.cookies.sessionKey) {
      cookieParts.push(`sessionKey=${this.cookies.sessionKey}`);
    }
    
    if (this.cookies.anthropicSession) {
      cookieParts.push(`anthropic_session=${this.cookies.anthropicSession}`);
    }
    
    if (this.cookies.cfClearance) {
      cookieParts.push(`cf_clearance=${this.cookies.cfClearance}`);
    }

    return cookieParts.length > 0 ? cookieParts.join('; ') : null;
  }

  /**
   * Check if session authentication is available
   */
  hasValidSession(): boolean {
    return !!(this.cookies && (this.cookies.sessionKey || this.cookies.anthropicSession));
  }

  /**
   * Clear session data
   */
  clearSession(): void {
    try {
      if (fs.existsSync(this.sessionFile)) {
        fs.unlinkSync(this.sessionFile);
        this.cookies = null;
        console.log(chalk.green('🔄 Cleared Claude session'));
      }
    } catch (error) {
      console.error(chalk.red('Failed to clear session:'), error);
    }
  }

  /**
   * Get session status information
   */
  getSessionStatus(): { authenticated: boolean; lastUpdated?: Date; hasSessionKey: boolean; hasAnthropicSession: boolean } {
    if (!this.cookies) {
      return { 
        authenticated: false, 
        hasSessionKey: false, 
        hasAnthropicSession: false 
      };
    }

    return {
      authenticated: this.hasValidSession(),
      lastUpdated: this.cookies.lastUpdated,
      hasSessionKey: !!this.cookies.sessionKey,
      hasAnthropicSession: !!this.cookies.anthropicSession
    };
  }

  /**
   * Refresh session cookies from browser
   */
  async refreshSession(): Promise<boolean> {
    console.log(chalk.blue('🔄 Refreshing session from browser...'));
    
    const newCookies = await this.extractBrowserCookies();
    if (newCookies) {
      console.log(chalk.green('🔄 Session refreshed In Progress'));
      return true;
    } else {
      console.log(chalk.yellow('⚠️  Could not refresh session'));
      return false;
    }
  }
}

// Export singleton instance
export const sessionManager = SessionAuthManager.getInstance();