import { useState, useEffect } from 'react';

/**
 * Custom hook to track network connectivity status
 * @returns {Object} with online status
 */
export function useNetworkStatus() {
  const [online, setOnline] = useState(navigator.onLine);
  
  useEffect(() => {
    // Update network status when it changes
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    
    // Listen for browser online/offline events
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Listen for custom events from API client
    window.addEventListener('network-connected', handleOnline);
    window.addEventListener('network-disconnected', handleOffline);
    
    // Clean up listeners
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('network-connected', handleOnline);
      window.removeEventListener('network-disconnected', handleOffline);
    };
  }, []);
  
  return { online };
}