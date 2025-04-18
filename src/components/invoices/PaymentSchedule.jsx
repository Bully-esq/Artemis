import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import { calculatePaymentSchedule } from '../../utils/calculations';
import Button from '../common/Button';
import Loading from '../common/Loading';
import api from '../../services/api';

// Helper function for currency formatting (similar to InvoiceList)
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount || 0);
};

// Helper for status badge classes
const getStatusBadgeClasses = (status) => {
  switch (status?.toLowerCase()) {
    case 'paid':
      return 'bg-green-100 text-green-800';
    case 'invoiced - pending': // Updated status text
      return 'bg-yellow-100 text-yellow-800';
    case 'overdue':
      return 'bg-red-100 text-red-800';
    case 'not invoiced':
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

/**
 * Payment schedule component for displaying staged payments for a quote
 * and allowing invoice creation for each stage
 * 
 * @param {Object} props - Component props
 * @param {Object} props.quote - The quote object
 * @param {Function} props.onInvoiceCreate - Function called when an invoice is created
 */
const PaymentSchedule = ({ quote, onInvoiceCreate }) => {
  const navigate = useNavigate();
  
  // Fetch invoices related to this quote
  const { data: invoices, isLoading } = useQuery(
    ['invoices', quote?.id], 
    () => api.invoices.getAll().then(invoices => 
      invoices.filter(invoice => invoice.quoteId === quote?.id)
    ),
    {
      enabled: !!quote?.id,
       refetchOnMount: true,   // Consider refetching on mount
       staleTime: 0,           // Data is always stale
       cacheTime: 60000,       // Cache for 1 minute
    }
  );
  
  if (!quote) {
    return (
      // Apply Tailwind classes for styling the empty state
      <div className="mt-6 p-4 bg-white rounded-lg shadow border border-gray-200 text-center text-gray-500">
        <p>
          No quote connected. Please select a quote to view its payment schedule.
        </p>
      </div>
    );
  }
  
  if (isLoading) {
    // Wrap loading in a similar styled container
    return (
        <div className="mt-6 p-4 bg-white rounded-lg shadow border border-gray-200">
            <Loading message="Loading payment schedule..." />
        </div>
    );
  }
  
  // Calculate payment schedule
  const paymentSchedule = calculatePaymentSchedule(quote);
  
  // Check if there are any payments
  if (paymentSchedule.length === 0) {
    return (
      // Apply Tailwind classes for styling the empty state
      <div className="mt-6 p-4 bg-white rounded-lg shadow border border-gray-200 text-center text-gray-500">
        <p>
          No payment schedule available for this quote.
        </p>
      </div>
    );
  }
  
  // Find invoices for each payment stage
  const enhancedSchedule = paymentSchedule.map(stage => {
    const stageInvoices = (invoices || []).filter(invoice => 
      // Ensure description check is robust
      invoice.description && typeof invoice.description === 'string' && invoice.description.toLowerCase().includes(stage.stage.toLowerCase())
    );
    
    // Determine status based on invoices
    let status = 'Not invoiced';
    
    if (stageInvoices.length > 0) {
      const paidInvoices = stageInvoices.filter(inv => inv.status === 'paid');
      
      if (paidInvoices.length > 0) {
        status = 'Paid';
      } else {
        // Check if any invoice is overdue
        const now = new Date();
        const overdueInvoices = stageInvoices.filter(inv => 
          inv.dueDate && new Date(inv.dueDate) < now && inv.status !== 'paid'
        );
        
        if (overdueInvoices.length > 0) {
          status = 'Overdue';
        } else {
          status = 'Invoiced - Pending'; // Consistent status text
        }
      }
    }
    
    return {
      ...stage,
      invoices: stageInvoices,
      status,
    };
  });
  
  // Handle invoice creation/navigation
  const handleInvoiceAction = (stage) => {
    // Find the corresponding stage in enhancedSchedule to get invoice info
    const currentStageInfo = enhancedSchedule.find(s => s.stage === stage.stage);
    
    if (currentStageInfo?.status === 'Not invoiced') {
        // Create new invoice from this stage
        navigate(`/invoices/new?quoteId=${quote.id}&stage=${stage.stage}`);
        if (onInvoiceCreate) {
          onInvoiceCreate(stage);
        }
    } else if (currentStageInfo?.invoices?.length > 0) {
        // Navigate to the first existing invoice for this stage
        navigate(`/invoices/${currentStageInfo.invoices[0].id}`);
    } else {
        // Fallback or error handling if needed
        console.warn("Could not determine action for stage:", stage);
    }
  };
  
  return (
    // Main container with Tailwind styling
    <div className="mt-6 bg-white rounded-lg shadow overflow-hidden border border-gray-200">
      <h3 className="text-lg font-medium leading-6 text-gray-900 px-4 py-3 border-b border-gray-200 bg-gray-50">
        Payment Schedule
      </h3>
      
      {/* Table container */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {/* Apply Tailwind classes to header cells */}
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Stage
              </th>
              <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Amount
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Due When
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {enhancedSchedule.map((stage) => (
              <tr key={stage.stage} className="hover:bg-gray-50 transition-colors duration-150 ease-in-out">
                {/* Apply Tailwind classes to body cells */}
                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                  {stage.description}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-right">
                  {formatCurrency(stage.amount)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                  {stage.dueWhen}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm">
                  {/* Apply Tailwind classes for status badge */}
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClasses(stage.status)}`}>
                    {stage.status}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-right">
                  {/* Use Button component with appropriate variant */}
                  <Button
                    variant={stage.status === 'Not invoiced' ? 'primary' : 'secondary'}
                    size="sm"
                    onClick={() => handleInvoiceAction(stage)}
                  >
                    {stage.status === 'Not invoiced' ? 'Create Invoice' : 'View Invoice'}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Payment Terms Section */}
      <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
        <p className="text-sm text-gray-600">
          <span className="font-medium text-gray-700">Payment Terms:</span>{' '}
          {quote.paymentTerms === '1' ? '50% deposit, 50% on completion' :
           quote.paymentTerms === '2' ? '50% deposit, 25% on joinery completion, 25% on final completion' :
           quote.paymentTerms === '4' ? 'Full payment before delivery' :
           quote.customTerms || 'Custom terms'}
        </p>
      </div>
    </div>
  );
};

export default PaymentSchedule;