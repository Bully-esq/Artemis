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

const InvoiceBuilder = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const quoteId = searchParams.get('quoteId');
  const { addNotification, settings } = useAppContext();
  
  // Local state
  const [activeTab, setActiveTab] = useState('create');
  const [invoiceDetails, setInvoiceDetails] = useState({
    invoiceNumber: '',
    clientName: '',
    clientCompany: '',
    clientEmail: '',
    clientPhone: '',
    clientAddress: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    amount: 0,
    description: '',
    status: 'pending',
    quoteId: quoteId || '',
    type: 'Deposit (50%)'
  });
  
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
          // Pre-fill invoice details from quote
          setInvoiceDetails(prev => ({
            ...prev,
            clientName: data.clientName || '',
            clientCompany: data.clientCompany || '',
            clientEmail: data.clientEmail || '',
            clientPhone: data.clientPhone || '',
            clientAddress: data.clientAddress || '',
            description: `Invoice for ${data.name || 'quote'}`,
            quoteId: data.id
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
            <div className="card-body invoice-preview-placeholder">
              <p>No invoice selected. Generate or select an invoice to preview.</p>
            </div>
          </div>
          
          {/* Connected Quote */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Connected Quote</h2>
            </div>
            <div className="card-body">
              <p>
                No quote connected. Please go back to quotes page and select a quote to invoice.
              </p>
            </div>
          </div>
          
          {/* Payment Schedule */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Payment Schedule</h2>
            </div>
            <div className="card-body">
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceBuilder;