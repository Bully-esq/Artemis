/**
 * Utility functions for formatting data in consistent ways throughout the application
 */

/**
 * Format a date to YYYY-MM-DD format (for input fields)
 * @param {Date|string} date - Date to format
 * @returns {string} Formatted date string
 */
export function formatDateForInput(date) {
    if (!date) return '';
    
    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) return '';
      
      return d.toISOString().split('T')[0];
    } catch (error) {
      console.error('Error formatting date for input:', error);
      return '';
    }
  }
  
  /**
   * Format a date to locale string (for display)
   * @param {Date|string} date - Date to format
   * @param {Object} options - Format options
   * @returns {string} Formatted date string
   */
  export function formatDate(date, options = {}) {
    if (!date) return '';
    
    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) return '';
      
      return d.toLocaleDateString('en-GB', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric',
        ...options 
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return '';
    }
  }
  
  /**
   * Format a date with both date and time
   * @param {Date|string} date - Date to format
   * @returns {string} Formatted date and time string
   */
  export function formatDateTime(date) {
    if (!date) return '';
    
    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) return '';
      
      return d.toLocaleDateString('en-GB', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Error formatting date time:', error);
      return '';
    }
  }
  
  /**
   * Calculate due date based on start date and payment terms
   * @param {Date|string} startDate - Starting date
   * @param {number} days - Number of days for payment term
   * @returns {Date} Calculated due date
   */
  export function calculateDueDate(startDate, days = 14) {
    if (!startDate) return new Date();
    
    try {
      const date = new Date(startDate);
      date.setDate(date.getDate() + days);
      return date;
    } catch (error) {
      console.error('Error calculating due date:', error);
      return new Date();
    }
  }
  
  /**
   * Format a number with specified decimal places
   * @param {number} value - Number to format
   * @param {number} decimals - Number of decimal places
   * @returns {string} Formatted number string
   */
  export function formatNumber(value, decimals = 2) {
    if (value === null || value === undefined) return '';
    
    try {
      return Number(value).toFixed(decimals);
    } catch (error) {
      console.error('Error formatting number:', error);
      return '';
    }
  }
  
  /**
   * Format a percentage value
   * @param {number} value - Percentage value (e.g., 20 for 20%)
   * @param {number} decimals - Number of decimal places
   * @returns {string} Formatted percentage string
   */
  export function formatPercentage(value, decimals = 1) {
    if (value === null || value === undefined) return '';
    
    try {
      return `${Number(value).toFixed(decimals)}%`;
    } catch (error) {
      console.error('Error formatting percentage:', error);
      return '';
    }
  }
  
  /**
   * Format a value as GBP currency
   * @param {number} value - Value to format
   * @param {number} decimals - Number of decimal places
   * @returns {string} Formatted currency string
   */
  export function formatCurrency(value, decimals = 2) {
    if (value === null || value === undefined) return '';
    
    try {
      return `£${Number(value).toFixed(decimals)}`;
    } catch (error) {
      console.error('Error formatting currency:', error);
      return '';
    }
  }
  
  /**
   * Format a large currency value with commas
   * @param {number} value - Value to format
   * @returns {string} Formatted currency string with commas
   */
  export function formatLargeCurrency(value) {
    if (value === null || value === undefined) return '';
    
    try {
      return `£${Number(value).toLocaleString('en-GB', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })}`;
    } catch (error) {
      console.error('Error formatting large currency:', error);
      return '';
    }
  }
  
  /**
   * Format a name/title with proper capitalization
   * @param {string} text - Text to format
   * @returns {string} Formatted text
   */
  export function formatTitle(text) {
    if (!text) return '';
    
    try {
      return text
        .toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    } catch (error) {
      console.error('Error formatting title:', error);
      return text;
    }
  }
  
  /**
   * Format a multi-line address for display
   * @param {string} address - Address to format
   * @returns {string} Formatted address with HTML line breaks
   */
  export function formatAddress(address) {
    if (!address) return '';
    
    try {
      return address.replace(/\n/g, '<br>');
    } catch (error) {
      console.error('Error formatting address:', error);
      return address;
    }
  }
  
  /**
   * Format a UK phone number
   * @param {string} phone - Phone number to format
   * @returns {string} Formatted phone number
   */
  export function formatPhone(phone) {
    if (!phone) return '';
    
    try {
      // Remove all non-numeric characters
      const cleaned = phone.replace(/\D/g, '');
      
      // Format based on length
      if (cleaned.length === 11 && cleaned.startsWith('0')) {
        // Standard UK number: 07xxx xxxxxx
        return cleaned.replace(/(\d{5})(\d{6})/, '$1 $2');
      } else if (cleaned.length === 10 && !cleaned.startsWith('0')) {
        // UK number without leading 0
        return `0${cleaned.replace(/(\d{4})(\d{6})/, '$1 $2')}`;
      } else {
        // Return as is if not recognized format
        return phone;
      }
    } catch (error) {
      console.error('Error formatting phone number:', error);
      return phone;
    }
  }
  
  /**
   * Format a quote/invoice reference number
   * @param {string} prefix - Prefix (e.g., 'Q-' or 'INV-')
   * @param {string|number} id - Identifier
   * @returns {string} Formatted reference number
   */
  export function formatReference(prefix, id) {
    if (!id) return '';
    
    try {
      const year = new Date().getFullYear();
      const idString = String(id).padStart(4, '0');
      return `${prefix}${year}-${idString}`;
    } catch (error) {
      console.error('Error formatting reference number:', error);
      return `${prefix}${id}`;
    }
  }
  
  /**
   * Convert payment terms code to readable text
   * @param {string} terms - Payment terms code
   * @returns {string} Human-readable payment terms
   */
  export function formatPaymentTerms(terms) {
    if (!terms) return 'Standard payment terms';
    
    try {
      switch (terms) {
        case '1':
          return '50% deposit required, remainder due on completion';
        case '2':
          return '50% deposit required, 25% on completion of joinery, final 25% on completion';
        case '3':
          return 'Custom payment terms'; // Should display custom terms if available
        case '4':
          return 'Full payment required before delivery';
        default:
          return 'Standard payment terms';
      }
    } catch (error) {
      console.error('Error formatting payment terms:', error);
      return 'Standard payment terms';
    }
  }
  
  /**
   * Format a GDPR consent source
   * @param {string} source - GDPR consent source code
   * @returns {string} Human-readable consent source
   */
  export function formatConsentSource(source) {
    if (!source) return 'Unknown source';
    
    try {
      const sources = {
        'form': 'Website Contact Form',
        'email': 'Email Consent',
        'phone': 'Phone Call',
        'in-person': 'In-Person Agreement',
        'contract': 'Contract/Agreement',
        'other': 'Other Source'
      };
      
      return sources[source] || source;
    } catch (error) {
      console.error('Error formatting consent source:', error);
      return source;
    }
  }
  
  /**
   * Format file size in human-readable form
   * @param {number} bytes - Size in bytes
   * @returns {string} Formatted size (e.g., "1.5 MB")
   */
  export function formatFileSize(bytes) {
    if (!bytes || bytes === 0) return '0 Bytes';
    
    try {
      const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
      const i = Math.floor(Math.log(bytes) / Math.log(1024));
      return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
    } catch (error) {
      console.error('Error formatting file size:', error);
      return `${bytes} Bytes`;
    }
  }