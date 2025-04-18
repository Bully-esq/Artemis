import React from 'react';

/**
 * Quote preview component - Renders a formatted quote for review
 * 
 * @param {Object} props - Component props
 * @param {Object} props.quoteDetails - Quote details including client info and terms
 * @param {Object} props.quoteData - Calculated quote data with items and totals
 * @param {Object} props.settings - Application settings
 * @param {Function} props.formatCurrency - Currency formatting function
 */
const QuotePreview = ({ 
  quoteDetails, 
  quoteData,
  settings,
  formatCurrency
}) => {
  if (!quoteDetails || !quoteData) {
    return (
      <div className="p-6 text-center text-gray-500 bg-gray-50 border border-gray-200 rounded-md">
        No quote data available to generate preview.
      </div>
    );
  }
  
  // Create reference number (ensure settings.quote exists or provide fallback)
  const safeSettings = settings || {};
  const companySettings = safeSettings.company || {};
  const quoteSettings = safeSettings.quote || {}; 
  const vatSettings = safeSettings.vat || { enabled: false, rate: 20, number: '' };
  const year = new Date().getFullYear();
  const referenceNum = quoteDetails.id ? 
    `${quoteSettings.prefix || 'Q-'}${quoteDetails.id}` : 
    `${quoteSettings.prefix || 'Q-'}${year}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')} (Unsaved)`;
  
  // Format dates
  const formatDate = (dateString) => {
    if (!dateString) return 'TBD';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid date'; 
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
      case '1': return 'On Completion';
      case '2': return 'Net 7 Days';
      case '3': return 'Net 14 Days';
      case '4': return 'Net 30 Days';
      case '5': return '50% Deposit, 50% Completion';
      case 'custom': return quoteDetails.customTerms || 'Custom Terms Specified';
      default: return quoteDetails.paymentTerms || 'As specified'; // Fallback for older or unexpected values
    }
  };
  
  // Main container with padding and border for visual separation
  return (
    <div className="p-6 md:p-8 lg:p-10 bg-white border border-gray-200 rounded-lg shadow-sm max-w-4xl mx-auto my-6 pdf-content-area">
      {/* Header section: Logo/Title on Left, Company Details on Right */}
      <div className="flex flex-col sm:flex-row justify-between items-start pb-6 mb-6 border-b border-gray-200">
        {/* Branding: Logo and Title */}
        <div className="mb-4 sm:mb-0">
          {companySettings.logo ? (
            <div className="mb-3 max-w-[200px] max-h-[80px]"> {/* Constrain logo size */}
              <img 
                src={companySettings.logo} 
                alt={`${companySettings.name || 'Company'} Logo`}
                className="max-w-full max-h-full object-contain"
              />
            </div>
          ) : (
            <div className="h-10 w-32 bg-gray-200 flex items-center justify-center text-gray-500 text-xs mb-3 rounded">
              No Logo
            </div>
          )}
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight uppercase">Quotation</h1>
          <p className="text-sm text-gray-500 mt-1">Ref: {referenceNum}</p>
        </div>
        
        {/* Company Details */}
        <div className="text-xs text-gray-600 sm:text-right space-y-0.5">
          <p className="font-semibold text-sm text-gray-800">{companySettings.name || '[Your Company Name]'}</p>
          {companySettings.address && <p>{companySettings.address}</p>}
          {companySettings.phone && <p>Tel: {companySettings.phone}</p>}
          {companySettings.email && <p>Email: {companySettings.email}</p>}
          {companySettings.website && <p>Web: {companySettings.website}</p>}
          {vatSettings.enabled && vatSettings.number && <p>VAT No: {vatSettings.number}</p>}
        </div>
      </div>
      
      {/* Client & Dates Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
        {/* Client Details */}
        <div className="text-sm">
          <h2 className="font-semibold text-gray-700 mb-1">Client:</h2>
          <p className="font-medium text-gray-900">{quoteDetails.clientName || '[Client Name]'}</p>
          {quoteDetails.clientCompany && <p className="text-gray-700">{quoteDetails.clientCompany}</p>}
          {quoteDetails.clientAddress && <p className="text-gray-600 mt-1 whitespace-pre-line">{quoteDetails.clientAddress}</p>}
          {quoteDetails.clientEmail && <p className="text-gray-600 mt-1">{quoteDetails.clientEmail}</p>}
          {quoteDetails.clientPhone && <p className="text-gray-600">{quoteDetails.clientPhone}</p>}
        </div>
        
        {/* Dates */}
        <div className="text-sm sm:text-right">
          <p><span className="font-semibold text-gray-700">Date Issued:</span> {quoteDate}</p>
          <p><span className="font-semibold text-gray-700">Valid Until:</span> {validUntil}</p>
        </div>
      </div>
      
      {/* Items Table */}
      <div className="overflow-x-auto mb-8">
        <table className="min-w-full divide-y divide-gray-200 border border-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Description</th>
              <th scope="col" className="px-4 py-2 text-right font-medium text-gray-500 uppercase tracking-wider">Qty</th>
              <th scope="col" className="px-4 py-2 text-right font-medium text-gray-500 uppercase tracking-wider">Unit Price</th>
              <th scope="col" className="px-4 py-2 text-right font-medium text-gray-500 uppercase tracking-wider">Amount</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {(quoteData.itemTotals || []).length === 0 ? (
              <tr>
                <td colSpan="4" className="px-4 py-10 text-center text-gray-500">
                  No items listed in this quote.
                </td>
              </tr>
            ) : (
              quoteData.itemTotals.map((item, index) => (
                <tr key={item.id || index} className={item.hideInQuote ? 'bg-gray-50 opacity-75 italic' : ''}> {/* Indicate hidden items */}
                  <td className="px-4 py-2 align-top whitespace-pre-wrap">
                     <span className="font-medium text-gray-800">{item.name}</span>
                     {item.description && <p className="text-xs text-gray-600 mt-0.5">{item.description}</p>}
                     {item.hideInQuote && <span className="text-xs text-red-600 ml-1">(Hidden)</span>} 
                  </td>
                  <td className="px-4 py-2 align-top text-right text-gray-700">{item.quantity}</td>
                  <td className="px-4 py-2 align-top text-right text-gray-700">{formatCurrency(item.unitPrice)}</td>
                  <td className="px-4 py-2 align-top text-right text-gray-700 font-medium">{formatCurrency(item.finalTotal)}</td>
                </tr>
              ))
            )}
            
            {/* Subtotal, VAT, Total Rows */} 
            {quoteData.vatEnabled && (
              <tr className="bg-gray-50">
                <td colSpan="3" className="px-4 py-2 text-right font-medium text-gray-600">Subtotal</td>
                <td className="px-4 py-2 text-right font-medium text-gray-800">{formatCurrency(quoteData.visibleTotal)}</td>
              </tr>
            )}
            {quoteData.vatEnabled && (
              <tr className="bg-gray-50">
                <td colSpan="3" className="px-4 py-2 text-right font-medium text-gray-600">VAT ({quoteData.vatRate}%)</td>
                <td className="px-4 py-2 text-right font-medium text-gray-800">{formatCurrency(quoteData.vatAmount)}</td>
              </tr>
            )}
            <tr className="bg-gray-100">
              <td colSpan="3" className="px-4 py-2 text-right text-base font-semibold text-gray-700 uppercase">Total</td>
              <td className="px-4 py-2 text-right text-base font-bold text-indigo-700">{formatCurrency(quoteData.grandTotal)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      
      {/* Terms & Exclusions Section */}
      <div className="text-xs text-gray-600 space-y-4">
        <div>
          <h3 className="font-semibold text-sm text-gray-700 mb-1">Payment Terms:</h3>
          <p>{getPaymentTermsText()}</p>
          <p>This quote is valid until {validUntil}.</p>
        </div>
        
        {/* Exclusions */}
        {quoteDetails.exclusions && quoteDetails.exclusions.length > 0 && (
          <div>
            <h3 className="font-semibold text-sm text-gray-700 mb-1">Exclusions:</h3>
            <ul className="list-disc list-inside space-y-0.5 pl-2">
              {quoteDetails.exclusions.map((exclusion, index) => (
                <li key={index}>{exclusion.replace(/^•\s*/, '')}</li>
              ))}
            </ul>
          </div>
        )}
        
        {/* Drawing Option */}
        {quoteDetails.includeDrawingOption && (
           <div>
             <h3 className="font-semibold text-sm text-gray-700 mb-1">Optional Drawings:</h3>
             <p>Drawings/plans can be provided prior to order confirmation for an additional fee (deducted from the final project cost if the order proceeds).</p>
           </div>
         )}
      </div>
      
      {/* Footer - Optional, may duplicate header info */}
      <div className="mt-8 pt-4 border-t border-gray-200 text-center text-xs text-gray-500">
        <p>{companySettings.name || '[Your Company Name]'}</p>
        {/* Add other footer info if needed, like registration number */} 
      </div>
    </div>
  );
};

export default QuotePreview;