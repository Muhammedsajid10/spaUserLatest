/**
 * @file ErrorBoundary.jsx
 * @description A React class-based Error Boundary component.
 *
 * Catches JavaScript errors in child component tree, logs them,
 * and displays a graceful fallback UI instead of crashing the app.
 *
 * Note: Error Boundaries MUST be class components per the React API.
 *       This is the only permitted class component in this codebase.
 *
 * Props:
 *  - children    : ReactNode — the component tree to guard
 *  - fallback    : ReactNode — optional custom fallback UI
 *  - onError     : Function(error, errorInfo) — optional error callback
 *
 * @example
 *   <ErrorBoundary fallback={<p>Something went wrong.</p>}>
 *     <RiskyComponent />
 *   </ErrorBoundary>
 */

import React from 'react';
import styles from './ErrorBoundary.module.css';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError:   false,
      error:      null,
      errorInfo:  null,
    };
    this.handleReset = this.handleReset.bind(this);
  }

  /**
   * getDerivedStateFromError — called when a descendant throws.
   * Updates state to trigger the fallback UI on next render.
   */
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  /**
   * componentDidCatch — called after an error has been thrown.
   * Receives the error and a component stack trace.
   * Use this for logging to an error monitoring service (e.g. Sentry).
   */
  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });

    // Forward error to parent handler if provided
    if (typeof this.props.onError === 'function') {
      this.props.onError(error, errorInfo);
    }

    // Log to console in non-production environments
    if (import.meta.env.MODE !== 'production') {
      console.error('[ErrorBoundary] Caught error:', error);
      console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack);
    }
  }

  /** Reset the error state — allows user to retry rendering the child tree */
  handleReset() {
    this.setState({ hasError: false, error: null, errorInfo: null });
  }

  render() {
    const { hasError, error } = this.state;
    const { children, fallback } = this.props;

    if (hasError) {
      // Render custom fallback if provided
      if (fallback) return fallback;

      // Default fallback UI
      return (
        <div className={styles.errorBoundary} role="alert">
          <div className={styles.errorBoundary__card}>
            {/* Error icon */}
            <div className={styles.errorBoundary__icon} aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                <line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <circle cx="12" cy="16" r="1" fill="currentColor" />
              </svg>
            </div>

            <h2 className={styles.errorBoundary__title}>Something went wrong</h2>

            <p className={styles.errorBoundary__message}>
              An unexpected error occurred. Please try again or contact support if the
              problem persists.
            </p>

            {/* Show error details in development only */}
            {import.meta.env.MODE !== 'production' && error && (
              <details className={styles.errorBoundary__details}>
                <summary>Technical Details</summary>
                <pre>{error.toString()}</pre>
              </details>
            )}

            <button className={styles.errorBoundary__btn} onClick={this.handleReset}>
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return children;
  }
}

export default ErrorBoundary;
