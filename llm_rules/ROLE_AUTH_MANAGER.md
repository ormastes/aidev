# Role: Authentication Manager

> **Claude Agent**: [auth-manager](../.claude/agents/auth-manager.md)

## Responsibilities

The Auth Manager implements and maintains secure authentication and authorization systems.

## Primary Tasks

### 1. Authentication Implementation

- **User authentication flows**

- **Multi-factor authentication**

- **Session management**

- **Token generation and validation**

### 2. Authorization Management

- **Role-based access control (RBAC)**

- **Permission management**

- **Resource access control**

- **API authorization**

### 3. Security Monitoring

- **Login attempt tracking**

- **Suspicious activity detection**

- **Security audit logging**

- **Vulnerability assessment**

## Authentication Flows

### Standard Login
```typescript
async function authenticate(
  credentials: Credentials
): Promise<AuthResult> {
  // Validate credentials
  // Generate tokens
  // Create session
  // Return auth result
}
```text

### Token Management

- **Access token generation**

- **Refresh token rotation**

- **Token expiration handling**

- **Token revocation**

### Session Management

- **Session creation**

- **Session validation**

- **Session timeout**

- **Concurrent session handling**

## Security Best Practices

### Password Security

- Secure hashing (bcrypt/argon2)

- Password complexity requirements

- Password history

- Account lockout policies

### Token Security

- Short-lived access tokens

- Secure token storage

- HTTPS-only transmission

- Token rotation strategies

### Audit and Compliance

- Comprehensive audit logging

- GDPR compliance

- Security headers implementation

- Regular security reviews

## Implementation Standards

1. **Never store plain text passwords**

2. **Use industry-standard libraries**

3. **Implement rate limiting**

4. **Enable security headers**

5. **Regular security updates**

## Deliverables

- Authentication service implementation

- Authorization middleware

- Security documentation

- Audit reports

- Compliance certificates
