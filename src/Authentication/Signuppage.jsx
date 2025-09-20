import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './Signuppage.css';
import { useAuth } from '../Service/Context';
import Swal from 'sweetalert2';

const SignInPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { register, login, resetPassword } = useAuth();
  const from = location.state?.from?.pathname || null;

  // Tabs
  const [activeTab, setActiveTab] = useState('login');

  // Signup state
  const [formData, setFormData] = useState({ 
    firstName: '', 
    lastName: '', 
    email: '', 
    password: '', 
    phone: '' 
  });
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [signupLoading, setSignupLoading] = useState(false);
  const [signupError, setSignupError] = useState('');

  // Login state
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Forgot password state
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const handleSignupChange = (e) => {
    const { name, value } = e.target;
    setFormData(p => ({ ...p, [name]: value }));
    if (signupError) setSignupError('');
  };

  const handleLoginChange = (e) => {
    const { name, value } = e.target;
    setLoginData(p => ({ ...p, [name]: value }));
    if (loginError) setLoginError('');
  };

  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    setSignupLoading(true);
    setSignupError('');
    try {
      const result = await register({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password,
        phone: formData.phone.replace(/\s+/g, '')
      });
      if (result.success) {
        Swal.fire({ 
          title: 'Account created', 
          text: 'Signup successful. Please sign in.', 
          icon: 'success', 
          timer: 1400, 
          showConfirmButton: false 
        });
        setActiveTab('login');
      } else {
        setSignupError(result.message || 'Signup failed.');
      }
    } catch (err) {
      console.error('Signup Error:', err);
      setSignupError(err.message || 'Signup failed.');
    } finally {
      setSignupLoading(false);
    }
  };

  const getRedirectPath = (role) => {
    if (from) return from;
    switch (role) {
      case 'admin': return '/admin/dashboard';
      case 'employee': return '/employee/dashboard';
      default: return '/payment';
    }
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError('');
    try {
      const result = await login({ 
        email: loginData.email, 
        password: loginData.password 
      });
      if (result.success) {
        const userData = result.user;
        Swal.fire({ 
          title: 'Success', 
          text: 'Logged in successfully', 
          icon: 'success', 
          timer: 1400, 
          showConfirmButton: false 
        });
        const redirect = getRedirectPath(userData.role);
        setTimeout(() => navigate(redirect, { replace: true }), 400);
      } else {
        setLoginError(result.message || 'Login failed.');
      }
    } catch (err) {
      console.error('Login Error:', err);
      setLoginError(err.message || 'Login failed.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!forgotPasswordEmail.trim()) {
      Swal.fire({
        title: 'Email Required',
        text: 'Please enter your email address.',
        icon: 'warning',
        confirmButtonText: 'OK'
      });
      return;
    }

    setForgotPasswordLoading(true);
    try {
      // If resetPassword function exists in context, use it
      if (resetPassword) {
        const result = await resetPassword({ email: forgotPasswordEmail });
        if (result.success) {
          Swal.fire({
            title: 'Reset Link Sent',
            text: 'Please check your email for password reset instructions.',
            icon: 'success',
            confirmButtonText: 'OK'
          });
          setShowForgotPassword(false);
          setForgotPasswordEmail('');
        } else {
          Swal.fire({
            title: 'Error',
            text: result.message || 'Failed to send reset email.',
            icon: 'error',
            confirmButtonText: 'OK'
          });
        }
      } else {
        // Fallback: Show success message (for demo purposes)
        Swal.fire({
          title: 'Reset Link Sent',
          text: 'Please check your email for password reset instructions.',
          icon: 'success',
          confirmButtonText: 'OK'
        });
        setShowForgotPassword(false);
        setForgotPasswordEmail('');
      }
    } catch (err) {
      console.error('Forgot Password Error:', err);
      Swal.fire({
        title: 'Error',
        text: err.message || 'Failed to send reset email.',
        icon: 'error',
        confirmButtonText: 'OK'
      });
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  const handleForgotPasswordClick = () => {
    setForgotPasswordEmail(loginData.email || '');
    setShowForgotPassword(true);
  };

  const handleBackToLogin = () => {
    setShowForgotPassword(false);
    setForgotPasswordEmail('');
  };

  return (
    <div className="signin-container">
      <div className="left-section" aria-hidden>
        <div className="brand-content">
          <h1 className="brand-title">Allora</h1>
          <p className="brand-subtitle">The most popular Spa centre</p>
        </div>
      </div>

      <div className="right-section">
        <div className="signin-form-container">
          <div className="signin-card">
            {!showForgotPassword ? (
              <>
                <div className="auth-tabs">
                  <button 
                    type="button" 
                    className={activeTab === 'login' ? 'tab active' : 'tab'} 
                    onClick={() => setActiveTab('login')}
                  >
                    Login
                  </button>
                  <button 
                    type="button" 
                    className={activeTab === 'signup' ? 'tab active' : 'tab'} 
                    onClick={() => setActiveTab('signup')}
                  >
                    Sign Up
                  </button>
                </div>

                <div className="form-header">
                  <h2 className="form-title">
                    {activeTab === 'login' ? 'Sign in to your account' : 'Create an account'}
                  </h2>
                  <p className="form-subtitle">
                    {activeTab === 'login' 
                      ? 'Access your bookings and profile' 
                      : 'Join Allora to manage bookings'
                    }
                  </p>
                </div>

                {activeTab === 'signup' && signupError && (
                  <div className="error-message">{signupError}</div>
                )}
                {activeTab === 'login' && loginError && (
                  <div className="error-message">{loginError}</div>
                )}

                {activeTab === 'signup' ? (
                  <form className="signin-form" onSubmit={handleSignupSubmit}>
                    <div className="form-row">
                      <input 
                        name="firstName" 
                        type="text" 
                        placeholder="First Name" 
                        value={formData.firstName} 
                        onChange={handleSignupChange} 
                        className="form-input half-width" 
                        required 
                        disabled={signupLoading} 
                      />
                      <input 
                        name="lastName" 
                        type="text" 
                        placeholder="Last Name" 
                        value={formData.lastName} 
                        onChange={handleSignupChange} 
                        className="form-input half-width" 
                        required 
                        disabled={signupLoading} 
                      />
                    </div>
                    <input 
                      name="email" 
                      type="email" 
                      placeholder="Email Address" 
                      value={formData.email} 
                      onChange={handleSignupChange} 
                      className="form-input" 
                      required 
                      disabled={signupLoading} 
                    />
                    <div className="password-input-container">
                      <input 
                        name="password" 
                        type={showSignupPassword ? 'text' : 'password'} 
                        placeholder="Password" 
                        value={formData.password} 
                        onChange={handleSignupChange} 
                        className="form-input" 
                        required 
                        disabled={signupLoading} 
                      />
                      <button 
                        type="button" 
                        className={`show-pass-btn ${signupLoading ? 'disabled' : ''}`} 
                        onClick={() => setShowSignupPassword(s => !s)} 
                        disabled={signupLoading}
                        aria-label={showSignupPassword ? 'Hide password' : 'Show password'}
                      >
                        {showSignupPassword ? (
                          <>
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                              <path d="M12 6.5a9.77 9.77 0 0 1 8.82 5.5 9.647 9.647 0 0 1-2.41 3.12l1.41 1.41c1.39-1.23 2.49-2.77 3.18-4.53C21.27 7.11 17 4 12 4c-1.27 0-2.49.2-3.64.57l1.65 1.65c1.36-.28 2.8-.72 4.99-.72zm-9.5-2l-1.41-1.41-1.68 1.68 1.37 1.37C.39 8.12 0 10.04 0 12c0 3.7 2.01 6.92 4.99 8.65l1.01-1.75A8.02 8.02 0 0 1 4 12c0-1.27.27-2.48.74-3.57l-1.24-1.93zM12 17.5a9.77 9.77 0 0 1-8.82-5.5.5.5 0 0 1 0-.5C3.73 7.11 8 4 13 4c1.27 0 2.49.2 3.64.57l-1.65 1.65c-1.36-.28-2.8-.72-4.99-.72-3.3 0-5.88 2.25-6.85 5.5C4.5 14.43 7.97 17.5 12 17.5zm6.5-3c0 .36-.04.72-.11 1.07l1.61 1.61c.47-.83.75-1.78.75-2.78 0-3.7-2.01-6.92-4.99-8.65l-1.01 1.75A8.02 8.02 0 0 1 20 12v.5z"/>
                            </svg>
                            Hide
                          </>
                        ) : (
                          <>
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                              <path d="M12 6.5a9.77 9.77 0 0 1 8.82 5.5 9.647 9.647 0 0 1-2.41 3.12l1.41 1.41c1.39-1.23 2.49-2.77 3.18-4.53C21.27 7.11 17 4 12 4c-1.27 0-2.49.2-3.64.57l1.65 1.65c1.36-.28 2.8-.72 4.99-.72zm-9.5-2l-1.41-1.41-1.68 1.68 1.37 1.37C.39 8.12 0 10.04 0 12c0 3.7 2.01 6.92 4.99 8.65l1.01-1.75A8.02 8.02 0 0 1 4 12c0-1.27.27-2.48.74-3.57l-1.24-1.93zM12 17.5a9.77 9.77 0 0 1-8.82-5.5.5.5 0 0 1 0-.5C3.73 7.11 8 4 13 4c1.27 0 2.49.2 3.64.57l-1.65 1.65c-1.36-.28-2.8-.72-4.99-.72-3.3 0-5.88 2.25-6.85 5.5C4.5 14.43 7.97 17.5 12 17.5z"/>
                            </svg>
                            Show
                          </>
                        )}
                      </button>
                    </div>
                    <input 
                      name="phone" 
                      type="tel" 
                      placeholder="Phone (e.g. +918089391497)" 
                      value={formData.phone} 
                      onChange={handleSignupChange} 
                      className="form-input" 
                      required 
                      disabled={signupLoading} 
                    />
                    <button 
                      type="submit" 
                      className={`signin-btn ${signupLoading ? 'loading' : ''}`} 
                      disabled={signupLoading}
                    >
                      {signupLoading ? 'Creating Account...' : 'Sign Up'}
                    </button>
                    <div className="login-link">
                      <p>
                        Already have an account? 
                        <button 
                          type="button" 
                          onClick={() => setActiveTab('login')} 
                          className="login-btn-link"
                        >
                          Login
                        </button>
                      </p>
                    </div>
                  </form>
                ) : (
                  <form className="signin-form" onSubmit={handleLoginSubmit}>
                    <div className="form-group">
                      <label htmlFor="login-email">Email</label>
                      <input 
                        id="login-email" 
                        name="email" 
                        type="email" 
                        value={loginData.email} 
                        onChange={handleLoginChange} 
                        required 
                        disabled={loginLoading} 
                        placeholder="you@example.com" 
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="login-password">Password</label>
                      <div className="password-input-container">
                        <input 
                          id="login-password" 
                          name="password" 
                          type={showLoginPassword ? 'text' : 'password'} 
                          value={loginData.password} 
                          onChange={handleLoginChange} 
                          required 
                          disabled={loginLoading} 
                          placeholder="••••••" 
                          minLength={6} 
                          className="form-input"
                        />
                        <button 
                          type="button" 
                          className={`show-pass-btn ${loginLoading ? 'disabled' : ''}`} 
                          onClick={() => setShowLoginPassword(s => !s)} 
                          disabled={loginLoading}
                          aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                        >
                          {showLoginPassword ? (
                            <>
                              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                                <path d="M12 6.5a9.77 9.77 0 0 1 8.82 5.5 9.647 9.647 0 0 1-2.41 3.12l1.41 1.41c1.39-1.23 2.49-2.77 3.18-4.53C21.27 7.11 17 4 12 4c-1.27 0-2.49.2-3.64.57l1.65 1.65c1.36-.28 2.8-.72 4.99-.72zm-9.5-2l-1.41-1.41-1.68 1.68 1.37 1.37C.39 8.12 0 10.04 0 12c0 3.7 2.01 6.92 4.99 8.65l1.01-1.75A8.02 8.02 0 0 1 4 12c0-1.27.27-2.48.74-3.57l-1.24-1.93zM12 17.5a9.77 9.77 0 0 1-8.82-5.5.5.5 0 0 1 0-.5C3.73 7.11 8 4 13 4c1.27 0 2.49.2 3.64.57l-1.65 1.65c-1.36-.28-2.8-.72-4.99-.72-3.3 0-5.88 2.25-6.85 5.5C4.5 14.43 7.97 17.5 12 17.5zm6.5-3c0 .36-.04.72-.11 1.07l1.61 1.61c.47-.83.75-1.78.75-2.78 0-3.7-2.01-6.92-4.99-8.65l-1.01 1.75A8.02 8.02 0 0 1 20 12v.5z"/>
                              </svg>
                              Hide
                            </>
                          ) : (
                            <>
                              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                                <path d="M12 6.5a9.77 9.77 0 0 1 8.82 5.5 9.647 9.647 0 0 1-2.41 3.12l1.41 1.41c1.39-1.23 2.49-2.77 3.18-4.53C21.27 7.11 17 4 12 4c-1.27 0-2.49.2-3.64.57l1.65 1.65c1.36-.28 2.8-.72 4.99-.72zm-9.5-2l-1.41-1.41-1.68 1.68 1.37 1.37C.39 8.12 0 10.04 0 12c0 3.7 2.01 6.92 4.99 8.65l1.01-1.75A8.02 8.02 0 0 1 4 12c0-1.27.27-2.48.74-3.57l-1.24-1.93zM12 17.5a9.77 9.77 0 0 1-8.82-5.5.5.5 0 0 1 0-.5C3.73 7.11 8 4 13 4c1.27 0 2.49.2 3.64.57l-1.65 1.65c-1.36-.28-2.8-.72-4.99-.72-3.3 0-5.88 2.25-6.85 5.5C4.5 14.43 7.97 17.5 12 17.5z"/>
                              </svg>
                              Show
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                    <div className="form-meta-row">
                      <div className="remember-wrap">
                        <input 
                          id="remember-login" 
                          type="checkbox" 
                          disabled={loginLoading} 
                        />
                        <label htmlFor="remember-login">Remember me</label>
                      </div>
                      <button
                        type="button"
                        className="forgot-password-link"
                        onClick={handleForgotPasswordClick}
                        disabled={loginLoading}
                      >
                        Forgot Password?
                      </button>
                    </div>
                    <button 
                      type="submit" 
                      className="auth-submit" 
                      disabled={loginLoading}
                    >
                      {loginLoading ? 'Signing in...' : 'Sign In'}
                    </button>
                    <div className="divider"><span>Or</span></div>
                    <p className="signup-text">
                      Don't have an account? 
                      <button 
                        type="button" 
                        onClick={() => setActiveTab('signup')} 
                        className="link-btn"
                      >
                        Create one
                      </button>
                    </p>
                  </form>
                )}
              </>
            ) : (
              // Forgot Password Form
              <div>
                <div className="form-header">
                  <h2 className="form-title">Reset Password</h2>
                  <p className="form-subtitle">
                    Enter your email address and we'll send you a link to reset your password.
                  </p>
                </div>

                <form className="signin-form" onSubmit={handleForgotPassword}>
                  <div className="form-group">
                    <label htmlFor="forgot-email">Email Address</label>
                    <input 
                      id="forgot-email"
                      type="email" 
                      value={forgotPasswordEmail}
                      onChange={(e) => setForgotPasswordEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="form-input"
                      required
                      disabled={forgotPasswordLoading}
                    />
                  </div>
                  
                  <button 
                    type="submit" 
                    className={`auth-submit ${forgotPasswordLoading ? 'loading' : ''}`}
                    disabled={forgotPasswordLoading}
                  >
                    {forgotPasswordLoading ? 'Sending...' : 'Send Reset Link'}
                  </button>
                  
                  <div className="signup-text">
                    <button 
                      type="button" 
                      onClick={handleBackToLogin}
                      className="login-btn-link"
                      disabled={forgotPasswordLoading}
                    >
                      ← Back to Login
                    </button>
                  </div>
                </form>
              </div>
            )}

            <footer className="auth-footer">
              © {new Date().getFullYear()} Allora Spa. All rights reserved.
            </footer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignInPage;

