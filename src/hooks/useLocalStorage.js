import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook for managing localStorage data with React state
 * @param {string} key - The localStorage key to manage
 * @param {any} initialValue - The initial value if the key doesn't exist in localStorage
 * @returns {Array} [storedValue, setValue, removeValue] - State and functions to update localStorage
 */
export function useLocalStorage(key, initialValue) {
  // Helper function to get value from localStorage
  const readValue = useCallback(() => {
    // Check if we're in a browser environment
    if (typeof window === 'undefined') {
      return initialValue;
    }

    try {
      // Get stored value from localStorage
      const item = window.localStorage.getItem(key);
      
      // Parse stored JSON or return initialValue if not found
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  }, [initialValue, key]);

  // State to store our value
  const [storedValue, setStoredValue] = useState(readValue);

  // Return a wrapped version of useState's setter function that persists
  // the new value to localStorage
  const setValue = useCallback(
    (value) => {
      try {
        // Allow value to be a function so we have the same API as useState
        const valueToStore = value instanceof Function ? value(storedValue) : value;
        
        // Save state
        setStoredValue(valueToStore);
        
        // Save to localStorage
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(key, JSON.stringify(valueToStore));
          
          // Fire a custom event so other instances can update
          window.dispatchEvent(new Event('local-storage'));
        }
      } catch (error) {
        console.warn(`Error setting localStorage key "${key}":`, error);
      }
    },
    [key, storedValue]
  );

  // Remove value from localStorage
  const removeValue = useCallback(() => {
    try {
      // Remove from localStorage
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(key);
        
        // Reset state to initial value
        setStoredValue(initialValue);
        
        // Fire a custom event so other instances can update
        window.dispatchEvent(new Event('local-storage'));
      }
    } catch (error) {
      console.warn(`Error removing localStorage key "${key}":`, error);
    }
  }, [initialValue, key]);

  // Listen for changes to this localStorage key in other tabs/windows
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === key) {
        setStoredValue(readValue());
      }
    };

    // Handle custom 'local-storage' events fired by setValue/removeValue
    const handleCustomEvent = () => {
      setStoredValue(readValue());
    };

    // Listen for storage changes
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('local-storage', handleCustomEvent);

    // Clean up
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('local-storage', handleCustomEvent);
    };
  }, [key, readValue]);

  // Return the value and functions
  return [storedValue, setValue, removeValue];
}

/**
 * Alternative API closer to useState, returns [value, { set, remove }]
 * @param {string} key - The localStorage key to manage
 * @param {any} initialValue - The initial value if the key doesn't exist in localStorage
 */
export function useLocalStorageState(key, initialValue) {
  const [value, setValue, removeValue] = useLocalStorage(key, initialValue);
  
  return [
    value, 
    {
      set: setValue,
      remove: removeValue
    }
  ];
}

/**
 * Utility function to check if localStorage is available
 * This can be useful for checking before using the hook
 * @returns {boolean} - Whether localStorage is available
 */
export function isLocalStorageAvailable() {
  if (typeof window === 'undefined') return false;
  
  try {
    const testKey = '__storage_test__';
    window.localStorage.setItem(testKey, testKey);
    window.localStorage.removeItem(testKey);
    return true;
  } catch (e) {
    return false;
  }
}

export default useLocalStorage;