import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import { useAppContext } from '../context/AppContext';

// Import components
import PageLayout from '../components/common/PageLayout';
import Button from '../components/common/Button';
import Loading from '../components/common/Loading';
import Dialog from '../components/common/Dialog';
import FormField from '../components/common/FormField';

// Import services & utilities
import api from '../services/api';
import { formatDate } from '../utils/formatters';

const Invoices = () => {
  const navigate = useNavigate();
  const { addNotification } = useAppContext();
  
  // Local state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showQuoteSelector, setShowQuoteSelector] = useState(false);
  const [selectedQuoteId, setSelectedQuoteId] = useState(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState(null);
  
  // Fetch invoices
  const { 
    data: invoices,
    isLoading: isLoadingInvoices,
    isError: invoicesError,
    refetch: refetchInvoices
  } = useQuery('invoices', api.invoices.getAll, {
    onError: (error) => {
      addNotification(`Error loading invoices: ${error.message}`, 'error');
    }
  });
  
  // Fetch quotes for the quote selector dialog
  const {
    data: quotes,
    isLoading: isLoadingQuotes
  } = useQuery('quotes', api.quotes.getAll, {
    enabled: showQuoteSelector,
    onError: (error) => {
      addNotification(`Error loading quotes: ${error.message}`, 'error');
    }
  });
  
  // Filter invoices based on search term and status
  const filteredInvoices = React.useMemo(() => {
    if (!invoices) return [];
    
    return invoices.filter(invoice => {
      // Search filter
      const searchMatch = searchTerm === '' || 
        (invoice.invoiceNumber && invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (invoice.clientName && invoice.clientName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (invoice.clientCompany && invoice.clientCompany.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (invoice.description && invoice.description.toLowerCase().includes(searchTerm.toLowerCase()));
      
      // Status filter
      let statusMatch = true;
      if (statusFilter !== 'all') {
        if (statusFilter === 'paid') {
          statusMatch = invoice.status === 'paid';
        } else if (statusFilter === 'pending') {
          statusMatch = invoice.status === 'pending' && new Date(invoice.dueDate) >= new Date();
        } else if (statusFilter === 'overdue') {
          statusMatch = invoice.status === 'pending' && new Date(invoice.dueDate) < new Date();
        }
      }
      
      return searchMatch && statusMatch;
    });
  }, [invoices, searchTerm, statusFilter]);

  // Handle invoice creation from a quote
  const handleCreateFromQuote = (quoteId) => {
    setShowQuoteSelector(false);
    if (quoteId) {
      navigate(`/invoices/new?quoteId=${quoteId}`);
    }
  };

  // Handle invoice deletion
  const handleDeleteClick = (invoice) => {
    setInvoiceToDelete(invoice);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!invoiceToDelete) return;
    
    try {
      await api.invoices.delete(invoiceToDelete.id);
      addNotification('Invoice deleted successfully', 'success');
      refetchInvoices();
    } catch (err) {
      addNotification(`Error deleting invoice: ${err.message}`, 'error');
    } finally {
      setIsDeleteDialogOpen(false);
      setInvoiceToDelete(null);
    }
  };

  // Action buttons for the page header
  const actionButtons = (
    <Button 
      variant="primary"
      onClick={() => setShowQuoteSelector(true)}
    >
      <svg className="w-5 h-5 mr-2 -ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
      </svg>
      New Invoice
    </Button>
  );

  // Format currency function
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount);
  };

  // Loading state
  if (isLoadingInvoices) {
    return (
      <PageLayout title="Invoices" actions={actionButtons}>
        <Loading message="Loading invoices..." />
      </PageLayout>
    );
  }
  
  // Error state
  if (invoicesError) {
    return (
      <PageLayout title="Invoices" actions={actionButtons}>
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded shadow">
          <h3 className="text-red-800 font-medium">Error loading invoices</h3>
          <p className="text-red-700">Please try refreshing the page</p>
          <Button 
            variant="primary" 
            className="mt-3"
            onClick={() => refetchInvoices()}
          >
            Retry
          </Button>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="Invoices" actions={actionButtons}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Invoice Management</h1>
        <p className="text-gray-600">Create and manage invoices for your clients</p>
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="quick-actions">
          <div onClick={() => setShowQuoteSelector(true)} className="quick-action-btn">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>New Invoice</span>
          </div>
          
          <div onClick={() => navigate('/quotes')} className="quick-action-btn">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Manage Quotes</span>
          </div>
          
          <div onClick={() => navigate('/settings')} className="quick-action-btn">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>Invoice Settings</span>
          </div>
        </div>
      </div>

      {/* Dashboard Stats */}
      <div className="dashboard-stats mb-6">
        <div className="stat-card">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100 text-green-600 mr-4">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-gray-500 text-sm font-medium">Total Invoiced</p>
              <p className="stat-number">
                {formatCurrency(invoices?.reduce((sum, invoice) => sum + (parseFloat(invoice.amount) || 0), 0) || 0)}
              </p>
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-4">{invoices?.length || 0} invoices total</p>
        </div>

        <div className="stat-card">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 text-blue-600 mr-4">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <p className="text-gray-500 text-sm font-medium">Outstanding</p>
              <p className="stat-number">
                {formatCurrency(invoices?.filter(inv => inv.status !== 'paid')
                  .reduce((sum, invoice) => sum + (parseFloat(invoice.amount) || 0), 0) || 0)}
              </p>
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-4">
            {invoices?.filter(inv => inv.status !== 'paid').length || 0} unpaid invoices
          </p>
        </div>

        <div className="stat-card">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100 text-green-600 mr-4">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-gray-500 text-sm font-medium">Paid</p>
              <p className="stat-number">
                {formatCurrency(invoices?.filter(inv => inv.status === 'paid')
                  .reduce((sum, invoice) => sum + (parseFloat(invoice.amount) || 0), 0) || 0)}
              </p>
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-4">
            {invoices?.filter(inv => inv.status === 'paid').length || 0} paid invoices
          </p>
        </div>
      </div>

      {/* Filter and search bar */}
      <div className="card mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-3 md:space-y-0 md:space-x-4">
          <div className="w-full md:w-1/3">
            <input
              type="text"
              className="search-input"
              placeholder="Search invoices..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="filter-buttons">
            <button 
              className={`btn ${statusFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setStatusFilter('all')}
            >
              All
            </button>
            <button 
              className={`btn ${statusFilter === 'pending' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setStatusFilter('pending')}
            >
              Pending
            </button>
            <button 
              className={`btn ${statusFilter === 'overdue' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setStatusFilter('overdue')}
            >
              Overdue
            </button>
            <button 
              className={`btn ${statusFilter === 'paid' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setStatusFilter('paid')}
            >
              Paid
            </button>
          </div>
        </div>
      </div>

      {/* Invoices list */}
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Invoices</h2>
          <div>
            <span className="text-sm text-gray-600">
              {filteredInvoices.length} invoices found
            </span>
          </div>
        </div>

        {filteredInvoices.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500 mb-4">
              {searchTerm || statusFilter !== 'all' 
                ? 'No invoices found matching your criteria.' 
                : 'No invoices found. Create your first invoice!'}
            </p>
            <Button
              variant="primary"
              onClick={() => setShowQuoteSelector(true)}
            >
              Create Invoice
            </Button>
          </div>
        ) : (
          <div className="recent-items">
            {filteredInvoices.map((invoice) => (
              <div 
                key={invoice.id} 
                className="recent-item"
                onClick={() => navigate(`/invoices/${invoice.id}`)}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium text-gray-900">
                      {invoice.clientName || 'Unnamed Client'}
                      {invoice.clientCompany && (
                        <span className="text-sm text-gray-500"> ({invoice.clientCompany})</span>
                      )}
                    </p>
                    <p className="text-sm text-gray-500">
                      {invoice.invoiceNumber || `Invoice #${invoice.id.substring(0, 8)}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">
                      {formatCurrency(invoice.amount)}
                    </p>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className={`status-badge ${
                        invoice.status === 'paid' 
                          ? 'status-badge-active' 
                          : new Date(invoice.dueDate) < new Date()
                            ? 'status-badge-expired'
                            : 'status-badge-expiring'
                      }`}>
                        {invoice.status === 'paid' 
                          ? 'Paid' 
                          : new Date(invoice.dueDate) < new Date()
                            ? 'Overdue'
                            : 'Pending'}
                      </span>
                      <button
                        className="text-red-600 hover:text-red-800"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteClick(invoice);
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Quote selector dialog */}
      {showQuoteSelector && (
        <Dialog 
          title="Create Invoice from Quote" 
          onClose={() => setShowQuoteSelector(false)}
          size="lg"
          footer={
            <div className="flex justify-end space-x-3">
              <Button variant="secondary" onClick={() => setShowQuoteSelector(false)}>
                Cancel
              </Button>
              <Button 
                variant="primary" 
                onClick={() => handleCreateFromQuote(selectedQuoteId)}
                disabled={!selectedQuoteId}
              >
                Create Invoice
              </Button>
            </div>
          }
        >
          {isLoadingQuotes ? (
            <Loading message="Loading quotes..." />
          ) : !quotes || quotes.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-gray-700 mb-3">No quotes available</p>
              <Button 
                variant="primary" 
                onClick={() => {
                  setShowQuoteSelector(false);
                  navigate('/quotes/new');
                }}
              >
                Create a Quote First
              </Button>
            </div>
          ) : (
            <>
              <p className="mb-4 text-gray-700">
                Select a quote to create an invoice from:
              </p>
              
              <div className="recent-items max-h-96 overflow-y-auto">
                {quotes.map(quote => (
                  <div 
                    key={quote.id}
                    className={`recent-item cursor-pointer ${selectedQuoteId === quote.id ? 'bg-blue-50' : ''}`}
                    onClick={() => setSelectedQuoteId(quote.id)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium">{quote.name || `Quote ${quote.id.substr(0, 8)}`}</h3>
                        <p className="text-sm text-gray-600">
                          {quote.clientName} {quote.clientCompany ? `(${quote.clientCompany})` : ''}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">
                          £{(quote.total || 0).toFixed(2)}
                        </div>
                        <div className="text-sm text-gray-600">
                          {quote.date ? formatDate(quote.date) : 'No date'}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-4 bg-blue-50 p-3 rounded-md text-sm text-blue-800">
                <p className="font-medium">Note:</p>
                <p>
                  Creating an invoice from a quote will automatically fill in client details
                  and payment options based on the quote.
                </p>
              </div>
            </>
          )}
        </Dialog>
      )}

      {/* Delete confirmation dialog */}
      <Dialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        title="Delete Invoice"
        size="sm"
      >
        <div className="mt-2">
          <p className="text-gray-600">
            Are you sure you want to delete this invoice? This action cannot be undone.
          </p>
          {invoiceToDelete && (
            <div className="mt-4 bg-gray-50 p-4 rounded">
              <p><strong>Client:</strong> {invoiceToDelete.clientName || 'Unknown Client'}</p>
              {invoiceToDelete.clientCompany && (
                <p><strong>Company:</strong> {invoiceToDelete.clientCompany}</p>
              )}
              <p><strong>Invoice:</strong> {invoiceToDelete.invoiceNumber || `Invoice #${invoiceToDelete.id.substring(0, 8)}`}</p>
              <p><strong>Amount:</strong> {formatCurrency(invoiceToDelete.amount)}</p>
            </div>
          )}
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button 
            variant="secondary" 
            onClick={() => setIsDeleteDialogOpen(false)}
          >
            Cancel
          </Button>
          <Button 
            variant="danger" 
            onClick={confirmDelete}
          >
            Delete Invoice
          </Button>
        </div>
      </Dialog>
    </PageLayout>
  );
};

export default Invoices;