import React, { useEffect, useRef } from 'react';
import Button from './Button';

/**
 * Modal dialog component
 * 
 * @param {Object} props - Component props
 * @param {boolean} props.isOpen - Whether the dialog is open 
 * @param {Function} props.onClose - Function to call when dialog is closed
 * @param {string} props.title - Dialog title
 * @param {React.ReactNode} props.children - Dialog content
 * @param {React.ReactNode} props.footer - Custom footer content
 * @param {string} props.size - Dialog size (sm, md, lg, xl)
 * @param {string} props.className - Additional classes for dialog container
 * @param {string} props.overlayClassName - Additional classes for overlay
 */
const Dialog = ({
  isOpen = true,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  className = '',
  overlayClassName = ''
}) => {
  const dialogRef = useRef(null);
  
  // Close when clicking outside the dialog
  const handleBackdropClick = (e) => {
    if (dialogRef.current && !dialogRef.current.contains(e.target)) {
      onClose();
    }
  };
  
  // Close on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden'; // Prevent scrolling when open
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = ''; // Restore scrolling when closed
    };
  }, [isOpen, onClose]);
  
  if (!isOpen) return null;
  
  return (
    <div className={`dialog-container ${className}`}>
      {/* Backdrop */}
      <div 
        className={`dialog-overlay ${overlayClassName}`}
        onClick={handleBackdropClick}
      />
      
      {/* Dialog position wrapper */}
      <div className="dialog-wrapper">
        {/* Dialog panel */}
        <div 
          ref={dialogRef}
          className={`dialog-panel dialog-size-${size}`}
        >
          {/* Close button */}
          <button
            className="dialog-close-button"
            onClick={onClose}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="dialog-close-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
          {/* Title */}
          {title && (
            <div className="dialog-header">
              <h3 className="dialog-title">{title}</h3>
            </div>
          )}
          
          {/* Content */}
          <div className="dialog-content">
            {children}
          </div>
          
          {/* Footer */}
          {(footer || onClose) && (
            <div className="dialog-footer">
              {footer || (
                <Button variant="secondary" onClick={onClose}>
                  Close
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dialog;