import React from 'react';
import { formatDate } from '../../utils/formatters';

/**
 * Invoice preview component that renders a formatted invoice
 * 
 * @param {Object} props - Component props
 * @param {Object} props.invoice - Invoice data object
 * @param {Object} props.settings - Application settings
 * @param {boolean} props.printMode - Whether to optimize for printing/PDF export
 */
const InvoicePreview = ({ invoice, settings, printMode = false }) => {
  if (!invoice) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 rounded-md border border-gray-200">
        <p className="text-gray-500 italic">No invoice selected</p>
      </div>
    );
  }

  // Format dates
  const invoiceDate = invoice.invoiceDate 
    ? new Date(invoice.invoiceDate).toLocaleDateString('en-GB') 
    : 'Not set';
  const dueDate = invoice.dueDate 
    ? new Date(invoice.dueDate).toLocaleDateString('en-GB') 
    : 'Not set';
  const paidDate = invoice.paidAt 
    ? new Date(invoice.paidAt).toLocaleDateString('en-GB') 
    : null;

  // Determine invoice status for badge
  const getStatusBadge = () => {
    if (invoice.status === 'paid') {
      return (
        <div className="inline-flex items-center px-2.5 py-0.5 rounded-md text-sm font-medium bg-green-100 text-green-800">
          Paid
        </div>
      );
    }
    
    const today = new Date();
    const invoiceDueDate = new Date(invoice.dueDate);
    
    if (today > invoiceDueDate) {
      return (
        <div className="inline-flex items-center px-2.5 py-0.5 rounded-md text-sm font-medium bg-red-100 text-red-800">
          Overdue
        </div>
      );
    }
    
    return (
      <div className="inline-flex items-center px-2.5 py-0.5 rounded-md text-sm font-medium bg-blue-100 text-blue-800">
        Pending
      </div>
    );
  };

  // Determine if the invoice has CIS deductions
  const hasCisDeduction = invoice.items && invoice.items.some(item => item.type === 'cis');

  // Wrapper classes for print mode
  const containerClass = printMode 
    ? "p-8 bg-white" 
    : "p-8 bg-white rounded-lg shadow-md";

  return (
    <div className={containerClass} id="invoice-preview">
      {/* Header */}
      <div className="flex justify-between mb-8 pb-4 border-b border-gray-200">
        <div>
          {/* Logo */}
          {settings.company.logo && (
            <div className="mb-4">
              <img 
                src={settings.company.logo} 
                alt={`${settings.company.name} Logo`}
                className="max-h-16 w-auto"
              />
            </div>
          )}
          
          {/* Document title */}
          <h1 className="text-2xl font-bold text-gray-900 mb-1">INVOICE</h1>
          <p className="text-gray-600">
            Reference: {invoice.invoiceNumber || `INV-${invoice.id?.substring(0, 6)}`}
          </p>
          <div className="mt-2">
            {getStatusBadge()}
          </div>
        </div>
        
        {/* Company details */}
        <div className="text-right">
          <h3 className="text-lg font-semibold">{settings.company.name}</h3>
          <div className="text-sm text-gray-600 whitespace-pre-line">
            {settings.company.address}
          </div>
          <div className="text-sm text-gray-600 mt-2">
            <p>{settings.company.email}</p>
            <p>{settings.company.phone}</p>
            <p>{settings.company.website}</p>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        {/* Client information */}
        <div>
          <h3 className="text-lg font-semibold mb-2">Bill To:</h3>
          <div className="text-sm">
            <p className="font-medium">{invoice.clientName || '[Client Name]'}</p>
            {invoice.clientCompany && <p>{invoice.clientCompany}</p>}
            <p>{invoice.clientEmail || '[Email]'}</p>
            <p>{invoice.clientPhone || '[Phone]'}</p>
            <div className="whitespace-pre-line mt-1">
              {invoice.clientAddress || '[Address]'}
            </div>
          </div>
        </div>
        
        {/* Invoice details */}
        <div className="text-sm">
          <div className="grid grid-cols-2 gap-2">
            <p className="font-medium">Invoice Date:</p>
            <p>{invoiceDate}</p>
            
            <p className="font-medium">Due Date:</p>
            <p>{dueDate}</p>
            
            {paidDate && (
              <>
                <p className="font-medium">Paid Date:</p>
                <p>{paidDate}</p>
              </>
            )}
          </div>
        </div>
      </div>
      
      {/* Invoice items */}
      <div className="mb-8">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th className="px-4 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Description
              </th>
              <th className="px-4 py-3 bg-gray-50 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Amount
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {/* If there are itemized invoice items */}
            {invoice.items && invoice.items.length > 0 ? (
              <>
                {/* Display all non-CIS items first */}
                {invoice.items
                  .filter(item => item.type !== 'cis')
                  .map((item, index) => {
                    const amount = parseFloat(item.amount) || 0;
                    
                    // Determine if this is a labor item (for styling)
                    const isLabourItem = item.isLabour || item.category === 'labour';
                    
                    return (
                      <tr 
                        key={item.id || index}
                        className={isLabourItem ? 'bg-gray-50' : ''}
                      >
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {item.description || item.name || 'Item'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-right">
                          £{Math.abs(amount).toFixed(2)}
                        </td>
                      </tr>
                    );
                  })
                }
                
                {/* If we have CIS deductions, show a subtotal */}
                {hasCisDeduction && (
                  <tr className="bg-gray-50 font-medium">
                    <td className="px-4 py-3 text-sm text-gray-900 text-right">
                      Subtotal
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right">
                      £{invoice.items
                        .filter(item => item.type !== 'cis')
                        .reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0)
                        .toFixed(2)
                      }
                    </td>
                  </tr>
                )}
                
                {/* Now add CIS deduction items */}
                {invoice.items
                  .filter(item => item.type === 'cis')
                  .map((item, index) => {
                    const amount = parseFloat(item.amount) || 0;
                    
                    return (
                      <tr 
                        key={`cis-${item.id || index}`}
                        className="bg-red-50 text-red-800 italic"
                      >
                        <td className="px-4 py-3 text-sm">
                          {item.description || 'CIS Deduction'}
                        </td>
                        <td className="px-4 py-3 text-sm text-right">
                          -£{Math.abs(amount).toFixed(2)}
                        </td>
                      </tr>
                    );
                  })
                }
              </>
            ) : (
              // Simple single line item if no itemized data
              <tr>
                <td className="px-4 py-3 text-sm text-gray-900">
                  {invoice.description || 'Invoice payment'}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 text-right">
                  £{invoice.amount.toFixed(2)}
                </td>
              </tr>
            )}
            
            {/* Total row */}
            <tr className="bg-gray-50 font-bold">
              <td className="px-4 py-3 text-right text-gray-900">
                Total
              </td>
              <td className="px-4 py-3 text-right text-gray-900">
                £{invoice.amount.toFixed(2)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      
      {/* Payment instructions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <div>
          <h3 className="text-lg font-semibold mb-2">Payment Instructions:</h3>
          <div className="text-sm space-y-1">
            <p><span className="font-medium">Bank:</span> {settings.bank?.name || 'Not specified'}</p>
            <p><span className="font-medium">Account Name:</span> {settings.bank?.accountName || 'Not specified'}</p>
            <p><span className="font-medium">Account Number:</span> {settings.bank?.accountNumber || 'Not specified'}</p>
            <p><span className="font-medium">Sort Code:</span> {settings.bank?.sortCode || 'Not specified'}</p>
            
            {/* Show IBAN and BIC if available */}
            {settings.bank?.iban && (
              <p><span className="font-medium">IBAN:</span> {settings.bank.iban}</p>
            )}
            {settings.bank?.bic && (
              <p><span className="font-medium">BIC/SWIFT:</span> {settings.bank.bic}</p>
            )}
            
            {/* Payment reference */}
            {settings.bank?.paymentReference && (
              <p>
                <span className="font-medium">Payment Reference:</span>{' '}
                {settings.bank.paymentReference.replace(
                  '[Invoice Number]',
                  invoice.invoiceNumber || `INV-${invoice.id?.substring(0, 6)}`
                )}
              </p>
            )}
          </div>
        </div>
        
        {/* CIS Information */}
        {hasCisDeduction && (
          <div>
            <h3 className="text-lg font-semibold mb-2">CIS Information:</h3>
            <div className="text-sm">
              <p>
                This invoice includes a Construction Industry Scheme (CIS) deduction
                as required by HMRC.
              </p>
              
              {/* Get CIS details from first CIS item or settings */}
              {(() => {
                const cisItem = invoice.items?.find(item => item.type === 'cis');
                const cisDetails = cisItem?.cisDetails || settings.cis;
                const cisRate = cisItem?.cisRate || 20;
                
                return (
                  <div className="mt-2 p-3 bg-gray-50 rounded">
                    <p className="font-medium">CIS Details:</p>
                    {cisDetails?.companyName && (
                      <p><span className="font-medium">Company:</span> {cisDetails.companyName}</p>
                    )}
                    {cisDetails?.utr && (
                      <p><span className="font-medium">UTR Number:</span> {cisDetails.utr}</p>
                    )}
                    {cisDetails?.niNumber && (
                      <p><span className="font-medium">NI Number:</span> {cisDetails.niNumber}</p>
                    )}
                    <p><span className="font-medium">CIS Rate:</span> {cisRate}%</p>
                  </div>
                );
              })()}
            </div>
          </div>
        )}
      </div>
      
      {/* Additional notes */}
      {invoice.notes && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-2">Notes:</h3>
          <div className="text-sm whitespace-pre-line p-4 bg-gray-50 rounded">
            {invoice.notes}
          </div>
        </div>
      )}
      
      {/* Footer */}
      {settings.invoice?.footer && (
        <div className="text-sm text-gray-600 mt-12 pt-4 border-t border-gray-200">
          {settings.invoice.footer}
        </div>
      )}
    </div>
  );
};

export default InvoicePreview;