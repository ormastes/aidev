#!/usr/bin/env node

/**
 * Claude Authentication CLI
 * Manage shared authentication for Claude AI across local development tools
 */

import chalk from 'chalk';
import { authManager, AuthMethod } from '../auth/local-auth-manager';
import { oauthManager } from '../auth/oauth-auth-manager';
import { sessionManager } from '../auth/session-auth-manager';

const args = process.argv.slice(2);
const command = args[0];

async function main() {
  console.log(chalk.bold.blue('🔐 Claude Authentication Manager\n'));

  switch (command) {
    case 'setup':
      await authManager.setupAuth();
      break;

    case 'status':
      showStatus();
      break;

    case 'set':
      if (args[1]) {
        authManager.setAnthropicApiKey(args[1]);
        console.log(chalk.green('🔄 API key saved In Progress!'));
      } else {
        console.error(chalk.red('Error: Please provide an API key'));
        console.log('Usage: claude-auth set <api-key>');
      }
      break;

    case 'clear':
      authManager.clearCredentials();
      break;

    case 'test':
      await testAuth();
      break;

    case 'oauth':
      await handleOAuth(args[1]);
      break;

    case 'session':
      await handleSession(args[1]);
      break;

    case 'methods':
      await showAllMethods();
      break;

    default:
      showHelp();
  }
}

async function showStatus() {
  console.log(chalk.bold.blue('🔐 Authentication Status\n'));

  // Check all authentication methods
  const auth = await authManager.getAnthropicAuth();
  const oauthStatus = oauthManager.getOAuthStatus();
  const sessionStatus = sessionManager.getSessionStatus();

  if (auth) {
    console.log(chalk.green('🔄 Active Authentication'));
    console.log(chalk.gray(`   Method: ${getAuthMethodDescription(auth.method)}`));
    console.log(chalk.gray(`   Status: Ready for API calls`));
    console.log();
  } else {
    console.log(chalk.yellow('⚠️  No active authentication'));
    console.log();
  }

  // Show detailed status for each method
  console.log(chalk.bold('📋 Available Methods:'));
  console.log();

  // Environment variable
  const envKey = process.env.ANTHROPIC_API_KEY;
  console.log(chalk.cyan('🔑 Environment Variable (ANTHROPIC_API_KEY)'));
  console.log(chalk.gray(`   Status: ${envKey ? '🔄 Set' : '❌ Not set'}`));
  console.log();

  // OAuth
  console.log(chalk.cyan('🌐 OAuth Authentication'));
  console.log(chalk.gray(`   Status: ${oauthStatus.authenticated ? '🔄 Active' : '❌ Not configured'}`));
  if (oauthStatus.expires_at) {
    const expiresAt = new Date(oauthStatus.expires_at);
    console.log(chalk.gray(`   Expires: ${expiresAt.toLocaleString()}`));
  }
  if (oauthStatus.scopes) {
    console.log(chalk.gray(`   Scopes: ${oauthStatus.scopes}`));
  }
  console.log();

  // Session cookies
  console.log(chalk.cyan('🍪 Session Authentication'));
  console.log(chalk.gray(`   Status: ${sessionStatus.authenticated ? '🔄 Active' : '❌ Not configured'}`));
  if (sessionStatus.lastUpdated) {
    console.log(chalk.gray(`   Updated: ${sessionStatus.lastUpdated.toLocaleString()}`));
  }
  if (sessionStatus.hasSessionKey || sessionStatus.hasAnthropicSession) {
    console.log(chalk.gray(`   Cookies: ${sessionStatus.hasSessionKey ? 'sessionKey ' : ''}${sessionStatus.hasAnthropicSession ? 'anthropic_session' : ''}`));
  }
  console.log();

  // Local auth file
  const credentials = authManager.getCredentials();
  console.log(chalk.cyan('💾 Local Auth File'));
  console.log(chalk.gray(`   Status: ${credentials?.anthropicApiKey ? '🔄 Has API key' : '❌ No API key'}`));
  if (credentials?.lastUpdated) {
    console.log(chalk.gray(`   Updated: ${credentials.lastUpdated.toLocaleString()}`));
  }
  console.log();

  if (!auth) {
    console.log(chalk.yellow('💡 To set up authentication, run:'));
    console.log(chalk.cyan('   claude-auth setup'));
    console.log(chalk.gray('   This will guide you through all available options'));
  }
}

function getAuthMethodDescription(method: AuthMethod): string {
  switch (method) {
    case AuthMethod.API_KEY:
      return 'API Key';
    case AuthMethod.OAUTH:
      return 'OAuth (Browser Login)';
    case AuthMethod.SESSION:
      return 'Session Cookies';
    case AuthMethod.CLAUDE_DESKTOP:
      return 'Claude Desktop App';
    default:
      return 'Unknown';
  }
}

async function testAuth() {
  const apiKey = authManager.getAnthropicApiKey();
  
  if (!apiKey) {
    console.log(chalk.red('✗ No API key found'));
    return;
  }

  console.log(chalk.yellow('Testing API key...'));
  
  try {
    const Anthropic = require('@anthropic-ai/sdk').default;
    const client = new Anthropic({ apiKey });
    
    const response = await client.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 10,
      messages: [{
        role: 'user',
        content: 'Say "OK"'
      }]
    });

    if (response.content[0].type === 'text') {
      console.log(chalk.green('🔄 API key is valid!'));
      console.log(chalk.gray(`  Response: ${response.content[0].text}`));
    }
  } catch (error: any) {
    console.log(chalk.red('✗ API key test failed'));
    console.log(chalk.gray(`  Error: ${error.message}`));
  }
}

async function handleOAuth(subcommand?: string) {
  switch (subcommand) {
    case 'login':
      try {
        console.log(chalk.blue('🌐 Starting OAuth authentication...'));
        await oauthManager.startOAuthFlow();
        console.log(chalk.green('🔄 OAuth authentication In Progress!'));
      } catch (error) {
        console.error(chalk.red('❌ OAuth authentication failed:'), error);
      }
      break;
    
    case 'logout':
      oauthManager.clearTokens();
      console.log(chalk.green('🔄 OAuth tokens cleared'));
      break;
    
    case 'refresh':
      try {
        const tokens = await oauthManager.refreshTokens();
        if (tokens) {
          console.log(chalk.green('🔄 OAuth tokens refreshed'));
        } else {
          console.log(chalk.yellow('⚠️  Could not refresh tokens'));
        }
      } catch (error) {
        console.error(chalk.red('❌ Token refresh failed:'), error);
      }
      break;
    
    case 'status':
      const status = oauthManager.getOAuthStatus();
      console.log(chalk.blue('🌐 OAuth Status:'));
      console.log(`   Authenticated: ${status.authenticated ? '🔄' : '❌'}`);
      if (status.expires_at) {
        console.log(`   Expires: ${new Date(status.expires_at).toLocaleString()}`);
      }
      break;
    
    default:
      console.log(chalk.cyan('OAuth Commands:'));
      console.log('  claude-auth oauth login    - Start OAuth flow');
      console.log('  claude-auth oauth logout   - Clear OAuth tokens');
      console.log('  claude-auth oauth refresh  - Refresh tokens');
      console.log('  claude-auth oauth status   - Show OAuth status');
  }
}

async function handleSession(subcommand?: string) {
  switch (subcommand) {
    case 'extract':
      try {
        console.log(chalk.blue('🍪 Extracting session from browser...'));
        const cookies = await sessionManager.extractBrowserCookies();
        if (cookies) {
          console.log(chalk.green('🔄 Session cookies extracted In Progress!'));
        } else {
          console.log(chalk.yellow('⚠️  No session cookies found'));
        }
      } catch (error) {
        console.error(chalk.red('❌ Session extraction failed:'), error);
      }
      break;
    
    case 'setup':
      try {
        await sessionManager.setupSessionAuth();
      } catch (error) {
        console.error(chalk.red('❌ Session setup failed:'), error);
      }
      break;
    
    case 'clear':
      sessionManager.clearSession();
      console.log(chalk.green('🔄 Session cookies cleared'));
      break;
    
    case 'validate':
      try {
        const isValid = await sessionManager.validateSession();
        console.log(chalk.blue('🍪 Session Status:'));
        console.log(`   Valid: ${isValid ? '🔄' : '❌'}`);
      } catch (error) {
        console.error(chalk.red('❌ Session validation failed:'), error);
      }
      break;
    
    case 'refresh':
      try {
        const refreshed = await sessionManager.refreshSession();
        if (refreshed) {
          console.log(chalk.green('🔄 Session refreshed from browser'));
        } else {
          console.log(chalk.yellow('⚠️  Could not refresh session'));
        }
      } catch (error) {
        console.error(chalk.red('❌ Session refresh failed:'), error);
      }
      break;
    
    case 'status':
      const status = sessionManager.getSessionStatus();
      console.log(chalk.blue('🍪 Session Status:'));
      console.log(`   Authenticated: ${status.authenticated ? '🔄' : '❌'}`);
      if (status.lastUpdated) {
        console.log(`   Last Updated: ${status.lastUpdated.toLocaleString()}`);
      }
      console.log(`   Has sessionKey: ${status.hasSessionKey ? '🔄' : '❌'}`);
      console.log(`   Has anthropic_session: ${status.hasAnthropicSession ? '🔄' : '❌'}`);
      break;
    
    default:
      console.log(chalk.cyan('Session Commands:'));
      console.log('  claude-auth session extract   - Extract cookies from browser');
      console.log('  claude-auth session setup     - Interactive session setup');
      console.log('  claude-auth session clear     - Clear session cookies');
      console.log('  claude-auth session validate  - Test session validity');
      console.log('  claude-auth session refresh   - Refresh from browser');
      console.log('  claude-auth session status    - Show session status');
  }
}

async function showAllMethods() {
  console.log(chalk.bold.blue('🔐 Available Authentication Methods\n'));
  
  console.log(chalk.cyan('1. 🔑 API Key Authentication'));
  console.log(chalk.gray('   - Traditional method using API keys from console.anthropic.com'));
  console.log(chalk.gray('   - Most reliable and widely supported'));
  console.log(chalk.gray('   - Usage: claude-auth set <api-key>'));
  console.log();
  
  console.log(chalk.cyan('2. 🌐 OAuth Authentication'));
  console.log(chalk.gray('   - Browser-based login using your Claude account'));
  console.log(chalk.gray('   - Similar to Claude Code authentication'));
  console.log(chalk.gray('   - Usage: claude-auth oauth login'));
  console.log();
  
  console.log(chalk.cyan('3. 🍪 Session Cookie Authentication'));
  console.log(chalk.gray('   - Uses your existing Claude.ai browser session'));
  console.log(chalk.gray('   - Extracts authentication from browser cookies'));
  console.log(chalk.gray('   - Usage: claude-auth session extract'));
  console.log();
  
  console.log(chalk.cyan('4. 💾 Environment Variables'));
  console.log(chalk.gray('   - Set ANTHROPIC_API_KEY in your shell'));
  console.log(chalk.gray('   - Highest priority method'));
  console.log(chalk.gray('   - Usage: export ANTHROPIC_API_KEY=sk-ant-...'));
  console.log();
  
  console.log(chalk.yellow('💡 Quick Start:'));
  console.log(chalk.cyan('   claude-auth setup    # Interactive setup wizard'));
  console.log(chalk.cyan('   claude-auth status   # Check current authentication'));
  console.log(chalk.cyan('   claude-auth test     # Test authentication'));
}

function showHelp() {
  console.log('Manage shared authentication for Claude AI\n');
  console.log('Commands:');
  console.log('  setup                    Interactive setup for authentication');
  console.log('  status                   Show current authentication status');
  console.log('  set <api-key>           Set Anthropic API key');
  console.log('  clear                   Clear all stored credentials');
  console.log('  test                    Test if authentication is valid');
  console.log('  oauth <subcommand>      OAuth authentication commands');
  console.log('  session <subcommand>    Session cookie commands');
  console.log('  methods                 Show all authentication methods');
  console.log('  help                    Show this help message');
  console.log('\nExamples:');
  console.log('  claude-auth setup');
  console.log('  claude-auth set sk-ant-...');
  console.log('  claude-auth oauth login');
  console.log('  claude-auth session extract');
  console.log('  claude-auth status');
  console.log('\nAuthentication sources (priority order):');
  console.log('  1. ANTHROPIC_API_KEY environment variable');
  console.log('  2. OAuth tokens (~/.aidev/oauth_tokens.json)');
  console.log('  3. Session cookies (~/.aidev/claude_session.json)');
  console.log('  4. Shared local auth (~/.aidev/auth.json)');
  console.log('  5. Claude desktop app configuration');
}

// Run the CLI
main().catch(err => {
  console.error(chalk.red('Error:'), err.message);
  process.exit(1);
});