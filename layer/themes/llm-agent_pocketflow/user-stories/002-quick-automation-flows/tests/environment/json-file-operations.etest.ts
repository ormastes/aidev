import { describe, test, expect, beforeEach } from '@jest/globals';

describe('JSON File Operations Environment Test', () => {
  const testDir = path.join(__dirname, 'test-json-dir');
  const testFile = path.join(testDir, 'test-data.json');

  beforeEach(() => {
    // Clean up and create test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
    fs.mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
  });

  test('should write and read JSON data In Progress', () => {
    // Arrange
    const testData = {
      name: 'Test Flow',
      enabled: true,
      actions: ['action1', 'action2'],
      config: {
        timeout: 5000,
        retries: 3
      }
    };

    // Act - Write
    fs.writeFileSync(testFile, JSON.stringify(testData, null, 2));

    // Act - Read
    const fileContent = fs.readFileSync(testFile, 'utf8');
    const parsedData = JSON.parse(fileContent);

    // Assert
    expect(parsedData).toEqual(testData);
    expect(parsedData.name).toBe('Test Flow');
    expect(parsedData.actions).toHaveLength(2);
  });

  test('should handle empty JSON file', () => {
    // Arrange
    const emptyData = {};

    // Act
    fs.writeFileSync(testFile, JSON.stringify(emptyData));
    const fileContent = fs.readFileSync(testFile, 'utf8');
    const parsedData = JSON.parse(fileContent);

    // Assert
    expect(parsedData).toEqual({});
  });

  test('should handle large JSON structures', () => {
    // Arrange
    const largeData = {
      flows: Array.from({ length: 100 }, (_, i) => ({
        id: `flow-${i}`,
        name: `Flow ${i}`,
        description: 'A'.repeat(500),
        actions: Array.from({ length: 10 }, (_, j) => ({
          type: 'command',
          command: `echo "Action ${j}"`,
          timeout: 1000
        }))
      }))
    };

    // Act
    fs.writeFileSync(testFile, JSON.stringify(largeData, null, 2));
    const fileContent = fs.readFileSync(testFile, 'utf8');
    const parsedData = JSON.parse(fileContent);

    // Assert
    expect(parsedData.flows).toHaveLength(100);
    expect(parsedData.flows[0].actions).toHaveLength(10);
    expect(parsedData.flows[99].id).toBe('flow-99');
  });

  test('should preserve data types correctly', () => {
    // Arrange
    const complexData = {
      string: 'text value',
      number: 42,
      float: 3.14159,
      boolean: true,
      null: null,
      array: [1, 'two', false, null],
      nested: {
        deep: {
          value: 'deeply nested'
        }
      },
      date: new Date().toISOString()
    };

    // Act
    fs.writeFileSync(testFile, JSON.stringify(complexData, null, 2));
    const fileContent = fs.readFileSync(testFile, 'utf8');
    const parsedData = JSON.parse(fileContent);

    // Assert
    expect(typeof parsedData.string).toBe('string');
    expect(typeof parsedData.number).toBe('number');
    expect(typeof parsedData.float).toBe('number');
    expect(typeof parsedData.boolean).toBe('boolean');
    expect(parsedData.null).toBeNull();
    expect(Array.isArray(parsedData.array)).toBe(true);
    expect(parsedData.nested.deep.value).toBe('deeply nested');
  });

  test('should handle special characters in JSON', () => {
    // Arrange
    const specialData = {
      quotes: 'He said "Hello"',
      backslash: 'Path\\to\\file',
      newline: 'Line1\nLine2',
      tab: 'Col1\tCol2',
      unicode: '😀 Unicode emoji',
      special: '<>&\'"'
    };

    // Act
    fs.writeFileSync(testFile, JSON.stringify(specialData, null, 2));
    const fileContent = fs.readFileSync(testFile, 'utf8');
    const parsedData = JSON.parse(fileContent);

    // Assert
    expect(parsedData.quotes).toBe('He said "Hello"');
    expect(parsedData.backslash).toBe('Path\\to\\file');
    expect(parsedData.newline).toBe('Line1\nLine2');
    expect(parsedData.unicode).toBe('😀 Unicode emoji');
  });

  test('should handle file not found gracefully', () => {
    // Arrange
    const nonExistentFile = path.join(testDir, 'does-not-exist.json');

    // Act & Assert
    expect(() => {
      fs.readFileSync(nonExistentFile, 'utf8');
    }).toThrow();
  });

  test('should handle invalid JSON gracefully', () => {
    // Arrange
    const invalidJson = '{ "name": "Test", "invalid": }';
    fs.writeFileSync(testFile, invalidJson);

    // Act & Assert
    expect(() => {
      const content = fs.readFileSync(testFile, 'utf8');
      JSON.parse(content);
    }).toThrow(SyntaxError);
  });

  test('should support atomic write operations', () => {
    // Arrange
    const originalData = { version: 1, data: "original" };
    const updatedData = { version: 2, data: 'updated' };
    
    // Write original
    fs.writeFileSync(testFile, JSON.stringify(originalData));

    // Act - Atomic write pattern
    const tempFile = testFile + '.tmp';
    fs.writeFileSync(tempFile, JSON.stringify(updatedData));
    fs.renameSync(tempFile, testFile);

    // Assert
    const finalContent = fs.readFileSync(testFile, 'utf8');
    const finalData = JSON.parse(finalContent);
    expect(finalData.version).toBe(2);
    expect(finalData.data).toBe('updated');
  });

  test('should handle concurrent read operations', () => {
    // Arrange
    const testData = { concurrent: true, value: 42 };
    fs.writeFileSync(testFile, JSON.stringify(testData));

    // Act - Multiple concurrent reads
    const promises = Array.from({ length: 10 }, () => 
      new Promise((resolve) => {
        const content = fs.readFileSync(testFile, 'utf8');
        resolve(JSON.parse(content));
      })
    );

    // Assert
    return Promise.all(promises).then(results => {
      results.forEach(result => {
        expect(result).toEqual(testData);
      });
    });
  });

  test('should preserve formatting with pretty print', () => {
    // Arrange
    const formattedData = {
      name: 'Formatted Flow',
      actions: [
        { type: 'command', value: 'echo test' }
      ]
    };

    // Act
    fs.writeFileSync(testFile, JSON.stringify(formattedData, null, 2));
    const content = fs.readFileSync(testFile, 'utf8');

    // Assert - Check formatting
    expect(content).toContain('\n');
    expect(content).toContain('  '); // Indentation
    expect(content.split('\n').length).toBeGreaterThan(1);
  });
});