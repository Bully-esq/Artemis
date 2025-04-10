import { v4 as uuidv4 } from 'uuid';

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

// CIS storage key in localStorage
const CIS_STORAGE_KEY = 'cis_deductions';

// Helper to get all stored CIS records
const getAllCisRecords = () => {
  try {
    const storedData = localStorage.getItem(CIS_STORAGE_KEY);
    return storedData ? JSON.parse(storedData) : [];
  } catch (error) {
    console.error('Error retrieving CIS records from storage:', error);
    return [];
  }
};

// Helper to save all CIS records
const saveAllCisRecords = (records) => {
  try {
    localStorage.setItem(CIS_STORAGE_KEY, JSON.stringify(records));
    return true;
  } catch (error) {
    console.error('Error saving CIS records to storage:', error);
    return false;
  }
};

/**
 * Save a CIS deduction record
 * 
 * @param {Object} deduction - The CIS deduction details
 * @param {string} deduction.invoiceId - ID of the invoice
 * @param {string} deduction.invoiceNumber - Invoice number for reference
 * @param {string} deduction.clientName - Name of the client
 * @param {string} deduction.clientCompany - Company name of the client (optional)
 * @param {number} deduction.laborAmount - Amount of labor that CIS was applied to
 * @param {number} deduction.cisRate - Rate used for CIS deduction (usually 0.20 or 20%)
 * @param {number} deduction.cisDeduction - Amount deducted for CIS
 * @param {string} deduction.date - Date of the deduction (ISO string)
 * @returns {string | null} The ID of the saved record, or null if failed
 */
export const saveCisDeduction = (deduction) => {
  try {
    // Validate the deduction data
    if (!deduction.invoiceId || !deduction.clientName || !deduction.cisDeduction) {
      throw new Error('Invalid CIS deduction data - missing required fields');
    }
    
    // Format and prepare the record
    const date = deduction.date ? new Date(deduction.date) : new Date();
    const taxYear = getTaxYearFromDate(date.toISOString());
    
    const record = {
      id: uuidv4(),
      invoiceId: deduction.invoiceId,
      invoiceNumber: deduction.invoiceNumber || 'Unknown',
      clientName: deduction.clientName,
      clientCompany: deduction.clientCompany || '',
      laborAmount: deduction.laborAmount || 0,
      cisRate: deduction.cisRate || 0.20,
      cisDeduction: deduction.cisDeduction,
      date: date.toISOString(),
      taxYear: taxYear,
      createdAt: new Date().toISOString()
    };
    
    // Get existing records and add the new one
    const existingRecords = getAllCisRecords();
    existingRecords.push(record);
    
    // Save all records
    const success = saveAllCisRecords(existingRecords);
    
    if (success) {
      console.log(`CIS record saved for invoice ${record.invoiceNumber} - Amount: £${record.cisDeduction}`);
      return record.id; // Return the ID of the saved record
    } else {
      console.error('Failed to save CIS records to storage.');
      return null;
    }
  } catch (error) {
    console.error('Error saving CIS deduction:', error);
    throw error;
  }
};

/**
 * Get CIS records for a specific tax year
 * 
 * @param {string} taxYear - Tax year in format "YYYY-YYYY" (e.g., "2023-2024")
 * @returns {Array} Array of CIS records for that tax year
 */
export const getCisRecordsByTaxYear = (taxYear = getCurrentTaxYear()) => {
  const records = getAllCisRecords();
  return records.filter(record => record.taxYear === taxYear);
};

/**
 * Get CIS records for all tax years, grouped by tax year
 * 
 * @returns {Object} Object with tax years as keys and arrays of records as values
 */
export const getAllCisRecordsByTaxYear = () => {
  const records = getAllCisRecords();
  
  // Group records by tax year
  return records.reduce((grouped, record) => {
    const taxYear = record.taxYear || getCurrentTaxYear();
    if (!grouped[taxYear]) {
      grouped[taxYear] = [];
    }
    grouped[taxYear].push(record);
    return grouped;
  }, {});
};

/**
 * Calculate total CIS deducted for a tax year
 * 
 * @param {string} taxYear - Tax year in format "YYYY-YYYY"
 * @returns {number} Total CIS deduction amount
 */
export const getTotalCisForTaxYear = (taxYear = getCurrentTaxYear()) => {
  const records = getCisRecordsByTaxYear(taxYear);
  return records.reduce((total, record) => total + (parseFloat(record.cisDeduction) || 0), 0);
};

/**
 * Delete a CIS record
 * 
 * @param {string} recordId - ID of the record to delete
 * @returns {boolean} Success/failure
 */
export const deleteCisRecord = (recordId) => {
  try {
    const records = getAllCisRecords();
    const filteredRecords = records.filter(record => record.id !== recordId);
    
    // Check if the length actually decreased
    if (filteredRecords.length < records.length) {
      // Save the NEW array (without the deleted record)
      console.log(`Attempting to save filtered CIS records (length: ${filteredRecords.length}) after removing ${recordId}`);
      const success = saveAllCisRecords(filteredRecords);
      if (success) {
        console.log(`Successfully saved filtered records back to localStorage.`);
        return true; // Return true ONLY if saving the shorter list was successful
      } else {
        console.error(`Failed to save filtered records back to localStorage for ID ${recordId}`);
        return false; // Return false if save failed
      }
    } else {
        console.warn(`CIS Record ID ${recordId} not found in tracker. No deletion performed.`);
    }
    // If length didn't change (recordId not found), return false
    return false;
  } catch (error) {
    console.error('Error deleting CIS record:', error);
    return false;
  }
};

/**
 * Convert CIS records for a tax year to CSV format
 * 
 * @param {string} taxYear - Tax year to export
 * @returns {string} CSV content
 */
export const exportCisRecordsToCsv = (taxYear = getCurrentTaxYear()) => {
  const records = getCisRecordsByTaxYear(taxYear);
  
  if (records.length === 0) {
    return 'No CIS records found for the selected tax year.';
  }
  
  // Calculate total
  const totalCis = getTotalCisForTaxYear(taxYear);
  
  // CSV Headers
  const headers = [
    'Date',
    'Invoice Number',
    'Client Name',
    'Client Company',
    'Labor Amount (£)',
    'CIS Rate (%)',
    'CIS Deduction (£)'
  ];
  
  // Format records for CSV
  const rows = records.map(record => [
    new Date(record.date).toLocaleDateString('en-GB'),
    record.invoiceNumber,
    record.clientName,
    record.clientCompany || '',
    (parseFloat(record.laborAmount) || 0).toFixed(2),
    ((parseFloat(record.cisRate) || 0) * 100).toFixed(0),
    (parseFloat(record.cisDeduction) || 0).toFixed(2)
  ]);
  
  // Add total row
  rows.push([
    'TOTAL',
    '',
    '',
    '',
    '',
    '',
    totalCis.toFixed(2)
  ]);
  
  // Combine headers and rows into CSV
  const csv = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');
  
  return csv;
};

/**
 * Create a downloadable file from CSV data
 * 
 * @param {string} csvContent - CSV content
 * @param {string} fileName - Name for the download file
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

/**
 * Export and download CIS records for a tax year
 * 
 * @param {string} taxYear - Tax year to export
 * @returns {boolean} Success/failure
 */
export const downloadCisRecords = (taxYear = getCurrentTaxYear()) => {
  try {
    const csvContent = exportCisRecordsToCsv(taxYear);
    const fileName = `CIS_Deductions_${taxYear}.csv`;
    return downloadCsv(csvContent, fileName);
  } catch (error) {
    console.error('Error exporting CIS records:', error);
    return false;
  }
}; 