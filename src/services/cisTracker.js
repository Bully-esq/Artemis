import { v4 as uuidv4 } from 'uuid';

/**
 * CIS Utilities
 * Contains utility functions potentially related to CIS or general app usage.
 * 
 * NOTE: localStorage management functions for CIS records have been removed 
 * as the application now relies on the backend API for persistence.
 */

/**
 * CIS Tracker Service
 * 
 * This service manages tracking of CIS deductions for tax year reporting.
 * It provides functionality to:
 * - Record CIS deductions
 * - Retrieve CIS records by tax year
 * - Export CIS records to CSV/Excel format
 */

// Get the current tax year string (e.g. "2023-2024")
export const getCurrentTaxYear = () => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  
  // Tax year runs from April 6 to April 5 of the following year
  if (currentMonth < 3 || (currentMonth === 3 && now.getDate() < 6)) {
    // Before April 6, so it's the previous tax year
    return `${currentYear - 1}-${currentYear}`;
  } else {
    // April 6 or later, so it's the current tax year
    return `${currentYear}-${currentYear + 1}`;
  }
};

// Get tax year from a date
// NOTE: This is used by server.js
export const getTaxYearFromDate = (dateString) => {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  
  // If before April 6, it's the previous tax year
  if (month < 3 || (month === 3 && day < 6)) {
    return `${year - 1}-${year}`;
  } else {
    return `${year}-${year + 1}`;
  }
};

/**
 * Create a downloadable file from CSV data
 * 
 * @param {string} csvContent - CSV content
 * @param {string} fileName - Name for the download file
 * @returns {boolean} Success/failure
 */
export const downloadCsv = (csvContent, fileName) => {
  try {
    // Create a blob from the CSV string
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    // Create a link element for downloading
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.display = 'none';
    
    // Add to DOM, trigger download, and cleanup
    document.body.appendChild(link);
    link.click();
    
    // Clean up
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 100);
    
    return true;
  } catch (error) {
    console.error('Error downloading CSV:', error);
    return false;
  }
}; 