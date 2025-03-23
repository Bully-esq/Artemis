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
      enabled: !!quoteId && !id, // Only fetch when creating a new invoice from a quote
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
    <div className="p-4 bg-gray-100 min-h-screen">
      <div className="container mx-auto">
        <h1 className="text-2xl font-bold mb-4">Invoice Management</h1>
        
        <div className="flex mb-4">
          {/* Main tabs */}
          <div className="flex-grow">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex">
                <button
                  className={`mr-6 py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'create' 
                      ? 'border-blue-500 text-blue-600' 
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                  onClick={() => setActiveTab('create')}
                >
                  Create Invoice
                </button>
                <button
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'list' 
                      ? 'border-blue-500 text-blue-600' 
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                  onClick={() => navigate('/invoices')}
                >
                  Invoice List
                </button>
              </nav>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Left column - Form */}
          <div className="w-full lg:w-1/2 bg-white rounded-lg shadow">
            <div className="p-4">
              <form onSubmit={handleSubmit}>
                {/* Invoice Type */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Invoice Type
                  </label>
                  <select
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
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
                <div className="flex flex-wrap -mx-2 mb-4">
                  <div className="w-full md:w-1/2 px-2 mb-4 md:mb-0">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Invoice Date
                    </label>
                    <input
                      type="date"
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      value={invoiceDetails.invoiceDate || ''}
                      onChange={(e) => setInvoiceDetails({...invoiceDetails, invoiceDate: e.target.value})}
                      required
                    />
                  </div>
                  
                  <div className="w-full md:w-1/2 px-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Due Date
                    </label>
                    <input
                      type="date"
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      value={invoiceDetails.dueDate || ''}
                      onChange={(e) => setInvoiceDetails({...invoiceDetails, dueDate: e.target.value})}
                      required
                    />
                  </div>
                </div>
                
                {/* Additional Notes */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Additional Notes
                  </label>
                  <textarea
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    rows="4"
                    value={invoiceDetails.notes || ''}
                    onChange={(e) => setInvoiceDetails({...invoiceDetails, notes: e.target.value})}
                  ></textarea>
                </div>
                
                {/* Description Details */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description Details
                  </label>
                  <input
                    type="text"
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="e.g. for staircase, for balustrading, etc."
                    value={invoiceDetails.description || ''}
                    onChange={(e) => setInvoiceDetails({...invoiceDetails, description: e.target.value})}
                    required
                  />
                </div>
                
                {/* Amount */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount (£)
                  </label>
                  <input
                    type="number"
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    step="0.01"
                    min="0"
                    value={invoiceDetails.amount || ''}
                    onChange={(e) => setInvoiceDetails({...invoiceDetails, amount: parseFloat(e.target.value) || 0})}
                    required
                  />
                </div>
                
                <div className="mt-4">
                  <Button
                    type="button"
                    variant="green"
                    onClick={handleSaveInvoice}
                    className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  >
                    Generate Invoice
                  </Button>
                </div>
              </form>
            </div>
          </div>
          
          {/* Right column - Preview */}
          <div className="w-full lg:w-1/2 flex flex-col gap-4">
            {/* Action buttons */}
            <div className="bg-white rounded-lg shadow p-4 flex flex-wrap gap-2">
              <Link to="/quotes" className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Quotes
              </Link>
              
              <button
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                onClick={handleSaveInvoice}
              >
                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
                Save Invoice
              </button>
              
              <button
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                onClick={handleExportPDF}
              >
                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Export PDF
              </button>
              
              <button
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                onClick={handleEmailInvoice}
              >
                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Email Invoice
              </button>
              
              <button
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                onClick={handleMarkAsPaid}
                disabled={invoiceDetails.status === 'paid'}
              >
                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Paid
              </button>
              
              <button
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete Invoice
              </button>
              
              <button
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                onClick={() => navigate('/settings')}
              >
                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Settings
              </button>
            </div>
            
            {/* Invoice Preview */}
            <div className="bg-white rounded-lg shadow flex-1">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-medium">Invoice Preview</h2>
              </div>
              <div className="p-4 flex items-center justify-center h-96 text-gray-500">
                <p>No invoice selected. Generate or select an invoice to preview.</p>
              </div>
            </div>
            
            {/* Connected Quote */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-medium">Connected Quote</h2>
              </div>
              <div className="p-4">
                <p className="text-gray-700">
                  No quote connected. Please go back to quotes page and select a quote to invoice.
                </p>
              </div>
            </div>
            
            {/* Payment Schedule */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-medium">Payment Schedule</h2>
              </div>
              <div className="p-4">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stage</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due When</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    <tr>
                      <td className="px-4 py-2" colSpan="5">No payment schedule available</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceBuilder;