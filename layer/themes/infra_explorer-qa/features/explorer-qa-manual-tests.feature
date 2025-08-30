Feature: Explorer-qa Infrastructure Manual Tests
  As an infrastructure engineer
  I want to manually test explorer-qa infrastructure
  So that I can ensure system reliability and performance

  @manual @deployment
  Scenario: Manual deployment verification
    Given the explorer-qa infrastructure is deployed
    When the tester manually verifies:
      | Deployment Aspect          | Verification Method             |
      | Service availability      | Check all endpoints             |
      | Configuration validity    | Review all config files         |
      | Resource allocation       | Monitor CPU/memory usage        |
      | Network connectivity      | Test all connections            |
    Then deployment should be successful
    And all services should be operational

  @manual @monitoring
  Scenario: Manual monitoring and logging verification
    Given the explorer-qa monitoring is active
    When the tester checks:
      | Monitoring Area            | Expected Behavior               |
      | Log generation            | Logs created with proper format  |
      | Metric collection         | All metrics being collected      |
      | Alert configuration       | Alerts trigger correctly         |
      | Dashboard visibility      | All dashboards accessible        |
    Then monitoring should be fully functional
    And all metrics should be within normal ranges

  @manual @recovery
  Scenario: Manual disaster recovery testing
    Given the explorer-qa system is running
    When the tester simulates failures:
      | Failure Type              | Recovery Expectation             |
      | Service crash             | Auto-restart within 30 seconds   |
      | Network interruption      | Graceful degradation             |
      | Data corruption           | Rollback to last known good      |
      | Resource exhaustion       | Proper error handling            |
    Then recovery mechanisms should activate
    And system should return to normal operation
