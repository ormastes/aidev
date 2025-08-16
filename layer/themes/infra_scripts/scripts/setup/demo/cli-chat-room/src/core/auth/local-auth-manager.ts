/**
 * Local Authentication Manager
 * Manages shared authentication credentials for local development
 */

import { fs } from '../../../../../../../../infra_external-log-lib/src';
import { path } from '../../../../../../../../infra_external-log-lib/src';
import { os } from '../../../../../../../../infra_external-log-lib/src';
import chalk from 'chalk';
import { oauthManager } from './oauth-auth-manager';
import { sessionManager } from './session-auth-manager';

export interface AuthCredentials {
  anthropicApiKey?: string;
  openaiApiKey?: string;
  googleApiKey?: string;
  azureApiKey?: string;
  customKeys?: Record<string, string>;
  lastUpdated: Date;
}

export enum AuthMethod {
  API_KEY = 'api_key',
  OAUTH = 'oauth',
  SESSION = 'session',
  CLAUDE_DESKTOP = 'claude_desktop'
}

export class LocalAuthManager {
  private static instance: LocalAuthManager;
  private authDir: string;
  private authFile: string;
  private credentials: AuthCredentials | null = null;

  private constructor() {
    // Store auth in user's home directory
    this.authDir = path.join(os.homedir(), '.aidev');
    this.authFile = path.join(this.authDir, 'auth.json');
    this.loadCredentials();
  }

  static getInstance(): LocalAuthManager {
    if (!LocalAuthManager.instance) {
      LocalAuthManager.instance = new LocalAuthManager();
    }
    return LocalAuthManager.instance;
  }

  /**
   * Load credentials from local file
   */
  private loadCredentials(): void {
    try {
      if (fs.existsSync(this.authFile)) {
        const data = fs.readFileSync(this.authFile, 'utf8');
        this.credentials = JSON.parse(data);
        console.log(chalk.green('🔄 Loaded shared authentication from ~/.aidev/auth.json'));
      }
    } catch (error) {
      console.log(chalk.yellow('⚠️  Could not load shared authentication'));
    }
  }

  /**
   * Save credentials to local file
   */
  saveCredentials(credentials: Partial<AuthCredentials>): void {
    try {
      // Ensure directory exists
      if (!fs.existsSync(this.authDir)) {
        fs.mkdirSync(this.authDir, { recursive: true });
      }

      // Merge with existing credentials
      this.credentials = {
        ...this.credentials,
        ...credentials,
        lastUpdated: new Date()
      };

      // Save to file with restricted permissions
      fs.writeFileSync(
        this.authFile,
        JSON.stringify(this.credentials, null, 2),
        { mode: 0o600 } // Read/write for owner only
      );

      console.log(chalk.green('🔄 Saved authentication to ~/.aidev/auth.json'));
    } catch (error) {
      console.error(chalk.red('Failed to save credentials:'), error);
    }
  }

  /**
   * Get Anthropic authentication from various sources
   * Returns both the auth token/key and the method used
   */
  async getAnthropicAuth(): Promise<{ token: string; method: AuthMethod } | null> {
    // Priority order:
    // 1. Environment variable (API key)
    // 2. OAuth tokens
    // 3. Session cookies
    // 4. Shared local auth (API key)
    // 5. Claude desktop app config
    
    // Check environment variable
    if (process.env.ANTHROPIC_API_KEY) {
      console.log(chalk.blue('Using API key from environment variable'));
      return { 
        token: process.env.ANTHROPIC_API_KEY, 
        method: AuthMethod.API_KEY 
      };
    }

    // Check OAuth tokens
    const oauthToken = await oauthManager.getAccessToken();
    if (oauthToken) {
      console.log(chalk.blue('Using OAuth token from ~/.aidev/oauth_tokens.json'));
      return { 
        token: oauthToken, 
        method: AuthMethod.OAUTH 
      };
    }

    // Check session cookies
    const sessionCookies = sessionManager.getCookieHeader();
    if (sessionCookies) {
      console.log(chalk.blue('Using session cookies from ~/.aidev/claude_session.json'));
      return { 
        token: sessionCookies, 
        method: AuthMethod.SESSION 
      };
    }

    // Check shared auth (API key)
    if (this.credentials?.anthropicApiKey) {
      console.log(chalk.blue('Using shared Anthropic API key from ~/.aidev/auth.json'));
      return { 
        token: this.credentials.anthropicApiKey, 
        method: AuthMethod.API_KEY 
      };
    }

    // Check Claude desktop app config
    const claudeKey = this.getClaudeDesktopApiKey();
    if (claudeKey) {
      console.log(chalk.blue('Using API key from Claude desktop app'));
      return { 
        token: claudeKey, 
        method: AuthMethod.CLAUDE_DESKTOP 
      };
    }

    return null;
  }

  /**
   * Get Anthropic API key from various sources (backward compatibility)
   */
  getAnthropicApiKey(): string | undefined {
    // For backward compatibility, return only API keys
    if (process.env.ANTHROPIC_API_KEY) {
      return process.env.ANTHROPIC_API_KEY;
    }

    if (this.credentials?.anthropicApiKey) {
      console.log(chalk.blue('Using shared Anthropic API key from ~/.aidev/auth.json'));
      return this.credentials.anthropicApiKey;
    }

    const claudeKey = this.getClaudeDesktopApiKey();
    if (claudeKey) {
      console.log(chalk.blue('Using API key from Claude desktop app'));
      return claudeKey;
    }

    return undefined;
  }

  /**
   * Try to get API key from Claude desktop app
   */
  private getClaudeDesktopApiKey(): string | undefined {
    try {
      // Common Claude desktop config locations
      const configPaths = [
        path.join(os.homedir(), '.config', 'claude', 'config.json'),
        path.join(os.homedir(), 'Library', 'Application Support', 'Claude', 'config.json'),
        path.join(os.homedir(), 'AppData', 'Roaming', 'Claude', 'config.json')
      ];

      for (const configPath of configPaths) {
        if (fs.existsSync(configPath)) {
          const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
          if (config.apiKey || config.anthropicApiKey) {
            return config.apiKey || config.anthropicApiKey;
          }
        }
      }
    } catch (error) {
      // Silently fail - Claude desktop might not be installed
    }

    return undefined;
  }

  /**
   * Set Anthropic API key
   */
  setAnthropicApiKey(apiKey: string): void {
    this.saveCredentials({ anthropicApiKey: apiKey });
  }

  /**
   * Get all credentials
   */
  getCredentials(): AuthCredentials | null {
    return this.credentials;
  }

  /**
   * Clear all credentials
   */
  clearCredentials(): void {
    try {
      if (fs.existsSync(this.authFile)) {
        fs.unlinkSync(this.authFile);
        this.credentials = null;
        console.log(chalk.green('🔄 Cleared shared authentication'));
      }
    } catch (error) {
      console.error(chalk.red('Failed to clear credentials:'), error);
    }
  }

  /**
   * Check if any authentication is available
   */
  hasAuthentication(): boolean {
    return !!this.getAnthropicApiKey();
  }

  /**
   * Setup authentication interactively with multiple options
   */
  async setupAuth(): Promise<void> {
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });

    console.log(chalk.blue('\n🔐 Setting up shared authentication\n'));
    console.log(chalk.cyan('Choose authentication method:'));
    console.log(chalk.gray('1. API Key (traditional method)'));
    console.log(chalk.gray('2. OAuth (browser-based login)'));
    console.log(chalk.gray('3. Session Cookies (extract from browser)'));
    console.log(chalk.gray('4. Skip setup'));
    console.log();

    const choice = await new Promise<string>((resolve) => {
      readline.question('Select option (1-4): ', resolve);
    });

    switch (choice) {
      case '1':
        await this.setupApiKeyAuth(readline);
        break;
      case '2':
        await this.setupOAuthAuth(readline);
        break;
      case '3':
        await this.setupSessionAuth(readline);
        break;
      default:
        console.log(chalk.yellow('\n⚠️  Skipped authentication setup. Running in demo mode.'));
    }

    readline.close();
  }

  /**
   * Setup API key authentication
   */
  private async setupApiKeyAuth(readline: any): Promise<void> {
    console.log(chalk.blue('\n🔑 API Key Authentication Setup'));
    console.log(chalk.gray('Get your API key from: https://console.anthropic.com\n'));

    const apiKey = await new Promise<string>((resolve) => {
      readline.question('Enter your Anthropic API key (or press Enter to skip): ', resolve);
    });

    if (apiKey) {
      this.setAnthropicApiKey(apiKey);
      console.log(chalk.green('\n🔄 API key saved! It will be shared across all local AI dev tools.'));
    } else {
      console.log(chalk.yellow('\n⚠️  Skipped API key setup.'));
    }
  }

  /**
   * Setup OAuth authentication
   */
  private async setupOAuthAuth(readline: any): Promise<void> {
    console.log(chalk.blue('\n🌐 OAuth Authentication Setup'));
    console.log(chalk.gray('This will open a browser window for secure login\n'));

    const confirm = await new Promise<string>((resolve) => {
      readline.question('Start OAuth flow? (y/N): ', resolve);
    });

    if (confirm.toLowerCase() === 'y' || confirm.toLowerCase() === 'yes') {
      try {
        await oauthManager.startOAuthFlow();
        console.log(chalk.green('\n🔄 OAuth authentication configured In Progress!'));
        console.log(chalk.gray('Tokens are securely stored in ~/.aidev/oauth_tokens.json'));
      } catch (error) {
        console.error(chalk.red('\n❌ OAuth setup failed:'), error);
        console.log(chalk.yellow('You can try again later with: claude-auth setup'));
      }
    } else {
      console.log(chalk.yellow('\n⚠️  Skipped OAuth setup.'));
    }
  }

  /**
   * Setup session authentication
   */
  private async setupSessionAuth(readline: any): Promise<void> {
    console.log(chalk.blue('\n🍪 Session Authentication Setup'));
    console.log(chalk.gray('This will extract your Claude.ai login session from browser\n'));

    const confirm = await new Promise<string>((resolve) => {
      readline.question('Extract session cookies from browser? (y/N): ', resolve);
    });

    if (confirm.toLowerCase() === 'y' || confirm.toLowerCase() === 'yes') {
      try {
        await sessionManager.setupSessionAuth();
      } catch (error) {
        console.error(chalk.red('\n❌ Session setup failed:'), error);
        console.log(chalk.yellow('You can try again later with: claude-auth setup'));
      }
    } else {
      console.log(chalk.yellow('\n⚠️  Skipped session setup.'));
    }
  }
}

// Export singleton instance
export const authManager = LocalAuthManager.getInstance();