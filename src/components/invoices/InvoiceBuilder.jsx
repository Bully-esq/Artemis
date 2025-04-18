import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from 'react-query';
import { useAppContext } from '../../context/AppContext';
import api from '../../services/api';
import pdfGenerator from '../../services/pdfGenerator';
import { formatDate } from '../../utils/formatters';
import html2pdf from 'html2pdf.js'; // Add html2pdf import
/* import '../../styles/index.css'; */ // Removed as Tailwind is used now

// Components
import Button from '../common/Button';
import Loading from '../common/Loading';
import FormField from '../common/FormField';
import Tabs from '../common/Tabs';
import Dialog from '../common/Dialog';
import InvoicePreview from './InvoicePreview';
import PaymentSchedule from './PaymentSchedule'; // Import PaymentSchedule component
import ContactSelector from '../contacts/ContactSelector'; // Update import path for ContactSelector
import PageLayout from '../common/PageLayout';
import { ActionButtonContainer } from '../common/ActionButtonContainer';  // If this exists

// Custom CSS for labour items and CIS deductions
/*
const styles = {
  labourRow: {
    backgroundColor: 'rgba(173, 216, 230, 0.3)',
  },
  cisDeductionRow: {
    backgroundColor: 'rgba(255, 99, 71, 0.1)',
    fontStyle: 'italic',
  },
};
*/

const InvoiceBuilder = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const quoteId = searchParams.get('quoteId');
  const { addNotification, settings } = useAppContext();
  const queryClient = useQueryClient(); // Get query client instance
  
  // Update the searchParams section
  const amount = searchParams.get('amount') ? parseFloat(searchParams.get('amount')) : 0;
  const invoiceType = searchParams.get('type') || 'Deposit (50%)';
  const quoteTotal = searchParams.get('total') ? parseFloat(searchParams.get('total')) : 0;

  // Extract VAT information from search parameters
  const vatEnabled = searchParams.get('vatEnabled') === 'true';
  const vatRate = searchParams.get('vatRate') ? parseFloat(searchParams.get('vatRate')) : 20;
  const vatAmount = searchParams.get('vatAmount') ? parseFloat(searchParams.get('vatAmount')) : 0;

  // For quick add line items
  const [newItemName, setNewItemName] = useState('');
  const [newItemAmount, setNewItemAmount] = useState('');
  const [newItemQuantity, setNewItemQuantity] = useState(1);

  // Update the useState section to use these parameters 
  const [invoiceDetails, setInvoiceDetails] = useState({
    invoiceNumber: '',
    clientName: '',
    clientCompany: '',
    clientEmail: '',
    clientPhone: '',
    clientAddress: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    amount: amount,
    description: '',
    status: 'pending',
    quoteId: quoteId || '',
    type: invoiceType,
    quoteTotal: quoteTotal,
    cisApplied: false,
    cisDeduction: 0,
    originalGrossAmount: 0, // Add field to store original amount before CIS
    laborTotal: 0,          // Add field to store calculated labor total
    cisRecordId: null,      // Add field to store the ID of the saved CIS record
    originalLineItemsBeforeCIS: null, // Add field to store line items before CIS
    lineItems: [],
    vatInfo: {
      enabled: vatEnabled,
      rate: vatRate,
      amount: vatAmount,
      includedInTotal: true // Flag indicating VAT is already in the total
    }
  });

  const [activeTab, setActiveTab] = useState('create');
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  
  // Add these new state variables for contact selection
  const [showContactSelector, setShowContactSelector] = useState(false);
  const [contactSearchTerm, setContactSearchTerm] = useState('');

  // Fetch invoice if we have an ID
  const { 
    data: fetchedInvoiceData, // Rename the data variable
    isLoading: isLoadingInvoice, 
    isFetching: isFetchingInvoice // Add isFetching for finer loading state
  } = useQuery(
    ['invoice', id],
    () => api.invoices.getById(id),
    {
      enabled: !!id, // Only fetch if ID exists
      // Remove onSuccess here, handle in useEffect
      onError: (error) => {
        addNotification(`Error loading invoice: ${error.message}`, 'error');
      }
    }
  );
  
  // Log the fetched data when it changes
  console.log("Fetched Invoice Data from useQuery:", fetchedInvoiceData);

  // *** RESTORE Fetch quote if we have a quoteId ***
  const { data: quote, isLoading: isLoadingQuote } = useQuery(
    ['quote', quoteId], // Use the quoteId from searchParams
    () => api.quotes.getById(quoteId),
    {
      enabled: !!quoteId && !id, // Only fetch if quoteId exists AND we are not editing an existing invoice (id is null)
      onSuccess: (data) => {
        if (data && !id) { // Ensure we only pre-fill for NEW invoices from quotes
          console.log("Loaded quote data for new invoice:", data);
          // Pre-fill details from quote only when creating a new invoice
          const quoteLineItems = data.lineItems || [];
          const laborItems = quoteLineItems.filter(item => 
            (item.description && (
              item.description.toLowerCase().includes('labour') || 
              item.description.toLowerCase().includes('labor')
            )) ||
            item.category === 'labour' ||
            item.isLabour === true
          );
          const totalLaborAmount = laborItems.reduce(
            (sum, item) => sum + (parseFloat(item.amount) || 0), 0
          );
          const processedLineItems = laborItems.map(item => ({
            id: item.id || `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            description: item.description || 'Labor',
            amount: parseFloat(item.amount) || 0,
            quantity: parseFloat(item.quantity) || 1,
            isLabour: true
          }));
          let invoiceAmount = amount; // Use amount from searchParams if available
          if (!invoiceAmount && data.grandTotal) {
            if (invoiceType.includes('50%')) { invoiceAmount = data.grandTotal * 0.5; }
            else if (invoiceType.includes('25%')) { invoiceAmount = data.grandTotal * 0.25; }
            else if (invoiceType.includes('Full')) { invoiceAmount = data.grandTotal; }
          }
          setInvoiceDetails(prev => ({
            ...prev, // Keep existing fields like invoiceNumber
            clientName: data.client?.name || data.clientName || '',
            clientCompany: data.client?.company || data.clientCompany || '',
            clientEmail: data.client?.email || data.clientEmail || '',
            clientPhone: data.client?.phone || data.clientPhone || '',
            clientAddress: data.client?.address || data.clientAddress || '',
            description: `${invoiceType} for ${data.client?.company || data.clientCompany || 'project'}`,
            quoteId: data.id,
            amount: invoiceAmount || prev.amount, // Use calculated or param amount
            quoteTotal: data.grandTotal || 0,
            lineItems: processedLineItems, 
            laborTotal: totalLaborAmount, 
             // Reset CIS fields when creating from quote
            cisApplied: false, 
            cisRecordId: null,
            originalLineItemsBeforeCIS: null,
            originalGrossAmount: 0,
            cisDeduction: 0 
          }));
        }
      }
      // No critical onError needed here
    }
  );

  // NEW: Effect to update local state when fetchedInvoiceData changes
  useEffect(() => {
    // Only run if we have an ID (editing existing) and fetched data is available
    if (id && fetchedInvoiceData) {
      console.log("useEffect running: Merging fetchedInvoiceData into state");

      setInvoiceDetails(prevDetails => {
        // Ensure fetched data has priority, especially for parsed fields from the server
        const updatedDetails = {
          ...prevDetails,         // Start with previous state
          ...fetchedInvoiceData,  // Spread fetched data (should include correctly parsed arrays for lineItems and originalLineItemsBeforeCIS)
          // Ensure boolean type for cisApplied, using the value from fetched data
          cisApplied: Boolean(fetchedInvoiceData.cisApplied),
          // Ensure lineItems and originalLineItemsBeforeCIS default correctly if missing in fetchedData
          lineItems: fetchedInvoiceData.lineItems || [],
          originalLineItemsBeforeCIS: fetchedInvoiceData.originalLineItemsBeforeCIS || null,
        };
        console.log("Data being merged into invoiceDetails state:", updatedDetails);
        return updatedDetails;
      });
    }
  }, [id, fetchedInvoiceData]);
  
  // Generate a unique invoice number if creating a new invoice
  useEffect(() => {
    if (!id && !invoiceDetails.invoiceNumber) {
      // Directly use fallback generation logic since getNextInvoiceNumber doesn't exist
      console.log("Generating fallback invoice number for new invoice.");
      const prefix = 'INV-';
      const year = new Date().getFullYear();
      const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      setInvoiceDetails(prev => ({
        ...prev,
        invoiceNumber: `${prefix}${year}-${random}`
      }));
    }
  }, [id, invoiceDetails.invoiceNumber]); // Keep dependency array
  
  // Helper function to check for line items and confirm before proceeding
  const checkLineItems = () => {
    if (!invoiceDetails.lineItems || invoiceDetails.lineItems.length === 0) {
      if (window.confirm(`This invoice currently has no line items added. Are you sure you want to proceed?`)) {
        return true; // Proceed
      } else {
        addNotification(`Action cancelled: Invoice has no line items.`, 'info');
        return false; // Cancel
      }
    }
    return true; // Proceed (items exist)
  };
  
  // Calculate totals based on line items and VAT info
  const calculateTotals = (details) => {
    // Calculate subtotal from line items, ensuring CIS deduction is handled
    let subtotal = (details.lineItems || []).reduce((sum, item) => {
        // Add amount * quantity for regular items
        // For CIS deduction (negative amount), just add the amount
        const itemTotal = (item.type === 'cis') ? (parseFloat(item.amount) || 0) : (parseFloat(item.amount) || 0) * (parseFloat(item.quantity) || 1);
        return sum + itemTotal;
    }, 0);
    
    // If CIS was applied, the subtotal should be the net amount after deduction.
    // If not, the subtotal is simply the sum of line items.
    // Let's reconcile: If CIS is applied, the 'amount' field on invoiceDetails *should* be the net total.
    // The sum calculated above should match `details.amount` if CIS is applied.
    // For clarity, we might recalculate based on original items if CIS is applied.

    let displaySubtotal = details.cisApplied ? details.originalGrossAmount : subtotal;
    let calculatedVatAmount = 0;
    let grandTotal = details.amount; // Start with the current invoice amount (net if CIS applied)

    if (details.vatInfo?.enabled) {
        const vatRateDecimal = (details.vatInfo.rate || 0) / 100;
        // Calculate VAT based on the amount *before* potential CIS deduction but *after* line item sums
        const baseForVat = details.cisApplied ? details.originalGrossAmount : subtotal;
        calculatedVatAmount = baseForVat * vatRateDecimal;
        // If VAT is included in the total already, don't add it again.
        // If VAT is NOT included (e.g., added separately), add it to the grand total.
        // Assuming vatInfo.includedInTotal means the line items *already* contain VAT.
        // If line items are EXCLUSIVE of VAT, then we add VAT to the subtotal.
        // For now, let's assume line items DO NOT include VAT and it's added here.
        // If CIS is applied, VAT is calculated on the original gross amount.
        grandTotal = baseForVat + calculatedVatAmount - (details.cisApplied ? details.cisDeduction : 0);
        displaySubtotal = baseForVat; // Show pre-VAT subtotal
    } else {
       // If VAT is disabled, the grand total is just the (potentially CIS-adjusted) amount.
       grandTotal = details.amount;
       displaySubtotal = details.cisApplied ? details.originalGrossAmount : grandTotal; // Show pre-CIS gross or final amount
    }
    
    // Ensure displayed subtotal reflects the gross amount before CIS if applied
    if(details.cisApplied) {
        displaySubtotal = details.originalGrossAmount;
    }

    return {
      subtotal: displaySubtotal || 0,
      vatAmount: calculatedVatAmount || 0,
      grandTotal: grandTotal || 0,
      cisDeduction: details.cisDeduction || 0, // Pass through CIS deduction for display
      isVatEnabled: details.vatInfo?.enabled || false
    };
  };

  // Handle form submission
  const handleSubmit = async (e, dataToSubmit = invoiceDetails) => {
    e.preventDefault();
    console.log('handleSubmit called. Data to submit:', dataToSubmit);

    // Validate using dataToSubmit
    if (!dataToSubmit.clientName) {
      addNotification('Client name is required', 'error');
      console.log('handleSubmit validation failed: Missing clientName');
      return null; // Return null on validation error
    }

    if (!dataToSubmit.amount || dataToSubmit.amount <= 0 && dataToSubmit.lineItems?.length > 0) { // Allow zero amount if no line items (e.g. draft)
      // Check if CIS is applied - if so, amount can be zero or negative
      if (!dataToSubmit.cisApplied) {
         addNotification('Amount must be greater than zero unless CIS is applied', 'error');
         console.log('handleSubmit validation failed: Invalid amount');
         return null; // Return null on validation error
      }
    }

    // Add more validation if needed...

    try {
      console.log('handleSubmit validation passed. Preparing data...');

      // Start with the data passed in or current state
      let invoiceData = { ...dataToSubmit };

      // Use the ID from the URL params if available and not already in data
      if (id && !invoiceData.id) {
        invoiceData.id = id;
      }

      // Check if it's an existing invoice or a new one
      if (invoiceData.id) {
        invoiceData.updatedAt = new Date().toISOString();
        console.log('handleSubmit preparing UPDATE with ID:', invoiceData.id);
      } else {
        // Generate ID if still missing (should ideally happen earlier)
        invoiceData.id = invoiceData.id || `inv-${Date.now().toString()}`;
        const now = new Date().toISOString();
        invoiceData.createdAt = invoiceData.createdAt || now;
        invoiceData.updatedAt = now;
        console.log('handleSubmit preparing CREATE with new ID:', invoiceData.id);
      }

      console.log('handleSubmit FINAL data being sent to api.invoices.save:', JSON.stringify(invoiceData, null, 2));

      console.log('handleSubmit attempting to save data:', invoiceData);
      // *** The API save call ***
      const response = await api.invoices.save(invoiceData);
      console.log('handleSubmit save successful. Response:', response);

      // Ensure we have the final saved invoice data from the response
      const savedInvoice = response.invoice || { ...invoiceData, id: response.id || invoiceData.id }; // Use response data if available

      // *** Update React Query Cache ***
      // 1. Update the cache for *this specific* invoice immediately
      if (savedInvoice.id) {
          console.log(`Updating cache for ['invoice', ${savedInvoice.id}]`);
          queryClient.setQueryData(['invoice', savedInvoice.id], savedInvoice);
          // Optionally invalidate to trigger background refetch for absolute certainty
          // queryClient.invalidateQueries(['invoice', savedInvoice.id]); 
      }

      // 2. Invalidate the query for the list of all invoices
      console.log("Invalidating cache for ['invoices'] list.");
      queryClient.invalidateQueries('invoices');

      addNotification('Invoice saved successfully', 'success');
      // navigate('/invoices'); // Keep navigation commented out for auto-save

      // *** Return the saved invoice data ***
      return savedInvoice; 

    } catch (error) {
      console.error('handleSubmit error during save:', error);
      addNotification(`Error saving invoice: ${error.message}`, 'error');
      // *** Return null or throw error on failure ***
      return null; // Or potentially throw error
    }
  };
  
  // Mark invoice as paid
  const handleMarkAsPaid = async () => {
    if (invoiceDetails.status === 'paid') {
      addNotification('This invoice is already marked as paid', 'info');
      return;
    }
    
    try {
      const updatedInvoice = {
        ...invoiceDetails,
        status: 'paid',
        paidAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      await api.invoices.save(updatedInvoice);
      addNotification('Invoice marked as paid', 'success');
      setInvoiceDetails(updatedInvoice);
    } catch (error) {
      addNotification(`Error updating invoice: ${error.message}`, 'error');
    }
  };

  // Generate PDF
  const handleExportPDF = async () => {
    if (!checkLineItems()) return; // Check for line items

    try {
      // First save the invoice
      await handleSaveInvoice();
      
      // Then proceed with PDF generation
      const invoicePreviewElement = document.querySelector('.invoice-preview');
      
      if (!invoicePreviewElement) {
        throw new Error('Invoice preview element not found');
      }
      
      // Add notification
      addNotification('Invoice saved. Generating PDF...', 'info');
      
      // Add PDF export classes
      invoicePreviewElement.classList.add('pdf-export-mode');
      invoicePreviewElement.classList.add('pdf-a4-format');
      
      // Configure options
      const options = {
        filename: `Invoice_${invoiceDetails.invoiceNumber || 'Untitled'}_${new Date().toISOString().split('T')[0]}.pdf`,
        margin: [15, 15, 15, 15],
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };
      
      // Generate PDF using html2pdf - using explicit promise pattern
      return new Promise((resolve, reject) => {
        html2pdf()
          .from(invoicePreviewElement)
          .set(options)
          .save()
          .then(() => {
            // Remove PDF export classes
            invoicePreviewElement.classList.remove('pdf-export-mode');
            invoicePreviewElement.classList.remove('pdf-a4-format');
            
            addNotification('PDF exported successfully!', 'success');
            resolve(true);
          })
          .catch(err => {
            // Remove PDF export classes
            invoicePreviewElement.classList.remove('pdf-export-mode');
            invoicePreviewElement.classList.remove('pdf-a4-format');
            
            console.error('PDF generation error in promise:', err);
            addNotification(`Error generating PDF: ${err.message}`, 'error');
            reject(err);
          });
      });
    } catch (error) {
      console.error('PDF generation error:', error);
      addNotification(`Error generating PDF: ${error.message}`, 'error');
      
      // Make sure we remove the classes if there's an error
      const invoicePreviewElement = document.querySelector('.invoice-preview');
      if (invoicePreviewElement) {
        invoicePreviewElement.classList.remove('pdf-export-mode');
        invoicePreviewElement.classList.remove('pdf-a4-format');
      }
      
      return Promise.reject(error);
    }
  };

  // Handle emails
  const handleEmailInvoice = () => {
    // The check will happen when actions are chosen in the dialog
    setShowEmailDialog(true);
  };

  // Handle save invoice
  const handleSaveInvoice = async (invoiceDataToSave = invoiceDetails) => {
    console.log('handleSaveInvoice called. Data received:', invoiceDataToSave);
    try {
      const eventStub = { preventDefault: () => {} };
      console.log("handleSaveInvoice passing data to handleSubmit:", invoiceDataToSave);
      // *** Capture and return the result from handleSubmit ***
      const savedResult = await handleSubmit(eventStub, invoiceDataToSave); 
      return savedResult; // Return the saved invoice object or null
    } catch (error) {
      console.error('Error in handleSaveInvoice:', error);
      addNotification('Auto-save failed.', 'error');
      return null; // Return null on error
    }
  };

  // Add this function after handleSaveInvoice
  const handleCreateSeries = async () => {
    try {
      // First save the current invoice
      await handleSaveInvoice();
      
      // If this is not from a quote or there's no quoteTotal, we can't create a series
      if (!invoiceDetails.quoteId || !invoiceDetails.quoteTotal) {
        addNotification('Cannot create invoice series without a connected quote', 'error');
        return;
      }
      
      const quoteId = invoiceDetails.quoteId;
      const total = invoiceDetails.quoteTotal;
      
      // Get quote details to determine payment terms
      const quote = await api.quotes.getById(quoteId);
      
      if (!quote) {
        addNotification('Could not fetch quote details', 'error');
        return;
      }
      
      const paymentTerms = quote.paymentTerms;
      let remainingInvoices = [];
      
      // Create the remaining invoices based on payment terms
      if (paymentTerms === '1' && invoiceDetails.type === 'Deposit (50%)') {
        // Add the final 50% payment
        remainingInvoices.push({
          type: 'Final Payment (50%)',
          amount: total * 0.5,
          description: `Final Payment (50%) for ${quote.clientCompany || 'project'}`
        });
      } else if (paymentTerms === '2') {
        if (invoiceDetails.type === 'Deposit (50%)') {
          // Add interim and final payments
          remainingInvoices.push(
            {
              type: 'Interim Payment (25%)',
              amount: total * 0.25,
              description: `Interim Payment (25%) for ${quote.clientCompany || 'project'}`
            },
            {
              type: 'Final Payment (25%)',
              amount: total * 0.25,
              description: `Final Payment (25%) for ${quote.clientCompany || 'project'}`
            }
          );
        } else if (invoiceDetails.type === 'Interim Payment (25%)') {
          // Add just the final payment
          remainingInvoices.push({
            type: 'Final Payment (25%)',
            amount: total * 0.25,
            description: `Final Payment (25%) for ${quote.clientCompany || 'project'}`
          });
        }
      }
      
      // Create each remaining invoice
      for (const invoiceData of remainingInvoices) {
        const newInvoice = {
          ...invoiceDetails,
          id: Date.now().toString() + Math.floor(Math.random() * 1000),
          invoiceNumber: `INV-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
          amount: invoiceData.amount,
          type: invoiceData.type,
          description: invoiceData.description,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        await api.invoices.save(newInvoice);
      }
      
      if (remainingInvoices.length > 0) {
        addNotification(`Created ${remainingInvoices.length} additional invoice(s)`, 'success');
      } else {
        addNotification('No additional invoices needed for this payment schedule', 'info');
      }
      
      // Navigate to the invoices list
      navigate('/invoices');
    } catch (error) {
      console.error('Error creating invoice series:', error);
      addNotification(`Error: ${error.message}`, 'error');
    }
  };

  // Function to handle invoice creation for a specific payment stage
  const handleCreateInvoiceForStage = (stage) => {
    if (!quote) return;
    
    // Get all labor items from the quote
    const quoteLineItems = quote.lineItems || [];
    const laborItems = quoteLineItems.filter(item => 
      (item.description && (
        item.description.toLowerCase().includes('labour') || 
        item.description.toLowerCase().includes('labor')
      )) ||
      item.category === 'labour' ||
      item.isLabour === true
    );
    
    // Process the labor items for the invoice
    const processedLaborItems = laborItems.map(item => ({
      id: item.id || `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      description: item.description || 'Labor',
      amount: parseFloat(item.amount) || 0,
      quantity: parseFloat(item.quantity) || 1,
      isLabour: true
    }));
    
    // Calculate total labor amount
    const totalLaborAmount = laborItems.reduce(
      (sum, item) => sum + (parseFloat(item.amount) || 0), 
      0
    );
    
    // Calculate stage percentage based on the stage name
    let percentage = 1; // default to 100%
    if (stage.stage.includes('50%')) {
      percentage = 0.5;
    } else if (stage.stage.includes('25%')) {
      percentage = 0.25;
    }
    
    // Apply the percentage to each labor item
    const scaledLaborItems = processedLaborItems.map(item => ({
      ...item,
      amount: item.amount * percentage
    }));
    
    // Update invoice details for this stage
    setInvoiceDetails(prev => ({
      ...prev,
      amount: stage.amount,
      description: `${stage.description} for ${quote.client?.company || quote.clientCompany || 'project'}`,
      type: stage.stage,
      lineItems: scaledLaborItems,
      laborTotal: totalLaborAmount * percentage
    }));
    
    // Show notification
    addNotification(`Payment stage selected: ${stage.description} (Labor items included)`, 'info');
  };

  // Handle adding new items to the invoice
  const handleAddItem = () => {
    if (!newItemName || !newItemAmount) {
      addNotification('Please fill in both item name and amount', 'warning');
      return;
    }

    const newItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      description: newItemName,
      amount: parseFloat(newItemAmount),
      quantity: parseInt(newItemQuantity) || 1,
    };
    
    console.log('Adding item:', newItem); // DEBUG: Log the item being added

    setInvoiceDetails(prev => {
      // Log the current state before update
      console.log('Current lineItems before update:', prev.lineItems);
      
      // Create the updated state
      const updatedState = {
        ...prev,
        lineItems: [...(prev.lineItems || []), newItem],
        amount: prev.amount + (newItem.amount * newItem.quantity)
      };
      
      // Log the new state that will be set
      console.log('New lineItems after update:', updatedState.lineItems);
      
      return updatedState;
    });

    // Clear the form
    setNewItemName('');
    setNewItemAmount('');
    setNewItemQuantity(1);
  };

  // Handle removing items from the invoice
  const handleRemoveItem = (itemId) => {
    setInvoiceDetails(prev => {
      const item = prev.lineItems.find(i => i.id === itemId);
      const itemTotal = (parseFloat(item.amount) || 0) * (parseFloat(item.quantity) || 1);
      
      return {
        ...prev,
        lineItems: prev.lineItems.filter(i => i.id !== itemId),
        amount: prev.amount - itemTotal
      };
    });
  };

  // Handle Apply CIS
  const handleApplyCIS = async () => {
    console.log("Starting CIS application...");

    // --- Ensure Invoice is Saved FIRST ---
    let currentInvoiceData = { ...invoiceDetails }; // Work with a local copy
    if (!currentInvoiceData.id) {
      addNotification("Saving invoice before applying CIS...", "info");
      const savedInvoice = await handleSaveInvoice(); // Call save
      if (!savedInvoice || !savedInvoice.id) {
        addNotification("Failed to save invoice. Cannot apply CIS.", "error");
        return; // Stop if save failed
      }
      // Update local copy and potentially state (though state update might be delayed)
      currentInvoiceData = savedInvoice; 
      // It's generally safer to use the ID from the returned object `savedInvoice.id`
      // than relying on `invoiceDetails.id` immediately after a state update inside the same function.
      console.log(`Invoice saved/updated. Using ID: ${currentInvoiceData.id}`);
    } else {
      console.log(`Invoice already has ID: ${currentInvoiceData.id}. Proceeding with CIS.`);
    }

    // --- Proceed with existing CIS logic, using currentInvoiceData ---
    // Use currentInvoiceData instead of invoiceDetails for checks and payload
    
    if (currentInvoiceData.cisApplied) {
      addNotification('CIS has already been applied to this invoice', 'info');
      return;
    }

    const originalGrossAmount = currentInvoiceData.amount || 0;
    if (originalGrossAmount <= 0) {
      addNotification('Invoice amount must be greater than zero to apply CIS.', 'warning');
      return;
    }

    try {
      // --- Labor Calculation ---
      let quoteLabourTotal = 0;
      if (currentInvoiceData.quoteId) {
         // Fetch quote data using queryClient.getQueryData or api.quotes.getById
         const quoteData = queryClient.getQueryData(['quote', currentInvoiceData.quoteId]) || await api.quotes.getById(currentInvoiceData.quoteId);
         if (quoteData) {
             const quoteItems = quoteData.selectedItems || quoteData.lineItems || [];
             const quoteLabourItems = quoteItems.filter(item =>
                 item.category === 'labour' || item.isLabour === true || (item.type && item.type.toLowerCase() === 'labour') ||
                 (item.description && (item.description.toLowerCase().includes('labour') || item.description.toLowerCase().includes('labor') || item.description.toLowerCase().includes('install') || item.description.toLowerCase().includes('fitting'))) ||
                 (item.name && (item.name.toLowerCase().includes('labour') || item.name.toLowerCase().includes('labor') || item.name.toLowerCase().includes('install') || item.name.toLowerCase().includes('fitting')))
             );
             quoteLabourTotal = quoteLabourItems.reduce((sum, item) => {
                 const itemAmount = parseFloat(item.cost || item.amount || 0);
                 const itemQuantity = parseFloat(item.quantity || 1);
                 return sum + (itemAmount * itemQuantity);
             }, 0);
             console.log("DEBUG - Quote Labor Total Calculated:", quoteLabourTotal);
         }
      }
      
      // Calculate manual labor total *before* using it
      const manualLineItems = currentInvoiceData.lineItems || [];
      const manualLabourItems = manualLineItems.filter(item =>
          !item.type || item.type !== 'cis' // Exclude the CIS deduction itself if present
      ).filter(item =>
          item.isLabour === true || // Explicit flag
          item.category === 'labour' || // Explicit category
          (item.description && (item.description.toLowerCase().includes('labour') || item.description.toLowerCase().includes('labor') || item.description.toLowerCase().includes('install') || item.description.toLowerCase().includes('fitting'))) ||
          (item.name && (item.name.toLowerCase().includes('labour') || item.name.toLowerCase().includes('labor') || item.name.toLowerCase().includes('install') || item.name.toLowerCase().includes('fitting')))
      );
      const manualLabourTotal = manualLabourItems.reduce((sum, item) => {
          const itemAmount = parseFloat(item.amount || 0);
          const itemQuantity = parseFloat(item.quantity || 1);
          return sum + (itemAmount > 0 ? (itemAmount * itemQuantity) : 0); // Ignore negative amounts
      }, 0);
      console.log("DEBUG - Manual Invoice Labour Total Calculated:", manualLabourTotal);
      
      // Now calculate totalLaborAmount
      let totalLaborAmount = quoteLabourTotal + manualLabourTotal;
      console.log(`DEBUG - Combined Labour Total (Quote: ${quoteLabourTotal.toFixed(2)}, Manual: ${manualLabourTotal.toFixed(2)}): ${totalLaborAmount.toFixed(2)}`);

      if (totalLaborAmount <= 0.01) { // Check combined total
        addNotification('No labour items found. CIS not applied.', 'warning');
        return;
      }
      if (totalLaborAmount > originalGrossAmount) {
        totalLaborAmount = originalGrossAmount; // Clamp
      }

      // --- CIS Calculation ---
      const nonLaborAmount = originalGrossAmount - totalLaborAmount;
      const cisRate = settings?.cis?.rate || 0.20; // Use settings rate if available
      const cisDeduction = totalLaborAmount * cisRate;
      const netAmount = originalGrossAmount - cisDeduction;

      // --- Create New Line Items ---
      const newLineItems = [];
      if (nonLaborAmount > 0.01) { newLineItems.push({ /*...*/ description: "Materials/Non-Labour", amount: nonLaborAmount, quantity: 1 }); }
      if (totalLaborAmount > 0.01) { newLineItems.push({ /*...*/ description: "Labour Charges", amount: totalLaborAmount, quantity: 1 }); }
      newLineItems.push({ /*...*/ description: `CIS Deduction (${(cisRate * 100).toFixed(0)}%)`, amount: -cisDeduction, quantity: 1, type: 'cis' });

      // --- Prepare Updated State (WITHOUT explicitly creating CIS record here) ---
      const originalItems = [...currentInvoiceData.lineItems];
      const updatedInvoiceState = {
        ...currentInvoiceData, // Use data potentially updated by save
        lineItems: newLineItems,
        amount: netAmount,
        cisApplied: true, // Signal backend to apply CIS
        cisDeduction: cisDeduction, // Send calculated values
        laborTotal: totalLaborAmount,
        originalGrossAmount: originalGrossAmount,
        originalLineItemsBeforeCIS: originalItems,
        // Let the backend handle creating/assigning cisRecordId on save
        cisRecordId: currentInvoiceData.cisRecordId || null // Preserve existing ID if somehow already set, otherwise null
      };

      // --- Save the final invoice state WITH CIS details prepared ---
      console.log("Saving invoice state with CIS details prepared...");
      // The backend /api/invoices POST should now handle CIS record creation/linking
      const savedInvoiceWithCIS = await handleSaveInvoice(updatedInvoiceState);

      if (savedInvoiceWithCIS && savedInvoiceWithCIS.id) {
          console.log("Invoice state saved successfully. Backend handled CIS.");
          // Update local state with the final data returned from the backend,
          // including the cisRecordId assigned by the backend.
          setInvoiceDetails(savedInvoiceWithCIS); 
          addNotification('CIS deduction applied and invoice saved.', 'success');
          
          // Invalidate the query cache for CIS records
          console.log("Invalidating cisRecordsAll query...");
          queryClient.invalidateQueries('cisRecordsAll');
      } else {
          console.error("Failed to save invoice after preparing CIS state.");
          addNotification('Failed to save invoice with CIS changes.', 'error');
          // Potentially revert local state if save fails?
          // setInvoiceDetails(currentInvoiceData); // Revert to state before CIS attempt
      }

    } catch (error) {
      console.error("Error applying CIS:", error);
      addNotification(`Error applying CIS: ${error.message}`, 'error');
    }
  };

  // Add handleUndoCIS function
  const handleUndoCIS = async () => {
    const recordIdToDelete = invoiceDetails.cisRecordId; // Keep this for logging if needed

    if (!invoiceDetails.cisApplied) {
      addNotification('CIS has not been applied to this invoice.', 'warning');
      return;
    }
    // Check if record ID exists - it might not if the initial save failed
    if (!recordIdToDelete) {
        addNotification('CIS record ID is missing, cannot remove from backend. Reverting local changes.', 'warning');
        // Fall through to revert local state anyway
    }


    if (!window.confirm('Are you sure you want to undo the CIS application? This will attempt to remove the record from the database.')) {
      return;
    }

    try {
      // --- Prepare the reverted state --- 
      let revertedState = {}; 
      setInvoiceDetails(prev => {
          const originalItems = prev.originalLineItemsBeforeCIS || prev.lineItems;
          const originalAmount = prev.originalGrossAmount || prev.amount;
          revertedState = {
              ...prev,
              lineItems: originalItems, 
              amount: originalAmount, 
              cisApplied: false, // Signal backend to undo CIS
              cisDeduction: 0,
              laborTotal: 0, 
              cisRecordId: null, // Clear the record ID
              originalLineItemsBeforeCIS: null,
              originalGrossAmount: 0,
          };
          return revertedState; 
      });

      // --- Save the reverted invoice state --- 
      // The backend /api/invoices POST should now handle CIS record deletion
      if (Object.keys(revertedState).length > 0) {
          console.log("Saving reverted invoice state (CIS undo)...");
          const savedRevertedInvoice = await handleSaveInvoice(revertedState); 
          if (savedRevertedInvoice) {
              console.log("Reverted invoice state saved successfully. Backend handled CIS undo.");
              // Update state again with potentially cleaned data from backend
              setInvoiceDetails(savedRevertedInvoice);
              addNotification('CIS successfully undone and invoice saved.', 'success');
              
              // Invalidate the query cache for CIS records
              console.log("Invalidating cisRecordsAll query...");
              queryClient.invalidateQueries('cisRecordsAll');
          } else {
              console.error("Failed to save reverted invoice state.");
              addNotification('Failed to save invoice after undoing CIS.', 'error');
              // Consider reverting the revert? More complex UI state management needed.
          }
      } else {
          console.warn("Could not save reverted state as it was empty.");
      }

    } catch (error) {
      console.error("Error during CIS undo process:", error);
      addNotification(`Error undoing CIS: ${error.message}`, 'error');
    }
  };

  // Modify handleDeleteInvoice to call the backend CIS delete *after* invoice delete succeeds
  const handleDeleteInvoice = async () => {
    if (window.confirm(`Are you sure you want to delete invoice ${invoiceDetails.invoiceNumber}? This action cannot be undone.`)) {
      const invoiceIdToDelete = invoiceDetails.id;
      const recordIdToDelete = invoiceDetails.cisRecordId; // Get CIS record ID *before* potentially losing state

      try {
        // 1. Delete the Invoice via API
        if (invoiceIdToDelete) {
          console.log(`Attempting to delete invoice ${invoiceIdToDelete} via API...`);
          await api.invoices.delete(invoiceIdToDelete);
          queryClient.invalidateQueries('invoices'); // Invalidate cache
          addNotification('Invoice deleted successfully', 'success');
        } else {
          addNotification('Invoice draft discarded', 'info');
          // If it was just a draft, navigate away immediately
          navigate('/invoices');
          return;
        }

        // 2. If Invoice Deletion Successful, Delete Associated CIS Record via API
        if (recordIdToDelete) { // Check if there was a linked CIS record
            try {
                console.log(`Attempting to delete associated CIS record ${recordIdToDelete} via API...`);
                // *** Use the API call ***
                const response = await api.cis.delete(recordIdToDelete);
                 if (response.success) {
                    console.log(`Associated CIS record ${recordIdToDelete} deleted from backend.`);
                    addNotification('Associated CIS record removed.', 'info');
                 } else {
                    console.warn(`Failed to confirm deletion of associated CIS record ${recordIdToDelete} from backend:`, response);
                    addNotification('Invoice deleted, but failed to remove associated CIS record.', 'warning');
                 }
            } catch (cisError) {
                console.error('Error deleting associated CIS record via API:', cisError);
                addNotification(`Invoice deleted, but encountered an error removing associated CIS record: ${cisError.message}`, 'error');
            }
        }
        // Else: If no recordIdToDelete, do nothing further

        // 3. Navigate away after all operations
        navigate('/invoices');

      } catch (error) { // Catches errors from invoice deletion mainly
        console.error('Error during invoice deletion process:', error);
        addNotification(`Error deleting invoice: ${error.message}`, 'error');
        // Don't navigate away if invoice deletion failed
      }
    }
  };

  // Add function to export PDF and open email client
  const handleExportAndOpenEmail = async () => {
    if (!checkLineItems()) return; // Check for line items

    try {
      // First save the invoice
      await handleSaveInvoice();
      
      // Then export PDF and open email client
      const exported = await handleExportPDF();
      
      if (exported) {
        // Then open email client
        handleOpenEmailClient();
      }
    } catch (error) {
      console.error('Error in export and email process:', error);
      addNotification(`Error: ${error.message}`, 'error');
    }
  };

  // Handle client details change
  const handleClientChange = (field, value) => {
    setInvoiceDetails(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  // Add this function after your component's state declarations but before useEffect
  const calculateQuoteTotal = (quote) => {
    // If we already have a stored value, use that
    if (invoiceDetails.quoteTotal && invoiceDetails.quoteTotal > 0) {
      return invoiceDetails.quoteTotal;
    }
    
    // If grandTotal exists on the quote, use it
    if (typeof quote.grandTotal === 'number' && quote.grandTotal > 0) {
      return quote.grandTotal;
    }
    
    // If total exists on the quote, use it
    if (typeof quote.total === 'number' && quote.total > 0) {
      return quote.total;
    }
    
    // Try to parse the search param as a number
    if (quoteTotal) {
      const parsedTotal = parseFloat(quoteTotal);
      if (!isNaN(parsedTotal) && parsedTotal > 0) {
        return parsedTotal;
      }
    }
    
    // If we have line items, calculate the total
    if (Array.isArray(quote.lineItems) && quote.lineItems.length > 0) {
      return quote.lineItems.reduce((total, item) => {
        const itemCost = parseFloat(item.cost || 0);
        const itemQuantity = parseFloat(item.quantity || 1);
        return total + (itemCost * itemQuantity);
      }, 0);
    }
    
    // If we have selectedItems (from QuoteBuilder), calculate from those
    if (Array.isArray(quote.selectedItems) && quote.selectedItems.length > 0) {
      return quote.selectedItems.reduce((total, item) => {
        const itemCost = parseFloat(item.cost || 0);
        const itemQuantity = parseFloat(item.quantity || 1);
        return total + (itemCost * itemQuantity);
      }, 0);
    }
    
    // Fallback to default
    return 0;
  };

  // Add handleOpenEmailClient function
  const handleOpenEmailClient = () => {
    if (!checkLineItems()) return; // Check for line items

    const subject = `${invoiceDetails.client.address}`;
    const body = `Hi ${invoiceDetails.clientName},\n\nPlease find attached your invoice (${invoiceDetails.invoiceNumber}) for ${invoiceDetails.description || 'your project'}.\n\nThe invoice is due by ${
      invoiceDetails.dueDate ? new Date(invoiceDetails.dueDate).toLocaleDateString('en-GB') : 'the date specified'
    }.\n\nIf you have any questions, please don't hesitate to contact me.\n\nBest regards,\n${settings.company?.name || 'Your Company'}`;
    
    // Open the mailto link
    window.location.href = `mailto:${invoiceDetails.clientEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    // Close the dialog
    setShowEmailDialog(false);
  };

  // UPDATED Loading check
  // Show loading if react-query is loading/fetching OR if we are editing 
  // an existing invoice (id exists) but invoiceDetails hasn't been populated yet
  const showLoading = isLoadingInvoice || isFetchingInvoice || (id && !invoiceDetails.id);

  if (showLoading) {
    return <Loading message="Loading invoice data..." />;
  }
  
  return (
    <PageLayout title={id ? 'Edit Invoice' : 'Create Invoice'}>
      {/* Add ActionButtonContainer below the header */}
      <div className="action-button-container mb-4"> {/* Added margin-bottom for spacing */}
        {/* Apply flexbox for horizontal layout with wrapping */}
        {/* Reverting: Add wrap back, remove overflow */}
        <div className="invoice-builder-actions flex flex-wrap gap-2">
          {/* Moved Paid button to the top */}
          <Button
            variant="primary"
            onClick={handleMarkAsPaid}
            disabled={invoiceDetails.status === 'paid'}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5em' }}
          >
            <span className="btn-icon">✓</span>
            Paid
          </Button>

          <Button
            variant="primary"
            onClick={handleExportPDF}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5em' }}
          >
            <span className="btn-icon">📄</span>
            Export PDF
          </Button>
          
          <Button
            variant="primary"
            onClick={handleEmailInvoice}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5em' }}
          >
            <span className="btn-icon">✉️</span>
            Email Invoice
          </Button>
          
          <Button
            variant="danger"
            onClick={handleDeleteInvoice}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5em' }}
          >
            <span className="btn-icon">🗑</span>
            Delete Invoice
          </Button>
        </div>
      </div>
      
      <div className="tabs-container">
        <div className="card">
          <div className="card-body">
            <div className="tabs-with-actions">
              <Tabs
                tabs={[
                  { id: 'create', label: 'Create Invoice' },
                  { id: 'list', label: 'Invoice List' }
                ]}
                activeTab={activeTab}
                onChange={(tab) => {
                  if (tab === 'list') {
                    navigate('/invoices');
                  } else {
                    setActiveTab(tab);
                  }
                }}
                variant="underline"
                className="invoice-tabs"
              />
            </div>
          </div>
        </div>
      </div>
      
      {/* Remove the invoice-layout div which enforces side-by-side layout */}
      {/* <div className="invoice-layout"> */}
        {/* Left column - Form */}
        {/* Add mb-4 for margin-bottom */}
        <div className="invoice-form-panel mb-4"> 
          <div className="card">
            <div className="card-body">
              <form onSubmit={handleSubmit}>
                {/* Client Details Section */}
                <div className="card mb-4">
                  <div className="card-body">
                    <h3 className="card-subtitle">Client Details</h3><br></br>
                    <div className="mb-3">
                      <Button
                        variant="primary"
                        type="button"
                        size="sm"
                        onClick={() => setShowContactSelector(true)}
                        className="select-contact-btn mb-2"
                      >
                        Select Contact
                      </Button>
                      <FormField
                        label="Client Name"
                        value={invoiceDetails.clientName}
                        onChange={(e) => setInvoiceDetails({...invoiceDetails, clientName: e.target.value})}
                        required
                      />
                    </div>
                    
                    {/* Company field - Make full width */}
                    <div className="form-field mb-3"> {/* Use form-field for consistent spacing */} 
                      <FormField
                        label="Company"
                        value={invoiceDetails.clientCompany}
                        onChange={(e) => setInvoiceDetails({...invoiceDetails, clientCompany: e.target.value})}
                      />
                    </div>
                    
                    {/* Email field - Full width on its own line */}
                    <div className="form-field mb-3"> 
                      <FormField
                        label="Email"
                        type="email"
                        value={invoiceDetails.clientEmail}
                        onChange={(e) => setInvoiceDetails({...invoiceDetails, clientEmail: e.target.value})}
                      />
                    </div>
                    
                    {/* Phone field - Full width on its own line */}
                    <div className="form-field mb-3"> 
                      <FormField
                        label="Phone"
                        value={invoiceDetails.clientPhone}
                        onChange={(e) => setInvoiceDetails({...invoiceDetails, clientPhone: e.target.value})}
                      />
                    </div>
                    
                    {/* Address field - Remains full width */}
                    <div className="form-field">
                      <FormField
                        label="Address"
                        type="textarea"
                        value={invoiceDetails.clientAddress}
                        onChange={(e) => setInvoiceDetails({...invoiceDetails, clientAddress: e.target.value})}
                        rows={3}
                      />
                    </div>
                  </div>
                </div>
                
                {/* Invoice Type */}
                <div className="form-field">
                  <label className="form-label dark:text-gray-300">Invoice Type</label>
                  <select
                    className="form-select dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
                    value={invoiceDetails.type || 'Deposit (50%)'}
                    onChange={(e) => setInvoiceDetails({...invoiceDetails, type: e.target.value})}
                  >
                    <option value="Deposit (50%)">Deposit (50%)</option>
                    <option value="Interim Payment (25%)">Interim Payment (25%)</option>
                    <option value="Final Payment (25%)">Final Payment (25%)</option>
                    <option value="Full Payment">Full Payment</option>
                    <option value="Custom">Custom</option>
                  </select>
                </div>
                
                {/* Invoice Date - Remove form-row, add margin */} 
                <div className="form-field mb-3"> {/* Changed from form-row */} 
                  <label className="form-label dark:text-gray-300">Invoice Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={invoiceDetails.invoiceDate || ''}
                    onChange={(e) => setInvoiceDetails({...invoiceDetails, invoiceDate: e.target.value})}
                    required
                  />
                </div>
                
                {/* Due Date - Remove form-row, add margin */} 
                <div className="form-field mb-3">
                  <label className="form-label dark:text-gray-300">Due Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={invoiceDetails.dueDate || ''}
                    onChange={(e) => setInvoiceDetails({...invoiceDetails, dueDate: e.target.value})}
                    required
                  />
                </div>
                
                {/* Additional Notes */}
                <div className="form-field">
                  <label className="form-label">Additional Notes</label>
                  <textarea
                    className="form-textarea"
                    rows="4"
                    value={invoiceDetails.notes || ''}
                    onChange={(e) => setInvoiceDetails({...invoiceDetails, notes: e.target.value})}
                  ></textarea>
                </div>
                
                {/* Description Details */}
                <div className="form-field">
                  <label className="form-label">Description Details</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. for staircase, for balustrading, etc."
                    value={invoiceDetails.description || ''}
                    onChange={(e) => setInvoiceDetails({...invoiceDetails, description: e.target.value})}
                    required
                  />
                </div>
                
                {/* Move the Create All Invoices button to a more appropriate location */}
                {invoiceDetails.quoteId && invoiceDetails.quoteTotal > 0 && (
                  <div className="form-actions">
                    <Button
                      type="button"
                      variant="primary"
                      onClick={handleCreateSeries}
                      className="create-series-btn"
                    >
                      Create All Invoices
                    </Button>
                  </div>
                )}
              </form>
              
              {/* Quick Add Item section removed as redundant */}
              
              {/* Line Items Section - Apply card structure */} 
              <div className="card mb-4">{/* Added card wrapper */}
                <div className="card-body">{/* Added card-body wrapper */}
                  {/* Removed explicit styling from inner div */}
                  <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200 border-b dark:border-gray-600 pb-2">Line Items</h2>
                  
                  {/* Line Items List */}
                  <div className="space-y-3 mb-6">
                    {/* Header Row (Optional but good for clarity) */}
                    {invoiceDetails.lineItems && invoiceDetails.lineItems.length > 0 && (
                      <div className="hidden md:grid md:grid-cols-6 gap-4 text-sm font-medium text-gray-500 dark:text-gray-400 px-3 py-2 border-b dark:border-gray-600">
                        <div className="md:col-span-3">Description</div>
                        <div className="text-right">Qty</div>
                        <div className="text-right">Unit Price</div>
                        <div className="text-right">Total</div>
                        {/* Empty div for alignment with remove button column */}
                        <div></div> 
                      </div>
                    )}

                    {/* Items */}
                    {invoiceDetails.lineItems && invoiceDetails.lineItems.length > 0 ? (
                      invoiceDetails.lineItems.map((item, index) => {
                        const itemTotal = (parseFloat(item.amount) || 0) * (parseFloat(item.quantity) || 1);
                        // Determine background color based on item type
                        // Add dark variants for backgrounds and text colors
                        let rowBgClass = 'hover:bg-gray-50 dark:hover:bg-gray-700/50'; // Default hover with dark mode
                        let textColorClass = 'text-gray-800 dark:text-gray-200';
                        let detailColorClass = 'text-gray-700 dark:text-gray-300';
                        let labelSpanClass = ''; // For special item types

                        if (item.isLabour) {
                          rowBgClass = 'bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-800/40'; // Light blue for labour
                          labelSpanClass = '<span class="text-xs font-semibold text-blue-600 dark:text-blue-400 ml-2">(Labour)</span>';
                          // Keep default text colors for labour rows
                        } else if (item.type === 'cis') {
                          rowBgClass = 'bg-red-50 hover:bg-red-100 dark:bg-red-900/30 dark:hover:bg-red-800/40 italic'; // Light red for CIS deduction
                          textColorClass = 'text-red-700 dark:text-red-300'; // Apply red text to main description
                          detailColorClass = 'text-red-600 dark:text-red-400'; // Slightly different red for details
                          labelSpanClass = '<span class="text-xs font-semibold ml-2">(CIS Deduction)</span>'; // Default color inherited
                        } else if (index % 2 !== 0 && !item.isLabour && item.type !== 'cis') {
                           rowBgClass = 'bg-gray-50 hover:bg-gray-100 dark:bg-gray-700/30 dark:hover:bg-gray-600/40'; // Slightly different bg for odd rows (zebra striping)
                           // Keep default text colors for odd rows
                        }

                        return (
                          <div 
                            key={item.id || `item-${index}`} // Use index as fallback key if id is missing
                            className={`grid grid-cols-1 md:grid-cols-6 gap-2 md:gap-4 items-center p-3 rounded ${rowBgClass} border-b border-gray-100 dark:border-gray-700 last:border-b-0`}
                          >
                            {/* Description */}
                            <div className={`md:col-span-3 font-medium ${textColorClass} break-words`}>
                               <span className="md:hidden font-semibold mr-2">Desc:</span> 
                               {item.description}
                               {/* Use dangerouslySetInnerHTML for the label span to handle conditional class injection */} 
                               {labelSpanClass && <span dangerouslySetInnerHTML={{ __html: labelSpanClass }} />} 
                            </div>
                            {/* Quantity */}
                            <div className={`${detailColorClass} text-right`}>
                               <span className="md:hidden font-semibold mr-2">Qty:</span> 
                               {item.quantity}
                            </div>
                            {/* Unit Price */}
                            <div className={`${detailColorClass} text-right`}>
                               <span className="md:hidden font-semibold mr-2">Unit Price:</span> 
                               £{(parseFloat(item.amount) || 0).toFixed(2)}
                             </div>
                            {/* Total Price */}
                            <div className={`${detailColorClass} font-medium text-right`}>
                               <span className="md:hidden font-semibold mr-2">Total:</span> 
                               £{itemTotal.toFixed(2)}
                            </div>
                            {/* Remove Button */}
                            <div className="text-right md:text-center">
                               {/* Show remove button only if CIS is NOT applied OR if it's the original view */}
                               {(!invoiceDetails.cisApplied || !invoiceDetails.originalLineItemsBeforeCIS) && (
                                  <Button
                                     variant="danger-ghost" // Use a less intrusive variant
                                     size="sm"
                                     onClick={() => handleRemoveItem(item.id)}
                                     className="p-1" // Reduce padding for icon-like button
                                     aria-label="Remove item"
                                  >
                                     {/* Simple X icon */}
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                       <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  </Button>
                               )}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-6 text-gray-500 dark:text-gray-400 italic">
                        No line items added yet.
                      </div>
                    )}
                  </div>
                  
                  {/* Quick Add Item Form - Render only if CIS is not applied */}
                  {!invoiceDetails.cisApplied && (
                    <div className="mt-4 p-4 border-t border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 rounded-b-md">
                      <h3 className="text-md font-medium mb-3 text-gray-700 dark:text-gray-300">Quick Add Item</h3>
                      <div className="flex flex-wrap gap-2 items-end">
                        <FormField
                          label="Item Description"
                          id="newItemName"
                          value={newItemName}
                          onChange={(e) => setNewItemName(e.target.value)}
                          placeholder="Service or product"
                          className="flex-grow"
                          labelSrOnly
                        />
                        <FormField
                          label="Quantity"
                          id="newItemQuantity"
                          type="number"
                          min="0"
                          step="any" // Allow decimal quantities if needed
                          value={newItemQuantity}
                          onChange={(e) => setNewItemQuantity(e.target.value)}
                          placeholder="Qty"
                          className="w-20" // Fixed width for quantity
                          labelSrOnly
                        />
                         <FormField
                          label="Amount (£)"
                          id="newItemAmount"
                          type="number"
                          step="0.01"
                          min="0"
                          value={newItemAmount}
                          onChange={(e) => setNewItemAmount(e.target.value)}
                          placeholder="Unit Price"
                          className="w-28" // Fixed width for amount
                          labelSrOnly
                        />
                        <Button onClick={handleAddItem} size="sm">Add Item</Button>
                      </div>
                    </div>
                  )}
                </div>{/* End card-body */}
              </div>{/* End card */}

              {/* CIS Deduction Section - Apply card structure */}
              <div className="card mb-4">{/* Added card wrapper */}
                <div className="card-body">{/* Added card-body wrapper */}
                  {/* Removed explicit styling from inner div */}
                  <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200 border-b dark:border-gray-600 pb-2">CIS Deduction (Optional)</h2>
                  <div className="space-y-4">
                    {!invoiceDetails.cisApplied ? (
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                          Apply Construction Industry Scheme (CIS) deduction based on labour items. 
                          The current rate is assumed to be {(settings?.cis?.rate || 0.20) * 100}%. 
                          Ensure all labour items are added before applying.
                        </p>
                        <Button 
                          variant="outline" 
                          onClick={handleApplyCIS}
                          // disabled={!invoiceDetails.id} // Optionally disable if invoice isn't saved yet
                        >
                          Apply CIS Deduction
                        </Button>
                         {/* Show warning if invoice isn't saved */} 
                         {!invoiceDetails.id && (
                             <p className="text-xs text-orange-600 dark:text-orange-400 mt-2">Note: Invoice will be saved before CIS can be applied.</p>
                         )}
                      </div>
                    ) : (
                      <div className="space-y-3 p-4 bg-yellow-50 dark:bg-yellow-900/50 border border-yellow-200 dark:border-yellow-700/50 rounded-md">
                        <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                          CIS Deduction Applied
                        </p>
                        <div className="text-sm text-yellow-700 dark:text-yellow-400 space-y-1">
                           <p>Original Gross Amount: <span className="font-semibold">£{(invoiceDetails.originalGrossAmount || 0).toFixed(2)}</span></p>
                           <p>Identified Labour Total: <span className="font-semibold">£{(invoiceDetails.laborTotal || 0).toFixed(2)}</span></p>
                           <p>CIS Deduction Amount ({((settings?.cis?.rate || 0.20) * 100).toFixed(0)}%): <span className="font-semibold">£{(invoiceDetails.cisDeduction || 0).toFixed(2)}</span></p>
                           <p>New Net Invoice Amount: <span className="font-semibold">£{(invoiceDetails.amount || 0).toFixed(2)}</span></p>
                        </div>
                        <Button 
                          variant="danger-outline" 
                          size="sm"
                          onClick={handleUndoCIS}
                        >
                          Undo CIS Deduction
                        </Button>
                      </div>
                    )}
                  </div>
                </div>{/* End card-body */}
              </div>{/* End card */}

              {/* Totals Section - Apply card structure */}
              <div className="card mb-4">{/* Added card wrapper */}
                 <div className="card-body">{/* Added card-body wrapper */}
                    {/* Removed explicit styling from inner div */}
                    <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200 border-b dark:border-gray-600 pb-2">Totals</h2>
                    {(() => { // Immediately invoked function to calculate and render totals
                      const totals = calculateTotals(invoiceDetails);
                      return (
                        <div className="space-y-2 text-right">
                          {/* Display Subtotal (Pre-VAT, Pre-CIS if applied, or sum of items) */}
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600 dark:text-gray-300">Subtotal:</span>
                            <span className="font-medium text-gray-800 dark:text-gray-100">£{totals.subtotal.toFixed(2)}</span>
                          </div>
                          
                          {/* Display CIS Deduction if applied */}
                          {invoiceDetails.cisApplied && (
                              <div className="flex justify-between items-center text-red-600 dark:text-red-400">
                                <span className="">CIS Deduction ({((settings?.cis?.rate || 0.20) * 100).toFixed(0)}%):</span>
                                <span className="font-medium">- £{totals.cisDeduction.toFixed(2)}</span>
                              </div>
                          )}
                          
                          {/* Display VAT if enabled */}
                          {totals.isVatEnabled && (
                            <div className="flex justify-between items-center">
                              <span className="text-gray-600 dark:text-gray-300">VAT ({invoiceDetails.vatInfo.rate}%):</span>
                              <span className="font-medium text-gray-800 dark:text-gray-100">£{totals.vatAmount.toFixed(2)}</span>
                            </div>
                          )}

                          {/* Grand Total */}
                          <div className="flex justify-between items-center pt-3 border-t dark:border-gray-600 mt-3">
                            <span className="text-lg font-semibold text-gray-900 dark:text-gray-50">Grand Total:</span>
                            <span className="text-xl font-bold text-indigo-700 dark:text-indigo-300">£{totals.grandTotal.toFixed(2)}</span>
                          </div>
                        </div>
                      );
                    })()} 
                 </div>{/* End card-body */}
              </div>{/* End card */}
            </div>
          </div>
        </div>
        
        {/* Right column - Preview Section */}
        {/* Preview panel now appears below the form panel */}
        {/* Add pb-20 for bottom padding */}
        <div className="invoice-preview-panel pb-20"> 
          {/* Invoice Preview */}
          {/* Add mb-4 for margin-bottom */}
          <div className="card mb-4"> 
            <div className="card-header">
              <h2 className="card-title">Invoice Preview</h2>
            </div>
            <div className="card-body">
              <InvoicePreview 
                invoice={invoiceDetails} 
                settings={settings} 
                printMode={false} 
              />
            </div>
          </div>
          
          {/* Connected Quote */}
          {/* Add mb-4 for margin-bottom */}
          <div className="card mb-4"> 
            <div className="card-header">
              <h2 className="card-title">Connected Quote</h2>
            </div>
            <div className="card-body">
              {quote ? (
                <>
                  <div className="connected-quote-details">
                    <div className="quote-info-grid" style={{ marginBottom: '20px' }}>
                      <div className="quote-info-row">
                        <strong>Client:</strong>
                        <span>{quote.client?.name || quote.clientName || 'Unnamed Client'}</span>
                      </div>
                      {(quote.client?.company || quote.clientCompany) && (
                        <div className="quote-info-row">
                          <strong>Company:</strong>
                          <span>{quote.client?.company || quote.clientCompany}</span>
                        </div>
                      )}
                      <div className="quote-info-row">
                        <strong>Quote ID:</strong>
                        <span>{quote.id}</span>
                      </div>
                      <div className="quote-info-row">
                        <strong>Total:</strong>
                        <span>£{calculateQuoteTotal(quote).toFixed(2)}</span>
                      </div>
                    </div>
                    
                    <div className="quote-actions" style={{ marginTop: '20px' }}>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => navigate(`/quotes/${quote.id}`)}
                        className="view-quote-btn"
                      >
                        View Quote
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <p>
                  {quoteId ? 'Loading quote information...' : 'No quote connected. Please go back to quotes page and select a quote to invoice.'}
                </p>
              )}
            </div>
          </div>
          
          {/* Payment Schedule */}
          {/* No margin needed for the last card in this section */}
          <div className="card"> 
            <div className="card-header">
              <h2 className="card-title">Payment Schedule</h2>
            </div>
            <div className="card-body">
              {quote ? (
                <div className="payment-schedule-container">
                  <table className="payment-schedule-table">
                    <thead>
                      <tr>
                        <th>Stage</th>
                        <th>Amount</th>
                        <th>Due When</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Always show standard payment stages based on quote total */}
                      <tr className="payment-schedule-row">
                        <td className="stage-column">Deposit (50%)</td>
                        <td className="amount-column">£{(calculateQuoteTotal(quote) * 0.5).toFixed(2)}</td>
                        <td className="due-column">On Acceptance</td>
                        <td className="status-column">
                          <span className="status-badge pending">Pending</span>
                        </td>
                        <td className="actions-column">
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleCreateInvoiceForStage({
                              stage: 'Deposit (50%)',
                              amount: calculateQuoteTotal(quote) * 0.5,
                              dueWhen: 'On Acceptance',
                              description: 'Initial deposit payment'
                            })}
                            className="create-invoice-btn"
                          >
                            Create Invoice
                          </Button>
                        </td>
                      </tr>
                      <tr className="payment-schedule-row">
                        <td className="stage-column">Final Payment (50%)</td>
                        <td className="amount-column">£{(calculateQuoteTotal(quote) * 0.5).toFixed(2)}</td>
                        <td className="due-column">On Completion</td>
                        <td className="status-column">
                          <span className="status-badge pending">Pending</span>
                        </td>
                        <td className="actions-column">
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleCreateInvoiceForStage({
                              stage: 'Final Payment (50%)',
                              amount: calculateQuoteTotal(quote) * 0.5,
                              dueWhen: 'On Completion',
                              description: 'Final payment'
                            })}
                            className="create-invoice-btn"
                          >
                            Create Invoice
                          </Button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="no-schedule-message">
                  {quoteId ? 'Loading payment schedule...' : 'No payment schedule available'}
                </p>
              )}
            </div>
          </div>
        </div>
      {/* </div> // End of removed invoice-layout div */}

      {/* Email Instructions Dialog */}
      <Dialog
        isOpen={showEmailDialog}
        onClose={() => setShowEmailDialog(false)}
        title="Email Invoice"
      >
        <div className="p-4 sm:p-6 space-y-6"> 
          <p className="text-base text-gray-700">
            How would you like to proceed?
          </p>
            
          <div className="flex flex-col space-y-4"> 
            <Button
              variant="primary"
              onClick={handleExportAndOpenEmail}
              className="w-full justify-center"
            >
              Export PDF and Open Email
            </Button>
              
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0 sm:space-x-3 pt-4 border-t border-gray-200">
              <Button
                variant="secondary"
                onClick={() => setShowEmailDialog(false)}
                className="w-full sm:w-auto justify-center"
              >
                Cancel
              </Button>
              <div className="flex space-x-3 justify-center sm:justify-end"> 
                <Button
                  variant="secondary"
                  onClick={handleExportPDF}
                >
                  Export PDF Only
                </Button>
                <Button
                  variant="secondary"
                  onClick={handleOpenEmailClient}
                >
                  Email Only
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Dialog>

      {/* Contact Selector Dialog */}
      <Dialog
        isOpen={showContactSelector}
        onClose={() => setShowContactSelector(false)}
        title="Select Contact"
        size="md"
      >
        <div className="form-field">
          <label className="form-label">
            Search Contacts
          </label>
          <input
            type="text"
            value={contactSearchTerm}
            onChange={(e) => setContactSearchTerm(e.target.value)}
            placeholder="Search by name, company, email..."
            className="form-input"
          />
        </div>
        
        <ContactSelector 
          searchTerm={contactSearchTerm} 
          onContactSelect={(contact) => {
            setInvoiceDetails(prev => ({
              ...prev,
              clientName: `${contact.firstName} ${contact.lastName}`.trim(),
              clientCompany: contact.company || '',
              clientEmail: contact.email || '',
              clientPhone: contact.phone || '',
              clientAddress: contact.address || ''
            }));
            setShowContactSelector(false);
            addNotification(`Contact "${contact.firstName} ${contact.lastName}".trim() selected`, 'success');
          }}
        />
      </Dialog>

      {/* NEW FOOTER CONTAINER FOR SAVE BUTTON - Updated for full width */}
      <div className="fixed bottom-0 left-0 w-full p-4 bg-gray-100 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 z-10 shadow-lg flex justify-center gap-4"> {/* Added gap-4 */}
        <Button
          variant="primary"
          onClick={() => handleSaveInvoice()}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5em' }}
        >
          <span className="btn-icon">💾</span>
          Save Invoice
        </Button>
        
        {/* ADDING CONDITIONAL CIS BUTTON HERE */}
        {settings?.cis?.enabled && (
          <> {/* Use fragment to group conditional buttons */}
            {invoiceDetails.cisApplied ? (
              <Button
                variant="warning" // Use warning color for undo
                onClick={handleUndoCIS}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5em' }}
              >
                <span className="btn-icon">↩️</span>
                Undo CIS
              </Button>
            ) : (
              <Button
                variant="primary"
                onClick={handleApplyCIS}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5em' }}
              >
                <span className="btn-icon">🔧</span>
                Apply CIS
              </Button>
            )}
          </>
        )}
      </div>
    </PageLayout>
  );
};

export default InvoiceBuilder;