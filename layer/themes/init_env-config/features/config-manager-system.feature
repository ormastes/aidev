Feature: ConfigManager System Management
  As a system administrator
  I want to manage environment configurations
  So that I can deploy services across different environments

  Background:
    Given a temporary test directory
    And a ConfigManager instance

  Scenario: Load configuration from file system
    Given a configuration file with theme, epic, demo, and release environments
    When I initialize the ConfigManager
    Then it should load all theme names correctly
    And it should contain "aidev-portal", "chat-space", and "cli-framework" themes

  Scenario: Handle all environment types
    Given a complete environment configuration
    When I request configuration for each environment type
    Then each environment should have a defined name
    And each environment should have a valid port range
    And each environment should have defined services

  Scenario: Manage port allocation across environments
    Given configured environments with different port ranges
    When I request service ports for each environment
    Then theme portal should be on port 3001
    And epic portal should be on port 3101
    And demo portal should be on port 3201
    And release portal should be on port 8001
    And all ports should be unique

  Scenario: Check port availability
    Given configured port ranges for environments
    When I check port availability
    Then allocated ports should be unavailable
    And unallocated ports within range should be available
    And ports outside ranges should be unavailable

  Scenario: Find next available ports
    Given environment port ranges
    When I request next available port for each environment
    Then theme ports should be between 3000 and 3099
    And epic ports should be between 3100 and 3199

  Scenario: Generate database configuration for production
    Given a release environment setup
    When I request postgres database configuration
    Then it should have localhost host
    And it should have port 5432
    And it should have database name "prod_ai_dev_portal"
    And it should have user "prod_user"
    And it should have password "prod_pass_2024"
    And SSL should be disabled

  Scenario: Generate database configuration for development
    Given development environments (theme and demo)
    When I request sqlite database configuration
    Then theme config should have theme database path
    And demo config should have demo database path
    And the paths should be different

  Scenario: Generate environment files for all services
    Given all service types and environments
    When I generate environment files
    Then each file should contain NODE_ENV variable
    And each file should contain SERVICE_NAME variable
    And each file should contain PORT variable
    And each file should contain appropriate database configuration
    And release environment should use postgres
    And other environments should use sqlite

  Scenario: Handle custom port and database options
    Given custom configuration options
    When I generate environment file with custom port 3999 and postgres
    Then the file should contain PORT=3999
    And the file should contain DB_TYPE=postgres
    And the file should contain DB_HOST=localhost

  Scenario: Save environment files to filesystem
    Given an environment configuration
    When I save an environment file to disk
    Then the file should exist on filesystem
    And the file should contain correct environment variables

  Scenario: Manage inter-theme dependencies
    Given theme connection configuration
    When I request theme connections
    Then aidev-portal should connect to story-reporter and gui-selector
    And chat-space should connect to auth-service
    And cli-framework should connect to external-log-lib

  Scenario: Handle themes without connections
    Given a non-existent theme
    When I request its connections
    Then it should return an empty array

  Scenario: Provide complete theme list
    Given configured themes
    When I request all themes
    Then it should return exactly 3 themes
    And the list should be ["aidev-portal", "chat-space", "cli-framework"]

  Scenario: Resolve base paths for environments
    Given environment configurations
    When I request base paths for all environments
    Then theme path should contain "layer/themes"
    And epic path should contain "layer/epic"
    And demo path should contain "demo"
    And release path should contain "release"
    And all paths should be absolute

  Scenario: Handle missing configuration gracefully
    Given an invalid configuration directory
    When I try to initialize ConfigManager
    Then it should throw an error

  Scenario: Handle port range exhaustion
    Given a configuration with limited port range
    When I request next available port
    Then it should return null when no ports are available

  Scenario: Work with actual project structure
    Given the real project configuration exists
    When I initialize ConfigManager with project root
    Then it should load themes successfully
    And it should provide environment configuration