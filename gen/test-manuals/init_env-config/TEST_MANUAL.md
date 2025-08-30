# Test Manual - init_env-config

**Generated**: 2025-08-28 00:57:47
**Theme Path**: `layer/themes/init_env-config/`

## Overview

This manual documents all tests for the init_env-config theme. It provides a comprehensive guide for understanding test coverage, test scenarios, and testing procedures.

## Theme Information

- **Type**: init
- **Component**: env-config

## Test Structure

- **Unit Tests**: 2 files
- **Integration Tests**: 1 files
- **System Tests**: 2 files

## Test Documentation

### Unit Tests

## Test File: config-manager.test.ts

**Path**: `layer/themes/init_env-config/tests/unit/config-manager.test.ts`

### Test Suites

- **ConfigManager**
- **constructor**
- **createEnvironment**
- **getEnvironment**
- **updateEnvironment**
- **deleteEnvironment**
- **listEnvironments**
- **addService**
- **removeService**
- **exportEnvironment**
- **utility methods**
- **suggestEnvironmentName**
- **environmentExists**
- **validateConfig**

### Test Cases

#### should create instance with provided dependencies

**Purpose**: This test verifies that should create instance with provided dependencies

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should use default config base path if not provided

**Purpose**: This test verifies that should use default config base path if not provided

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should create new environment successfully

**Purpose**: This test verifies that should create new environment successfully

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should create release environment with postgresql

**Purpose**: This test verifies that should create release environment with postgresql

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should return environment from memory store

**Purpose**: This test verifies that should return environment from memory store

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should load environment from disk if not in memory

**Purpose**: This test verifies that should load environment from disk if not in memory

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should return null if environment not found

**Purpose**: This test verifies that should return null if environment not found

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should update existing environment

**Purpose**: This test verifies that should update existing environment

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should throw error if environment not found

**Purpose**: This test verifies that should throw error if environment not found

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should delete existing environment

**Purpose**: This test verifies that should delete existing environment

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should return false if environment not found

**Purpose**: This test verifies that should return false if environment not found

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should list all environments

**Purpose**: This test verifies that should list all environments

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should filter environments by type

**Purpose**: This test verifies that should filter environments by type

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should return empty array if directory does not exist

**Purpose**: This test verifies that should return empty array if directory does not exist

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should add service to environment

**Purpose**: This test verifies that should add service to environment

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should throw error if environment not found

**Purpose**: This test verifies that should throw error if environment not found

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should remove service from environment

**Purpose**: This test verifies that should remove service from environment

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should return false if service not found

**Purpose**: This test verifies that should return false if service not found

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should export environment as JSON

**Purpose**: This test verifies that should export environment as JSON

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should export environment as env format

**Purpose**: This test verifies that should export environment as env format

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should throw error for unsupported format

**Purpose**: This test verifies that should throw error for unsupported format

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should suggest unique environment name

**Purpose**: This test verifies that should suggest unique environment name

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should return true if environment exists

**Purpose**: This test verifies that should return true if environment exists

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should return false if environment does not exist

**Purpose**: This test verifies that should return false if environment does not exist

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should validate valid config

**Purpose**: This test verifies that should validate valid config

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should reject invalid config

**Purpose**: This test verifies that should reject invalid config

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should reject config without name

**Purpose**: This test verifies that should reject config without name

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

---

## Test File: env-config-core.test.ts

**Path**: `layer/themes/init_env-config/tests/unit/env-config-core.test.ts`

### Test Suites

- **Environment Configuration Theme - Core Functionality**
- **pipe gateway**
- **environment variable management**
- **configuration file management**
- **environment detection**
- **secret management**
- **configuration caching**
- **configuration hot-reloading**
- **configuration templating**

### Test Cases

#### should export theme functionality through pipe

**Purpose**: This test verifies that should export theme functionality through pipe

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should read environment variables with defaults

**Purpose**: This test verifies that should read environment variables with defaults

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should validate required environment variables

**Purpose**: This test verifies that should validate required environment variables

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should parse environment variables by type

**Purpose**: This test verifies that should parse environment variables by type

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should load configuration from files

**Purpose**: This test verifies that should load configuration from files

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should merge environment variables with config files

**Purpose**: This test verifies that should merge environment variables with config files

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should validate configuration schemas

**Purpose**: This test verifies that should validate configuration schemas

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should detect development vs production environment

**Purpose**: This test verifies that should detect development vs production environment

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should provide environment-specific configurations

**Purpose**: This test verifies that should provide environment-specific configurations

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle sensitive configuration data

**Purpose**: This test verifies that should handle sensitive configuration data

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should validate environment variable naming conventions

**Purpose**: This test verifies that should validate environment variable naming conventions

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should cache configuration to avoid repeated parsing

**Purpose**: This test verifies that should cache configuration to avoid repeated parsing

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should invalidate cache when configuration changes

**Purpose**: This test verifies that should invalidate cache when configuration changes

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should support watching configuration file changes

**Purpose**: This test verifies that should support watching configuration file changes

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should support variable interpolation in config values

**Purpose**: This test verifies that should support variable interpolation in config values

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

---

## Test File: config-manager-additional.utest.ts

**Path**: `layer/themes/init_env-config/user-stories/025-env-config-system/tests/unit/config-manager-additional.utest.ts`

### Test Suites

- **ConfigManager Additional Unit Tests**
- **Error handling**
- **Export functionality**
- **Import functionality**
- **Service management edge cases**
- **Validation functionality**
- **Configuration validation**
- **Environment existence check**
- **Port-based environment lookup**
- **Clone functionality edge cases**
- **Database configuration**
- **Delete environment edge cases**
- **Export as Docker Compose**
- **Environment name suggestion**

### Test Cases

#### should throw error when updating non-existent environment

**Purpose**: This test verifies that should throw error when updating non-existent environment

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should throw error when deleting non-existent environment

**Purpose**: This test verifies that should throw error when deleting non-existent environment

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should throw error when exporting non-existent environment

**Purpose**: This test verifies that should throw error when exporting non-existent environment

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should throw error when cloning non-existent source environment

**Purpose**: This test verifies that should throw error when cloning non-existent source environment

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle port allocation failure

**Purpose**: This test verifies that should handle port allocation failure

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle file generation failure

**Purpose**: This test verifies that should handle file generation failure

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should export environment as env format

**Purpose**: This test verifies that should export environment as env format

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should throw error for YAML export (not implemented)

**Purpose**: This test verifies that should throw error for YAML export (not implemented)

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should throw error for unsupported export format

**Purpose**: This test verifies that should throw error for unsupported export format

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should export using exportAsEnv shorthand

**Purpose**: This test verifies that should export using exportAsEnv shorthand

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should throw not implemented error for import

**Purpose**: This test verifies that should throw not implemented error for import

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should return false when removing non-existent service

**Purpose**: This test verifies that should return false when removing non-existent service

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should return false when removing service from non-existent environment

**Purpose**: This test verifies that should return false when removing service from non-existent environment

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle service addition failure

**Purpose**: This test verifies that should handle service addition failure

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should return validation errors for non-existent environment

**Purpose**: This test verifies that should return validation errors for non-existent environment

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should return validation errors from file generator

**Purpose**: This test verifies that should return validation errors from file generator

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should validate valid configuration

**Purpose**: This test verifies that should validate valid configuration

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should reject configuration without name

**Purpose**: This test verifies that should reject configuration without name

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should reject configuration without type

**Purpose**: This test verifies that should reject configuration without type

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should reject configuration with invalid type

**Purpose**: This test verifies that should reject configuration with invalid type

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should return true for existing environment

**Purpose**: This test verifies that should return true for existing environment

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should return false for non-existent environment

**Purpose**: This test verifies that should return false for non-existent environment

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should find environment by service port

**Purpose**: This test verifies that should find environment by service port

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should return null for unknown port

**Purpose**: This test verifies that should return null for unknown port

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should clone environment with different type

**Purpose**: This test verifies that should clone environment with different type

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle clone failure gracefully

**Purpose**: This test verifies that should handle clone failure gracefully

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should use PostgreSQL for release environment

**Purpose**: This test verifies that should use PostgreSQL for release environment

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should use SQLite for test environment

**Purpose**: This test verifies that should use SQLite for test environment

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should use SQLite for epic environment

**Purpose**: This test verifies that should use SQLite for epic environment

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle port release failure during deletion

**Purpose**: This test verifies that should handle port release failure during deletion

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should export environment as docker compose

**Purpose**: This test verifies that should export environment as docker compose

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should throw error when exporting non-existent env as docker compose

**Purpose**: This test verifies that should throw error when exporting non-existent env as docker compose

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should suggest unique environment name

**Purpose**: This test verifies that should suggest unique environment name

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should suggest first name when no environments exist

**Purpose**: This test verifies that should suggest first name when no environments exist

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle gaps in numbering

**Purpose**: This test verifies that should handle gaps in numbering

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should only consider environments of the same type

**Purpose**: This test verifies that should only consider environments of the same type

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

---

## Test File: config-manager.utest.ts

**Path**: `layer/themes/init_env-config/user-stories/025-env-config-system/tests/unit/config-manager.utest.ts`

### Test Suites

- **ConfigManager Unit Test**

### Test Cases

#### should create new environment with allocated ports

**Purpose**: This test verifies that should create new environment with allocated ports

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should store and retrieve environment configuration

**Purpose**: This test verifies that should store and retrieve environment configuration

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should return null for non-existent environment

**Purpose**: This test verifies that should return null for non-existent environment

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should update environment configuration

**Purpose**: This test verifies that should update environment configuration

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should add service to environment

**Purpose**: This test verifies that should add service to environment

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should remove service from environment

**Purpose**: This test verifies that should remove service from environment

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should delete environment and release ports

**Purpose**: This test verifies that should delete environment and release ports

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should list all environments

**Purpose**: This test verifies that should list all environments

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should list environments by type

**Purpose**: This test verifies that should list environments by type

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should find environment by port

**Purpose**: This test verifies that should find environment by port

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should export environment in JSON format

**Purpose**: This test verifies that should export environment in JSON format

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should validate environment configuration

**Purpose**: This test verifies that should validate environment configuration

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should clone environment with new name

**Purpose**: This test verifies that should clone environment with new name

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle database configuration for different types

**Purpose**: This test verifies that should handle database configuration for different types

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

---

## Test File: file-generator.utest.ts

**Path**: `layer/themes/init_env-config/user-stories/025-env-config-system/tests/unit/file-generator.utest.ts`

### Test Suites

- **FileGenerator Unit Test**

### Test Cases

#### should create all required directories

**Purpose**: This test verifies that should create all required directories

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should generate .env file with correct content

**Purpose**: This test verifies that should generate .env file with correct content

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should generate docker-compose.yml with portal service

**Purpose**: This test verifies that should generate docker-compose.yml with portal service

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should generate config.json with In Progress structure

**Purpose**: This test verifies that should generate config.json with In Progress structure

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should create service file when adding service

**Purpose**: This test verifies that should create service file when adding service

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should update .env file with new service port

**Purpose**: This test verifies that should update .env file with new service port

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should update docker-compose.yml with new services

**Purpose**: This test verifies that should update docker-compose.yml with new services

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should validate correct file structure

**Purpose**: This test verifies that should validate correct file structure

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should detect invalid file structure

**Purpose**: This test verifies that should detect invalid file structure

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle PostgreSQL database configuration

**Purpose**: This test verifies that should handle PostgreSQL database configuration

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

---

## Test File: port-allocator.utest.ts

**Path**: `layer/themes/init_env-config/user-stories/025-env-config-system/tests/unit/port-allocator.utest.ts`

### Test Suites

- **PortAllocator Unit Test**

### Test Cases

#### should get correct port configuration for environment types

**Purpose**: This test verifies that should get correct port configuration for environment types

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should validate port is within correct range for environment type

**Purpose**: This test verifies that should validate port is within correct range for environment type

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should allocate base port for new environment

**Purpose**: This test verifies that should allocate base port for new environment

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should allocate next available port when base is taken

**Purpose**: This test verifies that should allocate next available port when base is taken

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should check if port is available

**Purpose**: This test verifies that should check if port is available

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should find next available port in range

**Purpose**: This test verifies that should find next available port in range

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should return null when no ports available in range

**Purpose**: This test verifies that should return null when no ports available in range

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should allocate service port within environment range

**Purpose**: This test verifies that should allocate service port within environment range

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should release all environment ports

**Purpose**: This test verifies that should release all environment ports

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should reserve specific port manually

**Purpose**: This test verifies that should reserve specific port manually

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should get port usage summary

**Purpose**: This test verifies that should get port usage summary

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle release environment with Working on port

**Purpose**: This test verifies that should handle release environment with Working on port

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

---

## Test File: port-registry.utest.ts

**Path**: `layer/themes/init_env-config/user-stories/025-env-config-system/tests/unit/port-registry.utest.ts`

### Test Suites

- **PortRegistry Unit Test**

### Test Cases

#### should initialize empty registry file if not exists

**Purpose**: This test verifies that should initialize empty registry file if not exists

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should register new port allocation

**Purpose**: This test verifies that should register new port allocation

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should get all used ports

**Purpose**: This test verifies that should get all used ports

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should get ports for specific environment

**Purpose**: This test verifies that should get ports for specific environment

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should remove all allocations for an environment

**Purpose**: This test verifies that should remove all allocations for an environment

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle concurrent access with file locking

**Purpose**: This test verifies that should handle concurrent access with file locking

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle corrupted registry file gracefully

**Purpose**: This test verifies that should handle corrupted registry file gracefully

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should update lastUpdated timestamp on modifications

**Purpose**: This test verifies that should update lastUpdated timestamp on modifications

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

---

## Test File: env-generator-impl.utest.ts

**Path**: `layer/themes/init_env-config/user-stories/026-auto-env-generation/tests/unit/env-generator-impl.utest.ts`

### Test Suites

- **EnvGeneratorImpl Coverage Tests**
- **generateDatabaseConfig**
- **validateEnvVariables**
- **writeEnvFile**
- **generateEnvFile with database config**

### Test Cases

#### should generate PostgreSQL config with all fields

**Purpose**: This test verifies that should generate PostgreSQL config with all fields

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should generate PostgreSQL config with defaults

**Purpose**: This test verifies that should generate PostgreSQL config with defaults

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should generate SQLite config

**Purpose**: This test verifies that should generate SQLite config

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should validate correct env variables

**Purpose**: This test verifies that should validate correct env variables

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should reject missing required variables

**Purpose**: This test verifies that should reject missing required variables

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should reject duplicate keys

**Purpose**: This test verifies that should reject duplicate keys

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should reject invalid key format

**Purpose**: This test verifies that should reject invalid key format

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should reject keys starting with number

**Purpose**: This test verifies that should reject keys starting with number

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should write env file with correct format

**Purpose**: This test verifies that should write env file with correct format

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle write errors gracefully

**Purpose**: This test verifies that should handle write errors gracefully

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should include database configuration in generated env file

**Purpose**: This test verifies that should include database configuration in generated env file

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should format env content correctly with categories

**Purpose**: This test verifies that should format env content correctly with categories

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

---

### Integration Tests

## Test File: pipe-integration.test.ts

**Path**: `layer/themes/init_env-config/tests/integration/pipe-integration.test.ts`

### Test Suites

- **env-config pipe integration**
- **module exports**
- **pipe gateway**
- **theme isolation**
- **env-config theme integration**

### Test Cases

#### should export pipe module

**Purpose**: This test verifies that should export pipe module

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should have correct export structure

**Purpose**: This test verifies that should have correct export structure

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should provide controlled access to theme functionality

**Purpose**: This test verifies that should provide controlled access to theme functionality

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should not expose internal implementation details

**Purpose**: This test verifies that should not expose internal implementation details

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should be accessible through theme architecture

**Purpose**: This test verifies that should be accessible through theme architecture

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should follow HEA architecture principles

**Purpose**: This test verifies that should follow HEA architecture principles

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

---

## Test File: config-manager-port-allocator.itest.ts

**Path**: `layer/themes/init_env-config/user-stories/025-env-config-system/tests/integration/config-manager-port-allocator.itest.ts`

### Test Suites

- **ConfigManager and PortAllocator Integration Test**

### Test Cases

#### should allocate ports automatically when creating new environment

**Purpose**: This test verifies that should allocate ports automatically when creating new environment

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should allocate different ports for multiple environments

**Purpose**: This test verifies that should allocate different ports for multiple environments

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle port allocation for services

**Purpose**: This test verifies that should handle port allocation for services

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should release ports when deleting environment

**Purpose**: This test verifies that should release ports when deleting environment

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should validate port ranges for different environment types

**Purpose**: This test verifies that should validate port ranges for different environment types

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

---

## Test File: file-generator-config.itest.ts

**Path**: `layer/themes/init_env-config/user-stories/025-env-config-system/tests/integration/file-generator-config.itest.ts`

### Test Suites

- **FileGenerator Configuration Files Integration Test**

### Test Cases

#### should generate valid .env file with all required variables

**Purpose**: This test verifies that should generate valid .env file with all required variables

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should generate valid docker-compose.yml

**Purpose**: This test verifies that should generate valid docker-compose.yml

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should generate valid config.json with proper structure

**Purpose**: This test verifies that should generate valid config.json with proper structure

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should create all required directories

**Purpose**: This test verifies that should create all required directories

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should update files when adding services

**Purpose**: This test verifies that should update files when adding services

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should validate generated files

**Purpose**: This test verifies that should validate generated files

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

---

## Test File: port-allocator-registry.itest.ts

**Path**: `layer/themes/init_env-config/user-stories/025-env-config-system/tests/integration/port-allocator-registry.itest.ts`

### Test Suites

- **PortAllocator and PortRegistry Integration Test**

### Test Cases

#### should persist port allocations to registry file

**Purpose**: This test verifies that should persist port allocations to registry file

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should load existing allocations from registry on startup

**Purpose**: This test verifies that should load existing allocations from registry on startup

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle concurrent registry updates safely

**Purpose**: This test verifies that should handle concurrent registry updates safely

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should update registry when releasing ports

**Purpose**: This test verifies that should update registry when releasing ports

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should maintain registry integrity across restarts

**Purpose**: This test verifies that should maintain registry integrity across restarts

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle registry corruption gracefully

**Purpose**: This test verifies that should handle registry corruption gracefully

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

---

## Test File: config-manager-env-generator.itest.ts

**Path**: `layer/themes/init_env-config/user-stories/026-auto-env-generation/tests/integration/config-manager-env-generator.itest.ts`

### Test Suites

- **Integration: ConfigManager with EnvGenerator**
- **exportAsEnv integration**
- **port allocation integration**
- **environment-specific configuration**
- **service discovery integration**
- **complete workflow**
- **error handling**

### Test Cases

#### should generate complete .env file with ConfigManager data

**Purpose**: This test verifies that should generate complete .env file with ConfigManager data

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should use EnvGenerator for security tokens and service URLs

**Purpose**: This test verifies that should use EnvGenerator for security tokens and service URLs

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should allocate ports through ConfigManager and include in .env

**Purpose**: This test verifies that should allocate ports through ConfigManager and include in .env

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should generate different configs for different environment types

**Purpose**: This test verifies that should generate different configs for different environment types

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should include URLs for dependent services

**Purpose**: This test verifies that should include URLs for dependent services

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should support full environment setup workflow

**Purpose**: This test verifies that should support full environment setup workflow

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle missing environment gracefully

**Purpose**: This test verifies that should handle missing environment gracefully

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should validate configuration before generating .env

**Purpose**: This test verifies that should validate configuration before generating .env

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

---

## Test File: env-generator-service-discovery.itest.ts

**Path**: `layer/themes/init_env-config/user-stories/026-auto-env-generation/tests/integration/env-generator-service-discovery.itest.ts`

### Test Suites

- **Integration: EnvGenerator with ServiceDiscovery**
- **includeServiceUrls**
- **generateEnvFile with service discovery**
- **service health integration**
- **cross-environment service discovery**
- **service dependency chain**
- **dynamic service updates**
- **theme dependency integration**

### Test Cases

#### should include URLs for dependent services in .env file

**Purpose**: This test verifies that should include URLs for dependent services in .env file

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle HTTPS services correctly

**Purpose**: This test verifies that should handle HTTPS services correctly

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should skip non-existent services gracefully

**Purpose**: This test verifies that should skip non-existent services gracefully

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should automatically include dependent service URLs

**Purpose**: This test verifies that should automatically include dependent service URLs

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should use environment-specific service URLs

**Purpose**: This test verifies that should use environment-specific service URLs

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should only include healthy services in .env

**Purpose**: This test verifies that should only include healthy services in .env

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should add health check URLs for services

**Purpose**: This test verifies that should add health check URLs for services

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle services in different environments

**Purpose**: This test verifies that should handle services in different environments

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should resolve transitive dependencies

**Purpose**: This test verifies that should resolve transitive dependencies

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle service registration during env generation

**Purpose**: This test verifies that should handle service registration during env generation

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should include service URLs when themes depend on each other

**Purpose**: This test verifies that should include service URLs when themes depend on each other

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

---

## Test File: env-generator-token-service.itest.ts

**Path**: `layer/themes/init_env-config/user-stories/026-auto-env-generation/tests/integration/env-generator-token-service.itest.ts`

### Test Suites

- **Integration: EnvGenerator with TokenService**
- **generateEnvFile with security tokens**
- **generateSecurityTokens integration**
- **environment-specific token generation**
- **token rotation and updates**
- **error handling**
- **token format verification**
- **multi-environment token generation**
- **token persistence and uniqueness**
- **integration with specific token requirements**

### Test Cases

#### should include JWT secret token in generated .env file

**Purpose**: This test verifies that should include JWT secret token in generated .env file

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should include API key in generated .env file

**Purpose**: This test verifies that should include API key in generated .env file

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should generate unique tokens for each environment

**Purpose**: This test verifies that should generate unique tokens for each environment

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should use TokenService to generate all required security tokens

**Purpose**: This test verifies that should use TokenService to generate all required security tokens

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should validate generated tokens using TokenService

**Purpose**: This test verifies that should validate generated tokens using TokenService

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should respect token requirements from TokenService

**Purpose**: This test verifies that should respect token requirements from TokenService

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should generate environment-prefixed tokens for non-production

**Purpose**: This test verifies that should generate environment-prefixed tokens for non-production

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should use stronger tokens for release environment

**Purpose**: This test verifies that should use stronger tokens for release environment

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should support token rotation when updating .env file

**Purpose**: This test verifies that should support token rotation when updating .env file

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle TokenService failures gracefully

**Purpose**: This test verifies that should handle TokenService failures gracefully

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should generate tokens in correct format for each type

**Purpose**: This test verifies that should generate tokens in correct format for each type

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should generate tokens with appropriate lengths

**Purpose**: This test verifies that should generate tokens with appropriate lengths

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should generate different tokens for different environments

**Purpose**: This test verifies that should generate different tokens for different environments

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should include environment metadata in generated tokens

**Purpose**: This test verifies that should include environment metadata in generated tokens

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should ensure generated tokens are unique across multiple calls

**Purpose**: This test verifies that should ensure generated tokens are unique across multiple calls

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should validate token uniqueness using TokenService

**Purpose**: This test verifies that should validate token uniqueness using TokenService

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should generate environment-specific tokens via TokenService

**Purpose**: This test verifies that should generate environment-specific tokens via TokenService

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should properly integrate token prefixes when specified

**Purpose**: This test verifies that should properly integrate token prefixes when specified

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle token rotation through EnvGenerator

**Purpose**: This test verifies that should handle token rotation through EnvGenerator

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

---

### System Tests

## Test File: theme-creation-workflow.systest.ts

**Path**: `layer/themes/init_env-config/user-stories/025-env-config-system/tests/system/theme-creation-workflow.systest.ts`

### Test Suites

- **🚨 Story: Theme Creation Workflow System Test**

### Test Cases

#### should create new theme with automatic port allocation

**Purpose**: This test verifies that should create new theme with automatic port allocation

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should prevent port conflicts when creating multiple themes

**Purpose**: This test verifies that should prevent port conflicts when creating multiple themes

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle different environment types correctly

**Purpose**: This test verifies that should handle different environment types correctly

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

---

## Test File: complete-env-generation.systest.ts

**Path**: `layer/themes/init_env-config/user-stories/026-auto-env-generation/tests/system/complete-env-generation.systest.ts`

### Test Suites

- **In Progress Environment Generation System Test**

### Test Cases

#### should generate In Progress .env file via CLI command

**Purpose**: This test verifies that should generate In Progress .env file via CLI command

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should generate different configs for different environments

**Purpose**: This test verifies that should generate different configs for different environments

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle service dependencies in env generation

**Purpose**: This test verifies that should handle service dependencies in env generation

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should validate generated env files

**Purpose**: This test verifies that should validate generated env files

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

---


## Testing Procedures

### Environment Setup

1. Install dependencies: `npm install`
2. Configure environment variables
3. Initialize test database (if applicable)
4. Start required services

### Running Tests

```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests
npm run test:integration

# Run system tests
npm run test:system

# Run with coverage
npm run test:coverage
```

### Test Data Management

- Test data location: `tests/fixtures/`
- Mock data: `tests/mocks/`
- Test configuration: `tests/config/`

### Continuous Integration

Tests are automatically run on:
- Pull request creation
- Push to main branch
- Nightly builds

## Coverage Requirements

- **Unit Test Coverage**: Minimum 90%
- **Integration Test Coverage**: Minimum 80%
- **System Test Coverage**: Critical paths only

## Troubleshooting

### Common Issues

1. **Test Timeout**
   - Increase timeout in test configuration
   - Check network connectivity
   - Verify service availability

2. **Test Data Issues**
   - Reset test database
   - Clear test cache
   - Regenerate fixtures

3. **Environment Issues**
   - Verify environment variables
   - Check service configurations
   - Review dependency versions

---
*Generated by test-as-manual documentation system*
