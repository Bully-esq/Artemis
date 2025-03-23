import React from 'react';

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
  // Size classes for the spinner
  const spinnerSizes = {
    sm: 'h-5 w-5',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };
  
  const spinnerSize = spinnerSizes[size] || spinnerSizes.md;
  
  // Container element
  const LoadingElement = (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      {/* Spinner */}
      <svg 
        className={`animate-spin text-blue-600 ${spinnerSize}`}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        ></circle>
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        ></path>
      </svg>
      
      {/* Message */}
      {message && (
        <p className="mt-3 text-sm font-medium text-gray-700">{message}</p>
      )}
    </div>
  );
  
  // Full screen version with overlay
  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white bg-opacity-80">
        {LoadingElement}
      </div>
    );
  }
  
  // Regular inline version
  return LoadingElement;
};

export default Loading;