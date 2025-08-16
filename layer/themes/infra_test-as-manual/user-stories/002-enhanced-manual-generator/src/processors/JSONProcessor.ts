/**
 * JSON Processor for generating structured JSON documentation
 * Provides machine-readable format with schema validation
 */

import { TestDocument, ProcessorResult, ManualGeneratorOptions } from '../core/types';

export interface JSONOutput {
  version: string;
  schema: string;
  document: TestDocument;
  metadata: {
    generator: string;
    generatorVersion: string;
    generatedAt: string;
    options: ManualGeneratorOptions;
  };
  statistics: {
    totalSuites: number;
    totalTestCases: number;
    totalSteps: number;
    priorityDistribution: Record<string, number>;
    typeDistribution: Record<string, number>;
    estimatedDuration: number;
  };
}

export class JSONProcessor {
  private options: ManualGeneratorOptions;
  private schemaVersion: string = '1.0.0';

  constructor(options: ManualGeneratorOptions = {}) {
    this.options = options;
  }

  /**
   * Process document to JSON format
   */
  async process(document: TestDocument): Promise<ProcessorResult> {
    try {
      const jsonOutput = this.generateJSON(document);
      const jsonString = JSON.stringify(jsonOutput, null, 2);
      
      // Validate against schema if required
      if (this.options.supportMultipleFormats) {
        const isValid = this.validateSchema(jsonOutput);
        if (!isValid) {
          return {
            success: false,
            error: 'JSON output failed schema validation'
          };
        }
      }
      
      return {
        success: true,
        output: jsonString,
        format: 'json'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'JSON processing failed'
      };
    }
  }

  /**
   * Generate JSON output
   */
  private generateJSON(document: TestDocument): JSONOutput {
    const statistics = this.calculateStatistics(document);
    
    const output: JSONOutput = {
      version: this.schemaVersion,
      schema: 'https://schema.enhanced-manual-generator.com/v1/test-document.json',
      document: this.sanitizeDocument(document),
      metadata: {
        generator: 'Enhanced Manual Generator',
        generatorVersion: '2.0.0',
        generatedAt: new Date().toISOString(),
        options: this.options
      },
      statistics
    };
    
    return output;
  }

  /**
   * Sanitize document for JSON output
   */
  private sanitizeDocument(document: TestDocument): TestDocument {
    // Deep clone to avoid modifying original
    const sanitized = JSON.parse(JSON.stringify(document));
    
    // Ensure dates are strings
    if (sanitized.generatedAt) {
      sanitized.generatedAt = new Date(sanitized.generatedAt).toISOString();
    }
    
    if (sanitized.metadata) {
      if (sanitized.metadata.createdAt) {
        sanitized.metadata.createdAt = new Date(sanitized.metadata.createdAt).toISOString();
      }
      if (sanitized.metadata.updatedAt) {
        sanitized.metadata.updatedAt = new Date(sanitized.metadata.updatedAt).toISOString();
      }
    }
    
    // Process sections recursively
    if (sanitized.sections) {
      sanitized.sections = this.processSections(sanitized.sections);
    }
    
    return sanitized;
  }

  /**
   * Process sections recursively
   */
  private processSections(sections: any[]): any[] {
    return sections.map(section => {
      const processed = { ...section };
      
      // Ensure content is string
      if (processed.content && typeof processed.content !== 'string') {
        processed.content = String(processed.content);
      }
      
      // Process test cases
      if (processed.testCases) {
        processed.testCases = processed.testCases.map((testCase: any) => ({
          ...testCase,
          steps: testCase.steps.map((step: any) => {
            const processedStep = { ...step };
            
            // Ensure screenshot paths are relative
            if (processedStep.screenshot && processedStep.screenshot.filePath) {
              processedStep.screenshot.filePath = this.makeRelativePath(processedStep.screenshot.filePath);
            }
            
            // Ensure timestamp is string
            if (processedStep.screenshot && processedStep.screenshot.timestamp) {
              processedStep.screenshot.timestamp = new Date(processedStep.screenshot.timestamp).toISOString();
            }
            
            return processedStep;
          })
        }));
      }
      
      // Process subsections recursively
      if (processed.subsections) {
        processed.subsections = this.processSections(processed.subsections);
      }
      
      return processed;
    });
  }

  /**
   * Calculate statistics from document
   */
  private calculateStatistics(document: TestDocument): JSONOutput["statistics"] {
    let totalSuites = 0;
    let totalTestCases = 0;
    let totalSteps = 0;
    const priorityDistribution: Record<string, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0
    };
    const typeDistribution: Record<string, number> = {
      action: 0,
      assertion: 0,
      setup: 0,
      teardown: 0
    };
    
    // Count from test structure
    if (document.test) {
      totalSuites = document.test.suites.length;
      
      document.test.suites.forEach(suite => {
        totalTestCases += suite.testCases.length;
        
        suite.testCases.forEach(testCase => {
          // Count priority
          if (testCase.priority) {
            priorityDistribution[testCase.priority]++;
          }
          
          // Count steps and types
          totalSteps += testCase.steps.length;
          testCase.steps.forEach(step => {
            if (step.type) {
              typeDistribution[step.type]++;
            }
          });
        });
        
        // Count child suites
        if (suite.childSuites) {
          totalSuites += suite.childSuites.length;
          suite.childSuites.forEach(childSuite => {
            totalTestCases += childSuite.testCases.length;
          });
        }
      });
    }
    
    // Count from sections
    document.sections.forEach(section => {
      if (section.testCases) {
        section.testCases.forEach(testCase => {
          if (testCase.priority) {
            priorityDistribution[testCase.priority]++;
          }
          testCase.steps.forEach(step => {
            if (step.type) {
              typeDistribution[step.type]++;
            }
          });
        });
      }
    });
    
    return {
      totalSuites,
      totalTestCases,
      totalSteps,
      priorityDistribution,
      typeDistribution,
      estimatedDuration: document.metadata?.estimatedDuration || 0
    };
  }

  /**
   * Make file path relative
   */
  private makeRelativePath(filePath: string): string {
    // Remove absolute path prefix if present
    if (filePath.startsWith('/')) {
      const parts = filePath.split('/');
      // Keep only the last few parts that are relevant
      return parts.slice(-3).join('/');
    }
    return filePath;
  }

  /**
   * Validate JSON against schema
   */
  private validateSchema(output: JSONOutput): boolean {
    // Basic validation - in production, use a JSON schema validator like ajv
    if (!output.version || !output.schema || !output.document) {
      return false;
    }
    
    if (!output.document.id || !output.document.title) {
      return false;
    }
    
    if (!output.metadata || !output.statistics) {
      return false;
    }
    
    return true;
  }

  /**
   * Generate JSON schema for validation
   */
  static getSchema(): object {
    return {
      "$schema": "http://json-schema.org/draft-07/schema#",
      "title": "Test Document Schema",
      "type": "object",
      "required": ["version", "schema", "document", "metadata", "statistics"],
      "properties": {
        "version": {
          "type": "string",
          "pattern": "^\\d+\\.\\d+\\.\\d+$"
        },
        "schema": {
          "type": "string",
          "format": "uri"
        },
        "document": {
          "type": "object",
          "required": ["id", "title", "generatedAt", "test", "metadata", "sections"],
          "properties": {
            "id": { "type": "string" },
            "title": { "type": "string" },
            "version": { "type": "string" },
            "generatedAt": { "type": "string", "format": "date-time" },
            "test": {
              "type": "object",
              "required": ["id", "name", "type", "suites"],
              "properties": {
                "id": { "type": "string" },
                "name": { "type": "string" },
                "description": { "type": "string" },
                "filePath": { "type": "string" },
                "type": {
                  "type": "string",
                  "enum": ["unit", "integration", "e2e", "bdd"]
                },
                "suites": {
                  "type": "array",
                  "items": {
                    "type": "object",
                    "required": ["id", "name", "testCases"],
                    "properties": {
                      "id": { "type": "string" },
                      "name": { "type": "string" },
                      "description": { "type": "string" },
                      "testCases": {
                        "type": "array",
                        "items": {
                          "type": "object",
                          "required": ["id", "name", "steps"],
                          "properties": {
                            "id": { "type": "string" },
                            "name": { "type": "string" },
                            "description": { "type": "string" },
                            "steps": {
                              "type": "array",
                              "items": {
                                "type": "object",
                                "required": ["id", "order", "type", "action"],
                                "properties": {
                                  "id": { "type": "string" },
                                  "order": { "type": "number" },
                                  "type": {
                                    "type": "string",
                                    "enum": ["action", "assertion", "setup", "teardown"]
                                  },
                                  "action": { "type": "string" },
                                  "expected": { "type": "string" },
                                  "actual": { "type": "string" },
                                  "data": {},
                                  "screenshot": {
                                    "type": "object",
                                    "properties": {
                                      "filePath": { "type": "string" },
                                      "caption": { "type": "string" },
                                      "timestamp": { "type": "string", "format": "date-time" },
                                      "annotations": {
                                        "type": "array",
                                        "items": {
                                          "type": "object",
                                          "properties": {
                                            "type": { "type": "string" },
                                            "coordinates": { "type": "object" },
                                            "text": { "type": "string" },
                                            "color": { "type": "string" }
                                          }
                                        }
                                      }
                                    }
                                  }
                                }
                              }
                            },
                            "preconditions": {
                              "type": "array",
                              "items": { "type": "string" }
                            },
                            "postconditions": {
                              "type": "array",
                              "items": { "type": "string" }
                            },
                            "category": { "type": "string" },
                            "priority": {
                              "type": "string",
                              "enum": ["critical", "high", "medium", "low"]
                            },
                            "tags": {
                              "type": "array",
                              "items": { "type": "string" }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            },
            "metadata": {
              "type": "object",
              "properties": {
                "author": { "type": "string" },
                "version": { "type": "string" },
                "createdAt": { "type": "string", "format": "date-time" },
                "updatedAt": { "type": "string", "format": "date-time" },
                "tags": {
                  "type": "array",
                  "items": { "type": "string" }
                },
                "requirements": {
                  "type": "array",
                  "items": { "type": "string" }
                },
                "dependencies": {
                  "type": "array",
                  "items": { "type": "string" }
                },
                "estimatedDuration": { "type": "number" },
                "coverage": {
                  "type": "object",
                  "properties": {
                    "lines": { "type": "number" },
                    "branches": { "type": "number" },
                    "functions": { "type": "number" },
                    "statements": { "type": "number" }
                  }
                }
              }
            },
            "sections": {
              "type": "array",
              "items": {
                "type": "object",
                "required": ["id", "title", "level", "content"],
                "properties": {
                  "id": { "type": "string" },
                  "title": { "type": "string" },
                  "level": { "type": "number" },
                  "content": { "type": "string" },
                  "subsections": { "$ref": "#/properties/document/properties/sections" },
                  "testCases": { "$ref": "#/properties/document/properties/test/properties/suites/items/properties/testCases" }
                }
              }
            },
            "tableOfContents": {
              "type": "array",
              "items": {
                "type": "object",
                "properties": {
                  "id": { "type": "string" },
                  "title": { "type": "string" },
                  "level": { "type": "number" },
                  "pageNumber": { "type": "number" },
                  "href": { "type": "string" },
                  "children": { "$ref": "#/properties/document/properties/tableOfContents" }
                }
              }
            },
            "index": {
              "type": "array",
              "items": {
                "type": "object",
                "properties": {
                  "term": { "type": "string" },
                  "references": {
                    "type": "array",
                    "items": { "type": "string" }
                  },
                  "pageNumbers": {
                    "type": "array",
                    "items": { "type": "number" }
                  }
                }
              }
            },
            "glossary": {
              "type": "array",
              "items": {
                "type": "object",
                "properties": {
                  "term": { "type": "string" },
                  "definition": { "type": "string" },
                  "relatedTerms": {
                    "type": "array",
                    "items": { "type": "string" }
                  }
                }
              }
            }
          }
        },
        "metadata": {
          "type": "object",
          "required": ["generator", "generatorVersion", "generatedAt", "options"],
          "properties": {
            "generator": { "type": "string" },
            "generatorVersion": { "type": "string" },
            "generatedAt": { "type": "string", "format": "date-time" },
            "options": { "type": "object" }
          }
        },
        "statistics": {
          "type": "object",
          "required": ["totalSuites", "totalTestCases", "totalSteps", "priorityDistribution", "typeDistribution", "estimatedDuration"],
          "properties": {
            "totalSuites": { "type": "number" },
            "totalTestCases": { "type": "number" },
            "totalSteps": { "type": "number" },
            "priorityDistribution": {
              "type": "object",
              "properties": {
                "critical": { "type": "number" },
                "high": { "type": "number" },
                "medium": { "type": "number" },
                "low": { "type": "number" }
              }
            },
            "typeDistribution": {
              "type": "object",
              "properties": {
                "action": { "type": "number" },
                "assertion": { "type": "number" },
                "setup": { "type": "number" },
                "teardown": { "type": "number" }
              }
            },
            "estimatedDuration": { "type": "number" }
          }
        }
      }
    };
  }
}

export default JSONProcessor;