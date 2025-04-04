import React, { createContext, useState, useContext, useEffect } from 'react';
import { Alert } from 'react-native';
// You would typically use AsyncStorage instead of localStorage in React Native
import AsyncStorage from '@react-native-async-storage/async-storage';

// Create the Auth Context
const AuthContext = createContext();

// Custom hook to use the Auth Context
export const useAuth = () => useContext(AuthContext);

// Auth Provider component
export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [circuitBroken, setCircuitBroken] = useState(false);

  // Check for existing token on mount
  useEffect(() => {
    const loadToken = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('token');
        const storedUser = await AsyncStorage.getItem('user');

        if (storedToken) {
          setToken(storedToken);
          setIsAuthenticated(true);
          
          if (storedUser) {
            setUser(JSON.parse(storedUser));
          }
        }
      } catch (err) {
        console.error('Error loading auth data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadToken();
  }, []);

  // Clear error
  const clearError = () => setError(null);

  // Login function
  const login = async (email, password, apiEndpoint) => {
    try {
      setLoading(true);
      clearError();
      
      // Placeholder for actual API call
      // const response = await fetch(`${apiEndpoint}/auth/login`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ email, password })
      // });
      
      // For now, just simulate a successful login
      const fakeToken = 'fake-token-' + Math.random().toString(36).substring(2);
      const fakeUser = { id: 1, name: 'Test User', email };
      
      // Store token and user data
      await AsyncStorage.setItem('token', fakeToken);
      await AsyncStorage.setItem('user', JSON.stringify(fakeUser));
      
      // Update state
      setToken(fakeToken);
      setUser(fakeUser);
      setIsAuthenticated(true);
      
      return { token: fakeToken, user: fakeUser };
    } catch (err) {
      setError(err.message || 'Login failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Register function
  const register = async (userData) => {
    try {
      setLoading(true);
      clearError();
      
      // Placeholder for actual API call
      // const response = await fetch(`${apiEndpoint}/auth/register`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(userData)
      // });
      
      // For now, just simulate a successful registration
      const fakeToken = 'fake-token-' + Math.random().toString(36).substring(2);
      const fakeUser = { 
        id: 1, 
        name: userData.name, 
        email: userData.email 
      };
      
      // Store token and user data
      await AsyncStorage.setItem('token', fakeToken);
      await AsyncStorage.setItem('user', JSON.stringify(fakeUser));
      
      // Update state
      setToken(fakeToken);
      setUser(fakeUser);
      setIsAuthenticated(true);
      
      return { token: fakeToken, user: fakeUser };
    } catch (err) {
      setError(err.message || 'Registration failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    try {
      // Clear token and user data from storage
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
      
      // Update state
      setToken(null);
      setUser(null);
      setIsAuthenticated(false);
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  // Test connection function
  const testConnection = async (apiEndpoint) => {
    try {
      // Placeholder for actual API health check
      // const response = await fetch(`${apiEndpoint}/health`);
      // return response.ok;
      
      // For now, just simulate a successful connection
      return true;
    } catch (err) {
      console.error('Connection test failed:', err);
      return false;
    }
  };

  // Reset circuit breaker
  const resetCircuitBreaker = () => {
    setCircuitBroken(false);
  };

  // Set login page status (used in original app)
  const setLoginPageStatus = (isOnLoginPage) => {
    // Placeholder for any logic needed when on login page
    console.log('Login page status:', isOnLoginPage);
  };

  // Provider value
  const value = {
    token,
    user,
    loading,
    error,
    isAuthenticated,
    circuitBroken,
    login,
    register,
    logout,
    clearError,
    testConnection,
    resetCircuitBreaker,
    setLoginPageStatus
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext; 