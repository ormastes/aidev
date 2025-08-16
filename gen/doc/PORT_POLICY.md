# Port Policy

## Standard Port Assignments

### Development Servers
- **3000** - Default web application
- **3457** - GUI selection server
- **4000** - API server
- **5000** - MCP server
- **8080** - Alternative web server

### Database Ports
- **5432** - PostgreSQL
- **27017** - MongoDB
- **6379** - Redis

### Testing Ports
- **9000-9999** - Reserved for test servers

## Port Allocation Rules

1. Check port availability before binding
2. Use environment variables for configuration
3. Document any non-standard port usage
4. Avoid conflicts with system services
