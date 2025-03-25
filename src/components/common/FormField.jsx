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
  const inputClasses = `form-input
    ${error ? 'input-error' : ''}
    ${disabled ? 'input-disabled' : ''}
    ${className}
  `.trim();
  
  // Label component
  const labelComponent = label ? (
    <label 
      htmlFor={name} 
      className="form-label"
    >
      {label}
      {required && <span className="required-mark">*</span>}
    </label>
  ) : null;
  
  // Error message component
  const errorComponent = error ? (
    <p className="error-message">{error}</p>
  ) : null;
  
  // Help text component
  const helpTextComponent = helpText && !error ? (
    <p className="help-text">{helpText}</p>
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
            className={inputClasses}
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
            className={inputClasses}
            {...rest}
          >
            {children}
          </select>
        );
        
      case 'checkbox':
        return (
          <div className="checkbox-container">
            <div className="checkbox-wrapper">
              <input
                id={name}
                name={name}
                type="checkbox"
                checked={value}
                onChange={onChange}
                disabled={disabled}
                className={`checkbox-input ${className}`}
                {...rest}
              />
            </div>
            {label && (
              <div className="checkbox-label-wrapper">
                <label htmlFor={name} className="checkbox-label">
                  {label}
                  {required && <span className="required-mark">*</span>}
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
            className={inputClasses}
            {...rest}
          />
        );
    }
  };
  
  return (
    <div className="form-field">
      {type !== 'checkbox' && labelComponent}
      {renderField()}
      {errorComponent}
      {helpTextComponent}
    </div>
  );
};

export default FormField;