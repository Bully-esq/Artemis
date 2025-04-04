import { Platform, Linking, Alert } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

// Utility service for common operations
const utils = {
  // Format currency (USD by default)
  formatCurrency: (amount, currencyCode = 'USD') => {
    if (amount === undefined || amount === null) return '';
    
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currencyCode,
      }).format(amount);
    } catch (error) {
      console.error('Error formatting currency:', error);
      return `$${parseFloat(amount).toFixed(2)}`;
    }
  },

  // Format date to readable string
  formatDate: (dateString, includeTime = false) => {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return '';
      }
      
      const options = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      };
      
      if (includeTime) {
        options.hour = '2-digit';
        options.minute = '2-digit';
      }
      
      return date.toLocaleDateString('en-US', options);
    } catch (error) {
      console.error('Error formatting date:', error);
      return dateString;
    }
  },

  // Check network connection
  checkNetworkConnection: async () => {
    try {
      const networkState = await NetInfo.fetch();
      return {
        isConnected: networkState.isConnected,
        type: networkState.type,
        details: networkState.details
      };
    } catch (error) {
      console.error('Error checking network connection:', error);
      return { isConnected: false, error: error.message };
    }
  },

  // Open URL in browser or appropriate app
  openURL: async (url) => {
    try {
      const supported = await Linking.canOpenURL(url);
      
      if (supported) {
        await Linking.openURL(url);
        return true;
      } else {
        console.warn(`Cannot open URL: ${url}`);
        Alert.alert(
          'Cannot Open Link',
          'Your device cannot open this type of link.'
        );
        return false;
      }
    } catch (error) {
      console.error('Error opening URL:', error);
      Alert.alert(
        'Error',
        'An error occurred while trying to open the link.'
      );
      return false;
    }
  },

  // Get platform-specific styles or values
  getPlatformValue: (ios, android) => {
    return Platform.OS === 'ios' ? ios : android;
  },

  // Debounce function to limit repeated calls
  debounce: (func, wait = 300) => {
    let timeout;
    
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  // Throttle function to limit function calls
  throttle: (func, limit = 300) => {
    let inThrottle;
    
    return function executedFunction(...args) {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => {
          inThrottle = false;
        }, limit);
      }
    };
  },

  // Generate a random ID (for temporary items, etc.)
  generateId: (prefix = '') => {
    return `${prefix}${Math.random().toString(36).substring(2, 9)}-${Date.now().toString(36)}`;
  },

  // Truncate text with ellipsis
  truncateText: (text, maxLength = 50) => {
    if (!text || text.length <= maxLength) return text;
    return `${text.substring(0, maxLength)}...`;
  }
};

export default utils; 