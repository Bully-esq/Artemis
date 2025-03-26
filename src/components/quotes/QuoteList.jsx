import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';

// Components
import PageLayout from '../../components/common/PageLayout';
import Button from '../../components/common/Button';
import Loading from '../../components/common/Loading';
import Dialog from '../../components/common/Dialog';
import FormField from '../../components/common/FormField';

// API and Hooks
import { useAppContext } from '../../context/AppContext';
import api from '../../services/api';

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
    (id) => {
      console.log('Attempting to delete quote with ID:', id);
      // Add a slight delay to ensure the action is visible to users
      return new Promise((resolve) => {
        setTimeout(async () => {
          try {
            const result = await api.quotes.delete(id);
            console.log('Delete API call succeeded:', result);
            resolve(result);
          } catch (error) {
            console.error('Delete API call failed:', error);
            throw error;
          }
        }, 300);
      });
    },
    {
      onSuccess: (data) => {
        console.log('Delete mutation succeeded with data:', data);
        queryClient.invalidateQueries('quotes');
        addNotification('Quote deleted successfully', 'success');
        setDeleteDialogOpen(false);
        setQuoteToDelete(null);
      },
      onError: (err) => {
        console.error('Delete mutation failed with error:', err);
        addNotification(`Error deleting quote: ${err.message || 'Unknown error'}`, 'error');
        setDeleteDialogOpen(false);
      }
    }
  );
  
  // Handle delete confirmation with better debugging
  const confirmDelete = (quote) => {
    console.log('Opening delete confirmation for quote:', quote);
    setQuoteToDelete(quote);
    setDeleteDialogOpen(true);
  };
  
  // Improved delete handler
  const handleDelete = () => {
    if (!quoteToDelete) {
      console.warn('Attempted to delete but no quote is selected');
      return;
    }
    
    console.log(`Executing delete for quote ID: ${quoteToDelete.id}`);
    
    // Add a brief delay for visual feedback
    setTimeout(() => {
      try {
        deleteQuoteMutation.mutate(quoteToDelete.id);
      } catch (error) {
        console.error('Error in delete handler:', error);
        addNotification(`Failed to start delete operation: ${error.message}`, 'error');
      }
    }, 100);
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
          <div className="overflow-x-auto p-2"> {/* Added p-2 padding to the table container */}
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-10 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                  <th scope="col" className="px-10 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quote</th>
                  <th scope="col" className="px-10 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th scope="col" className="px-10 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedQuotes.map((quote) => (
                  <tr key={quote.id} className="hover:bg-gray-50">
                    <td className="px-10 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 pl-3">{quote.clientName || 'Unknown'}</div>
                      {quote.clientCompany && <div className="text-sm text-gray-500 pl-3">{quote.clientCompany}</div>}
                    </td>
                    <td className="px-10 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 pl-3">{quote.name || `Quote #${quote.id.substring(0, 8)}`}</div>
                    </td>
                    <td className="px-10 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500 pl-3">
                        {quote.date ? new Date(quote.date).toLocaleDateString() : 'No date'}
                      </div>
                    </td>
                    <td className="px-10 py-4 whitespace-nowrap text-right text-sm font-medium pr-8">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="mr-4" // Increased margin between buttons
                        onClick={() => navigate(`/quotes/${quote.id}`)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => confirmDelete(quote)}
                      >
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      {/* Delete confirmation dialog - positioned at root level */}
      <Dialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        title="Confirm Delete"
        className="fixed inset-0 z-50 overflow-y-auto"
        overlayClassName="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
      >
        <div className="p-6 bg-white rounded-lg shadow-xl max-w-md mx-auto mt-20">
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
              data-quoteid={quoteToDelete?.id}
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