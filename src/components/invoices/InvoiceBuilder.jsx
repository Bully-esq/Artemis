import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';

// Components
import PageLayout from '../components/common/PageLayout';
import Button from '../components/common/Button';
import Dialog from '../components/common/Dialog';
import FormField from '../components/common/FormField';
import Loading from '../components/common/Loading';
import Tabs from '../components/common/Tabs';
import InvoicePreview from '../components/invoices/InvoicePreview';
import PaymentSchedule from '../components/invoices/PaymentSchedule';

// Utilities & Hooks
import { useAppContext } from '../context/AppContext';
import { calculateDueDate, formatDate } from '../utils/calculations';
import api from '../services/api';

const InvoiceBuilder = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const quoteId = searchParams.get('quoteId');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { addNotification, settings } = useAppContext();
  
  // Local state
  const [invoiceData, setInvoiceData] = useState({
    id: '',
    quoteId: quoteId || '',
    invoiceNumber: '',
    clientName: '',
    clientCompany: '',
    clientEmail: '',
    clientPhone: '',
    clientAddress: '',
    invoiceDate: formatDate(new Date()),
    dueDate: formatDate(calculateDueDate(new Date(), settings)),
    amount: 0,
    description: '',
    notes: settings.invoice?.notesTemplate || '',
    status: 'pending',
    items: [],
    paidAt: null
  });
  
  const [invoiceType, setInvoiceType] = useState('deposit');
  const [showCisDialog, setShowCisDialog] = useState(false);
  const [cisData, setCisData] = useState({
    labourItems: [],
    cisRate: 20,
    applyToCurrent: false
  });
  
  // Fetch data for existing invoice or related quote
  const { data: invoice, isLoading: isLoadingInvoice } = useQuery(
    ['invoice', id],
    () => api.invoices.getById(id),
    { 
      enabled: !!id,
      onSuccess: (data) => {
        if (data) {
          setInvoiceData({
            ...data,
            items: data.items || []
          });
          
          // If we have a related quote, load it too
          if (data.quoteId) {
            queryClient.prefetchQuery(
              ['quote', data.quoteId],
              () => api.quotes.getById(data.quoteId)
            );
          }
        }
      },
      onError: (error) => {
        addNotification(`Error loading invoice: ${error.message}`, 'error');
        navigate('/invoices');
      }
    }
  );
  
  // Fetch related quote if we have quoteId
  const { data: quote, isLoading: isLoadingQuote } = useQuery(
    ['quote', invoiceData.quoteId || quoteId],
    () => api.quotes.getById(invoiceData.quoteId || quoteId),
    {
      enabled: !!(invoiceData.quoteId || quoteId),
      onSuccess: (data) => {
        if (data && !id) { // Only prepopulate for new invoices
          setInvoiceData(prev => ({
            ...prev,
            quoteId: data.id,
            clientName: data.clientName || '',
            clientCompany: data.clientCompany || '',
            clientEmail: data.clientEmail || '',
            clientPhone: data.clientPhone || '',
            clientAddress: data.clientAddress || '',
          }));
        }
      }
    }
  );
  
  // Save invoice mutation
  const saveInvoiceMutation = useMutation(
    (data) => api.invoices.save(data),
    {
      onSuccess: (response) => {
        queryClient.invalidateQueries('invoices');
        addNotification('Invoice saved successfully', 'success');
        
        // If this is a new invoice, navigate to the edit page
        if (!id && response?.id) {
          navigate(`/invoices/${response.id}`);
        }
      },
      onError: (error) => {
        addNotification(`Error saving invoice: ${error.message}`, 'error');
      }
    }
  );
  
  // Mark invoice as paid mutation
  const markAsPaidMutation = useMutation(
    (data) => api.invoices.save(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('invoices');
        addNotification('Invoice marked as paid', 'success');
      },
      onError: (error) => {
        addNotification(`Error marking invoice as paid: ${error.message}`, 'error');
      }
    }
  );
  
  // Delete invoice mutation
  const deleteInvoiceMutation = useMutation(
    (id) => api.invoices.delete(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('invoices');
        addNotification('Invoice deleted successfully', 'success');
        navigate('/invoices');
      },
      onError: (error) => {
        addNotification(`Error deleting invoice: ${error.message}`, 'error');
      }
    }
  );
  
  // Set invoice number when creating a new invoice
  useEffect(() => {
    if (!id && !invoiceData.invoiceNumber) {
      const year = new Date().getFullYear();
      const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      const prefix = settings.invoice?.prefix || 'INV-';
      
      setInvoiceData(prev => ({
        ...prev,
        invoiceNumber: `${prefix}${year}-${random}`
      }));
    }
  }, [id, invoiceData.invoiceNumber, settings.invoice?.prefix]);
  
  // Generate invoice based on quote and invoice type
  const generateInvoice = () => {
    if (!quote) {
      addNotification('No quote is connected to this invoice', 'error');
      return;
    }
    
    // Calculate amount based on invoice type and quote total
    const quoteItems = Array.isArray(quote.selectedItems) ? quote.selectedItems : [];
    const quoteHiddenCosts = Array.isArray(quote.hiddenCosts) ? quote.hiddenCosts : [];
    
    // Calculate total quote value (simplified - in a real app you'd use your exact calculation logic)
    const quoteTotal = quoteItems.reduce((total, item) => {
      if (item.hideInQuote) return total;
      const itemTotal = item.cost * item.quantity * (1 + item.markup / 100);
      return total + itemTotal;
    }, 0);
    
    let amount = 0;
    let description = '';
    
    switch (invoiceType) {
      case 'deposit':
        amount = quoteTotal * 0.5;
        description = '50% Deposit';
        break;
      case 'interim':
        amount = quoteTotal * 0.25;
        description = '25% Interim Payment';
        break;
      case 'final':
        amount = quoteTotal * 0.25;
        description = '25% Final Payment';
        break;
      case 'full':
        amount = quoteTotal;
        description = 'Full Payment';
        break;
      case 'custom':
        amount = quoteTotal;
        description = 'Payment';
        break;
    }
    
    // Add details to description if provided
    const typeDetails = document.getElementById('invoice-type-details')?.value?.trim();
    if (typeDetails) {
      description += ` for ${typeDetails}`;
    }
    
    // Update invoice data
    setInvoiceData(prev => ({
      ...prev,
      amount,
      description
    }));
    
    // Show success message
    addNotification('Invoice generated successfully', 'success');
  };
  
  // Save invoice
  const saveInvoice = () => {
    // Validate required fields
    if (!invoiceData.clientName) {
      addNotification('Client name is required', 'error');
      return;
    }
    
    if (!invoiceData.invoiceDate) {
      addNotification('Invoice date is required', 'error');
      return;
    }
    
    if (!invoiceData.dueDate) {
      addNotification('Due date is required', 'error');
      return;
    }
    
    if (invoiceData.amount <= 0) {
      addNotification('Invoice amount must be greater than zero', 'error');
      return;
    }
    
    // Prepare invoice data
    const invoice = {
      ...invoiceData,
      id: invoiceData.id || Date.now().toString(),
      updatedAt: new Date().toISOString()
    };
    
    // If it's a new invoice, add createdAt
    if (!id) {
      invoice.createdAt = new Date().toISOString();
    }
    
    // Save the invoice
    saveInvoiceMutation.mutate(invoice);
  };
  
  // Mark invoice as paid
  const markAsPaid = () => {
    if (invoiceData.status === 'paid') {
      addNotification('Invoice is already marked as paid', 'info');
      return;
    }
    
    const updatedInvoice = {
      ...invoiceData,
      status: 'paid',
      paidAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    markAsPaidMutation.mutate(updatedInvoice);
    
    // Update local state
    setInvoiceData(updatedInvoice);
  };
  
  // Delete invoice with confirmation
  const deleteInvoice = () => {
    if (window.confirm('Are you sure you want to delete this invoice? This action cannot be undone.')) {
      deleteInvoiceMutation.mutate(invoiceData.id);
    }
  };
  
  // Apply CIS deduction to the invoice
  const handleApplyCIS = () => {
    if (!invoiceData || invoiceData.amount <= 0) {
      addNotification('Please generate or load an invoice first', 'error');
      return;
    }
    
    setShowCisDialog(true);
  };
  
  // Process CIS application
  const processCISDeduction = () => {
    // Basic validation
    if (cisData.labourItems.length === 0) {
      addNotification('Please add at least one labour item', 'error');
      return;
    }
    
    if (cisData.cisRate < 0 || cisData.cisRate > 30) {
      addNotification('CIS rate must be between 0 and 30%', 'error');
      return;
    }
    
    // Calculate labour total
    const labourTotal = cisData.labourItems.reduce((sum, item) => sum + item.amount, 0);
    
    // Calculate CIS deduction amount
    const cisDeduction = labourTotal * (cisData.cisRate / 100);
    
    // Update invoice items
    const nonCisItems = (invoiceData.items || []).filter(item => item.type !== 'cis');
    
    const newItems = [
      ...nonCisItems,
      // Add labour items
      ...cisData.labourItems.map(item => ({
        id: `labour-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        name: item.name,
        description: item.description || item.name,
        amount: item.amount,
        isLabour: true,
        category: 'labour'
      })),
      // Add CIS deduction item
      {
        id: `cis-${Date.now()}`,
        name: 'CIS Deduction',
        description: `CIS -${cisData.cisRate}%`,
        amount: -cisDeduction, // Negative amount for deduction
        type: 'cis',
        cisRate: cisData.cisRate,
        cisDetails: settings.cis // Attach CIS details to the item
      }
    ];
    
    // Update invoice amount (total after CIS deduction)
    const newAmount = invoiceData.amount - cisDeduction;
    
    setInvoiceData(prev => ({
      ...prev,
      items: newItems,
      amount: newAmount
    }));
    
    setShowCisDialog(false);
    addNotification(`CIS deduction of ${cisData.cisRate}% applied`, 'success');
  };
  
  // Export invoice to PDF
  const exportToPDF = () => {
    // This would be implemented with a PDF generation library
    addNotification('PDF export functionality coming soon', 'info');
    // In a full implementation, you would use a library like jsPDF or html2pdf
  };
  
  // Loading state
  if (isLoadingInvoice || (quoteId && isLoadingQuote)) {
    return <Loading fullScreen message="Loading invoice data..." />;
  }
  
  return (
    <PageLayout
      title={id ? 'Edit Invoice' : 'Create Invoice'}
      actions={
        <div className="flex space-x-3">
          <Button variant="secondary" onClick={() => navigate('/invoices')}>
            Back to Invoices
          </Button>
        </div>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="md:col-span-1">
          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <h2 className="text-lg font-semibold mb-4">Invoice Details</h2>
            
            <FormField
              label="Invoice Type"
              name="invoice-type"
              type="select"
              value={invoiceType}
              onChange={(e) => setInvoiceType(e.target.value)}
            >
              <option value="deposit">Deposit (50%)</option>
              <option value="interim">Interim Payment (25%)</option>
              <option value="final">Final Payment (25%)</option>
              <option value="full">Full Payment (100%)</option>
              <option value="custom">Custom</option>
            </FormField>
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                label="Invoice Date"
                name="invoice-date"
                type="date"
                value={invoiceData.invoiceDate}
                onChange={(e) => setInvoiceData(prev => ({ ...prev, invoiceDate: e.target.value }))}
              />
              
              <FormField
                label="Due Date"
                name="due-date"
                type="date"
                value={invoiceData.dueDate}
                onChange={(e) => setInvoiceData(prev => ({ ...prev, dueDate: e.target.value }))}
              />
            </div>
            
            <FormField
              label="Description Details"
              name="invoice-type-details"
              placeholder="e.g. for staircase, for balustrading, etc."
              value={invoiceData.typeDetails || ''}
              onChange={(e) => setInvoiceData(prev => ({ ...prev, typeDetails: e.target.value }))}
            />
            
            <FormField
              label="Additional Notes"
              name="invoice-notes"
              type="textarea"
              value={invoiceData.notes || ''}
              onChange={(e) => setInvoiceData(prev => ({ ...prev, notes: e.target.value }))}
            />
            
            <Button
              variant="green"
              fullWidth
              onClick={generateInvoice}
              disabled={!quote}
              className="mt-4"
            >
              Generate Invoice
            </Button>
          </div>
          
          {quote && (
            <div className="bg-white p-6 rounded-lg shadow mb-6">
              <h2 className="text-lg font-semibold mb-4">Connected Quote</h2>
              <div>
                <p><strong>Quote for:</strong> {quote.clientName} {quote.clientCompany ? `(${quote.clientCompany})` : ''}</p>
                <p><strong>Date:</strong> {quote.date ? new Date(quote.date).toLocaleDateString() : 'No date'}</p>
                <p><strong>Amount:</strong> £{Array.isArray(quote.selectedItems) 
                  ? quote.selectedItems
                    .filter(item => !item.hideInQuote)
                    .reduce((total, item) => total + (item.cost * item.quantity * (1 + item.markup / 100)), 0)
                    .toFixed(2)
                  : '0.00'
                }</p>
                <p><strong>Payment Terms:</strong> {
                  quote.paymentTerms === '1' ? '50% deposit, 50% on completion' :
                  quote.paymentTerms === '2' ? '50% deposit, 25% on joinery completion, 25% on final completion' :
                  quote.paymentTerms === '4' ? 'Full payment before delivery' :
                  quote.paymentTerms === '3' ? 'Custom terms' :
                  'Standard payment terms'
                }</p>
              </div>
            </div>
          )}
          
          {quote && (
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-lg font-semibold mb-4">Payment Schedule</h2>
              <PaymentSchedule
                quote={quote}
                invoices={[]}  // In the real app, you'd fetch and pass related invoices
                onCreateInvoice={(stage) => {
                  setInvoiceType(stage);
                  generateInvoice();
                }}
                onViewInvoice={(id) => navigate(`/invoices/${id}`)}
              />
            </div>
          )}
        </div>
        
        {/* Right column */}
        <div className="md:col-span-2">
          <div className="flex flex-wrap gap-2 mb-6">
            <Button
              onClick={() => navigate('/invoices')}
              variant="secondary"
            >
              <i className="fas fa-arrow-left mr-2"></i> Back
            </Button>
            
            <Button
              onClick={saveInvoice}
              isLoading={saveInvoiceMutation.isLoading}
              variant="primary"
            >
              <i className="fas fa-save mr-2"></i> Save
            </Button>
            
            {id && (
              <>
                <Button
                  onClick={handleApplyCIS}
                  variant="secondary"
                >
                  <i className="fas fa-percentage mr-2"></i> Apply CIS
                </Button>
                
                <Button
                  onClick={markAsPaid}
                  isLoading={markAsPaidMutation.isLoading}
                  disabled={invoiceData.status === 'paid'}
                  variant={invoiceData.status === 'paid' ? 'secondary' : 'green'}
                >
                  <i className="fas fa-check-circle mr-2"></i> Mark as Paid
                </Button>
                
                <Button
                  onClick={deleteInvoice}
                  isLoading={deleteInvoiceMutation.isLoading}
                  variant="danger"
                >
                  <i className="fas fa-trash-alt mr-2"></i> Delete
                </Button>
                
                <Button
                  onClick={exportToPDF}
                  variant="secondary"
                >
                  <i className="fas fa-file-pdf mr-2"></i> Export PDF
                </Button>
              </>
            )}
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4">Invoice Preview</h2>
            <div className="border rounded-lg overflow-hidden">
              <InvoicePreview
                invoice={invoiceData}
                settings={settings}
              />
            </div>
          </div>
        </div>
      </div>
      
      {/* CIS Dialog */}
      {showCisDialog && (
        <Dialog
          title="Apply CIS Deduction"
          isOpen={showCisDialog}
          onClose={() => setShowCisDialog(false)}
          size="lg"
          footer={
            <div className="flex justify-end space-x-3">
              <Button variant="secondary" onClick={() => setShowCisDialog(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={processCISDeduction}>
                Apply CIS
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <p className="text-gray-600">
              Enter labour costs to calculate Construction Industry Scheme (CIS) deductions.
            </p>
            
            <FormField
              label="CIS Rate (%)"
              name="cis-rate"
              type="number"
              min="0"
              max="30"
              value={cisData.cisRate}
              onChange={(e) => setCisData(prev => ({ ...prev, cisRate: parseFloat(e.target.value) || 0 }))}
            />
            
            <div className="border p-4 rounded-lg">
              <h3 className="font-medium mb-2">Labour Items</h3>
              
              {cisData.labourItems.map((item, index) => (
                <div key={index} className="flex items-center gap-2 mb-2 p-2 border rounded">
                  <div className="flex-grow">
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-gray-600">£{item.amount.toFixed(2)}</p>
                  </div>
                  <Button 
                    variant="danger" 
                    size="sm"
                    onClick={() => setCisData(prev => ({
                      ...prev,
                      labourItems: prev.labourItems.filter((_, i) => i !== index)
                    }))}
                  >
                    Remove
                  </Button>
                </div>
              ))}
              
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium mb-2">Add Labour Item</h4>
                <div className="space-y-3">
                  <FormField
                    label="Labour Description"
                    name="labour-name"
                    id="labour-name"
                  />
                  <FormField
                    label="Amount (£)"
                    name="labour-amount"
                    id="labour-amount"
                    type="number"
                    min="0"
                    step="0.01"
                  />
                  <Button
                    variant="secondary"
                    onClick={() => {
                      const name = document.getElementById('labour-name')?.value;
                      const amount = parseFloat(document.getElementById('labour-amount')?.value);
                      
                      if (!name || !amount) {
                        addNotification('Please enter a description and amount', 'error');
                        return;
                      }
                      
                      setCisData(prev => ({
                        ...prev,
                        labourItems: [
                          ...prev.labourItems,
                          { name, amount }
                        ]
                      }));
                      
                      // Clear fields
                      if (document.getElementById('labour-name')) {
                        document.getElementById('labour-name').value = '';
                      }
                      if (document.getElementById('labour-amount')) {
                        document.getElementById('labour-amount').value = '';
                      }
                    }}
                  >
                    Add Item
                  </Button>
                </div>
              </div>
            </div>
            
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-medium mb-2">CIS Calculation Preview</h3>
              <div className="grid grid-cols-2 gap-2">
                <div>Invoice Total:</div>
                <div className="text-right">£{invoiceData.amount.toFixed(2)}</div>
                
                <div>Labour Total:</div>
                <div className="text-right">£{cisData.labourItems.reduce((sum, item) => sum + item.amount, 0).toFixed(2)}</div>
                
                <div>CIS Deduction ({cisData.cisRate}%):</div>
                <div className="text-right text-red-600">
                  -£{(cisData.labourItems.reduce((sum, item) => sum + item.amount, 0) * (cisData.cisRate / 100)).toFixed(2)}
                </div>
                
                <div className="font-medium border-t pt-1">Final Total:</div>
                <div className="text-right font-medium border-t pt-1">
                  £{(invoiceData.amount - cisData.labourItems.reduce((sum, item) => sum + item.amount, 0) * (cisData.cisRate / 100)).toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        </Dialog>
      )}
    </PageLayout>
  );
};

export default InvoiceBuilder;