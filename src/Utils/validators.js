/**
 * @file validators.js
 * @description Pure input validation utility functions.
 *
 * No React code. No DOM access. All functions are pure.
 * Each validator returns null on success or an error string on failure.
 * This makes them composable with any form library or custom form logic.
 *
 * @example
 *   validateEmail('bad-email')  // "Please enter a valid email address"
 *   validateEmail('ok@ok.com') // null
 */

// ---------------------------------------------------------------------------
// Individual Field Validators
// ---------------------------------------------------------------------------

/**
 * validateRequired — ensures a field is not empty.
 *
 * @param {any} value
 * @param {string} [fieldName='This field'] - Used in the error message.
 * @returns {string|null}
 */
export const validateRequired = (value, fieldName = 'This field') => {
  const trimmed = typeof value === 'string' ? value.trim() : value;
  if (trimmed === null || trimmed === undefined || trimmed === '') {
    return `${fieldName} is required`;
  }
  return null;
};

/**
 * validateEmail — checks for a valid email format.
 *
 * @param {string} value
 * @returns {string|null}
 */
export const validateEmail = (value) => {
  if (!value) return 'Email is required';

  // RFC 5322-inspired regex (covers the vast majority of real addresses)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(String(value).toLowerCase())) {
    return 'Please enter a valid email address';
  }
  return null;
};

/**
 * validatePhone — checks for a plausible international phone number.
 * Accepts digits, spaces, hyphens, parentheses, and a leading +.
 *
 * @param {string} value
 * @returns {string|null}
 */
export const validatePhone = (value) => {
  if (!value) return 'Phone number is required';

  const phoneRegex = /^\+?[\d\s\-().]{7,20}$/;
  if (!phoneRegex.test(String(value).trim())) {
    return 'Please enter a valid phone number';
  }
  return null;
};

/**
 * validatePassword — enforces minimum password security requirements.
 *
 * Requirements:
 *  - At least 8 characters
 *  - At least one uppercase letter
 *  - At least one lowercase letter
 *  - At least one digit
 *
 * @param {string} value
 * @returns {string|null}
 */
export const validatePassword = (value) => {
  if (!value) return 'Password is required';
  if (value.length < 8) return 'Password must be at least 8 characters';
  if (!/[A-Z]/.test(value)) return 'Password must contain at least one uppercase letter';
  if (!/[a-z]/.test(value)) return 'Password must contain at least one lowercase letter';
  if (!/\d/.test(value))    return 'Password must contain at least one number';
  return null;
};

/**
 * validateConfirmPassword — ensures two password fields match.
 *
 * @param {string} password
 * @param {string} confirmPassword
 * @returns {string|null}
 */
export const validateConfirmPassword = (password, confirmPassword) => {
  if (!confirmPassword) return 'Please confirm your password';
  if (password !== confirmPassword) return 'Passwords do not match';
  return null;
};

/**
 * validateMinLength — checks that a string meets a minimum character count.
 *
 * @param {string} value
 * @param {number} min
 * @param {string} [fieldName='This field']
 * @returns {string|null}
 */
export const validateMinLength = (value, min, fieldName = 'This field') => {
  if (!value || value.length < min) {
    return `${fieldName} must be at least ${min} characters`;
  }
  return null;
};

/**
 * validateMaxLength — checks that a string does not exceed a maximum length.
 *
 * @param {string} value
 * @param {number} max
 * @param {string} [fieldName='This field']
 * @returns {string|null}
 */
export const validateMaxLength = (value, max, fieldName = 'This field') => {
  if (value && value.length > max) {
    return `${fieldName} must be no more than ${max} characters`;
  }
  return null;
};

// ---------------------------------------------------------------------------
// Form-Level Validator Runner
// ---------------------------------------------------------------------------

/**
 * runValidations — runs multiple validators against a form values object.
 *
 * @param {Object} values  - The form values keyed by field name.
 * @param {Object} rules   - An object mapping field names to arrays of validator functions.
 * @returns {{ isValid: boolean, errors: Object }} - errors is keyed by field name.
 *
 * @example
 *   const { isValid, errors } = runValidations(
 *     { email: 'bad', password: '' },
 *     {
 *       email:    [(v) => validateEmail(v)],
 *       password: [(v) => validateRequired(v, 'Password'), (v) => validatePassword(v)],
 *     }
 *   );
 */
export const runValidations = (values, rules) => {
  const errors = {};

  for (const [field, validators] of Object.entries(rules)) {
    for (const validator of validators) {
      const error = validator(values[field]);
      if (error) {
        errors[field] = error;
        break; // Stop at first error per field
      }
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

export default {
  validateRequired,
  validateEmail,
  validatePhone,
  validatePassword,
  validateConfirmPassword,
  validateMinLength,
  validateMaxLength,
  runValidations,
};
