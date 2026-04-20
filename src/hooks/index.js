/**
 * @file hooks/index.js
 * @description Barrel export for all custom hooks.
 *
 * Usage:
 *   import { useFetch, useAuth, useDebounce } from '../hooks';
 */

export { default as useFetch }    from './useFetch';
export { default as useAuth }     from './useAuth';
export { default as useDebounce } from './useDebounce';
