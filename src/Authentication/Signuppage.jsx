import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './Signuppage.css';
import { useAuth } from '../Service/Context';
import Swal from 'sweetalert2';

const SignInPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { register, login } = useAuth();
  const from = location.state?.from?.pathname || null;

  // Tabs
  const [activeTab, setActiveTab] = useState('login');

  // Signup state
  const [formData, setFormData] = useState({ firstName: '', lastName: '', email: '', password: '', phone: '' });
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [signupLoading, setSignupLoading] = useState(false);
  const [signupError, setSignupError] = useState('');

  // Login state
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

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
        Swal.fire({ title: 'Account created', text: 'Signup successful. Please sign in.', icon: 'success', timer: 1400, showConfirmButton: false });
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
      const result = await login({ email: loginData.email, password: loginData.password });
      if (result.success) {
        const userData = result.user;
        Swal.fire({ title: 'Success', text: 'Logged in successfully', icon: 'success', timer: 1400, showConfirmButton: false });
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
            <div className="auth-tabs">
              <button type="button" className={activeTab === 'login' ? 'tab active' : 'tab'} onClick={() => setActiveTab('login')}>Login</button>
              <button type="button" className={activeTab === 'signup' ? 'tab active' : 'tab'} onClick={() => setActiveTab('signup')}>Sign Up</button>
            </div>

            <div className="form-header">
              <h2 className="form-title">{activeTab === 'login' ? 'Sign in to your account' : 'Create an account'}</h2>
              <p className="form-subtitle">{activeTab === 'login' ? 'Access your bookings and profile' : 'Join Allora to manage bookings'}</p>
            </div>

            {activeTab === 'signup' && signupError && <div className="error-message">{signupError}</div>}
            {activeTab === 'login' && loginError && <div className="error-message">{loginError}</div>}

            {activeTab === 'signup' ? (
              <form className="signin-form" onSubmit={handleSignupSubmit}>
                <div className="form-row">
                  <input name="firstName" type="text" placeholder="First Name" value={formData.firstName} onChange={handleSignupChange} className="form-input half-width" required disabled={signupLoading} />
                  <input name="lastName" type="text" placeholder="Last Name" value={formData.lastName} onChange={handleSignupChange} className="form-input half-width" required disabled={signupLoading} />
                </div>
                <input name="email" type="email" placeholder="Email Address" value={formData.email} onChange={handleSignupChange} className="form-input" required disabled={signupLoading} />
                <div className="password-input-container">
                  <input name="password" type={showSignupPassword ? 'text' : 'password'} placeholder="Password" value={formData.password} onChange={handleSignupChange} className="form-input" required disabled={signupLoading} />
                  <button type="button" className="password-toggle" onClick={() => setShowSignupPassword(s => !s)} disabled={signupLoading}>{showSignupPassword ? 'Hide' : 'Show'}</button>
                </div>
                <input name="phone" type="tel" placeholder="Phone (e.g. +918089391497)" value={formData.phone} onChange={handleSignupChange} className="form-input" required disabled={signupLoading} />
                <button type="submit" className={`signin-btn ${signupLoading ? 'loading' : ''}`} disabled={signupLoading}>{signupLoading ? 'Creating Account...' : 'Sign Up'}</button>
                <div className="login-link"><p>Already have an account? <button type="button" onClick={() => setActiveTab('login')} className="login-btn-link">Login</button></p></div>
              </form>
            ) : (
              <form className="signin-form" onSubmit={handleLoginSubmit}>
                <div className="form-group">
                  <label htmlFor="login-email">Email</label>
                  <input id="login-email" name="email" type="email" value={loginData.email} onChange={handleLoginChange} required disabled={loginLoading} placeholder="you@example.com" />
                </div>
                <div className="form-group">
                  <label htmlFor="login-password" className="form-label-row">
                    <span>Password</span>
                    <button type="button" className="show-pass-btn" onClick={() => setShowLoginPassword(s=>!s)} disabled={loginLoading}>{showLoginPassword ? 'Hide' : 'Show'}</button>
                  </label>
                  <div className="password-wrapper">
                    <input id="login-password" name="password" type={showLoginPassword ? 'text' : 'password'} value={loginData.password} onChange={handleLoginChange} required disabled={loginLoading} placeholder="••••••" minLength={6} />
                  </div>
                </div>
                <div className="form-meta-row">
                  <div className="remember-wrap"><input id="remember-login" type="checkbox" disabled={loginLoading} /><label htmlFor="remember-login">Remember me</label></div>
                </div>
                <button type="submit" className="auth-submit" disabled={loginLoading}>{loginLoading ? 'Signing in...' : 'Sign In'}</button>
                <div className="divider"><span>Or</span></div>
                <p className="signup-text">Don't have an account? <button type="button" onClick={() => setActiveTab('signup')} className="link-btn">Create one</button></p>
              </form>
            )}

            <footer className="auth-footer">© {new Date().getFullYear()} Allora Spa. All rights reserved.</footer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignInPage;