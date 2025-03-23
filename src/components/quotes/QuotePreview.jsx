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
    return <div className="p-4 text-center text-gray-500">No quote data available</div>;
  }
  
  // Create reference number
  const year = new Date().getFullYear();
  const referenceNum = `${settings.quote.prefix || 'Q-'}${year}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
  
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
  
  return (
    <div className="border border-gray-200 rounded-lg bg-white p-8 shadow-sm print:shadow-none">
      {/* Header with logo and company details */}
      <div className="flex justify-between mb-8 border-b border-gray-200 pb-6">
        <div className="flex flex-col">
          {settings.company.logo && (
            <div className="mb-2">
              <img 
                src={settings.company.logo} 
                alt={`${settings.company.name} Logo`}
                className="max-h-20 max-w-[200px] object-contain"
              />
            </div>
          )}
          <h1 className="text-2xl font-bold text-gray-900">QUOTATION</h1>
          <p className="text-gray-600">Reference: {referenceNum}</p>
        </div>
        
        <div className="text-right">
          <p className="font-semibold text-gray-900">{settings.company.name}</p>
          <div className="text-gray-600 whitespace-pre-line">
            {settings.company.address}
          </div>
          <p className="text-gray-600">{settings.company.email}</p>
          <p className="text-gray-600">{settings.company.phone}</p>
          <p className="text-gray-600">{settings.company.website}</p>
        </div>
      </div>
      
      {/* Client section */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Client:</h2>
        <p><span className="font-medium">Name:</span> {quoteDetails.client.name || '[Contact Name]'}</p>
        {quoteDetails.client.company && (
          <p><span className="font-medium">Company:</span> {quoteDetails.client.company}</p>
        )}
        <p><span className="font-medium">Email:</span> {quoteDetails.client.email || '[Email]'}</p>
        <p><span className="font-medium">Phone:</span> {quoteDetails.client.phone || '[Phone]'}</p>
        {quoteDetails.client.address && (
          <>
            <p className="font-medium">Address:</p>
            <p className="ml-4 whitespace-pre-line">{quoteDetails.client.address}</p>
          </>
        )}
      </div>
      
      {/* Date section */}
      <div className="mb-6">
        <p><span className="font-medium">Date:</span> {quoteDate}</p>
        <p><span className="font-medium">Valid Until:</span> {validUntil}</p>
      </div>
      
      {/* Items table */}
      <table className="w-full border-collapse mb-6">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-gray-300 px-4 py-2 text-left">Item Description</th>
            <th className="border border-gray-300 px-4 py-2 text-right">Qty</th>
            <th className="border border-gray-300 px-4 py-2 text-right">Unit Price</th>
            <th className="border border-gray-300 px-4 py-2 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {quoteData.itemTotals.map((item, index) => (
            <tr key={index} className="border-b border-gray-200">
              <td className="border border-gray-300 px-4 py-2">
                {item.description || item.name}
              </td>
              <td className="border border-gray-300 px-4 py-2 text-right">
                {item.quantity}
              </td>
              <td className="border border-gray-300 px-4 py-2 text-right">
                £{item.unitPrice.toFixed(2)}
              </td>
              <td className="border border-gray-300 px-4 py-2 text-right">
                £{item.finalTotal.toFixed(2)}
              </td>
            </tr>
          ))}
          
          {/* Total row */}
          <tr className="bg-gray-100 font-semibold">
            <td colSpan="3" className="border border-gray-300 px-4 py-2 text-right">
              Total
            </td>
            <td className="border border-gray-300 px-4 py-2 text-right">
              £{quoteData.grandTotal.toFixed(2)}
            </td>
          </tr>
        </tbody>
      </table>
      
      {/* Terms section */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Terms and Conditions:</h2>
        
        <h3 className="font-semibold text-gray-800 mt-4">Payment Terms:</h3>
        <p>{getPaymentTermsText()}</p>
        <p>This quote is valid for the period specified above.</p>
        
        {/* Exclusions */}
        {quoteDetails.exclusions && quoteDetails.exclusions.length > 0 && (
          <>
            <h3 className="font-semibold text-gray-800 mt-4">Exclusions:</h3>
            <ul className="list-disc pl-5">
              {quoteDetails.exclusions.map((exclusion, index) => (
                <li key={index}>{exclusion.replace(/^•\s*/, '')}</li>
              ))}
            </ul>
          </>
        )}
        
        {/* Drawing option */}
        {quoteDetails.includeDrawingOption && (
          <>
            <h3 className="font-semibold text-gray-800 mt-4">Drawings:</h3>
            <p>Drawings are available before accepting the quote at a cost of £150, which will be deducted from the project total if the order proceeds.</p>
          </>
        )}
        
        {/* Notes */}
        {quoteDetails.notes && (
          <>
            <h3 className="font-semibold text-gray-800 mt-4">Additional Notes:</h3>
            <p className="whitespace-pre-line">{quoteDetails.notes}</p>
          </>
        )}
      </div>
    </div>
  );
};

export default QuotePreview;