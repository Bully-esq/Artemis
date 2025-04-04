import React, { createContext, useState, useContext, useCallback } from 'react';

// Create App Context
const AppContext = createContext();

// Custom hook to use the App Context
export const useAppContext = () => useContext(AppContext);

// App Provider component
export const AppProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [networkStatus, setNetworkStatus] = useState('online'); // 'online', 'offline'
  
  // Add notification
  const addNotification = useCallback((message, type = 'info', duration = 5000) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 9);
    const newNotification = { id, message, type, duration };
    
    setNotifications(prev => [...prev, newNotification]);
    
    // Auto remove notification after duration
    if (duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, duration);
    }
    
    return id;
  }, []);
  
  // Remove notification
  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);
  
  // Clear all notifications
  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);
  
  // Update network status
  const updateNetworkStatus = useCallback((status) => {
    setNetworkStatus(status);
    
    // Add notification on status change
    if (status === 'offline') {
      addNotification('You are currently offline. Some features might be unavailable.', 'warning', 0);
    } else if (status === 'online') {
      addNotification('You are back online!', 'success', 3000);
    }
  }, [addNotification]);
  
  // Provider value
  const value = {
    notifications,
    networkStatus,
    addNotification,
    removeNotification,
    clearNotifications,
    updateNetworkStatus
  };
  
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export default AppContext; 