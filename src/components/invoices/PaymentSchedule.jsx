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
      <div className="payment-schedule-container">
        <p className="empty-message">
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
      <div className="payment-schedule-container">
        <p className="empty-message">
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
    let statusClass = 'status-not-invoiced';
    
    if (stageInvoices.length > 0) {
      const paidInvoices = stageInvoices.filter(inv => inv.status === 'paid');
      
      if (paidInvoices.length > 0) {
        status = 'Paid';
        statusClass = 'status-paid';
      } else {
        // Check if any invoice is overdue
        const now = new Date();
        const overdueInvoices = stageInvoices.filter(inv => 
          new Date(inv.dueDate) < now && inv.status !== 'paid'
        );
        
        if (overdueInvoices.length > 0) {
          status = 'Overdue';
          statusClass = 'status-overdue';
        } else {
          status = 'Invoiced - Pending';
          statusClass = 'status-pending';
        }
      }
    }
    
    return {
      ...stage,
      invoices: stageInvoices,
      status,
      statusClass
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
    <div className="payment-schedule-container">
      <h3 className="payment-schedule-title">Payment Schedule</h3>
      
      <table className="payment-schedule-table">
        <thead className="payment-schedule-header">
          <tr>
            <th scope="col" className="payment-schedule-header-cell">
              Stage
            </th>
            <th scope="col" className="payment-schedule-header-cell text-right">
              Amount
            </th>
            <th scope="col" className="payment-schedule-header-cell">
              Due When
            </th>
            <th scope="col" className="payment-schedule-header-cell">
              Status
            </th>
            <th scope="col" className="payment-schedule-header-cell text-right">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="payment-schedule-body">
          {enhancedSchedule.map((stage, index) => (
            <tr key={stage.stage}>
              <td className="payment-schedule-cell">
                <div className="stage-description">
                  {stage.description}
                </div>
              </td>
              <td className="payment-schedule-cell text-right">
                <div className="stage-amount">
                  £{stage.amount.toFixed(2)}
                </div>
              </td>
              <td className="payment-schedule-cell">
                <div className="stage-due-when">
                  {stage.dueWhen}
                </div>
              </td>
              <td className="payment-schedule-cell">
                <div className={`stage-status ${stage.statusClass}`}>
                  {stage.status}
                </div>
              </td>
              <td className="payment-schedule-cell text-right">
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
      
      <div className="payment-terms">
        <p>
          <span className="payment-terms-label">Payment Terms:</span> {' '}
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