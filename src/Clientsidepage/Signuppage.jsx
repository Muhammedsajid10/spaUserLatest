import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Signuppage.css';
import { useAuth } from '../Service/Context';
import alloraLogo from '../assets/alloraLogo.jpg';
import Swal from 'sweetalert2';

const SignInPage = () => {
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        phone: ''
    });

    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const { register } = useAuth();

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prevState => ({
            ...prevState,
            [name]: value
        }));
        if (error) setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

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
                    title: 'Success!',
                    text: 'Signup successful! Please log in to continue.',
                    icon: 'success'
                });
                navigate('/login');
            } else {
                setError(result.message || 'Signup failed. Please try again.');
            }
        } catch (error) {
            setError(error.message || 'Signup failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleLoginClick = () => {
        navigate('/login');
    };

    return (
        <div className="signin-page-wrapper">
            <div className="page-header">
                <div className="header-content-container">
                    <a href="/" className="logo-link">
                        <img src={alloraLogo} alt="Allora Spa" className="header-logo" />
                    </a>
                </div>
            </div>

            <div className="signin-content-container">
                <div className="signin-card">
                    <div className="form-header">
                        <h2 className="form-title">Sign up</h2>
                    </div>

                    {error && (
                        <div className="error-message">
                            {error}
                        </div>
                    )}

                    <form className="signin-form" onSubmit={handleSubmit}>
                        <div className="form-row">
                            <input
                                type="text"
                                name="firstName"
                                placeholder="First Name"
                                value={formData.firstName}
                                onChange={handleInputChange}
                                className="form-input half-width"
                                required
                                disabled={loading}
                            />
                            <input
                                type="text"
                                name="lastName"
                                placeholder="Last Name"
                                value={formData.lastName}
                                onChange={handleInputChange}
                                className="form-input half-width"
                                required
                                disabled={loading}
                            />
                        </div>

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

                        <input
                            type="tel"
                            name="phone"
                            placeholder="Phone (e.g. +918089391497)"
                            value={formData.phone}
                            onChange={handleInputChange}
                            className="form-input"
                            required
                            disabled={loading}
                        />

                        <button 
                            type="submit" 
                            className={`signin-btn ${loading ? 'loading' : ''}`}
                            disabled={loading}
                        >
                            {loading ? (
                                <div className="loading-container">
                                    <div className="loading-dots">
                                        <div className="dot"></div>
                                        <div className="dot"></div>
                                        <div className="dot"></div>
                                    </div>
                                    <span>Creating Account...</span>
                                </div>
                            ) : (
                                'Sign Up'
                            )}
                        </button>

                        <div className="login-link">
                            <p>Already have an account? <button type="button" onClick={handleLoginClick} className="login-btn-link">Login</button></p>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default SignInPage;