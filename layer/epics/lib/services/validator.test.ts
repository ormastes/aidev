import Validator from './validator';

describe('Validator', () => {
  let validator;
  let strictValidator;

  beforeEach(() => {
    validator = new Validator();
    strictValidator = new Validator({ strict: true });
  });

  describe('constructor', () => {
    test('creates validator with default options', () => {
      const v = new Validator();
      expect(v.strict).toBe(false);
      expect(v.customRules).toEqual({});
    });

    test('creates validator with custom options', () => {
      const customRules = { test: () => true };
      const v = new Validator({ strict: true, customRules });
      expect(v.strict).toBe(true);
      expect(v.customRules).toBe(customRules);
    });
  });

  describe('validateEmail', () => {
    test('validates correct email', () => {
      expect(validator.validateEmail('test@example.com')).toEqual({ valid: true });
      expect(validator.validateEmail('test@localhost')).toEqual({ valid: true });
    });

    test('rejects empty email', () => {
      expect(validator.validateEmail('')).toEqual({
        valid: false,
        error: 'Email is required'
      });
    });

    test('rejects null email', () => {
      expect(validator.validateEmail(null)).toEqual({
        valid: false,
        error: 'Email is required'
      });
    });

    test('rejects invalid email format', () => {
      expect(validator.validateEmail('notanemail')).toEqual({
        valid: false,
        error: 'Invalid email format'
      });
    });

    test('strict mode validates domain', () => {
      expect(strictValidator.validateEmail('test@example.com')).toEqual({ valid: true });
    });

    test('strict mode rejects invalid domain', () => {
      // This will pass basic regex but fail strict domain check
      const email = 'test@localhost';
      expect(strictValidator.validateEmail(email)).toEqual({
        valid: false,
        error: 'Invalid domain'
      });
    });
  });

  describe('validatePassword', () => {
    test('validates correct password', () => {
      expect(validator.validatePassword('password123')).toEqual({ valid: true });
    });

    test('rejects empty password', () => {
      expect(validator.validatePassword('')).toEqual({
        valid: false,
        errors: ['Password is required']
      });
    });

    test('rejects null password', () => {
      expect(validator.validatePassword(null)).toEqual({
        valid: false,
        errors: ['Password is required']
      });
    });

    test('rejects short password', () => {
      expect(validator.validatePassword('pass')).toEqual({
        valid: false,
        errors: ['Password must be at least 8 characters']
      });
    });

    test('strict mode requires uppercase', () => {
      const result = strictValidator.validatePassword('password1!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain uppercase letter');
    });

    test('strict mode requires lowercase', () => {
      const result = strictValidator.validatePassword('PASSWORD1!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain lowercase letter');
    });

    test('strict mode requires number', () => {
      const result = strictValidator.validatePassword('Password!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain number');
    });

    test('strict mode requires special character', () => {
      const result = strictValidator.validatePassword('Password1');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain special character');
    });

    test('strict mode accepts strong password', () => {
      expect(strictValidator.validatePassword('Password1!')).toEqual({ valid: true });
    });
  });

  describe('validateAge', () => {
    test('validates correct age', () => {
      expect(validator.validateAge(25)).toEqual({ valid: true });
    });

    test('rejects null age', () => {
      expect(validator.validateAge(null)).toEqual({
        valid: false,
        error: 'Age is required'
      });
    });

    test('rejects undefined age', () => {
      expect(validator.validateAge(undefined)).toEqual({
        valid: false,
        error: 'Age is required'
      });
    });

    test('rejects non-numeric age', () => {
      expect(validator.validateAge('abc')).toEqual({
        valid: false,
        error: 'Age must be a number'
      });
    });

    test('rejects negative age', () => {
      expect(validator.validateAge(-5)).toEqual({
        valid: false,
        error: 'Age cannot be negative'
      });
    });

    test('rejects unrealistic age', () => {
      expect(validator.validateAge(200)).toEqual({
        valid: false,
        error: 'Age seems unrealistic'
      });
    });

    test('strict mode requires 18+', () => {
      expect(strictValidator.validateAge(17)).toEqual({
        valid: false,
        error: 'Must be 18 or older'
      });
    });

    test('strict mode accepts 18+', () => {
      expect(strictValidator.validateAge(18)).toEqual({ valid: true });
    });
  });

  describe('validatePhoneNumber', () => {
    test('validates correct phone', () => {
      expect(validator.validatePhoneNumber('123-456-7890')).toEqual({ valid: true });
    });

    test('rejects empty phone', () => {
      expect(validator.validatePhoneNumber('')).toEqual({
        valid: false,
        error: 'Phone number is required'
      });
    });

    test('rejects null phone', () => {
      expect(validator.validatePhoneNumber(null)).toEqual({
        valid: false,
        error: 'Phone number is required'
      });
    });

    test('rejects short phone', () => {
      expect(validator.validatePhoneNumber('123')).toEqual({
        valid: false,
        error: 'Phone number too short'
      });
    });

    test('rejects long phone', () => {
      expect(validator.validatePhoneNumber('12345678901234567')).toEqual({
        valid: false,
        error: 'Phone number too long'
      });
    });

    test('handles phone with formatting', () => {
      expect(validator.validatePhoneNumber('(123) 456-7890')).toEqual({ valid: true });
    });
  });

  describe('validateCustom', () => {
    beforeEach(() => {
      validator.addCustomRule('isEven', (value) => value % 2 === 0);
    });

    test('validates with custom rule', () => {
      expect(validator.validateCustom(4, 'isEven')).toEqual({ valid: true });
    });

    test('fails custom validation', () => {
      expect(validator.validateCustom(3, 'isEven')).toEqual({
        valid: false,
        error: 'Custom validation failed'
      });
    });

    test('throws error for missing rule', () => {
      expect(() => validator.validateCustom(4, 'nonexistent')).toThrow(
        "Custom rule 'nonexistent' not found"
      );
    });

    test('handles custom rule errors', () => {
      validator.addCustomRule('throwError', () => {
        throw new Error('Custom error');
      });
      expect(validator.validateCustom(4, 'throwError')).toEqual({
        valid: false,
        error: 'Custom error'
      });
    });
  });

  describe('addCustomRule', () => {
    test('adds custom rule', () => {
      validator.addCustomRule('test', () => true);
      expect(validator.customRules.test).toBeDefined();
    });

    test('throws error for non-function', () => {
      expect(() => validator.addCustomRule('test', 'not a function')).toThrow(
        'Validator must be a function'
      );
    });
  });

  describe('validateAll', () => {
    test('validates all fields', () => {
      const data = {
        email: 'test@example.com',
        password: 'password123',
        age: 25,
        phone: '123-456-7890'
      };
      const rules = {
        email: 'email',
        password: 'password',
        age: 'age',
        phone: 'phone'
      };

      const result = validator.validateAll(data, rules);
      expect(result.valid).toBe(true);
      expect(result.fieldResults.email.valid).toBe(true);
      expect(result.fieldResults.password.valid).toBe(true);
      expect(result.fieldResults.age.valid).toBe(true);
      expect(result.fieldResults.phone.valid).toBe(true);
    });

    test('handles validation failures', () => {
      const data = {
        email: 'invalid',
        password: 'short',
        age: -5,
        phone: '123'
      };
      const rules = {
        email: 'email',
        password: 'password',
        age: 'age',
        phone: 'phone'
      };

      const result = validator.validateAll(data, rules);
      expect(result.valid).toBe(false);
      expect(result.fieldResults.email.valid).toBe(false);
      expect(result.fieldResults.password.valid).toBe(false);
      expect(result.fieldResults.age.valid).toBe(false);
      expect(result.fieldResults.phone.valid).toBe(false);
    });

    test('handles custom rules', () => {
      validator.addCustomRule('isEven', (value) => value % 2 === 0);
      const data = { number: 4 };
      const rules = { number: 'custom:isEven' };

      const result = validator.validateAll(data, rules);
      expect(result.valid).toBe(true);
      expect(result.fieldResults.number.valid).toBe(true);
    });

    test('handles unknown rules', () => {
      const data = { field: 'value' };
      const rules = { field: 'unknown' };

      const result = validator.validateAll(data, rules);
      expect(result.valid).toBe(false);
      expect(result.fieldResults.field.error).toBe('Unknown rule: unknown');
    });
  });
});