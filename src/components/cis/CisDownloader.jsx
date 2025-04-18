import React, { useState, useEffect } from 'react';
import { useQuery } from 'react-query';
import api from '../../services/api';
import Button from '../common/Button';
import Loading from '../common/Loading';

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
    `"${record.clientName || ''}"`,    `"${record.clientCompany || ''}"`,
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
  ].join('\n');

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

const CisDownloader = ({ className = '', compact = false }) => {
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
      return <div className="error-message">Error loading CIS records: {error.message}</div>;
  }

  if (compact) {
    // Compact version - Simpler 2-column layout
    return (
      // Add a class for the 2-column layout
      <div className={`cis-downloader-compact cis-compact-2col ${className}`}> 
         {/* Stats Area (Column 1) */} 
         <div className="cis-compact-stats">
            <p className="stat-number"> 
               £{totalCis.toFixed(2)}
            </p>
            <p className="stat-detail"> 
               Total CIS Deducted ({recordCount} {recordCount === 1 ? 'record' : 'records'}) 
            </p>
         </div>

         {/* Controls Area (Column 2) */} 
         <div 
            className="cis-compact-controls" 
            style={{ marginTop: '-0.7rem' }} // Add negative top margin
         >
             {/* Select */} 
             <select
                 value={selectedTaxYear}
                 onChange={handleTaxYearChange}
                 className="tax-year-select"
                 style={{ /* Basic appearance */
                     width: '100%', 
                     padding: '0.25rem 0.5rem', 
                     border: '1px solid #ccc',
                     borderRadius: '4px',
                     fontSize: '0.9rem',
                     boxSizing: 'border-box',
                     marginBottom: '3rem' // Set space to 3rem
                 }} 
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

             {/* Button */} 
             <Button
                 variant="primary" 
                 size="sm" 
                 onClick={handleDownload}
                 disabled={recordCount === 0}
                 style={{ /* Basic appearance */
                     width: '100%', // Make button fill its column area
                     padding: '0.25rem 0.5rem', 
                     fontSize: '0.8rem',
                     boxSizing: 'border-box'
                 }} 
             >
                 Download
             </Button>
         </div>
      </div>
    );
  }

  // Full version with stats
  return (
    <div className={`cis-downloader ${className}`}>
      <div className="cis-downloader-header">
        <h3 className="cis-title">CIS Records Tracker</h3>
        <div className="tax-year-selector">
          <label htmlFor="cis-tax-year-select">Tax Year:</label>
          <select
            id="cis-tax-year-select"
            value={selectedTaxYear}
            onChange={handleTaxYearChange}
            className="tax-year-select"
            disabled={taxYears.length === 0} // Disable if no years found
          >
            {taxYears.length > 0 ? (
                taxYears.map(year => (
                    <option key={year} value={year}>{year}</option>
                ))
             ) : (
                <option value={selectedTaxYear}>{selectedTaxYear}</option> // Show current if empty
             )}
          </select>
        </div>
      </div>

      <div className="cis-stats">
        <div className="cis-stat">
          <span className="stat-label">Total CIS Deducted:</span>
          <span className="stat-value">£{totalCis.toFixed(2)}</span>
        </div>
        <div className="cis-stat">
          <span className="stat-label">Number of Records:</span>
          <span className="stat-value">{recordCount}</span>
        </div>
      </div>

      <div className="cis-actions">
        <Button
          variant="primary"
          onClick={handleDownload}
          disabled={recordCount === 0} // Disable download if no records for selected year
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5em' }}
        >
          <span className="btn-icon">📊</span>
          Download as CSV
        </Button>
      </div>
    </div>
  );
};

export default CisDownloader; 