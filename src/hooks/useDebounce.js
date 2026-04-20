/**
 * @file useDebounce.js
 * @description A hook that debounces a rapidly changing value.
 *
 * Useful for:
 *  - Search inputs (avoid firing API on every keystroke)
 *  - Window resize handlers
 *  - Any value that changes frequently but should only be acted on
 *    after the user has "settled"
 *
 * @example
 *   const [query, setQuery] = useState('');
 *   const debouncedQuery = useDebounce(query, 400);
 *
 *   useEffect(() => {
 *     if (debouncedQuery) fetchResults(debouncedQuery);
 *   }, [debouncedQuery]);
 */

import { useState, useEffect } from 'react';

/**
 * useDebounce
 *
 * @param {any} value   - The value to debounce.
 * @param {number} delay - Delay in milliseconds (default: 300ms).
 * @returns {any} The debounced value — only updates after `delay` ms of no changes.
 */
const useDebounce = (value, delay = 300) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    // Set a timer to update the debounced value after the delay
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Cleanup: cancel the previous timer if value changes before delay expires
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
};

export default useDebounce;
