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
      <div className="p-6 text-center text-gray-500 bg-gray-50 rounded-md">
        <p>No invoice data provided for preview.</p>
      </div>
    );
  }

  // Ensure we have settings objects to prevent null reference errors
  const safeSettings = settings || {};
  const companySettings = safeSettings.company || {};
  const invoiceSettings = safeSettings.invoice || {};
  const cisSettings = safeSettings.cis || {};
  const bankSettings = safeSettings.bank || {};
  
  // Get VAT info from the invoice or settings
  const vatSettings = settings?.vat || { enabled: false, rate: 20, number: '' };
  
  // Check if VAT is already included in the invoice amount from the quote
  const vatInfo = invoice.vatInfo || { enabled: false, rate: 20, amount: 0, includedInTotal: false };

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

  // Determine status badge Tailwind classes
  const getStatusBadgeClasses = () => {
    const baseClasses = "inline-block px-2 py-1 text-xs font-semibold rounded-full";
    if (invoice.status === 'paid') {
      // Add dark mode variants for paid badge
      return `${baseClasses} bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300`;
    }
    const today = new Date();
    today.setHours(0,0,0,0); // Normalize today's date
    const invoiceDueDate = new Date(invoice.dueDate);
     invoiceDueDate.setHours(0,0,0,0); // Normalize due date
    if (invoiceDueDate < today) { // Corrected overdue check
      // Add dark mode variants for overdue badge
      return `${baseClasses} bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300`;
    }
    // Add dark mode variants for pending badge
    return `${baseClasses} bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300`; // Pending
  };

  // Check if the invoice has line items
  const hasLineItems = invoice.lineItems && invoice.lineItems.length > 0;
  
  // Determine if the invoice has CIS deductions
  const hasCisDeduction = invoice.cisApplied || 
    (hasLineItems && invoice.lineItems.some(item => item.type === 'cis'));

  // --- Recalculate Totals for Preview --- 
  // Use the calculateTotals logic similar to InvoiceBuilder for consistency
  const calculatePreviewTotals = (invDetails, vatSettings) => {
    const items = invDetails.lineItems || [];
    const isCisApplied = invDetails.cisApplied || false;
    const originalGross = invDetails.originalGrossAmount || 0;
    const currentAmount = invDetails.amount || 0;
    const cisDeductionAmount = invDetails.cisDeduction || 0;
    const vatInfo = invDetails.vatInfo || {};
    const settingsVatEnabled = vatSettings?.enabled || false;
    const settingsVatRate = vatSettings?.rate || 20;

    // Calculate subtotal based on items *before* CIS/VAT adjustments
    let subtotalPreAdjustments = items
        .filter(item => item.type !== 'cis') // Exclude CIS deduction line itself
        .reduce((sum, item) => sum + (parseFloat(item.amount) || 0) * (parseFloat(item.quantity) || 1), 0);

    let displaySubtotal = subtotalPreAdjustments;
    let calculatedVatAmount = 0;
    let grandTotal = currentAmount; // Default to current amount (might be net of CIS)
    let baseForVat = subtotalPreAdjustments;
    let isVatEnabled = vatInfo.enabled ?? settingsVatEnabled;
    let vatRate = vatInfo.rate ?? settingsVatRate;

    if (isCisApplied) {
        // If CIS is applied, the subtotal shown should be the original gross
        displaySubtotal = originalGross;
        baseForVat = originalGross; // VAT is calculated on the original gross amount
        grandTotal = originalGross - cisDeductionAmount; // Start grand total calculation from gross minus CIS
    } else {
        // If no CIS, subtotal is sum of items, base for VAT is that sum
        displaySubtotal = subtotalPreAdjustments;
        baseForVat = subtotalPreAdjustments;
        grandTotal = subtotalPreAdjustments; // Start grand total from subtotal
    }

    if (isVatEnabled) {
        const vatRateDecimal = (vatRate || 0) / 100;
        calculatedVatAmount = baseForVat * vatRateDecimal;
        // Add VAT to the grand total (which already accounts for CIS if applied)
        grandTotal += calculatedVatAmount;
    } else {
         calculatedVatAmount = 0; // Ensure VAT is zero if not enabled
    }

    return {
      subtotal: displaySubtotal || 0,
      vatAmount: calculatedVatAmount || 0,
      grandTotal: grandTotal || 0,
      cisDeduction: cisDeductionAmount || 0, // Pass through CIS deduction
      isVatEnabled: isVatEnabled,
      vatRate: vatRate
    };
  };

  const totals = calculatePreviewTotals(invoice, vatSettings);

  // Wrapper classes for print mode
  // Added bg-white, p-8 for screen view. pdf-a4-format is handled by invoice-builder.css
  // Added dark mode border color to the container
  const containerClass = printMode ? "invoice-preview pdf-export-mode pdf-a4-format" : "invoice-preview bg-white shadow-md rounded-lg p-8 border border-gray-200 dark:border-gray-600";

  return (
    // Use the id="invoice-preview" for PDF generation target if needed elsewhere
    // Added base dark mode text color to the root div
    <div className={`${containerClass} max-w-4xl mx-auto font-sans text-sm text-gray-700 dark:text-gray-300`} id="invoice-preview">
      {/* Header: Logo/Title/Status on Left, Company Details on Right */}
      <div className="flex justify-between items-start mb-8 pb-4 border-b border-gray-200 dark:border-gray-600">
        {/* Left Side: Branding */} 
        <div className="flex flex-col items-start">
          {/* Logo */} 
          {companySettings.logo ? (
            <div className="mb-4 max-w-[150px] h-auto"> {/* Constrain logo size */}
              <img 
                src={companySettings.logo} 
                alt={`${companySettings.name || 'Company'} Logo`}
                className="block object-contain"
              />
            </div>
          ) : (
             <div className="mb-4 p-4 bg-gray-100 rounded text-gray-400 text-xs italic min-h-[50px] flex items-center justify-center dark:bg-gray-700 dark:text-gray-500"> 
               {companySettings.name || 'Company Logo'}
             </div>
          )}
          
          {/* Document title */} 
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 uppercase mb-1">Invoice</h1>
          {/* Reference */} 
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
            Ref: {invoice.invoiceNumber || `INV-${invoice.id?.substring(0, 6)}`}
          </p>
          {/* Status Badge */} 
          <div>
            <span className={getStatusBadgeClasses()}>
               {invoice.status === 'paid' ? 'Paid' : (new Date(invoice.dueDate) < new Date() ? 'Overdue' : 'Pending')}
            </span>
          </div>
        </div>
        
        {/* Right Side: Company details */} 
        <div className="text-right text-xs">
          <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-1">{companySettings.name || 'Your Company Name'}</h3>
          {companySettings.address && (
             <div className="text-gray-600 dark:text-gray-400 mb-1 whitespace-pre-line">
                {companySettings.address}
             </div>
          )}
          <div className="text-gray-600 dark:text-gray-400">
            {companySettings.email && <p>{companySettings.email}</p>}
            {companySettings.phone && <p>{companySettings.phone}</p>}
            {companySettings.website && <p><a href={companySettings.website} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline dark:text-indigo-400">{companySettings.website}</a></p>}
             {vatSettings.enabled && vatSettings.number && <p className="mt-1 font-medium text-gray-700 dark:text-gray-300">VAT Reg: {vatSettings.number}</p>}
          </div>
        </div>
      </div>
      
      {/* Info Grid: Client Details (Left), Invoice Details (Right) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        {/* Client information */} 
        <div className="text-left">
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Bill To:</h3>
          <div className="text-gray-800 dark:text-gray-100">
            <p className="font-semibold text-base mb-1">
              {invoice.clientName || '[Client Name]'}
            </p>
            {invoice.clientCompany && (
              <p className="text-gray-600 dark:text-gray-400 mb-1">
                {invoice.clientCompany}
              </p>
            )}
            {invoice.clientAddress && (
              <div className="text-gray-600 dark:text-gray-400 mb-2 whitespace-pre-line leading-snug">
                {invoice.clientAddress}
              </div>
            )}
            <div className="text-gray-600 dark:text-gray-400">
              {invoice.clientEmail && (
                <p>Email: {invoice.clientEmail}</p>
              )}
              {invoice.clientPhone && (
                <p>Phone: {invoice.clientPhone}</p>
              )}
            </div>
          </div>
        </div>
        
        {/* Invoice details */} 
        <div className="text-left md:text-right">
           {/* Using simple divs for alignment, could use grid */} 
           <div className="space-y-1 text-sm">
             <div className="flex md:justify-end">
               <span className="font-semibold text-gray-500 dark:text-gray-400 w-24">Invoice Date:</span>
               <span className="text-gray-800 dark:text-gray-100">{invoiceDate}</span>
             </div>
             <div className="flex md:justify-end">
               <span className="font-semibold text-gray-500 dark:text-gray-400 w-24">Due Date:</span>
               <span className="text-gray-800 dark:text-gray-100">{dueDate}</span>
             </div>
             {paidDate && (
               <div className="flex md:justify-end">
                 <span className="font-semibold text-gray-500 dark:text-gray-400 w-24">Paid Date:</span>
                 <span className="text-gray-800 dark:text-gray-100">{paidDate}</span>
               </div>
             )}
           </div>
        </div>
      </div>
      
      {/* Invoice items table */} 
      <div className="mb-8 overflow-x-auto"> {/* Added overflow-x-auto for smaller screens */} 
        <table className="min-w-full w-full border-collapse text-sm">
          <thead className="border-b border-gray-300 dark:border-gray-600">
            <tr>
              <th className="p-2 text-left font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider w-1/2">Description</th>
              <th className="p-2 text-center font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider w-1/6">Qty</th>
              <th className="p-2 text-right font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider w-1/6">Unit Price</th>
              <th className="p-2 text-right font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider w-1/6">Total</th>
            </tr>
          </thead>
          <tbody>
            {hasLineItems ? (
              invoice.lineItems.map((item, index) => {
                const amount = parseFloat(item.amount) || 0;
                const quantity = parseFloat(item.quantity) || 1;
                const itemTotal = amount * quantity;
                
                // Determine row classes based on item type
                let rowClasses = "border-b border-gray-200 dark:border-gray-700";
                let textClasses = "text-gray-800 dark:text-gray-100";
                let priceTextClasses = "text-gray-700 dark:text-gray-300";
                let descriptionSuffix = ""; // Suffix for description like (Labour)

                if (item.isLabour) {
                  rowClasses += " bg-blue-50 dark:bg-blue-900/20";
                  descriptionSuffix = '<span class="text-xs text-blue-600 dark:text-blue-400 ml-1">(Labour)</span>';
                } else if (item.type === 'cis') {
                  rowClasses += " bg-red-50 dark:bg-red-900/20 italic";
                  textClasses = "text-red-700 dark:text-red-300";
                  priceTextClasses = "text-red-700 dark:text-red-300";
                  descriptionSuffix = '<span class="text-xs ml-1">(CIS Deduction)</span>';
                }

                return (
                  <tr key={item.id || index} className={rowClasses}>
                    <td className={`p-2 align-top ${textClasses}`}> 
                      {item.description}
                      {/* Use dangerouslySetInnerHTML for the suffix span */} 
                      {descriptionSuffix && <span dangerouslySetInnerHTML={{ __html: descriptionSuffix }} />} 
                    </td>
                    <td className={`p-2 text-center align-top ${priceTextClasses}`}>{quantity}</td>
                    <td className={`p-2 text-right align-top ${priceTextClasses}`}>{formatCurrency(amount)}</td>
                    <td className={`p-2 text-right align-top ${priceTextClasses}`}>{formatCurrency(itemTotal)}</td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="4" className="p-4 text-center text-gray-500 dark:text-gray-400 italic">
                  No line items on this invoice.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Totals Section */}
      <div className="flex justify-end mb-8">
        <div className="w-full max-w-xs space-y-1 text-sm">
          {/* Subtotal */} 
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Subtotal:</span>
            <span className="font-medium text-gray-800 dark:text-gray-100">{formatCurrency(totals.subtotal)}</span>
          </div>
          {/* CIS Deduction */} 
          {hasCisDeduction && (
            <div className="flex justify-between text-red-600 dark:text-red-400">
              <span>CIS Deduction ({((cisSettings?.rate || 0.20) * 100).toFixed(0)}%):</span>
              <span className="font-medium">- {formatCurrency(totals.cisDeduction)}</span>
            </div>
          )}
          {/* VAT */} 
          {totals.isVatEnabled && (
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">VAT ({totals.vatRate}%):</span>
              <span className="font-medium text-gray-800 dark:text-gray-100">{formatCurrency(totals.vatAmount)}</span>
            </div>
          )}
          {/* Grand Total */} 
          <div className="flex justify-between pt-2 mt-2 border-t border-gray-300 dark:border-gray-600">
            <span className="text-base font-bold text-gray-900 dark:text-gray-50">Grand Total:</span>
            <span className="text-base font-bold text-gray-900 dark:text-gray-50">{formatCurrency(totals.grandTotal)}</span>
          </div>
        </div>
      </div>

      {/* Footer: Notes & Bank Details */}
      <div className="mt-8 pt-4 border-t border-gray-200 dark:border-gray-600 text-xs text-gray-600 dark:text-gray-400">
        {/* Notes */} 
        {invoice.notes && (
          <div className="mb-4">
            <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-1">Notes:</h4>
            <p className="whitespace-pre-line">{invoice.notes}</p>
          </div>
        )}
        
        {/* Bank Details */} 
        {(bankSettings.accountName || bankSettings.sortCode || bankSettings.accountNumber) && (
          <div>
            <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-1">Payment Details:</h4>
            {bankSettings.accountName && <p>Account Name: {bankSettings.accountName}</p>}
            {bankSettings.sortCode && bankSettings.accountNumber && (
              <p>Sort Code: {bankSettings.sortCode} &nbsp;&nbsp;&nbsp; Account Number: {bankSettings.accountNumber}</p>
            )}
            {bankSettings.iban && <p>IBAN: {bankSettings.iban}</p>}
            {bankSettings.bic && <p>BIC/Swift: {bankSettings.bic}</p>}
            {/* Payment Reference */} 
            <p className="mt-1">Please use invoice number <span className="font-semibold text-gray-700 dark:text-gray-300">{invoice.invoiceNumber || `INV-${invoice.id?.substring(0, 6)}`}</span> as payment reference.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default InvoicePreview;