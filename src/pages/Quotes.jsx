import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useAppContext } from '../context/AppContext';
import api from '../services/api';
import { formatDate } from '../utils/formatters';

// Components
import PageLayout from '../components/common/PageLayout';
import Button from '../components/common/Button';
import Loading from '../components/common/Loading';
import Dialog from '../components/common/Dialog';

const Quotes = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { addNotification } = useAppContext();
  
  // Local state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [quoteToDelete, setQuoteToDelete] = useState(null);

  // Fetch quotes with React Query
  const {
    data: quotes,
    isLoading,
    isError,
    error,
    refetch
  } = useQuery('quotes', async () => {
    const response = await api.quotes.getAll();
    return response || [];
  });

  // Calculate status based on validUntil date
  const getQuoteStatus = (quote) => {
    if (!quote.validUntil) return 'active';
    
    const validUntil = new Date(quote.validUntil);
    const now = new Date();
    
    if (validUntil < now) {
      return 'expired';
    }
    
    // Consider a quote "expiring soon" if it's within 7 days of expiration
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    
    if (validUntil < sevenDaysFromNow) {
      return 'expiring';
    }
    
    return 'active';
  };

  // Filter and sort quotes
  const filteredQuotes = React.useMemo(() => {
    if (!quotes) return [];
    
    return quotes
      .filter(quote => {
        // Filter by search term
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = 
          !searchTerm || 
          (quote.clientName && quote.clientName.toLowerCase().includes(searchLower)) ||
          (quote.clientCompany && quote.clientCompany.toLowerCase().includes(searchLower)) ||
          (quote.name && quote.name.toLowerCase().includes(searchLower));
        
        // Filter by status
        const status = getQuoteStatus(quote);
        const matchesStatus = filterStatus === 'all' || status === filterStatus;
        
        return matchesSearch && matchesStatus;
      })
      // Sort by date (newest first)
      .sort((a, b) => {
        const dateA = a.savedAt ? new Date(a.savedAt) : new Date(0);
        const dateB = b.savedAt ? new Date(b.savedAt) : new Date(0);
        return dateB - dateA;
      });
  }, [quotes, searchTerm, filterStatus]);

  // Handle quote deletion
  const handleDeleteClick = (quote) => {
    setQuoteToDelete(quote);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!quoteToDelete) return;
    
    try {
      await api.quotes.delete(quoteToDelete.id);
      addNotification('Quote deleted successfully', 'success');
      refetch(); // Refresh the quotes list
    } catch (err) {
      addNotification(`Error deleting quote: ${err.message}`, 'error');
    } finally {
      // Close dialog and reset state
      setIsDeleteDialogOpen(false);
      setQuoteToDelete(null);
    }
  };

  // Handle creating a new quote
  const handleCreateQuote = () => {
    navigate('/quotes/new');
  };

  // Navigation to edit quote
  const handleEditQuote = (quoteId) => {
    navigate(`/quotes/${quoteId}`);
  };
  
  // Create invoice from quote
  const handleCreateInvoice = (quoteId) => {
    navigate(`/invoices/new?quoteId=${quoteId}`);
  };

  // Status badge component
  const StatusBadge = ({ status }) => {
    const badgeClasses = {
      active: 'bg-green-100 text-green-800',
      expiring: 'bg-yellow-100 text-yellow-800',
      expired: 'bg-red-100 text-red-800'
    };
    
    const statusLabels = {
      active: 'Active',
      expiring: 'Expiring Soon',
      expired: 'Expired'
    };
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badgeClasses[status] || 'bg-gray-100'}`}>
        {statusLabels[status] || status}
      </span>
    );
  };

  // Action buttons for the page header
  const pageActions = (
    <Button 
      variant="primary" 
      onClick={handleCreateQuote}
    >
      <svg className="w-5 h-5 mr-2 -ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
      </svg>
      New Quote
    </Button>
  );

  // Show loading state
  if (isLoading) {
    return (
      <PageLayout title="Quotes">
        <Loading message="Loading quotes..." />
      </PageLayout>
    );
  }

  // Show error state
  if (isError) {
    return (
      <PageLayout title="Quotes" actions={pageActions}>
        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded shadow">
          <p className="text-red-700">
            Error loading quotes: {error?.message || 'Unknown error'}
          </p>
          <Button 
            variant="primary" 
            size="sm" 
            className="mt-2" 
            onClick={() => refetch()}
          >
            Try Again
          </Button>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="Quotes" actions={pageActions}>
      {/* Import global table styles */}
      <style jsx>{`
        @import url('./global-table-styles.css');
      `}</style>

      {/* Filters and search */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
          <div className="flex-1">
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
              Search Quotes
            </label>
            <input
              type="text"
              id="search"
              placeholder="Search by client or quote name..."
              className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full border-gray-300 rounded-md"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex-shrink-0 w-full md:w-48">
            <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              id="status-filter"
              className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full border-gray-300 rounded-md"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="expiring">Expiring Soon</option>
              <option value="expired">Expired</option>
            </select>
          </div>
        </div>
      </div>
      
      {/* Quotes list */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {filteredQuotes.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            {searchTerm || filterStatus !== 'all' ? (
              <p>No quotes match your search criteria.</p>
            ) : (
              <div>
                <p className="mb-4">You haven't created any quotes yet.</p>
                <Button variant="primary" onClick={handleCreateQuote}>
                  Create Your First Quote
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client
                  </th>
                  <th scope="col" className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quote
                  </th>
                  <th scope="col" className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th scope="col" className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valid Until
                  </th>
                  <th scope="col" className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredQuotes.map((quote) => {
                  const status = getQuoteStatus(quote);
                  return (
                    <tr key={quote.id}>
                      <td>
                        <div className="client-info" title={quote.clientName || 'Unknown Client'}>
                          <div className="font-medium text-gray-900">
                            {quote.clientName || 'Unknown Client'}
                          </div>
                          {quote.clientCompany && (
                            <div className="text-sm text-gray-500">
                              {quote.clientCompany}
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="text-gray-900">
                          {quote.name || `Quote #${quote.id.substr(0, 8)}`}
                        </div>
                      </td>
                      <td className="date-cell">
                        <div className="text-gray-500">
                          {quote.date ? formatDate(quote.date) : 'N/A'}
                        </div>
                      </td>
                      <td className="date-cell">
                        <div className="text-gray-500">
                          {quote.validUntil ? formatDate(quote.validUntil) : 'N/A'}
                        </div>
                      </td>
                      <td>
                        <StatusBadge status={status} />
                      </td>
                      <td className="text-right">
                        <div className="action-buttons">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditQuote(quote.id)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCreateInvoice(quote.id)}
                          >
                            Invoice
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-800"
                            onClick={() => handleDeleteClick(quote)}
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete confirmation dialog */}
      <Dialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        title="Delete Quote"
        size="sm"
      >
        <div className="mt-2">
          <p className="text-gray-600">
            Are you sure you want to delete this quote? This action cannot be undone.
          </p>
          {quoteToDelete && (
            <div className="mt-4 bg-gray-50 p-4 rounded">
              <p><strong>Client:</strong> {quoteToDelete.clientName || 'Unknown Client'}</p>
              {quoteToDelete.clientCompany && (
                <p><strong>Company:</strong> {quoteToDelete.clientCompany}</p>
              )}
              <p><strong>Quote:</strong> {quoteToDelete.name || `Quote #${quoteToDelete.id.substr(0, 8)}`}</p>
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
            Delete Quote
          </Button>
        </div>
      </Dialog>

      <style jsx>{`
        .client-info {
          max-width: 200px;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .action-buttons {
          display: flex;
          gap: 8px;
          justify-content: flex-end;
        }
      `}</style>
    </PageLayout>
  );
};

export default Quotes;