import React from 'react';

/**
 * Tabs component for switching between content views
 *
 * @param {Object} props - Component props
 * @param {Array} props.tabs - Array of tab objects with id and label properties
 * @param {string} props.activeTab - ID of the active tab
 * @param {Function} props.onChange - Function called when a tab is clicked
 * @param {string} [props.variant='default'] - Tab style variant ('default', 'pills', 'underline').
 * @param {string} [props.className] - Additional classes for the container div.
 * @param {React.CSSProperties} [props.style] - Inline styles for the container div.
 */
const Tabs = ({
  tabs = [],
  activeTab,
  onChange,
  variant = 'default',
  className = '',
  style = {}
}) => {
  const getContainerClasses = () => {
    switch (variant) {
      case 'underline':
        return 'flex border-b border-gray-200';
      case 'pills':
        return 'flex space-x-1 bg-gray-100 p-1 rounded-lg';
      default:
        return 'flex space-x-4 border-b border-gray-200';
    }
  };

  const getTabClasses = (isActive) => {
    const baseCommon = 'px-4 py-2 text-sm font-medium rounded-md cursor-pointer transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500';
    const activeCommon = 'text-white bg-indigo-600'; // Shared active style for pills
    const inactiveCommon = 'text-gray-600 hover:text-gray-900';

    switch (variant) {
      case 'underline':
        return `
          ${baseCommon} rounded-none border-b-2 -mb-px
          ${isActive
            ? 'border-indigo-500 text-indigo-600'
            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
        `;
      case 'pills':
        return `
          ${baseCommon} flex-1 text-center
          ${isActive ? activeCommon : `${inactiveCommon} hover:bg-gray-200`}
        `;
      default: // default variant
        return `
          ${baseCommon} rounded-none
          ${isActive ? 'text-indigo-600 font-semibold' : inactiveCommon}
        `;
    }
  };

  return (
    <div className={`${getContainerClasses()} ${className} overflow-x-auto whitespace-nowrap`} style={style}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button" // Important for accessibility and form behavior
          role="tab" // Accessibility
          aria-selected={tab.id === activeTab} // Accessibility
          className={getTabClasses(tab.id === activeTab)}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
};

/**
 * TabPanel component for use with Tabs
 * Renders content when the active tab matches its ID
 */
export const TabPanel = ({ id, activeTab, children, className = '' }) => {
  if (id !== activeTab) return null;

  // Added padding, can be customized via props.className
  return (
    <div role="tabpanel" className={`py-4 ${className}`}>
      {children}
    </div>
  );
};

export default Tabs;