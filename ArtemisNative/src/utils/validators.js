/**
 * Validators for Axton's Staircases application
 * 
 * Common validation functions for form inputs and business logic
 */

// ---------- Basic Form Validation ----------

/**
 * Validates if a value is not empty
 * @param {*} value - The value to check
 * @returns {boolean} True if value is not empty
 */
export const isNotEmpty = (value) => {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string') return value.trim() !== '';
    return true;
  };
  
  /**
   * Validates if value is within a numeric range
   * @param {number} value - The value to check
   * @param {number} min - Minimum allowed value
   * @param {number} max - Maximum allowed value
   * @returns {boolean} True if value is within range
   */
  export const isInRange = (value, min, max) => {
    const num = Number(value);
    return !isNaN(num) && num >= min && num <= max;
  };
  
  /**
   * Validates minimum length
   * @param {string} value - The string to check
   * @param {number} length - Minimum required length
   * @returns {boolean} True if string meets minimum length
   */
  export const minLength = (value, length) => {
    return value && value.length >= length;
  };
  
  /**
   * Validates maximum length
   * @param {string} value - The string to check
   * @param {number} length - Maximum allowed length
   * @returns {boolean} True if string doesn't exceed maximum length
   */
  export const maxLength = (value, length) => {
    return !value || value.length <= length;
  };
  
  // ---------- Contact Information Validation ----------
  
  /**
   * Validates an email address
   * @param {string} email - The email to validate
   * @returns {boolean} True if email is valid
   */
  export const isValidEmail = (email) => {
    if (!email) return false;
    // Basic regex for email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };
  
  /**
   * Validates a UK phone number
   * @param {string} phone - The phone number to validate
   * @returns {boolean} True if phone is a valid UK format
   */
  export const isValidUKPhone = (phone) => {
    if (!phone) return false;
    // Remove spaces, dashes, and brackets
    const cleaned = phone.replace(/[\s\-\(\)]/g, '');
    
    // Check for valid UK formats
    // - Mobile: 07xxx xxxxxx or +447xxx xxxxxx
    // - Landline: 01xxx xxxxxx or 02x xxxx xxxx, etc.
    const ukPhoneRegex = /^(\+44|0)7\d{9}$|^(\+44|0)[1-9]\d{8,9}$/;
    return ukPhoneRegex.test(cleaned);
  };
  
  /**
   * Validates a UK postcode
   * @param {string} postcode - The postcode to validate
   * @returns {boolean} True if postcode is valid
   */
  export const isValidUKPostcode = (postcode) => {
    if (!postcode) return false;
    
    // UK postcode regex
    // Format: AA9A 9AA, A9A 9AA, A9 9AA, A99 9AA, AA9 9AA, AA99 9AA
    const postcodeRegex = /^[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}$/i;
    return postcodeRegex.test(postcode);
  };
  
  // ---------- Business Specific Validation ----------
  
  /**
   * Validates a UTR (Unique Taxpayer Reference) for CIS
   * @param {string} utr - The UTR to validate
   * @returns {boolean} True if UTR is valid
   */
  export const isValidUTR = (utr) => {
    if (!utr) return false;
    
    // UTR is 10 digits, can be entered with spaces
    const cleaned = utr.replace(/\s/g, '');
    return /^\d{10}$/.test(cleaned);
  };
  
  /**
   * Validates a UK National Insurance number
   * @param {string} niNumber - The NI number to validate
   * @returns {boolean} True if NI number is valid
   */
  export const isValidNINumber = (niNumber) => {
    if (!niNumber) return false;
    
    // UK NI format: two letters, six digits and one letter (e.g., AB123456C)
    // Allow spaces or dashes between groups
    const cleaned = niNumber.replace(/[\s\-]/g, '').toUpperCase();
    return /^[A-Z]{2}[0-9]{6}[A-Z]$/.test(cleaned);
  };
  
  /**
   * Validates a company registration number
   * @param {string} number - The company number to validate
   * @returns {boolean} True if company number is valid
   */
  export const isValidCompanyNumber = (number) => {
    if (!number) return false;
    
    // UK Company registration number is 8 digits
    const cleaned = number.replace(/\s/g, '');
    return /^\d{8}$/.test(cleaned);
  };
  
  /**
   * Validates a VAT number
   * @param {string} vatNumber - The VAT number to validate
   * @returns {boolean} True if VAT number is valid
   */
  export const isValidVATNumber = (vatNumber) => {
    if (!vatNumber) return false;
    
    // UK VAT registration number format
    // Standard: GB + 9 digits (e.g., GB123456789)
    // Alternative formats also exist
    const cleaned = vatNumber.replace(/\s/g, '').toUpperCase();
    
    // Check for standard format
    if (/^GB\d{9}$/.test(cleaned)) return true;
    
    // Check for variations (GB GD or HA prefix)
    if (/^(GBGD|GBHA)\d{3}$/.test(cleaned)) return true;
    
    return false;
  };
  
  // ---------- Quote and Invoice Validation ----------
  
  /**
   * Validates quote data
   * @param {Object} quote - The quote object to validate 
   * @returns {Object} Object with isValid flag and any errors
   */
  export const validateQuote = (quote) => {
    const errors = {};
    
    // Client validation
    if (!quote.client?.name) {
      errors.clientName = 'Client name is required';
    }
    
    // Date validation
    if (!quote.date) {
      errors.date = 'Quote date is required';
    }
    
    // Items validation
    if (!quote.selectedItems || quote.selectedItems.length === 0) {
      errors.items = 'At least one item must be added';
    } else {
      // Check if any visible items exist
      const visibleItems = quote.selectedItems.filter(item => !item.hideInQuote);
      if (visibleItems.length === 0) {
        errors.items = 'At least one visible item must be included';
      }
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  };
  
  /**
   * Validates invoice data
   * @param {Object} invoice - The invoice object to validate
   * @returns {Object} Object with isValid flag and any errors
   */
  export const validateInvoice = (invoice) => {
    const errors = {};
    
    // Client validation
    if (!invoice.clientName) {
      errors.clientName = 'Client name is required';
    }
    
    // Date validation
    if (!invoice.invoiceDate) {
      errors.invoiceDate = 'Invoice date is required';
    }
    
    if (!invoice.dueDate) {
      errors.dueDate = 'Due date is required';
    }
    
    // Amount validation
    if (!invoice.amount || invoice.amount <= 0) {
      errors.amount = 'Invoice amount must be greater than zero';
    }
    
    // Description validation
    if (!invoice.description) {
      errors.description = 'Invoice description is required';
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  };
  
  /**
   * Validates CIS deduction data
   * @param {Object} cisData - The CIS data to validate
   * @returns {Object} Object with isValid flag and any errors
   */
  export const validateCISDeduction = (cisData) => {
    const errors = {};
    
    // Validate UTR if provided
    if (cisData.utr && !isValidUTR(cisData.utr)) {
      errors.utr = 'UTR must be 10 digits';
    }
    
    // Validate NI number if provided
    if (cisData.niNumber && !isValidNINumber(cisData.niNumber)) {
      errors.niNumber = 'Invalid National Insurance number';
    }
    
    // Validate CIS rate
    if (cisData.cisRate === undefined || cisData.cisRate === null) {
      errors.cisRate = 'CIS rate is required';
    } else if (!isInRange(cisData.cisRate, 0, 30)) {
      errors.cisRate = 'CIS rate must be between 0% and 30%';
    }
    
    // Validate labour total
    if (!cisData.labourTotal || cisData.labourTotal <= 0) {
      errors.labourTotal = 'Labour amount must be greater than zero';
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  };
  
  // ---------- Supplier and Catalog Item Validation ----------
  
  /**
   * Validates supplier data
   * @param {Object} supplier - The supplier object to validate
   * @returns {Object} Object with isValid flag and any errors
   */
  export const validateSupplier = (supplier) => {
    const errors = {};
    
    if (!supplier.name) {
      errors.name = 'Supplier name is required';
    }
    
    // Email validation if provided
    if (supplier.email && !isValidEmail(supplier.email)) {
      errors.email = 'Invalid email format';
    }
    
    // Phone validation if provided
    if (supplier.phone && !isValidUKPhone(supplier.phone)) {
      errors.phone = 'Invalid UK phone number';
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  };
  
  /**
   * Validates catalog item data
   * @param {Object} item - The catalog item to validate
   * @returns {Object} Object with isValid flag and any errors
   */
  export const validateCatalogItem = (item) => {
    const errors = {};
    
    if (!item.name) {
      errors.name = 'Item name is required';
    }
    
    if (!item.supplier) {
      errors.supplier = 'Supplier is required';
    }
    
    if (!item.category) {
      errors.category = 'Category is required';
    }
    
    if (item.cost === undefined || item.cost === null) {
      errors.cost = 'Cost is required';
    } else if (item.cost < 0) {
      errors.cost = 'Cost cannot be negative';
    }
    
    // Lead time validation if provided
    if (item.leadTime !== undefined && item.leadTime !== null && item.leadTime < 0) {
      errors.leadTime = 'Lead time cannot be negative';
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  };
  
  /**
   * Validates contact data (GDPR compliant)
   * @param {Object} contact - The contact object to validate
   * @returns {Object} Object with isValid flag and any errors
   */
  export const validateContact = (contact) => {
    const errors = {};
    
    // Different validations based on customer type
    if (contact.customerType === 'individual') {
      if (!contact.firstName) {
        errors.firstName = 'First name is required';
      }
    } else if (contact.customerType === 'company') {
      if (!contact.company) {
        errors.company = 'Company name is required';
      }
    } else {
      errors.customerType = 'Invalid customer type';
    }
    
    // Email validation if provided
    if (contact.email && !isValidEmail(contact.email)) {
      errors.email = 'Invalid email format';
    }
    
    // Phone validation if provided
    if (contact.phone && !isValidUKPhone(contact.phone)) {
      errors.phone = 'Invalid UK phone number';
    }
    
    // GDPR validation
    if (contact.gdprConsent) {
      if (!contact.gdprConsentDate) {
        errors.gdprConsentDate = 'Consent date is required when consent is given';
      }
      
      if (!contact.gdprConsentSource) {
        errors.gdprConsentSource = 'Consent source is required when consent is given';
      }
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  };
  
  // ---------- Form Schema Validation ----------
  
  /**
   * Creates a validation function from a validation schema
   * @param {Object} schema - Object with field names and validation functions
   * @returns {Function} Validation function that returns errors object
   */
  export const createValidator = (schema) => {
    return (values) => {
      const errors = {};
      
      Object.entries(schema).forEach(([field, validators]) => {
        // Handle array of validators
        if (Array.isArray(validators)) {
          for (const validator of validators) {
            const { isValid, message } = validator(values[field], values);
            if (!isValid) {
              errors[field] = message;
              break;
            }
          }
        } 
        // Handle single validator function
        else if (typeof validators === 'function') {
          const { isValid, message } = validators(values[field], values);
          if (!isValid) {
            errors[field] = message;
          }
        }
      });
      
      return errors;
    };
  };
  
  /**
   * Creates a required field validator
   * @param {string} message - Error message if validation fails
   * @returns {Function} Validator function
   */
  export const required = (message = 'This field is required') => {
    return (value) => ({
      isValid: isNotEmpty(value),
      message
    });
  };
  
  /**
   * Creates an email validator
   * @param {string} message - Error message if validation fails
   * @returns {Function} Validator function
   */
  export const email = (message = 'Invalid email address') => {
    return (value) => ({
      isValid: !value || isValidEmail(value),
      message
    });
  };
  
  /**
   * Creates a UK phone validator
   * @param {string} message - Error message if validation fails
   * @returns {Function} Validator function
   */
  export const ukPhone = (message = 'Invalid UK phone number') => {
    return (value) => ({
      isValid: !value || isValidUKPhone(value),
      message
    });
  };
  
  /**
   * Creates a min length validator
   * @param {number} min - Minimum length
   * @param {string} message - Error message if validation fails
   * @returns {Function} Validator function
   */
  export const minLengthValidator = (min, message) => {
    return (value) => ({
      isValid: !value || minLength(value, min),
      message: message || `Must be at least ${min} characters`
    });
  };
  
  /**
   * Creates a max length validator
   * @param {number} max - Maximum length
   * @param {string} message - Error message if validation fails
   * @returns {Function} Validator function
   */
  export const maxLengthValidator = (max, message) => {
    return (value) => ({
      isValid: !value || maxLength(value, max),
      message: message || `Cannot exceed ${max} characters`
    });
  };
  
  /**
   * Creates a numeric range validator
   * @param {number} min - Minimum value
   * @param {number} max - Maximum value
   * @param {string} message - Error message if validation fails
   * @returns {Function} Validator function
   */
  export const rangeValidator = (min, max, message) => {
    return (value) => ({
      isValid: !value || isInRange(value, min, max),
      message: message || `Must be between ${min} and ${max}`
    });
  };
  
  // Export a collection of common field validators
  export const fieldValidators = {
    required,
    email,
    ukPhone,
    minLength: minLengthValidator,
    maxLength: maxLengthValidator,
    range: rangeValidator
  };
  
  export default {
    isNotEmpty,
    isInRange,
    minLength,
    maxLength,
    isValidEmail,
    isValidUKPhone,
    isValidUKPostcode,
    isValidUTR,
    isValidNINumber,
    isValidCompanyNumber,
    isValidVATNumber,
    validateQuote,
    validateInvoice,
    validateCISDeduction,
    validateSupplier,
    validateCatalogItem,
    validateContact,
    createValidator,
    fieldValidators
  };