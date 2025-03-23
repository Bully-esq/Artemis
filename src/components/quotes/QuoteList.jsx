import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';

// Components
import PageLayout from '../components/common/PageLayout';
import Button from '../components/common/Button';
import Loading from '../components/common/Loading';
import Dialog from '../components/common/Dialog';
import FormField from '../components/common/FormField';

// API and Hooks
import { useAppContext } from '../context/AppContext';
import api from '../services/api';

const QuoteList = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { addNotification } = useAppContext();
  
  // Local state
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [quoteToDelete, setQuoteToDelete] = useState(null);
  
  // Fetch quotes
  const {
    data: quotes,
    isLoading,
    isError,
    error
  } = useQuery('quotes', api.quotes.getAll, {
    onError: (err) => {
      addNotification(`Error fetching quotes: ${err.message}`, 'error');
    }
  });
  
  // Delete quote mutation
  const deleteQuoteMutation = useMutation(
    (id) => api.quotes.delete(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('quotes');
        addNotification('Quote deleted successfully', 'success');
        setDeleteDialogOpen(false);
      },
      onError: (err) => {
        addNotification(`Error deleting quote: ${err.message}`, 'error');
      }
    }
  );
  
  // Handle delete confirmation
  const confirmDelete = (quote) => {
    setQuoteToDelete(quote);
    setDeleteDialogOpen(true);
  };
  
  const handleDelete = () => {
    if (quoteToDelete) {
      deleteQuoteMutation.mutate(quoteToDelete.id);
    }
  };
  
  // Filter quotes based on search term
  const filteredQuotes = React.useMemo(() => {
    if (!quotes) return [];
    
    if (!searchTerm) return quotes;
    
    const term = searchTerm.toLowerCase();
    return quotes.filter(quote => 
      (quote.name && quote.name.toLowerCase().includes(term)) || 
      (quote.clientName && quote.clientName.toLowerCase().includes(term)) ||
      (quote.clientCompany && quote.clientCompany.toLowerCase().includes(term))
    );
  }, [quotes, searchTerm]);
  
  // Sort quotes by saved date (newest first)
  const sortedQuotes = React.useMemo(() => {
    if (!filteredQuotes) return [];
    
    return [...filteredQuotes].sort((a, b) => {
      const dateA = a.savedAt ? new Date(a.savedAt) : new Date(0);
      const dateB = b.savedAt ? new Date(b.savedAt) : new Date(0);
      return dateB - dateA;
    });
  }, [filteredQuotes]);
  
  // Actions for the PageLayout
  const actions = (
    <Button
      variant="primary"
      onClick={() => navigate('/quotes/new')}
    >
      New Quote
    </Button>
  );
  
  // Handle loading state
  if (isLoading) {
    return (
      <PageLayout title="Quotes" actions={actions}>
        <Loading message="Loading quotes..." />
      </PageLayout>
    );
  }
  
  // Handle error state
  if (isError) {
    return (
      <PageLayout title="Quotes" actions={actions}>
        <div className="bg-red-50 p-4 rounded-md">
          <h3 className="text-red-800 font-medium">Error loading quotes</h3>
          <p className="text-red-700">{error.message}</p>
          <Button
            variant="primary"
            className="mt-4"
            onClick={() => queryClient.invalidateQueries('quotes')}
          >
            Retry
          </Button>
        </div>
      </PageLayout>
    );
  }
  
  return (
    <PageLayout title="Quotes" actions={actions}>
      {/* Search and filter section */}
      <div className="mb-6">
        <FormField
          type="text"
          placeholder="Search quotes by client name, company..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-md"
        />
      </div>
      
      {/* Quotes list */}
      <div className="bg-white shadow overflow-hidden rounded-md">
        {sortedQuotes.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <svg 
              className="mx-auto h-12 w-12 text-gray-400" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={1.5} 
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No quotes found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm 
                ? 'Try adjusting your search terms' 
                : 'Get started by creating a new quote'}
            </p>
            {!searchTerm && (
              <div className="mt-6">
                <Button
                  variant="primary"
                  onClick={() => navigate('/quotes/new')}
                >
                  New Quote
                </Button>
              </div>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {sortedQuotes.map((quote) => {
              // Format client display name
              const clientName = quote.clientName || 'Unknown Client';
              const clientCompany = quote.clientCompany ? ` (${quote.clientCompany})` : '';
              
              // Format dates
              const createdDate = quote.savedAt 
                ? new Date(quote.savedAt).toLocaleDateString('en-GB') 
                : 'No date';
                
              const expiryDate = quote.validUntil 
                ? new Date(quote.validUntil).toLocaleDateString('en-GB')
                : 'No expiry';
              
              // Check if quote is expired
              const isExpired = quote.validUntil 
                ? new Date(quote.validUntil) < new Date() 
                : false;
              
              return (
                <li key={quote.id}>
                  <div className="px-6 py-4 flex items-center">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {quote.name || `Quote for ${clientName}`}
                        </p>
                        {isExpired && (
                          <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-800">
                            Expired
                          </span>
                        )}
                      </div>
                      <div className="mt-1 sm:flex sm:justify-between">
                        <div className="sm:flex">
                          <p className="flex items-center text-sm text-gray-500">
                            {clientName}{clientCompany}
                          </p>
                        </div>
                        <div className="mt-1 flex items-center text-sm text-gray-500 sm:mt-0">
                          <p>Created: {createdDate} | Valid until: {expiryDate}</p>
                        </div>
                      </div>
                    </div>
                    <div className="ml-6 flex-shrink-0 flex gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => navigate(`/quotes/${quote.id}`)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => navigate(`/invoices/new?quoteId=${quote.id}`)}
                      >
                        Create Invoice
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => confirmDelete(quote)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      
      {/* Delete confirmation dialog */}
      <Dialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        title="Confirm Delete"
      >
        <div className="p-6">
          <p className="mb-4">
            Are you sure you want to delete this quote
            {quoteToDelete?.name ? ` for "${quoteToDelete.name}"` : ''}?
          </p>
          <p className="mb-6 text-red-600">This action cannot be undone.</p>
          
          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
              isLoading={deleteQuoteMutation.isLoading}
            >
              Delete Quote
            </Button>
          </div>
        </div>
      </Dialog>
    </PageLayout>
  );
};

export default QuoteList;