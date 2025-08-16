describe('Environment Setup', () => {
  test('Node.js version is compatible', () => {
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
    expect(majorVersion).toBeGreaterThanOrEqual(16);
  });

  test('TypeScript is available', () => {
    const typescript = require('typescript');
    expect(typescript).toBeDefined();
    expect(typescript.version).toBeDefined();
  });

  test('Jest is configured correctly', () => {
    expect(jest).toBeDefined();
    expect(typeof jest.fn).toBe('function');
  });

  test('Project structure exists', () => {
    const fs = require('fs');
    const path = require('path');
    
    const requiredFiles = [
      'package.json',
      'tsconfig.json',
      'jest.config.js',
      '.eslintrc.js'
    ];

    requiredFiles.forEach(file => {
      const filePath = path.join(process.cwd(), file);
      expect(fs.existsSync(filePath)).toBe(true);
    });
  });
});