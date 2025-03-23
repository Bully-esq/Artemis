import React from 'react';

/**
 * Tabs component for switching between content views
 * 
 * @param {Object} props - Component props
 * @param {Array} props.tabs - Array of tab objects with id and label properties
 * @param {string} props.activeTab - ID of the active tab
 * @param {Function} props.onChange - Function called when a tab is clicked
 * @param {string} props.variant - Tab style variant (default, pills, underline)
 */
const Tabs = ({
  tabs = [],
  activeTab,
  onChange,
  variant = 'default',
  className = ''
}) => {
  // Base tab classes
  const baseTabClasses = 'px-4 py-2 text-sm font-medium cursor-pointer transition-colors';
  
  // Variant-specific classes
  const tabVariants = {
    default: {
      container: 'flex',
      tab: `${baseTabClasses} rounded-t-lg border-b-2`,
      active: 'bg-white text-blue-600 border-blue-600',
      inactive: 'text-gray-500 hover:text-gray-700 border-transparent hover:border-gray-300'
    },
    pills: {
      container: 'flex space-x-1',
      tab: `${baseTabClasses} rounded-md`,
      active: 'bg-blue-600 text-white',
      inactive: 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
    },
    underline: {
      container: 'flex border-b border-gray-200',
      tab: `${baseTabClasses} border-b-2`,
      active: 'text-blue-600 border-blue-600',
      inactive: 'text-gray-500 hover:text-gray-700 border-transparent hover:border-gray-300'
    }
  };
  
  // Get classes for the variant
  const variant_classes = tabVariants[variant] || tabVariants.default;
  
  return (
    <div className={`${variant_classes.container} ${className}`}>
      {tabs.map((tab) => (
        <div
          key={tab.id}
          className={`
            ${variant_classes.tab}
            ${tab.id === activeTab ? variant_classes.active : variant_classes.inactive}
          `}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </div>
      ))}
    </div>
  );
};

/**
 * TabPanel component for use with Tabs
 * Renders content when the active tab matches its ID
 */
export const TabPanel = ({ 
  id, 
  activeTab, 
  children,
  className = ''
}) => {
  if (id !== activeTab) return null;
  
  return (
    <div className={`py-4 ${className}`}>
      {children}
    </div>
  );
};

export default Tabs;