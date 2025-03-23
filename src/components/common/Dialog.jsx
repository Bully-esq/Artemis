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
 */
const Dialog = ({
  isOpen = true,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  className = '',
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
  
  // Dialog size classes
  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-full mx-4',
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={handleBackdropClick}
      />
      
      {/* Dialog position wrapper */}
      <div className="flex min-h-full items-center justify-center p-4 text-center">
        {/* Dialog panel */}
        <div 
          ref={dialogRef}
          className={`
            relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all
            ${sizeClasses[size] || sizeClasses.md}
            ${className}
          `}
        >
          {/* Close button */}
          <button
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-500 focus:outline-none"
            onClick={onClose}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
          {/* Title */}
          {title && (
            <div className="border-b border-gray-200 px-6 py-4">
              <h3 className="text-lg font-medium text-gray-900">{title}</h3>
            </div>
          )}
          
          {/* Content */}
          <div className="px-6 py-4">
            {children}
          </div>
          
          {/* Footer */}
          {(footer || onClose) && (
            <div className="border-t border-gray-200 px-6 py-4 flex justify-end space-x-3">
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