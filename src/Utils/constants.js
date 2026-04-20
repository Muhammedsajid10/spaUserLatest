/**
 * @file constants.js
 * @description App-wide constants.
 *
 * All constant values follow UPPER_SNAKE_CASE naming convention.
 * Use these instead of hardcoding strings across the codebase.
 *
 * Environment variables are read via import.meta.env (Vite convention).
 * Provide fallbacks for local development.
 */

// ---------------------------------------------------------------------------
// API Configuration
// ---------------------------------------------------------------------------

/** Base URL for the backend API — pulled from .env or falls back to production */
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'https://api.alloraspadubai.com/api/v1';

/** Application display name */
export const APP_NAME = import.meta.env.VITE_APP_NAME || 'Allora Spa';

/** Stripe publishable key — pulled from .env */
export const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_KEY || '';

// ---------------------------------------------------------------------------
// Client-Side Routes
// ---------------------------------------------------------------------------

/** Centralized route paths — avoids hardcoded strings in Link / navigate() */
export const ROUTES = {
  HOME:            '/',
  SERVICES:        '/',
  PROFESSIONALS:   '/professionals',
  TIME:            '/time',
  PAYMENT:         '/payment',
  PAYMENT_SUCCESS: '/payment/success',
  PAYMENT_CANCEL:  '/payment/cancel',
  PAYMENT_STRIPE:  '/payment/stripe',
  PAYMENT_PROCESS: '/payment/process',
  LOGIN:           '/login',
  SIGNUP:          '/signup',
  RESET_PASSWORD:  '/reset-password/:token',
  CLIENT_PROFILE:  '/client-profile',
};

// ---------------------------------------------------------------------------
// User Roles
// ---------------------------------------------------------------------------

/** User role identifiers — must match backend role strings */
export const ROLES = {
  ADMIN:    'admin',
  EMPLOYEE: 'employee',
  CLIENT:   'client',
};

// ---------------------------------------------------------------------------
// localStorage Keys
// ---------------------------------------------------------------------------

/** Centralised keys to avoid typos when reading/writing localStorage */
export const STORAGE_KEYS = {
  TOKEN:        'token',
  USER:         'user',
  BOOKING_FLOW: 'bookingFlow',
  BOOKING_DATA: 'bookingData',
};

// ---------------------------------------------------------------------------
// UI / Pagination
// ---------------------------------------------------------------------------

/** Default number of items per page for paginated lists */
export const DEFAULT_PAGE_SIZE = 10;

/** Debounce delay (ms) used for search inputs */
export const SEARCH_DEBOUNCE_MS = 400;

/** Toast/notification auto-dismiss duration in ms */
export const TOAST_DURATION_MS = 4000;

// ---------------------------------------------------------------------------
// Date / Time
// ---------------------------------------------------------------------------

/** Display date format used across the UI */
export const DATE_FORMAT = 'dd MMM yyyy';

/** Display time format used across the UI */
export const TIME_FORMAT = 'hh:mm a';
