import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import axios from 'axios';
import { apiClient } from '../services/api';

// Get API URL from sessionStorage (if user selected one) or use the default
const getApiUrl = () => {
  return sessionStorage.getItem('apiBaseUrl') || 
         process.env.REACT_APP_API_URL || 
         'https://app.uncharted.social/api';
};

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  // Initialize token as null instead of checking localStorage immediately
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [apiUrl, setApiUrl] = useState(getApiUrl());
  // Add isOnLoginPage flag
  const [isOnLoginPage, setIsOnLoginPage] = useState(false);
  
  // Add circuit breaker to prevent infinite auth loops
  const authAttempts = useRef(0);
  const maxAuthAttempts = 3; // Maximum number of authentication attempts before breaking the circuit
  const circuitBroken = useRef(false);
  const lastAuthAttemptTime = useRef(0);
  const AUTH_RETRY_TIMEOUT = 60000; // 1 minute cooldown period

  // Reset circuit breaker after timeout
  useEffect(() => {
    const checkCircuitReset = () => {
      if (circuitBroken.current) {
        const now = Date.now();
        if (now - lastAuthAttemptTime.current >= AUTH_RETRY_TIMEOUT) {
          console.log('Auth circuit breaker reset after timeout');
          circuitBroken.current = false;
          authAttempts.current = 0;
        }
      }
    };
    
    const interval = setInterval(checkCircuitReset, 5000);
    return () => clearInterval(interval);
  }, []);

  // Initialize auth state from localStorage only if not on login page
  useEffect(() => {
    // Skip auto-authentication if we're on the login page
    if (isOnLoginPage) {
      console.log('On login page, skipping auto-authentication');
      return;
    }
    
    const savedToken = localStorage.getItem('token');
    if (savedToken && !circuitBroken.current) {
      console.log('Found saved token, attempting to restore session');
      
      try {
        // Validate token format before proceeding (basic check)
        if (typeof savedToken !== 'string' || savedToken.length < 20) {
          console.error('Invalid token format found in localStorage');
          localStorage.removeItem('token'); // Clear invalid token
          return;
        }
        
        // Set token state but don't assume authenticated yet
        setToken(savedToken);
        
        // Attempt to load user data, but set a flag to prevent multiple concurrent attempts
        const loadingUserData = async () => {
          try {
            // Set loading state while we validate the token
            setLoading(true);
            
            // Try to load user data with a more generous timeout
            await loadUserData(savedToken);
            
            // If we get here, authentication was successful
            setIsAuthenticated(true);
            console.log('Session restored successfully');
          } catch (error) {
            console.error('Failed to restore session:', error);
            // Clear invalid token
            localStorage.removeItem('token');
            setToken(null);
            setIsAuthenticated(false);
          } finally {
            setLoading(false);
          }
        };
        
        loadingUserData();
      } catch (error) {
        console.error('Error during session restoration:', error);
        // Clear potentially corrupted token
        localStorage.removeItem('token');
        setToken(null);
      }
    }
  }, [isOnLoginPage]);
  
  // Add function to set login page status
  const setLoginPageStatus = (status) => {
    setIsOnLoginPage(status);
    if (status === true) {
      // Clear token when entering login page
      localStorage.removeItem('token');
      sessionStorage.removeItem('user');
      setToken(null);
      setUser(null);
      setIsAuthenticated(false);
    }
  };

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

  // Update API URL when it changes in sessionStorage
  useEffect(() => {
    const handleStorageChange = () => {
      const newApiUrl = getApiUrl();
      if (newApiUrl !== apiUrl) {
        setApiUrl(newApiUrl);
        
        // Update apiClient baseURL
        if (apiClient && apiClient.defaults) {
          apiClient.defaults.baseURL = newApiUrl;
          console.log('API URL updated to:', newApiUrl);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [apiUrl]);

  // Load user data (profile, permissions, etc.)
  const loadUserData = async (authToken) => {
    if (!authToken || circuitBroken.current) return;
    
    try {
      // Check for circuit breaker
      if (authAttempts.current >= maxAuthAttempts) {
        console.warn('Auth circuit breaker activated: too many failed auth attempts');
        circuitBroken.current = true;
        lastAuthAttemptTime.current = Date.now();
        setError('Too many authentication attempts. Please try again later.');
        logout();
        return;
      }
      
      authAttempts.current++;
      lastAuthAttemptTime.current = Date.now();
      
      setLoading(true);
      // Make API call to get user data
      const response = await axios.get(`${apiUrl}/auth/me`, {
        headers: { Authorization: `Bearer ${authToken}` },
        timeout: 15000 // Increased from 5 seconds to 15 seconds for consistency
      });
      
      setUser(response.data);
      setIsAuthenticated(true);
      authAttempts.current = 0; // Reset counter on success
    } catch (error) {
      console.error('Error loading user data:', error);
      
      // If we get a 401 Unauthorized, the token is invalid/expired
      if (error.response && error.response.status === 401) {
        console.log('Token invalid or expired - logging out');
        logout();
      }
      
      // If circuit breaker threshold reached
      if (authAttempts.current >= maxAuthAttempts) {
        circuitBroken.current = true;
        lastAuthAttemptTime.current = Date.now();
        setError('Authentication service unavailable. Please try again later.');
        logout();
      }
    } finally {
      setLoading(false);
    }
  };

  // Login function
  const login = async (email, password, customApiUrl = null) => {
    // Check if circuit breaker is active
    if (circuitBroken.current) {
      const now = Date.now();
      const timeRemaining = AUTH_RETRY_TIMEOUT - (now - lastAuthAttemptTime.current);
      if (timeRemaining > 0) {
        const minutes = Math.ceil(timeRemaining / 60000);
        throw new Error(`Too many failed attempts. Please try again in ${minutes} minute${minutes > 1 ? 's' : ''}.`);
      } else {
        circuitBroken.current = false;
        authAttempts.current = 0;
      }
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Use the provided custom API URL if available, otherwise use the current apiUrl
      const targetApiUrl = customApiUrl || apiUrl;
      
      console.log(`Attempting login with API URL: ${targetApiUrl}`);
      
      // If a custom API URL was provided, update our state and apiClient
      if (customApiUrl && customApiUrl !== apiUrl) {
        setApiUrl(customApiUrl);
        apiClient.defaults.baseURL = customApiUrl;
        sessionStorage.setItem('apiBaseUrl', customApiUrl);
        console.log('Updated API URL to:', customApiUrl);
      }
      
      authAttempts.current++;
      lastAuthAttemptTime.current = Date.now();
      
      const response = await axios.post(`${targetApiUrl}/auth/login`, {
        email,
        password
      }, {
        timeout: 30000 // Increased from 8000ms to 30000ms (30 seconds)
      });
      
      console.log('Login successful:', response.data);
      
      const { token: authToken, user: userData } = response.data;
      
      if (!authToken) {
        throw new Error('No token received from server');
      }
      
      // Save token to localStorage - IMPORTANT: Do this before setting isAuthenticated
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
      authAttempts.current = 0; // Reset counter on success
      
      return response.data;
    } catch (err) {
      console.error('Login error:', err);
      let errorMessage = 'Login failed';
      
      // Extract meaningful error messages
      if (err.response) {
        // Response from server with error
        errorMessage = err.response.data?.message || 
                      err.response.data?.error || 
                      `Server error: ${err.response.status}`;
                      
        // Special handling for invalid credentials
        if (err.response.status === 401) {
          errorMessage = 'Invalid email or password';
        }
        
        // Special handling for server errors
        if (err.response.status >= 500) {
          errorMessage = 'Server error. Please try again later.';
        }
      } else if (err.request) {
        // No response from server
        if (err.code === 'ECONNABORTED') {
          errorMessage = 'Connection timed out. Server may be under heavy load or unreachable.';
        } else {
          errorMessage = 'No response from server. Please check your connection.';
        }
      }
      
      setError(errorMessage);
      setIsAuthenticated(false);
      
      // If circuit breaker threshold reached
      if (authAttempts.current >= maxAuthAttempts) {
        circuitBroken.current = true;
        lastAuthAttemptTime.current = Date.now();
        setError('Too many failed login attempts. Please try again later.');
      }
      
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Register function
  const register = async (name, email, password) => {
    // Check if circuit breaker is active
    if (circuitBroken.current) {
      const now = Date.now();
      const timeRemaining = AUTH_RETRY_TIMEOUT - (now - lastAuthAttemptTime.current);
      if (timeRemaining > 0) {
        const minutes = Math.ceil(timeRemaining / 60000);
        throw new Error(`Too many failed attempts. Please try again in ${minutes} minute${minutes > 1 ? 's' : ''}.`);
      } else {
        circuitBroken.current = false;
        authAttempts.current = 0;
      }
    }
    
    try {
      setLoading(true);
      setError(null);
      
      authAttempts.current++;
      lastAuthAttemptTime.current = Date.now();
      
      const response = await axios.post(`${apiUrl}/auth/register`, {
        name,
        email,
        password
      }, {
        timeout: 30000 // Increased from 8 seconds to 30 seconds
      });
      
      console.log('Registration successful:', response.data);
      
      // Auto-login after successful registration if the server returns a token
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
        setToken(response.data.token);
        setUser(response.data.user);
        setIsAuthenticated(true);
      }
      
      authAttempts.current = 0; // Reset counter on success
      
      return response.data;
    } catch (err) {
      console.error('Registration error:', err);
      let errorMessage = 'Registration failed';
      
      if (err.response) {
        errorMessage = err.response.data?.message || 
                      err.response.data?.error || 
                      `Server error: ${err.response.status}`;
                      
        if (err.response.status === 409) {
          errorMessage = 'Email already registered';
        }
      }
      
      setError(errorMessage);
      
      // If circuit breaker threshold reached
      if (authAttempts.current >= maxAuthAttempts) {
        circuitBroken.current = true;
        lastAuthAttemptTime.current = Date.now();
        setError('Too many failed registration attempts. Please try again later.');
      }
      
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = () => {
    localStorage.removeItem('token');
    sessionStorage.removeItem('user');
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
    
    // Don't clear error here as it might contain important information about why logout occurred
    
    // Remove auth header
    delete axios.defaults.headers.common['Authorization'];
    if (apiClient && apiClient.defaults) {
      delete apiClient.defaults.headers.common['Authorization'];
    }
    
    console.log('User logged out');
  };

  // Clear error helper
  const clearError = () => {
    setError(null);
  };

  // Force reset circuit breaker (for admin/debug purposes)
  const resetCircuitBreaker = () => {
    circuitBroken.current = false;
    authAttempts.current = 0;
    console.log('Auth circuit breaker manually reset');
    return true;
  };

  // Update user profile
  const updateProfile = async (profileData) => {
    try {
      setLoading(true);
      
      const response = await axios.put(`${apiUrl}/users/profile`, profileData, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      setUser({
        ...user,
        ...response.data
      });
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Failed to update profile:', error);
      setError({
        message: error.response?.data?.message || 'Failed to update profile',
        status: error.response?.status,
        data: error.response?.data
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Test API connectivity
  const testConnection = async (customApiUrl = null) => {
    try {
      setLoading(true);
      // Use custom API URL if provided, otherwise use the current apiUrl
      const targetUrl = customApiUrl || apiUrl;
      
      console.log(`Testing API connectivity to: ${targetUrl}/ping`);
      
      // First try with a short timeout to get fast feedback
      try {
        const response = await axios.get(`${targetUrl}/ping`, { 
          timeout: 5000,  // Start with a short timeout
          headers: { 'X-Test-Connection': 'true' } 
        });
        console.log('API connectivity test successful:', response.data);
        return true;
      } catch (quickError) {
        // If the short timeout fails, try again with a longer timeout
        console.log('Quick connectivity test failed, trying with longer timeout');
        const response = await axios.get(`${targetUrl}/ping`, { 
          timeout: 15000,  // Longer timeout for the second attempt
          headers: { 'X-Test-Connection': 'true' } 
        });
        console.log('API connectivity test successful on second attempt:', response.data);
        return true;
      }
    } catch (error) {
      console.error('API connectivity test failed:', error.message);
      // More detailed error reporting
      if (error.code === 'ECONNABORTED') {
        console.log('Connection timeout - server might be slow or unavailable');
      } else if (error.message.includes('Network Error')) {
        console.log('Network error - possible CORS issue or server not reachable');
      } else if (error.response) {
        console.log('Server responded with error:', error.response.status, error.response.data);
      }
      return false;
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      error,
      isAuthenticated,
      login,
      logout,
      register,
      loadUserData,
      clearError,
      updateProfile,
      testConnection,
      apiUrl,
      resetCircuitBreaker,
      circuitBroken: circuitBroken.current,
      setLoginPageStatus
    }}>
      {children}
    </AuthContext.Provider>
  );
};