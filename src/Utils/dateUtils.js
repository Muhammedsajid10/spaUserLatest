// Utility helpers for local date formatting and parsing
// Provides consistent local YYYY-MM-DD formatting (not UTC)

/**
 * formatLocalYYYYMMDD(date)
 * - date: Date object or parsable date string
 * Returns a string in local YYYY-MM-DD
 */
export function formatLocalYYYYMMDD(date) {
  const d = date instanceof Date ? date : new Date(date);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * parseLocalYYYYMMDD(str)
 * - str: string in YYYY-MM-DD
 * Returns a Date representing local midnight of that date
 */
export function parseLocalYYYYMMDD(str) {
  if (!str) return null;
  const parts = String(str).split('-').map(Number);
  if (parts.length !== 3) return null;
  const [yyyy, mm, dd] = parts;
  return new Date(yyyy, mm - 1, dd, 0, 0, 0, 0);
}

/**
 * startOfLocalDayISO(date)
 * - returns an ISO-like string for the start of the local day (YYYY-MM-DDT00:00:00)
 * Note: this is NOT converted to Z/UTC; it is the local datetime string.
 */
export function startOfLocalDayISO(date) {
  const d = date instanceof Date ? date : new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}T00:00:00`;
}

export default {
  formatLocalYYYYMMDD,
  parseLocalYYYYMMDD,
  startOfLocalDayISO
};
