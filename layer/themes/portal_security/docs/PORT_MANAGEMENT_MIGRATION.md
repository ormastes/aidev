# Port Management Migration Guide

## Overview

The web-security theme now provides centralized port management for all web applications. 

**IMPORTANT**: Existing apps like GUI Selector can continue running as-is with their current port configuration. Migration is optional but recommended for new features.

## Port Allocation Scheme

Ports are allocated using a 4-digit scheme: `EEID`

- `EE` = Environment prefix (2 digits)
  - `32` = Development (dev)
  - `33` = Demo
  - `34` = Release/Production
- `ID` = Application ID (2 digits, 00-99)

### Reserved Application IDs

| App ID | Application | Example Ports |
|--------|------------|---------------|
| 00 | web-security proxy | 3200 (dev), 3300 (demo), 3400 (release) |
| 56 | gui-selector | 3256 (dev), 3356 (demo), 3456 (release) |
| 10 | chat-space | 3210 (dev), 3310 (demo), 3410 (release) |
| 20 | pocketflow | 3220 (dev), 3320 (demo), 3420 (release) |
| 30 | coordinator-agent | 3230 (dev), 3330 (demo), 3430 (release) |
| 40 | external-log | 3240 (dev), 3340 (demo), 3440 (release) |

## Option 1: Keep Existing Apps As-Is (No Changes Required)

Existing apps like GUI Selector can continue running with their current configuration:

```typescript
// GUI Selector's existing code - NO CHANGES NEEDED
const PORT = process.env.PORT || (
  ENV === 'production' || ENV === 'release' ? 3456 :
  ENV === 'demo' ? 3356 :
  3256
);

app.listen(PORT, () => {
  console.log(`Running on port ${PORT}`);
});
```

The web-security proxy already knows how to route to these ports:
- `http://localhost:3200/app/gui-selector` → Routes to `localhost:3256`
- `http://your-server:3400/app/gui-selector` → Routes to `localhost:3456`

## Option 2: Migrate to PortManager (Recommended for New Features)

### 1. Update Your Application

For new apps or when adding new features, use PortManager:

```typescript
// Before:
const PORT = process.env.PORT || 3456;

// After:
import { PortManager } from '@aidev/web-security/pipe';

const portManager = PortManager.getInstance();
const environment = portManager.getCurrentEnvironment();
const PORT = portManager.getPortForEnvironment('your-app-id', environment);
```

### 2. Register Your Application

If your app isn't already registered, add it to the PortManager:

```typescript
// In your app's initialization
portManager.registerApp('your-app-id', 75, 4075); // ID: 75, Internal: 4075
```

### 3. Update AppRegistry

Make sure your app is registered in the AppRegistry for navigation:

```typescript
import { AppRegistry } from '@aidev/web-security/pipe';

const appRegistry = AppRegistry.getInstance();
appRegistry.register({
  id: 'your-app-id',
  name: 'Your App Name',
  url: `http://localhost:${PORT}`,
  icon: '🎯',
  description: 'Your app description',
  requiresAuth: true,
  order: 5
});
```

## Accessing Apps Through the Proxy

All apps can now be accessed through the web-security proxy:

- Direct access: `http://localhost:3256` (gui-selector in dev)
- Proxy access: `http://localhost:3200/app/gui-selector`

The proxy provides:
- Centralized authentication
- Session sharing
- Security headers
- Request routing

## Environment Variables

Set the environment to control which port range is used:

```bash
# Development (32xx)
NODE_ENV=development npm start

# Demo (33xx)
NODE_ENV=demo npm start

# Release/Production (34xx)
NODE_ENV=release npm start
```

## Benefits

1. **Consistent Port Assignment**: No more port conflicts
2. **Environment Awareness**: Automatic port selection based on environment
3. **Centralized Access**: All apps accessible through the proxy
4. **Security**: Authentication and security headers applied centrally
5. **Discovery**: Apps can discover each other through the registry

## Example: GUI Selector Migration

```typescript
// Before (hardcoded ports)
const ENV = process.env.NODE_ENV || 'development';
const PORT = process.env.PORT || (
  ENV === 'production' || ENV === 'release' ? 3456 :
  ENV === 'demo' ? 3356 :
  3256
);

// After (using PortManager)
import { PortManager } from '@aidev/web-security/pipe';

const portManager = PortManager.getInstance();
const PORT = portManager.getPortForEnvironment('gui-selector', 
  portManager.getCurrentEnvironment());

console.log(`GUI Selector running on port ${PORT}`);
```

## Running the Proxy Server

```bash
cd layer/themes/web-security
npm install
npm run proxy:dev    # Runs on port 3200
npm run proxy:demo   # Runs on port 3300
npm run proxy:release # Runs on port 3400
```

## Troubleshooting

1. **Port already in use**: Check if another app is using the calculated port
2. **App not found**: Ensure your app is registered with PortManager
3. **Authentication required**: Access through the proxy for auth-protected apps
4. **Session not shared**: Ensure you're using the proxy's session configuration