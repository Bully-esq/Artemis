import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '../services/api';
import NotificationContainer from '../components/common/NotificationContainer';

const AppContext = createContext();

export const useAppContext = () => useContext(AppContext);

export const AppProvider = ({ children }) => {
  const [settings, setSettings] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [networkConnected, setNetworkConnected] = useState(true);

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const data = await api.settings.get();
        setSettings(data);
      } catch (error) {
        console.error('Failed to load settings:', error);
        // Default settings if none are available
        setSettings({
          company: {
            name: 'Your Company',
            address: '',
            email: '',
            phone: '',
            website: ''
          }
        });
      }
    };

    loadSettings();
  }, []);

  // Listen for network status changes
  useEffect(() => {
    const handleNetworkDisconnected = () => {
      setNetworkConnected(false);
      addNotification('You are currently offline. Some features may be limited.', 'warning');
    };

    const handleOnline = () => {
      setNetworkConnected(true);
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
    <AppContext.Provider
      value={{
        settings,
        updateSettings,
        addNotification,
        networkConnected
      }}
    >
      {children}
      <NotificationContainer
        notifications={notifications}
        removeNotification={removeNotification}
      />
    </AppContext.Provider>
  );
};