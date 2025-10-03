import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

// Create authentication context
const AuthContext = createContext();

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Auth provider component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [token, setToken] = useState(null);

  // Check if user is authenticated on app load
  useEffect(() => {
    const checkAuth = async () => {
      const savedToken = localStorage.getItem('token');
      const savedUser = localStorage.getItem('user');

      if (savedToken && savedUser) {
        try {
          const response = await authAPI.getCurrentUser();
          if (response.success) {
            setUser(response.data.user);
            setToken(savedToken);
            setIsAuthenticated(true);
          } else {
            logout();
          }
        } catch (error) {
          console.error('Auth check failed:', error);
          logout();
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  // Monitor token changes
  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    if (savedToken && !token) {
      setToken(savedToken);
    }
  }, [token]);

  const login = async (credentials) => {
    try {
      const response = await authAPI.login(credentials);
      
      if (response.success && response.token && response.data) {
        const { token } = response;
        const { user: userData } = response.data;
        
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userData));
        
        setUser(userData);
        setToken(token);
        setIsAuthenticated(true);
        
        return { success: true, user: userData };
      }
      return { success: false, message: 'Login failed' };
    } catch (error) {
      console.error('Context: Login error:', error);
      return { success: false, message: error.message };
    }
  };

  const register = async (userData) => {
    try {
      const response = await authAPI.register(userData);
      return response.success 
        ? { success: true, message: 'Registration successful' }
        : { success: false, message: 'Registration failed' };
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, message: error.message };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setToken(null);
    setIsAuthenticated(false);
    authAPI.logout().catch(console.error);
  };

   const resetPassword = async ({ email }) => {
    try {
      console.log('[Auth] Initiating password reset for:', email);
      
      const response = await fetch('https://api.alloraspadubai.com/api/v1/auth/forgot-password', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ email })
      });

      console.log('[Auth] Reset password response status:', response.status);
      
      const data = await response.json();
      console.log('[Auth] Reset password response:', data);

      if (response.ok && data.success) {
        return {
          success: true,
          message: data.message || 'Password reset email sent successfully'
        };
      } else {
        throw new Error(data.message || 'Failed to send reset email');
      }
    } catch (error) {
      console.error('[Auth] Reset password error:', error);
      return {
        success: false,
        message: error.message || 'Failed to send reset link'
      };
    }
  };

  // Check if user has specific role
  const hasRole = (role) => {
    return user && user.role === role;
  };

  // Check if user is admin
  const isAdmin = () => {
    return hasRole('admin');
  };

  // Check if user is employee
  const isEmployee = () => {
    return hasRole('employee');
  };

  // Check if user is client
  const isClient = () => {
    return hasRole('client');
  };

  const value = {
    user,
    token,
    loading,
    isAuthenticated,
    login,
    register,
    logout,
    resetPassword,
    hasRole,
    isAdmin,
    isEmployee,
    isClient
  };

  console.log('Context: Current state:', { user, token, isAuthenticated, loading });

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;