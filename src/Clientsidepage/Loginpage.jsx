// LoginPage.jsx
import React, { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import "./Loginpage.css";
import alloraLogo from "../assets/alloraLogo.jpg"; // Logo asset
import { useAuth } from "../Service/Context";

import Swal from "sweetalert2";
const LoginPage = () => {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const from = location.state?.from?.pathname || null;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(p => ({ ...p, [name]: value }));
    if (error) setError("");
  };

  const getRedirectPath = (role) => {
    if (from) return from;
    switch (role) {
      case 'admin': return '/admin/dashboard';
      case 'employee': return '/employee/dashboard';
      default: return '/payment';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const result = await login({ email: formData.email, password: formData.password });
      if (result.success) {
        const userData = result.user;
        Swal.fire({ title: 'Success', text: 'Logged in successfully', icon: 'success', timer: 1800, showConfirmButton: false });
        const redirect = getRedirectPath(userData.role);
        setTimeout(() => navigate(redirect, { replace: true }), 300);
      } else {
        setError(result.message || 'Login failed. Check your credentials.');
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignupClick = () => navigate('/signup');

  return (
    <div className="auth-layout">
      <div className="auth-hero">
        <div className="hero-inner">
          <img src={alloraLogo} alt="Allora Spa" className="hero-logo" />
          <h1 className="hero-brand" aria-hidden="true">Allora</h1>
          <p className="hero-tag">Wellness & Spa Excellence</p>
          <ul className="hero-points">
            <li>Award‑winning therapists</li>
            <li>Premium curated treatments</li>
            <li>Secure & seamless bookings</li>
          </ul>
        </div>
      </div>
      <div className="auth-panel">
        <div className="auth-card">
          <div className="auth-card-header">
            <div className="brand-mini">
              <img src={alloraLogo} alt="Allora Logo" className="brand-mini-logo" />
            </div>
            <h2>Sign in to your account</h2>
            <p className="subtitle">Access your bookings and profile</p>
          </div>
          {error && <div className="alert error" role="alert">{error}</div>}
          <form onSubmit={handleSubmit} className="auth-form" noValidate>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                autoComplete="email"
                required
                disabled={loading}
                placeholder="you@example.com"
              />
            </div>
            <div className="form-group">
              <label htmlFor="password" className="form-label-row">
                <span>Password</span>
                <button type="button" className="show-pass-btn" onClick={() => setShowPassword(s=>!s)} disabled={loading}>
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </label>
              <div className="password-wrapper">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  autoComplete="current-password"
                  required
                  disabled={loading}
                  placeholder="••••••••"
                  minLength={6}
                />
              </div>
            </div>
            <div className="form-meta-row">
              <div className="remember-wrap">
                <input id="remember" type="checkbox" disabled={loading} />
                <label htmlFor="remember">Remember me</label>
              </div>
              <Link to="/forgot-password" className="link-inline">Forgot password?</Link>
            </div>
            <button type="submit" className="auth-submit" disabled={loading}>
              {loading ? <span className="btn-loader" /> : 'Sign In'}
            </button>
            <div className="divider"><span>Or</span></div>
            <p className="signup-text">Don't have an account? <button type="button" onClick={handleSignupClick} className="link-btn">Create one</button></p>
          </form>
          <footer className="auth-footer">© {new Date().getFullYear()} Allora Spa. All rights reserved.</footer>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
