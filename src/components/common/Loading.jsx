import React, { useEffect } from 'react';

/**
 * Loading spinner component with optional message
 * 
 * @param {Object} props - Component props
 * @param {string} props.message - Optional loading message
 * @param {string} props.size - Size of the spinner (sm, md, lg)
 * @param {boolean} props.fullScreen - Whether to display as a full-screen overlay
 */
const Loading = ({ 
  message = 'Loading...', 
  size = 'md',
  fullScreen = false,
  className = ''
}) => {
  // Debug log to see when Loading is rendered and with what props
  useEffect(() => {
    console.log('Loading component rendered', { message, size, fullScreen });
  }, [message, size, fullScreen]);
  
  // Get the appropriate size class
  const spinnerSizeClass = `spinner-${size}`;
  
  // Container element
  const LoadingElement = (
    <div className={`loading-container ${className}`}>
      {/* Spinner */}
      <svg 
        className={`loading-spinner ${spinnerSizeClass}`}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="loading-circle"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        ></circle>
        <path
          className="loading-path"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        ></path>
      </svg>
      
      {/* Message */}
      {message && (
        <p className="loading-message">{message}</p>
      )}
    </div>
  );
  
  // Full screen version with overlay
  if (fullScreen) {
    return (
      <div className="loading-fullscreen">
        {LoadingElement}
      </div>
    );
  }
  
  // Regular inline version
  return LoadingElement;
};

export default Loading;