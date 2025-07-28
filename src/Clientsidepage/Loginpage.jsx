// LoginPage.jsx
import React, { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import "./Loginpage.css";
import { useAuth } from "../Service/Context";

import Swal from "sweetalert2";
const LoginPage = () => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  // Get the page user was trying to access before login
  const from = location.state?.from?.pathname || null;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevState) => ({
      ...prevState,
      [name]: value,
    }));
    // Clear error when user starts typing
    if (error) setError("");
  };

  const getRedirectPath = (userRole) => {
    // If user was trying to access a specific page, go there
    if (from) {
      return from;
    }

    // Otherwise, redirect based on role
    switch (userRole) {
      case "admin":
        return "/admin/dashboard";
      case "employee":
        return "/employee/dashboard";
      case "client":
      default:
        return "/payment"; // Redirect clients to payment page
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      console.log("Attempting login with:", { email: formData.email });

      const result = await login({
        email: formData.email,
        password: formData.password,
      });

      console.log("Login result:", result);

      if (result.success) {
        console.log("Login successful");

        // Get user data from the login result
        const userData = result.user;
        console.log("User data from login result:", userData);

        const redirectPath = getRedirectPath(userData.role);
        console.log("Calculated redirect path:", redirectPath);

        // Show success message based on role
        if (userData.role === "admin") {
          // alert('Login successful! Welcome to Admin Dashboard.');
          Swal.fire({
            title: "Success!",
            text: "Successfully Logined!",
            icon: "success",
          });
        } else if (userData.role === "employee") {
          alert("Login successful! Welcome to Employee Dashboard.");
        } else {
          //   alert("Login successful! Welcome back. Proceeding to payment.");
          Swal.fire({
            title: "Sucess!",
            text: "Successfully Logined!",
            icon: "success",
          });
        }

        console.log("About to navigate to:", redirectPath);

        // Add a small delay to ensure state updates are complete
        setTimeout(() => {
          console.log("Navigating after delay to:", redirectPath);
          navigate(redirectPath, { replace: true });
        }, 100);
      } else {
        setError(
          result.message || "Login failed. Please check your credentials."
        );
      }
    } catch (err) {
      console.error("Login error:", err);
      setError(err.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignupClick = () => {
    navigate("/signup");
  };

  return (
    <div className="login-container">
      <div className="left-section">
        <div className="brand-content">
          <h1 className="brand-title">Allora</h1>
          <p className="brand-subtitle">The most popular media centre</p>
          <button className="read-more-btn">Read More</button>
        </div>
      </div>

      <div className="right-section">
        <div className="login-form-container">
          <div className="form-header">
            <h2 className="form-title">Hello Again!</h2>
            <p className="form-subtitle">Welcome Back</p>
          </div>

          {error && <div className="error-message">{error}</div>}

          <form className="login-form" onSubmit={handleSubmit}>
            <input
              type="email"
              name="email"
              placeholder="Email Address"
              value={formData.email}
              onChange={handleInputChange}
              className="form-input"
              required
              disabled={loading}
            />

            <div className="password-input-container">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Password"
                value={formData.password}
                onChange={handleInputChange}
                className="form-input"
                required
                disabled={loading}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading}
              >
                {showPassword ? (
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>

            <button
              type="submit"
              className={`login-btn ${loading ? "loading" : ""}`}
              disabled={loading}
            >
              {loading ? "Logging in..." : "Login"}
            </button>

            <Link to="/forgot-password" className="forgot-password">
              Forgot Password
            </Link>

            <div className="signup-link">
              <p>
                Don't have an account?{" "}
                <button
                  type="button"
                  onClick={handleSignupClick}
                  className="signup-btn"
                >
                  Sign Up
                </button>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
