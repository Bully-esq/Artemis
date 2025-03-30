import React, { useState, useEffect, useRef, useId } from 'react';
import '../../styles/components/common/buttons.css'; // Updated import path

// Add useMediaQuery custom hook
const useMediaQuery = (query) => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    setMatches(mediaQuery.matches);
    
    const handler = (event) => setMatches(event.matches);
    mediaQuery.addEventListener('change', handler);
    
    return () => mediaQuery.removeEventListener('change', handler);
  }, [query]);

  return matches;
};

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

/**
 * ActionButtons component - Provides a responsive action buttons container
 * Shows regular buttons on desktop and a dropdown menu on mobile screens
 * 
 * @param {Object} props
 * @param {Array} props.actions - Array of action objects with label, onClick, variant, and size
 * @param {Object} props.style - Optional additional inline styles
 * @param {string} props.className - Optional additional CSS classes
 * @param {string} props.topOffset - Vertical offset for positioning, default is '-20px'
 * @param {string} props.dropdownButtonHeight - Height for the dropdown button, default is '30px'
 */
export const ActionButtons = ({ actions }) => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  
  // Generate a unique ID for the dropdown
  const dropdownId = useId();
  
  // Determine if we should show desktop or mobile view
  const isMobile = useMediaQuery('(max-width: 768px)');
  
  return (
    <div className="action-buttons">
      {/* Desktop view - shows all buttons side by side */}
      <div className="desktop-buttons">
        {actions.map((action, index) => (
          <React.Fragment key={index}>
            {!action.items ? (
              <Button
                variant={action.variant || 'primary'}
                onClick={action.onClick}
                size={action.size || 'sm'}
                type={action.type || 'button'}
                style={{ position: 'relative', top: '15px' }} // Add inline style for better positioning
              >
                {action.label}
              </Button>
            ) : (
              <div className="dropdown">
                <button
                  className="dropdown-toggle" // Apply our CSS class for styling
                  onClick={() => {
                    const dropdown = document.getElementById(dropdownId);
                    if (dropdown) {
                      dropdown.classList.toggle('show');
                    }
                  }}
                  style={{ position: 'relative', top: '15px' }} // Add inline style for better positioning
                >
                  {action.label}
                  <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
                <div id={dropdownId} className="dropdown-menu">
                  {action.items.map((item, itemIndex) => (
                    <button
                      key={itemIndex}
                      className="dropdown-item"
                      onClick={() => {
                        item.onClick();
                        document.getElementById(dropdownId).classList.remove('show');
                      }}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
      
      {/* Mobile view - shows a menu button that opens a modal */}
      <div className="mobile-dropdown">
        <button 
          className="dropdown-toggle"
          onClick={() => setIsMobileOpen(true)}
        >
          Actions
          <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
        
        {/* Mobile overlay */}
        {isMobileOpen && (
          <div className="mobile-actions-overlay">
            <div className="mobile-actions-menu">
              <div className="mobile-actions-header">
                <h3>Actions</h3>
                <button 
                  className="mobile-actions-close"
                  onClick={() => setIsMobileOpen(false)}
                >
                  &times;
                </button>
              </div>
              <div className="mobile-actions-list">
                {actions.map((action, index) => (
                  <React.Fragment key={index}>
                    {!action.items ? (
                      <button
                        className="mobile-action-item"
                        onClick={() => {
                          action.onClick();
                          setIsMobileOpen(false);
                        }}
                      >
                        {action.label}
                      </button>
                    ) : (
                      action.items.map((item, itemIndex) => (
                        <button
                          key={`${index}-${itemIndex}`}
                          className="mobile-action-item"
                          onClick={() => {
                            item.onClick();
                            setIsMobileOpen(false);
                          }}
                        >
                          {item.label}
                        </button>
                      ))
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Button;