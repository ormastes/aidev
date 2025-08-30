# AIIDE Deployment Guide

## Prerequisites

- Node.js 18+ 
- bun
- Git
- Docker (optional, for containerized deployment)

## Quick Start

1. **Clone and Install**
```bash
git clone <repository>
cd layer/themes/portal_aiide
bun install
```

2. **Configure Environment**
```bash
cp .env.example .env
# Edit .env with your API keys
```

3. **Start Development**
```bash
bun start
# Or run separately:
# bun run dev     # Frontend on http://localhost:5173
# bun run server  # Backend on http://localhost:3457
```

## Production Deployment

### Option 1: Traditional Deployment

1. **Build Application**
```bash
bun run build
```

2. **Configure Production Environment**
```bash
export NODE_ENV=production
export PORT=3457
export CLIENT_URL=https://your-domain.com
```

3. **Start Production Server**
```bash
bun run start:prod
```

### Option 2: Docker Deployment

1. **Build Docker Image**
```bash
docker build -t aiide:latest .
```

2. **Run Container**
```bash
docker run -d \
  -p 3457:3457 \
  -p 5173:5173 \
  --env-file .env \
  --name aiide \
  aiide:latest
```

### Option 3: Docker Compose

```yaml
# docker-compose.yml
version: '3.8'
services:
  aiide:
    build: .
    ports:
      - "3457:3457"
      - "5173:5173"
    env_file:
      - .env
    volumes:
      - ./workspace:/app/workspace
      - ./data:/app/data
    restart: unless-stopped
```

Run with:
```bash
docker-compose up -d
```

## Cloud Deployment

### AWS EC2

1. **Launch EC2 Instance**
   - Ubuntu 22.04 LTS
   - t3.medium or larger
   - Security groups: Allow ports 3457, 5173, 22

2. **Setup Instance**
```bash
# SSH into instance
ssh ubuntu@<your-ec2-ip>

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone and setup
git clone <repository>
cd layer/themes/portal_aiide
bun install
bun run build
```

3. **Use PM2 for Process Management**
```bash
bun install -g pm2
pm2 start bun --name "aiide-backend" -- run server
pm2 start bun --name "aiide-frontend" -- run preview
pm2 save
pm2 startup
```

### Heroku

1. **Create Heroku App**
```bash
heroku create your-aiide-app
```

2. **Configure Buildpacks**
```bash
heroku buildpacks:set heroku/nodejs
```

3. **Set Environment Variables**
```bash
heroku config:set NODE_ENV=production
heroku config:set CLAUDE_API_KEY=your-key
# Set other API keys
```

4. **Deploy**
```bash
git push heroku main
```

### Vercel (Frontend Only)

1. **Install Vercel CLI**
```bash
bun install -g vercel
```

2. **Deploy**
```bash
vercel --prod
```

3. **Configure Backend URL**
Update `VITE_API_URL` in Vercel environment variables

### DigitalOcean App Platform

1. **Create App**
   - Choose GitHub repository
   - Select Node.js environment

2. **Configure**
   - Build Command: `bun run build`
   - Run Command: `bun run start:prod`
   - HTTP Port: 3457

3. **Environment Variables**
   Add all required API keys in the App settings

## Nginx Configuration

For production, use Nginx as reverse proxy:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Frontend
    location / {
        proxy_pass http://localhost:5173;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3457;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket
    location /socket.io {
        proxy_pass http://localhost:3457;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

## SSL/TLS Setup

### Using Let's Encrypt

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### Update Nginx for HTTPS

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # ... rest of configuration
}

server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}
```

## Monitoring and Logging

### PM2 Monitoring

```bash
pm2 status
pm2 logs
pm2 monit
```

### Application Logs

Logs are stored in:
- `./logs/aiide.log` - Application logs
- `./logs/error.log` - Error logs

### Health Check

```bash
curl http://localhost:3457/api/health
```

## Backup and Recovery

### Backup Workspace

```bash
tar -czf backup-$(date +%Y%m%d).tar.gz workspace/ data/
```

### Restore from Backup

```bash
tar -xzf backup-20240101.tar.gz
```

## Security Considerations

1. **API Keys**: Never commit `.env` file
2. **CORS**: Configure allowed origins in production
3. **Rate Limiting**: Enabled by default (100 req/15min)
4. **File Uploads**: Limited to 10MB by default
5. **Authentication**: Implement user auth for production
6. **HTTPS**: Always use SSL/TLS in production

## Performance Optimization

1. **Enable Caching**
```bash
export ENABLE_CACHE=true
```

2. **Optimize Build**
```bash
bun run build -- --mode production
```

3. **Use CDN for Static Assets**
Configure in `vite.config.ts`

4. **Database Optimization**
Use PostgreSQL instead of SQLite for production

## Troubleshooting

### Port Already in Use
```bash
lsof -i :3457
kill -9 <PID>
```

### Module Not Found
```bash
rm -rf node_modules package-lock.json
bun install
```

### Build Errors
```bash
bun run clean
bun install
bun run build
```

### API Connection Issues
- Check firewall settings
- Verify environment variables
- Check CORS configuration

## Support

For issues and questions:
- GitHub Issues: [repository]/issues
- Documentation: [repository]/docs