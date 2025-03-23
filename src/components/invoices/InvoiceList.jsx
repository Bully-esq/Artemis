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

  // Action buttons for the page header
  const actionButtons = (
    <Button 
      variant="primary"
      onClick={() => navigate('/invoices/new')}
    >
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
      <div className="mb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="w-full md:w-1/3">
          <input
            type="text"
            className="w-full px-4 py-2 border border-gray-300 rounded-md"
            placeholder="Search invoices..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex space-x-2">
          <button
            className={`px-3 py-2 rounded-md text-sm font-medium ${
              statusFilter === 'all' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
            }`}
            onClick={() => setStatusFilter('all')}
          >
            All
          </button>
          <button
            className={`px-3 py-2 rounded-md text-sm font-medium ${
              statusFilter === 'pending' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
            }`}
            onClick={() => setStatusFilter('pending')}
          >
            Pending
          </button>
          <button
            className={`px-3 py-2 rounded-md text-sm font-medium ${
              statusFilter === 'paid' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
            }`}
            onClick={() => setStatusFilter('paid')}
          >
            Paid
          </button>
        </div>
      </div>
      
      {filteredInvoices.length === 0 ? (
        <div className="bg-white p-8 text-center rounded-md shadow">
          <p className="text-gray-500 mb-4">
            {searchTerm || statusFilter !== 'all' 
              ? 'No invoices found matching your criteria.' 
              : 'No invoices found. Create your first invoice!'}
          </p>
          <Button
            variant="primary"
            onClick={() => navigate('/invoices/new')}
          >
            Create Invoice
          </Button>
        </div>
      ) : (
        <div className="bg-white rounded-md shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Invoice Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredInvoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {invoice.invoiceNumber || `INV-${invoice.id.substring(0, 8)}`}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{invoice.clientName || 'Unnamed Client'}</div>
                      {invoice.clientCompany && (
                        <div className="text-sm text-gray-500">{invoice.clientCompany}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {invoice.invoiceDate ? new Date(invoice.invoiceDate).toLocaleDateString() : 'No date'}
                      </div>
                      <div className="text-sm text-gray-500">
                        Due: {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'No date'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        £{invoice.amount?.toFixed(2) || '0.00'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${invoice.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {invoice.status === 'paid' ? 'Paid' : 'Pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="mr-2"
                        onClick={() => navigate(`/invoices/${invoice.id}`)}
                      >
                        View
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => {
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
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </PageLayout>
  );
};

export default InvoiceList;