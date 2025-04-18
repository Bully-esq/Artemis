import React from 'react';

/**
 * ActionButtonContainer - A dedicated container for buttons that sits below the header
 * This provides consistent positioning for action buttons across different components
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - The buttons or other elements to render in the container
 * @param {string} [props.className] - Additional classes to apply to the container
 */
const ActionButtonContainer = ({ children, className = '' }) => {
  // Tailwind classes for basic layout, can be overridden/extended via props.className
  // Example: sticky positioning, padding, flexbox, background
  // Adjust these base styles as needed for your application's layout
  return (
    <div
      className={`py-4 px-4 md:px-6 lg:px-8 border-t border-gray-200 dark:border-gray-700 dark:bg-black sticky bottom-0 z-10 flex items-center justify-start space-x-3 ${className}`}
    >
      {children}
    </div>
  );
};

export default ActionButtonContainer;