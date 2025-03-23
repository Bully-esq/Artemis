import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';

// Import components
import PageLayout from '../components/common/PageLayout';
import Button from '../components/common/Button';
import Loading from '../components/common/Loading';
import InvoiceList from '../components/invoices/InvoiceList';
import Dialog from '../components/common/Dialog';
import FormField from '../components/common/FormField';

// Import services & utilities
import api from '../services/api';
import { formatDate } from '../utils/formatters';

const Invoices = () => {
  const navigate = useNavigate();
  const { addNotification } = useAppContext();
  const { isAuthenticated } = useAuth();
  
  // Local state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showQuoteSelector, setShowQuoteSelector] = useState(false);
  const [selectedQuoteId, setSelectedQuoteId] = useState(null);
  
  // Fetch invoices
  const { 
    data: invoices,
    isLoading: isLoadingInvoices,
    isError: invoicesError,
    refetch: refetchInvoices
  } = useQuery('invoices', api.invoices.getAll, {
    enabled: isAuthenticated,
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

  // Action buttons for the page header
  const actionButtons = (
    <div className="flex space-x-4">
      <Button 
        variant="primary"
        onClick={() => setShowQuoteSelector(true)}
      >
        Create Invoice
      </Button>
      <Button 
        variant="secondary"
        onClick={() => navigate('/quotes')}
      >
        Manage Quotes
      </Button>
    </div>
  );

  // Handle status filter change
  const handleStatusFilterChange = (status) => {
    setStatusFilter(status);
  };

  return (
    <PageLayout title="Invoices" actions={actionButtons}>
      {/* Filter and search bar */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between space-y-3 md:space-y-0 md:space-x-4">
          <div className="w-full md:w-1/3">
            <FormField
              type="text"
              placeholder="Search invoices..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>
          
          <div className="flex space-x-2">
            <Button 
              variant={statusFilter === 'all' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => handleStatusFilterChange('all')}
            >
              All
            </Button>
            <Button 
              variant={statusFilter === 'pending' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => handleStatusFilterChange('pending')}
            >
              Pending
            </Button>
            <Button 
              variant={statusFilter === 'overdue' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => handleStatusFilterChange('overdue')}
            >
              Overdue
            </Button>
            <Button 
              variant={statusFilter === 'paid' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => handleStatusFilterChange('paid')}
            >
              Paid
            </Button>
          </div>
        </div>
      </div>

      {/* Invoices list */}
      {isLoadingInvoices ? (
        <Loading message="Loading invoices..." />
      ) : invoicesError ? (
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
      ) : filteredInvoices.length === 0 ? (
        <div className="bg-white p-8 rounded-lg shadow text-center">
          <h3 className="text-xl font-medium text-gray-900 mb-2">No invoices found</h3>
          <p className="text-gray-500 mb-4">
            {searchTerm || statusFilter !== 'all' 
              ? 'Try changing your search or filter criteria'
              : 'Create your first invoice to get started'}
          </p>
          <Button 
            variant="primary"
            onClick={() => setShowQuoteSelector(true)}
          >
            Create Your First Invoice
          </Button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <InvoiceList 
            invoices={filteredInvoices} 
            onView={(id) => navigate(`/invoices/${id}`)} 
            onDelete={async (id) => {
              try {
                await api.invoices.delete(id);
                addNotification('Invoice deleted successfully', 'success');
                refetchInvoices();
              } catch (error) {
                addNotification(`Error deleting invoice: ${error.message}`, 'error');
              }
            }}
          />
        </div>
      )}

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
              
              <div className="max-h-96 overflow-y-auto border rounded-md">
                {quotes.map(quote => (
                  <div 
                    key={quote.id}
                    className={`
                      p-4 border-b cursor-pointer hover:bg-gray-50
                      ${selectedQuoteId === quote.id ? 'bg-blue-50 border-blue-200' : ''}
                    `}
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
    </PageLayout>
  );
};

export default Invoices;