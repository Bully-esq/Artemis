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
  className = '',
  style = {}
}) => {
  // Variant-specific classes using traditional CSS
  const tabVariants = {
    default: {
      container: 'tabs',
      tab: 'tab',
      active: 'active',
      inactive: ''
    },
    pills: {
      container: 'tabs tabs-pills',
      tab: 'tab',
      active: 'active',
      inactive: ''
    },
    underline: {
      container: 'tabs tabs-underline',
      tab: 'tab',
      active: 'active',
      inactive: ''
    }
  };
  
  // Get classes for the variant
  const variant_classes = tabVariants[variant] || tabVariants.default;
  
  return (
    <div className={`${variant_classes.container} ${className}`} style={style}>
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
    <div className={`tab-content ${className}`}>
      {children}
    </div>
  );
};

export default Tabs;