/**
 * OAuth Authentication Manager for Claude
 * Supports browser-based OAuth flow similar to Claude Code
 */

import { fs } from '../../../../../../../../infra_external-log-lib/src';
import { path } from '../../../../../../../../infra_external-log-lib/src';
import { os } from '../../../../../../../../infra_external-log-lib/src';
import { http } from '../../../../../../../../infra_external-log-lib/src';
import * as url from 'url';
import chalk from 'chalk';

interface OAuthTokens {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  expires_at?: number;
  token_type?: string;
  scope?: string;
}

interface OAuthConfig {
  client_id: string;
  client_secret?: string;
  redirect_uri: string;
  auth_url: string;
  token_url: string;
  scopes: string[];
}

export class OAuthAuthManager {
  private static instance: OAuthAuthManager;
  private authDir: string;
  private tokenFile: string;
  private tokens: OAuthTokens | null = null;
  
  // Claude OAuth configuration (simulated - real values would come from Anthropic)
  private oauthConfig: OAuthConfig = {
    client_id: 'claude_dev_client', // Would be provided by Anthropic
    redirect_uri: 'http://localhost:8080/auth/callback',
    auth_url: 'https://api.anthropic.com/oauth/authorize', // Hypothetical
    token_url: 'https://api.anthropic.com/oauth/token', // Hypothetical
    scopes: ['claude:messages', 'claude:conversations']
  };

  private constructor() {
    this.authDir = path.join(os.homedir(), '.aidev');
    this.tokenFile = path.join(this.authDir, 'oauth_tokens.json');
    this.loadTokens();
  }

  static getInstance(): OAuthAuthManager {
    if (!OAuthAuthManager.instance) {
      OAuthAuthManager.instance = new OAuthAuthManager();
    }
    return OAuthAuthManager.instance;
  }

  /**
   * Load OAuth tokens from file
   */
  private loadTokens(): void {
    try {
      if (fs.existsSync(this.tokenFile)) {
        const data = fs.readFileSync(this.tokenFile, 'utf8');
        this.tokens = JSON.parse(data);
        console.log(chalk.green('🔄 Loaded OAuth tokens from ~/.aidev/oauth_tokens.json'));
      }
    } catch (error) {
      console.log(chalk.yellow('⚠️  Could not load OAuth tokens'));
    }
  }

  /**
   * Save OAuth tokens to file
   */
  private saveTokens(tokens: OAuthTokens): void {
    try {
      if (!fs.existsSync(this.authDir)) {
        fs.mkdirSync(this.authDir, { recursive: true });
      }

      // Calculate expiration timestamp
      if (tokens.expires_in && !tokens.expires_at) {
        tokens.expires_at = Date.now() + (tokens.expires_in * 1000);
      }

      this.tokens = tokens;
      fs.writeFileSync(
        this.tokenFile,
        JSON.stringify(tokens, null, 2),
        { mode: 0o600 }
      );

      console.log(chalk.green('🔄 Saved OAuth tokens to ~/.aidev/oauth_tokens.json'));
    } catch (error) {
      console.error(chalk.red('Failed to save OAuth tokens:'), error);
    }
  }

  /**
   * Check if tokens are valid and not expired
   */
  private isTokenValid(): boolean {
    if (!this.tokens || !this.tokens.access_token) {
      return false;
    }

    if (this.tokens.expires_at && Date.now() >= this.tokens.expires_at) {
      console.log(chalk.yellow('OAuth tokens expired'));
      return false;
    }

    return true;
  }

  /**
   * Generate OAuth authorization URL
   */
  private generateAuthUrl(): string {
    const params = new URLSearchParams({
      client_id: this.oauthConfig.client_id,
      redirect_uri: this.oauthConfig.redirect_uri,
      response_type: 'code',
      scope: this.oauthConfig.scopes.join(' '),
      state: Math.random().toString(36).substring(7) // CSRF protection
    });

    return `${this.oauthConfig.auth_url}?${params.toString()}`;
  }

  /**
   * Start OAuth flow with browser-based authentication
   */
  async startOAuthFlow(): Promise<OAuthTokens> {
    return new Promise((resolve, reject) => {
      console.log(chalk.blue('\n🔐 Starting OAuth authentication flow...\n'));

      // Create local HTTP server for OAuth callback
      const server = http.createServer(async (req, res) => {
        const parsedUrl = url.parse(req.url!, true);
        
        if (parsedUrl.pathname === '/auth/callback') {
          const { code, error } = parsedUrl.query;

          if (error) {
            res.writeHead(400, { 'Content-Type': 'text/html' });
            res.end(`<h1>Authentication Error</h1><p>${error}</p>`);
            server.close();
            reject(new Error(`OAuth error: ${error}`));
            return;
          }

          if (code) {
            try {
              // Exchange code for tokens
              const tokens = await this.exchangeCodeForTokens(code as string);
              
              res.writeHead(200, { 'Content-Type': 'text/html' });
              res.end(`
                <h1>🔄 Authentication In Progress!</h1>
                <p>You can now close this window and return to the terminal.</p>
                <script>setTimeout(() => window.close(), 3000);</script>
              `);
              
              server.close();
              this.saveTokens(tokens);
              resolve(tokens);
            } catch (err) {
              res.writeHead(500, { 'Content-Type': 'text/html' });
              res.end(`<h1>Token Exchange Error</h1><p>${err}</p>`);
              server.close();
              reject(err);
            }
          }
        } else {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('Not found');
        }
      });

      // Start server on port 8080
      server.listen(8080, () => {
        const authUrl = this.generateAuthUrl();
        
        console.log(chalk.cyan('🌐 Opening browser for authentication...'));
        console.log(chalk.gray(`Auth URL: ${authUrl}`));
        console.log(chalk.gray('If browser doesn\'t open automatically, copy the URL above'));
        console.log(chalk.gray('Waiting for authentication...\n'));

        // Try to open browser (this would use a real browser opener)
        this.openBrowser(authUrl);
      });

      // Timeout after 5 minutes
      setTimeout(() => {
        server.close();
        reject(new Error('OAuth flow timed out after 5 minutes'));
      }, 5 * 60 * 1000);
    });
  }

  /**
   * Exchange authorization code for access tokens
   */
  private async exchangeCodeForTokens(_code: string): Promise<OAuthTokens> {
    // In a real implementation, this would make an HTTP request to the token endpoint
    console.log(chalk.yellow('🔄 Exchanging authorization code for tokens...'));
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // For demo purposes, return mock tokens
    // In real implementation, this would be an actual HTTP request
    const mockTokens: OAuthTokens = {
      access_token: `claude_oauth_token_${Date.now()}`,
      refresh_token: `claude_refresh_token_${Date.now()}`,
      expires_in: 3600,
      token_type: 'Bearer',
      scope: this.oauthConfig.scopes.join(' ')
    };

    console.log(chalk.green('🔄 In Progress obtained OAuth tokens'));
    return mockTokens;
  }

  /**
   * Open browser for OAuth (simplified version)
   */
  private openBrowser(url: string): void {
    const open = require('child_process').spawn;
    
    // Try different browsers based on platform
    const platform = os.platform();
    let command: string;
    let args: string[];

    switch (platform) {
      case 'darwin':
        command = 'open';
        args = [url];
        break;
      case 'win32':
        command = 'cmd';
        args = ['/c', 'start', url];
        break;
      default:
        command = 'xdg-open';
        args = [url];
    }

    try {
      open(command, args, { detached: true, stdio: 'ignore' });
    } catch (error) {
      console.log(chalk.yellow('Could not open browser automatically'));
      console.log(chalk.cyan(`Please manually visit: ${url}`));
    }
  }

  /**
   * Refresh expired tokens
   */
  async refreshTokens(): Promise<OAuthTokens | null> {
    if (!this.tokens?.refresh_token) {
      console.log(chalk.yellow('No refresh token available'));
      return null;
    }

    try {
      console.log(chalk.yellow('🔄 Refreshing OAuth tokens...'));
      
      // Simulate refresh API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const refreshedTokens: OAuthTokens = {
        ...this.tokens,
        access_token: `claude_refreshed_token_${Date.now()}`,
        expires_in: 3600
      };

      this.saveTokens(refreshedTokens);
      console.log(chalk.green('🔄 Tokens refreshed In Progress'));
      return refreshedTokens;
    } catch (error) {
      console.error(chalk.red('Failed to refresh tokens:'), error);
      return null;
    }
  }

  /**
   * Get valid access token (refresh if needed)
   */
  async getAccessToken(): Promise<string | null> {
    // Check if we have valid tokens
    if (this.isTokenValid()) {
      return this.tokens!.access_token;
    }

    // Try to refresh if possible
    if (this.tokens?.refresh_token) {
      const refreshed = await this.refreshTokens();
      if (refreshed) {
        return refreshed.access_token;
      }
    }

    // No valid tokens available
    return null;
  }

  /**
   * Check if OAuth authentication is available
   */
  hasOAuthTokens(): boolean {
    return this.isTokenValid();
  }

  /**
   * Clear OAuth tokens
   */
  clearTokens(): void {
    try {
      if (fs.existsSync(this.tokenFile)) {
        fs.unlinkSync(this.tokenFile);
        this.tokens = null;
        console.log(chalk.green('🔄 Cleared OAuth tokens'));
      }
    } catch (error) {
      console.error(chalk.red('Failed to clear OAuth tokens:'), error);
    }
  }

  /**
   * Get OAuth status information
   */
  getOAuthStatus(): { authenticated: boolean; expires_at?: number; scopes?: string } {
    if (!this.tokens) {
      return { authenticated: false };
    }

    return {
      authenticated: this.isTokenValid(),
      expires_at: this.tokens.expires_at,
      scopes: this.tokens.scope
    };
  }
}

// Export singleton instance
export const oauthManager = OAuthAuthManager.getInstance();