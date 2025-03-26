import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useQuery } from 'react-query';
import { useAppContext } from '../../context/AppContext';
import api from '../../services/api';
import pdfGenerator from '../../services/pdfGenerator';
import { formatDate } from '../../utils/formatters';

// Components
import Button from '../common/Button';
import Loading from '../common/Loading';
import FormField from '../common/FormField';
import Tabs from '../common/Tabs';
import InvoicePreview from './InvoicePreview';
import PaymentSchedule from './PaymentSchedule'; // Import PaymentSchedule component

const InvoiceBuilder = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const quoteId = searchParams.get('quoteId');
  const { addNotification, settings } = useAppContext();
  
  // Update the searchParams section
  const amount = searchParams.get('amount') ? parseFloat(searchParams.get('amount')) : 0;
  const invoiceType = searchParams.get('type') || 'Deposit (50%)';
  const quoteTotal = searchParams.get('total') ? parseFloat(searchParams.get('total')) : 0;

  // Update the useState section to use these parameters 
  const [invoiceDetails, setInvoiceDetails] = useState({
    invoiceNumber: '',
    clientName: '',
    clientCompany: '',
    clientEmail: '',
    clientPhone: '',
    clientAddress: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    amount: amount,
    description: '',
    status: 'pending',
    quoteId: quoteId || '',
    type: invoiceType,
    quoteTotal: quoteTotal,
    cisApplied: false,
    cisDeduction: 0,
    lineItems: []
  });

  const [activeTab, setActiveTab] = useState('create');
  
  // Fetch invoice if we have an ID
  const { data: invoice, isLoading: isLoadingInvoice } = useQuery(
    ['invoice', id],
    () => api.invoices.getById(id),
    {
      enabled: !!id,
      onSuccess: (data) => {
        if (data) {
          setInvoiceDetails(data);
        }
      },
      onError: (error) => {
        addNotification(`Error loading invoice: ${error.message}`, 'error');
      }
    }
  );
  
  // Fetch quote if we have a quoteId
  const { data: quote, isLoading: isLoadingQuote } = useQuery(
    ['quote', quoteId],
    () => api.quotes.getById(quoteId),
    {
      enabled: !!quoteId && !id,
      onSuccess: (data) => {
        if (data) {
          console.log("Loaded quote data for invoice:", data);
          
          // Extract line items and identify labor items
          const quoteLineItems = data.lineItems || [];
          
          // Find all labor items in the quote
          const laborItems = quoteLineItems.filter(item => 
            (item.description && (
              item.description.toLowerCase().includes('labour') || 
              item.description.toLowerCase().includes('labor')
            )) ||
            item.category === 'labour' ||
            item.isLabour === true
          );
          
          // Calculate total labor amount
          const totalLaborAmount = laborItems.reduce(
            (sum, item) => sum + (parseFloat(item.amount) || 0), 
            0
          );
          
          // Process line items, marking labor items
          const processedLineItems = laborItems.map(item => ({
            id: item.id || `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            description: item.description || 'Labor',
            amount: parseFloat(item.amount) || 0,
            quantity: parseFloat(item.quantity) || 1,
            isLabour: true
          }));
          
          // Calculate invoice amount based on type
          let invoiceAmount = amount;
          if (!invoiceAmount && data.grandTotal) {
            // If no amount specified, calculate based on invoice type
            if (invoiceType.includes('50%')) {
              invoiceAmount = data.grandTotal * 0.5;
            } else if (invoiceType.includes('25%')) {
              invoiceAmount = data.grandTotal * 0.25;
            } else if (invoiceType.includes('Full')) {
              invoiceAmount = data.grandTotal;
            }
          }
            
          // Pre-fill invoice details from quote
          setInvoiceDetails(prev => ({
            ...prev,
            clientName: data.client?.name || data.clientName || '',
            clientCompany: data.client?.company || data.clientCompany || '',
            clientEmail: data.client?.email || data.clientEmail || '',
            clientPhone: data.client?.phone || data.clientPhone || '',
            clientAddress: data.client?.address || data.clientAddress || '',
            description: `${invoiceType} for ${data.client?.company || data.clientCompany || 'project'}`,
            quoteId: data.id,
            amount: invoiceAmount || prev.amount,
            quoteTotal: data.grandTotal || 0,
            lineItems: processedLineItems, // Include only labor items
            laborTotal: totalLaborAmount // Track total labor amount for CIS calculations
          }));
        }
      }
    }
  );
  
  // Generate a unique invoice number if creating a new invoice
  useEffect(() => {
    if (!id && !invoiceDetails.invoiceNumber) {
      const prefix = 'INV-';
      const year = new Date().getFullYear();
      const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      setInvoiceDetails(prev => ({
        ...prev,
        invoiceNumber: `${prefix}${year}-${random}`
      }));
    }
  }, [id, invoiceDetails.invoiceNumber]);
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!invoiceDetails.clientName) {
      addNotification('Client name is required', 'error');
      return;
    }
    
    if (!invoiceDetails.amount || invoiceDetails.amount <= 0) {
      addNotification('Amount must be greater than zero', 'error');
      return;
    }
    
    try {
      const invoiceData = {
        ...invoiceDetails,
        id: id || Date.now().toString(),
        updatedAt: new Date().toISOString()
      };
      
      if (!id) {
        invoiceData.createdAt = new Date().toISOString();
      }
      
      await api.invoices.save(invoiceData);
      addNotification('Invoice saved successfully', 'success');
      navigate('/invoices');
    } catch (error) {
      addNotification(`Error saving invoice: ${error.message}`, 'error');
    }
  };
  
  // Mark invoice as paid
  const handleMarkAsPaid = async () => {
    if (invoiceDetails.status === 'paid') {
      addNotification('This invoice is already marked as paid', 'info');
      return;
    }
    
    try {
      const updatedInvoice = {
        ...invoiceDetails,
        status: 'paid',
        paidAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      await api.invoices.save(updatedInvoice);
      addNotification('Invoice marked as paid', 'success');
      setInvoiceDetails(updatedInvoice);
    } catch (error) {
      addNotification(`Error updating invoice: ${error.message}`, 'error');
    }
  };

  // Generate PDF
  const handleExportPDF = async () => {
    try {
      await pdfGenerator.generateInvoicePDF(invoiceDetails, settings);
      addNotification('Invoice PDF generated successfully', 'success');
    } catch (error) {
      addNotification(`Error generating PDF: ${error.message}`, 'error');
    }
  };

  // Handle emails
  const handleEmailInvoice = () => {
    // Email logic would go here
    addNotification('Email functionality coming soon!', 'info');
  };

  // Handle save invoice
  const handleSaveInvoice = async () => {
    try {
      await handleSubmit({ preventDefault: () => {} });
    } catch (error) {
      console.error('Error saving invoice:', error);
    }
  };

  // Add this function after handleSaveInvoice
  const handleCreateSeries = async () => {
    try {
      // First save the current invoice
      await handleSaveInvoice();
      
      // If this is not from a quote or there's no quoteTotal, we can't create a series
      if (!invoiceDetails.quoteId || !invoiceDetails.quoteTotal) {
        addNotification('Cannot create invoice series without a connected quote', 'error');
        return;
      }
      
      const quoteId = invoiceDetails.quoteId;
      const total = invoiceDetails.quoteTotal;
      
      // Get quote details to determine payment terms
      const quote = await api.quotes.getById(quoteId);
      
      if (!quote) {
        addNotification('Could not fetch quote details', 'error');
        return;
      }
      
      const paymentTerms = quote.paymentTerms;
      let remainingInvoices = [];
      
      // Create the remaining invoices based on payment terms
      if (paymentTerms === '1' && invoiceDetails.type === 'Deposit (50%)') {
        // Add the final 50% payment
        remainingInvoices.push({
          type: 'Final Payment (50%)',
          amount: total * 0.5,
          description: `Final Payment (50%) for ${quote.clientCompany || 'project'}`
        });
      } else if (paymentTerms === '2') {
        if (invoiceDetails.type === 'Deposit (50%)') {
          // Add interim and final payments
          remainingInvoices.push(
            {
              type: 'Interim Payment (25%)',
              amount: total * 0.25,
              description: `Interim Payment (25%) for ${quote.clientCompany || 'project'}`
            },
            {
              type: 'Final Payment (25%)',
              amount: total * 0.25,
              description: `Final Payment (25%) for ${quote.clientCompany || 'project'}`
            }
          );
        } else if (invoiceDetails.type === 'Interim Payment (25%)') {
          // Add just the final payment
          remainingInvoices.push({
            type: 'Final Payment (25%)',
            amount: total * 0.25,
            description: `Final Payment (25%) for ${quote.clientCompany || 'project'}`
          });
        }
      }
      
      // Create each remaining invoice
      for (const invoiceData of remainingInvoices) {
        const newInvoice = {
          ...invoiceDetails,
          id: Date.now().toString() + Math.floor(Math.random() * 1000),
          invoiceNumber: `INV-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
          amount: invoiceData.amount,
          type: invoiceData.type,
          description: invoiceData.description,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        await api.invoices.save(newInvoice);
      }
      
      if (remainingInvoices.length > 0) {
        addNotification(`Created ${remainingInvoices.length} additional invoice(s)`, 'success');
      } else {
        addNotification('No additional invoices needed for this payment schedule', 'info');
      }
      
      // Navigate to the invoices list
      navigate('/invoices');
    } catch (error) {
      console.error('Error creating invoice series:', error);
      addNotification(`Error: ${error.message}`, 'error');
    }
  };

  // Function to handle invoice creation for a specific payment stage
  const handleCreateInvoiceForStage = (stage) => {
    if (!quote) return;
    
    // Get all labor items from the quote
    const quoteLineItems = quote.lineItems || [];
    const laborItems = quoteLineItems.filter(item => 
      (item.description && (
        item.description.toLowerCase().includes('labour') || 
        item.description.toLowerCase().includes('labor')
      )) ||
      item.category === 'labour' ||
      item.isLabour === true
    );
    
    // Process the labor items for the invoice
    const processedLaborItems = laborItems.map(item => ({
      id: item.id || `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      description: item.description || 'Labor',
      amount: parseFloat(item.amount) || 0,
      quantity: parseFloat(item.quantity) || 1,
      isLabour: true
    }));
    
    // Calculate total labor amount
    const totalLaborAmount = laborItems.reduce(
      (sum, item) => sum + (parseFloat(item.amount) || 0), 
      0
    );
    
    // Calculate stage percentage based on the stage name
    let percentage = 1; // default to 100%
    if (stage.stage.includes('50%')) {
      percentage = 0.5;
    } else if (stage.stage.includes('25%')) {
      percentage = 0.25;
    }
    
    // Apply the percentage to each labor item
    const scaledLaborItems = processedLaborItems.map(item => ({
      ...item,
      amount: item.amount * percentage
    }));
    
    // Update invoice details for this stage
    setInvoiceDetails(prev => ({
      ...prev,
      amount: stage.amount,
      description: `${stage.description} for ${quote.client?.company || quote.clientCompany || 'project'}`,
      type: stage.stage,
      lineItems: scaledLaborItems,
      laborTotal: totalLaborAmount * percentage
    }));
    
    // Show notification
    addNotification(`Payment stage selected: ${stage.description} (Labor items included)`, 'info');
  };

  // Handle Apply CIS
  const handleApplyCIS = async () => {
    console.log("Starting CIS application...");
    
    // Check if CIS has already been applied
    if (invoiceDetails.cisApplied) {
      addNotification('CIS has already been applied to this invoice', 'info');
      return;
    }

    // Create a copy of the invoice details to work with
    const updatedInvoiceDetails = { ...invoiceDetails };
    console.log("Invoice details:", updatedInvoiceDetails);
    
    // Ensure lineItems exists
    if (!updatedInvoiceDetails.lineItems) {
      updatedInvoiceDetails.lineItems = [];
    }
    
    try {
      // If we have a quote ID, fetch the quote data from the server
      if (updatedInvoiceDetails.quoteId) {
        console.log("Fetching quote with ID:", updatedInvoiceDetails.quoteId);
        const quoteData = await api.quotes.getById(updatedInvoiceDetails.quoteId);
        console.log("Raw quote data from server:", quoteData);
        
        // DIRECTLY use selectedItems without fallback - this is what the server stores
        const quoteLineItems = quoteData.selectedItems || [];
        console.log("Quote line items from selectedItems:", quoteLineItems);
        
        if (quoteLineItems.length > 0) {
          // Log the first item to see its structure
          console.log("Sample item structure:", quoteLineItems[0]);
          
          // Find labor items using more flexible criteria
          const quoteLaborItems = quoteLineItems.filter(item => 
            (item.description && (
              item.description.toLowerCase().includes('labour') || 
              item.description.toLowerCase().includes('labor')
            )) ||
            item.category === 'labour' ||
            item.isLabour === true ||
            // Add additional checks
            (item.type && item.type.toLowerCase() === 'labour') ||
            (item.name && (
              item.name.toLowerCase().includes('labour') || 
              item.name.toLowerCase().includes('labor')
            ))
          );
          
          console.log("Labor items found:", quoteLaborItems);
          
          // If we found labor items in the server data
          if (quoteLaborItems.length > 0) {
            // Calculate total labor amount
            const totalLaborAmount = quoteLaborItems.reduce(
              (sum, item) => sum + (parseFloat(item.amount) || 0), 
              0
            );
            
            console.log("Total labor amount:", totalLaborAmount);
            
            // Add a single labor line item
            updatedInvoiceDetails.lineItems.push({
              id: `labor-${Date.now()}`,
              description: "Labor charges (from server data)",
              amount: totalLaborAmount,
              quantity: 1,
              isLabour: true
            });
            
            // Calculate 20% deduction
            const cisDeduction = totalLaborAmount * 0.2;
            
            // Add CIS line item
            updatedInvoiceDetails.lineItems.push({
              id: `cis-${Date.now()}`,
              description: "CIS Deduction (20%)",
              amount: -cisDeduction,
              quantity: 1,
              type: 'cis'
            });
            
            // Recalculate the total amount
            updatedInvoiceDetails.amount = updatedInvoiceDetails.lineItems.reduce(
              (sum, item) => sum + (parseFloat(item.amount) || 0), 
              0
            );
            
            // Mark CIS as applied and store the deduction amount
            updatedInvoiceDetails.cisApplied = true;
            updatedInvoiceDetails.cisDeduction = cisDeduction;
            
            // Update the invoice details
            setInvoiceDetails(updatedInvoiceDetails);
            addNotification(`CIS deduction of £${cisDeduction.toFixed(2)} applied to labor charges from server data`, 'success');
            return;
          } else {
            console.log("No labor items found in quote line items");
          }
        } else {
          console.log("No line items found in quote data");
        }
      }
      
      // Rest of your existing function...
      
      // Fall back to checking existing line items if server data doesn't have labor items
      const laborItems = updatedInvoiceDetails.lineItems.filter(item => 
        (item.description && (
          item.description.toLowerCase().includes('labour') || 
          item.description.toLowerCase().includes('labor')
        )) ||
        item.category === 'labour' ||
        item.isLabour === true
      );
      
      // If no labor items found but we have a laborTotal, add a generic labor item
      if (laborItems.length === 0) {
        if (updatedInvoiceDetails.laborTotal && updatedInvoiceDetails.laborTotal > 0) {
          // Add a generic labor item
          updatedInvoiceDetails.lineItems.push({
            id: `labor-${Date.now()}`,
            description: "Labor charge",
            amount: updatedInvoiceDetails.laborTotal,
            quantity: 1,
            isLabour: true
          });
          
          // Calculate CIS deduction
          const cisDeduction = updatedInvoiceDetails.laborTotal * 0.2;
          
          // Add CIS line item
          updatedInvoiceDetails.lineItems.push({
            id: `cis-${Date.now()}`,
            description: "CIS Deduction (20%)",
            amount: -cisDeduction,
            quantity: 1,
            type: 'cis'
          });
          
          // Update total amount
          updatedInvoiceDetails.amount = updatedInvoiceDetails.lineItems.reduce(
            (sum, item) => sum + (parseFloat(item.amount) || 0), 
            0
          );
          
          // Mark CIS as applied and store the deduction amount
          updatedInvoiceDetails.cisApplied = true;
          updatedInvoiceDetails.cisDeduction = cisDeduction;
          
          setInvoiceDetails(updatedInvoiceDetails);
          addNotification(`CIS deduction of £${cisDeduction.toFixed(2)} applied to labor charges`, 'success');
          return;
        }
        
        // No labor items found and no labor total
        addNotification('No labor charges found. Please add a line item with "labour" in the description or mark items as labor.', 'warning');
        return;
      }
      
      // For existing labor items, apply CIS
      const totalLaborAmount = laborItems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
      const cisDeduction = totalLaborAmount * 0.2;
      
      // Add CIS line item
      updatedInvoiceDetails.lineItems.push({
        id: `cis-${Date.now()}`,
        description: "CIS Deduction (20%)",
        amount: -cisDeduction,
        quantity: 1,
        type: 'cis'
      });
      
      // Update total amount
      updatedInvoiceDetails.amount = updatedInvoiceDetails.lineItems.reduce(
        (sum, item) => sum + (parseFloat(item.amount) || 0), 
        0
      );
      
      // Mark CIS as applied and store the deduction amount
      updatedInvoiceDetails.cisApplied = true;
      updatedInvoiceDetails.cisDeduction = cisDeduction;
      
      // Update the invoice details
      setInvoiceDetails(updatedInvoiceDetails);
      addNotification(`CIS deduction of £${cisDeduction.toFixed(2)} applied to labor charges`, 'success');
    } catch (error) {
      console.error('Error applying CIS:', error);
      addNotification(`Error applying CIS: ${error.message}`, 'error');
    }
  };

  if (isLoadingInvoice || (quoteId && isLoadingQuote)) {
    return <Loading message="Loading data..." />;
  }
  
  return (
    <div className="main-content">
      <div className="page-header">
        <h1 className="page-title">Invoice Management</h1>
      </div>
      
      <div className="tabs-container">
        <Tabs
          tabs={[
            { id: 'create', label: 'Create Invoice' },
            { id: 'list', label: 'Invoice List' }
          ]}
          activeTab={activeTab}
          onChange={(tab) => {
            if (tab === 'list') {
              navigate('/invoices');
            } else {
              setActiveTab(tab);
            }
          }}
          variant="underline"
          className="invoice-tabs"
        />
      </div>
      
      <div className="invoice-layout">
        {/* Left column - Form */}
        <div className="invoice-form-panel">
          <div className="card">
            <div className="card-body">
              <form onSubmit={handleSubmit}>
                {/* Invoice Type */}
                <div className="form-field">
                  <label className="form-label">Invoice Type</label>
                  <select
                    className="form-select"
                    value={invoiceDetails.type || 'Deposit (50%)'}
                    onChange={(e) => setInvoiceDetails({...invoiceDetails, type: e.target.value})}
                  >
                    <option value="Deposit (50%)">Deposit (50%)</option>
                    <option value="Interim Payment (25%)">Interim Payment (25%)</option>
                    <option value="Final Payment (25%)">Final Payment (25%)</option>
                    <option value="Full Payment">Full Payment</option>
                    <option value="Custom">Custom</option>
                  </select>
                </div>
                
                {/* Invoice/Due Date */}
                <div className="form-row">
                  <div className="form-field">
                    <label className="form-label">Invoice Date</label>
                    <input
                      type="date"
                      className="form-input"
                      value={invoiceDetails.invoiceDate || ''}
                      onChange={(e) => setInvoiceDetails({...invoiceDetails, invoiceDate: e.target.value})}
                      required
                    />
                  </div>
                  
                  <div className="form-field">
                    <label className="form-label">Due Date</label>
                    <input
                      type="date"
                      className="form-input"
                      value={invoiceDetails.dueDate || ''}
                      onChange={(e) => setInvoiceDetails({...invoiceDetails, dueDate: e.target.value})}
                      required
                    />
                  </div>
                </div>
                
                {/* Additional Notes */}
                <div className="form-field">
                  <label className="form-label">Additional Notes</label>
                  <textarea
                    className="form-textarea"
                    rows="4"
                    value={invoiceDetails.notes || ''}
                    onChange={(e) => setInvoiceDetails({...invoiceDetails, notes: e.target.value})}
                  ></textarea>
                </div>
                
                {/* Description Details */}
                <div className="form-field">
                  <label className="form-label">Description Details</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. for staircase, for balustrading, etc."
                    value={invoiceDetails.description || ''}
                    onChange={(e) => setInvoiceDetails({...invoiceDetails, description: e.target.value})}
                    required
                  />
                </div>
                
                {/* Amount */}
                <div className="form-field">
                  <label className="form-label">Amount (£)</label>
                  <input
                    type="number"
                    className="form-input"
                    step="0.01"
                    min="0"
                    value={invoiceDetails.amount || ''}
                    onChange={(e) => setInvoiceDetails({...invoiceDetails, amount: parseFloat(e.target.value) || 0})}
                    required
                  />
                </div>
                
                <div className="form-actions">
                  <Button
                    type="button"
                    variant="green"
                    onClick={handleSaveInvoice}
                  >
                    Generate Invoice
                  </Button>
                  
                  {invoiceDetails.quoteId && invoiceDetails.quoteTotal > 0 && (
                    <Button
                      type="button"
                      variant="primary"
                      onClick={handleCreateSeries}
                      style={{ marginLeft: '10px' }}
                    >
                      Create All Invoices
                    </Button>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>
        
        {/* Right column - Preview */}
        <div className="invoice-preview-panel">
          {/* Action buttons */}
          <div className="card action-card">
            <div className="card-body">
              <div className="action-buttons">
                <Link to="/quotes" className="btn btn-secondary">
                  <span className="btn-icon">←</span>
                  Quotes
                </Link>
                
                <Button
                  variant="primary"
                  onClick={handleSaveInvoice}
                >
                  <span className="btn-icon">💾</span>
                  Save Invoice
                </Button>
                
                <Button
                  variant="secondary"
                  onClick={handleExportPDF}
                >
                  <span className="btn-icon">📄</span>
                  Export PDF
                </Button>
                
                <Button
                  variant="secondary"
                  onClick={handleEmailInvoice}
                >
                  <span className="btn-icon">✉️</span>
                  Email Invoice
                </Button>
                
                <Button
                  variant="green"
                  onClick={handleMarkAsPaid}
                  disabled={invoiceDetails.status === 'paid'}
                >
                  <span className="btn-icon">✓</span>
                  Paid
                </Button>
                
                <Button
                  variant="info"
                  onClick={handleApplyCIS}
                  disabled={invoiceDetails.cisApplied}
                >
                  <span className="btn-icon">🔧</span>
                  Apply CIS
                </Button>
                
                <Button
                  variant="danger"
                >
                  <span className="btn-icon">🗑</span>
                  Delete Invoice
                </Button>
                
                <Button
                  variant="secondary"
                  onClick={() => navigate('/settings')}
                >
                  <span className="btn-icon">⚙️</span>
                  Settings
                </Button>
              </div>
            </div>
          </div>
          
          {/* Invoice Preview */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Invoice Preview</h2>
            </div>
            <div className="card-body">
              <InvoicePreview 
                invoice={invoiceDetails} 
                settings={settings} 
                printMode={false} 
              />
            </div>
          </div>
          
          {/* Connected Quote */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Connected Quote</h2>
            </div>
            <div className="card-body">
              {quote ? (
                <div className="connected-quote-details">
                  <div className="quote-info-grid">
                    <div className="quote-info-item">
                      <span className="info-label">Client:</span>
                      <span className="info-value">{quote.client?.name || quote.clientName || 'Unnamed Client'}</span>
                    </div>
                    {(quote.client?.company || quote.clientCompany) && (
                      <div className="quote-info-item">
                        <span className="info-label">Company:</span>
                        <span className="info-value">{quote.client?.company || quote.clientCompany}</span>
                      </div>
                    )}
                    <div className="quote-info-item">
                      <span className="info-label">Quote ID:</span>
                      <span className="info-value">{quote.id}</span>
                    </div>
                    <div className="quote-info-item">
                      <span className="info-label">Total:</span>
                      <span className="info-value">
                        £{(quote.grandTotal || quoteTotal || 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="quote-actions">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => navigate(`/quotes/${quote.id}`)}
                    >
                      View Quote
                    </Button>
                  </div>
                </div>
              ) : (
                <p>
                  {quoteId ? 'Loading quote information...' : 'No quote connected. Please go back to quotes page and select a quote to invoice.'}
                </p>
              )}
            </div>
          </div>
          
          {/* Payment Schedule */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Payment Schedule</h2>
            </div>
            <div className="card-body">
              {quote ? (
                <PaymentSchedule 
                  quote={quote} 
                  onInvoiceCreate={handleCreateInvoiceForStage} 
                />
              ) : (
                <table className="table">
                  <thead>
                    <tr>
                      <th>Stage</th>
                      <th>Amount</th>
                      <th>Due When</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td colSpan="5">No payment schedule available</td>
                    </tr>
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceBuilder;