import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';
import { apiClient } from '../services/api';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Initialize auth state from localStorage
  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    if (savedToken) {
      setToken(savedToken);
      setIsAuthenticated(true);
      loadUserData(savedToken);
    }
  }, []);

  // Set auth token in axios headers whenever it changes
  useEffect(() => {
    if (token) {
      // Set token for both axios defaults and the apiClient instance
      const authHeader = `Bearer ${token}`;
      axios.defaults.headers.common['Authorization'] = authHeader;
      
      // Also set it on apiClient from api.js if it's available
      if (apiClient && apiClient.defaults) {
        apiClient.defaults.headers.common['Authorization'] = authHeader;
      }
      
      console.log('Token applied to axios headers:', token ? 'YES (token exists)' : 'NO');
    } else {
      delete axios.defaults.headers.common['Authorization'];
      
      // Also remove from apiClient
      if (apiClient && apiClient.defaults) {
        delete apiClient.defaults.headers.common['Authorization'];
      }
      
      console.log('Token removed from axios headers');
    }
  }, [token]);

  // Listen for auth-failed events
  useEffect(() => {
    const handleAuthFailed = () => {
      console.log('Auth failed event received - logging out user');
      logout();
    };
    
    window.addEventListener('auth-failed', handleAuthFailed);
    return () => {
      window.removeEventListener('auth-failed', handleAuthFailed);
    };
  }, []);

  // Load user data using the token
  const loadUserData = async (authToken) => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      });
      setUser(response.data);
    } catch (err) {
      console.error('Failed to load user data:', err);
      localStorage.removeItem('token');
      setToken(null);
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  // Login function
  const login = async (email, password) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log(`Attempting login with email: ${email}`);
      console.log(`API URL: ${API_URL}/auth/login`);
      
      // Add request details for debugging
      console.log('Login request details:', {
        url: `${API_URL}/auth/login`,
        method: 'POST',
        data: { email, password: '***' }
      });
      
      const response = await axios.post(`${API_URL}/auth/login`, {
        email,
        password
      });
      
      console.log('Login successful:', response.data);
      
      const { token: authToken, user: userData } = response.data;
      
      if (!authToken) {
        throw new Error('No token received from server');
      }
      
      // Save token to localStorage
      localStorage.setItem('token', authToken);
      
      // Update state
      setToken(authToken);
      setUser(userData);
      setIsAuthenticated(true);
      
      // Apply token to axios globally
      axios.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
      if (apiClient && apiClient.defaults) {
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
      }
      
      console.log('Authentication completed, token applied to headers');
      
      return response.data;
    } catch (err) {
      console.error('Login error:', err);
      let errorMessage = 'Login failed';
      
      // Extract meaningful error messages
      if (err.response) {
        // Response from server with error
        errorMessage = err.response.data?.error || err.response.data?.message || 'Login failed';
      }
      
      // Set the error state
      setError(errorMessage);
      
      // Make sure to reset states
      setLoading(false);
      setIsAuthenticated(false);
      
      // Rethrow the error so it can be caught by the component
      throw err;
    } finally {
      // Ensure loading state is reset even in success case
      setLoading(false);
    }
  };

  // Logout function
  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setIsAuthenticated(false);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, error, isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};