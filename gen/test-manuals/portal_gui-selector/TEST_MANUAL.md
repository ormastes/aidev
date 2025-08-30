# Test Manual - portal_gui-selector

**Generated**: 2025-08-28 00:58:02
**Theme Path**: `layer/themes/portal_gui-selector/`

## Overview

This manual documents all tests for the portal_gui-selector theme. It provides a comprehensive guide for understanding test coverage, test scenarios, and testing procedures.

## Theme Information

- **Type**: portal
- **Component**: gui-selector

## Test Structure

- **Unit Tests**: 20 files
- **Integration Tests**: 2 files
- **System Tests**: 4 files

## Test Documentation

### Unit Tests

## Test File: jwt-service.test.ts

**Path**: `layer/themes/portal_gui-selector/user-stories/023-gui-selector-server/tests/unit/jwt-service.test.ts`

### Test Suites

- **JWTService**
- **Access Token Operations**
- **Refresh Token Operations**
- **Token Differentiation**
- **Token Expiry**
- **Payload Validation**
- **Concurrent Operations**
- **Error Handling**

### Test Cases

#### should generate valid access tokens

**Purpose**: This test verifies that should generate valid access tokens

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should verify valid access tokens

**Purpose**: This test verifies that should verify valid access tokens

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should reject invalid access tokens

**Purpose**: This test verifies that should reject invalid access tokens

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should generate different tokens for different payloads

**Purpose**: This test verifies that should generate different tokens for different payloads

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should generate valid refresh tokens

**Purpose**: This test verifies that should generate valid refresh tokens

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should verify valid refresh tokens

**Purpose**: This test verifies that should verify valid refresh tokens

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should reject invalid refresh tokens

**Purpose**: This test verifies that should reject invalid refresh tokens

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should generate different refresh tokens for different payloads

**Purpose**: This test verifies that should generate different refresh tokens for different payloads

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should not allow cross-verification of token types

**Purpose**: This test verifies that should not allow cross-verification of token types

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should use different secrets for different token types

**Purpose**: This test verifies that should use different secrets for different token types

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should set appropriate expiry times

**Purpose**: This test verifies that should set appropriate expiry times

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should provide refresh token expiry date

**Purpose**: This test verifies that should provide refresh token expiry date

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle various user roles

**Purpose**: This test verifies that should handle various user roles

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle special characters in usernames

**Purpose**: This test verifies that should handle special characters in usernames

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle large user IDs

**Purpose**: This test verifies that should handle large user IDs

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle concurrent token generation

**Purpose**: This test verifies that should handle concurrent token generation

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle concurrent token verification

**Purpose**: This test verifies that should handle concurrent token verification

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should provide clear error messages

**Purpose**: This test verifies that should provide clear error messages

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

---

## Test File: auth.test.ts

**Path**: `layer/themes/portal_gui-selector/user-stories/023-gui-selector-server/tests/unit/middleware/auth.test.ts`

### Test Suites

- **auth middleware**
- **requireAuth**

### Test Cases

#### should call next() when userId is in session

**Purpose**: This test verifies that should call next() when userId is in session

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should return 401 when userId is not in session

**Purpose**: This test verifies that should return 401 when userId is not in session

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should return 401 when session is undefined

**Purpose**: This test verifies that should return 401 when session is undefined

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle different user IDs

**Purpose**: This test verifies that should handle different user IDs

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should not call next when userId is null

**Purpose**: This test verifies that should not call next when userId is null

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should not call next when userId is 0

**Purpose**: This test verifies that should not call next when userId is 0

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

---

## Test File: jwt-auth.test.ts

**Path**: `layer/themes/portal_gui-selector/user-stories/023-gui-selector-server/tests/unit/middleware/jwt-auth.test.ts`

### Test Suites

- **jwt-auth middleware**
- **authenticateJWT**
- **optionalJWT**
- **authorizeRole**

### Test Cases

#### should authenticate valid JWT token

**Purpose**: This test verifies that should authenticate valid JWT token

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should return 401 when no authorization header

**Purpose**: This test verifies that should return 401 when no authorization header

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should return 401 when no token after Bearer

**Purpose**: This test verifies that should return 401 when no token after Bearer

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should return 401 when authorization header has wrong format

**Purpose**: This test verifies that should return 401 when authorization header has wrong format

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should return 403 when token verification fails

**Purpose**: This test verifies that should return 403 when token verification fails

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle different token formats

**Purpose**: This test verifies that should handle different token formats

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should authenticate valid JWT token and set user

**Purpose**: This test verifies that should authenticate valid JWT token and set user

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should continue without error when no authorization header

**Purpose**: This test verifies that should continue without error when no authorization header

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should continue without setting user when token is invalid

**Purpose**: This test verifies that should continue without setting user when token is invalid

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should continue when authorization header has wrong format

**Purpose**: This test verifies that should continue when authorization header has wrong format

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should continue when no token after Bearer

**Purpose**: This test verifies that should continue when no token after Bearer

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle malformed authorization headers gracefully

**Purpose**: This test verifies that should handle malformed authorization headers gracefully

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should preserve existing req.user if already set

**Purpose**: This test verifies that should preserve existing req.user if already set

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should authorize user with correct role

**Purpose**: This test verifies that should authorize user with correct role

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should return 401 when user is not authenticated

**Purpose**: This test verifies that should return 401 when user is not authenticated

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should return 403 when user has insufficient permissions

**Purpose**: This test verifies that should return 403 when user has insufficient permissions

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle single role authorization

**Purpose**: This test verifies that should handle single role authorization

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle multiple role authorization

**Purpose**: This test verifies that should handle multiple role authorization

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should be case sensitive for roles

**Purpose**: This test verifies that should be case sensitive for roles

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle empty roles array

**Purpose**: This test verifies that should handle empty roles array

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

---

## Test File: apps.test.ts

**Path**: `layer/themes/portal_gui-selector/user-stories/023-gui-selector-server/tests/unit/routes/apps.test.ts`

### Test Suites

- **Apps Routes**
- **GET /api/apps**
- **GET /api/apps/:id**
- **POST /api/apps**
- **PUT /api/apps/:id**
- **DELETE /api/apps/:id**
- **POST /api/apps/validate-path**

### Test Cases

#### should list user apps

**Purpose**: This test verifies that should list user apps

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should list all apps for admin

**Purpose**: This test verifies that should list all apps for admin

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle database errors

**Purpose**: This test verifies that should handle database errors

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should get specific app owned by user

**Purpose**: This test verifies that should get specific app owned by user

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should reject access to app not owned by user

**Purpose**: This test verifies that should reject access to app not owned by user

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should return 404 for non-existent app

**Purpose**: This test verifies that should return 404 for non-existent app

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should allow admin to view any app

**Purpose**: This test verifies that should allow admin to view any app

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should create app with valid data

**Purpose**: This test verifies that should create app with valid data

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should create app without authentication for demo

**Purpose**: This test verifies that should create app without authentication for demo

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should skip path validation for demo paths

**Purpose**: This test verifies that should skip path validation for demo paths

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should validate real paths

**Purpose**: This test verifies that should validate real paths

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should require name

**Purpose**: This test verifies that should require name

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle database errors

**Purpose**: This test verifies that should handle database errors

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should update app owned by user

**Purpose**: This test verifies that should update app owned by user

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should reject update for app not owned by user

**Purpose**: This test verifies that should reject update for app not owned by user

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should return 404 for non-existent app

**Purpose**: This test verifies that should return 404 for non-existent app

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should delete app (admin only)

**Purpose**: This test verifies that should delete app (admin only)

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should reject deletion for non-admin

**Purpose**: This test verifies that should reject deletion for non-admin

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should validate existing directory

**Purpose**: This test verifies that should validate existing directory

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should validate non-existent path

**Purpose**: This test verifies that should validate non-existent path

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should validate file (not directory)

**Purpose**: This test verifies that should validate file (not directory)

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should require path parameter

**Purpose**: This test verifies that should require path parameter

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle filesystem errors

**Purpose**: This test verifies that should handle filesystem errors

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

---

## Test File: auth-jwt.test.ts

**Path**: `layer/themes/portal_gui-selector/user-stories/023-gui-selector-server/tests/unit/routes/auth-jwt.test.ts`

### Test Suites

- **JWT Auth Routes**
- **POST /api/v2/auth/token**
- **POST /api/v2/auth/refresh**
- **GET /api/v2/auth/verify**
- **POST /api/v2/auth/logout**
- **POST /api/v2/auth/register**

### Test Cases

#### should generate tokens for valid credentials

**Purpose**: This test verifies that should generate tokens for valid credentials

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should reject invalid credentials

**Purpose**: This test verifies that should reject invalid credentials

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should reject wrong password

**Purpose**: This test verifies that should reject wrong password

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should reject missing credentials

**Purpose**: This test verifies that should reject missing credentials

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle database errors

**Purpose**: This test verifies that should handle database errors

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should refresh tokens with valid refresh token

**Purpose**: This test verifies that should refresh tokens with valid refresh token

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should reject missing refresh token

**Purpose**: This test verifies that should reject missing refresh token

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should reject invalid refresh token

**Purpose**: This test verifies that should reject invalid refresh token

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should reject expired refresh token

**Purpose**: This test verifies that should reject expired refresh token

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should verify valid access token

**Purpose**: This test verifies that should verify valid access token

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should reject request without token

**Purpose**: This test verifies that should reject request without token

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should logout and invalidate refresh token

**Purpose**: This test verifies that should logout and invalidate refresh token

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle logout without refresh token

**Purpose**: This test verifies that should handle logout without refresh token

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should register new user successfully

**Purpose**: This test verifies that should register new user successfully

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should reject duplicate username

**Purpose**: This test verifies that should reject duplicate username

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should reject duplicate email

**Purpose**: This test verifies that should reject duplicate email

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should validate password length

**Purpose**: This test verifies that should validate password length

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should validate email format

**Purpose**: This test verifies that should validate email format

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

---

## Test File: auth.test.ts

**Path**: `layer/themes/portal_gui-selector/user-stories/023-gui-selector-server/tests/unit/routes/auth.test.ts`

### Test Suites

- **Auth Routes**
- **POST /api/auth/login**
- **POST /api/auth/logout**
- **POST /api/auth/register**
- **GET /api/auth/session**
- **Error handling**

### Test Cases

#### should successfully login with valid credentials

**Purpose**: This test verifies that should successfully login with valid credentials

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should reject login with invalid credentials

**Purpose**: This test verifies that should reject login with invalid credentials

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should reject login with non-existent user

**Purpose**: This test verifies that should reject login with non-existent user

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should reject login with missing credentials

**Purpose**: This test verifies that should reject login with missing credentials

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should reject login with missing password

**Purpose**: This test verifies that should reject login with missing password

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should successfully logout

**Purpose**: This test verifies that should successfully logout

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should successfully register a new user

**Purpose**: This test verifies that should successfully register a new user

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should reject registration with existing username

**Purpose**: This test verifies that should reject registration with existing username

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should reject registration with missing fields

**Purpose**: This test verifies that should reject registration with missing fields

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should hash the password before storing

**Purpose**: This test verifies that should hash the password before storing

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should return authenticated status when logged in

**Purpose**: This test verifies that should return authenticated status when logged in

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should return unauthenticated status when not logged in

**Purpose**: This test verifies that should return unauthenticated status when not logged in

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle bcrypt errors gracefully

**Purpose**: This test verifies that should handle bcrypt errors gracefully

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle registration errors gracefully

**Purpose**: This test verifies that should handle registration errors gracefully

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

---

## Test File: health.test.ts

**Path**: `layer/themes/portal_gui-selector/user-stories/023-gui-selector-server/tests/unit/routes/health.test.ts`

### Test Suites

- **health routes**
- **GET /health**
- **GET /health/ready**

### Test Cases

#### should return health status

**Purpose**: This test verifies that should return health status

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should use current timestamp

**Purpose**: This test verifies that should use current timestamp

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should use actual process uptime

**Purpose**: This test verifies that should use actual process uptime

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should return ready status when system is ready

**Purpose**: This test verifies that should return ready status when system is ready

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should check actual service readiness

**Purpose**: This test verifies that should check actual service readiness

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

---

## Test File: messages.test.ts

**Path**: `layer/themes/portal_gui-selector/user-stories/023-gui-selector-server/tests/unit/routes/messages.test.ts`

### Test Suites

- **Messages Routes**
- **POST /api/messages**
- **GET /api/messages**
- **GET /api/messages/:id**
- **DELETE /api/messages/:id**
- **DELETE /api/messages**
- **GET /api/messages/stats/summary**

### Test Cases

#### should save a message with text

**Purpose**: This test verifies that should save a message with text

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should save a message with type and data

**Purpose**: This test verifies that should save a message with type and data

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should use current timestamp if not provided

**Purpose**: This test verifies that should use current timestamp if not provided

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should reject message without text or type/data

**Purpose**: This test verifies that should reject message without text or type/data

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle database errors

**Purpose**: This test verifies that should handle database errors

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should retrieve messages with default pagination

**Purpose**: This test verifies that should retrieve messages with default pagination

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should support custom pagination

**Purpose**: This test verifies that should support custom pagination

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle database errors

**Purpose**: This test verifies that should handle database errors

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle missing count

**Purpose**: This test verifies that should handle missing count

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should retrieve specific message

**Purpose**: This test verifies that should retrieve specific message

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should return 404 for non-existent message

**Purpose**: This test verifies that should return 404 for non-existent message

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle database errors

**Purpose**: This test verifies that should handle database errors

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should delete specific message

**Purpose**: This test verifies that should delete specific message

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should return 404 for non-existent message

**Purpose**: This test verifies that should return 404 for non-existent message

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle database errors

**Purpose**: This test verifies that should handle database errors

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should clear all messages

**Purpose**: This test verifies that should clear all messages

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle no messages to delete

**Purpose**: This test verifies that should handle no messages to delete

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle database errors

**Purpose**: This test verifies that should handle database errors

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should retrieve message statistics

**Purpose**: This test verifies that should retrieve message statistics

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle database errors

**Purpose**: This test verifies that should handle database errors

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

---

## Test File: reports.test.ts

**Path**: `layer/themes/portal_gui-selector/user-stories/023-gui-selector-server/tests/unit/routes/reports.test.ts`

### Test Suites

- **Reports Routes**
- **GET /api/reports**
- **GET /api/reports/stats**
- **GET /api/reports/:id**
- **POST /api/reports/generate**
- **DELETE /api/reports/:id**
- **GET /api/reports/:id/download**
- **Report Type Details**
- **Error Handling**
- **Authentication**

### Test Cases

#### should list all reports

**Purpose**: This test verifies that should list all reports

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should return reports sorted by creation date (newest first)

**Purpose**: This test verifies that should return reports sorted by creation date (newest first)

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should return report statistics

**Purpose**: This test verifies that should return report statistics

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should calculate stats correctly

**Purpose**: This test verifies that should calculate stats correctly

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should return specific report with details

**Purpose**: This test verifies that should return specific report with details

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should return 404 for non-existent report

**Purpose**: This test verifies that should return 404 for non-existent report

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should include appropriate details based on report type

**Purpose**: This test verifies that should include appropriate details based on report type

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should generate new report

**Purpose**: This test verifies that should generate new report

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should require title and type

**Purpose**: This test verifies that should require title and type

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should set generatedBy to anonymous when no user

**Purpose**: This test verifies that should set generatedBy to anonymous when no user

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should include metadata with timestamps

**Purpose**: This test verifies that should include metadata with timestamps

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should delete existing report

**Purpose**: This test verifies that should delete existing report

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should return 404 for non-existent report

**Purpose**: This test verifies that should return 404 for non-existent report

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should download report as JSON

**Purpose**: This test verifies that should download report as JSON

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should return 404 for non-existent report

**Purpose**: This test verifies that should return 404 for non-existent report

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should sanitize filename in content-disposition

**Purpose**: This test verifies that should sanitize filename in content-disposition

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should generate correct user-story details

**Purpose**: This test verifies that should generate correct user-story details

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should generate correct test-coverage details

**Purpose**: This test verifies that should generate correct test-coverage details

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle invalid report ID format

**Purpose**: This test verifies that should handle invalid report ID format

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle missing report type in generate

**Purpose**: This test verifies that should handle missing report type in generate

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should work without authentication (optionalJWT)

**Purpose**: This test verifies that should work without authentication (optionalJWT)

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should use username from authenticated user

**Purpose**: This test verifies that should use username from authenticated user

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

---

## Test File: requirements.test.ts

**Path**: `layer/themes/portal_gui-selector/user-stories/023-gui-selector-server/tests/unit/routes/requirements.test.ts`

### Test Suites

- **Requirements Routes**
- **GET /api/requirements**
- **POST /api/requirements**
- **GET /api/requirements/export**
- **Requirement validation**

### Test Cases

#### should list all requirements without authentication

**Purpose**: This test verifies that should list all requirements without authentication

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should filter requirements by user when authenticated

**Purpose**: This test verifies that should filter requirements by user when authenticated

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should filter by session userId when available

**Purpose**: This test verifies that should filter by session userId when available

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should create new requirement

**Purpose**: This test verifies that should create new requirement

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should set default priority to medium

**Purpose**: This test verifies that should set default priority to medium

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should require selectionId, type, and description

**Purpose**: This test verifies that should require selectionId, type, and description

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should set userId from authenticated user

**Purpose**: This test verifies that should set userId from authenticated user

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should set userId to anonymous when no authentication

**Purpose**: This test verifies that should set userId to anonymous when no authentication

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should validate requirement type

**Purpose**: This test verifies that should validate requirement type

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should export requirements as JSON by default

**Purpose**: This test verifies that should export requirements as JSON by default

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should export requirements as markdown

**Purpose**: This test verifies that should export requirements as markdown

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should filter exported requirements by user

**Purpose**: This test verifies that should filter exported requirements by user

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle export errors gracefully

**Purpose**: This test verifies that should handle export errors gracefully

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should validate priority values

**Purpose**: This test verifies that should validate priority values

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle missing required fields

**Purpose**: This test verifies that should handle missing required fields

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

---

## Test File: selections.test.ts

**Path**: `layer/themes/portal_gui-selector/user-stories/023-gui-selector-server/tests/unit/routes/selections.test.ts`

### Test Suites

- **Selections Routes**
- **GET /api/selections**
- **POST /api/selections**
- **PUT /api/selections/:id**
- **DELETE /api/selections/:id**

### Test Cases

#### should list all selections without authentication

**Purpose**: This test verifies that should list all selections without authentication

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should filter selections by user when authenticated

**Purpose**: This test verifies that should filter selections by user when authenticated

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should use session userId when available

**Purpose**: This test verifies that should use session userId when available

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should create new selection

**Purpose**: This test verifies that should create new selection

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should create selection with empty comments

**Purpose**: This test verifies that should create selection with empty comments

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should require templateId and projectName

**Purpose**: This test verifies that should require templateId and projectName

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should set userId from authenticated user

**Purpose**: This test verifies that should set userId from authenticated user

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should set userId to anonymous when no authentication

**Purpose**: This test verifies that should set userId to anonymous when no authentication

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should update selection when authorized

**Purpose**: This test verifies that should update selection when authorized

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should allow partial updates

**Purpose**: This test verifies that should allow partial updates

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should return 404 for non-existent selection

**Purpose**: This test verifies that should return 404 for non-existent selection

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should require authentication

**Purpose**: This test verifies that should require authentication

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should return 403 for unauthorized user

**Purpose**: This test verifies that should return 403 for unauthorized user

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should delete selection when authorized

**Purpose**: This test verifies that should delete selection when authorized

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should return 404 for non-existent selection

**Purpose**: This test verifies that should return 404 for non-existent selection

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should require authentication

**Purpose**: This test verifies that should require authentication

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should return 403 for unauthorized user

**Purpose**: This test verifies that should return 403 for unauthorized user

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

---

## Test File: templates.test.ts

**Path**: `layer/themes/portal_gui-selector/user-stories/023-gui-selector-server/tests/unit/routes/templates.test.ts`

### Test Suites

- **templates routes**
- **GET /templates**
- **GET /templates/search**
- **GET /templates/category/:category**
- **GET /templates/:id**
- **GET /templates/:id/preview**
- **route order**

### Test Cases

#### should list all templates

**Purpose**: This test verifies that should list all templates

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle errors when listing templates

**Purpose**: This test verifies that should handle errors when listing templates

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should search templates with query parameter

**Purpose**: This test verifies that should search templates with query parameter

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should return 400 when query parameter is missing

**Purpose**: This test verifies that should return 400 when query parameter is missing

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should return 400 when query parameter is empty

**Purpose**: This test verifies that should return 400 when query parameter is empty

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle errors when searching templates

**Purpose**: This test verifies that should handle errors when searching templates

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should get templates by category

**Purpose**: This test verifies that should get templates by category

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle different categories

**Purpose**: This test verifies that should handle different categories

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle errors when getting templates by category

**Purpose**: This test verifies that should handle errors when getting templates by category

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should get template by id

**Purpose**: This test verifies that should get template by id

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should return 404 when template not found

**Purpose**: This test verifies that should return 404 when template not found

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle errors when getting template

**Purpose**: This test verifies that should handle errors when getting template

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should get template preview

**Purpose**: This test verifies that should get template preview

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should return 404 when template preview not found

**Purpose**: This test verifies that should return 404 when template preview not found

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle errors when getting template preview

**Purpose**: This test verifies that should handle errors when getting template preview

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle /search before /:id

**Purpose**: This test verifies that should handle /search before /:id

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle /category/:category before /:id

**Purpose**: This test verifies that should handle /category/:category before /:id

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

---

## Test File: themes.test.ts

**Path**: `layer/themes/portal_gui-selector/user-stories/023-gui-selector-server/tests/unit/routes/themes.test.ts`

### Test Suites

- **Themes Routes**
- **GET /api/themes**
- **GET /api/themes/:id**
- **POST /api/themes/apply**
- **POST /api/themes/sync**
- **GET /api/themes/export/:format**
- **GET /api/themes/stats (route order issue)**
- **GET /api/themes/preferences (route order issue)**
- **POST /api/themes/preferences**

### Test Cases

#### should return all themes

**Purpose**: This test verifies that should return all themes

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should filter themes by platform

**Purpose**: This test verifies that should filter themes by platform

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle errors gracefully

**Purpose**: This test verifies that should handle errors gracefully

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should return specific theme

**Purpose**: This test verifies that should return specific theme

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should pass platform parameter

**Purpose**: This test verifies that should pass platform parameter

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle errors

**Purpose**: This test verifies that should handle errors

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should apply theme

**Purpose**: This test verifies that should apply theme

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should include userId when authenticated

**Purpose**: This test verifies that should include userId when authenticated

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle errors

**Purpose**: This test verifies that should handle errors

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should sync theme between devices

**Purpose**: This test verifies that should sync theme between devices

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle sync errors

**Purpose**: This test verifies that should handle sync errors

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should export theme in specified format

**Purpose**: This test verifies that should export theme in specified format

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should require themeId

**Purpose**: This test verifies that should require themeId

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle export errors

**Purpose**: This test verifies that should handle export errors

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should be caught by :id route due to route ordering

**Purpose**: This test verifies that should be caught by :id route due to route ordering

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should be caught by :id route due to route ordering

**Purpose**: This test verifies that should be caught by :id route due to route ordering

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should save theme preference for authenticated user

**Purpose**: This test verifies that should save theme preference for authenticated user

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should require authentication

**Purpose**: This test verifies that should require authentication

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should require themeId

**Purpose**: This test verifies that should require themeId

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should use default colorMode when not provided

**Purpose**: This test verifies that should use default colorMode when not provided

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle save errors

**Purpose**: This test verifies that should handle save errors

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

---

## Test File: DatabaseService.test.ts

**Path**: `layer/themes/portal_gui-selector/user-stories/023-gui-selector-server/tests/unit/services/DatabaseService.test.ts`

### Test Suites

- **DatabaseService**
- **constructor**
- **initialize**
- **User operations**
- **createUser**
- **getUserByUsername**
- **getUserById**
- **App operations**
- **createApp**
- **getAppsByOwner**
- **getAppById**
- **getAllApps**
- **Selection operations**
- **createSelection**
- **getSelectionsByUser**
- **getSelectionsByApp**
- **Requirements operations**
- **createRequirement**
- **getRequirementsByUser**
- **getRequirementsBySelection**
- **Session operations**
- **createSession**
- **getSession**
- **deleteSession**
- **deleteExpiredSessions**
- **close**
- **Error handling**

### Test Cases

#### should create data directory if it does not exist

**Purpose**: This test verifies that should create data directory if it does not exist

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should not create data directory if it already exists

**Purpose**: This test verifies that should not create data directory if it already exists

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should initialize database with correct path

**Purpose**: This test verifies that should initialize database with correct path

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should create all required tables

**Purpose**: This test verifies that should create all required tables

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should create indexes

**Purpose**: This test verifies that should create indexes

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle initialization errors

**Purpose**: This test verifies that should handle initialization errors

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should create a user with default role

**Purpose**: This test verifies that should create a user with default role

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should create a user with custom role

**Purpose**: This test verifies that should create a user with custom role

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle database errors

**Purpose**: This test verifies that should handle database errors

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should retrieve user by username

**Purpose**: This test verifies that should retrieve user by username

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should return undefined for non-existent user

**Purpose**: This test verifies that should return undefined for non-existent user

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should retrieve user by id

**Purpose**: This test verifies that should retrieve user by id

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should create an app with all fields

**Purpose**: This test verifies that should create an app with all fields

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should create an app with optional fields as undefined

**Purpose**: This test verifies that should create an app with optional fields as undefined

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should retrieve apps by owner id

**Purpose**: This test verifies that should retrieve apps by owner id

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should retrieve app by id

**Purpose**: This test verifies that should retrieve app by id

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should retrieve all apps with owner information

**Purpose**: This test verifies that should retrieve all apps with owner information

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should create a selection with metadata

**Purpose**: This test verifies that should create a selection with metadata

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should create a selection without optional fields

**Purpose**: This test verifies that should create a selection without optional fields

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should retrieve selections by user with app names

**Purpose**: This test verifies that should retrieve selections by user with app names

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should retrieve selections by app id

**Purpose**: This test verifies that should retrieve selections by app id

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should create a requirement with custom priority

**Purpose**: This test verifies that should create a requirement with custom priority

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should create a requirement with default priority

**Purpose**: This test verifies that should create a requirement with default priority

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should retrieve requirements by user id

**Purpose**: This test verifies that should retrieve requirements by user id

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should retrieve requirements by selection id ordered by priority

**Purpose**: This test verifies that should retrieve requirements by selection id ordered by priority

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should create a session with expiration

**Purpose**: This test verifies that should create a session with expiration

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should retrieve valid session by refresh token

**Purpose**: This test verifies that should retrieve valid session by refresh token

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should not retrieve expired sessions

**Purpose**: This test verifies that should not retrieve expired sessions

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should delete session by refresh token

**Purpose**: This test verifies that should delete session by refresh token

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should delete all expired sessions

**Purpose**: This test verifies that should delete all expired sessions

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should close the database connection

**Purpose**: This test verifies that should close the database connection

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle close errors

**Purpose**: This test verifies that should handle close errors

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle database errors in runAsync

**Purpose**: This test verifies that should handle database errors in runAsync

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle database errors in getAsync

**Purpose**: This test verifies that should handle database errors in getAsync

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle database errors in allAsync

**Purpose**: This test verifies that should handle database errors in allAsync

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

---

## Test File: ExternalLogService.test.ts

**Path**: `layer/themes/portal_gui-selector/user-stories/023-gui-selector-server/tests/unit/services/ExternalLogService.test.ts`

### Test Suites

- **ExternalLogService**
- **constructor**
- **log**
- **logUserAction**
- **logAppAction**
- **logError**
- **logSystemEvent**
- **getRecentLogs**
- **log file rotation**

### Test Cases

#### should create log directory structure

**Purpose**: This test verifies that should create log directory structure

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should not create directory if it already exists

**Purpose**: This test verifies that should not create directory if it already exists

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should set current log file with date

**Purpose**: This test verifies that should set current log file with date

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should write log entry to file

**Purpose**: This test verifies that should write log entry to file

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should add timestamp if not provided

**Purpose**: This test verifies that should add timestamp if not provided

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should log to console in development mode

**Purpose**: This test verifies that should log to console in development mode

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should not log to console in production mode

**Purpose**: This test verifies that should not log to console in production mode

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle file write errors

**Purpose**: This test verifies that should handle file write errors

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should log user action with correct format

**Purpose**: This test verifies that should log user action with correct format

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle missing metadata

**Purpose**: This test verifies that should handle missing metadata

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should log app action with user id

**Purpose**: This test verifies that should log app action with user id

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should log app action without user id

**Purpose**: This test verifies that should log app action without user id

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should log error with stack trace

**Purpose**: This test verifies that should log error with stack trace

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle non-Error objects

**Purpose**: This test verifies that should handle non-Error objects

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle string errors

**Purpose**: This test verifies that should handle string errors

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should merge additional metadata

**Purpose**: This test verifies that should merge additional metadata

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should log system event

**Purpose**: This test verifies that should log system event

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle events without metadata

**Purpose**: This test verifies that should handle events without metadata

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should return recent logs in reverse order

**Purpose**: This test verifies that should return recent logs in reverse order

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should limit number of returned logs

**Purpose**: This test verifies that should limit number of returned logs

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle empty log file

**Purpose**: This test verifies that should handle empty log file

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should filter out empty lines

**Purpose**: This test verifies that should filter out empty lines

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle file read errors

**Purpose**: This test verifies that should handle file read errors

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle JSON parse errors gracefully

**Purpose**: This test verifies that should handle JSON parse errors gracefully

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should use different log files for different dates

**Purpose**: This test verifies that should use different log files for different dates

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

---

## Test File: JWTService.test.ts

**Path**: `layer/themes/portal_gui-selector/user-stories/023-gui-selector-server/tests/unit/services/JWTService.test.ts`

### Test Suites

- **JWTService**
- **constructor**
- **generateAccessToken**
- **generateRefreshToken**
- **verifyAccessToken**
- **verifyRefreshToken**
- **getRefreshTokenExpiry**
- **Security considerations**

### Test Cases

#### should use environment variables for secrets when available

**Purpose**: This test verifies that should use environment variables for secrets when available

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should generate random secrets when environment variables are not set

**Purpose**: This test verifies that should generate random secrets when environment variables are not set

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should only warn about missing access secret, not refresh secret

**Purpose**: This test verifies that should only warn about missing access secret, not refresh secret

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should generate an access token with correct parameters

**Purpose**: This test verifies that should generate an access token with correct parameters

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should include all payload fields in the token

**Purpose**: This test verifies that should include all payload fields in the token

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should generate a refresh token with correct parameters

**Purpose**: This test verifies that should generate a refresh token with correct parameters

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should use different expiry time than access token

**Purpose**: This test verifies that should use different expiry time than access token

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should verify and return token payload

**Purpose**: This test verifies that should verify and return token payload

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should throw error for invalid token

**Purpose**: This test verifies that should throw error for invalid token

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should throw error for expired token

**Purpose**: This test verifies that should throw error for expired token

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should verify and return token payload

**Purpose**: This test verifies that should verify and return token payload

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should throw error for invalid refresh token

**Purpose**: This test verifies that should throw error for invalid refresh token

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should use different secret than access token

**Purpose**: This test verifies that should use different secret than access token

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should return date 7 days in the future

**Purpose**: This test verifies that should return date 7 days in the future

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle month boundaries correctly

**Purpose**: This test verifies that should handle month boundaries correctly

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle year boundaries correctly

**Purpose**: This test verifies that should handle year boundaries correctly

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should use different secrets for access and refresh tokens

**Purpose**: This test verifies that should use different secrets for access and refresh tokens

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should maintain issuer consistency across all tokens

**Purpose**: This test verifies that should maintain issuer consistency across all tokens

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

---

## Test File: TemplateService.test.ts

**Path**: `layer/themes/portal_gui-selector/user-stories/023-gui-selector-server/tests/unit/services/TemplateService.test.ts`

### Test Suites

- **TemplateService**
- **listTemplates**
- **getTemplate**
- **getTemplatePreview**
- **searchTemplates**
- **getTemplatesByCategory**
- **template data validation**
- **simulateDelay**

### Test Cases

#### should return all available templates

**Purpose**: This test verifies that should return all available templates

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should return copies of templates to prevent mutation

**Purpose**: This test verifies that should return copies of templates to prevent mutation

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should include all required template properties

**Purpose**: This test verifies that should include all required template properties

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should return template by id

**Purpose**: This test verifies that should return template by id

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should return null for non-existent template

**Purpose**: This test verifies that should return null for non-existent template

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle all template categories

**Purpose**: This test verifies that should handle all template categories

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should return preview data for existing template

**Purpose**: This test verifies that should return preview data for existing template

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should return null for non-existent template preview

**Purpose**: This test verifies that should return null for non-existent template preview

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should include proper HTML structure in previews

**Purpose**: This test verifies that should include proper HTML structure in previews

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should include accessibility features in accessible template

**Purpose**: This test verifies that should include accessibility features in accessible template

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should find templates by name

**Purpose**: This test verifies that should find templates by name

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should find templates by description

**Purpose**: This test verifies that should find templates by description

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should find templates by tags

**Purpose**: This test verifies that should find templates by tags

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should be case insensitive

**Purpose**: This test verifies that should be case insensitive

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should return empty array for no matches

**Purpose**: This test verifies that should return empty array for no matches

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should find multiple templates with common terms

**Purpose**: This test verifies that should find multiple templates with common terms

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle partial matches

**Purpose**: This test verifies that should handle partial matches

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should return templates for modern category

**Purpose**: This test verifies that should return templates for modern category

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should return templates for professional category

**Purpose**: This test verifies that should return templates for professional category

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should return templates for creative category

**Purpose**: This test verifies that should return templates for creative category

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should return templates for accessible category

**Purpose**: This test verifies that should return templates for accessible category

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should return empty array for non-existent category

**Purpose**: This test verifies that should return empty array for non-existent category

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should be case sensitive for categories

**Purpose**: This test verifies that should be case sensitive for categories

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should have valid preview URLs for all templates

**Purpose**: This test verifies that should have valid preview URLs for all templates

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should have valid thumbnail URLs for all templates

**Purpose**: This test verifies that should have valid thumbnail URLs for all templates

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should have consistent template IDs and preview data

**Purpose**: This test verifies that should have consistent template IDs and preview data

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should have non-empty features for all templates

**Purpose**: This test verifies that should have non-empty features for all templates

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should add consistent delay to all operations

**Purpose**: This test verifies that should add consistent delay to all operations

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

---

## Test File: ThemeService.test.ts

**Path**: `layer/themes/portal_gui-selector/user-stories/023-gui-selector-server/tests/unit/services/ThemeService.test.ts`

### Test Suites

- **ThemeService**
- **getAllThemes**
- **getTheme**
- **applyTheme**
- **syncTheme**
- **exportTheme**
- **getThemeStatistics**
- **getUserThemePreference**
- **saveUserThemePreference**

### Test Cases

#### should return all themes for web platform

**Purpose**: This test verifies that should return all themes for web platform

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should return filtered themes for specific platform

**Purpose**: This test verifies that should return filtered themes for specific platform

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should return specific theme by ID

**Purpose**: This test verifies that should return specific theme by ID

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should throw error for non-existent theme

**Purpose**: This test verifies that should throw error for non-existent theme

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should apply theme successfully

**Purpose**: This test verifies that should apply theme successfully

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle invalid theme ID

**Purpose**: This test verifies that should handle invalid theme ID

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should sync theme between devices

**Purpose**: This test verifies that should sync theme between devices

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should export theme as CSS

**Purpose**: This test verifies that should export theme as CSS

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should export theme as TypeScript

**Purpose**: This test verifies that should export theme as TypeScript

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should export theme as JSON

**Purpose**: This test verifies that should export theme as JSON

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should throw error for invalid format

**Purpose**: This test verifies that should throw error for invalid format

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should throw error for invalid theme

**Purpose**: This test verifies that should throw error for invalid theme

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should return theme statistics

**Purpose**: This test verifies that should return theme statistics

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle database errors by throwing

**Purpose**: This test verifies that should handle database errors by throwing

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should return user theme preference

**Purpose**: This test verifies that should return user theme preference

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should return null when no preference found

**Purpose**: This test verifies that should return null when no preference found

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle database errors

**Purpose**: This test verifies that should handle database errors

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should save user theme preference

**Purpose**: This test verifies that should save user theme preference

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle database errors

**Purpose**: This test verifies that should handle database errors

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

---

## Test File: template-service.test.ts

**Path**: `layer/themes/portal_gui-selector/user-stories/023-gui-selector-server/tests/unit/template-service.test.ts`

### Test Suites

- **TemplateService**
- **listTemplates**
- **getTemplate**
- **getTemplatePreview**
- **searchTemplates**
- **getTemplatesByCategory**
- **async behavior**
- **data integrity**

### Test Cases

#### should return all available templates

**Purpose**: This test verifies that should return all available templates

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should return deep copies to prevent mutation

**Purpose**: This test verifies that should return deep copies to prevent mutation

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should return specific template by ID

**Purpose**: This test verifies that should return specific template by ID

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should return null for non-existent template

**Purpose**: This test verifies that should return null for non-existent template

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should return null for empty string ID

**Purpose**: This test verifies that should return null for empty string ID

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should return preview data for existing template

**Purpose**: This test verifies that should return preview data for existing template

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should return creative template with animations

**Purpose**: This test verifies that should return creative template with animations

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should return accessible template with WCAG features

**Purpose**: This test verifies that should return accessible template with WCAG features

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should return null for non-existent template preview

**Purpose**: This test verifies that should return null for non-existent template preview

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should find templates by name

**Purpose**: This test verifies that should find templates by name

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should find templates by description

**Purpose**: This test verifies that should find templates by description

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should find templates by tags

**Purpose**: This test verifies that should find templates by tags

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should be case insensitive

**Purpose**: This test verifies that should be case insensitive

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should return empty array for no matches

**Purpose**: This test verifies that should return empty array for no matches

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle empty search query

**Purpose**: This test verifies that should handle empty search query

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should find multiple matches

**Purpose**: This test verifies that should find multiple matches

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should return templates for modern category

**Purpose**: This test verifies that should return templates for modern category

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should return templates for professional category

**Purpose**: This test verifies that should return templates for professional category

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should return templates for creative category

**Purpose**: This test verifies that should return templates for creative category

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should return templates for accessible category

**Purpose**: This test verifies that should return templates for accessible category

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should return empty array for non-existent category

**Purpose**: This test verifies that should return empty array for non-existent category

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should be case sensitive for categories

**Purpose**: This test verifies that should be case sensitive for categories

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should simulate async delay in all methods

**Purpose**: This test verifies that should simulate async delay in all methods

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle concurrent requests

**Purpose**: This test verifies that should handle concurrent requests

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should maintain consistent data across methods

**Purpose**: This test verifies that should maintain consistent data across methods

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should have valid URLs and paths

**Purpose**: This test verifies that should have valid URLs and paths

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should have consistent feature and tag arrays

**Purpose**: This test verifies that should have consistent feature and tag arrays

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

---

### Integration Tests

## Test File: auth-real.test.ts

**Path**: `layer/themes/portal_gui-selector/user-stories/023-gui-selector-server/tests/integration/auth-real.test.ts`

### Test Suites

- **Auth Routes - Mock Free Tests**
- **POST /api/auth/login**
- **POST /api/auth/logout**
- **POST /api/auth/register**
- **GET /api/auth/session**
- **Session Management**
- **Security Tests**
- **Error Handling**

### Test Cases

#### should successfully login with valid credentials

**Purpose**: This test verifies that should successfully login with valid credentials

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should reject login with invalid password

**Purpose**: This test verifies that should reject login with invalid password

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should reject login with non-existent user

**Purpose**: This test verifies that should reject login with non-existent user

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should reject login with missing credentials

**Purpose**: This test verifies that should reject login with missing credentials

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle concurrent logins

**Purpose**: This test verifies that should handle concurrent logins

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should successfully logout

**Purpose**: This test verifies that should successfully logout

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should successfully register a new user

**Purpose**: This test verifies that should successfully register a new user

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should reject registration with existing username

**Purpose**: This test verifies that should reject registration with existing username

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should reject registration with missing fields

**Purpose**: This test verifies that should reject registration with missing fields

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should enforce password requirements

**Purpose**: This test verifies that should enforce password requirements

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should return authenticated status when logged in

**Purpose**: This test verifies that should return authenticated status when logged in

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should return unauthenticated status when not logged in

**Purpose**: This test verifies that should return unauthenticated status when not logged in

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should maintain session across requests

**Purpose**: This test verifies that should maintain session across requests

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should prevent SQL injection in login

**Purpose**: This test verifies that should prevent SQL injection in login

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should rate limit login attempts

**Purpose**: This test verifies that should rate limit login attempts

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should hash passwords with bcrypt

**Purpose**: This test verifies that should hash passwords with bcrypt

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle database errors gracefully

**Purpose**: This test verifies that should handle database errors gracefully

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle bcrypt errors gracefully

**Purpose**: This test verifies that should handle bcrypt errors gracefully

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

---

## Test File: authentication-session-integration.itest.ts

**Path**: `layer/themes/portal_gui-selector/user-stories/023-gui-selector-server/tests/integration/authentication-session-integration.itest.ts`

### Test Suites

- **Authentication + Session Integration Test**
- **Login Integration**
- **Session Validation Integration**
- **Session Refresh Integration**
- **Logout Integration**
- **Multi-Session Management**
- **Security and Edge Cases**
- **Performance and Monitoring**

### Test Cases

#### should authenticate user and create session

**Purpose**: This test verifies that should authenticate user and create session

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle invalid credentials

**Purpose**: This test verifies that should handle invalid credentials

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle non-existent user

**Purpose**: This test verifies that should handle non-existent user

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should validate active session with valid token

**Purpose**: This test verifies that should validate active session with valid token

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should reject invalid session

**Purpose**: This test verifies that should reject invalid session

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should clean up session with invalid token

**Purpose**: This test verifies that should clean up session with invalid token

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should refresh session with new token

**Purpose**: This test verifies that should refresh session with new token

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle refresh of non-existent session

**Purpose**: This test verifies that should handle refresh of non-existent session

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle refresh with expired token

**Purpose**: This test verifies that should handle refresh with expired token

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should logout and clean up session and token

**Purpose**: This test verifies that should logout and clean up session and token

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle logout of non-existent session

**Purpose**: This test verifies that should handle logout of non-existent session

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle multiple sessions for same user

**Purpose**: This test verifies that should handle multiple sessions for same user

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should revoke all user sessions and tokens

**Purpose**: This test verifies that should revoke all user sessions and tokens

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle session hijacking attempt

**Purpose**: This test verifies that should handle session hijacking attempt

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle concurrent session operations

**Purpose**: This test verifies that should handle concurrent session operations

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle session expiration correctly

**Purpose**: This test verifies that should handle session expiration correctly

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle high-volume authentication efficiently

**Purpose**: This test verifies that should handle high-volume authentication efficiently

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should maintain session data integrity under load

**Purpose**: This test verifies that should maintain session data integrity under load

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

---

## Test File: guiserver-database-integration.itest.ts

**Path**: `layer/themes/portal_gui-selector/user-stories/023-gui-selector-server/tests/integration/guiserver-database-integration.itest.ts`

### Test Suites

- **GUIServer + Database Integration Test**
- **Template and Database Integration**
- **Template Selection and Data Persistence**
- **Custom Theme Creation and Management**
- **Database Operations and Associations**
- **Transaction Handling**
- **Error Handling and Edge Cases**
- **Performance and Health Monitoring**

### Test Cases

#### should get templates from database through GUI server

**Purpose**: This test verifies that should get templates from database through GUI server

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should filter templates by category

**Purpose**: This test verifies that should filter templates by category

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should get specific template with associated screens

**Purpose**: This test verifies that should get specific template with associated screens

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle non-existent template

**Purpose**: This test verifies that should handle non-existent template

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should select template and persist selection to database

**Purpose**: This test verifies that should select template and persist selection to database

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should get user selections with enhanced theme data

**Purpose**: This test verifies that should get user selections with enhanced theme data

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle multiple selections for same user

**Purpose**: This test verifies that should handle multiple selections for same user

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should create custom theme and persist to database

**Purpose**: This test verifies that should create custom theme and persist to database

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should update existing theme

**Purpose**: This test verifies that should update existing theme

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should access database operations directly

**Purpose**: This test verifies that should access database operations directly

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should create theme-screen associations

**Purpose**: This test verifies that should create theme-screen associations

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should filter themes by category at database level

**Purpose**: This test verifies that should filter themes by category at database level

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should select template with transaction and commit

**Purpose**: This test verifies that should select template with transaction and commit

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle transaction commit

**Purpose**: This test verifies that should handle transaction commit

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle transaction rollback

**Purpose**: This test verifies that should handle transaction rollback

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle database errors gracefully

**Purpose**: This test verifies that should handle database errors gracefully

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle update of non-existent template

**Purpose**: This test verifies that should handle update of non-existent template

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should track integration metrics

**Purpose**: This test verifies that should track integration metrics

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle concurrent database operations

**Purpose**: This test verifies that should handle concurrent database operations

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should maintain data consistency under load

**Purpose**: This test verifies that should maintain data consistency under load

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

---

## Test File: guiserver-sessionstore-integration.itest.ts

**Path**: `layer/themes/portal_gui-selector/user-stories/023-gui-selector-server/tests/integration/guiserver-sessionstore-integration.itest.ts`

### Test Suites

- **GUIServer + SessionStore Integration Test**
- **Session Creation and Management Integration**
- **Template Operations with Session Integration**
- **Advanced Session Operations**
- **Error Handling and Edge Cases**
- **Performance and Metrics**

### Test Cases

#### should create session on first request and maintain it

**Purpose**: This test verifies that should create session on first request and maintain it

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle session expiration properly

**Purpose**: This test verifies that should handle session expiration properly

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should get templates with session context

**Purpose**: This test verifies that should get templates with session context

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should select template and update session

**Purpose**: This test verifies that should select template and update session

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should get user selections with session integration

**Purpose**: This test verifies that should get user selections with session integration

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should extend session expiration

**Purpose**: This test verifies that should extend session expiration

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should delete session properly

**Purpose**: This test verifies that should delete session properly

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle multiple sessions for same user

**Purpose**: This test verifies that should handle multiple sessions for same user

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle invalid template ID gracefully

**Purpose**: This test verifies that should handle invalid template ID gracefully

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle session store failures gracefully

**Purpose**: This test verifies that should handle session store failures gracefully

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should maintain session consistency during concurrent operations

**Purpose**: This test verifies that should maintain session consistency during concurrent operations

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should track integration metrics properly

**Purpose**: This test verifies that should track integration metrics properly

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle session cleanup integration

**Purpose**: This test verifies that should handle session cleanup integration

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle high load integration scenarios

**Purpose**: This test verifies that should handle high load integration scenarios

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

---

## Test File: guiserver-templateengine-integration.itest.ts

**Path**: `layer/themes/portal_gui-selector/user-stories/023-gui-selector-server/tests/integration/guiserver-templateengine-integration.itest.ts`

### Test Suites

- **GUIServer + TemplateEngine Integration Test**
- **Template Loading and Engine Integration**
- **Template Selection and Rendering Integration**
- **Preview Generation Integration**
- **Requirements Export Integration**
- **Template Engine Operations**
- **Error Handling and Edge Cases**
- **Performance and Monitoring**

### Test Cases

#### should load templates into engine through GUI server

**Purpose**: This test verifies that should load templates into engine through GUI server

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should validate template content through engine

**Purpose**: This test verifies that should validate template content through engine

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should extract template variables correctly

**Purpose**: This test verifies that should extract template variables correctly

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should select template and render through engine

**Purpose**: This test verifies that should select template and render through engine

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle complex template rendering with arrays

**Purpose**: This test verifies that should handle complex template rendering with arrays

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should track multiple user selections

**Purpose**: This test verifies that should track multiple user selections

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should generate preview using template engine

**Purpose**: This test verifies that should generate preview using template engine

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle preview with custom variables

**Purpose**: This test verifies that should handle preview with custom variables

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should export requirements using template engine

**Purpose**: This test verifies that should export requirements using template engine

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should export in different formats

**Purpose**: This test verifies that should export in different formats

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should precompile templates for performance

**Purpose**: This test verifies that should precompile templates for performance

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should manage template cache

**Purpose**: This test verifies that should manage template cache

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle template not found errors

**Purpose**: This test verifies that should handle template not found errors

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle invalid template content

**Purpose**: This test verifies that should handle invalid template content

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle template rendering errors gracefully

**Purpose**: This test verifies that should handle template rendering errors gracefully

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should track rendering performance metrics

**Purpose**: This test verifies that should track rendering performance metrics

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle concurrent template operations

**Purpose**: This test verifies that should handle concurrent template operations

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle large template operations efficiently

**Purpose**: This test verifies that should handle large template operations efficiently

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

---

## Test File: messages-real.test.ts

**Path**: `layer/themes/portal_gui-selector/user-stories/023-gui-selector-server/tests/integration/messages-real.test.ts`

### Test Suites

- **Messages Routes - Mock Free Tests**
- **POST /api/messages**
- **GET /api/messages**
- **GET /api/messages/:id**
- **DELETE /api/messages/:id**
- **DELETE /api/messages**
- **GET /api/messages/stats/summary**
- **Concurrent Operations**
- **Error Resilience**

### Test Cases

#### should save a real message with text

**Purpose**: This test verifies that should save a real message with text

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should save a real message with type and data

**Purpose**: This test verifies that should save a real message with type and data

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should reject invalid messages

**Purpose**: This test verifies that should reject invalid messages

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should retrieve real messages with pagination

**Purpose**: This test verifies that should retrieve real messages with pagination

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should retrieve specific real message

**Purpose**: This test verifies that should retrieve specific real message

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should return 404 for non-existent message

**Purpose**: This test verifies that should return 404 for non-existent message

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should delete real message

**Purpose**: This test verifies that should delete real message

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should clear all real messages

**Purpose**: This test verifies that should clear all real messages

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should return real statistics

**Purpose**: This test verifies that should return real statistics

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle concurrent message creation

**Purpose**: This test verifies that should handle concurrent message creation

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle malformed JSON gracefully

**Purpose**: This test verifies that should handle malformed JSON gracefully

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle SQL injection attempts safely

**Purpose**: This test verifies that should handle SQL injection attempts safely

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

---

## Test File: multi-user-concurrent-selection_FAKE.itest.ts

**Path**: `layer/themes/portal_gui-selector/user-stories/023-gui-selector-server/tests/integration/multi-user-concurrent-selection_FAKE.itest.ts`

### Test Suites

- **Multi-User Concurrent Selection Integration Test (FAKE)**
- **Concurrent Session Management**
- **Data Consistency and Isolation**
- **Performance and Scalability**
- **Error Handling and Edge Cases**
- **Resource Management**

### Test Cases

#### should handle multiple users creating sessions simultaneously

**Purpose**: This test verifies that should handle multiple users creating sessions simultaneously

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle concurrent theme selections by different users

**Purpose**: This test verifies that should handle concurrent theme selections by different users

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should maintain session isolation under high concurrency

**Purpose**: This test verifies that should maintain session isolation under high concurrency

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should prevent data leakage between concurrent users

**Purpose**: This test verifies that should prevent data leakage between concurrent users

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle concurrent database operations without race conditions

**Purpose**: This test verifies that should handle concurrent database operations without race conditions

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should maintain performance with high concurrent load

**Purpose**: This test verifies that should maintain performance with high concurrent load

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle health check operations under concurrent load

**Purpose**: This test verifies that should handle health check operations under concurrent load

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle invalid session operations gracefully

**Purpose**: This test verifies that should handle invalid session operations gracefully

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle concurrent selections of same theme by different users

**Purpose**: This test verifies that should handle concurrent selections of same theme by different users

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should maintain data consistency during concurrent user operations

**Purpose**: This test verifies that should maintain data consistency during concurrent user operations

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle session cleanup and resource management

**Purpose**: This test verifies that should handle session cleanup and resource management

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle concurrent resource cleanup operations

**Purpose**: This test verifies that should handle concurrent resource cleanup operations

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

---

## Test File: session-persistence-restart_FAKE.itest.ts

**Path**: `layer/themes/portal_gui-selector/user-stories/023-gui-selector-server/tests/integration/session-persistence-restart_FAKE.itest.ts`

### Test Suites

- **Session Persistence Restart Integration Test (FAKE)**
- **Session Recovery Logic**
- **Data Persistence Logic**
- **Restart State Management**
- **Error Handling and Edge Cases**
- **Performance and Scalability**

### Test Cases

#### should recover sessions after simulated restart

**Purpose**: This test verifies that should recover sessions after simulated restart

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle multiple sessions across restart

**Purpose**: This test verifies that should handle multiple sessions across restart

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should clean up expired sessions on restart

**Purpose**: This test verifies that should clean up expired sessions on restart

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should persist application data across multiple restarts

**Purpose**: This test verifies that should persist application data across multiple restarts

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should maintain data integrity during restart

**Purpose**: This test verifies that should maintain data integrity during restart

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should track restart count correctly

**Purpose**: This test verifies that should track restart count correctly

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle startup without previous state

**Purpose**: This test verifies that should handle startup without previous state

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should distinguish between first startup and restart

**Purpose**: This test verifies that should distinguish between first startup and restart

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle corrupted session files

**Purpose**: This test verifies that should handle corrupted session files

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle missing storage directory

**Purpose**: This test verifies that should handle missing storage directory

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle file system errors gracefully

**Purpose**: This test verifies that should handle file system errors gracefully

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle recovery of many sessions efficiently

**Purpose**: This test verifies that should handle recovery of many sessions efficiently

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should maintain performance with large data sets

**Purpose**: This test verifies that should maintain performance with large data sets

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

---

### System Tests

## Test File: database-service.systest.ts

**Path**: `layer/themes/portal_gui-selector/user-stories/023-gui-selector-server/tests/system/database-service.systest.ts`

### Test Suites

- **Database Service System Tests**
- **🚨 Story: User Management**
- **App Management**
- **Selection Management**
- **Requirement Management**
- **Session Management**
- **Database Schema and Constraints**
- **Complex Queries and Joins**

### Test Cases

#### should create and retrieve users

**Purpose**: This test verifies that should create and retrieve users

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle duplicate username constraint

**Purpose**: This test verifies that should handle duplicate username constraint

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should create and manage apps

**Purpose**: This test verifies that should create and manage apps

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should create and manage selections

**Purpose**: This test verifies that should create and manage selections

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should create and manage requirements

**Purpose**: This test verifies that should create and manage requirements

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should manage JWT refresh token sessions

**Purpose**: This test verifies that should manage JWT refresh token sessions

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle session cleanup and expiration

**Purpose**: This test verifies that should handle session cleanup and expiration

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should enforce foreign key relationships

**Purpose**: This test verifies that should enforce foreign key relationships

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle unique constraints

**Purpose**: This test verifies that should handle unique constraints

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should perform complex multi-table queries

**Purpose**: This test verifies that should perform complex multi-table queries

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

---

## Test File: feature-coverage.test.ts

**Path**: `layer/themes/portal_gui-selector/user-stories/023-gui-selector-server/tests/system/feature-coverage.test.ts`

### Test Suites


### Test Cases

#### Feature: Authentication (No Hardcoded Ports)

**Purpose**: This test verifies that Feature: Authentication (No Hardcoded Ports)

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### Feature: Dashboard (No Hardcoded Ports)

**Purpose**: This test verifies that Feature: Dashboard (No Hardcoded Ports)

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### Feature: GUI Selector (No Hardcoded Ports)

**Purpose**: This test verifies that Feature: GUI Selector (No Hardcoded Ports)

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### Feature: Templates (No Hardcoded Ports)

**Purpose**: This test verifies that Feature: Templates (No Hardcoded Ports)

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### Feature: Themes (No Hardcoded Ports)

**Purpose**: This test verifies that Feature: Themes (No Hardcoded Ports)

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### Coverage Report (Via Test Theme)

**Purpose**: This test verifies that Coverage Report (Via Test Theme)

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

---

## Test File: gui-server-integration-real.systest.ts

**Path**: `layer/themes/portal_gui-selector/user-stories/023-gui-selector-server/tests/system/gui-server-integration-real.systest.ts`

### Test Suites

- **GUI Selector Server System Integration Tests - Mock Free**
- **Database Operations**
- **Template Service Integration**
- **JWT Service Integration**
- **External Log Service Integration**
- **End-to-End Integration Scenarios**
- **Performance and Scalability**

### Test Cases

#### should create and retrieve users

**Purpose**: This test verifies that should create and retrieve users

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle concurrent database operations

**Purpose**: This test verifies that should handle concurrent database operations

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should enforce foreign key constraints

**Purpose**: This test verifies that should enforce foreign key constraints

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle transactions correctly

**Purpose**: This test verifies that should handle transactions correctly

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should list all templates

**Purpose**: This test verifies that should list all templates

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should get template by ID

**Purpose**: This test verifies that should get template by ID

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should search templates

**Purpose**: This test verifies that should search templates

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should get templates by category

**Purpose**: This test verifies that should get templates by category

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should generate and verify access tokens

**Purpose**: This test verifies that should generate and verify access tokens

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should generate and verify refresh tokens

**Purpose**: This test verifies that should generate and verify refresh tokens

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should reject invalid tokens

**Purpose**: This test verifies that should reject invalid tokens

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle token expiry correctly

**Purpose**: This test verifies that should handle token expiry correctly

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should log user actions

**Purpose**: This test verifies that should log user actions

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should log app actions

**Purpose**: This test verifies that should log app actions

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should log errors with stack traces

**Purpose**: This test verifies that should log errors with stack traces

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should log system events

**Purpose**: This test verifies that should log system events

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should retrieve recent logs

**Purpose**: This test verifies that should retrieve recent logs

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle complete user workflow

**Purpose**: This test verifies that should handle complete user workflow

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle error scenarios gracefully

**Purpose**: This test verifies that should handle error scenarios gracefully

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle concurrent user operations

**Purpose**: This test verifies that should handle concurrent user operations

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should handle bulk operations efficiently

**Purpose**: This test verifies that should handle bulk operations efficiently

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should query large datasets efficiently

**Purpose**: This test verifies that should query large datasets efficiently

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

---

## Test File: requirements-export-workflow.systest.ts

**Path**: `layer/themes/portal_gui-selector/user-stories/023-gui-selector-server/tests/system/requirements-export-workflow.systest.ts`

### Test Suites

- **🚨 Story: Requirements Export Workflow - System Test**
- **🚨 Story: Requirements Capture Workflow**
- **Requirements Export Functionality**
- **Requirements Analytics**
- **🚨 Story: In Progress Workflow Integration**
- **Health and Status**

### Test Cases

#### should capture requirements during theme selection

**Purpose**: This test verifies that should capture requirements during theme selection

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should allow manual requirement addition

**Purpose**: This test verifies that should allow manual requirement addition

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should filter requirements by type and priority

**Purpose**: This test verifies that should filter requirements by type and priority

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should export requirements in JSON format

**Purpose**: This test verifies that should export requirements in JSON format

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should export requirements in Markdown format

**Purpose**: This test verifies that should export requirements in Markdown format

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should export requirements in HTML format

**Purpose**: This test verifies that should export requirements in HTML format

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should export requirements in CSV format

**Purpose**: This test verifies that should export requirements in CSV format

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should provide analytics on requirements collection

**Purpose**: This test verifies that should provide analytics on requirements collection

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should complete full requirements capture and export workflow

**Purpose**: This test verifies that should complete full requirements capture and export workflow

**Steps**:
1. Setup test environment
2. Execute test scenario
3. Verify expected outcome
4. Cleanup test data

#### should provide health status for requirements system

**Purpose**: This test verifies that should provide health status for requirements system

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
