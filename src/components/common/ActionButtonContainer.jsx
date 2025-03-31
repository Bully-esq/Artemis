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
  return (
    <div className={`action-button-container ${className}`}>
      {children}
    </div>
  );
};

export default ActionButtonContainer;