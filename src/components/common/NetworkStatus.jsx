import React, { useEffect, useState } from 'react';

/**
 * Network status indicator component
 * Shows when the application loses or regains connectivity
 */
const NetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [visible, setVisible] = useState(false);
  let hideTimeout = null;
  
  // Track online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setVisible(true);
      
      // Hide after 3 seconds if we're back online
      hideTimeout = setTimeout(() => {
        setVisible(false);
      }, 3000);
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      setVisible(true);
      
      // Clear any existing hide timeout
      if (hideTimeout) {
        clearTimeout(hideTimeout);
        hideTimeout = null;
      }
      
      // NEW: Automatically hide the offline message after 5 seconds
      hideTimeout = setTimeout(() => {
        setVisible(false);
      }, 5000); // 5 seconds duration
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Custom event listeners for API network status changes
    window.addEventListener('network-connected', handleOnline);
    window.addEventListener('network-disconnected', handleOffline);
    
    // Initial visibility if offline
    if (!navigator.onLine) {
      setVisible(true);
    }
    
    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('network-connected', handleOnline);
      window.removeEventListener('network-disconnected', handleOffline);
      
      if (hideTimeout) {
        clearTimeout(hideTimeout);
      }
    };
  }, []);
  
  // When not visible, don't render anything
  if (!visible) {
    return null;
  }
  
  return (
    <div className={`
      fixed bottom-4 right-4 z-50 px-4 py-3 rounded-md shadow-lg
      ${isOnline ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}
      transition-opacity duration-300
    `}>
      <div className="flex items-center">
        <div className={`
          h-3 w-3 rounded-full mr-2
          ${isOnline ? 'bg-green-500' : 'bg-red-500'}
        `}></div>
        <p className="text-sm font-medium">
          {isOnline ? 'Online' : 'Offline - Changes will not be saved'}
        </p>
      </div>
    </div>
  );
};

export default NetworkStatus;