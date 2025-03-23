import html2pdf from 'html2pdf.js';

/**
 * PDF Generator Service
 * Utility service for generating PDF documents from HTML content
 */
class PDFGenerator {
  /**
   * Generate a PDF from an HTML element or string
   * 
   * @param {HTMLElement|string} content - HTML element or string to convert to PDF
   * @param {Object} options - Configuration options for PDF generation
   * @param {string} options.filename - Filename for the generated PDF
   * @param {boolean} options.download - Whether to immediately download the PDF (true) or open in new tab (false)
   * @param {string} options.size - Paper size: 'a4', 'letter', etc.
   * @param {string} options.orientation - Paper orientation: 'portrait' or 'landscape'
   * @param {Object} options.margin - Margin sizes in mm, e.g. {top: 10, right: 10, bottom: 10, left: 10}
   * @param {number} options.quality - Image quality (0.0 to 1.0)
   * @returns {Promise} - Promise that resolves when PDF generation is complete
   */
  async generatePDF(content, options = {}) {
    // Default options
    const defaultOptions = {
      filename: 'document.pdf',
      download: true,
      size: 'a4',
      orientation: 'portrait',
      margin: [10, 10, 10, 10],
      quality: 0.98,
    };

    // Merge with user options
    const pdfOptions = {
      ...defaultOptions,
      ...options,
    };

    // Show loading message
    const loadingMessage = this._createLoadingMessage();
    document.body.appendChild(loadingMessage);

    try {
      // Configure html2pdf options
      const html2pdfOptions = {
        margin: pdfOptions.margin,
        filename: pdfOptions.filename,
        image: { type: 'jpeg', quality: pdfOptions.quality },
        html2canvas: { 
          scale: 2,
          useCORS: true,
          logging: false,
          letterRendering: true
        },
        jsPDF: { 
          unit: 'mm', 
          format: pdfOptions.size, 
          orientation: pdfOptions.orientation 
        }
      };

      // Generate the PDF
      const pdf = await html2pdf()
        .set(html2pdfOptions)
        .from(content)
        .toPdf();

      // Download or open in new tab
      if (pdfOptions.download) {
        await pdf.save();
      } else {
        const pdfBlob = await pdf.output('blob');
        const blobUrl = URL.createObjectURL(pdfBlob);
        window.open(blobUrl, '_blank');
      }

      // Clean up loading message
      document.body.removeChild(loadingMessage);
      
      return { success: true };
    } catch (error) {
      // Clean up loading message
      document.body.removeChild(loadingMessage);
      console.error('Error generating PDF:', error);
      throw error;
    }
  }

  /**
   * Generate a quote PDF
   * 
   * @param {Object} quote - The quote data object
   * @param {Object} quoteData - Calculated quote data (totals, etc.)
   * @param {Object} settings - Application settings
   * @returns {Promise} - Promise that resolves when PDF generation is complete
   */
  async generateQuotePDF(quote, quoteData, settings) {
    // Format the filename
    const clientName = quote.client?.name || 'Client';
    const date = new Date().toLocaleDateString('en-GB').replace(/\//g, '-');
    const filename = `Quote-${clientName.replace(/\s+/g, '-')}-${date}.pdf`;

    // Create a temporary container element
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '-9999px';
    container.className = 'pdf-container';
    
    // Apply quote template styles
    container.innerHTML = this._getQuoteTemplate(quote, quoteData, settings);
    
    // Append to document to render (required for html2pdf to work)
    document.body.appendChild(container);
    
    try {
      // Generate the PDF
      await this.generatePDF(container, {
        filename,
        orientation: 'portrait',
        margin: [10, 10, 10, 10],
      });
      
      // Clean up
      document.body.removeChild(container);
      return { success: true, filename };
    } catch (error) {
      // Clean up
      if (document.body.contains(container)) {
        document.body.removeChild(container);
      }
      console.error('Error generating quote PDF:', error);
      throw error;
    }
  }
  
  /**
   * Generate an invoice PDF
   * 
   * @param {Object} invoice - The invoice data object
   * @param {Object} settings - Application settings
   * @returns {Promise} - Promise that resolves when PDF generation is complete
   */
  async generateInvoicePDF(invoice, settings) {
    // Format the filename
    const clientName = invoice.clientName || 'Client';
    const invoiceNum = invoice.invoiceNumber || invoice.id.substring(0, 6);
    const filename = `Invoice-${invoiceNum}-${clientName.replace(/\s+/g, '-')}.pdf`;

    // Create a temporary container element
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '-9999px';
    container.className = 'pdf-container';
    
    // Apply invoice template styles
    container.innerHTML = this._getInvoiceTemplate(invoice, settings);
    
    // Append to document to render (required for html2pdf to work)
    document.body.appendChild(container);
    
    try {
      // Generate the PDF
      await this.generatePDF(container, {
        filename,
        orientation: 'portrait',
        margin: [10, 10, 10, 10],
      });
      
      // Clean up
      document.body.removeChild(container);
      return { success: true, filename };
    } catch (error) {
      // Clean up
      if (document.body.contains(container)) {
        document.body.removeChild(container);
      }
      console.error('Error generating invoice PDF:', error);
      throw error;
    }
  }

  /**
   * Create a loading message overlay
   * @private
   * @returns {HTMLElement} - Loading message element
   */
  _createLoadingMessage() {
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    overlay.style.display = 'flex';
    overlay.style.justifyContent = 'center';
    overlay.style.alignItems = 'center';
    overlay.style.zIndex = '9999';

    const messageBox = document.createElement('div');
    messageBox.style.backgroundColor = 'white';
    messageBox.style.padding = '20px';
    messageBox.style.borderRadius = '5px';
    messageBox.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.1)';
    messageBox.style.textAlign = 'center';

    const spinner = document.createElement('div');
    spinner.style.display = 'inline-block';
    spinner.style.width = '40px';
    spinner.style.height = '40px';
    spinner.style.margin = '0 auto 10px';
    spinner.style.border = '4px solid #f3f3f3';
    spinner.style.borderTop = '4px solid #3498db';
    spinner.style.borderRadius = '50%';
    spinner.style.animation = 'spin 2s linear infinite';

    const spinnerStyle = document.createElement('style');
    spinnerStyle.textContent = '@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }';
    document.head.appendChild(spinnerStyle);

    const text = document.createElement('p');
    text.style.margin = '10px 0 0';
    text.style.fontFamily = 'Arial, sans-serif';
    text.textContent = 'Generating PDF...';

    messageBox.appendChild(spinner);
    messageBox.appendChild(text);
    overlay.appendChild(messageBox);

    return overlay;
  }

  /**
   * Generate quote HTML template
   * @private
   * @param {Object} quote - Quote data
   * @param {Object} quoteData - Calculated quote data
   * @param {Object} settings - App settings
   * @returns {string} - HTML template string
   */
  _getQuoteTemplate(quote, quoteData, settings) {
    // Format dates
    const quoteDate = quote.date ? new Date(quote.date).toLocaleDateString('en-GB') : 'N/A';
    const validUntil = quote.validUntil ? new Date(quote.validUntil).toLocaleDateString('en-GB') : 'N/A';
    
    // Get payment terms text
    let paymentTermsText = '';
    switch (quote.paymentTerms) {
      case '1':
        paymentTermsText = '50% deposit required, remainder due on completion.';
        break;
      case '2':
        paymentTermsText = '50% deposit required, 25% on completion of joinery, final 25% on completion.';
        break;
      case '4':
        paymentTermsText = 'Full amount to be paid before delivery.';
        break;
      case '3':
        paymentTermsText = quote.customTerms || 'Custom payment terms.';
        break;
      default:
        paymentTermsText = '50% deposit required, remainder due on completion.';
    }
    
    // Create reference number
    const year = new Date().getFullYear();
    const refNum = `${settings.quote.prefix || 'Q-'}${year}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
    
    // Generate HTML
    return `
      <style>
        .quote-container {
          font-family: Arial, sans-serif;
          color: #333;
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
        }
        .quote-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 30px;
          border-bottom: 1px solid #eee;
          padding-bottom: 20px;
        }
        .quote-title h1 {
          font-size: 28px;
          margin: 0 0 5px 0;
        }
        .quote-title p {
          margin: 0 0 10px 0;
          color: #666;
        }
        .logo-container {
          max-width: 200px;
          margin-bottom: 10px;
        }
        .logo-container img {
          max-width: 100%;
          height: auto;
        }
        .company-details {
          text-align: right;
        }
        .company-details h3 {
          margin-top: 0;
          margin-bottom: 10px;
        }
        .company-details p {
          margin: 0 0 5px 0;
        }
        .client-section, .date-section {
          margin-bottom: 20px;
        }
        .client-section h3, .date-section h3 {
          margin-top: 0;
          margin-bottom: 10px;
          border-bottom: 1px solid #eee;
          padding-bottom: 5px;
        }
        .items-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        }
        .items-table th, .items-table td {
          border: 1px solid #ddd;
          padding: 10px;
        }
        .items-table th {
          background-color: #f8f8f8;
          text-align: left;
        }
        .text-right {
          text-align: right;
        }
        .total-row {
          font-weight: bold;
          background-color: #f8f8f8;
        }
        .terms-section {
          margin-top: 30px;
        }
        .terms-section h3 {
          margin-top: 0;
          margin-bottom: 10px;
          border-bottom: 1px solid #eee;
          padding-bottom: 5px;
        }
      </style>
      
      <div class="quote-container">
        <!-- Header with logo and company details -->
        <div class="quote-header">
          <!-- Left side - title and logo -->
          <div class="quote-title">
            ${settings.company.logo ? `
              <div class="logo-container">
                <img src="${settings.company.logo}" alt="${settings.company.name} Logo">
              </div>
            ` : ''}
            <h1>QUOTATION</h1>
            <p>Reference: ${refNum}</p>
          </div>
          
          <!-- Right side - company details -->
          <div class="company-details">
            <h3>${settings.company.name}</h3>
            <p>${settings.company.address.replace(/\n/g, '<br>')}</p>
            <p>${settings.company.email}</p>
            <p>${settings.company.phone}</p>
            <p>${settings.company.website}</p>
          </div>
        </div>
        
        <!-- Client section -->
        <div class="client-section">
          <h3>Client:</h3>
          <p><strong>Name:</strong> ${quote.client?.name || '[Contact Name]'}</p>
          ${quote.client?.company ? `<p><strong>Company:</strong> ${quote.client.company}</p>` : ''}
          <p><strong>Email:</strong> ${quote.client?.email || '[Email]'}</p>
          <p><strong>Phone:</strong> ${quote.client?.phone || '[Phone]'}</p>
          <p><strong>Address:</strong></p>
          <p style="margin-left: 15px;">${quote.client?.address ? quote.client.address.replace(/\n/g, '<br>') : '[Address]'}</p>
        </div>
        
        <!-- Date section -->
        <div class="date-section">
          <p><strong>Date:</strong> ${quoteDate}</p>
          <p><strong>Valid Until:</strong> ${validUntil}</p>
        </div>
        
        <!-- Items table -->
        <table class="items-table">
          <thead>
            <tr>
              <th>Item Description</th>
              <th>Qty</th>
              <th>Unit Price</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            ${quoteData.itemTotals.map(item => `
              <tr>
                <td>${item.description || item.name}</td>
                <td class="text-right">${item.quantity}</td>
                <td class="text-right">£${item.unitPrice.toFixed(2)}</td>
                <td class="text-right">£${item.finalTotal.toFixed(2)}</td>
              </tr>
            `).join('')}
            
            <!-- Total row -->
            <tr class="total-row">
              <td colspan="3" class="text-right">Total</td>
              <td class="text-right">£${quoteData.grandTotal.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
        
        <!-- Terms section -->
        <div class="terms-section">
          <h3>Terms and Conditions:</h3>
          
          <h4>Payment Terms:</h4>
          <p>${paymentTermsText}</p>
          <p>This quote is valid for the period specified above.</p>
          
          ${quote.exclusions && quote.exclusions.length > 0 ? `
            <h4>Exclusions:</h4>
            <p>${quote.exclusions.join('<br>')}</p>
          ` : ''}
          
          ${quote.includeDrawingOption ? `
            <h4>Drawings:</h4>
            <p>Drawings are available before accepting the quote at a cost of £150, which will be deducted from the project total if the order proceeds.</p>
          ` : ''}
          
          ${quote.notes ? `
            <h4>Additional Notes:</h4>
            <p>${quote.notes.replace(/\n/g, '<br>')}</p>
          ` : ''}
        </div>
      </div>
    `;
  }

  /**
   * Generate invoice HTML template
   * @private
   * @param {Object} invoice - Invoice data
   * @param {Object} settings - App settings
   * @returns {string} - HTML template string
   */
  _getInvoiceTemplate(invoice, settings) {
    // Format dates
    const invoiceDate = invoice.invoiceDate ? new Date(invoice.invoiceDate).toLocaleDateString('en-GB') : 'N/A';
    const dueDate = invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('en-GB') : 'N/A';
    
    // Determine status
    let statusText = '';
    let statusClass = '';
    
    if (invoice.status === 'paid') {
      statusText = 'Paid';
      statusClass = 'status-paid';
    } else {
      // Check if overdue
      const today = new Date();
      const invoiceDueDate = new Date(invoice.dueDate);
      
      if (today > invoiceDueDate) {
        statusText = 'Overdue';
        statusClass = 'status-overdue';
      } else {
        statusText = 'Pending';
        statusClass = 'status-pending';
      }
    }
    
    // Format reference
    const refNum = invoice.invoiceNumber || `INV-${invoice.id.substring(0, 6)}`;
    
    return `
      <style>
        .invoice-container {
          font-family: Arial, sans-serif;
          color: #333;
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
        }
        .header-section {
          display: flex;
          justify-content: space-between;
          margin-bottom: 30px;
          border-bottom: 1px solid #eee;
          padding-bottom: 20px;
        }
        .logo-title-section {
          display: flex;
          flex-direction: column;
        }
        .logo {
          max-width: 200px;
          margin-bottom: 10px;
        }
        .logo img {
          max-width: 100%;
          height: auto;
        }
        .document-title h1 {
          font-size: 28px;
          margin: 0 0 5px 0;
          font-weight: bold;
        }
        .document-title p {
          color: #666;
          margin: 0 0 10px 0;
        }
        .company-details {
          text-align: right;
        }
        .company-details h3 {
          margin-top: 0;
          margin-bottom: 10px;
          font-size: 18px;
        }
        .company-details p {
          margin: 0 0 5px 0;
          font-size: 14px;
        }
        .client-section, .date-section {
          margin-bottom: 20px;
        }
        .client-section h3, .date-section h3 {
          margin-top: 0;
          margin-bottom: 15px;
          font-size: 18px;
          border-bottom: 1px solid #eee;
          padding-bottom: 5px;
        }
        .items-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        }
        .items-table th, .items-table td {
          border: 1px solid #ddd;
          padding: 10px;
        }
        .items-table th {
          background-color: #f8f8f8;
          text-align: left;
        }
        .text-right {
          text-align: right;
        }
        .total-row {
          background-color: #f8f8f8;
          font-weight: bold;
        }
        .terms-section {
          margin-top: 30px;
        }
        .terms-section h3 {
          font-size: 18px;
          margin-top: 0;
          margin-bottom: 15px;
          border-bottom: 1px solid #eee;
          padding-bottom: 5px;
        }
        .terms-section h4 {
          font-size: 16px;
          margin-top: 15px;
          margin-bottom: 10px;
        }
        .terms-section p {
          margin: 0 0 5px 0;
          font-size: 14px;
        }
        .status-badge {
          display: inline-block;
          padding: 5px 10px;
          border-radius: 4px;
          font-size: 14px;
          font-weight: bold;
          margin-top: 10px;
        }
        .status-paid {
          background-color: #d1fae5;
          color: #065f46;
        }
        .status-pending {
          background-color: #e0e7ff;
          color: #3730a3;
        }
        .status-overdue {
          background-color: #fee2e2;
          color: #b91c1c;
        }
        .cis-item {
          background-color: #fee2e2;
          color: #dc2626;
          font-style: italic;
        }
        .labour-item {
          background-color: #f3f4f6;
          font-weight: 500;
        }
      </style>
      
      <div class="invoice-container">
        <!-- Header with logo and company details -->
        <div class="header-section">
          <div class="logo-title-section">
            ${settings.company.logo ? `
              <div class="logo">
                <img src="${settings.company.logo}" alt="${settings.company.name} Logo">
              </div>
            ` : ''}
            <div class="document-title">
              <h1>INVOICE</h1>
              <p>Reference: ${refNum}</p>
              <div class="status-badge ${statusClass}">${statusText}</div>
            </div>
          </div>
          
          <div class="company-details">
            <h3>${settings.company.name}</h3>
            <p>${settings.company.address.replace(/\n/g, '<br>')}</p>
            <p>${settings.company.email}</p>
            <p>${settings.company.phone}</p>
            <p>${settings.company.website}</p>
          </div>
        </div>
        
        <!-- Client section -->
        <div class="client-section">
          <h3>Bill To:</h3>
          <p><strong>Name:</strong> ${invoice.clientName || '[Client Name]'}</p>
          ${invoice.clientCompany ? `<p><strong>Company:</strong> ${invoice.clientCompany}</p>` : ''}
          <p><strong>Email:</strong> ${invoice.clientEmail || '[Email]'}</p>
          <p><strong>Phone:</strong> ${invoice.clientPhone || '[Phone]'}</p>
          <p><strong>Address:</strong><br>${invoice.clientAddress ? invoice.clientAddress.replace(/\n/g, '<br>') : '[Address]'}</p>
        </div>
        
        <!-- Date section -->
        <div class="date-section">
          <p><strong>Invoice Date:</strong> ${invoiceDate}</p>
          <p><strong>Due Date:</strong> ${dueDate}</p>
          ${invoice.paidAt ? `<p><strong>Paid Date:</strong> ${new Date(invoice.paidAt).toLocaleDateString('en-GB')}</p>` : ''}
        </div>
        
        <!-- Items table -->
        <table class="items-table">
          <thead>
            <tr>
              <th>Description</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
    `;
  
    // Check if we have itemized invoice data
    if (invoice.items && invoice.items.length > 0) {
      // For calculating subtotals
      let subtotal = 0;
      let hasCisItems = invoice.items.some(item => item.type === 'cis');
      
      // First, add all regular items
      let tableContent = '';
      invoice.items.forEach(item => {
        if (item.type !== 'cis') {
          const amount = parseFloat(item.amount) || 0;
          subtotal += amount;
          
          // Determine row class based on item type
          let rowClass = '';
          if (item.isLabour) {
            rowClass = 'class="labour-item"';
          }
          
          tableContent += `
            <tr ${rowClass}>
              <td>${item.description || item.name || 'Item'}</td>
              <td class="text-right">£${Math.abs(amount).toFixed(2)}</td>
            </tr>
          `;
        }
      });
      
      // Add subtotal if we have CIS items
      if (hasCisItems) {
        tableContent += `
          <tr class="subtotal-row">
            <td class="text-right"><strong>Subtotal</strong></td>
            <td class="text-right"><strong>£${subtotal.toFixed(2)}</strong></td>
          </tr>
        `;
      }
      
      // Add CIS deductions
      invoice.items.forEach(item => {
        if (item.type === 'cis') {
          const amount = parseFloat(item.amount) || 0;
          tableContent += `
            <tr class="cis-item">
              <td>${item.description || 'CIS Deduction'}</td>
              <td class="text-right">-£${Math.abs(amount).toFixed(2)}</td>
            </tr>
          `;
        }
      });
      
      // Add the table content
      return `
        ${tableContent}
        <tr class="total-row">
          <td class="text-right"><strong>Total</strong></td>
          <td class="text-right"><strong>£${invoice.amount.toFixed(2)}</strong></td>
        </tr>
        </tbody>
        </table>
        
        <!-- Terms section -->
        <div class="terms-section">
          <h3>Terms and Conditions:</h3>
          
          <h4>Payment Instructions:</h4>
          <p>Please make payment to:</p>
          ${settings.bank ? `
            <p><strong>Bank:</strong> ${settings.bank.name || 'Not specified'}</p>
            <p><strong>Account Name:</strong> ${settings.bank.accountName || 'Not specified'}</p>
            <p><strong>Account Number:</strong> ${settings.bank.accountNumber || 'Not specified'}</p>
            <p><strong>Sort Code:</strong> ${settings.bank.sortCode || 'Not specified'}</p>
            ${settings.bank.iban ? `<p><strong>IBAN:</strong> ${settings.bank.iban}</p>` : ''}
            ${settings.bank.bic ? `<p><strong>BIC/SWIFT:</strong> ${settings.bank.bic}</p>` : ''}
            ${settings.bank.paymentReference ? `
              <p><strong>Payment Reference:</strong> ${settings.bank.paymentReference.replace(
                '[Invoice Number]', 
                invoice.invoiceNumber || `INV-${invoice.id.substring(0, 6)}`
              )}</p>
            ` : ''}
          ` : `
            <p><strong>Bank:</strong> Barclays Bank</p>
            <p><strong>Account Name:</strong> Axton's Staircases</p>
            <p><strong>Account Number:</strong> 12345678</p>
            <p><strong>Sort Code:</strong> 12-34-56</p>
          `}
          
          ${hasCisItems ? `
            <h4>CIS Information:</h4>
            <p>This invoice includes a Construction Industry Scheme (CIS) deduction as required by HMRC.</p>
            ${settings.cis ? `
              <div style="margin-top: 10px; padding: 10px; background-color: #f3f4f6; border-radius: 4px;">
                <h4 style="margin-top: 0;">CIS Details:</h4>
                ${settings.cis.companyName ? `<p><strong>Company:</strong> ${settings.cis.companyName}</p>` : ''}
                ${settings.cis.utr ? `<p><strong>UTR Number:</strong> ${settings.cis.utr}</p>` : ''}
                ${settings.cis.niNumber ? `<p><strong>NI Number:</strong> ${settings.cis.niNumber}</p>` : ''}
              </div>
            ` : ''}
          ` : ''}
          
          ${invoice.notes ? `
            <h4>Additional Notes:</h4>
            <p>${invoice.notes.replace(/\n/g, '<br>')}</p>
          ` : ''}
          
          ${settings.invoice && settings.invoice.footer ? `
            <h4>Additional Information:</h4>
            <p>${settings.invoice.footer.replace(/\n/g, '<br>')}</p>
          ` : ''}
        </div>
      </div>
      `;
    } else {
      // Simple version with just description and amount
      return `
        <tr>
          <td>${invoice.description}</td>
          <td class="text-right">£${invoice.amount.toFixed(2)}</td>
        </tr>
        <tr class="total-row">
          <td class="text-right"><strong>Total</strong></td>
          <td class="text-right"><strong>£${invoice.amount.toFixed(2)}</strong></td>
        </tr>
        </tbody>
        </table>
        
        <!-- Terms section -->
        <div class="terms-section">
          <h3>Terms and Conditions:</h3>
          
          <h4>Payment Instructions:</h4>
          <p>Please make payment to:</p>
          ${settings.bank ? `
            <p><strong>Bank:</strong> ${settings.bank.name || 'Not specified'}</p>
            <p><strong>Account Name:</strong> ${settings.bank.accountName || 'Not specified'}</p>
            <p><strong>Account Number:</strong> ${settings.bank.accountNumber || 'Not specified'}</p>
            <p><strong>Sort Code:</strong> ${settings.bank.sortCode || 'Not specified'}</p>
            ${settings.bank.iban ? `<p><strong>IBAN:</strong> ${settings.bank.iban}</p>` : ''}
            ${settings.bank.bic ? `<p><strong>BIC/SWIFT:</strong> ${settings.bank.bic}</p>` : ''}
            ${settings.bank.paymentReference ? `
              <p><strong>Payment Reference:</strong> ${settings.bank.paymentReference.replace(
                '[Invoice Number]', 
                invoice.invoiceNumber || `INV-${invoice.id.substring(0, 6)}`
              )}</p>
            ` : ''}
          ` : `
            <p><strong>Bank:</strong> Barclays Bank</p>
            <p><strong>Account Name:</strong> Axton's Staircases</p>
            <p><strong>Account Number:</strong> 12345678</p>
            <p><strong>Sort Code:</strong> 12-34-56</p>
          `}
          
          ${invoice.notes ? `
            <h4>Additional Notes:</h4>
            <p>${invoice.notes.replace(/\n/g, '<br>')}</p>
          ` : ''}
          
          ${settings.invoice && settings.invoice.footer ? `
            <h4>Additional Information:</h4>
            <p>${settings.invoice.footer.replace(/\n/g, '<br>')}</p>
          ` : ''}
        </div>
      </div>
      `;
    }
  }
}

export default new PDFGenerator();