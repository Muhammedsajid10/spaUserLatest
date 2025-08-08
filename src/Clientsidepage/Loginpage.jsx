import React, { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import "./Loginpage.css";
import alloraLogo from '../assets/alloraLogo.jpg';
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

    const from = location.state?.from?.pathname || null;

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prevState) => ({
            ...prevState,
            [name]: value,
        }));
        if (error) setError("");
    };

    const getRedirectPath = (userRole) => {
        if (from) {
            return from;
        }
        switch (userRole) {
            case "admin": return "/admin/dashboard";
            case "employee": return "/employee/dashboard";
            case "client":
            default: return "/payment";
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const result = await login({
                email: formData.email,
                password: formData.password,
            });

            if (result.success) {
                const userData = result.user;
                if (userData.role === "admin" || userData.role === "client") {
                    Swal.fire({
                        title: "Success!",
                        text: "Successfully Logged In!",
                        icon: "success",
                    });
                } else if (userData.role === "employee") {
                    alert("Login successful! Welcome to Employee Dashboard.");
                }

                const redirectPath = getRedirectPath(userData.role);
                setTimeout(() => {
                    navigate(redirectPath, { replace: true });
                }, 100);
            } else {
                setError(result.message || "Login failed. Please check your credentials.");
            }
        } catch (err) {
            setError(err.message || "Login failed. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleSignupClick = () => {
        navigate("/signup");
    };

    return (
        <div className="login-page-wrapper">
            <header className="page-header">
                <Link to="/" className="logo-link">
                    <img src={alloraLogo} alt="Allora Spa" className="header-logo" />
                </Link>
            </header>

            <div className="login-content-container">
                <div className="login-card">
                    <div className="form-header">
                        <h2 className="form-title">Log in</h2>
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
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                                        <line x1="1" y1="1" x2="23" y2="23" />
                                    </svg>
                                ) : (
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                        <circle cx="12" cy="12" r="3" />
                                    </svg>
                                )}
                            </button>
                        </div>
                        
                        <div className="form-actions-row">
                            <label className="checkbox-container">
                                <input type="checkbox" className="form-checkbox" />
                                <span className="checkmark"></span>
                                Remember me
                            </label>
                            <Link to="/forgot-password" className="forgot-password">
                                Forgot Password?
                            </Link>
                        </div>

                        <button
                            type="submit"
                            className={`login-btn ${loading ? "loading" : ""}`}
                            disabled={loading}
                        >
                            {loading ? (
                                <div className="loading-container">
                                    <div className="loading-dots">
                                        <div className="dot"></div>
                                        <div className="dot"></div>
                                        <div className="dot"></div>
                                    </div>
                                    <span>Logging in...</span>
                                </div>
                            ) : (
                                "Login"
                            )}
                        </button>
                        
                        <div className="divider">or</div>

                        <button
                            type="button"
                            onClick={handleSignupClick}
                            className="signup-btn"
                        >
                            Sign Up
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;