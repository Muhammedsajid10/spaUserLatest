/**
 * @file useAuth.js
 * @description Canonical export location for the useAuth hook.
 *
 * Following the /hooks convention, all custom hooks should be imported from
 * this folder. This file re-exports useAuth from the AuthContext so consumers
 * have a single, predictable import path:
 *
 *   import { useAuth } from '../hooks';
 *   // or
 *   import useAuth from '../hooks/useAuth';
 *
 * @returns {Object} Auth state and actions: { user, token, loading,
 *   isAuthenticated, login, register, logout, resetPassword, hasRole,
 *   isAdmin, isEmployee, isClient }
 */

export { useAuth as default, useAuth } from '../context/AuthContext';
