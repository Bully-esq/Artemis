import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
// Import apiClient instead of axios directly for settings fetch
import { apiClient } from '../services/api'; 
import { useAuth } from './AuthContext'; // <-- Import useAuth
import axios from 'axios'; // Keep axios for other potential uses if needed
import NotificationContainer from '../components/common/NotificationContainer';

const AppContext = createContext();

export const useAppContext = () => useContext(AppContext);

// Default settings structure - Make it more comprehensive
const defaultSettings = {
  general: { theme: 'system' },
  company: { name: '', contactName: '', email: '', phone: '', website: '', address: '', logo: null },
  quote: { defaultMarkup: 0, prefix: 'Q-', validityPeriod: 30, defaultTerms: '1' },
  invoice: { prefix: 'INV-', defaultPaymentTerms: 30, notesTemplate: '', footer: '' },
  bank: { name: '', accountName: '', accountNumber: '', sortCode: '', iban: '', bic: '' },
  cis: { companyName: '', utr: '', niNumber: '' },
  vat: { enabled: false, rate: 20, number: '' },
  // Keep original simple defaults commented out for reference if needed
  // companyName: 'Your Company',
  // address: '123 Main St',
  // vatNumber: '',
  // defaultVatRate: 20,
  // currencySymbol: '£',
};

export const AppProvider = ({ children }) => {
  // Initialize with the comprehensive default settings
  const { isAuthReady } = useAuth(); // <-- Get isAuthReady state
  const [settings, setSettings] = useState(defaultSettings);
  const [notifications, setNotifications] = useState([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  // State for settings loading circuit breaker
  const [settingsCircuitBroken, setSettingsCircuitBroken] = useState(false);
  const settingsAttempts = useRef(0);
  const MAX_SETTINGS_ATTEMPTS = 3;
  const SETTINGS_RETRY_TIMEOUT = 60000; // 1 minute
  const lastSettingsAttemptTime = useRef(0);

  // Reset circuit breaker after timeout
  useEffect(() => {
    const checkCircuitReset = () => {
      if (settingsCircuitBroken) {
        const now = Date.now();
        if (now - lastSettingsAttemptTime.current >= SETTINGS_RETRY_TIMEOUT) {
          console.log('Settings circuit breaker reset after timeout');
          setSettingsCircuitBroken(false);
          settingsAttempts.current = 0;
        }
      }
    };
    
    const interval = setInterval(checkCircuitReset, 5000);
    return () => clearInterval(interval);
  }, [settingsCircuitBroken]);

  // Load settings on mount with circuit breaker pattern
  useEffect(() => {
    // Try to load cached settings first
    const cachedSettings = localStorage.getItem('cachedSettings');
    let parsedCachedSettings = null;

    if (cachedSettings) {
      try {
        parsedCachedSettings = JSON.parse(cachedSettings);
        console.log('Using cached settings initially');
        // Always set settings from cache first, regardless of whether we'll fetch from API
        setSettings(parsedCachedSettings);
      } catch (e) {
        console.error('Error parsing cached settings:', e);
      }
    }

    const loadSettings = async () => {
      console.log('Attempting to run loadSettings function...');
      // Don't try if circuit breaker is active
      if (settingsCircuitBroken) {
        console.log('Settings circuit breaker active, skipping fetch.');
        if (!parsedCachedSettings) {
          console.log('Using default settings due to circuit breaker and no cache.');
          setSettings(defaultSettings);
        }
        return;
      }
      
      // Track attempt
      settingsAttempts.current++;
      lastSettingsAttemptTime.current = Date.now();
      
      try {
        // Get auth token if available
        const token = localStorage.getItem('token');
        
        // Use apiClient which has default timeout and base URL configured
        console.log(`Loading settings from: ${apiClient.defaults.baseURL}/settings`);
        
        // Use apiClient.get instead of axios.get, include Authorization header if token exists
        console.log(`Attempting apiClient.get('/settings') with URL: ${apiClient.defaults.baseURL}/settings`);
        const response = await apiClient.get('/settings', {
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            // Add Authorization header only if token exists
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          }
        });
        const data = response.data;
        
        // Only update settings from API if we received actual settings data
        // This prevents API responses with just success status from clearing settings
        if (data && typeof data === 'object' && (data.company || data.quote || data.invoice)) {
          console.log('Valid settings data received from API, updating settings');
          // Success: reset counter and cache results
          settingsAttempts.current = 0;
          setSettings(data);
          localStorage.setItem('cachedSettings', JSON.stringify(data));
          localStorage.setItem('axtonSettings', JSON.stringify(data)); // For backward compatibility
          console.log('Settings loaded successfully from server');
        } else {
          console.warn('API returned invalid or empty settings data:', data);
          // Don't override valid cached settings with invalid API response
          if (parsedCachedSettings) {
            console.log('Keeping cached settings instead of invalid API response');
          } else {
            console.log('No valid cached settings, using defaults');
            setSettings(defaultSettings);
          }
        }
      } catch (error) {
        // Special handling for 401 Unauthorized
        if (error.response && error.response.status === 401) {
          console.log('Settings request unauthorized - user not logged in yet');
          // This is expected before login - don't trigger circuit breaker for auth failures
          if (parsedCachedSettings) {
            console.log('Using cached settings while not authenticated');
            setSettings(parsedCachedSettings);
          } else {
            console.log('No cached settings, using defaults while not authenticated');
            setSettings(defaultSettings);
          }
          // Don't count 401 errors toward circuit breaker attempts
          settingsAttempts.current = Math.max(0, settingsAttempts.current - 1);
          
          // IMPORTANT: Don't dispatch auth-failed events for regular 401s on settings
          // Only dispatch auth-failed if we have a token and still get 401
          const token = localStorage.getItem('token');
          if (token) {
            console.warn('Received 401 despite having token - possible token expiration');
            // Only dispatch auth-failed if we're not already on the login page
            if (window.location.pathname !== '/login') {
              window.dispatchEvent(new Event('auth-failed'));
            }
          } else {
            console.log('Normal 401 without token - skipping auth-failed event');
          }
          
          return; // Exit early - don't show notification for expected auth failures
        }
        
        // Provide more detailed error logging
        if (error.code === 'ECONNABORTED') {
          // Use the timeout value from the config that was actually used
          const timeoutDuration = error.config?.timeout || apiClient.defaults.timeout;
          console.error(`Settings request timed out after ${timeoutDuration}ms`);
          addNotification(`Server response took too long (${timeoutDuration/1000}s). Using cached/default settings.`, 'warning', 5000);
        } else if (error.response) {
          // The server responded with a status code outside the 2xx range
          console.error(`Settings request failed with status ${error.response.status}: ${error.response.data}`);
          addNotification(`Settings error: ${error.response.status}. Using cached/default settings.`, 'error', 5000);
        } else if (error.request) {
          // The request was made but no response was received
          console.error('No response received from settings request:', error.request);
          addNotification('Unable to reach the server for settings. Using cached/default settings.', 'warning', 5000);
        } else {
          // Something happened in setting up the request
          console.error('Error setting up settings request:', error.message);
          addNotification('Connection error loading settings. Using cached/default settings.', 'warning', 5000);
        }
        
        // Check if we reached threshold
        if (settingsAttempts.current >= MAX_SETTINGS_ATTEMPTS) {
          console.warn('Settings circuit breaker activated due to multiple failures');
          setSettingsCircuitBroken(true);
          addNotification('Unable to load settings repeatedly. Using default settings.', 'warning', 5000);
        }
        
        // Use cached settings if available, otherwise use defaults
        if (parsedCachedSettings) {
          console.log('Falling back to cached settings after error.');
          setSettings(parsedCachedSettings);
        } else {
          console.log('No cached settings available, using defaults after error.');
          setSettings(defaultSettings);
        }
      }
    };

    // Short delay before loading settings to allow other components to initialize
    const timer = setTimeout(() => {
      loadSettings();
    }, 500);
    
    return () => clearTimeout(timer);
  }, [settingsCircuitBroken, isAuthReady]); // <-- Add isAuthReady dependency & rerun if circuit breaker resets OR auth becomes ready

  // Force reset settings circuit breaker (for debugging)
  const resetSettingsCircuitBreaker = () => {
    setSettingsCircuitBroken(false);
    settingsAttempts.current = 0;
    console.log('Settings circuit breaker manually reset');
    return true;
  };

  // Listen for network status changes
  useEffect(() => {
    const handleNetworkDisconnected = () => {
      setIsOnline(false);
      addNotification('You are currently offline. Some features may be limited.', 'warning');
    };

    const handleOnline = () => {
      setIsOnline(true);
      addNotification('You are back online.', 'success');
    };

    window.addEventListener('network-disconnected', handleNetworkDisconnected);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('network-disconnected', handleNetworkDisconnected);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  // Update settings
  const updateSettings = (newSettings) => {
    setSettings(newSettings);
    // Also update cache
    try {
        localStorage.setItem('cachedSettings', JSON.stringify(newSettings));
    } catch (e) {
      console.error('Error caching settings:', e);
    }
  };

  // Add a notification
  const addNotification = (message, type = 'info', duration = 1000) => {
    const id = Date.now().toString();
    setNotifications(prev => [...prev, { id, message, type, duration }]);
    
    // For debugging
    console.log(`Added notification: ${message}, type: ${type}, id: ${id}`);
  };

  // Remove a notification
  const removeNotification = (id) => {
    console.log(`Removing notification with id: ${id}`);
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };

  return (
    <AppContext.Provider value={{ 
      settings, 
      updateSettings, 
      addNotification, 
      isOnline,
      settingsCircuitBroken,
      resetSettingsCircuitBreaker
    }}>
      {children}
      <NotificationContainer notifications={notifications} removeNotification={removeNotification} />
    </AppContext.Provider>
  );
};