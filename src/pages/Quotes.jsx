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
import ActionButtonContainer from '../components/common/ActionButtonContainer';

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

  // Status badge component - Converted to Tailwind
  const StatusBadge = ({ status }) => {
    const baseClasses = "inline-flex items-center px-3 py-1 text-xs font-semibold leading-none rounded-full";
    let statusClasses = "";

    switch (status) {
      case 'active':
        statusClasses = "bg-green-100 text-green-800 dark:bg-green-700 dark:text-green-100";
        break;
      case 'expiring':
        statusClasses = "bg-yellow-100 text-yellow-800 dark:bg-yellow-700 dark:text-yellow-100";
        break;
      case 'expired':
        statusClasses = "bg-red-100 text-red-800 dark:bg-red-700 dark:text-red-100";
        break;
      default:
        statusClasses = "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-100";
        break;
    }
    
    const statusLabels = {
      active: 'Active',
      expiring: 'Expiring Soon',
      expired: 'Expired'
    };
    
    return (
      <span className={`${baseClasses} ${statusClasses}`}>
        {statusLabels[status] || status}
      </span>
    );
  };

  // Action buttons for the page header (Passed to PageLayout)
  // Uses Button component, assuming it's Tailwind-styled
  const pageActions = (
    <Button 
      variant="primary" 
      onClick={handleCreateQuote}
      icon={
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      }
    >
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

  // Show error state (already uses Tailwind)
  if (isError) {
    return (
      <PageLayout title="Quotes" actions={pageActions}>
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded shadow mb-6" role="alert">
          <p className="font-bold">Error</p>
          <p>
            Error loading quotes: {error?.message || 'Unknown error'}
          </p>
          <Button 
            variant="danger" // Match style to error
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
      {/* Filters and search - Use Card styling */}
      <div className="bg-card-background border border-card-border rounded-lg shadow-sm p-4 md:p-6 mb-6 transition-colors duration-300 ease-linear">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Search Input */}
          <div className="w-full md:w-auto md:flex-grow">
            <input
              type="text"
              // Applied search-input styles
              className="w-full px-3 py-2 border border-input-border rounded-md bg-input-background text-sm text-input-text placeholder:text-text-muted focus:outline-none focus:border-primary-accent focus:ring-2 focus:ring-primary-accent/20 shadow-sm"
              placeholder="Search quotes by client or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          {/* Filter Buttons */}
          <div className="flex items-center flex-wrap gap-2 md:flex-shrink-0"> {/* Applied filter-group styles */} 
            <button
              // Applied filter-button styles + active state logic
              className={`px-4 py-2 rounded border-none font-medium cursor-pointer transition-colors duration-200 ease-linear text-sm 
                ${filterStatus === 'all' 
                  ? 'bg-primary text-text-accent-contrast'
                  : 'bg-bg-light text-text-secondary hover:bg-bg-hover dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                }`}
              onClick={() => setFilterStatus('all')}
            >
              All
            </button>
            <button
              className={`px-4 py-2 rounded border-none font-medium cursor-pointer transition-colors duration-200 ease-linear text-sm 
                ${filterStatus === 'active' 
                  ? 'bg-primary text-text-accent-contrast'
                  : 'bg-bg-light text-text-secondary hover:bg-bg-hover dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                }`}
              onClick={() => setFilterStatus('active')}
            >
              Active
            </button>
            <button
              className={`px-4 py-2 rounded border-none font-medium cursor-pointer transition-colors duration-200 ease-linear text-sm 
                ${filterStatus === 'expiring' 
                  ? 'bg-primary text-text-accent-contrast'
                  : 'bg-bg-light text-text-secondary hover:bg-bg-hover dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                }`}
              onClick={() => setFilterStatus('expiring')}
            >
              Expiring
            </button>
            <button
              className={`px-4 py-2 rounded border-none font-medium cursor-pointer transition-colors duration-200 ease-linear text-sm 
                ${filterStatus === 'expired' 
                  ? 'bg-primary text-text-accent-contrast'
                  : 'bg-bg-light text-text-secondary hover:bg-bg-hover dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                }`}
              onClick={() => setFilterStatus('expired')}
            >
              Expired
            </button>
          </div>
        </div>
      </div>

      {/* Quotes List - Use list-container styling */}
      <div className="transition-colors duration-300 ease-linear">
        {filteredQuotes.length > 0 ? (
          <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 p-4 md:p-6">
            {filteredQuotes.map((quote) => {
              const status = getQuoteStatus(quote);
              return (
                <li 
                  key={quote.id} 
                  // Card styles applied to li for grid layout
                  className="bg-card-background border border-card-border rounded-lg shadow-sm overflow-hidden transition-colors duration-300 ease-linear hover:bg-background-tertiary cursor-pointer p-4 flex flex-col justify-between h-full"
                  onClick={() => handleEditQuote(quote.id)} // Make whole item clickable to edit
                >
                  {/* Content within the card */}
                  {/* Top section: Client/Quote Name */}
                  <div className="flex-grow mb-3"> {/* Added flex-grow and margin-bottom */}
                    {/* Client Name/Company */}
                    <p className="font-medium text-text-primary truncate">
                      {quote.clientName || 'Unnamed Client'} 
                      {quote.clientCompany && <span className="text-sm text-text-secondary">({quote.clientCompany})</span>}
                    </p>
                    {/* Quote Name/ID */}
                    <p className="text-sm text-text-secondary mt-1 truncate">
                      {quote.name || `Quote #${quote.id.substring(0, 8)}`}
                    </p>
                  </div>
                  
                  {/* Bottom section: Details, Status, Actions */}
                  <div className="flex-shrink-0"> {/* Grouping bottom elements */}
                     {/* Details (Date/Total) */}
                     <div className="text-left text-sm mb-2"> {/* Added margin-bottom */}
                        <p className="font-medium text-text-primary">
                          {quote.totalPrice}
                        </p>
                        <p className="text-text-secondary">
                          {quote.date ? formatDate(quote.date) : 'No date'}
                        </p>
                     </div>
                     {/* Status Badge */}
                     <div className="mb-3"> {/* Added margin-bottom */}
                        <StatusBadge status={status} />
                     </div>
                     {/* Action Buttons */}
                     <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()} /* Prevent click propagation to edit */>
                       <Button 
                         variant="info" 
                         size="xs" 
                         onClick={() => handleCreateInvoice(quote.id)}
                         tooltip="Create Invoice"
                       >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2zM12 9v4m0 4h.01" /></svg>
                       </Button>
                       <Button 
                         variant="secondary" 
                         size="xs" 
                         onClick={() => handleEditQuote(quote.id)}
                         tooltip="Edit Quote"
                       >
                         <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                       </Button>
                        <Button 
                         variant="danger" 
                         size="xs" 
                         onClick={() => handleDeleteClick(quote)}
                         tooltip="Delete Quote"
                       >
                         <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                       </Button>
                     </div>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          // Empty State - Simplified, could use styles from dashboard.css if needed
          <div className="text-center py-12 px-6">
            <svg className="mx-auto h-12 w-12 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-text-primary">No quotes found</h3>
            <p className="mt-1 text-sm text-text-secondary">Get started by creating a new quote.</p>
            <div className="mt-6">
              {pageActions} {/* Reuse the New Quote button */}
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        title="Delete Quote"
      >
        <p className="text-sm text-text-secondary mb-4">
          Are you sure you want to delete the quote "{quoteToDelete?.name || quoteToDelete?.id}" for {quoteToDelete?.clientName}? This action cannot be undone.
        </p>
        <div className="flex justify-end space-x-2">
          <Button variant="secondary" onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
          <Button variant="danger" onClick={confirmDelete}>Delete</Button>
        </div>
      </Dialog>

    </PageLayout>
  );
};

export default Quotes;