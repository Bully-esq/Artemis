import React from 'react';
import '../../styles/components/common/buttons.css'; // Updated import path

/**
 * Button component with different variants and sizes
 * 
 * @param {Object} props - Component props
 * @param {string} props.variant - Button style variant (primary, secondary, danger, ghost)
 * @param {string} props.size - Button size (sm, md, lg)
 * @param {boolean} props.isLoading - Show loading state
 * @param {boolean} props.fullWidth - Make button full width
 * @param {Function} props.onClick - Click handler
 * @param {React.ReactNode} props.children - Button content
 */
const Button = ({ 
  variant = 'primary', 
  size = 'md', 
  isLoading = false,
  fullWidth = false,
  onClick,
  className = '',
  children,
  ...rest
}) => {
  // Base classes
  let buttonClass = 'btn';
  
  // Add variant class
  switch (variant) {
    case 'primary':
      buttonClass += ' btn-primary';
      break;
    case 'secondary':
      buttonClass += ' btn-secondary';
      break;
    case 'danger':
      buttonClass += ' btn-danger';
      break;
    case 'ghost':
      buttonClass += ' btn-ghost';
      break;
    default:
      buttonClass += ' btn-primary';
  }
  
  // Add size class
  switch (size) {
    case 'sm':
      buttonClass += ' btn-sm';
      break;
    case 'lg':
      buttonClass += ' btn-lg';
      break;
    default:
      // Default is medium, no additional class needed
      break;
  }
  
  // Add full width class if needed
  if (fullWidth) {
    buttonClass += ' btn-full';
  }
  
  // Add loading class if needed
  if (isLoading) {
    buttonClass += ' btn-loading';
  }
  
  // Add custom classes
  if (className) {
    buttonClass += ' ' + className;
  }
  
  // Enhanced click handler with debugging
  const handleClick = (e) => {
    // Prevent default for form buttons unless specified
    if (rest.type === 'submit' && !rest.preventDefaultOff) {
      e.preventDefault();
    }
    
    console.log(`Button clicked: ${variant} ${children}`);
    
    // Call the provided onClick handler if available
    if (onClick && typeof onClick === 'function') {
      onClick(e);
    }
  };
  
  return (
    <button 
      className={buttonClass}
      onClick={handleClick}
      disabled={isLoading || rest.disabled}
      {...rest}
    >
      {isLoading ? (
        <span className="button-content">
          <span className="spinner"></span>
          <span className="button-text">{children}</span>
        </span>
      ) : (
        <span className="button-content">
          {children}
        </span>
      )}
    </button>
  );
};

export default Button;