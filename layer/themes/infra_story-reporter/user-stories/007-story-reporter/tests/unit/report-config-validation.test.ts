import { validateReportConfig, createDefaultReportConfig } from '../../src/domain/report-config';

describe('Report Config Validation', () => {
  describe('validateReportConfig', () => {
    it('should validate valid minimal configuration', () => {
      const validConfig = {
        title: 'Test Report',
        description: 'A test report'
      };
      
      expect(() => validateReportConfig(validConfig)).not.toThrow();
    });

    it('should validate empty configuration object', () => {
      const emptyConfig = {};
      
      expect(() => validateReportConfig(emptyConfig)).not.toThrow();
    });

    it('should throw error for null configuration', () => {
      expect(() => validateReportConfig(null)).toThrow('Invalid report config: Configuration must be an object');
    });

    it('should throw error for undefined configuration', () => {
      expect(() => validateReportConfig(undefined)).toThrow('Invalid report config: Configuration must be an object');
    });

    it('should throw error for non-object configuration', () => {
      expect(() => validateReportConfig('string')).toThrow('Invalid report config: Configuration must be an object');
      expect(() => validateReportConfig(123)).toThrow('Invalid report config: Configuration must be an object');
      expect(() => validateReportConfig([])).toThrow('Invalid report config: Configuration must be an object');
    });

    describe('title validation', () => {
      it('should accept valid string title', () => {
        const config = { title: 'Valid Title' };
        expect(() => validateReportConfig(config)).not.toThrow();
      });

      it('should accept undefined title', () => {
        const config = { title: undefined };
        expect(() => validateReportConfig(config)).not.toThrow();
      });

      it('should throw error for non-string title', () => {
        const config = { title: 123 };
        expect(() => validateReportConfig(config)).toThrow('Invalid report config: title must be a string');
      });

      it('should throw error for boolean title', () => {
        const config = { title: true };
        expect(() => validateReportConfig(config)).toThrow('Invalid report config: title must be a string');
      });
    });

    describe('description validation', () => {
      it('should accept valid string description', () => {
        const config = { description: 'Valid description' };
        expect(() => validateReportConfig(config)).not.toThrow();
      });

      it('should accept undefined description', () => {
        const config = { description: undefined };
        expect(() => validateReportConfig(config)).not.toThrow();
      });

      it('should throw error for non-string description', () => {
        const config = { description: 456 };
        expect(() => validateReportConfig(config)).toThrow('Invalid report config: description must be a string');
      });

      it('should throw error for array description', () => {
        const config = { description: ['description'] };
        expect(() => validateReportConfig(config)).toThrow('Invalid report config: description must be a string');
      });
    });

    describe('includeScreenshots validation', () => {
      it('should accept valid boolean includeScreenshots', () => {
        const config = { includeScreenshots: true };
        expect(() => validateReportConfig(config)).not.toThrow();
        
        const config2 = { includeScreenshots: false };
        expect(() => validateReportConfig(config2)).not.toThrow();
      });

      it('should accept undefined includeScreenshots', () => {
        const config = { includeScreenshots: undefined };
        expect(() => validateReportConfig(config)).not.toThrow();
      });

      it('should throw error for non-boolean includeScreenshots', () => {
        const config = { includeScreenshots: 'true' };
        expect(() => validateReportConfig(config)).toThrow('Invalid report config: includeScreenshots must be a boolean');
      });

      it('should throw error for number includeScreenshots', () => {
        const config = { includeScreenshots: 1 };
        expect(() => validateReportConfig(config)).toThrow('Invalid report config: includeScreenshots must be a boolean');
      });
    });

    describe('includeLogs validation', () => {
      it('should accept valid boolean includeLogs', () => {
        const config = { includeLogs: true };
        expect(() => validateReportConfig(config)).not.toThrow();
        
        const config2 = { includeLogs: false };
        expect(() => validateReportConfig(config2)).not.toThrow();
      });

      it('should accept undefined includeLogs', () => {
        const config = { includeLogs: undefined };
        expect(() => validateReportConfig(config)).not.toThrow();
      });

      it('should throw error for non-boolean includeLogs', () => {
        const config = { includeLogs: 'false' };
        expect(() => validateReportConfig(config)).toThrow('Invalid report config: includeLogs must be a boolean');
      });

      it('should throw error for object includeLogs', () => {
        const config = { includeLogs: {} };
        expect(() => validateReportConfig(config)).toThrow('Invalid report config: includeLogs must be a boolean');
      });
    });

    describe('fileNamePattern validation', () => {
      it('should accept valid string fileNamePattern', () => {
        const config = { fileNamePattern: 'report-{timestamp}' };
        expect(() => validateReportConfig(config)).not.toThrow();
      });

      it('should accept undefined fileNamePattern', () => {
        const config = { fileNamePattern: undefined };
        expect(() => validateReportConfig(config)).not.toThrow();
      });

      it('should throw error for non-string fileNamePattern', () => {
        const config = { fileNamePattern: 123 };
        expect(() => validateReportConfig(config)).toThrow('Invalid report config: fileNamePattern must be a string');
      });

      it('should accept null fileNamePattern (undefined equivalent)', () => {
        const config = { fileNamePattern: null };
        expect(() => validateReportConfig(config)).not.toThrow();
      });
    });

    describe('jsonFormatting validation', () => {
      it('should accept valid object jsonFormatting', () => {
        const config = { jsonFormatting: { indent: 2, sortKeys: true } };
        expect(() => validateReportConfig(config)).not.toThrow();
      });

      it('should accept empty object jsonFormatting', () => {
        const config = { jsonFormatting: {} };
        expect(() => validateReportConfig(config)).not.toThrow();
      });

      it('should accept undefined jsonFormatting', () => {
        const config = { jsonFormatting: undefined };
        expect(() => validateReportConfig(config)).not.toThrow();
      });

      it('should throw error for non-object jsonFormatting', () => {
        const config = { jsonFormatting: 'invalid' };
        expect(() => validateReportConfig(config)).toThrow('Invalid report config: jsonFormatting must be an object');
      });

      it('should throw error for array jsonFormatting', () => {
        const config = { jsonFormatting: [] };
        expect(() => validateReportConfig(config)).toThrow('Invalid report config: jsonFormatting must be an object');
      });
    });

    describe('htmlStyling validation', () => {
      it('should accept valid object htmlStyling', () => {
        const config = { htmlStyling: { theme: 'dark', customCSS: 'body { color: red; }' } };
        expect(() => validateReportConfig(config)).not.toThrow();
      });

      it('should accept empty object htmlStyling', () => {
        const config = { htmlStyling: {} };
        expect(() => validateReportConfig(config)).not.toThrow();
      });

      it('should accept undefined htmlStyling', () => {
        const config = { htmlStyling: undefined };
        expect(() => validateReportConfig(config)).not.toThrow();
      });

      it('should throw error for non-object htmlStyling', () => {
        const config = { htmlStyling: 'invalid' };
        expect(() => validateReportConfig(config)).toThrow('Invalid report config: htmlStyling must be an object');
      });

      it('should throw error for boolean htmlStyling', () => {
        const config = { htmlStyling: true };
        expect(() => validateReportConfig(config)).toThrow('Invalid report config: htmlStyling must be an object');
      });
    });

    describe('xmlFormatting validation', () => {
      it('should accept valid object xmlFormatting', () => {
        const config = { xmlFormatting: { indent: 4, encoding: 'UTF-8', standalone: true } };
        expect(() => validateReportConfig(config)).not.toThrow();
      });

      it('should accept empty object xmlFormatting', () => {
        const config = { xmlFormatting: {} };
        expect(() => validateReportConfig(config)).not.toThrow();
      });

      it('should accept undefined xmlFormatting', () => {
        const config = { xmlFormatting: undefined };
        expect(() => validateReportConfig(config)).not.toThrow();
      });

      it('should throw error for non-object xmlFormatting', () => {
        const config = { xmlFormatting: 'invalid' };
        expect(() => validateReportConfig(config)).toThrow('Invalid report config: xmlFormatting must be an object');
      });

      it('should throw error for number xmlFormatting', () => {
        const config = { xmlFormatting: 123 };
        expect(() => validateReportConfig(config)).toThrow('Invalid report config: xmlFormatting must be an object');
      });
    });

    describe('complex configuration validation', () => {
      it('should validate In Progress valid configuration', () => {
        const complexConfig = {
          title: 'Comprehensive Test Report',
          description: 'A detailed test execution report',
          includeScreenshots: true,
          includeLogs: false,
          fileNamePattern: 'report-{date}-{time}',
          jsonFormatting: {
            indent: 2,
            sortKeys: true
          },
          htmlStyling: {
            theme: 'light',
            customCSS: 'body { font-family: Arial; }',
            includeBootstrap: true
          },
          xmlFormatting: {
            indent: 4,
            encoding: 'UTF-8',
            standalone: false
          },
          metadata: {
            author: 'Test Author',
            version: '1.0.0',
            tags: ['regression', 'smoke']
          }
        };
        
        expect(() => validateReportConfig(complexConfig)).not.toThrow();
      });

      it('should fail on mixed valid and invalid fields', () => {
        const mixedConfig = {
          title: 'Valid Title',
          description: 123, // Invalid: should be string
          includeScreenshots: true,
          includeLogs: 'invalid' // Invalid: should be boolean
        };
        
        expect(() => validateReportConfig(mixedConfig)).toThrow('Invalid report config: description must be a string');
      });
    });
  });

  describe('createDefaultReportConfig', () => {
    it('should create a valid default configuration', () => {
      const defaultConfig = createDefaultReportConfig();
      
      expect(() => validateReportConfig(defaultConfig)).not.toThrow();
      expect(defaultConfig).toHaveProperty('title');
      expect(defaultConfig).toHaveProperty('description');
      expect(defaultConfig).toHaveProperty('includeScreenshots');
      expect(defaultConfig).toHaveProperty('includeLogs');
      expect(defaultConfig).toHaveProperty('fileNamePattern');
      expect(defaultConfig).toHaveProperty('jsonFormatting');
      expect(defaultConfig).toHaveProperty('htmlStyling');
      expect(defaultConfig).toHaveProperty('xmlFormatting');
    });

    it('should create configuration with expected default values', () => {
      const defaultConfig = createDefaultReportConfig();
      
      expect(defaultConfig.title).toBe('Mock Free Test Oriented Development Test Report');
      expect(defaultConfig.description).toBe('Automated Mock Free Test Oriented Development test execution results');
      expect(defaultConfig.includeScreenshots).toBe(false);
      expect(defaultConfig.includeLogs).toBe(true);
      expect(defaultConfig.fileNamePattern).toBe('{testSuiteId}-{timestamp}-{format}');
      expect(defaultConfig.jsonFormatting?.indent).toBe(2);
      expect(defaultConfig.htmlStyling?.theme).toBe('light');
      expect(defaultConfig.xmlFormatting?.indent).toBe(2);
    });
  });
});