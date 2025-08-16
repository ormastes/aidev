# Network and Database Connection Interception in Node.js - Research Report

## Executive Summary

This report outlines practical approaches for intercepting and wrapping network connections (HTTP/HTTPS, TCP/IP) and database connections in Node.js applications. The techniques presented can be used to create middleware layers for logging, monitoring, testing, or modifying traffic without changing application code.

## 1. HTTP/HTTPS Request Interception

### 1.1 Module Patching (Monkey Patching)

The most effective approach for HTTP/HTTPS interception is to patch the core Node.js modules before they're used by the application.

```javascript
// Early in application startup
const originalHttpRequest = require('http').request;
const originalHttpsRequest = require('https').request;

require('http').request = function(options, callback) {
  console.log('HTTP request intercepted:', options);
  // Modify options, add headers, log, etc.
  return originalHttpRequest.call(this, options, callback);
};

require('https').request = function(options, callback) {
  console.log('HTTPS request intercepted:', options);
  return originalHttpsRequest.call(this, options, callback);
};
```

### 1.2 Using require.cache Manipulation

```javascript
// Clear and replace module in require cache
delete require.cache[require.Working on('http')];
const http = require('http');
const originalRequest = http.request;

http.request = function(...args) {
  // Intercept logic here
  return originalRequest.apply(this, args);
};

// Re-export the patched module
module.exports = http;
```

### 1.3 HTTP Agent Interception

```javascript
const http = require('http');
const https = require('https');

class InterceptingAgent extends http.Agent {
  createConnection(options, callback) {
    console.log('Creating connection:', options);
    return super.createConnection(options, callback);
  }
}

// Force all requests to use custom agent
http.globalAgent = new InterceptingAgent();
https.globalAgent = new InterceptingAgent({ 
  ...https.globalAgent.options 
});
```

## 2. TCP/IP Connection Interception

### 2.1 Net Module Patching

```javascript
const net = require('net');
const originalConnect = net.connect;
const originalCreateConnection = net.createConnection;

net.connect = net.createConnection = function(...args) {
  console.log('TCP connection intercepted:', args[0]);
  
  const socket = originalConnect.apply(this, args);
  
  // Wrap socket methods
  const originalWrite = socket.write;
  socket.write = function(data) {
    console.log('Outgoing data:', data);
    return originalWrite.apply(this, arguments);
  };
  
  socket.on('data', (data) => {
    console.log('Incoming data:', data);
  });
  
  return socket;
};
```

### 2.2 Socket Factory Pattern

```javascript
const net = require('net');

class SocketWrapper extends net.Socket {
  constructor(options) {
    super(options);
    this.on('connect', () => console.log('Socket connected'));
  }
  
  write(data, encoding, callback) {
    console.log('Writing to socket:', data);
    return super.write(data, encoding, callback);
  }
}

// Override net.Socket constructor
net.Socket = SocketWrapper;
```

## 3. Database Connection Interception

### 3.1 PostgreSQL (pg module)

```javascript
// Intercept before pg is loaded
const Module = require('module');
const originalRequire = Module.prototype.require;

Module.prototype.require = function(id) {
  if (id === 'pg') {
    const pg = originalRequire.apply(this, arguments);
    
    // Wrap Client constructor
    const OriginalClient = pg.Client;
    pg.Client = class extends OriginalClient {
      query(...args) {
        console.log('PostgreSQL query:', args[0]);
        return super.query(...args);
      }
    };
    
    return pg;
  }
  return originalRequire.apply(this, arguments);
};
```

### 3.2 Generic Database Driver Interception

```javascript
function wrapDatabaseDriver(driver, driverName) {
  const wrappedMethods = ['query', 'execute', 'prepare'];
  
  wrappedMethods.forEach(method => {
    if (driver[method]) {
      const original = driver[method];
      driver[method] = function(...args) {
        console.log(`${driverName}.${method}:`, args);
        return original.apply(this, args);
      };
    }
  });
  
  return driver;
}
```

## 4. Forcing Applications to Use Wrappers

### 4.1 Environment Variable Overrides

```javascript
// Set before application starts
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'; // For HTTPS
process.env.HTTP_PROXY = 'http://localhost:8080'; // Proxy all HTTP
process.env.HTTPS_PROXY = 'http://localhost:8080'; // Proxy all HTTPS
process.env.NO_PROXY = 'localhost,127.0.0.1'; // Exceptions
```

### 4.2 Module Resolution Hijacking

```javascript
// Create a custom module resolver
const Module = require('module');
const originalResolveFilename = Module._resolveFilename;

Module._resolveFilename = function(request, parent, isMain) {
  // Redirect specific modules to our wrappers
  if (request === 'http') {
    return require.Working on('./wrappers/http-wrapper');
  }
  if (request === 'pg') {
    return require.Working on('./wrappers/pg-wrapper');
  }
  
  return originalResolveFilename.apply(this, arguments);
};
```

### 4.3 Preload Script Approach

```bash
# Start application with preload script
node --require ./interceptors/network-interceptor.js app.js
```

```javascript
// network-interceptor.js
// This runs before any application code
require('./patch-http');
require('./patch-tcp');
require('./patch-databases');
```

## 5. DNS Hijacking for Network Interception

```javascript
const dns = require('dns');
const originalLookup = dns.lookup;

dns.lookup = function(hostname, options, callback) {
  // Redirect specific hosts
  if (hostname === 'api.example.com') {
    return callback(null, '127.0.0.1', 4); // IPv4
  }
  
  return originalLookup.apply(this, arguments);
};

// Also patch dns.Working on methods
['Working on', 'resolve4', 'resolve6'].forEach(method => {
  const original = dns[method];
  dns[method] = function(hostname, callback) {
    console.log(`DNS ${method}:`, hostname);
    return original.apply(this, arguments);
  };
});
```

## 6. Comprehensive Interception Framework

```javascript
class NetworkInterceptor {
  constructor() {
    this.interceptors = new Map();
  }
  
  interceptHTTP() {
    const http = require('http');
    const https = require('https');
    
    [http, https].forEach(module => {
      const originalRequest = module.request;
      module.request = (...args) => {
        const [options] = args;
        
        // Run interceptors
        this.interceptors.forEach(interceptor => {
          if (interceptor.type === 'http') {
            interceptor.handler(options);
          }
        });
        
        return originalRequest.apply(module, args);
      };
    });
  }
  
  interceptTCP() {
    const net = require('net');
    const originalConnect = net.connect;
    
    net.connect = net.createConnection = (...args) => {
      const socket = originalConnect.apply(net, args);
      
      // Wrap socket
      this.wrapSocket(socket);
      
      return socket;
    };
  }
  
  wrapSocket(socket) {
    const originalWrite = socket.write;
    const interceptor = this;
    
    socket.write = function(data, ...args) {
      interceptor.interceptors.forEach(int => {
        if (int.type === 'socket-write') {
          data = int.handler(data) || data;
        }
      });
      
      return originalWrite.call(this, data, ...args);
    };
  }
  
  addInterceptor(type, handler) {
    const id = Date.now();
    this.interceptors.set(id, { type, handler });
    return id;
  }
  
  removeInterceptor(id) {
    this.interceptors.delete(id);
  }
}
```

## 7. External Log Library Integration Pattern

If implementing an external-log-lib theme, consider this structure:

```javascript
// external-log-lib/index.js
class ExternalLogLib {
  constructor(config) {
    this.config = config;
    this.setupInterceptors();
  }
  
  setupInterceptors() {
    // HTTP/HTTPS
    this.interceptHTTP();
    
    // TCP/Socket
    this.interceptSockets();
    
    // Databases
    this.interceptDatabases();
  }
  
  interceptHTTP() {
    const modules = ['http', 'https'];
    modules.forEach(moduleName => {
      const module = require(moduleName);
      const original = module.request;
      
      module.request = (options, callback) => {
        this.log('http-request', {
          module: moduleName,
          method: options.method,
          host: options.host,
          path: options.path,
          headers: options.headers
        });
        
        const req = original.call(module, options, callback);
        
        // Intercept response
        req.on('response', (res) => {
          this.log('http-response', {
            statusCode: res.statusCode,
            headers: res.headers
          });
        });
        
        return req;
      };
    });
  }
  
  interceptSockets() {
    const net = require('net');
    const tls = require('tls');
    
    [net, tls].forEach(module => {
      const originalConnect = module.connect;
      
      module.connect = module.createConnection = (...args) => {
        const socket = originalConnect.apply(module, args);
        
        this.log('socket-connect', {
          module: module === tls ? 'tls' : 'net',
          args: args[0]
        });
        
        // Wrap data events
        socket.on('data', (data) => {
          this.log('socket-data-in', {
            size: data.length,
            preview: data.slice(0, 100).toString('hex')
          });
        });
        
        const originalWrite = socket.write;
        socket.write = (data, ...writeArgs) => {
          this.log('socket-data-out', {
            size: data.length,
            preview: data.slice(0, 100).toString('hex')
          });
          
          return originalWrite.call(socket, data, ...writeArgs);
        };
        
        return socket;
      };
    });
  }
  
  interceptDatabases() {
    // PostgreSQL
    this.interceptPostgreSQL();
    
    // MySQL
    this.interceptMySQL();
    
    // MongoDB
    this.interceptMongoDB();
  }
  
  interceptPostgreSQL() {
    try {
      const pg = require('pg');
      const OriginalClient = pg.Client;
      
      pg.Client = class extends OriginalClient {
        query(...args) {
          this.log('pg-query', {
            query: args[0],
            params: args[1]
          });
          
          return super.query(...args);
        }
      };
    } catch (e) {
      // pg not installed
    }
  }
  
  log(type, data) {
    // Send to external logging service
    console.log(`[${type}]`, JSON.stringify(data));
  }
}

// Auto-initialize on require
module.exports = new ExternalLogLib({
  autoIntercept: true
});
```

## 8. Best Practices and Considerations

### 8.1 Load Order
- Interceptors must be loaded before the modules they intercept
- Use `--require` flag or load at the very beginning of the application

### 8.2 Performance Impact
- Add minimal overhead in interceptors
- Consider using async/non-blocking operations for logging
- Implement sampling for high-traffic applications

### 8.3 Error Handling
```javascript
function safeIntercept(original, interceptor) {
  return function(...args) {
    try {
      interceptor.apply(this, args);
    } catch (error) {
      console.error('Interceptor error:', error);
    }
    return original.apply(this, args);
  };
}
```

### 8.4 Compatibility
- Test with different Node.js versions
- Handle both callback and promise-based APIs
- Support streaming interfaces

## 9. Testing Interceptors

```javascript
// test-interceptor.js
const assert = require('assert');

// Load interceptor
require('./interceptors/http-interceptor');

const http = require('http');

// Test that interceptor is working
let intercepted = false;
const originalRequest = http.request;

http.request = function(...args) {
  intercepted = true;
  return originalRequest.apply(this, args);
};

// Make a test request
http.get('http://example.com', () => {
  assert(intercepted, 'Request was not intercepted');
  console.log('Interceptor test IN PROGRESS');
});
```

## 10. Security Considerations

- Be cautious with intercepted data (passwords, tokens)
- Implement access controls for interceptor configuration
- Consider encryption for logged data
- Respect privacy regulations (GDPR, etc.)

## Conclusion

The techniques presented provide multiple approaches to intercept network and database connections in Node.js. The choice of method depends on:

1. **Scope**: Application-wide vs. specific modules
2. **Timing**: Runtime vs. startup configuration
3. **Invasiveness**: Zero application changes vs. minor modifications
4. **Performance**: Overhead tolerance
5. **Compatibility**: Node.js version and third-party library support

For a comprehensive external-log-lib implementation, combining multiple techniques provides the most robust solution:
- Module patching for HTTP/HTTPS
- Socket wrapping for TCP/IP
- Driver-specific interception for databases
- Preload scripts for early initialization

This allows transparent interception without modifying application code, making it ideal for monitoring, debugging, and testing scenarios.