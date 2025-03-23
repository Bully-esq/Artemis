import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from 'react-query';
import { useAppContext } from '../../context/AppContext';
import api from '../../services/api';

// Components
import PageLayout from '../../components/common/PageLayout';
import Button from '../../components/common/Button';
import Loading from '../../components/common/Loading';

const InvoiceBuilder = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const quoteId = searchParams.get('quoteId');
  const { addNotification } = useAppContext();
  
  // Local state
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
    quoteId: quoteId || ''
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
  
  if (isLoadingInvoice || (quoteId && isLoadingQuote)) {
    return (
      <PageLayout title={id ? 'Edit Invoice' : 'New Invoice'}>
        <Loading message="Loading data..." />
      </PageLayout>
    );
  }
  
  return (
    <PageLayout 
      title={id ? 'Edit Invoice' : 'New Invoice'}
      actions={
        <Button variant="secondary" onClick={() => navigate('/invoices')}>
          Back to Invoices
        </Button>
      }
    >
      <div className="bg-white p-6 rounded-md shadow">
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Invoice Number
              </label>
              <input
                type="text"
                className="w-full p-2 border border-gray-300 rounded-md"
                value={invoiceDetails.invoiceNumber || ''}
                onChange={(e) => setInvoiceDetails({...invoiceDetails, invoiceNumber: e.target.value})}
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Client Name
              </label>
              <input
                type="text"
                className="w-full p-2 border border-gray-300 rounded-md"
                value={invoiceDetails.clientName || ''}
                onChange={(e) => setInvoiceDetails({...invoiceDetails, clientName: e.target.value})}
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Company
              </label>
              <input
                type="text"
                className="w-full p-2 border border-gray-300 rounded-md"
                value={invoiceDetails.clientCompany || ''}
                onChange={(e) => setInvoiceDetails({...invoiceDetails, clientCompany: e.target.value})}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                className="w-full p-2 border border-gray-300 rounded-md"
                value={invoiceDetails.clientEmail || ''}
                onChange={(e) => setInvoiceDetails({...invoiceDetails, clientEmail: e.target.value})}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone
              </label>
              <input
                type="text"
                className="w-full p-2 border border-gray-300 rounded-md"
                value={invoiceDetails.clientPhone || ''}
                onChange={(e) => setInvoiceDetails({...invoiceDetails, clientPhone: e.target.value})}
              />
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address
              </label>
              <textarea
                className="w-full p-2 border border-gray-300 rounded-md"
                rows="3"
                value={invoiceDetails.clientAddress || ''}
                onChange={(e) => setInvoiceDetails({...invoiceDetails, clientAddress: e.target.value})}
              ></textarea>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Invoice Date
              </label>
              <input
                type="date"
                className="w-full p-2 border border-gray-300 rounded-md"
                value={invoiceDetails.invoiceDate || ''}
                onChange={(e) => setInvoiceDetails({...invoiceDetails, invoiceDate: e.target.value})}
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Due Date
              </label>
              <input
                type="date"
                className="w-full p-2 border border-gray-300 rounded-md"
                value={invoiceDetails.dueDate || ''}
                onChange={(e) => setInvoiceDetails({...invoiceDetails, dueDate: e.target.value})}
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount
              </label>
              <input
                type="number"
                className="w-full p-2 border border-gray-300 rounded-md"
                value={invoiceDetails.amount || ''}
                onChange={(e) => setInvoiceDetails({...invoiceDetails, amount: parseFloat(e.target.value) || 0})}
                step="0.01"
                min="0"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                className="w-full p-2 border border-gray-300 rounded-md"
                value={invoiceDetails.status || 'pending'}
                onChange={(e) => setInvoiceDetails({...invoiceDetails, status: e.target.value})}
                required
              >
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
              </select>
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                className="w-full p-2 border border-gray-300 rounded-md"
                rows="3"
                value={invoiceDetails.description || ''}
                onChange={(e) => setInvoiceDetails({...invoiceDetails, description: e.target.value})}
                required
              ></textarea>
            </div>
          </div>
          
          <div className="border-t border-gray-200 pt-4">
            <div className="flex justify-end space-x-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => navigate('/invoices')}
              >
                Cancel
              </Button>
              
              {id && (
                <Button
                  type="button"
                  variant="success"
                  onClick={handleMarkAsPaid}
                  disabled={invoiceDetails.status === 'paid'}
                >
                  Mark as Paid
                </Button>
              )}
              
              <Button
                type="submit"
                variant="primary"
              >
                Save Invoice
              </Button>
            </div>
          </div>
        </form>
      </div>
    </PageLayout>
  );
};

export default InvoiceBuilder;