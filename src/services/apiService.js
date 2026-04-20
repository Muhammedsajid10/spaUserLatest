/**
 * @file apiService.js
 * @description Central API service module.
 *
 * Re-exports all API namespaces from the core api.js implementation.
 * This gives consumers a single, spec-compliant camelCase import:
 *
 *   import apiService from '../services/apiService';
 *   await apiService.auth.login(credentials);
 *
 *   // Or named imports:
 *   import { authAPI, servicesAPI, bookingsAPI } from '../services/apiService';
 *
 * All HTTP logic lives in api.js — this file is a clean public interface.
 */

export {
  authAPI,
  servicesAPI,
  bookingsAPI,
  employeesAPI,
  paymentsAPI,
  feedbackAPI,
  bookingFlow,
  apiUtils,
} from './api';

/**
 * Default export: a unified object grouping all API namespaces.
 * Useful for components that need access to multiple domains at once.
 */
import {
  authAPI,
  servicesAPI,
  bookingsAPI,
  employeesAPI,
  paymentsAPI,
  feedbackAPI,
  bookingFlow,
  apiUtils,
} from './api';

const apiService = {
  /** Authentication: login, register, logout, getCurrentUser, updateProfile */
  auth: authAPI,

  /** Services: getAllServices, getService, getServicesByCategory, searchServices */
  services: servicesAPI,

  /** Bookings: createBooking, getUserBookings, cancelBooking, getAvailableTimeSlots */
  bookings: bookingsAPI,

  /** Employees: getAvailableEmployees, getAllEmployees, getEmployeeProfile */
  employees: employeesAPI,

  /** Payments: createPayment, confirmPayment, getPaymentHistory */
  payments: paymentsAPI,

  /** Feedback: createFeedback, getUserFeedback, updateFeedback */
  feedback: feedbackAPI,

  /** Booking flow state manager (localStorage-backed) */
  bookingFlow,

  /** Utilities: isAuthenticated, formatDate, formatDuration, formatPrice */
  utils: apiUtils,
};

export default apiService;
