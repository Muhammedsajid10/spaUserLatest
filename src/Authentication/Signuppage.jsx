import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./Signuppage.css";
import { useAuth } from "../Service/Context";
import Swal from "sweetalert2";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";

const SignInPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { register, login, resetPassword } = useAuth();
  const from = location.state?.from?.pathname || null;

  // Tabs
  const [activeTab, setActiveTab] = useState("login");

  // Signup state
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    phone: "",
  });
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [signupLoading, setSignupLoading] = useState(false);
  const [signupError, setSignupError] = useState("");

  // Login state
  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");

  // Forgot password state
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const handleSignupChange = (e) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
    if (signupError) setSignupError("");
  };

  const handleLoginChange = (e) => {
    const { name, value } = e.target;
    setLoginData((p) => ({ ...p, [name]: value }));
    if (loginError) setLoginError("");
  };

  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    setSignupLoading(true);
    setSignupError("");
    try {
      const result = await register({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password,
        phone: formData.phone.replace(/\s+/g, ""),
      });
      if (result.success) {
        Swal.fire({
          title: "Account created",
          text: "Signup successful. Please sign in.",
          icon: "success",
          timer: 1400,
          showConfirmButton: false,
        });
        setActiveTab("login");
      } else {
        setSignupError(result.message || "Signup failed.");
      }
    } catch (err) {
      console.error("Signup Error:", err);
      setSignupError(err.message || "Signup failed.");
    } finally {
      setSignupLoading(false);
    }
  };

  const getRedirectPath = (role) => {
    if (from) return from;
    switch (role) {
      case "admin":
        return "/admin/dashboard";
      case "employee":
        return "/employee/dashboard";
      default:
        return "/payment";
    }
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError("");
    try {
      const result = await login({
        email: loginData.email,
        password: loginData.password,
      });
      if (result.success) {
        const userData = result.user;
        Swal.fire({
          title: "Success",
          text: "Logged in successfully",
          icon: "success",
          timer: 1400,
          showConfirmButton: false,
        });
        const redirect = getRedirectPath(userData.role);
        setTimeout(() => navigate(redirect, { replace: true }), 400);
      } else {
        setLoginError(result.message || "Login failed.");
      }
    } catch (err) {
      console.error("Login Error:", err);
      setLoginError(err.message || "Login failed.");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!forgotPasswordEmail.trim()) {
      Swal.fire({
        title: "Email Required",
        text: "Please enter your email address.",
        icon: "warning",
        confirmButtonText: "OK",
      });
      return;
    }

    setForgotPasswordLoading(true);
    try {
      if (resetPassword) {
        const result = await resetPassword({ email: forgotPasswordEmail });
        if (result.success) {
          Swal.fire({
            title: "Reset Link Sent",
            text: "Please check your email for password reset instructions.",
            icon: "success",
            confirmButtonText: "OK",
          });
          setShowForgotPassword(false);
          setForgotPasswordEmail("");
        } else {
          Swal.fire({
            title: "Error",
            text: result.message || "Failed to send reset email.",
            icon: "error",
            confirmButtonText: "OK",
          });
        }
      } else {
        Swal.fire({
          title: "Reset Link Sent",
          text: "Please check your email for password reset instructions.",
          icon: "success",
          confirmButtonText: "OK",
        });
        setShowForgotPassword(false);
        setForgotPasswordEmail("");
      }
    } catch (err) {
      console.error("Forgot Password Error:", err);
      Swal.fire({
        title: "Error",
        text: err.message || "Failed to send reset email.",
        icon: "error",
        confirmButtonText: "OK",
      });
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  const handleForgotPasswordClick = () => {
    setForgotPasswordEmail(loginData.email || "");
    setShowForgotPassword(true);
  };

  const handleBackToLogin = () => {
    setShowForgotPassword(false);
    setForgotPasswordEmail("");
  };

  return (
    <div className="modern-auth-wrapper">
      <div className="modern-auth-container">
        <div className=" ">
          <div className="modern-auth-header">
            <h1 className="modern-auth-title">
              {showForgotPassword
                ? "Reset Password"
                : activeTab === "login"
                ? "Sign in to your account"
                : "Create Account"}
            </h1>
            <p className="modern-auth-subtitle">
              {showForgotPassword
                ? "Enter your email to reset your password"
                : activeTab === "login"
                ? "Access your bookings and profile"
                : "Join Allora to manage your profile"}
            </p>
          </div>

          {!showForgotPassword && (
            <div className="modern-tab-switcher">
              <button
                type="button"
                className={`modern-tab-btn ${
                  activeTab === "login" ? "modern-tab-active" : ""
                }`}
                onClick={() => setActiveTab("login")}
              >
                Sign In
              </button>
              <button
                type="button"
                className={`modern-tab-btn ${
                  activeTab === "signup" ? "modern-tab-active" : ""
                }`}
                onClick={() => setActiveTab("signup")}
              >
                Sign Up
              </button>
            </div>
          )}

          {signupError && activeTab === "signup" && (
            <div className="modern-error-alert">{signupError}</div>
          )}
          {loginError && activeTab === "login" && (
            <div className="modern-error-alert">{loginError}</div>
          )}

          {showForgotPassword ? (
            <form className="modern-auth-form" onSubmit={handleForgotPassword}>
              <div className="modern-field-group">
                <label className="modern-field-label">Email Address</label>
                <div className="modern-input-wrapper">
                  <svg
                    className="modern-input-icon"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <path
                      d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"
                      fill="currentColor"
                    />
                  </svg>
                  <input
                    type="email"
                    className="modern-input-field"
                    value={forgotPasswordEmail}
                    onChange={(e) => setForgotPasswordEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                    disabled={forgotPasswordLoading}
                  />
                </div>
              </div>

              <button
                type="submit"
                className={`modern-primary-btn ${
                  forgotPasswordLoading ? "modern-btn-loading" : ""
                }`}
                disabled={forgotPasswordLoading}
              >
                {forgotPasswordLoading ? "Sending..." : "Send Reset Link"}
              </button>

              <button
                type="button"
                onClick={handleBackToLogin}
                className="modern-secondary-btn"
                disabled={forgotPasswordLoading}
              >
                ← Back to Sign In
              </button>
            </form>
          ) : activeTab === "login" ? (
            <form className="modern-auth-form" onSubmit={handleLoginSubmit}>
              <div className="modern-field-group">
                <label className="modern-field-label">Email</label>
                <div className="modern-input-wrapper">
                  <svg
                    className="modern-input-icon"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <path
                      d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"
                      fill="currentColor"
                    />
                  </svg>
                  <input
                    name="email"
                    type="email"
                    className="modern-input-field"
                    value={loginData.email}
                    onChange={handleLoginChange}
                    placeholder="Enter your email"
                    required
                    disabled={loginLoading}
                  />
                </div>
              </div>

              <div className="modern-field-group">
                <label className="modern-field-label">Password</label>
                <div className="modern-input-wrapper">
                  <svg
                    className="modern-input-icon"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <path
                      d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"
                      fill="currentColor"
                    />
                  </svg>
                  <input
                    name="password"
                    type={showLoginPassword ? "text" : "password"}
                    className="modern-input-field modern-input-with-btn"
                    value={loginData.password}
                    onChange={handleLoginChange}
                    placeholder="Enter your password"
                    required
                    disabled={loginLoading}
                  />
                  <button
                    type="button"
                    className="modern-password-toggle"
                    onClick={() => setShowLoginPassword((s) => !s)}
                    disabled={loginLoading}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      {showLoginPassword ? (
                        <path
                          d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"
                          fill="currentColor"
                        />
                      ) : (
                        <path
                          d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"
                          fill="currentColor"
                        />
                      )}
                    </svg>
                  </button>
                </div>
              </div>

              <div className="modern-form-extras">
                <label className="modern-checkbox-wrapper">
                  <input type="checkbox" disabled={loginLoading} />
                  <span className="modern-checkbox-label">Remember me</span>
                </label>
                <button
                  type="button"
                  className="modern-link-btn"
                  onClick={handleForgotPasswordClick}
                  disabled={loginLoading}
                >
                  Forgot Password?
                </button>
              </div>

              <button
                type="submit"
                className={`modern-primary-btn ${
                  loginLoading ? "modern-btn-loading" : ""
                }`}
                disabled={loginLoading}
              >
                {loginLoading ? "Signing in..." : "Sign In"}
              </button>

              <div className="modern-divider">
                <span>Or</span>
              </div>

              <p className="modern-switch-text">
                Don't have an account?{" "}
                <button
                  type="button"
                  onClick={() => setActiveTab("signup")}
                  className="modern-link-btn modern-link-highlight"
                >
                  Create an account
                </button>
              </p>
            </form>
          ) : (
            <form className="modern-auth-form" onSubmit={handleSignupSubmit}>
              <div className="modern-form-row">
                <div className="modern-field-group">
                  <label className="modern-field-label">First Name</label>
                  <input
                    name="firstName"
                    type="text"
                    className="modern-input-field"
                    value={formData.firstName}
                    onChange={handleSignupChange}
                    placeholder="First Name"
                    required
                    disabled={signupLoading}
                  />
                </div>
                <div className="modern-field-group">
                  <label className="modern-field-label">Last Name</label>
                  <input
                    name="lastName"
                    type="text"
                    className="modern-input-field"
                    value={formData.lastName}
                    onChange={handleSignupChange}
                    placeholder="Last Name"
                    required
                    disabled={signupLoading}
                  />
                </div>
              </div>

              <div className="modern-field-group">
                <label className="modern-field-label">Email Address</label>
                <div className="modern-input-wrapper">
                  <svg
                    className="modern-input-icon"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <path
                      d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"
                      fill="currentColor"
                    />
                  </svg>
                  <input
                    name="email"
                    type="email"
                    className="modern-input-field"
                    value={formData.email}
                    onChange={handleSignupChange}
                    placeholder="Email Address"
                    required
                    disabled={signupLoading}
                  />
                </div>
              </div>

              <div className="modern-field-group">
                <label className="modern-field-label">Password</label>
                <div className="modern-input-wrapper">
                  <svg
                    className="modern-input-icon"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <path
                      d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"
                      fill="currentColor"
                    />
                  </svg>
                  <input
                    name="password"
                    type={showSignupPassword ? "text" : "password"}
                    className="modern-input-field modern-input-with-btn"
                    value={formData.password}
                    onChange={handleSignupChange}
                    placeholder="Password"
                    required
                    disabled={signupLoading}
                  />
                  <button
                    type="button"
                    className="modern-password-toggle"
                    onClick={() => setShowSignupPassword((s) => !s)}
                    disabled={signupLoading}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      {showSignupPassword ? (
                        <path
                          d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"
                          fill="currentColor"
                        />
                      ) : (
                        <path
                          d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"
                          fill="currentColor"
                        />
                      )}
                    </svg>
                  </button>
                </div>
              </div>

              <div className="modern-field-group">
                <label className="modern-field-label">Phone Number</label>
                <PhoneInput
                  country={"ae"} // default country (India)
                  value={formData.phone}
                  onChange={(phone) => setFormData((p) => ({ ...p, phone }))}
                  inputClass="modern-input-field"
                  dropdownClass="modern-input-dropdown"
                  inputProps={{
                    name: "phone",
                    required: true,
                    disabled: signupLoading,
                  }}
                />
              </div>

              <button
                type="submit"
                className={`modern-primary-btn ${
                  signupLoading ? "modern-btn-loading" : ""
                }`}
                disabled={signupLoading}
              >
                {signupLoading ? "Creating Account..." : "Sign Up"}
              </button>

              <p className="modern-switch-text">
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => setActiveTab("login")}
                  className="modern-link-btn modern-link-highlight"
                >
                  Sign In
                </button>
              </p>
            </form>
          )}
          <footer className="auth-footer">
            © {new Date().getFullYear()} Allora Spa. All rights reserved.
          </footer>
        </div>
      </div>
    </div>
  );
};

export default SignInPage;
