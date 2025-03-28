import React from 'react';
import { formatCurrency, formatDate } from '../../utils/formatters';

/**
 * Invoice preview component that renders a formatted invoice
 * 
 * @param {Object} props - Component props
 * @param {Object} props.invoice - Invoice data object
 * @param {Object} props.settings - Application settings
 * @param {boolean} props.printMode - Whether to optimize for printing/PDF export
 */
const InvoicePreview = ({ invoice, settings = {}, printMode = false }) => {
  if (!invoice) {
    return (
      <div className="empty-state">
        <p className="empty-message">No invoice selected</p>
      </div>
    );
  }

  // Ensure we have settings objects to prevent null reference errors
  const safeSettings = settings || {};
  const companySettings = safeSettings.company || {};
  const invoiceSettings = safeSettings.invoice || {};
  const cisSettings = safeSettings.cis || {};

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

  // Check if the invoice has line items
  const hasLineItems = invoice.lineItems && invoice.lineItems.length > 0;
  
  // Determine if the invoice has CIS deductions
  const hasCisDeduction = invoice.cisApplied || 
    (hasLineItems && invoice.lineItems.some(item => item.type === 'cis'));

  // Wrapper classes for print mode
  const containerClass = printMode ? "invoice-preview print-mode" : "invoice-preview";

  return (
    <div className={containerClass} id="invoice-preview">
      {/* Header */}
      <div className="invoice-header">
        <div className="invoice-branding">
          {/* Logo */}
          {companySettings.logo && (
            <div className="logo-container">
              <img 
                src={companySettings.logo} 
                alt={`${companySettings.name || 'Company'} Logo`}
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
          <h3 className="company-name">{companySettings.name || 'Your Company'}</h3>
          <div className="company-address">
            {companySettings.address || 'Company Address'}
          </div>
          <div className="company-contact">
            {companySettings.email && <p>{companySettings.email}</p>}
            {companySettings.phone && <p>{companySettings.phone}</p>}
            {companySettings.website && <p>{companySettings.website}</p>}
          </div>
        </div>
      </div>
      
      <div className="invoice-info-grid">
        {/* Client information */}
        <div className="client-info" style={{ textAlign: 'left !important', width: '100%' }}>
          <h3 className="section-header" style={{ textAlign: 'left !important' }}>Bill To:</h3>
          <div className="client-details" style={{ textAlign: 'left !important', display: 'block', width: '100%' }}>
            <p className="client-name" style={{ textAlign: 'left !important' }}>
              {invoice.clientName || '[Client Name]'}
            </p>
            
            {invoice.clientCompany && (
              <p className="client-company" style={{ textAlign: 'left !important' }}>
                {invoice.clientCompany}
              </p>
            )}
            
            {invoice.clientAddress && (
              <div 
                className="client-address" 
                style={{
                  textAlign: 'left !important',
                  marginBottom: '8px',
                  lineHeight: '1.2',
                  display: 'block',
                  width: '100%',
                  float: 'left'
                }}
              >
                {invoice.clientAddress.split('\n').map((line, i) => (
                  <span 
                    key={i} 
                    style={{
                      display: 'block',
                      marginBottom: '2px',
                      padding: 0,
                      textAlign: 'left !important',
                      width: '100%'
                    }}
                  >
                    {line}
                  </span>
                ))}
              </div>
            )}
            
            <div className="client-contact-info" style={{ textAlign: 'left !important' }}>
              {invoice.clientEmail && (
                <p className="client-email" style={{ textAlign: 'left !important' }}>
                  Email: {invoice.clientEmail}
                </p>
              )}
              {invoice.clientPhone && (
                <p className="client-phone" style={{ textAlign: 'left !important' }}>
                  Phone: {invoice.clientPhone}
                </p>
              )}
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
              <th className="quantity-column">Qty</th>
              <th className="amount-column">Amount</th>
            </tr>
          </thead>
          <tbody>
            {/* If there are itemized invoice items */}
            {hasLineItems ? (
              <>
                {/* Display all non-CIS items first */}
                {invoice.lineItems
                  .filter(item => item.type !== 'cis')
                  .map((item, index) => {
                    const amount = parseFloat(item.amount) || 0;
                    const quantity = parseFloat(item.quantity) || 1;
                    
                    // More thorough check for labor items
                    const isLabourItem = item.isLabour || 
                      item.category === 'labour' ||
                      (item.description && (
                        item.description.toLowerCase().includes('labour') || 
                        item.description.toLowerCase().includes('labor')
                      ));
                    
                    return (
                      <tr 
                        key={item.id || `item-${index}`}
                        className={isLabourItem ? 'labour-row' : ''}
                      >
                        <td className="description-cell">
                          {item.description || 'Item'}
                          {isLabourItem && invoice.cisApplied && ' (CIS Applicable)'}
                        </td>
                        <td className="quantity-cell text-center">
                          {quantity}
                        </td>
                        <td className="amount-cell text-right">
                          £{Math.abs(amount).toFixed(2)}
                        </td>
                      </tr>
                    );
                  })
                }
                
                {/* If we have CIS deductions, show a subtotal of all non-CIS items */}
                {hasCisDeduction && (
                  <tr className="subtotal-row">
                    <td className="text-right" colSpan="2">Subtotal</td>
                    <td className="text-right">
                      £{invoice.lineItems
                        .filter(item => item.type !== 'cis')
                        .reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0)
                        .toFixed(2)}
                    </td>
                  </tr>
                )}
                
                {/* Now add CIS deduction items with clear styling */}
                {hasCisDeduction && invoice.lineItems
                  .filter(item => item.type === 'cis')
                  .map((item, index) => {
                    const amount = parseFloat(item.amount) || 0;
                    
                    return (
                      <tr 
                        key={item.id || `cis-${index}`}
                        className="cis-deduction-row"
                      >
                        <td className="description-cell">
                          {item.description || 'CIS Deduction (20%)'}
                        </td>
                        <td className="quantity-cell text-center">1</td>
                        <td className="amount-cell text-right text-danger">
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
                <td className="quantity-cell text-center">1</td>
                <td className="amount-cell text-right">
                  £{(invoice.amount || 0).toFixed(2)}
                </td>
              </tr>
            )}
            
            {/* Total row */}
            <tr className="total-row">
              <td className="total-label" colSpan="2">Total</td>
              <td className="total-value">
                £{(invoice.amount || 0).toFixed(2)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      
      {/* After the items table and totals, add bank details */}
      <div className="invoice-bank-details">
        <h3 className="bank-details-title">Bank Details</h3>
        <div className="bank-details-grid">
          {settings.bank?.name && (
            <div className="bank-detail">
              <span className="label">Bank:</span>
              <span className="value">{settings.bank.name}</span>
            </div>
          )}
          {settings.bank?.accountName && (
            <div className="bank-detail">
              <span className="label">Account Name:</span>
              <span className="value">{settings.bank.accountName}</span>
            </div>
          )}
          {settings.bank?.accountNumber && (
            <div className="bank-detail">
              <span className="label">Account Number:</span>
              <span className="value">{settings.bank.accountNumber}</span>
            </div>
          )}
          {settings.bank?.sortCode && (
            <div className="bank-detail">
              <span className="label">Sort Code:</span>
              <span className="value">{settings.bank.sortCode}</span>
            </div>
          )}
          {settings.bank?.iban && (
            <div className="bank-detail">
              <span className="label">IBAN:</span>
              <span className="value">{settings.bank.iban}</span>
            </div>
          )}
          {settings.bank?.bic && (
            <div className="bank-detail">
              <span className="label">BIC/SWIFT:</span>
              <span className="value">{settings.bank.bic}</span>
            </div>
          )}
        </div>
      </div>

      {/* CIS Information with more detailed explanation */}
      {invoice.cisApplied && (
        <div className="cis-information">
          <h3 className="section-header">Construction Industry Scheme (CIS) Information</h3>
          <div className="cis-grid">
            <div className="cis-field">
              <span className="cis-label">Name:</span>
              <span className="cis-value">{cisSettings.companyName || 'Not Set'}</span>
            </div>
            <div className="cis-field">
              <span className="cis-label">UTR Number:</span>
              <span className="cis-value">{cisSettings.utr || 'Not Set'}</span>
            </div>
            <div className="cis-field">
              <span className="cis-label">National Insurance Number:</span>
              <span className="cis-value">{cisSettings.niNumber || 'Not Set'}</span>
            </div>
          </div>
          <div className="cis-note">
            <p>
              As required by the Construction Industry Scheme, a 20% tax deduction of <strong>£{(invoice.cisDeduction || 0).toFixed(2)}</strong> has been applied to labor charges only.
            </p>
          </div>
        </div>
      )}
      
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
      {invoiceSettings.footer && (
        <div className="invoice-footer">
          {invoiceSettings.footer}
        </div>
      )}
    </div>
  );
};

export default InvoicePreview;