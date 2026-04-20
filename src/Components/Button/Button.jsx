/**
 * @file Button.jsx
 * @description A reusable, accessible Button component.
 *
 * Props:
 *  - variant   : 'primary' | 'secondary' | 'ghost' | 'danger'  (default: 'primary')
 *  - size      : 'sm' | 'md' | 'lg'                            (default: 'md')
 *  - loading   : boolean — shows a spinner and disables interaction
 *  - disabled  : boolean — disables the button
 *  - fullWidth : boolean — makes the button 100% width
 *  - leftIcon  : ReactNode — icon rendered before the label
 *  - rightIcon : ReactNode — icon rendered after the label
 *  - onClick   : Function
 *  - type      : 'button' | 'submit' | 'reset'                 (default: 'button')
 *  - children  : ReactNode — button label content
 *  - className : string — additional class names
 *
 * @example
 *   <Button variant="primary" size="lg" loading={isSubmitting}>
 *     Book Now
 *   </Button>
 *
 *   <Button variant="ghost" leftIcon={<ArrowLeft />} onClick={handleBack}>
 *     Back
 *   </Button>
 */

import React from 'react';
import styles from './Button.module.css';

const Button = ({
  variant    = 'primary',
  size       = 'md',
  loading    = false,
  disabled   = false,
  fullWidth  = false,
  leftIcon   = null,
  rightIcon  = null,
  onClick,
  type       = 'button',
  children,
  className  = '',
  ...rest
}) => {
  // Compose class names from the CSS module
  const classes = [
    styles.btn,
    styles[`btn--${variant}`],
    styles[`btn--${size}`],
    fullWidth  ? styles['btn--full']     : '',
    loading    ? styles['btn--loading']  : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      className={classes}
      onClick={onClick}
      disabled={isDisabled}
      aria-busy={loading}
      aria-disabled={isDisabled}
      {...rest}
    >
      {/* Left icon slot */}
      {leftIcon && !loading && (
        <span className={styles.btn__icon} aria-hidden="true">
          {leftIcon}
        </span>
      )}

      {/* Loading spinner — replaces left icon while loading */}
      {loading && (
        <span className={styles.btn__spinner} aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle
              cx="12" cy="12" r="10"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray="31.4 31.4"
            />
          </svg>
        </span>
      )}

      {/* Label */}
      <span className={styles.btn__label}>{children}</span>

      {/* Right icon slot */}
      {rightIcon && !loading && (
        <span className={styles.btn__icon} aria-hidden="true">
          {rightIcon}
        </span>
      )}
    </button>
  );
};

export default Button;
