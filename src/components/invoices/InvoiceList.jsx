import React, { useState } from 'react';
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
  
  // Fetch invoices
  const { data: invoices, isLoading, isError, error } = useQuery('invoices', api.invoices.getAll, {
    onError: (err) => {
      addNotification(`Error loading invoices: ${err.message}`, 'error');
    }
  });
  
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

  // Action buttons for the page header
  const actionButtons = (
    <Button 
      variant="primary"
      onClick={() => navigate('/invoices/new')}
    >
      <svg className="w-5 h-5 mr-2 -ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        <div className="bg-red-50 p-4 rounded-md">
          <p className="text-red-700">Error loading invoices: {error?.message}</p>
          <Button 
            variant="primary"
            className="mt-4"
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
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Invoice Management</h1>
        <p className="text-gray-600">Create, view, and manage your invoices</p>
      </div>

      {/* Quick Actions - Same styling as Dashboard */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="quick-actions">
          <div onClick={() => navigate('/invoices/new')} className="quick-action-btn">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <span>New Invoice</span>
          </div>
          
          <div onClick={() => navigate('/quotes')} className="quick-action-btn">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Create Quote</span>
          </div>
          
          <div onClick={() => navigate('/contacts')} className="quick-action-btn">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span>Manage Contacts</span>
          </div>
        </div>
      </div>

      {/* Search and Filters - in a card like Dashboard */}
      <div className="card mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="w-full md:w-1/3">
            <input
              type="text"
              className="search-input w-full"
              placeholder="Search invoices by number or client..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="filter-group">
            <button
              className={`filter-button ${statusFilter === 'all' ? 'active' : ''}`}
              onClick={() => setStatusFilter('all')}
            >
              All
            </button>
            <button
              className={`filter-button ${statusFilter === 'pending' ? 'active' : ''}`}
              onClick={() => setStatusFilter('pending')}
            >
              Pending
            </button>
            <button
              className={`filter-button ${statusFilter === 'paid' ? 'active' : ''}`}
              onClick={() => setStatusFilter('paid')}
            >
              Paid
            </button>
          </div>
        </div>
      </div>
      
      {/* Invoices list - in a card with header like Dashboard */}
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
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium text-gray-900">
                      {invoice.invoiceNumber || `INV-${invoice.id.substring(0, 8)}`}
                      {invoice.clientName && (
                        <span className="ml-2">{invoice.clientName}</span>
                      )}
                    </p>
                    <p className="text-sm text-gray-500">
                      {invoice.clientCompany || ''}
                      {invoice.clientCompany && invoice.invoiceDate && ' • '}
                      {invoice.invoiceDate ? `Date: ${new Date(invoice.invoiceDate).toLocaleDateString()}` : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">
                      {formatCurrency(invoice.amount)}
                    </p>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className={getStatusBadgeClass(invoice.status)}>
                        {invoice.status === 'paid' ? 'Paid' : 'Pending'}
                      </span>
                      <div className="flex space-x-1">
                        <button
                          className="text-blue-600 hover:text-blue-800"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/invoices/${invoice.id}`);
                          }}
                        >
                          View
                        </button>
                        <button
                          className="text-red-600 hover:text-red-800"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm('Are you sure you want to delete this invoice?')) {
                              api.invoices.delete(invoice.id)
                                .then(() => {
                                  addNotification('Invoice deleted successfully', 'success');
                                  window.location.reload();
                                })
                                .catch(err => {
                                  addNotification(`Error deleting invoice: ${err.message}`, 'error');
                                });
                            }
                          }}
                        >
                          Delete
                        </button>
                      </div>
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