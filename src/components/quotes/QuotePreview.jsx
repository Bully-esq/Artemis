import React from 'react';

/**
 * Quote preview component - Renders a formatted quote for review
 * 
 * @param {Object} props - Component props
 * @param {Object} props.quoteDetails - Quote details including client info and terms
 * @param {Object} props.quoteData - Calculated quote data with items and totals
 * @param {Object} props.settings - Application settings
 */
const QuotePreview = ({ 
  quoteDetails, 
  quoteData,
  settings
}) => {
  if (!quoteDetails || !quoteData) {
    // Use a CSS class for styling this message if preferred
    return <div style={{ padding: '1rem', textAlign: 'center', color: '#6b7280' }}>No quote data available</div>;
  }
  
  // Create reference number (ensure settings.quote exists or provide fallback)
  const safeSettings = settings || {};
  const companySettings = safeSettings.company || {};
  const quoteSettings = safeSettings.quote || {}; 
  const year = new Date().getFullYear();
  const referenceNum = `${quoteSettings.prefix || 'Q-'}${year}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
  
  // Format dates
  const formatDate = (dateString) => {
    if (!dateString) return 'TBD';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-GB');
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date';
    }
  };
  
  const quoteDate = formatDate(quoteDetails.date);
  const validUntil = formatDate(quoteDetails.validUntil);
  
  // Get payment terms text
  const getPaymentTermsText = () => {
    switch (quoteDetails.paymentTerms) {
      case '1':
        return '50% deposit required, remainder due on completion.';
      case '2':
        return '50% deposit required, 25% on completion of joinery, final 25% on completion.';
      case '4':
        return 'Full amount to be paid before delivery.';
      case '3':
        return quoteDetails.customTerms || 'Custom payment terms';
      default:
        return '50% deposit required, remainder due on completion.';
    }
  };
  
  // Use CSS classes from App.css instead of Tailwind
  return (
    // Use the appropriate container class for the quote preview
    <div className="quote-preview-container"> 
      {/* Header section */}
      <div className="quote-header"> 
        <div className="quote-branding"> 
          {/* Use the standard logo container and company logo classes */}
          {companySettings.logo && (
            <div className="logo-container"> {/* Standard class */}
              <img 
                src={companySettings.logo} 
                alt={`${companySettings.name || 'Company'} Logo`}
                className="company-logo" // Standard class, no inline styles
              />
            </div>
          )}
          <h1 className="quote-title">QUOTATION</h1> 
          <p className="quote-reference">Reference: {referenceNum}</p> 
        </div>
        
        <div className="quote-company-details"> 
          <p className="quote-company-name">{companySettings.name || 'Your Company'}</p> 
          <div className="quote-company-address"> 
            {companySettings.address || 'Company Address'}
          </div>
          <div className="quote-company-contact"> 
            {companySettings.email && <p>{companySettings.email}</p>}
            {companySettings.phone && <p>{companySettings.phone}</p>}
            {companySettings.website && <p>{companySettings.website}</p>}
          </div>
        </div>
      </div>
      
      {/* Client section - Replace Tailwind with traditional CSS classes */}
      <div className="quote-client-section"> {/* Example class */}
        <h2 className="section-header">Client:</h2> {/* Example class */}
        <p><span className="label">Name:</span> {quoteDetails.client.name || '[Contact Name]'}</p> {/* Example class */}
        {quoteDetails.client.company && (
          <p><span className="label">Company:</span> {quoteDetails.client.company}</p>
        )}
        <p><span className="label">Email:</span> {quoteDetails.client.email || '[Email]'}</p>
        <p><span className="label">Phone:</span> {quoteDetails.client.phone || '[Phone]'}</p>
        {quoteDetails.client.address && (
          <div className="address-block"> {/* Example class */}
            <p className="label">Address:</p>
            <div className="address-details">{quoteDetails.client.address}</div> {/* Example class */}
          </div>
        )}
      </div>
      
      {/* Date section - Replace Tailwind with traditional CSS classes */}
      <div className="quote-date-section"> {/* Example class */}
        <p><span className="label">Date:</span> {quoteDate}</p>
        <p><span className="label">Valid Until:</span> {validUntil}</p>
      </div>
      
      {/* Items table - Replace Tailwind with traditional CSS classes */}
      <table className="quote-items-table"> {/* Example class */}
        <thead>
          <tr>
            <th>Item Description</th>
            <th className="text-right">Qty</th> {/* Add text-right class if defined in App.css */}
            <th className="text-right">Unit Price</th>
            <th className="text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {quoteData.itemTotals.map((item, index) => (
            <tr key={index}>
              <td>{item.description || item.name}</td>
              <td className="text-right">{item.quantity}</td>
              <td className="text-right">£{item.unitPrice.toFixed(2)}</td>
              <td className="text-right">£{item.finalTotal.toFixed(2)}</td>
            </tr>
          ))}
          
          {/* Total row */}
          <tr className="total-row"> {/* Use existing class if suitable */}
            <td colSpan="3" className="text-right">Total</td>
            <td className="text-right">£{quoteData.grandTotal.toFixed(2)}</td>
          </tr>
        </tbody>
      </table>
      
      {/* Terms section - Replace Tailwind with traditional CSS classes */}
      <div className="quote-terms-section"> {/* Example class */}
        <h2 className="section-header">Terms and Conditions:</h2>
        
        <h3 className="sub-header">Payment Terms:</h3> {/* Example class */}
        <p>{getPaymentTermsText()}</p>
        <p>This quote is valid for the period specified above.</p>
        
        {/* Exclusions */}
        {quoteDetails.exclusions && quoteDetails.exclusions.length > 0 && (
          <>
            <h3 className="sub-header">Exclusions:</h3>
            <ul className="exclusions-list"> {/* Example class */}
              {quoteDetails.exclusions.map((exclusion, index) => (
                <li key={index}>{exclusion.replace(/^•\s*/, '')}</li>
              ))}
            </ul>
          </>
        )}
        
        {/* Drawing option */}
        {quoteDetails.includeDrawingOption && (
          <>
            <h3 className="sub-header">Drawings:</h3>
            <p>Drawings are available before accepting the quote at a cost of £150, which will be deducted from the project total if the order proceeds.</p>
          </>
        )}
        
        {/* Notes */}
        {quoteDetails.notes && (
          <>
            <h3 className="sub-header">Additional Notes:</h3>
            <p className="notes-content">{quoteDetails.notes}</p> {/* Use existing class if suitable */}
          </>
        )}
      </div>
    </div>
  );
};

export default QuotePreview;