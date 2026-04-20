/**
 * @file utils/index.js
 * @description Barrel export for all utility modules.
 *
 * Usage:
 *   import { formatDate, validateEmail, ROUTES } from '../utils';
 */

// Date & time formatters
export {
  formatDate,
  formatTime,
  formatDateTime,
  formatDuration,
  formatCurrency,
  isToday,
  isPastDate,
  formatLocalYYYYMMDD,
  parseLocalYYYYMMDD,
  startOfLocalDayISO,
} from './formatDate';

// Validators
export {
  validateRequired,
  validateEmail,
  validatePhone,
  validatePassword,
  validateConfirmPassword,
  validateMinLength,
  validateMaxLength,
  runValidations,
} from './validators';

// Constants
export {
  API_BASE_URL,
  APP_NAME,
  STRIPE_PUBLISHABLE_KEY,
  ROUTES,
  ROLES,
  STORAGE_KEYS,
  DEFAULT_PAGE_SIZE,
  SEARCH_DEBOUNCE_MS,
  TOAST_DURATION_MS,
  DATE_FORMAT,
  TIME_FORMAT,
} from './constants';
