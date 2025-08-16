#!/usr/bin/env node

/**
 * Input Sanitization Module
 * Provides comprehensive sanitization for file paths and content
 * to prevent injection attacks and security vulnerabilities
 */

class InputSanitizer {
  constructor() {
    // Dangerous patterns that should be blocked
    this.dangerousPatterns = {
      // Path traversal patterns
      pathTraversal: [
        /\.\./g,                    // Basic path traversal
        /\.\.%2f/gi,                // URL encoded
        /\.\.%252f/gi,              // Double URL encoded
        /\.\.\\/g,                  // Windows style
        /\.\.%5c/gi,                // URL encoded backslash
        /%2e%2e/gi,                 // Full URL encoding
        /\x00/g,                    // Null byte injection
        /%00/g,                     // URL encoded null byte
      ],
      
      // Command injection patterns
      commandInjection: [
        /[;&|`$(){}[\]<>]/g,        // Shell metacharacters
        /\$\{.*?\}/g,               // Template literals
        /\$\(.*?\)/g,               // Command substitution
        /`.*?`/g,                   // Backtick execution
      ],
      
      // Script injection patterns
      scriptInjection: [
        /<script[^>]*>.*?<\/script>/gi,    // Script tags
        /javascript:/gi,                    // JavaScript protocol
        /on\w+\s*=/gi,                      // Event handlers
        /<iframe[^>]*>/gi,                  // Iframes
        /<embed[^>]*>/gi,                   // Embed tags
        /<object[^>]*>/gi,                  // Object tags
        /data:text\/html/gi,                // Data URLs with HTML
      ],
      
      // SQL injection patterns
      sqlInjection: [
        /(\bor\b|\band\b)\s+[\w']+=[\w']+/gi,  // Basic SQL injection
        /union\s+select/gi,                     // Union select
        /drop\s+table/gi,                       // Drop table
        /insert\s+into/gi,                      // Insert into
        /--\s*$/gm,                             // SQL comments
      ],
      
      // File inclusion patterns
      fileInclusion: [
        /php:\/\//gi,               // PHP stream wrapper
        /file:\/\//gi,              // File protocol
        /data:\/\//gi,              // Data protocol
        /expect:\/\//gi,            // Expect wrapper
        /zip:\/\//gi,               // Zip wrapper
      ]
    };
    
    // Allowed characters for different contexts
    this.allowedChars = {
      fileName: /^[a-zA-Z0-9._-]+$/,
      filePath: /^[a-zA-Z0-9._\-\/]+$/,
      identifier: /^[a-zA-Z][a-zA-Z0-9_-]*$/,
      alphanumeric: /^[a-zA-Z0-9]+$/,
    };
    
    // Maximum lengths for different inputs
    this.maxLengths = {
      fileName: 255,
      filePath: 4096,
      purpose: 500,
      content: 1048576, // 1MB
    };
  }

  /**
   * Sanitize a file path
   * @param {string} path - The path to sanitize
   * @returns {Object} Result with sanitized path and issues found
   */
  sanitizePath(path) {
    const issues = [];
    let sanitized = path;
    
    // Check for null or undefined
    if (path == null) {
      return {
        sanitized: '',
        valid: false,
        issues: ['Path is null or undefined']
      };
    }
    
    // Convert to string and trim
    sanitized = String(sanitized).trim();
    
    // Check length
    if (sanitized.length > this.maxLengths.filePath) {
      issues.push(`Path exceeds maximum length of ${this.maxLengths.filePath}`);
      sanitized = sanitized.substring(0, this.maxLengths.filePath);
    }
    
    // Check for path traversal
    for (const pattern of this.dangerousPatterns.pathTraversal) {
      if (pattern.test(sanitized)) {
        issues.push('Path traversal attempt detected');
        sanitized = sanitized.replace(pattern, '');
      }
    }
    
    // Check for null bytes
    if (sanitized.includes('\x00') || sanitized.includes('%00')) {
      issues.push('Null byte injection detected');
      sanitized = sanitized.replace(/\x00|%00/g, '');
    }
    
    // Normalize path separators
    sanitized = sanitized.replace(/\\/g, '/');
    
    // Remove multiple slashes
    sanitized = sanitized.replace(/\/+/g, '/');
    
    // Remove leading slashes for relative paths
    if (!path.startsWith('/')) {
      sanitized = sanitized.replace(/^\/+/, '');
    }
    
    // Remove trailing slashes
    sanitized = sanitized.replace(/\/+$/, '');
    
    // Validate against allowed characters
    if (!this.allowedChars.filePath.test(sanitized)) {
      issues.push('Path contains invalid characters');
      // Remove invalid characters
      sanitized = sanitized.replace(/[^a-zA-Z0-9._\-\/]/g, '');
    }
    
    return {
      original: path,
      sanitized: sanitized,
      valid: issues.length === 0,
      issues: issues
    };
  }

  /**
   * Sanitize a file name
   * @param {string} fileName - The file name to sanitize
   * @returns {Object} Result with sanitized name and issues
   */
  sanitizeFileName(fileName) {
    const issues = [];
    let sanitized = String(fileName).trim();
    
    // Check length
    if (sanitized.length > this.maxLengths.fileName) {
      issues.push(`File name exceeds maximum length of ${this.maxLengths.fileName}`);
      sanitized = sanitized.substring(0, this.maxLengths.fileName);
    }
    
    // Validate against allowed characters
    if (!this.allowedChars.fileName.test(sanitized)) {
      issues.push('File name contains invalid characters');
      // Remove invalid characters
      sanitized = sanitized.replace(/[^a-zA-Z0-9._-]/g, '');
    }
    
    // Prevent hidden files (starting with dot)
    if (sanitized.startsWith('.') && sanitized !== '.gitignore') {
      issues.push('Hidden files are not allowed');
      sanitized = sanitized.substring(1);
    }
    
    return {
      original: fileName,
      sanitized: sanitized,
      valid: issues.length === 0,
      issues: issues
    };
  }

  /**
   * Sanitize file content
   * @param {string} content - The content to sanitize
   * @param {string} fileType - Type of file (js, html, md, etc.)
   * @returns {Object} Result with sanitized content and issues
   */
  sanitizeContent(content, fileType = 'text') {
    const issues = [];
    let sanitized = String(content);
    
    // Check length
    if (sanitized.length > this.maxLengths.content) {
      issues.push(`Content exceeds maximum length of ${this.maxLengths.content}`);
      sanitized = sanitized.substring(0, this.maxLengths.content);
    }
    
    // Type-specific sanitization
    switch (fileType) {
      case 'html':
      case 'md':
        // Check for script injection
        for (const pattern of this.dangerousPatterns.scriptInjection) {
          if (pattern.test(sanitized)) {
            issues.push('Script injection attempt detected');
            sanitized = sanitized.replace(pattern, '');
          }
        }
        break;
        
      case 'js':
      case 'ts':
        // Check for command injection in comments
        const commentPattern = /(\/\/.*|\/\*[\s\S]*?\*\/)/g;
        const comments = sanitized.match(commentPattern) || [];
        for (const comment of comments) {
          for (const pattern of this.dangerousPatterns.commandInjection) {
            if (pattern.test(comment)) {
              issues.push('Suspicious pattern in comment');
            }
          }
        }
        break;
        
      case 'json':
        // Validate JSON structure
        try {
          JSON.parse(sanitized);
        } catch (e) {
          issues.push('Invalid JSON structure');
        }
        break;
    }
    
    return {
      original: content,
      sanitized: sanitized,
      valid: issues.length === 0,
      issues: issues
    };
  }

  /**
   * Sanitize a purpose string
   * @param {string} purpose - The purpose to sanitize
   * @returns {Object} Result with sanitized purpose and issues
   */
  sanitizePurpose(purpose) {
    const issues = [];
    let sanitized = String(purpose).trim();
    
    // Check length
    if (sanitized.length > this.maxLengths.purpose) {
      issues.push(`Purpose exceeds maximum length of ${this.maxLengths.purpose}`);
      sanitized = sanitized.substring(0, this.maxLengths.purpose);
    }
    
    // Remove any HTML/script tags
    for (const pattern of this.dangerousPatterns.scriptInjection) {
      if (pattern.test(sanitized)) {
        issues.push('HTML/Script tags not allowed in purpose');
        sanitized = sanitized.replace(pattern, '');
      }
    }
    
    // Remove SQL injection attempts
    for (const pattern of this.dangerousPatterns.sqlInjection) {
      if (pattern.test(sanitized)) {
        issues.push('SQL patterns detected in purpose');
        sanitized = sanitized.replace(pattern, '');
      }
    }
    
    return {
      original: purpose,
      sanitized: sanitized,
      valid: issues.length === 0,
      issues: issues
    };
  }

  /**
   * Check if input contains any dangerous patterns
   * @param {string} input - The input to check
   * @returns {Object} Detection results
   */
  detectThreats(input) {
    const threats = [];
    const inputStr = String(input);
    
    // Check each category of dangerous patterns
    for (const [category, patterns] of Object.entries(this.dangerousPatterns)) {
      for (const pattern of patterns) {
        if (pattern.test(inputStr)) {
          threats.push({
            type: category,
            pattern: pattern.toString(),
            match: inputStr.match(pattern)[0]
          });
        }
      }
    }
    
    return {
      safe: threats.length === 0,
      threats: threats,
      threatLevel: this.calculateThreatLevel(threats)
    };
  }

  /**
   * Calculate threat level based on detected threats
   * @param {Array} threats - Array of detected threats
   * @returns {string} Threat level (none, low, medium, high, critical)
   */
  calculateThreatLevel(threats) {
    if (threats.length === 0) return 'none';
    
    const criticalTypes = ['pathTraversal', 'commandInjection'];
    const highTypes = ['scriptInjection', 'sqlInjection'];
    
    for (const threat of threats) {
      if (criticalTypes.includes(threat.type)) return 'critical';
      if (highTypes.includes(threat.type)) return 'high';
    }
    
    if (threats.length > 3) return 'medium';
    return 'low';
  }

  /**
   * Validate and sanitize all inputs for a file operation
   * @param {Object} inputs - Object containing path, content, purpose, etc.
   * @returns {Object} Sanitized inputs and validation results
   */
  sanitizeFileOperation(inputs) {
    const results = {
      valid: true,
      issues: [],
      sanitized: {}
    };
    
    // Sanitize path
    if (inputs.path) {
      const pathResult = this.sanitizePath(inputs.path);
      results.sanitized.path = pathResult.sanitized;
      if (!pathResult.valid) {
        results.valid = false;
        results.issues.push(...pathResult.issues.map(i => `Path: ${i}`));
      }
    }
    
    // Sanitize content
    if (inputs.content) {
      const fileType = inputs.path ? inputs.path.split('.').pop() : 'text';
      const contentResult = this.sanitizeContent(inputs.content, fileType);
      results.sanitized.content = contentResult.sanitized;
      if (!contentResult.valid) {
        results.valid = false;
        results.issues.push(...contentResult.issues.map(i => `Content: ${i}`));
      }
    }
    
    // Sanitize purpose
    if (inputs.purpose) {
      const purposeResult = this.sanitizePurpose(inputs.purpose);
      results.sanitized.purpose = purposeResult.sanitized;
      if (!purposeResult.valid) {
        results.valid = false;
        results.issues.push(...purposeResult.issues.map(i => `Purpose: ${i}`));
      }
    }
    
    // Copy over other safe fields
    const safeFields = ['category', 'tags', 'force', 'justification'];
    for (const field of safeFields) {
      if (inputs[field] !== undefined) {
        results.sanitized[field] = inputs[field];
      }
    }
    
    return results;
  }
}

// Export singleton instance
const sanitizer = new InputSanitizer();

module.exports = {
  InputSanitizer,
  sanitizer
};

// Testing
if (require.main === module) {
  console.log('Testing Input Sanitizer...\n');
  
  const testCases = [
    { path: '../../../etc/passwd' },
    { path: 'test.js; rm -rf /' },
    { path: 'file.php?../../config' },
    { content: '<script>alert("XSS")</script>', path: 'test.html' },
    { purpose: "'; DROP TABLE users; --" },
    { path: 'test\x00.txt' },
    { path: 'test%2e%2e%2f%2e%2e%2fetc%2fpasswd' }
  ];
  
  for (const testCase of testCases) {
    console.log('Testing:', testCase);
    const result = sanitizer.sanitizeFileOperation(testCase);
    console.log('Result:', result);
    console.log('---\n');
  }
  
  // Test threat detection
  const threats = [
    '../../../etc/passwd',
    '<script>alert(1)</script>',
    "'; DROP TABLE users; --",
    '$(rm -rf /)',
    'test.php?file=../../../../etc/passwd'
  ];
  
  console.log('Threat Detection Tests:\n');
  for (const threat of threats) {
    const result = sanitizer.detectThreats(threat);
    console.log(`Input: ${threat}`);
    console.log(`Threat Level: ${result.threatLevel}`);
    console.log(`Threats:`, result.threats);
    console.log('---\n');
  }
}