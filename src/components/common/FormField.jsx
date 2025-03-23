import React from 'react';

/**
 * Reusable form field component supporting various input types
 * 
 * @param {Object} props - Component props
 * @param {string} props.label - Field label text
 * @param {string} props.name - Field name attribute
 * @param {string} props.type - Input type (text, email, password, number, textarea, select)
 * @param {string} props.value - Field value
 * @param {Function} props.onChange - Change handler
 * @param {string} props.placeholder - Placeholder text
 * @param {string} props.error - Error message
 * @param {string} props.helpText - Help text displayed below field
 * @param {boolean} props.required - Whether the field is required
 * @param {React.ReactNode} props.children - For select options or other content
 */
const FormField = ({
  label,
  name,
  type = 'text',
  value,
  onChange,
  placeholder,
  error,
  helpText,
  required = false,
  disabled = false,
  children,
  className = '',
  ...rest
}) => {
  // Common input classes
  const inputClasses = `
    w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500
    ${error ? 'border-red-300 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500' : ''}
    ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}
  `.trim();
  
  // Label component
  const labelComponent = label ? (
    <label 
      htmlFor={name} 
      className="block text-sm font-medium text-gray-700 mb-1"
    >
      {label}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
  ) : null;
  
  // Error message component
  const errorComponent = error ? (
    <p className="mt-1 text-sm text-red-600">{error}</p>
  ) : null;
  
  // Help text component
  const helpTextComponent = helpText && !error ? (
    <p className="mt-1 text-sm text-gray-500">{helpText}</p>
  ) : null;
  
  // Render different field types
  const renderField = () => {
    switch (type) {
      case 'textarea':
        return (
          <textarea
            id={name}
            name={name}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            required={required}
            disabled={disabled}
            className={`${inputClasses} ${className}`}
            rows={rest.rows || 3}
            {...rest}
          />
        );
        
      case 'select':
        return (
          <select
            id={name}
            name={name}
            value={value}
            onChange={onChange}
            required={required}
            disabled={disabled}
            className={`${inputClasses} ${className}`}
            {...rest}
          >
            {children}
          </select>
        );
        
      case 'checkbox':
        return (
          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                id={name}
                name={name}
                type="checkbox"
                checked={value}
                onChange={onChange}
                disabled={disabled}
                className={`h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 ${className}`}
                {...rest}
              />
            </div>
            {label && (
              <div className="ml-3 text-sm">
                <label htmlFor={name} className="font-medium text-gray-700">
                  {label}
                  {required && <span className="text-red-500 ml-1">*</span>}
                </label>
              </div>
            )}
          </div>
        );
        
      default:
        return (
          <input
            id={name}
            name={name}
            type={type}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            required={required}
            disabled={disabled}
            className={`${inputClasses} ${className}`}
            {...rest}
          />
        );
    }
  };
  
  return (
    <div className="mb-4">
      {type !== 'checkbox' && labelComponent}
      {renderField()}
      {errorComponent}
      {helpTextComponent}
    </div>
  );
};

export default FormField;