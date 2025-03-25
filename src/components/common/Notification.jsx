import React, { useEffect, useState } from 'react';

/**
 * Notification component for displaying alerts
 * 
 * @param {Object} props - Component props
 * @param {string} props.message - Notification message
 * @param {string} props.type - Notification type (success, error, info, warning)
 * @param {number} props.duration - Duration in milliseconds before auto-dismiss (0 to prevent auto-dismiss)
 * @param {Function} props.onClose - Function to call when notification is closed
 */
const Notification = ({
  message,
  type = 'info',
  duration = 5000,
  onClose
}) => {
  const [visible, setVisible] = useState(true);
  
  // Auto-dismiss after duration (if specified)
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setVisible(false);
      }, duration);
      
      return () => clearTimeout(timer);
    }
  }, [duration]);
  
  // Handle transition end (for cleanup after animation)
  const handleTransitionEnd = () => {
    if (!visible && onClose) {
      onClose();
    }
  };
  
  // Type-specific styles
  const typeStyles = {
    success: {
      className: 'notification-success',
      icon: (
        <svg className="notification-icon" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      )
    },
    error: {
      className: 'notification-error',
      icon: (
        <svg className="notification-icon" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
      )
    },
    warning: {
      className: 'notification-warning',
      icon: (
        <svg className="notification-icon" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
      )
    },
    info: {
      className: 'notification-info',
      icon: (
        <svg className="notification-icon" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zm-1 9a1 1 0 01-1-1v-4a1 1 0 112 0v4a1 1 0 01-1 1z" clipRule="evenodd" />
        </svg>
      )
    }
  };
  
  const styles = typeStyles[type] || typeStyles.info;
  
  return (
    <div
      className={`notification ${styles.className} ${visible ? 'notification-visible' : 'notification-hidden'}`}
      role="alert"
      onTransitionEnd={handleTransitionEnd}
    >
      <div className="notification-content">
        <div className="notification-icon-container">
          {styles.icon}
        </div>
        <div className="notification-message">
          <p>{message}</p>
        </div>
        <button
          className="notification-close"
          onClick={() => setVisible(false)}
          aria-label="Close notification"
        >
          <span className="sr-only">Close</span>
          <svg className="notification-close-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  );
};

/**
 * Container component to manage and display multiple notifications
 * Should be used at the application root level
 */
export const Notifications = ({ notifications = [], onRemove }) => {
  if (notifications.length === 0) return null;
  
  return (
    <div className="notifications-container">
      {notifications.map((notification) => (
        <Notification
          key={notification.id}
          message={notification.message}
          type={notification.type}
          duration={notification.duration}
          onClose={() => onRemove(notification.id)}
        />
      ))}
    </div>
  );
};

export default Notification;