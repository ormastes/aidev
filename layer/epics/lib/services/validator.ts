// Validation service with complex logic

class Validator {
  constructor(options = {}) {
    this.strict = options.strict || false;
    this.customRules = options.customRules || {};
  }

  validateEmail(email) {
    if (!email) {
      return { valid: false, error: 'Email is required' };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { valid: false, error: 'Invalid email format' };
    }

    if (this.strict) {
      const parts = email.split('@');
      const domain = parts[1];
      if (!domain || !domain.includes('.')) {
        return { valid: false, error: 'Invalid domain' };
      }
    }

    return { valid: true };
  }

  validatePassword(password) {
    const errors = [];

    if (!password) {
      return { valid: false, errors: ['Password is required'] };
    }

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters');
    }

    if (this.strict) {
      if (!/[A-Z]/.test(password)) {
        errors.push('Password must contain uppercase letter');
      }
      if (!/[a-z]/.test(password)) {
        errors.push('Password must contain lowercase letter');
      }
      if (!/[0-9]/.test(password)) {
        errors.push('Password must contain number');
      }
      if (!/[!@#$%^&*]/.test(password)) {
        errors.push('Password must contain special character');
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  validateAge(age) {
    if (age === null || age === undefined) {
      return { valid: false, error: 'Age is required' };
    }

    const numAge = Number(age);
    if (isNaN(numAge)) {
      return { valid: false, error: 'Age must be a number' };
    }

    if (numAge < 0) {
      return { valid: false, error: 'Age cannot be negative' };
    }

    if (numAge > 150) {
      return { valid: false, error: 'Age seems unrealistic' };
    }

    if (this.strict && numAge < 18) {
      return { valid: false, error: 'Must be 18 or older' };
    }

    return { valid: true };
  }

  validatePhoneNumber(phone) {
    if (!phone) {
      return { valid: false, error: 'Phone number is required' };
    }

    const cleaned = phone.replace(/\D/g, '');
    
    if (cleaned.length < 10) {
      return { valid: false, error: 'Phone number too short' };
    }

    if (cleaned.length > 15) {
      return { valid: false, error: 'Phone number too long' };
    }

    return { valid: true };
  }

  validateCustom(value, ruleName) {
    if (!this.customRules[ruleName]) {
      throw new Error(`Custom rule '${ruleName}' not found`);
    }

    try {
      const result = this.customRules[ruleName](value);
      return { valid: result, error: result ? undefined : 'Custom validation failed' };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  addCustomRule(name, validator) {
    if (typeof validator !== "function") {
      throw new Error('Validator must be a function');
    }
    this.customRules[name] = validator;
  }

  validateAll(data, rules) {
    const results = {};
    let allValid = true;
    
    Object.keys(rules).forEach(field => {
      const rule = rules[field];
      const value = data[field];

      let result;
      switch (rule) {
        case 'email':
          result = this.validateEmail(value);
          break;
        case "password":
          result = this.validatePassword(value);
          break;
        case 'age':
          result = this.validateAge(value);
          break;
        case 'phone':
          result = this.validatePhoneNumber(value);
          break;
        default:
          if (rule.startsWith('custom:')) {
            const customRuleName = rule.substring(7);
            result = this.validateCustom(value, customRuleName);
          } else {
            result = { valid: false, error: `Unknown rule: ${rule}` };
          }
      }

      results[field] = result;
      if (!result.valid) {
        allValid = false;
      }
    });

    return {
      valid: allValid,
      fieldResults: results
    };
  }
}

export default Validator;