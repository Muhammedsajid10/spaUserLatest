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
          // Verify token with backend
          const response = await authAPI.getCurrentUser();
          if (response.success) {
            setUser(response.data.user);
            setToken(savedToken);
            setIsAuthenticated(true);
          } else {
            // Token is invalid, clear storage
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
      console.log('Context: Setting token from localStorage:', savedToken);
      setToken(savedToken);
    }
  }, [token]);

  // Login function
  const login = async (credentials) => {
    try {
      console.log('Context: Starting login process...');
      const response = await authAPI.login(credentials);
      
      console.log('Context: Login API response:', response);
      
      if (response.success && response.token && response.data) {
        const { token } = response;
        const { user: userData } = response.data;
        
        console.log('Context: Login successful, token:', token);
        console.log('Context: Login successful, user data:', userData);
        
        // Store in localStorage
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userData));
        
        // Update state
        setUser(userData);
        setToken(token);
        setIsAuthenticated(true);
        
        console.log('Context: State updated, isAuthenticated set to true');
        
        return { success: true, user: userData };
      } else {
        console.log('Context: Login failed, response:', response);
        return { success: false, message: 'Login failed' };
      }
    } catch (error) {
      console.error('Context: Login error:', error);
      return { success: false, message: error.message };
    }
  };

  // Register function
  const register = async (userData) => {
    try {
      const response = await authAPI.register(userData);
      
      if (response.success) {
        return { success: true, message: 'Registration successful' };
    } else {
        return { success: false, message: 'Registration failed' };
      }
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, message: error.message };
    }
  };

  // Logout function
  const logout = () => {
    // Clear localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // Update state
    setUser(null);
    setToken(null);
    setIsAuthenticated(false);
    
    // Call logout API (optional, for server-side cleanup)
    authAPI.logout().catch(console.error);
  };

  // Update user profile
  const updateProfile = async (profileData) => {
    try {
      const response = await authAPI.updateProfile(profileData);
      
      if (response.success) {
        const updatedUser = response.data;
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
        return { success: true };
      } else {
        return { success: false, message: 'Profile update failed' };
      }
    } catch (error) {
      console.error('Profile update error:', error);
      return { success: false, message: error.message };
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
    updateProfile,
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