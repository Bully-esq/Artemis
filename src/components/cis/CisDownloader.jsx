import React, { useState, useEffect } from 'react';
import { useQuery } from 'react-query';
import api from '../../services/api';
import Button from '../common/Button';
import Loading from '../common/Loading';
import FormField from '../common/FormField'; // Import FormField for consistent styling

// Helper function to get the current tax year string (e.g., "2023-2024")
// (Duplicated from cisTracker or move to a shared utils file if used elsewhere)
const getCurrentTaxYear = () => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-indexed

  // Tax year runs from April 6 to April 5
  if (currentMonth < 3 || (currentMonth === 3 && now.getDate() < 6)) {
    return `${currentYear - 1}-${currentYear}`;
  } else {
    return `${currentYear}-${currentYear + 1}`;
  }
};

// Helper to generate CSV content
const generateCsvContent = (records, taxYear) => {
  if (!records || records.length === 0) {
    return 'No CIS records found for the selected tax year.';
  }

  // Calculate total
  const totalCis = records.reduce((total, record) => total + (parseFloat(record.cisDeduction) || 0), 0);

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
    `"${new Date(record.date).toLocaleDateString('en-GB')}"`, // Enclose date in quotes
    `"${record.invoiceNumber || ''}"`, // Enclose strings in quotes
    `"${record.clientName || ''}"`,
    `"${record.clientCompany || ''}"`,
    (parseFloat(record.laborAmount) || 0).toFixed(2),
    ((parseFloat(record.cisRate) || 0) * 100).toFixed(0),
    (parseFloat(record.cisDeduction) || 0).toFixed(2)
  ]);

  // Add total row
  rows.push([
    '"TOTAL"', // Enclose string in quotes
    '""',
    '""',
    '""',
    '""',
    '""',
    totalCis.toFixed(2)
  ]);

  // Combine headers and rows into CSV
  const csv = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\\n');

  return csv;
};

// Helper to trigger CSV download
const downloadCsvFile = (csvContent, fileName) => {
  try {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 100);
    return true;
  } catch (error) {
    console.error('Error downloading CSV:', error);
    return false;
  }
};

// Accept 'mode' prop ('dashboard' or 'settings') instead of 'compact'
const CisDownloader = ({ className = '', mode = 'dashboard' }) => { 
  const [selectedTaxYear, setSelectedTaxYear] = useState(getCurrentTaxYear());
  const [taxYears, setTaxYears] = useState([]);
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [totalCis, setTotalCis] = useState(0);
  const [recordCount, setRecordCount] = useState(0);

  // Fetch ALL CIS records using react-query FROM API
  const { data: allRecords = [], isLoading, error } = useQuery(
    'cisRecordsAll',
    // Wrap the API call in an anonymous function
    () => api.cis.getAll(), 
    {
      onSuccess: (data) => {
        console.log('[CisDownloader] Query Success! Fetched Records:', data);
      },
      onError: (err) => {
        console.error("[CisDownloader] Error fetching CIS records from API:", err);
      },
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: true,
      refetchOnMount: true, 
      refetchOnReconnect: true,
    }
  );

  // Log the raw query state
  useEffect(() => {
    console.log('[CisDownloader] Query State:', { isLoading, error, allRecords });
  }, [isLoading, error, allRecords]);

  // Effect 1: Derive available tax years whenever allRecords changes
  useEffect(() => {
    if (allRecords && allRecords.length > 0) {
      const uniqueYears = [...new Set(allRecords.map(record => record.taxYear).filter(Boolean))]; // Filter out null/undefined years
      const derivedYears = uniqueYears.sort().reverse();
      console.log('[CisDownloader] Derived Tax Years:', derivedYears);
      // Only update if the derived years actually changed
      setTaxYears(prevYears => {
          if (JSON.stringify(prevYears) !== JSON.stringify(derivedYears)) {
              return derivedYears;
          }
          return prevYears;
      });
    } else {
      // If no records, default to just the current tax year
      const currentYear = getCurrentTaxYear();
      console.log('[CisDownloader] No records, defaulting tax years to:', [currentYear]);
      setTaxYears(prevYears => {
          if (JSON.stringify(prevYears) !== JSON.stringify([currentYear])) {
              return [currentYear];
          }
          return prevYears;
      });
    }
  }, [allRecords]); // Only depends on allRecords

  // Effect 2: Adjust selectedTaxYear if it becomes invalid when taxYears changes
  useEffect(() => {
    if (taxYears.length > 0 && !taxYears.includes(selectedTaxYear)) {
      const currentYear = getCurrentTaxYear();
      // Prefer current year if available, otherwise the first in the list
      const newSelectedYear = taxYears.includes(currentYear) ? currentYear : taxYears[0];
      console.log(`[CisDownloader] Adjusting selectedTaxYear from ${selectedTaxYear} to ${newSelectedYear} because options changed.`);
      setSelectedTaxYear(newSelectedYear);
    }
    // No change needed if selectedTaxYear is still valid within the new taxYears list
  }, [taxYears, selectedTaxYear]); // Depends on taxYears and selectedTaxYear

  // Effect 3: Filter records and calculate stats based on allRecords and selectedTaxYear
  useEffect(() => {
    console.log(`[CisDownloader] Filtering records for Tax Year: ${selectedTaxYear}`);
    if (allRecords) {
      const recordsForYear = allRecords.filter(record => record.taxYear === selectedTaxYear);
      setFilteredRecords(recordsForYear);
      setRecordCount(recordsForYear.length);
      const total = recordsForYear.reduce((sum, record) => sum + (parseFloat(record.cisDeduction) || 0), 0);
      setTotalCis(total);
      console.log('[CisDownloader] Filtered Records:', recordsForYear);
      console.log('[CisDownloader] Calculated Stats:', { count: recordsForYear.length, total });
    } else {
      console.log('[CisDownloader] No allRecords data found, resetting stats.');
      setFilteredRecords([]);
      setRecordCount(0);
      setTotalCis(0);
    }
  }, [selectedTaxYear, allRecords]); // This effect depends on selectedTaxYear and allRecords

  // Handle tax year change
  const handleTaxYearChange = (e) => {
    setSelectedTaxYear(e.target.value);
    // Stats will update via the useEffect above
  };

  // Handle download
  const handleDownload = () => {
    const csvContent = generateCsvContent(filteredRecords, selectedTaxYear);
    const fileName = `CIS_Deductions_${selectedTaxYear}.csv`;
    downloadCsvFile(csvContent, fileName);
    // Optionally add success notification
  };

  if (isLoading) {
    return <Loading message="Loading CIS records..." />;
  }

  if (error) {
      return <div className="error-message text-sm text-red-600">Error loading CIS records: {error.message}</div>;
  }

  // --- Render based on mode ---
  if (mode === 'dashboard') {
    // Dashboard mode: Show only stats
    return (
      <div className={className}>
        {/* Mimic stat-card structure */}
        <p className="stat-label mb-2">CIS Records</p>
        <p className="stat-number">
           £{totalCis.toFixed(2)}
        </p>
        <p className="stat-detail">
           This tax year
        </p>
      </div>
    );
  } 
  
  if (mode === 'settings') {
    // Settings mode: Show controls
    return (
      <div className={`cis-downloader-settings ${className}`}>
        <h3 className="text-lg font-semibold mb-3">Download CIS Records</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Select a tax year to download a CSV file of your CIS deductions for that period.
        </p>
        <div className="flex flex-col sm:flex-row sm:items-end gap-4">
          <div className="flex-grow"> 
            <label htmlFor="cis-tax-year-select-settings" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Tax Year
            </label>
            <select
              id="cis-tax-year-select-settings"
              value={selectedTaxYear}
              onChange={handleTaxYearChange}
              className="block w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 dark:text-white disabled:opacity-50"
              disabled={taxYears.length === 0}
            >
              {taxYears.length > 0 ? (
                taxYears.map(year => (
                  <option key={year} value={year}>{year} Tax Year</option>
                ))
              ) : (
                <option value={selectedTaxYear}>{selectedTaxYear} Tax Year</option>
              )}
            </select>
          </div>
          <Button
            variant="primary"
            onClick={handleDownload}
            disabled={filteredRecords.length === 0 || isLoading}
            className="w-full sm:w-auto"
          >
            {isLoading ? 'Loading...' : 'Download CSV'}
          </Button>
        </div>
        {filteredRecords.length === 0 && !isLoading && (
          <p className="text-sm text-gray-500 mt-2">No records found for {selectedTaxYear}.</p>
        )}
      </div>
    );
  }

  // Default or invalid mode - render nothing or an error message
  return null; 
};

export default CisDownloader; 