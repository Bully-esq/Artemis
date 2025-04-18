import React from 'react';

/**
 * Reusable form field component supporting various input types - Converted to Tailwind
 * 
 * @param {Object} props - Component props
 * @param {string} props.label - Field label text
 * @param {string} props.name - Field name attribute
 * @param {string} props.type - Input type (text, email, password, number, date, textarea, select, checkbox, toggle)
 * @param {string | number | boolean} props.value - Field value
 * @param {Function} props.onChange - Change handler
 * @param {string} [props.placeholder] - Placeholder text
 * @param {string} [props.error] - Error message
 * @param {string} [props.helpText] - Help text displayed below field
 * @param {boolean} [props.required=false] - Whether the field is required
 * @param {boolean} [props.disabled=false] - Whether the field is disabled
 * @param {React.ReactNode} [props.children] - For select options or other content
 * @param {string} [props.className] - Additional classes for the wrapper div
 * @param {string} [props.inputClassName] - Additional classes specifically for the input/select/textarea element
 * @param {number} [props.min] - Min value for number input
 * @param {number} [props.max] - Max value for number input
 * @param {number} [props.step] - Step value for number input
 * @param {React.ReactNode} [props.prefix] - Element to display before the input (e.g., currency symbol)
 * @param {React.ReactNode} [props.suffix] - Element to display after the input (e.g., unit)
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
  className = '', // For the wrapper
  inputClassName = '', // For the input itself
  min,
  max,
  step,
  prefix,
  suffix,
  ...rest
}) => {

  const id = name || label?.toLowerCase().replace(/\s+/g, '-');

  // Base input styles
  const baseInputStyles = "block w-full border border-[var(--input-border)] rounded-md shadow-sm bg-[var(--input-background)] text-[var(--input-text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] focus:border-[var(--primary)] sm:text-sm disabled:cursor-not-allowed disabled:bg-gray-50 dark:disabled:bg-gray-700 disabled:text-gray-400 dark:disabled:text-gray-500";
  const paddingStyles = type !== 'checkbox' && type !== 'toggle' ? "px-3 py-2" : ""; // No padding for checkbox/toggle itself
  const errorStyles = error ? "border-red-500 dark:border-red-400 focus:ring-red-500 focus:border-red-500" : "";
  
  const finalInputClasses = `${baseInputStyles} ${paddingStyles} ${errorStyles} ${inputClassName}`.trim().replace(/\s+/g, ' ');
  
  // Label component
  const labelComponent = label ? (
    <label 
      htmlFor={id} 
      className="block text-sm font-medium text-[var(--text-secondary)] mb-1"
    >
      {label}
      {required && <span className="ml-1 text-red-500">*</span>}
    </label>
  ) : null;
  
  // Error message component
  const errorComponent = error ? (
    <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>
  ) : null;
  
  // Help text component
  const helpTextComponent = helpText && !error ? (
    <p className="mt-1 text-xs text-[var(--text-muted)]">{helpText}</p>
  ) : null;

  // Input with optional prefix/suffix
  const renderInputWithAddons = (inputElement) => {
    if (!prefix && !suffix) {
      return inputElement;
    }
    return (
      <div className="relative flex items-stretch focus-within:z-10">
        {prefix && (
          <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-[var(--input-border)] bg-gray-50 dark:bg-gray-700 text-[var(--text-secondary)] sm:text-sm">
            {prefix}
          </span>
        )}
        {React.cloneElement(inputElement, {
          className: `${inputElement.props.className} ${prefix ? 'rounded-l-none' : ''} ${suffix ? 'rounded-r-none' : ''}`
        })}
        {suffix && (
          <span className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-[var(--input-border)] bg-gray-50 dark:bg-gray-700 text-[var(--text-secondary)] sm:text-sm">
            {suffix}
          </span>
        )}
      </div>
    );
  };
  
  // Render different field types
  const renderField = () => {
    switch (type) {
      case 'textarea':
        return renderInputWithAddons(
          <textarea
            id={id}
            name={name}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            required={required}
            disabled={disabled}
            className={finalInputClasses}
            rows={rest.rows || 3}
            {...rest}
          />
        );
        
      case 'select':
        return renderInputWithAddons(
          <select
            id={id}
            name={name}
            value={value}
            onChange={onChange}
            required={required}
            disabled={disabled}
            className={`${finalInputClasses} pr-10 bg-none`}
            {...rest}
          >
            {children}
          </select>
        );
        
      case 'checkbox':
        // Checkbox is rendered differently with label alongside
        return (
          <div className="flex items-center">
            <input
              id={id}
              name={name}
              type="checkbox"
              checked={!!value} // Ensure boolean value
              onChange={onChange}
              disabled={disabled}
              className={`h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-[var(--primary)] focus:ring-[var(--primary)] ${inputClassName}`}
              {...rest}
            />
            {label && (
              <label htmlFor={id} className="ml-2 block text-sm text-[var(--text-secondary)] cursor-pointer">
                {label}
                {required && <span className="ml-1 text-red-500">*</span>}
              </label>
            )}
          </div>
        );

      case 'toggle':
        // Basic Toggle Switch (consider Headless UI Switch for better implementation)
        return (
           <div className="flex items-center">
             <button
               type="button"
               className={`${ !!value ? 'bg-[var(--primary)]' : 'bg-gray-200 dark:bg-gray-600' } relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
               role="switch"
               aria-checked={!!value}
               onClick={(e) => { if (!disabled && onChange) onChange({ target: { name, value: !value, type: 'toggle' } }) }}
               disabled={disabled}
             >
               <span className="sr-only">{label}</span>
               <span
                 aria-hidden="true"
                 className={`${ !!value ? 'translate-x-4' : 'translate-x-0' } pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
               />
             </button>
             {label && (
                <label onClick={(e) => { if (!disabled && onChange) onChange({ target: { name, value: !value, type: 'toggle' } }) }} className="ml-3 text-sm text-[var(--text-secondary)] cursor-pointer">
                  {label}
                  {required && <span className="ml-1 text-red-500">*</span>}
                </label>
             )}
          </div>
        );
        
      case 'number':
      case 'date': // Treat date like other text inputs for styling
      case 'password':
      case 'email':
      case 'text':
      default:
        return renderInputWithAddons(
          <input
            id={id}
            name={name}
            type={type}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            required={required}
            disabled={disabled}
            className={finalInputClasses}
            min={min}
            max={max}
            step={step}
            {...rest}
          />
        );
    }
  };
  
  // Render the field with wrapper, label (if not checkbox), error, help text
  return (
    <div className={`mb-4 ${className}`}> {/* Use default margin */}
      {type !== 'checkbox' && type !== 'toggle' && labelComponent}
      {renderField()}
      {errorComponent}
      {helpTextComponent}
    </div>
  );
};

export default FormField;