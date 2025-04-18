import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from 'react-query';
import { useAppContext } from '../context/AppContext';

// Import components
import PageLayout from '../components/common/PageLayout';
import Button from '../components/common/Button';
import Loading from '../components/common/Loading';
import Dialog from '../components/common/Dialog';
import FormField from '../components/common/FormField';
import ActionButtonContainer from '../components/common/ActionButtonContainer';

// Import services & utilities
import api from '../services/api';
import { formatDate } from '../utils/formatters';

const Invoices = () => {
  const navigate = useNavigate();
  const { addNotification } = useAppContext();
  const [searchParams] = useSearchParams();
  
  // Local state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState(() => {
    const initialStatus = searchParams.get('status');
    if (initialStatus && ['all', 'paid', 'pending', 'overdue'].includes(initialStatus)) {
      return initialStatus;
    }
    return 'all';
  });
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
        } else if (statusFilter === 'outstanding') {
          statusMatch = invoice.status === 'pending';
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
      <PageLayout title="Invoices">
        <Loading message="Loading invoices..." />
      </PageLayout>
    );
  }
  
  // Error state
  if (invoicesError) {
    return (
      <PageLayout title="Invoices">
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
    <PageLayout title="Invoices">
      {/* Add ActionButtonContainer below the header */}
      <ActionButtonContainer>
        <Button 
          variant="primary"
          onClick={() => setShowQuoteSelector(true)}
        >
          <svg className="w-5 h-5 mr-2 -ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Invoice
        </Button>
      </ActionButtonContainer>

      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2 text-text-primary">Invoice Management</h1>
        <p className="text-sm text-text-secondary">Create and manage invoices for your clients</p>
      </div>

      {/* Quick Actions - Converted to Tailwind */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4 text-text-primary">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <button onClick={() => setShowQuoteSelector(true)} className="flex flex-col items-center justify-center p-4 bg-card-background border border-card-border rounded-lg shadow-sm text-center cursor-pointer transition-colors duration-200 ease-in-out hover:bg-background-tertiary group">
            <svg className="w-8 h-8 mb-2 text-primary-accent group-hover:text-primary-accent-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="text-sm font-medium text-text-primary">New Invoice</span>
          </button>
          
          <button onClick={() => navigate('/quotes')} className="flex flex-col items-center justify-center p-4 bg-card-background border border-card-border rounded-lg shadow-sm text-center cursor-pointer transition-colors duration-200 ease-in-out hover:bg-background-tertiary group">
            <svg className="w-8 h-8 mb-2 text-primary-accent group-hover:text-primary-accent-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="text-sm font-medium text-text-primary">Manage Quotes</span>
          </button>
          
          <button onClick={() => navigate('/settings')} className="flex flex-col items-center justify-center p-4 bg-card-background border border-card-border rounded-lg shadow-sm text-center cursor-pointer transition-colors duration-200 ease-in-out hover:bg-background-tertiary group">
            <svg className="w-8 h-8 mb-2 text-primary-accent group-hover:text-primary-accent-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826 3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-sm font-medium text-text-primary">Invoice Settings</span>
          </button>
        </div>
      </div>

      {/* Dashboard Stats - Converted to Tailwind */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* Stat Card 1: Total Invoiced */}
        <div className="bg-card-background border border-card-border rounded-lg shadow-sm p-6 transition-colors duration-300 ease-linear">
          <div className="flex items-center">
            <div className="flex-shrink-0 p-3 rounded-full bg-green-500/20 text-success mr-4">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-text-secondary">Total Invoiced</p>
              <p className="text-2xl font-bold text-text-primary mt-1">
                {formatCurrency(invoices?.reduce((sum, invoice) => sum + (parseFloat(invoice.amount) || 0), 0) || 0)}
              </p>
            </div>
          </div>
          <p className="text-sm text-text-secondary mt-4">{invoices?.length || 0} invoices total</p>
        </div>

        {/* Stat Card 2: Outstanding */}
        <div className="bg-card-background border border-card-border rounded-lg shadow-sm p-6 transition-colors duration-300 ease-linear">
          <div className="flex items-center">
            <div className="flex-shrink-0 p-3 rounded-full bg-blue-500/20 text-info mr-4">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-text-secondary">Outstanding</p>
              <p className="text-2xl font-bold text-text-primary mt-1">
                {formatCurrency(invoices?.filter(inv => inv.status !== 'paid')
                  .reduce((sum, invoice) => sum + (parseFloat(invoice.amount) || 0), 0) || 0)}
              </p>
            </div>
          </div>
          <p className="text-sm text-text-secondary mt-4">
            {invoices?.filter(inv => inv.status !== 'paid').length || 0} unpaid invoices
          </p>
        </div>

        {/* Stat Card 3: Paid */}
        <div className="bg-card-background border border-card-border rounded-lg shadow-sm p-6 transition-colors duration-300 ease-linear">
          <div className="flex items-center">
            <div className="flex-shrink-0 p-3 rounded-full bg-green-500/20 text-success mr-4">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-text-secondary">Paid</p>
              <p className="text-2xl font-bold text-text-primary mt-1">
                {formatCurrency(invoices?.filter(inv => inv.status === 'paid')
                  .reduce((sum, invoice) => sum + (parseFloat(invoice.amount) || 0), 0) || 0)}
              </p>
            </div>
          </div>
          <p className="text-sm text-text-secondary mt-4">
            {invoices?.filter(inv => inv.status === 'paid').length || 0} paid invoices
          </p>
        </div>
      </div>

      {/* Filter and search bar - Converted to Tailwind */}
      <div className="bg-card-background border border-card-border rounded-lg shadow-sm p-4 md:p-6 mb-6 transition-colors duration-300 ease-linear">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Search Input */}
          <div className="w-full md:w-auto md:flex-grow">
            <input
              type="text"
              className="w-full px-3 py-2 border border-input-border rounded-md bg-input-background text-sm text-input-text placeholder:text-text-muted focus:outline-none focus:border-primary-accent focus:ring-2 focus:ring-primary-accent/20 shadow-sm"
              placeholder="Search invoices by number, client, description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          {/* Filter Buttons - Using Button component */}
          <div className="flex items-center flex-wrap gap-2 md:flex-shrink-0">
            <Button 
              variant={statusFilter === 'all' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setStatusFilter('all')}
            >
              All
            </Button>
            <Button 
              variant={statusFilter === 'pending' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setStatusFilter('pending')}
            >
              Pending
            </Button>
            <Button 
              variant={statusFilter === 'overdue' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setStatusFilter('overdue')}
            >
              Overdue
            </Button>
            <Button 
              variant={statusFilter === 'paid' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setStatusFilter('paid')}
            >
              Paid
            </Button>
          </div>
        </div>
      </div>

      {/* Invoices list - Converted to Tailwind */}
      <div className="bg-card-background border border-card-border rounded-lg shadow-sm overflow-hidden transition-colors duration-300 ease-linear">
        <div className="flex justify-between items-center px-4 py-3 sm:px-6 border-b border-border-color">
          <h2 className="text-lg font-semibold text-text-primary">Invoices</h2>
          <div>
            <span className="text-sm text-text-secondary">
              {filteredInvoices.length} {filteredInvoices.length === 1 ? 'invoice' : 'invoices'} found
            </span>
          </div>
        </div>

        {filteredInvoices.length === 0 ? (
          <div className="text-center py-12 px-6">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2zM12 9v4m0 4h.01" />
            </svg>
             <h3 className="mt-2 text-sm font-medium text-text-primary">
               {searchTerm || statusFilter !== 'all' 
                 ? 'No invoices found matching your criteria.' 
                 : 'No invoices found.'}
             </h3>
             <p className="mt-1 text-sm text-text-secondary">
               {searchTerm || statusFilter !== 'all' 
                 ? 'Try adjusting your search or filters.' 
                 : 'Get started by creating a new invoice.'}
             </p>
            <div className="mt-6">
              <Button
                variant="primary"
                onClick={() => setShowQuoteSelector(true)}
              >
                 <svg className="w-5 h-5 mr-2 -ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                 </svg>
                Create Invoice
              </Button>
            </div>
          </div>
        ) : (
          <ul className="divide-y divide-border-color">
            {filteredInvoices.map((invoice) => {
              const isOverdue = invoice.status !== 'paid' && new Date(invoice.dueDate) < new Date();
              const status = invoice.status === 'paid' ? 'paid' : isOverdue ? 'overdue' : 'pending';
              
              return (
                <li 
                  key={invoice.id} 
                  className="px-4 py-3 sm:px-6 transition-colors duration-200 hover:bg-background-tertiary cursor-pointer"
                  onClick={() => navigate(`/invoices/${invoice.id}`)}
                >
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                    {/* Main content (Client, Invoice #) */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-text-primary truncate">
                        {invoice.clientName || 'Unnamed Client'}
                        {invoice.clientCompany && (
                          <span className="text-sm text-text-secondary"> ({invoice.clientCompany})</span>
                        )}
                      </p>
                      <p className="text-sm text-text-secondary mt-1 truncate">
                        {invoice.invoiceNumber || `Invoice #${invoice.id.substring(0, 8)}`}
                      </p>
                    </div>
                    
                    {/* Details & Actions (Amount, Status, Delete) */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:ml-4 flex-shrink-0">
                      {/* Amount & Due Date */}
                      <div className="text-left sm:text-right text-sm">
                        <p className="font-medium text-text-primary">
                          {formatCurrency(invoice.amount)}
                        </p>
                        <p className="text-text-secondary">
                          Due: {invoice.dueDate ? formatDate(invoice.dueDate) : 'N/A'}
                        </p>
                      </div>
                      
                      {/* Status Badge */}
                      <div className="mt-2 sm:mt-0 sm:ml-4">
                         <span className={`inline-flex items-center px-3 py-1 text-xs font-semibold leading-none rounded-full ${
                           status === 'paid' 
                             ? 'bg-green-100 text-green-800 dark:bg-green-700 dark:text-green-100'
                             : status === 'overdue'
                               ? 'bg-red-100 text-red-800 dark:bg-red-700 dark:text-red-100'
                               : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-700 dark:text-yellow-100'
                         }`}>
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </span>
                      </div>

                      {/* Delete Button */}
                       <div className="mt-2 sm:mt-0 flex items-center sm:ml-4" onClick={(e) => e.stopPropagation()}>
                         <Button 
                           variant="danger" 
                           size="xs" 
                           onClick={() => handleDeleteClick(invoice)}
                           tooltip="Delete Invoice"
                         >
                           <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                         </Button>
                       </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      
      {/* Quote selector dialog - Converted internal list */}
      {showQuoteSelector && (
        <Dialog 
          title="Create Invoice from Quote" 
          isOpen={showQuoteSelector}
          onClose={() => setShowQuoteSelector(false)}
          size="lg"
        >
          {isLoadingQuotes ? (
            <Loading message="Loading quotes..." />
          ) : !quotes || quotes.length === 0 ? (
            <div className="text-center py-6 px-4">
              <svg className="mx-auto h-10 w-10 text-text-muted mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                 <path vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-sm font-medium text-text-primary mb-2">No quotes available</p>
              <p className="text-sm text-text-secondary mb-4">You need to create a quote before you can generate an invoice from it.</p>
              <Button 
                variant="primary" 
                onClick={() => {
                  setShowQuoteSelector(false);
                  navigate('/quotes/new');
                }}
              >
                Create Quote
              </Button>
            </div>
          ) : (
            <>
              <p className="text-sm text-text-secondary mb-4">
                Select a quote to create an invoice from:
              </p>
              
              <ul className="divide-y divide-border-color max-h-80 overflow-y-auto border border-border-color rounded-md mb-4">
                {quotes.map(quote => (
                  <li 
                    key={quote.id}
                    className={`px-4 py-3 sm:px-6 transition-colors duration-150 cursor-pointer ${
                      selectedQuoteId === quote.id 
                        ? 'bg-primary-accent-light hover:bg-primary-accent-light'
                        : 'hover:bg-background-tertiary'
                    }`}
                    onClick={() => setSelectedQuoteId(quote.id)}
                  >
                    <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-2">
                      {/* Quote Details */}
                      <div className="flex-1 min-w-0">
                         <h3 className="font-medium text-sm text-text-primary truncate">{quote.name || `Quote #${quote.id.substring(0, 8)}`}</h3>
                         <p className="text-xs text-text-secondary mt-1 truncate">
                           {quote.clientName} {quote.clientCompany ? `(${quote.clientCompany})` : ''}
                         </p>
                      </div>
                       {/* Amount & Date */}
                      <div className="text-left sm:text-right text-sm flex-shrink-0">
                         <div className="font-medium text-text-primary">
                           {formatCurrency(quote.totalPrice || 0)}
                         </div>
                         <div className="text-xs text-text-secondary mt-1">
                           {quote.date ? formatDate(quote.date) : 'No date'}
                         </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
              
              <div className="bg-info-bg-light p-3 rounded-md text-sm text-info-text-dark border border-info-border">
                <p className="font-medium">Note:</p>
                <p>
                  Creating an invoice from a quote will automatically fill in client details
                  and payment options based on the selected quote.
                </p>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
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
            </>
          )}
        </Dialog>
      )}

      {/* Delete confirmation dialog - Already uses Tailwind components */}
      <Dialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        title="Delete Invoice"
        size="sm"
      >
        <div className="mt-2">
          <p className="text-sm text-text-secondary">
            Are you sure you want to delete this invoice? This action cannot be undone.
          </p>
          {invoiceToDelete && (
            <div className="mt-4 bg-background-secondary p-4 rounded-md border border-border-color">
              <p className="text-sm"><strong className="font-medium text-text-primary">Client:</strong> <span className="text-text-secondary">{invoiceToDelete.clientName || 'Unknown Client'}</span></p>
              {invoiceToDelete.clientCompany && (
                <p className="text-sm mt-1"><strong className="font-medium text-text-primary">Company:</strong> <span className="text-text-secondary">{invoiceToDelete.clientCompany}</span></p>
              )}
              <p className="text-sm mt-1"><strong className="font-medium text-text-primary">Invoice:</strong> <span className="text-text-secondary">{invoiceToDelete.invoiceNumber || `Invoice #${invoiceToDelete.id.substring(0, 8)}`}</span></p>
              <p className="text-sm mt-1"><strong className="font-medium text-text-primary">Amount:</strong> <span className="text-text-secondary">{formatCurrency(invoiceToDelete.amount)}</span></p>
            </div>
          )}
        </div>
        {/* Dialog Actions */}
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