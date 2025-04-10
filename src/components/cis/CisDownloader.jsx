import React, { useState, useEffect } from 'react';
import { 
  getCurrentTaxYear, 
  getCisRecordsByTaxYear,
  getTotalCisForTaxYear,
  getAllCisRecordsByTaxYear,
  downloadCisRecords 
} from '../../services/cisTracker';
import Button from '../common/Button';

const CisDownloader = ({ className = '', compact = false }) => {
  const [selectedTaxYear, setSelectedTaxYear] = useState(getCurrentTaxYear());
  const [taxYears, setTaxYears] = useState([]);
  const [totalCis, setTotalCis] = useState(0);
  const [recordCount, setRecordCount] = useState(0);
  
  // Load available tax years and stats on mount
  useEffect(() => {
    const records = getAllCisRecordsByTaxYear();
    const years = Object.keys(records).sort().reverse();
    setTaxYears(years.length ? years : [getCurrentTaxYear()]);
    
    // Get stats for selected year
    updateYearStats(selectedTaxYear);
  }, [selectedTaxYear]);
  
  // Update statistics when tax year changes
  const updateYearStats = (taxYear) => {
    const records = getCisRecordsByTaxYear(taxYear);
    setRecordCount(records.length);
    setTotalCis(getTotalCisForTaxYear(taxYear));
  };
  
  // Handle tax year change
  const handleTaxYearChange = (e) => {
    const year = e.target.value;
    setSelectedTaxYear(year);
    updateYearStats(year);
  };
  
  // Handle download
  const handleDownload = () => {
    downloadCisRecords(selectedTaxYear);
  };
  
  if (compact) {
    // Compact version - just a button with dropdown
    return (
      <div className={`cis-downloader-compact ${className}`}>
        <div className="dropdown-wrapper">
          <select 
            value={selectedTaxYear} 
            onChange={handleTaxYearChange}
            className="tax-year-select"
          >
            {taxYears.map(year => (
              <option key={year} value={year}>{year} Tax Year</option>
            ))}
          </select>
        </div>
        
        <Button
          variant="primary"
          onClick={handleDownload}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5em' }}
        >
          <span className="btn-icon">📊</span>
          Download CIS Records
        </Button>
      </div>
    );
  }
  
  // Full version with stats
  return (
    <div className={`cis-downloader ${className}`}>
      <div className="cis-downloader-header">
        <h3 className="cis-title">CIS Records Tracker</h3>
        <div className="tax-year-selector">
          <label>Tax Year:</label>
          <select 
            value={selectedTaxYear} 
            onChange={handleTaxYearChange}
            className="tax-year-select"
          >
            {taxYears.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
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
          disabled={recordCount === 0}
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