/**
 * @file components/index.js
 * @description Barrel export for all reusable UI components.
 *
 * Usage:
 *   import { Button, ErrorBoundary } from '../components';
 *
 * Note: Components in the legacy src/Components/ (PascalCase) folder
 *       are NOT exported from here. Add new components to src/components/
 *       (lowercase, subfolder structure) and export them below.
 */

export { default as Button }        from './Button';
export { default as ErrorBoundary } from './ErrorBoundary';
