import React, { useState, useEffect } from 'react'; // Update this line to include useEffect
import { useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import { useAppContext } from '../../context/AppContext';
import api from '../../services/api';

// Components
import PageLayout from '../../components/common/PageLayout';
import Button from '../../components/common/Button';
import Loading from '../../components/common/Loading';


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
    if (!invoices) return [];
    
    return invoices.filter(invoice => {
      // Search filter
      const searchMatch = !searchTerm || 
        (invoice.invoiceNumber && invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (invoice.clientName && invoice.clientName.toLowerCase().includes(searchTerm.toLowerCase()));
      
      // Status filter
      let statusMatch = true;
      if (statusFilter !== 'all') {
        if (statusFilter === 'paid') {
          statusMatch = invoice.status === 'paid';
        } else if (statusFilter === 'pending') {
          statusMatch = invoice.status !== 'paid';
        }
      }
      
      return searchMatch && statusMatch;
    });
  }, [invoices, searchTerm, statusFilter]);

  // Helper for formatting currency
  const formatCurrency = (amount) => {
    return `£${parseFloat(amount || 0).toFixed(2)}`;
  };

  // Determine status badge class
  const getStatusBadgeClass = (status) => {
    return status === 'paid' ? 'status-badge status-badge-success' : 'status-badge status-badge-warning';
  };

  // Action buttons for the page header - Use the standard Button component
  const actionButtons = (
    <Button 
      variant="primary" 
      size="sm" // Use 'sm' size consistent with Quotes page if desired
      onClick={() => navigate('/invoices/new')}
    >
      <svg className="w-4 h-4 mr-1 -ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"> {/* Use consistent icon classes if possible */}
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
      </svg>
      New Invoice
    </Button>
  );
  
  if (isLoading) {
    return (
      <PageLayout title="Invoices" actions={actionButtons}>
        <Loading message="Loading invoices..." />
      </PageLayout>
    );
  }
  
  if (isError) {
    return (
      <PageLayout title="Invoices" actions={actionButtons}>
        <div className="error-container">
          <p className="error-message">Error loading invoices: {error?.message}</p>
          <Button 
            variant="primary"
            className="error-retry-button"
            onClick={() => window.location.reload()}
          >
            Retry
          </Button>
        </div>
      </PageLayout>
    );
  }
  
  return (
    <PageLayout title="Invoices" actions={actionButtons}>
      {/* Page Header - Styled like Dashboard */}
      <div className="page-header">
        <h1 className="page-title">Invoice Management</h1>
        <p className="page-subtitle">Create, view, and manage your invoices</p>
      </div>

      {/* Quick Actions - Same styling as Dashboard */}
      <div className="section-container">
        <h2 className="section-title">Quick Actions</h2>
        <div className="quick-actions">
          <div onClick={() => navigate('/invoices/new')} className="quick-action-btn">
            <svg className="quick-action-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <span>New Invoice</span>
          </div>
          
          <div onClick={() => navigate('/quotes')} className="quick-action-btn">
            <svg className="quick-action-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Create Quote</span>
          </div>
          
          <div onClick={() => navigate('/contacts')} className="quick-action-btn">
            <svg className="quick-action-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span>Manage Contacts</span>
          </div>
        </div>
      </div>

      {/* Search and Filters - in a card like Dashboard */}
      <div className="card search-filter-container">
        <div className="filter-row">
          <div className="search-container">
            <input
              type="text"
              className="search-input"
              placeholder="Search invoices by number or client..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="filter-group">
            <button
              className={`filter-button ${statusFilter === 'all' ? 'active' : ''}`}
              onClick={() => setStatusFilter('all')}
              style={{
                backgroundColor: statusFilter === 'all' ? '#0073cf' : '#f0f4f8',
                color: statusFilter === 'all' ? 'white' : '#4a5568',
                padding: '8px 16px',
                marginRight: '10px',
                borderRadius: '4px',
                border: 'none',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              All
            </button>
            <button
              className={`filter-button ${statusFilter === 'pending' ? 'active' : ''}`}
              onClick={() => setStatusFilter('pending')}
              style={{
                backgroundColor: statusFilter === 'pending' ? '#0073cf' : '#f0f4f8',
                color: statusFilter === 'pending' ? 'white' : '#4a5568',
                padding: '8px 16px',
                marginRight: '10px',
                borderRadius: '4px',
                border: 'none',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              Pending
            </button>
            <button
              className={`filter-button ${statusFilter === 'paid' ? 'active' : ''}`}
              onClick={() => setStatusFilter('paid')}
              style={{
                backgroundColor: statusFilter === 'paid' ? '#0073cf' : '#f0f4f8',
                color: statusFilter === 'paid' ? 'white' : '#4a5568',
                padding: '8px 16px',
                borderRadius: '4px',
                border: 'none',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              Paid
            </button>
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
          <div className="recent-items">
            {filteredInvoices.map((invoice) => (
              <div 
                key={invoice.id} 
                className="recent-item"
                onClick={() => navigate(`/invoices/${invoice.id}`)}
                style={{ padding: '16px 24px' }} // Add more padding to the item
              >
                <div className="item-row">
                  <div className="item-details" style={{ paddingLeft: '8px' }}> {/* Add left padding */}
                    <p className="item-title">
                      {invoice.invoiceNumber || `INV-${invoice.id.substring(0, 8)}`}
                      {invoice.clientName && (
                        <span className="client-name">{invoice.clientName}</span>
                      )}
                    </p>
                    <p className="item-subtitle">
                      {invoice.clientCompany || ''}
                      {invoice.clientCompany && invoice.invoiceDate && ' • '}
                      {invoice.invoiceDate ? `Date: ${new Date(invoice.invoiceDate).toLocaleDateString()}` : ''}
                    </p>
                  </div>
                  <div className="item-actions">
                    <p className="invoice-amount">
                      {formatCurrency(invoice.amount)}
                    </p>
                    {/* Combine status and buttons */}
                    <div className="status-button-container">
                      <span className={`${getStatusBadgeClass(invoice.status)}`}>
                        {invoice.status === 'paid' ? 'Paid' : 'Pending'}
                      </span>
                      {/* Use Button component with new classes */}
                      <Button
                        className="btn-list-item btn-list-item--secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/invoices/${invoice.id}`);
                        }}
                      >
                        View
                      </Button>
                    </div>
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