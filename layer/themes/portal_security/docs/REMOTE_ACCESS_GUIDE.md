# Remote Access Guide

## Security Architecture

The web-security theme implements a secure remote access pattern:

```
Internet → Web Security Proxy (0.0.0.0:3400) → Internal Apps (localhost:34xx)
```

## Design Principles

1. **Individual apps bind to localhost only** - Not directly accessible from remote
2. **Proxy binds to all interfaces** - Acts as the single entry point
3. **Authentication at the edge** - Proxy handles all authentication
4. **Internal routing** - Proxy forwards authenticated requests to apps

## Configuration

### Web Security Proxy

The proxy server binds to all interfaces by default:

```bash
# Binds to 0.0.0.0:3200 (accessible remotely)
npm run proxy:dev

# Or configure explicitly
PROXY_HOST=0.0.0.0 npm run proxy:dev

# For localhost only (testing)
PROXY_HOST=localhost npm run proxy:dev
```

### Individual Applications

Apps should **always** bind to localhost:

```typescript
// ✅ Correct - Secure configuration
app.listen(PORT, 'localhost', () => {
  console.log(`App listening on localhost:${PORT}`);
});

// ❌ Wrong - Exposes app directly
app.listen(PORT, '0.0.0.0', () => {
  console.log(`App exposed on all interfaces`);
});
```

## Remote Access Flow

1. **Remote user** connects to `http://your-server:3400/app/gui-selector`
2. **Proxy** receives request on `0.0.0.0:3400`
3. **Authentication** checked by proxy
4. **Routing** to internal app on `localhost:3456`
5. **Response** sent back through proxy

## Security Benefits

- **Single entry point** - Only one port exposed to internet
- **Centralized auth** - No need to implement auth in each app
- **Network isolation** - Apps can't be accessed directly
- **Security headers** - Applied consistently by proxy
- **Rate limiting** - Implemented once at the edge

## Firewall Configuration

Only expose the proxy ports:

```bash
# Example: Allow proxy ports
sudo ufw allow 3200/tcp  # Dev proxy
sudo ufw allow 3300/tcp  # Demo proxy  
sudo ufw allow 3400/tcp  # Production proxy

# Individual app ports remain closed
# 3456, 3410, etc. - NOT exposed
```

## Example: Accessing GUI Selector Remotely

### Without Proxy (Insecure, Won't Work)
```
http://192.168.1.100:3456  ❌ Blocked - App only listens on localhost
```

### With Proxy (Secure, Recommended)
```
http://192.168.1.100:3400/app/gui-selector  ✅ Works - Proxy forwards to localhost:3456
```

## Production Deployment

For production, use a reverse proxy like nginx:

```nginx
server {
    listen 443 ssl;
    server_name your-domain.com;
    
    # SSL configuration
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    # Proxy to web-security
    location / {
        proxy_pass http://localhost:3400;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Troubleshooting

### Can't access app remotely

1. **Check proxy is running**: `curl http://localhost:3200/health`
2. **Check proxy binding**: Should show `0.0.0.0` in logs
3. **Check firewall**: Ensure proxy port is open
4. **Check app registration**: Visit proxy homepage for app list

### Authentication issues

1. **Clear cookies**: Proxy uses session cookies
2. **Check credentials**: Default is `admin/admin123`
3. **Check session**: Use `/api/auth/check` endpoint

### Connection refused

1. **App not running**: Start the internal app first
2. **Wrong internal port**: Check PortManager configuration
3. **Localhost binding**: Ensure app binds to localhost

## Best Practices

1. **Never expose app ports** - Only proxy ports in firewall
2. **Use HTTPS in production** - Add SSL termination
3. **Monitor proxy logs** - All access goes through proxy
4. **Regular updates** - Keep security dependencies updated
5. **Environment separation** - Different ports for dev/demo/prod