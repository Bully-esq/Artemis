import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from './api';

// Token and user data management
const TOKEN_KEY = 'token';
const USER_KEY = 'user';

// Auth service with methods for login, registration, token management
const authService = {
  // Get current authentication token
  getToken: async () => {
    try {
      return await AsyncStorage.getItem(TOKEN_KEY);
    } catch (error) {
      console.error('Error retrieving token:', error);
      return null;
    }
  },

  // Get current user data
  getCurrentUser: async () => {
    try {
      const userData = await AsyncStorage.getItem(USER_KEY);
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Error retrieving user data:', error);
      return null;
    }
  },

  // Save authentication data
  saveAuthData: async (token, user) => {
    try {
      // Save token
      if (token) {
        await AsyncStorage.setItem(TOKEN_KEY, token);
      }
      
      // Save user data
      if (user) {
        await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
      }
      
      // Set token in API client for future requests
      if (token) {
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      }
      
      return true;
    } catch (error) {
      console.error('Error saving auth data:', error);
      return false;
    }
  },

  // Clear authentication data on logout
  clearAuthData: async () => {
    try {
      await AsyncStorage.removeItem(TOKEN_KEY);
      await AsyncStorage.removeItem(USER_KEY);
      
      // Clear auth header from API client
      delete apiClient.defaults.headers.common['Authorization'];
      
      return true;
    } catch (error) {
      console.error('Error clearing auth data:', error);
      return false;
    }
  },

  // Login with email and password
  login: async (email, password) => {
    try {
      const response = await apiClient.post('/auth/login', { email, password });
      
      // Process successful login
      if (response.data && response.data.token) {
        const { token, user } = response.data;
        await authService.saveAuthData(token, user);
        return { success: true, user };
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('Login error:', error);
      
      let errorMessage = 'Failed to login. Please try again.';
      if (error.response) {
        // Server responded with error status
        if (error.response.status === 401) {
          errorMessage = 'Invalid email or password';
        } else if (error.response.data && error.response.data.message) {
          errorMessage = error.response.data.message;
        }
      } else if (error.request) {
        // No response received
        errorMessage = 'No response from server. Please check your connection.';
      }
      
      return { 
        success: false, 
        error: errorMessage 
      };
    }
  },

  // Register new user
  register: async (userData) => {
    try {
      const response = await apiClient.post('/auth/register', userData);
      
      // Process successful registration
      if (response.data && response.data.token) {
        const { token, user } = response.data;
        await authService.saveAuthData(token, user);
        return { success: true, user };
      } else {
        return { success: true }; // Some APIs don't return a token on registration
      }
    } catch (error) {
      console.error('Registration error:', error);
      
      let errorMessage = 'Failed to register. Please try again.';
      if (error.response) {
        // Handle common registration errors
        if (error.response.status === 409) {
          errorMessage = 'Email already in use';
        } else if (error.response.data && error.response.data.message) {
          errorMessage = error.response.data.message;
        }
      } else if (error.request) {
        errorMessage = 'No response from server. Please check your connection.';
      }
      
      return { 
        success: false, 
        error: errorMessage 
      };
    }
  },

  // Logout current user
  logout: async () => {
    try {
      // Optional: Call logout endpoint if your API requires it
      try {
        await apiClient.post('/auth/logout');
      } catch (logoutError) {
        // Continue with local logout even if server logout fails
        console.warn('Server logout failed, proceeding with local logout:', logoutError);
      }
      
      // Always clear local auth data
      await authService.clearAuthData();
      
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      return { 
        success: false, 
        error: 'Failed to logout properly' 
      };
    }
  },

  // Test if current authentication is valid
  validateToken: async () => {
    try {
      const token = await authService.getToken();
      
      if (!token) {
        return { valid: false, error: 'No token found' };
      }
      
      // Call validation endpoint
      const response = await apiClient.get('/auth/validate');
      
      return { valid: true, user: response.data.user };
    } catch (error) {
      console.error('Token validation error:', error);
      
      if (error.response && error.response.status === 401) {
        // Token is invalid or expired
        await authService.clearAuthData();
        return { valid: false, error: 'Token expired' };
      }
      
      return { 
        valid: false, 
        error: 'Failed to validate token' 
      };
    }
  }
};

export default authService; 