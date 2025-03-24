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
      <div className="empty-state">
        <p className="empty-message">No invoice selected</p>
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
      return <div className="status-badge status-badge-success">Paid</div>;
    }
    
    const today = new Date();
    const invoiceDueDate = new Date(invoice.dueDate);
    
    if (today > invoiceDueDate) {
      return <div className="status-badge status-badge-danger">Overdue</div>;
    }
    
    return <div className="status-badge status-badge-info">Pending</div>;
  };

  // Determine if the invoice has CIS deductions
  const hasCisDeduction = invoice.items && invoice.items.some(item => item.type === 'cis');

  // Wrapper classes for print mode
  const containerClass = printMode ? "invoice-preview print-mode" : "invoice-preview";

  return (
    <div className={containerClass} id="invoice-preview">
      {/* Header */}
      <div className="invoice-header">
        <div className="invoice-branding">
          {/* Logo */}
          {settings.company.logo && (
            <div className="logo-container">
              <img 
                src={settings.company.logo} 
                alt={`${settings.company.name} Logo`}
                className="company-logo"
              />
            </div>
          )}
          
          {/* Document title */}
          <h1 className="invoice-title">INVOICE</h1>
          <p className="invoice-reference">
            Reference: {invoice.invoiceNumber || `INV-${invoice.id?.substring(0, 6)}`}
          </p>
          <div className="status-container">
            {getStatusBadge()}
          </div>
        </div>
        
        {/* Company details */}
        <div className="company-details">
          <h3 className="company-name">{settings.company.name}</h3>
          <div className="company-address">
            {settings.company.address}
          </div>
          <div className="company-contact">
            <p>{settings.company.email}</p>
            <p>{settings.company.phone}</p>
            <p>{settings.company.website}</p>
          </div>
        </div>
      </div>
      
      <div className="invoice-info-grid">
        {/* Client information */}
        <div className="client-info">
          <h3 className="section-header">Bill To:</h3>
          <div className="client-details">
            <p className="client-name">{invoice.clientName || '[Client Name]'}</p>
            {invoice.clientCompany && <p>{invoice.clientCompany}</p>}
            <p>{invoice.clientEmail || '[Email]'}</p>
            <p>{invoice.clientPhone || '[Phone]'}</p>
            <div className="client-address">
              {invoice.clientAddress || '[Address]'}
            </div>
          </div>
        </div>
        
        {/* Invoice details */}
        <div className="invoice-details">
          <div className="details-grid">
            <p className="detail-label">Invoice Date:</p>
            <p className="detail-value">{invoiceDate}</p>
            
            <p className="detail-label">Due Date:</p>
            <p className="detail-value">{dueDate}</p>
            
            {paidDate && (
              <>
                <p className="detail-label">Paid Date:</p>
                <p className="detail-value">{paidDate}</p>
              </>
            )}
          </div>
        </div>
      </div>
      
      {/* Invoice items */}
      <div className="invoice-items">
        <table className="table">
          <thead>
            <tr>
              <th className="description-column">Description</th>
              <th className="amount-column">Amount</th>
            </tr>
          </thead>
          <tbody>
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
                        className={isLabourItem ? 'labour-row' : ''}
                      >
                        <td className="description-cell">
                          {item.description || item.name || 'Item'}
                        </td>
                        <td className="amount-cell text-right">
                          £{Math.abs(amount).toFixed(2)}
                        </td>
                      </tr>
                    );
                  })
                }
                
                {/* If we have CIS deductions, show a subtotal */}
                {hasCisDeduction && (
                  <tr className="subtotal-row">
                    <td className="text-right">Subtotal</td>
                    <td className="text-right">
                      £{invoice.items
                        .filter(item => item.type !== 'cis')
                        .reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0)
                        .toFixed(2)}
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
                        className="cis-deduction-row"
                      >
                        <td className="description-cell">
                          {item.description || 'CIS Deduction'}
                        </td>
                        <td className="amount-cell text-right">
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
                <td className="description-cell">
                  {invoice.description || 'Invoice payment'}
                </td>
                <td className="amount-cell text-right">
                  £{invoice.amount.toFixed(2)}
                </td>
              </tr>
            )}
            
            {/* Total row */}
            <tr className="total-row">
              <td className="total-label">Total</td>
              <td className="total-value">
                £{invoice.amount.toFixed(2)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      
      {/* Payment instructions and CIS information */}
      <div className="invoice-info-grid">
        <div className="payment-info">
          <h3 className="section-header">Payment Instructions:</h3>
          <div className="payment-details">
            <p><span className="detail-label">Bank:</span> {settings.bank?.name || 'Not specified'}</p>
            <p><span className="detail-label">Account Name:</span> {settings.bank?.accountName || 'Not specified'}</p>
            <p><span className="detail-label">Account Number:</span> {settings.bank?.accountNumber || 'Not specified'}</p>
            <p><span className="detail-label">Sort Code:</span> {settings.bank?.sortCode || 'Not specified'}</p>
            
            {/* Show IBAN and BIC if available */}
            {settings.bank?.iban && (
              <p><span className="detail-label">IBAN:</span> {settings.bank.iban}</p>
            )}
            {settings.bank?.bic && (
              <p><span className="detail-label">BIC/SWIFT:</span> {settings.bank.bic}</p>
            )}
            
            {/* Payment reference */}
            {settings.bank?.paymentReference && (
              <p>
                <span className="detail-label">Payment Reference:</span>{' '}
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
          <div className="cis-info">
            <h3 className="section-header">CIS Information:</h3>
            <div className="cis-details">
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
                  <div className="cis-details-box">
                    <p className="font-medium">CIS Details:</p>
                    {cisDetails?.companyName && (
                      <p><span className="detail-label">Company:</span> {cisDetails.companyName}</p>
                    )}
                    {cisDetails?.utr && (
                      <p><span className="detail-label">UTR Number:</span> {cisDetails.utr}</p>
                    )}
                    {cisDetails?.niNumber && (
                      <p><span className="detail-label">NI Number:</span> {cisDetails.niNumber}</p>
                    )}
                    <p><span className="detail-label">CIS Rate:</span> {cisRate}%</p>
                  </div>
                );
              })()}
            </div>
          </div>
        )}
      </div>
      
      {/* Additional notes */}
      {invoice.notes && (
        <div className="invoice-notes">
          <h3 className="section-header">Notes:</h3>
          <div className="notes-content">
            {invoice.notes}
          </div>
        </div>
      )}
      
      {/* Footer */}
      {settings.invoice?.footer && (
        <div className="invoice-footer">
          {settings.invoice.footer}
        </div>
      )}
    </div>
  );
};

export default InvoicePreview;