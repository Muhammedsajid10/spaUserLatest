/**
 * @file formatDate.js
 * @description Pure utility functions for formatting dates, times, and currency.
 *
 * No React code. No side effects. All functions are pure (same input → same output).
 *
 * Wraps and extends the existing src/Utils/dateUtils.js functions while adding
 * additional display-oriented formatters.
 */

// Re-export low-level date utilities from the existing implementation
export {
  formatLocalYYYYMMDD,
  parseLocalYYYYMMDD,
  startOfLocalDayISO,
} from '../Utils/dateUtils';

// ---------------------------------------------------------------------------
// Display Formatters
// ---------------------------------------------------------------------------

/**
 * formatDate — formats a Date (or date string) into a human-readable string.
 *
 * @param {Date|string} date - The date to format.
 * @param {string} [locale='en-AE'] - BCP 47 locale tag.
 * @param {Intl.DateTimeFormatOptions} [options] - Intl format options.
 * @returns {string} Formatted date string, e.g. "12 Apr 2025"
 *
 * @example
 *   formatDate(new Date())          // "4 Apr 2026"
 *   formatDate('2026-04-04')        // "4 Apr 2026"
 */
export const formatDate = (date, locale = 'en-AE', options = {}) => {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d)) return '';

  const defaults = { day: 'numeric', month: 'short', year: 'numeric' };
  return d.toLocaleDateString(locale, { ...defaults, ...options });
};

/**
 * formatTime — formats a Date (or ISO string) into a 12-hour time string.
 *
 * @param {Date|string} date - The date/time to format.
 * @param {string} [locale='en-AE'] - BCP 47 locale tag.
 * @returns {string} Formatted time string, e.g. "03:30 PM"
 *
 * @example
 *   formatTime(new Date())   // "01:05 PM"
 */
export const formatTime = (date, locale = 'en-AE') => {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d)) return '';

  return d.toLocaleTimeString(locale, {
    hour:   '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

/**
 * formatDateTime — combines date and time into a single readable string.
 *
 * @param {Date|string} date
 * @returns {string} e.g. "4 Apr 2026, 01:05 PM"
 */
export const formatDateTime = (date) => {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d)) return '';
  return `${formatDate(d)}, ${formatTime(d)}`;
};

/**
 * formatDuration — converts minutes into a human-readable duration string.
 *
 * @param {number} minutes - Total minutes.
 * @returns {string} e.g. "1 hr 30 min", "45 min", "2 hr"
 *
 * @example
 *   formatDuration(90)   // "1 hr 30 min"
 *   formatDuration(60)   // "1 hr"
 *   formatDuration(45)   // "45 min"
 */
export const formatDuration = (minutes) => {
  if (!minutes || minutes <= 0) return '0 min';
  if (minutes < 60) return `${minutes} min`;

  const hours           = Math.floor(minutes / 60);
  const remainingMins   = minutes % 60;

  if (remainingMins === 0) return `${hours} hr`;
  return `${hours} hr ${remainingMins} min`;
};

/**
 * formatCurrency — formats a number as AED currency (default).
 *
 * @param {number} amount - The monetary amount.
 * @param {string} [currency='AED'] - ISO 4217 currency code.
 * @param {string} [locale='en-AE'] - BCP 47 locale tag.
 * @returns {string} e.g. "AED 250.00"
 *
 * @example
 *   formatCurrency(250)          // "AED 250.00"
 *   formatCurrency(99.9, 'USD') // "US$ 99.90"
 */
export const formatCurrency = (amount, currency = 'AED', locale = 'en-AE') => {
  if (amount === null || amount === undefined) return '';
  return new Intl.NumberFormat(locale, {
    style:    'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
};

/**
 * isToday — returns true if the given date is today (local time).
 *
 * @param {Date|string} date
 * @returns {boolean}
 */
export const isToday = (date) => {
  const d     = date instanceof Date ? date : new Date(date);
  const today = new Date();
  return (
    d.getFullYear() === today.getFullYear() &&
    d.getMonth()    === today.getMonth()    &&
    d.getDate()     === today.getDate()
  );
};

/**
 * isPastDate — returns true if the given date is strictly in the past.
 *
 * @param {Date|string} date
 * @returns {boolean}
 */
export const isPastDate = (date) => {
  const d = date instanceof Date ? date : new Date(date);
  return d < new Date();
};

export default {
  formatDate,
  formatTime,
  formatDateTime,
  formatDuration,
  formatCurrency,
  isToday,
  isPastDate,
};
