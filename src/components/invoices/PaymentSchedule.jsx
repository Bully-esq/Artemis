import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import { calculatePaymentSchedule } from '../../utils/calculations';
import Button from '../common/Button';
import Loading from '../common/Loading';
import api from '../../services/api';

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
    }
  );
  
  if (!quote) {
    return (
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <p className="text-gray-500 text-center py-6">
          No quote connected. Please select a quote to view its payment schedule.
        </p>
      </div>
    );
  }
  
  if (isLoading) {
    return <Loading message="Loading payment schedule..." />;
  }
  
  // Calculate payment schedule
  const paymentSchedule = calculatePaymentSchedule(quote);
  
  // Check if there are any payments
  if (paymentSchedule.length === 0) {
    return (
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <p className="text-gray-500 text-center py-6">
          No payment schedule available for this quote.
        </p>
      </div>
    );
  }
  
  // Find invoices for each payment stage
  const enhancedSchedule = paymentSchedule.map(stage => {
    const stageInvoices = (invoices || []).filter(invoice => 
      invoice.description && invoice.description.toLowerCase().includes(stage.stage)
    );
    
    // Determine status based on invoices
    let status = 'Not invoiced';
    let statusColor = 'text-gray-500';
    
    if (stageInvoices.length > 0) {
      const paidInvoices = stageInvoices.filter(inv => inv.status === 'paid');
      
      if (paidInvoices.length > 0) {
        status = 'Paid';
        statusColor = 'text-green-600';
      } else {
        // Check if any invoice is overdue
        const now = new Date();
        const overdueInvoices = stageInvoices.filter(inv => 
          new Date(inv.dueDate) < now && inv.status !== 'paid'
        );
        
        if (overdueInvoices.length > 0) {
          status = 'Overdue';
          statusColor = 'text-red-600';
        } else {
          status = 'Invoiced - Pending';
          statusColor = 'text-blue-600';
        }
      }
    }
    
    return {
      ...stage,
      invoices: stageInvoices,
      status,
      statusColor
    };
  });
  
  // Handle invoice creation
  const handleCreateInvoice = (stage) => {
    // Check if already invoiced
    const existingInvoice = enhancedSchedule.find(s => 
      s.stage === stage.stage && s.invoices && s.invoices.length > 0
    );
    
    if (existingInvoice) {
      // Navigate to existing invoice
      navigate(`/invoices/${existingInvoice.invoices[0].id}`);
    } else {
      // Create new invoice from this stage
      navigate(`/invoices/new?quoteId=${quote.id}&stage=${stage.stage}`);
    }
    
    if (onInvoiceCreate) {
      onInvoiceCreate(stage);
    }
  };
  
  return (
    <div className="bg-white p-4 rounded-lg shadow-sm">
      <h3 className="font-medium text-lg mb-4">Payment Schedule</h3>
      
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Stage
            </th>
            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Amount
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Due When
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {enhancedSchedule.map((stage, index) => (
            <tr key={stage.stage}>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">
                  {stage.description}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right">
                <div className="text-sm font-medium text-gray-900">
                  £{stage.amount.toFixed(2)}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-500">
                  {stage.dueWhen}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className={`text-sm font-medium ${stage.statusColor}`}>
                  {stage.status}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                {stage.status === 'Not invoiced' ? (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleCreateInvoice(stage)}
                  >
                    Create Invoice
                  </Button>
                ) : (
                  <Button
                    variant={stage.status === 'Paid' ? 'secondary' : 'primary'}
                    size="sm"
                    onClick={() => navigate(`/invoices/${stage.invoices[0]?.id}`)}
                  >
                    View Invoice
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      
      <div className="mt-4 text-sm text-gray-500">
        <p>
          <span className="font-semibold">Payment Terms:</span> {' '}
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