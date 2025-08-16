# Cucumber Test Runner Solutions

## Problem
Cucumber requires Node.js v20+, but the current system has v18.19.1.

## Solutions Provided

### 1. Node.js Upgrade Script
**Script**: `scripts/upgrade-nodejs.sh`  
**Usage**: `bun run node:upgrade` or `./scripts/upgrade-nodejs.sh`

This script provides multiple methods to upgrade Node.js to v20:
- NVM (Node Version Manager) - Recommended
- n (Node.js version manager)
- fnm (Fast Node Manager)
- Direct download from nodejs.org
- System package manager (apt/yum/brew)

### 2. Bun-Based Cucumber Runner
**Script**: `scripts/bun-cucumber-runner.ts`  
**Usage**: `bun run cucumber:bun`

Attempts to run Cucumber using Bun's runtime, bypassing Node.js version checks.

### 3. Combined Solution Script
**Script**: `scripts/run-cucumber-with-bun.sh`  
**Usage**: `bun run test:system:bun`

Provides multiple options:
1. Try running Cucumber with Bun (experimental)
2. Use Jest adapter as alternative
3. Upgrade Node.js and run normally
4. Show manual upgrade instructions

## Available NPM Scripts

```json
{
  "test:system": "cucumber-js --config cucumber.yml --profile system",
  "test:system:bun": "./scripts/run-cucumber-with-bun.sh",
  "test:system:upgrade": "./scripts/upgrade-nodejs.sh",
  "cucumber:bun": "bun scripts/bun-cucumber-runner.ts",
  "node:upgrade": "./scripts/upgrade-nodejs.sh"
}
```

## Quick Start

### Option 1: Upgrade Node.js (Recommended)
```bash
# Upgrade Node.js to v20
bun run node:upgrade

# Then run Cucumber normally
bun run test:system
```

### Option 2: Try Bun Runner (Experimental)
```bash
# Attempt to run with Bun
bun run test:system:bun

# Or directly
bun run cucumber:bun
```

### Option 3: Manual Upgrade
```bash
# Using nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20

# Using apt (Ubuntu/Debian)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Using Homebrew (macOS)
brew install node@20
brew link --overwrite node@20
```

## Why Bun Can't Simply Override Node.js Version

While Bun is a JavaScript runtime that can execute most Node.js code, Cucumber performs a hard version check at startup that cannot be easily bypassed. The check happens before any code can modify `process.versions.node`.

However, the scripts provided attempt several workarounds:
1. Override process.versions.node before loading Cucumber
2. Use environment variables to bypass checks
3. Run Cucumber through a wrapper that modifies the runtime
4. Use alternative test runners (Jest) as a fallback

## Recommendation

The most reliable solution is to **upgrade Node.js to v20 LTS**. This ensures:
- Full Cucumber compatibility
- Access to all Cucumber features
- No workarounds needed
- Better long-term support

Use the provided upgrade script for an easy, guided upgrade process:
```bash
./scripts/upgrade-nodejs.sh
```

After upgrading, all Cucumber tests will work normally with both `npm` and `bun` commands.