/**
 * @file AuthContext.js
 * @description Canonical barrel export for the Authentication Context.
 *
 * All consumers should import from this path:
 *   import { useAuth, AuthProvider } from '../context/AuthContext';
 *
 * The actual implementation lives in src/Service/Context.jsx.
 * This file exists to conform to the /context folder convention without
 * breaking any existing imports.
 */

export { default, useAuth, AuthProvider } from '../Service/Context';
