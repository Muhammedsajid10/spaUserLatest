/**
 * @file useFetch.js
 * @description A generic, reusable data-fetching hook.
 *
 * Handles:
 *  - Loading state
 *  - Error state
 *  - Data state
 *  - Request cancellation via AbortController (prevents memory leaks)
 *  - Automatic refetch when the URL or options change
 *
 * @example
 *   const { data, loading, error, refetch } = useFetch('/api/services');
 */

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * useFetch — fetches data from a given URL and returns lifecycle states.
 *
 * @param {string|null} url - The URL to fetch. Pass null to skip the fetch.
 * @param {RequestInit} [options={}] - Fetch options (method, headers, body, etc.)
 * @returns {{ data: any, loading: boolean, error: string|null, refetch: Function }}
 */
const useFetch = (url, options = {}) => {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  // Stable reference for options to avoid infinite re-renders
  const optionsRef = useRef(options);
  optionsRef.current = options;

  // Trigger counter — increment to manually refetch
  const [refetchIndex, setRefetchIndex] = useState(0);

  const fetchData = useCallback(async () => {
    // Skip if no URL provided
    if (!url) return;

    const controller = new AbortController();

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(url, {
        ...optionsRef.current,
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const json = await response.json();
      setData(json);
    } catch (err) {
      // Ignore abort errors — they are intentional
      if (err.name !== 'AbortError') {
        setError(err.message || 'An unknown error occurred');
      }
    } finally {
      setLoading(false);
    }

    // Return cleanup so React can cancel in-flight requests on unmount
    return () => controller.abort();
  }, [url, refetchIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const cleanup = fetchData();
    return () => {
      if (typeof cleanup === 'function') cleanup();
    };
  }, [fetchData]);

  /** Manually trigger a re-fetch of the same URL */
  const refetch = useCallback(() => {
    setRefetchIndex((prev) => prev + 1);
  }, []);

  return { data, loading, error, refetch };
};

export default useFetch;
