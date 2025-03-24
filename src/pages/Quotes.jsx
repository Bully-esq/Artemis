import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
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
  const { addNotification } = useAppContext();
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

  // Handle delete confirmation
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
      active: 'status-badge status-badge-active',
      expiring: 'status-badge status-badge-expiring',
      expired: 'status-badge status-badge-expired'
    };
    
    const statusLabels = {
      active: 'Active',
      expiring: 'Expiring Soon',
      expired: 'Expired'
    };
    
    return (
      <span className={badgeClasses[status] || 'status-badge'}>
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
      {/* Page Header - Styled like Dashboard */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Quote Management</h1>
        <p className="text-gray-600">Create and manage quotes for your clients</p>
      </div>

      {/* Quick Actions - Same styling as Dashboard */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="quick-actions">
          <div onClick={handleCreateQuote} className="quick-action-btn">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>New Quote</span>
          </div>
          
          <div onClick={() => navigate('/invoices')} className="quick-action-btn">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <span>Create Invoice</span>
          </div>
          
          <div onClick={() => navigate('/contacts')} className="quick-action-btn">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span>Manage Contacts</span>
          </div>
        </div>
      </div>

      {/* Filters and search - in a card like Dashboard */}
      <div className="card mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="w-full md:w-1/3">
            <input
              type="text"
              className="search-input w-full"
              placeholder="Search quotes by client or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="filter-group">
            <button
              className={`filter-button ${filterStatus === 'all' ? 'active' : ''}`}
              onClick={() => setFilterStatus('all')}
            >
              All
            </button>
            <button
              className={`filter-button ${filterStatus === 'active' ? 'active' : ''}`}
              onClick={() => setFilterStatus('active')}
            >
              Active
            </button>
            <button
              className={`filter-button ${filterStatus === 'expiring' ? 'active' : ''}`}
              onClick={() => setFilterStatus('expiring')}
            >
              Expiring Soon
            </button>
            <button
              className={`filter-button ${filterStatus === 'expired' ? 'active' : ''}`}
              onClick={() => setFilterStatus('expired')}
            >
              Expired
            </button>
          </div>
        </div>
      </div>
      
      {/* Quotes list - in a card with header like Dashboard */}
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Quotes</h2>
          <div>
            <span className="text-sm text-gray-600">
              {filteredQuotes.length} quotes found
            </span>
          </div>
        </div>

        {filteredQuotes.length === 0 ? (
          <div className="empty-state">
            <svg className="empty-state-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="12" y1="18" x2="12" y2="12"></line>
              <line x1="9" y1="15" x2="15" y2="15"></line>
            </svg>
            <h3 className="empty-state-title">
              {searchTerm || filterStatus !== 'all' ? 
                'No quotes match your search criteria' : 
                'You haven\'t created any quotes yet'}
            </h3>
            <p className="empty-state-description">
              {searchTerm || filterStatus !== 'all' ? 
                'Try adjusting your search or filters to find what you\'re looking for.' : 
                'Get started by creating your first quote for a client.'}
            </p>
            {!searchTerm && filterStatus === 'all' && (
              <Button variant="primary" onClick={handleCreateQuote}>
                Create Your First Quote
              </Button>
            )}
          </div>
        ) : (
          <div className="recent-items">
            {filteredQuotes.map((quote) => {
              const status = getQuoteStatus(quote);
              return (
                <div 
                  key={quote.id} 
                  className="recent-item"
                  onClick={() => handleEditQuote(quote.id)}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium text-gray-900">
                        {quote.clientName || 'Unknown Client'}
                        {quote.clientCompany && (
                          <span className="text-sm text-gray-500"> ({quote.clientCompany})</span>
                        )}
                      </p>
                      <p className="text-sm text-gray-500">
                        {quote.name || `Quote #${quote.id.substr(0, 8)}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        {quote.date ? formatDate(quote.date) : 'No date'}
                      </p>
                      <div className="flex items-center space-x-2 mt-1">
                        <StatusBadge status={status} />
                        <div className="flex space-x-1">
                          <button
                            className="text-blue-600 hover:text-blue-800"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCreateInvoice(quote.id);
                            }}
                          >
                            Invoice
                          </button>
                          <button
                            className="text-red-600 hover:text-red-800"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteClick(quote);
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
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
    </PageLayout>
  );
};

export default Quotes;