import React, { createContext, useContext, useReducer, useCallback } from 'react';

// Initial state
const initialState = {
  notifications: []
};

// Action types
const ADD_NOTIFICATION = 'ADD_NOTIFICATION';
const REMOVE_NOTIFICATION = 'REMOVE_NOTIFICATION';
const CLEAR_ALL_NOTIFICATIONS = 'CLEAR_ALL_NOTIFICATIONS';

// Reducer function
function notificationReducer(state, action) {
  switch (action.type) {
    case ADD_NOTIFICATION:
      return {
        ...state,
        notifications: [...state.notifications, action.payload]
      };
    case REMOVE_NOTIFICATION:
      return {
        ...state,
        notifications: state.notifications.filter(
          notification => notification.id !== action.payload
        )
      };
    case CLEAR_ALL_NOTIFICATIONS:
      return {
        ...state,
        notifications: []
      };
    default:
      return state;
  }
}

// Create context
const NotificationContext = createContext();

/**
 * NotificationProvider component
 * Provides notification state and methods to components in the tree
 */
export function NotificationProvider({ children }) {
  const [state, dispatch] = useReducer(notificationReducer, initialState);

  /**
   * Add a new notification
   * @param {string} message - Notification message text
   * @param {string} type - Notification type (success, error, info, warning)
   * @param {number} duration - How long to display (in ms), 0 for permanent
   * @returns {string} The notification ID
   */
  const addNotification = useCallback((message, type = 'info', duration = 5000) => {
    const id = Date.now().toString();
    
    dispatch({
      type: ADD_NOTIFICATION,
      payload: {
        id,
        message,
        type,
        duration
      }
    });

    // Auto-remove notification after duration (if not permanent)
    if (duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, duration);
    }

    return id;
  }, []);

  /**
   * Remove a notification by ID
   * @param {string} id - Notification ID to remove
   */
  const removeNotification = useCallback((id) => {
    dispatch({
      type: REMOVE_NOTIFICATION,
      payload: id
    });
  }, []);

  /**
   * Clear all notifications
   */
  const clearAllNotifications = useCallback(() => {
    dispatch({ type: CLEAR_ALL_NOTIFICATIONS });
  }, []);

  // Convenience methods for different notification types
  const notifySuccess = useCallback((message, duration = 5000) => {
    return addNotification(message, 'success', duration);
  }, [addNotification]);

  const notifyError = useCallback((message, duration = 0) => {
    return addNotification(message, 'error', duration);
  }, [addNotification]);

  const notifyWarning = useCallback((message, duration = 7000) => {
    return addNotification(message, 'warning', duration);
  }, [addNotification]);

  const notifyInfo = useCallback((message, duration = 5000) => {
    return addNotification(message, 'info', duration);
  }, [addNotification]);

  // Provide the notification state and methods to children
  return (
    <NotificationContext.Provider
      value={{
        notifications: state.notifications,
        addNotification,
        removeNotification,
        clearAllNotifications,
        notifySuccess,
        notifyError,
        notifyWarning,
        notifyInfo
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

/**
 * Custom hook to use the notification context
 * @returns {Object} Notification context value
 */
export function useNotification() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
}

export default NotificationContext;