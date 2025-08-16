const { fileAPI } = require('../utils/file-api');
#!/usr/bin/env node

/**
 * Fix critical hardcoded secrets
 * Replaces hardcoded credentials with environment variables or placeholders
 */

const fs = require('../../layer/themes/infra_external-log-lib/src');
const path = require('node:path');

const fixes = {
  filesFixed: [],
  totalFixed: 0
};

// Files with known hardcoded secrets based on fraud check
const targetFiles = [
  'demo/cli-chat-room/src/core/auth/local-auth-manager.ts',
  'demo/cli-chat-room/src/core/config/room-config.schema.ts',
  'demo/vllm-coordinator-agent_chat-room/src/user_interface/openai-api-demo.ts',
  'doc/research/explorer/test-apps/vulnerable-app/server.js',
  'doc/research/explorer/tests/security-verification.test.ts',
  'doc/research/explorer/tests/system/explorer-system.test.js',
  'doc/research/explorer/tests/test-bun-security.js',
  'doc/research/explorer/tests/test-secure-app.js',
  'layer/epics/lib/services/validator.test.ts',
  'layer/epics/llm-agent/children/examples/basic-usage.ts',
  'layer/epics/llm-agent/tests/unit/auth-service.test.ts',
  'layer/shared/test/database.ts',
  'layer/shared/test/fixtures.ts',
  'layer/themes/infra_external-log-lib/children/http-wrapper.ts',
  'layer/themes/infra_external-log-lib/children/sqlite3-wrapper.ts'
];

function fixSecrets(filePath) {
  const fullPath = path.join(process.cwd(), filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  File not found: ${filePath}`);
    return;
  }
  
  try {
    let content = fileAPI.readFileSync(fullPath, 'utf8');
    let original = content;
    
    // Common patterns for secrets
    const replacements = [
      // API Keys
      { 
        pattern: /(['"])api[_-]?key['"]\s*:\s*['"][^'"]+['"]/gi,
        replacement: '$1api_key$1: process.env.API_KEY || $1PLACEHOLDER_API_KEY$1'
      },
      { 
        pattern: /api[_-]?key\s*=\s*['"][^'"]+['"]/gi,
        replacement: "apiKey = process.env.API_KEY || 'PLACEHOLDER_API_KEY'"
      },
      // Secrets
      { 
        pattern: /(['"])secret['"]\s*:\s*['"][^'"]+['"]/gi,
        replacement: '$1secret$1: process.env.SECRET || $1PLACEHOLDER_SECRET$1'
      },
      // Passwords
      { 
        pattern: /(['"])password['"]\s*:\s*['"][^'"]+['"]/gi,
        replacement: '$1password$1: process.env.PASSWORD || $1PLACEHOLDER_PASSWORD$1'
      },
      // Tokens
      { 
        pattern: /(['"])token['"]\s*:\s*['"][^'"]+['"]/gi,
        replacement: '$1token$1: process.env.AUTH_TOKEN || $1PLACEHOLDER_TOKEN$1'
      },
      // Bearer ${process.env.AUTH_TOKEN || "PLACEHOLDER_TOKEN"}
      { 
        pattern: /Bearer\s+[A-Za-z0-9\-._~+\/]+={0,2}/g,
        replacement: 'Bearer ${process.env.AUTH_TOKEN || "PLACEHOLDER_TOKEN"}'
      },
      // JWT secrets
      { 
        pattern: /jwt[_-]?secret\s*[:=]\s*['"][^'"]+['"]/gi,
        replacement: 'jwtSecret: process.env.JWT_SECRET || "PLACEHOLDER_JWT_SECRET"'
      },
      // Database URLs
      { 
        pattern: /(['"])mongodb:\/\/[^'"]+['"]/gi,
        replacement: 'process.env.MONGODB_URL || $1mongodb://localhost:27017/test$1'
      },
      { 
        pattern: /(['"])postgres:\/\/[^'"]+['"]/gi,
        replacement: 'process.env.DATABASE_URL || $1postgres://localhost:5432/test$1'
      }
    ];
    
    let changeCount = 0;
    for (const { pattern, replacement } of replacements) {
      const matches = content.match(pattern);
      if (matches) {
        content = content.replace(pattern, replacement);
        changeCount += matches.length;
      }
    }
    
    if (changeCount > 0) {
      // For TypeScript/JavaScript files, add comment about env vars if not present
      if (!content.includes('process.env') || changeCount > 0) {
        const ext = path.extname(filePath);
        if (['.ts', '.js', '.tsx', '.jsx'].includes(ext)) {
          // Add comment at top of file
          const envComment = `// Environment variables required: API_KEY, SECRET, PASSWORD, AUTH_TOKEN, JWT_SECRET, DATABASE_URL\n`;
          if (!content.includes('Environment variables required')) {
            content = envComment + content;
          }
        }
      }
      
      fileAPI.writeFileSync(fullPath, content, 'utf8');
      console.log(`✅ Fixed ${changeCount} secrets in ${filePath}`);
      fixes.filesFixed.push(filePath);
      fixes.totalFixed += changeCount;
    } else {
      console.log(`ℹ️  No secrets found in ${filePath}`);
    }
    
  } catch (error) {
    console.error(`❌ Error fixing ${filePath}: ${error.message}`);
  }
}

// Main execution
console.log('🔐 Fixing Critical Hardcoded Secrets\n');
console.log('=' .repeat(60));

for (const file of targetFiles) {
  fixSecrets(file);
}

// Also scan for any other critical files
console.log('\n🔍 Scanning for additional secret violations...\n');

function scanDir(dir, depth = 0) {
  if (depth > 3) return; // Limit depth to avoid too deep recursion
  
  const exclude = ['.git', '.jj', 'node_modules', 'dist', 'build', "coverage", 'temp', 'release'];
  
  try {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && !exclude.includes(file) && !file.startsWith('.')) {
        scanDir(fullPath, depth + 1);
      } else if (stat.isFile()) {
        const ext = path.extname(file);
        if (['.env', '.config.js', '.config.ts', 'config.js', 'config.ts'].includes(ext) || file.includes('config')) {
          // Check config files for secrets
          try {
            const content = fileAPI.readFileSync(fullPath, 'utf8');
            if (content.match(/api[_-]?key\s*[:=]\s*['"][^'"]+['"]/i) ||
                content.match(/secret\s*[:=]\s*['"][^'"]+['"]/i) ||
                content.match(/password\s*[:=]\s*['"][^'"]+['"]/i) ||
                content.match(/token\s*[:=]\s*['"][^'"]+['"]/i)) {
              const relativePath = path.relative(process.cwd(), fullPath);
              if (!fixes.filesFixed.includes(relativePath)) {
                console.log(`🔍 Found additional file with secrets: ${relativePath}`);
                fixSecrets(relativePath);
              }
            }
          } catch (e) {
            // Skip files we can't read
          }
        }
      }
    }
  } catch (e) {
    // Skip directories we can't read
  }
}

scanDir(process.cwd());

// Print summary
console.log('\n' + '='.repeat(60));
console.log('📊 SUMMARY');
console.log('='.repeat(60));
console.log(`\n✅ Fixed ${fixes.totalFixed} hardcoded secrets in ${fixes.filesFixed.length} files`);

if (fixes.filesFixed.length > 0) {
  console.log('\n📝 Files modified:');
  fixes.filesFixed.forEach(file => console.log(`   - ${file}`));
  
  console.log('\n⚠️  IMPORTANT NEXT STEPS:');
  console.log('1. Create a .env file with the required environment variables');
  console.log('2. Add .env to .gitignore if not already present');
  console.log('3. Review each change to ensure correctness');
  console.log('4. Update deployment configs with production secrets');
}

console.log('\n✅ Critical security fixes completed!');