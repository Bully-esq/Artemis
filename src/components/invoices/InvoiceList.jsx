import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import { useAppContext } from '../../context/AppContext';
import api from '../../services/api';

// Components (Assuming these use Tailwind now)
import PageLayout from '../../components/common/PageLayout';
import Button from '../../components/common/Button';
import Loading from '../../components/common/Loading';
import ActionButtonContainer from '../../components/common/ActionButtonContainer';
import FormField from '../../components/common/FormField'; // Import FormField for search input

const InvoiceList = () => {
  const navigate = useNavigate();
  const { addNotification } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Update the query configuration with refetch options
  const { 
    data: invoices, 
    isLoading, 
    isError, 
    error, 
    refetch 
  } = useQuery('invoices', api.invoices.getAll, {
    refetchOnMount: true,   // Always refetch when component mounts
    staleTime: 0,           // Consider data always stale
    cacheTime: 60000,       // Cache for 1 minute only
    onError: (err) => {
      addNotification(`Error loading invoices: ${err.message}`, 'error');
    }
  });
  
  // Add this effect to force refetch when component mounts
  useEffect(() => {
    // Force refetch when component mounts
    console.log("InvoiceList mounted - refreshing data");
    refetch();
  }, [refetch]);
  
  // Filter invoices based on search and status
  const filteredInvoices = React.useMemo(() => {
    if (!Array.isArray(invoices)) return []; // Ensure invoices is an array
    
    return invoices.filter(invoice => {
      const searchLower = searchTerm.toLowerCase();
      const searchMatch = !searchTerm || 
        (invoice.invoiceNumber && String(invoice.invoiceNumber).toLowerCase().includes(searchLower)) ||
        (invoice.clientName && String(invoice.clientName).toLowerCase().includes(searchLower)) ||
        (invoice.clientCompany && String(invoice.clientCompany).toLowerCase().includes(searchLower));
      
      const statusMatch = statusFilter === 'all' || 
                          (statusFilter === 'paid' && invoice.status === 'paid') ||
                          (statusFilter === 'pending' && invoice.status !== 'paid'); // Assuming anything not 'paid' is pending/overdue
      
      return searchMatch && statusMatch;
    });
  }, [invoices, searchTerm, statusFilter]);

  // Helper for formatting currency
  const formatCurrency = (amount) => {
    // Use Intl.NumberFormat for better localization and handling
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount || 0);
  };
  
  // Helper for formatting dates
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-GB');
    } catch (e) {
      return 'Invalid Date';
    }
  };

  // Determine status badge Tailwind classes
  const getStatusBadgeClasses = (status) => {
    switch (status?.toLowerCase()) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Action buttons for the page header - Use the standard Button component
  const actionButtons = (
    <Button 
      variant="primary" 
      size="sm" // Use 'sm' size consistent with Quotes page if desired
      onClick={() => navigate('/invoices/new')}
      icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 -ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>}
    >
      New Invoice
    </Button>
  );
  
  if (isLoading) {
    return (
      <PageLayout title="Invoices">
        <ActionButtonContainer>
          {actionButtons}
        </ActionButtonContainer>
        <Loading message="Loading invoices..." />
      </PageLayout>
    );
  }
  
  if (isError) {
    return (
      <PageLayout title="Invoices">
        <ActionButtonContainer>
          {actionButtons}
        </ActionButtonContainer>
        <div className="mt-6 p-6 bg-red-50 border border-red-200 rounded-md text-center">
          <p className="text-red-700 font-medium mb-4">Error loading invoices: {error?.message}</p>
          <Button 
            variant="primary"
            onClick={() => refetch()} // Use refetch instead of reload
          >
            Retry
          </Button>
        </div>
      </PageLayout>
    );
  }
  
  return (
    <PageLayout title="Invoices" subtitle="Create, view, and manage your invoices">
      {/* Stick the button container to the top under the header */}
      <ActionButtonContainer className="sticky top-0 z-10 bg-gray-50/95 backdrop-blur-sm px-4 py-3 border-b border-gray-200 -mx-4 md:-mx-6 lg:-mx-8 mb-6">
          {actionButtons}
      </ActionButtonContainer>

      {/* Search and Filters Card - Use theme variables */}
      <div className="mb-6 bg-card-background border border-card-border p-4 shadow rounded-lg">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* Search Input */}
          <div className="flex-grow sm:max-w-xs">
            <FormField
               id="search-invoices"
               placeholder="Search # or client..."
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               label="Search Invoices"
               labelSrOnly // Hide label visually
               // Optional: Add a search icon prefix using prefix prop of FormField if supported
            />
          </div>
          
          {/* Filter Buttons */}
          <div className="flex items-center space-x-2 flex-wrap">
             {/* Define filters array */} 
            {[ 
              {value: 'all', label: 'All'}, 
              {value: 'pending', label: 'Pending/Overdue'}, 
              {value: 'paid', label: 'Paid'} 
            ].map(filter => (
               <Button
                 key={filter.value}
                 size="sm"
                 variant={statusFilter === filter.value ? 'solid' : 'outline'} // Use solid variant for active filter
                 colorScheme={statusFilter === filter.value ? 'indigo' : 'gray'} // Use color schemes if Button supports it
                 onClick={() => setStatusFilter(filter.value)}
                 className="whitespace-nowrap" // Prevent button text wrapping
               >
                 {filter.label}
               </Button>
             ))}
           </div>
        </div>
      </div>
      
      {/* Invoices list - in a card with header like Dashboard */}
      <div className="card">
        <div className="list-header">
          <h2 className="card-title">Invoices</h2>
          <div>
            <span className="result-count">
              {filteredInvoices.length} invoices found
            </span>
          </div>
        </div>

        {filteredInvoices.length === 0 ? (
          <div className="empty-state">
            <svg className="empty-state-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
            </svg>
            <h3 className="empty-state-title">
              {searchTerm || statusFilter !== 'all' ? 
                'No invoices match your search criteria' : 
                'You haven\'t created any invoices yet'}
            </h3>
            <p className="empty-state-description">
              {searchTerm || statusFilter !== 'all' ? 
                'Try adjusting your search or filters to find what you\'re looking for.' : 
                'Get started by creating your first invoice.'}
            </p>
            {!searchTerm && statusFilter === 'all' && (
              <Button variant="primary" onClick={() => navigate('/invoices/new')}>
                Create Your First Invoice
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredInvoices.map((invoice) => (
              <div 
                key={invoice.id} 
                className="bg-card-background border border-card-border rounded-lg shadow-sm p-4 flex flex-col justify-between hover:bg-background-tertiary cursor-pointer transition-shadow duration-200 ease-in-out"
                onClick={() => navigate(`/invoices/${invoice.id}`)}
                // style={{ padding: '16px 24px' }} // Remove inline style, use padding class
              >
                {/* Top section of card */}
                <div className="mb-3">
                  <p className="font-medium text-text-primary truncate">
                    {invoice.invoiceNumber || `INV-${invoice.id.substring(0, 8)}`}
                    {invoice.clientName && (
                      <span className="text-sm text-text-secondary"> - {invoice.clientName}</span>
                    )}
                  </p>
                  <p className="text-sm text-text-secondary mt-1 truncate">
                    {invoice.clientCompany || ''}
                    {invoice.clientCompany && invoice.invoiceDate && ' • '}
                    {invoice.invoiceDate ? `Date: ${new Date(invoice.invoiceDate).toLocaleDateString('en-GB')}` : ''}
                  </p>
                </div>

                {/* Bottom section of card */}
                <div className="flex items-center justify-between mt-auto">
                  <p className="text-lg font-semibold text-text-primary">
                    {formatCurrency(invoice.amount)}
                  </p>
                  <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}> {/* Prevent card click */} 
                    <span className={`${getStatusBadgeClasses(invoice.status)} px-2.5 py-0.5 rounded-full text-xs font-medium`}>
                      {invoice.status === 'paid' ? 'Paid' : 'Pending'}
                    </span>
                    <Button
                      size="sm"
                      variant="outline" // Changed to outline for less emphasis
                      onClick={() => navigate(`/invoices/${invoice.id}`)} // No need for stopPropagation here, already stopped on parent
                    >
                      View
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageLayout>
  );
};

export default InvoiceList;