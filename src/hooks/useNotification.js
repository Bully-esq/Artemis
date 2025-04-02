import { useCallback } from 'react';
import { useAppContext } from '../context/AppContext';

/**
 * Custom hook for managing notifications throughout the application
 * 
 * @returns {Object} Notification methods
 */
export function useNotification() {
  const { addNotification, removeNotification, notifications } = useAppContext();
  
  // Show a success notification
  const showSuccess = useCallback((message, duration = 3000) => {
    return addNotification(message, 'success', duration);
  }, [addNotification]);
  
  // Show an error notification
  const showError = useCallback((message, duration = 5000) => {
    return addNotification(message, 'error', duration);
  }, [addNotification]);
  
  // Show an info notification
  const showInfo = useCallback((message, duration = 3000) => {
    return addNotification(message, 'info', duration);
  }, [addNotification]);
  
  // Show a warning notification
  const showWarning = useCallback((message, duration = 4000) => {
    return addNotification(message, 'warning', duration);
  }, [addNotification]);
  
  // Show a notification that stays until manually dismissed
  const showPersistent = useCallback((message, type = 'info') => {
    return addNotification(message, type, 0);
  }, [addNotification]);
  
  // Show a notification that replaces all current notifications
  const showReplacing = useCallback((message, type = 'info', duration = 3000) => {
    // Remove all existing notifications
    notifications.forEach(notification => {
      removeNotification(notification.id);
    });
    
    // Show the new notification
    return addNotification(message, type, duration);
  }, [addNotification, removeNotification, notifications]);
  
  // Dismiss a notification by ID
  const dismiss = useCallback((id) => {
    removeNotification(id);
  }, [removeNotification]);
  
  // Show an API error notification with appropriate message extraction
  const showApiError = useCallback((error, fallbackMessage = 'An error occurred') => {
    let message = fallbackMessage;
    
    if (error?.response?.data?.message) {
      // Standard API error format
      message = error.response.data.message;
    } else if (error?.response?.data?.error) {
      // Alternative API error format
      message = error.response.data.error;
    } else if (error?.message) {
      // JavaScript Error object
      message = error.message;
    } else if (typeof error === 'string') {
      // String error
      message = error;
    }
    
    return showError(message);
  }, [showError]);
  
  return {
    showSuccess,
    showError,
    showInfo,
    showWarning,
    showPersistent,
    showReplacing,
    showApiError,
    dismiss
  };
}

export default useNotification;