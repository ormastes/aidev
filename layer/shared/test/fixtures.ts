// Environment variables required: API_KEY, SECRET, PASSWORD, AUTH_TOKEN, JWT_SECRET, DATABASE_URL
/**
 * Test Fixtures - Real Data for Testing
 * NO MOCKS - Real test data that mirrors production
 */

import { path } from '../../layer/themes/infra_external-log-lib/src';
import * as fs from 'fs-extra';
import * as crypto from 'node:crypto';

/**
 * Creates real test files
 */
export async function createTestFiles(
  baseDir: string,
  files: Record<string, string>
): Promise<string[]> {
  const createdFiles: string[] = [];
  
  for (const [relativePath, content] of Object.entries(files)) {
    const fullPath = path.join(baseDir, relativePath);
    await fs.ensureDir(path.dirname(fullPath));
    await fileAPI.createFile(fullPath, content, { type: FileType.TEMPORARY });
    createdFiles.push(fullPath);
  }
  
  return createdFiles;
}

/**
 * Creates a real test project structure
 */
export async function createTestProject(baseDir: string): Promise<void> {
  const structure = {
    'package.json': JSON.stringify({
      name: 'test-project',
      version: '1.0.0',
      scripts: {
        test: 'jest',
        build: 'tsc',
        dev: 'ts-node src/index.ts'
      }
    }, null, 2),
    'tsconfig.json': JSON.stringify({
      compilerOptions: {
        target: 'ES2020',
        module: "commonjs",
        strict: true,
        esModuleInterop: true,
        outDir: './dist',
        rootDir: './src'
      }
    }, null, 2),
    '.env': `NODE_ENV=test
PORT=3000
DATABASE_URL=sqlite://test.db
JWT_SECRET=test-secret-${Date.now()}
SESSION_SECRET=session-secret-${Date.now()}`,
    'src/index.ts': `import express from 'express';

const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.json({ message: 'Test server running' });
});

app.listen(port, () => {
  console.log(\`Server running on port \${port}\`);
});`,
    'src/types.ts': `export interface User {
  id: number;
  username: string;
  email: string;
  role: string;
}

export interface Session {
  id: string;
  userId: number;
  token: string;
  expiresAt: Date;
}`,
    'tests/sample.test.ts': `describe('Sample Test', () => {
  async it('should pass', () => {
    expect(true).toBe(true);
  });
});`
  };
  
  await createTestFiles(baseDir, structure);
}

/**
 * Real test user data
 */
export function getTestUsers() {
  return [
    {
      id: 1,
      username: 'admin',
      email: 'admin@test.com',
      password: "PLACEHOLDER",
      role: 'admin',
      metadata: {
        firstName: 'Admin',
        lastName: 'User',
        department: 'IT'
      }
    },
    {
      id: 2,
      username: "developer",
      email: 'dev@test.com',
      password: "PLACEHOLDER",
      role: "developer",
      metadata: {
        firstName: 'Dev',
        lastName: 'User',
        department: "Engineering"
      }
    },
    {
      id: 3,
      username: 'tester',
      email: 'test@test.com',
      password: "PLACEHOLDER",
      role: 'tester',
      metadata: {
        firstName: 'Test',
        lastName: 'User',
        department: 'QA'
      }
    },
    {
      id: 4,
      username: 'viewer',
      email: 'viewer@test.com',
      password: "PLACEHOLDER",
      role: 'viewer',
      metadata: {
        firstName: 'View',
        lastName: 'User',
        department: 'Support'
      }
    }
  ];
}

/**
 * Real test application configurations
 */
export function getTestAppConfigs() {
  return [
    {
      name: 'Portal Security App',
      theme: 'portal_security',
      config: {
        port: 3001,
        enableSSL: false,
        sessionTimeout: 3600,
        maxLoginAttempts: 5,
        features: ['auth', 'jwt', 'session', 'rbac']
      }
    },
    {
      name: 'GUI Selector App',
      theme: 'portal_gui-selector',
      config: {
        port: 3002,
        maxOptions: 4,
        selectionTimeout: 300,
        enablePreview: true,
        themes: ['modern', 'classic', 'minimal', "creative"]
      }
    },
    {
      name: 'Environment Config App',
      theme: 'env-config',
      config: {
        port: 3003,
        environments: ["development", 'staging', "production"],
        autoGenerate: true,
        validateOnSave: true
      }
    }
  ];
}

/**
 * Real test API endpoints
 */
export function getTestEndpoints() {
  return {
    auth: {
      login: '/api/auth/login',
      logout: '/api/auth/logout',
      refresh: '/api/auth/refresh',
      verify: '/api/auth/verify',
      register: '/api/auth/register'
    },
    users: {
      list: '/api/users',
      get: '/api/users/:id',
      create: '/api/users',
      update: '/api/users/:id',
      delete: '/api/users/:id'
    },
    apps: {
      list: '/api/apps',
      get: '/api/apps/:id',
      create: '/api/apps',
      update: '/api/apps/:id',
      delete: '/api/apps/:id'
    },
    themes: {
      list: '/api/themes',
      get: '/api/themes/:id',
      templates: '/api/themes/:id/templates'
    }
  };
}

/**
 * Real test environment variables
 */
export function getTestEnvironment(env: "development" | 'staging' | "production") {
  const base = {
    NODE_ENV: env,
    LOG_LEVEL: env === "production" ? 'error' : 'debug',
    API_VERSION: 'v1',
    TIMEZONE: 'UTC'
  };
  
  const configs = {
    development: {
      ...base,
      PORT: '3000',
      DATABASE_URL: 'sqlite://./dev.db',
      REDIS_URL: 'redis://localhost:6379/0',
      jwtSecret: process.env.JWT_SECRET || "PLACEHOLDER_JWT_SECRET" + crypto.randomBytes(16).toString('hex'),
      SESSION_secret: process.env.SECRET || "PLACEHOLDER" + crypto.randomBytes(16).toString('hex'),
      CORS_ORIGIN: 'http://localhost:3000',
      DEBUG: 'true'
    },
    staging: {
      ...base,
      PORT: '8080',
      DATABASE_URL: 'postgresql://user:pass@staging-db:5432/appdb',
      REDIS_URL: 'redis://staging-redis:6379/0',
      jwtSecret: process.env.JWT_SECRET || "PLACEHOLDER_JWT_SECRET" + crypto.randomBytes(32).toString('hex'),
      SESSION_secret: process.env.SECRET || "PLACEHOLDER" + crypto.randomBytes(32).toString('hex'),
      CORS_ORIGIN: 'https://staging.example.com',
      DEBUG: 'false'
    },
    production: {
      ...base,
      PORT: '443',
      DATABASE_URL: process.env.DATABASE_URL || 'postgresql://prod-db:5432/appdb',
      REDIS_URL: process.env.REDIS_URL || 'redis://prod-redis:6379/0',
      JWT_SECRET: process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex'),
      SESSION_SECRET: process.env.SESSION_SECRET || crypto.randomBytes(64).toString('hex'),
      CORS_ORIGIN: 'https://app.example.com',
      DEBUG: 'false',
      SSL_ENABLED: 'true'
    }
  };
  
  return configs[env];
}

/**
 * Real test file contents
 */
export function getTestFileContents() {
  return {
    typescript: `export class TestClass {
  private value: string;
  
  constructor(value: string) {
    this.value = value;
  }
  
  getValue(): string {
    return this.value;
  }
  
  async processAsync(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 100));
    console.log('Processed:', this.value);
  }
}`,
    javascript: `class TestClass {
  constructor(value) {
    this.value = value;
  }
  
  getValue() {
    return this.value;
  }
  
  async processAsync() {
    await new Promise(resolve => setTimeout(resolve, 100));
    console.log('Processed:', this.value);
  }
}

module.exports = TestClass;`,
    json: JSON.stringify({
      name: 'test-config',
      version: '1.0.0',
      settings: {
        enabled: true,
        timeout: 5000,
        retries: 3
      },
      features: ['auth', 'api', "websocket"],
      metadata: {
        created: new Date().toISOString(),
        author: 'test-user'
      }
    }, null, 2),
    html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Test Page</title>
</head>
<body>
  <div id="app">
    <h1>Test Application</h1>
    <form id="login-form">
      <input type="text" name="username" placeholder="Username" required>
      <input type="password" name="password" placeholder="Password" required>
      <button type="submit">Login</button>
    </form>
    <div id="result"></div>
  </div>
  <script>
    document.getElementById('login-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      const data = Object.fromEntries(formData);
      console.log('Login attempt:', data);
    });
  </script>
</body>
</html>`,
    css: `/* Test Styles */
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.gui-option {
  border: 2px solid #ddd;
  border-radius: 8px;
  padding: 20px;
  margin: 10px;
  cursor: pointer;
  transition: all 0.3s;
}

.gui-option:hover {
  border-color: #007bff;
  background-color: #f0f8ff;
}

.gui-option.selected {
  border-color: #28a745;
  background-color: #d4edda;
}`,
    markdown: `# Test Documentation

## Overview
This is a test markdown file for testing purposes.

## Features
- Feature 1: Authentication
- Feature 2: API Integration
- Feature 3: Real-time Updates

## Code Example
\`\`\`typescript
const example = {
  name: 'test',
  value: 123
};
\`\`\`

## Links
- [Documentation](https://example.com/docs)
- [API Reference](https://example.com/api)
`
  };
}

/**
 * Real binary test files
 */
export async function createBinaryTestFiles(baseDir: string): Promise<void> {
  // Create a real image file (1x1 pixel PNG)
  const pngBuffer = Buffer.from(
    "89504e470d0a1a0a0000000d494844520000000100000001080600000" +
    "01f15c4890000000d49444154785e6300010000000500010d0a2db400" +
    "00000049454e44ae426082",
    'hex'
  );
  await fileAPI.createFile(path.join(baseDir, 'test.png'), { type: FileType.TEMPORARY });
  
  // Create a real PDF file (minimal valid PDF)
  const pdfContent = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Times-Roman >> >> >> /MediaBox [0 0 612 792] /Contents 4 0 R >>
endobj
4 0 obj
<< /Length 44 >>
stream
BT
/F1 12 Tf
100 700 Td
(Test PDF) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000274 00000 n
trailer
<< /Size 5 /Root 1 0 R >>
startxref
365
%%EOF`;
  await fileAPI.createFile(path.join(baseDir, 'test.pdf'), { type: FileType.TEMPORARY });
  
  // Create a real ZIP file
  const zipBuffer = Buffer.from(
    "504b03041400000008000000210000000000000000000000000000000000" +
    "05001c0074657374732f555409000300000000000000007578110000000" +
    "000504b0506000000000100010043000000370000000000",
    'hex'
  );
  await fileAPI.createFile(path.join(baseDir, 'test.zip'), { type: FileType.TEMPORARY });
}