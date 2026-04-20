/**
 * @file services/index.js
 * @description Barrel export for all service modules.
 *
 * Usage:
 *   import apiService from '../services';
 *   import { authAPI, bookingsAPI } from '../services';
 */

export { default } from './apiService';
export {
  authAPI,
  servicesAPI,
  bookingsAPI,
  employeesAPI,
  paymentsAPI,
  feedbackAPI,
  bookingFlow,
  apiUtils,
} from './apiService';
