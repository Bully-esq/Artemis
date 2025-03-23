import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { format, parseISO, isAfter } from 'date-fns';

// API and hooks
import api from '../services/api';
import { useAppContext } from '../context/AppContext';

// Components
import PageLayout from '../components/common/PageLayout';
import Button from '../components/common/Button';
import Loading from '../components/common/Loading';
import Dialog from '../components/common/Dialog';

/**
 * InvoiceList component displays all invoices with filtering and actions
 */
const InvoiceList = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { addNotification } = useAppContext();
  
  // Local state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [confirmPaid, setConfirmPaid] = useState(null);
  
  // Fetch invoices with React Query
  const { data: invoices, isLoading, isError, error } = useQuery(
    'invoices',
    api.invoices.getAll,
    {
      onError: (err) => {
        addNotification(`Failed to load invoices: ${err.message}`, 'error');
      }
    }
  );
  
  // Delete invoice mutation
  const deleteInvoiceMutation = useMutation(
    (id) => api.invoices.delete(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('invoices');
        addNotification('Invoice deleted successfully', 'success');
        setConfirmDelete(null);
      },
      onError: (err) => {
        addNotification(`Failed to delete invoice: ${err.message}`, 'error');
      }
    }
  );
  
  // Mark as paid mutation
  const markAsPaidMutation = useMutation(
    (invoice) => {
      const updatedInvoice = {
        ...invoice,
        status: 'paid',
        paidAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      return api.invoices.save(updatedInvoice);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('invoices');
        addNotification('Invoice marked as paid', 'success');
        setConfirmPaid(null);
      },
      onError: (err) => {
        addNotification(`Failed to mark invoice as paid: ${err.message}`, 'error');
      }
    }
  );
  
  // Filter and sort invoices
  const filteredInvoices = React.useMemo(() => {
    if (!invoices) return [];
    
    return invoices
      .filter(invoice => {
        // Search filter
        const searchFields = [
          invoice.invoiceNumber,
          invoice.clientName,
          invoice.clientCompany,
          invoice.description
        ].filter(Boolean).join(' ').toLowerCase();
        
        const matchesSearch = !searchTerm || searchFields.includes(searchTerm.toLowerCase());
        
        // Status filter
        let matchesStatus = true;
        const today = new Date();
        const dueDate = invoice.dueDate ? parseISO(invoice.dueDate) : null;
        
        if (statusFilter === 'paid') {
          matchesStatus = invoice.status === 'paid';
        } else if (statusFilter === 'overdue') {
          matchesStatus = invoice.status !== 'paid' && dueDate && isAfter(today, dueDate);
        } else if (statusFilter === 'pending') {
          matchesStatus = invoice.status !== 'paid' && (!dueDate || !isAfter(today, dueDate));
        }
        
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        // Sort by created date (newest first)
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
  }, [invoices, searchTerm, statusFilter]);
  
  // Handle delete confirmation
  const handleDelete = (invoice) => {
    setConfirmDelete(invoice);
  };
  
  // Handle marking as paid confirmation
  const handleMarkAsPaid = (invoice) => {
    setConfirmPaid(invoice);
  };
  
  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount);
  };
  
  // Get status badge style
  const getStatusBadge = (invoice) => {
    const today = new Date();
    const dueDate = invoice.dueDate ? parseISO(invoice.dueDate) : null;
    
    if (invoice.status === 'paid') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          Paid
        </span>
      );
    } else if (dueDate && isAfter(today, dueDate)) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          Overdue
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          Pending
        </span>
      );
    }
  };
  
  // Action buttons for header
  const headerActions = (
    <Button
      variant="primary"
      onClick={() => navigate('/invoices/new')}
    >
      <svg 
        className="-ml-1 mr-2 h-5 w-5" 
        xmlns="http://www.w3.org/2000/svg" 
        viewBox="0 0 20 20" 
        fill="currentColor"
      >
        <path 
          fillRule="evenodd" 
          d="M10 3a1 1 0 00-1 1v5H4a1 1 0 100 2h5v5a1 1 0 102 0v-5h5a1 1 0 100-2h-5V4a1 1 0 00-1-1z" 
          clipRule="evenodd" 
        />
      </svg>
      New Invoice
    </Button>
  );
  
  // Show loading state
  if (isLoading) {
    return (
      <PageLayout title="Invoices" actions={headerActions}>
        <Loading message="Loading invoices..." />
      </PageLayout>
    );
  }
  
  // Show error state
  if (isError) {
    return (
      <PageLayout title="Invoices" actions={headerActions}>
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">
                Error loading invoices: {error.message || 'Unknown error'}
              </p>
            </div>
          </div>
        </div>
        
        <div className="mt-4">
          <Button variant="primary" onClick={() => queryClient.invalidateQueries('invoices')}>
            Retry
          </Button>
        </div>
      </PageLayout>
    );
  }
  
  return (
    <PageLayout title="Invoices" actions={headerActions}>
      {/* Search and filter section */}
      <div className="bg-white rounded-lg shadow mb-6 p-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          {/* Search box */}
          <div className="relative rounded-md shadow-sm md:w-1/3">
            <input
              type="text"
              className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
              placeholder="Search invoices..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
          
          {/* Status filter */}
          <div className="flex flex-wrap gap-2">
            <button
              className={`px-3 py-2 rounded-md text-sm font-medium ${
                statusFilter === 'all' 
                  ? 'bg-blue-100 text-blue-800' 
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
              onClick={() => setStatusFilter('all')}
            >
              All
            </button>
            <button
              className={`px-3 py-2 rounded-md text-sm font-medium ${
                statusFilter === 'pending' 
                  ? 'bg-blue-100 text-blue-800' 
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
              onClick={() => setStatusFilter('pending')}
            >
              Pending
            </button>
            <button
              className={`px-3 py-2 rounded-md text-sm font-medium ${
                statusFilter === 'overdue' 
                  ? 'bg-red-100 text-red-800' 
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
              onClick={() => setStatusFilter('overdue')}
            >
              Overdue
            </button>
            <button
              className={`px-3 py-2 rounded-md text-sm font-medium ${
                statusFilter === 'paid' 
                  ? 'bg-green-100 text-green-800' 
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
              onClick={() => setStatusFilter('paid')}
            >
              Paid
            </button>
          </div>
        </div>
      </div>
      
      {/* Invoices table */}
      <div className="flex flex-col">
        <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
            <div className="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Invoice
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Client
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Date
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Amount
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Status
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredInvoices.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-4 text-center text-sm text-gray-500">
                        No invoices found matching your criteria
                      </td>
                    </tr>
                  ) : (
                    filteredInvoices.map((invoice) => (
                      <tr key={invoice.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {invoice.invoiceNumber || `INV-${invoice.id.substring(0, 6)}`}
                          </div>
                          {invoice.description && (
                            <div className="text-sm text-gray-500 truncate max-w-xs">
                              {invoice.description}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {invoice.clientName || 'Unknown Client'}
                          </div>
                          {invoice.clientCompany && (
                            <div className="text-sm text-gray-500">
                              {invoice.clientCompany}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {invoice.invoiceDate ? format(parseISO(invoice.invoiceDate), 'dd/MM/yyyy') : 'N/A'}
                          </div>
                          <div className="text-sm text-gray-500">
                            Due: {invoice.dueDate ? format(parseISO(invoice.dueDate), 'dd/MM/yyyy') : 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(invoice.amount || 0)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(invoice)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => navigate(`/invoices/${invoice.id}`)}
                            >
                              View
                            </Button>
                            
                            {invoice.status !== 'paid' && (
                              <Button
                                variant="green"
                                size="sm"
                                onClick={() => handleMarkAsPaid(invoice)}
                              >
                                Mark Paid
                              </Button>
                            )}
                            
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => handleDelete(invoice)}
                            >
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      
      {/* Delete confirmation dialog */}
      {confirmDelete && (
        <Dialog
          isOpen={true}
          title="Delete Invoice"
          onClose={() => setConfirmDelete(null)}
          footer={
            <div className="flex justify-end gap-2">
              <Button 
                variant="secondary" 
                onClick={() => setConfirmDelete(null)}
              >
                Cancel
              </Button>
              <Button 
                variant="danger" 
                onClick={() => deleteInvoiceMutation.mutate(confirmDelete.id)}
                isLoading={deleteInvoiceMutation.isLoading}
              >
                Delete Invoice
              </Button>
            </div>
          }
        >
          <p className="mb-4">
            Are you sure you want to delete invoice{' '}
            <span className="font-bold">
              {confirmDelete.invoiceNumber || `#${confirmDelete.id.substring(0, 6)}`}
            </span>?
          </p>
          <p className="text-sm text-gray-500">
            This action cannot be undone and will permanently remove this invoice.
          </p>
        </Dialog>
      )}
      
      {/* Mark as paid confirmation dialog */}
      {confirmPaid && (
        <Dialog
          isOpen={true}
          title="Mark Invoice as Paid"
          onClose={() => setConfirmPaid(null)}
          footer={
            <div className="flex justify-end gap-2">
              <Button 
                variant="secondary" 
                onClick={() => setConfirmPaid(null)}
              >
                Cancel
              </Button>
              <Button 
                variant="green" 
                onClick={() => markAsPaidMutation.mutate(confirmPaid)}
                isLoading={markAsPaidMutation.isLoading}
              >
                Mark as Paid
              </Button>
            </div>
          }
        >
          <p className="mb-4">
            Are you sure you want to mark invoice{' '}
            <span className="font-bold">
              {confirmPaid.invoiceNumber || `#${confirmPaid.id.substring(0, 6)}`}
            </span>
            {' '}as paid?
          </p>
          <p className="mb-4">
            Amount: <span className="font-bold">{formatCurrency(confirmPaid.amount || 0)}</span>
          </p>
          <p className="text-sm text-gray-500">
            This will record today's date as the payment date.
          </p>
        </Dialog>
      )}
    </PageLayout>
  );
};

export default InvoiceList;