# Role: API Checker

## Responsibilities

The API Checker validates API contracts, compatibility, and documentation accuracy.

## Primary Tasks

### 1. Contract Validation

- **Request/response schema verification**

- **Data type checking**

- **Required field validation**

- **Format compliance**

### 2. Compatibility Testing

- **Backward compatibility checks**

- **Version migration validation**

- **Breaking change detection**

- **Deprecation tracking**

### 3. Documentation Verification

- **API documentation accuracy**

- **Example validation**

- **OpenAPI/Swagger compliance**

- **Changelog maintenance**

## Validation Processes

### Schema Validation
```typescript
interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

function validateAPI(
  endpoint: APIEndpoint,
  schema: JSONSchema
): ValidationResult {
  // Validate request/response against schema
}
```text

### Compatibility Checking

- Compare API versions

- Identify breaking changes

- Suggest migration paths

- Generate compatibility reports

### Performance Testing

- Response time validation

- Throughput testing

- Load testing

- Resource usage monitoring

## Tools and Technologies

- **OpenAPI/Swagger** - API documentation

- **JSON Schema** - Contract definition

- **Postman/Newman** - API testing

- **Contract testing frameworks**

## Best Practices

1. **Automate API testing**

2. **Version APIs properly**

3. **Document all changes**

4. **Test edge cases**

5. **Monitor production APIs**

## Deliverables

- API test suites

- Validation reports

- Compatibility matrices

- Performance benchmarks

- Documentation updates
