import React, { useState, useEffect, useRef, useId } from 'react';

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
 * Button component with different variants and sizes - Converted to Tailwind
 * 
 * @param {Object} props - Component props
 * @param {'primary' | 'secondary' | 'danger' | 'success' | 'warning' | 'info' | 'light' | 'ghost'} [props.variant='primary'] - Button style variant
 * @param {'xs' | 'sm' | 'md' | 'lg'} [props.size='md'] - Button size
 * @param {boolean} [props.isLoading=false] - Show loading state
 * @param {boolean} [props.fullWidth=false] - Make button full width
 * @param {Function} props.onClick - Click handler
 * @param {React.ReactNode} [props.icon] - Optional icon element to display before children
 * @param {string} [props.tooltip] - Optional tooltip text
 * @param {string} [props.className] - Additional CSS classes
 * @param {React.ReactNode} props.children - Button content
 */
const Button = React.forwardRef(({ 
  variant = 'primary', 
  size = 'md', 
  isLoading = false,
  fullWidth = false,
  onClick,
  icon, // Added icon prop
  tooltip, // Added tooltip prop
  className = '',
  children,
  type = 'button', // Default type to button
  disabled = false,
  ...rest
}, ref) => {

  // Base styles
  const baseStyles = "inline-flex items-center justify-center border border-transparent font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition ease-in-out duration-150 disabled:opacity-50 disabled:cursor-not-allowed";

  // Size styles
  let sizeStyles = "";
  switch (size) {
    case 'xs':
      sizeStyles = "px-2 py-1 text-xs";
      break;
    case 'sm':
      sizeStyles = "px-3 py-1.5 text-sm leading-5"; // Adjusted for consistency
      break;
    case 'lg':
      sizeStyles = "px-6 py-3 text-lg"; // Adjusted for consistency
      break;
    case 'md':
    default:
      sizeStyles = "px-4 py-2 text-sm"; // Adjusted for consistency
      break;
  }

  // Variant styles
  let variantStyles = "";
  switch (variant) {
    case 'secondary':
      variantStyles = "bg-[var(--secondary)] text-white hover:bg-[var(--secondary-hover)] focus:ring-[var(--secondary)] border-[var(--secondary)]";
      break;
    case 'danger':
      variantStyles = "bg-[var(--danger)] text-white hover:bg-[var(--danger-hover)] focus:ring-[var(--danger)] border-[var(--danger)]";
      break;
    case 'success':
      variantStyles = "bg-green-600 text-white hover:bg-green-700 focus:ring-green-500 border-green-600"; // Example Tailwind color
      break;
    case 'warning':
      variantStyles = "bg-yellow-500 text-white hover:bg-yellow-600 focus:ring-yellow-400 border-yellow-500"; // Example Tailwind color
      break;
    case 'info':
      variantStyles = "bg-blue-500 text-white hover:bg-blue-600 focus:ring-blue-400 border-blue-500"; // Example Tailwind color
      break;
    case 'light':
      variantStyles = "bg-gray-200 text-gray-700 hover:bg-gray-300 focus:ring-gray-400 border-gray-200"; // Example Tailwind color
      break;
    case 'ghost':
      variantStyles = "bg-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] focus:ring-[var(--primary-accent)] border-transparent shadow-none";
      break;
    case 'primary':
    default:
      variantStyles = "bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] focus:ring-[var(--primary)] border-[var(--primary)]";
      break;
  }

  // Full width styles
  const fullWidthStyles = fullWidth ? "w-full" : "";

  // Loading styles
  const loadingStyles = isLoading ? "cursor-wait" : "";

  const finalClassName = `${baseStyles} ${sizeStyles} ${variantStyles} ${fullWidthStyles} ${loadingStyles} ${className}`.trim().replace(/\s+/g, ' ');

  const iconOnly = !children && icon;
  const iconSpacing = children && icon ? (size === 'xs' || size === 'sm' ? 'mr-1' : 'mr-2') : '';

  return (
    <button 
      ref={ref}
      type={type}
      className={finalClassName}
      onClick={onClick}
      disabled={isLoading || disabled}
      title={tooltip} // Add tooltip attribute
      {...rest}
    >
      {isLoading && (
        <svg className={`animate-spin h-4 w-4 ${icon ? 'mr-2' : ''}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      {icon && !isLoading && (
         // Render icon with appropriate spacing
         <span className={iconSpacing}>{icon}</span>
      )}
      {!iconOnly && children} {/* Render children if not icon-only */}
    </button>
  );
});

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
    <div className="action-buttons"> {/* Keep this class temporarily for targeting if needed */} 
      {/* Desktop view - shows all buttons side by side */}
      <div className="desktop-buttons hidden md:flex items-center space-x-2"> {/* Converted */}
        {actions.map((action, index) => (
          <React.Fragment key={index}>
            {!action.items ? (
              <Button
                variant={action.variant || 'secondary'} // Default to secondary for actions
                onClick={action.onClick}
                size={action.size || 'sm'}
                type={action.type || 'button'}
                icon={action.icon}
                tooltip={action.tooltip}
                disabled={action.disabled}
              >
                {action.label}
              </Button>
            ) : (
              // Dropdown - Requires separate component or more complex Tailwind implementation
              // Placeholder for desktop dropdown
              <div className="relative inline-block text-left">
                 <Button
                    variant={action.variant || 'secondary'}
                    size={action.size || 'sm'}
                    onClick={() => { /* Toggle logic needed */ }}
                    icon={action.icon}
                    tooltip={action.tooltip}
                 >
                    {action.label}
                    <svg className="-mr-1 ml-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                 </Button>
                 {/* Dropdown menu itself needs absolute positioning, visibility toggle etc. */}
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
      
      {/* Mobile view - shows a menu button that opens a modal */}
      <div className="md:hidden"> {/* Converted */}
        <Button 
          variant="ghost" // Use ghost for mobile menu trigger
          size="sm"
          onClick={() => setIsMobileOpen(true)}
          aria-label="Actions"
          tooltip="More actions"
        >
           <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
             <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
           </svg>
        </Button>
        
        {/* Mobile overlay & menu - Needs Dialog/Modal component or Tailwind UI */}
        {isMobileOpen && (
          <div 
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" // Overlay styles
            onClick={() => setIsMobileOpen(false)}
           >
             <div 
                className="fixed inset-x-4 bottom-4 z-50 bg-[var(--card-background)] rounded-lg shadow-xl p-4" // Menu styles
                onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
            >
               <h3 className="text-lg font-medium text-[var(--text-primary)] mb-3 text-center">Actions</h3>
               <div className="space-y-2">
                 {actions.flatMap((action, index) => // Use flatMap to handle dropdown items
                   !action.items ? (
                     <Button
                       key={index}
                       variant={action.variant || 'secondary'}
                       onClick={() => { action.onClick(); setIsMobileOpen(false); }}
                       size={action.size || 'sm'}
                       type={action.type || 'button'}
                       icon={action.icon}
                       fullWidth // Make mobile buttons full width
                       disabled={action.disabled}
                     >
                       {action.label}
                     </Button>
                   ) : (
                     action.items.map((item, itemIndex) => (
                       <Button
                         key={`${index}-${itemIndex}`}
                         variant={item.variant || 'ghost'} // Use ghost for dropdown items
                         onClick={() => { item.onClick(); setIsMobileOpen(false); }}
                         size={item.size || 'sm'}
                         icon={item.icon}
                         fullWidth
                         className="justify-start" // Align text left for menu items
                         disabled={item.disabled}
                       >
                         {item.label}
                       </Button>
                     ))
                   )
                 )}
               </div>
               <Button variant="light" onClick={() => setIsMobileOpen(false)} fullWidth className="mt-4">Cancel</Button>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Button;