import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useQuery } from 'react-query';
import { useAppContext } from '../../context/AppContext';
import api from '../../services/api';
import pdfGenerator from '../../services/pdfGenerator';
import { formatDate } from '../../utils/formatters';
import html2pdf from 'html2pdf.js'; // Add html2pdf import
import '../../styles/index.css'; // Updated to use modular CSS structure

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

const InvoiceBuilder = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const quoteId = searchParams.get('quoteId');
  const { addNotification, settings } = useAppContext();
  
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
  const { data: invoice, isLoading: isLoadingInvoice } = useQuery(
    ['invoice', id],
    () => api.invoices.getById(id),
    {
      enabled: !!id,
      onSuccess: (data) => {
        if (data) {
          setInvoiceDetails(data);
        }
      },
      onError: (error) => {
        addNotification(`Error loading invoice: ${error.message}`, 'error');
      }
    }
  );
  
  // Fetch quote if we have a quoteId
  const { data: quote, isLoading: isLoadingQuote } = useQuery(
    ['quote', quoteId],
    () => api.quotes.getById(quoteId),
    {
      enabled: !!quoteId && !id,
      onSuccess: (data) => {
        if (data) {
          console.log("Loaded quote data for invoice:", data);
          
          // Extract line items and identify labor items
          const quoteLineItems = data.lineItems || [];
          
          // Find all labor items in the quote
          const laborItems = quoteLineItems.filter(item => 
            (item.description && (
              item.description.toLowerCase().includes('labour') || 
              item.description.toLowerCase().includes('labor')
            )) ||
            item.category === 'labour' ||
            item.isLabour === true
          );
          
          // Calculate total labor amount
          const totalLaborAmount = laborItems.reduce(
            (sum, item) => sum + (parseFloat(item.amount) || 0), 
            0
          );
          
          // Process line items, marking labor items
          const processedLineItems = laborItems.map(item => ({
            id: item.id || `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            description: item.description || 'Labor',
            amount: parseFloat(item.amount) || 0,
            quantity: parseFloat(item.quantity) || 1,
            isLabour: true
          }));
          
          // Calculate invoice amount based on type
          let invoiceAmount = amount;
          if (!invoiceAmount && data.grandTotal) {
            // If no amount specified, calculate based on invoice type
            if (invoiceType.includes('50%')) {
              invoiceAmount = data.grandTotal * 0.5;
            } else if (invoiceType.includes('25%')) {
              invoiceAmount = data.grandTotal * 0.25;
            } else if (invoiceType.includes('Full')) {
              invoiceAmount = data.grandTotal;
            }
          }
            
          // Pre-fill invoice details from quote
          setInvoiceDetails(prev => ({
            ...prev,
            clientName: data.client?.name || data.clientName || '',
            clientCompany: data.client?.company || data.clientCompany || '',
            clientEmail: data.client?.email || data.clientEmail || '',
            clientPhone: data.client?.phone || data.clientPhone || '',
            clientAddress: data.client?.address || data.clientAddress || '',
            description: `${invoiceType} for ${data.client?.company || data.clientCompany || 'project'}`,
            quoteId: data.id,
            amount: invoiceAmount || prev.amount,
            quoteTotal: data.grandTotal || 0,
            lineItems: processedLineItems, // Include only labor items
            laborTotal: totalLaborAmount // Track total labor amount for CIS calculations
          }));
        }
      }
    }
  );
  
  // Generate a unique invoice number if creating a new invoice
  useEffect(() => {
    if (!id && !invoiceDetails.invoiceNumber) {
      const prefix = 'INV-';
      const year = new Date().getFullYear();
      const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      setInvoiceDetails(prev => ({
        ...prev,
        invoiceNumber: `${prefix}${year}-${random}`
      }));
    }
  }, [id, invoiceDetails.invoiceNumber]);
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!invoiceDetails.clientName) {
      addNotification('Client name is required', 'error');
      return;
    }
    
    if (!invoiceDetails.amount || invoiceDetails.amount <= 0) {
      addNotification('Amount must be greater than zero', 'error');
      return;
    }
    
    try {
      const invoiceData = {
        ...invoiceDetails,
        id: id || Date.now().toString(),
        updatedAt: new Date().toISOString()
      };
      
      if (!id) {
        invoiceData.createdAt = new Date().toISOString();
      }
      
      await api.invoices.save(invoiceData);
      addNotification('Invoice saved successfully', 'success');
      navigate('/invoices');
    } catch (error) {
      addNotification(`Error saving invoice: ${error.message}`, 'error');
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
            addNotification('PDF exported successfully!', 'success');
            resolve(true);
          })
          .catch(err => {
            console.error('PDF generation error in promise:', err);
            addNotification(`Error generating PDF: ${err.message}`, 'error');
            reject(err);
          });
      });
    } catch (error) {
      console.error('PDF generation error:', error);
      addNotification(`Error generating PDF: ${error.message}`, 'error');
      return Promise.reject(error);
    }
  };

  // Handle emails
  const handleEmailInvoice = () => {
    setShowEmailDialog(true);
  };

  // Handle save invoice
  const handleSaveInvoice = async () => {
    try {
      await handleSubmit({ preventDefault: () => {} });
    } catch (error) {
      console.error('Error saving invoice:', error);
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
      quantity: parseInt(newItemQuantity) || 1
    };

    setInvoiceDetails(prev => ({
      ...prev,
      lineItems: [...(prev.lineItems || []), newItem],
      amount: prev.amount + (newItem.amount * newItem.quantity)
    }));

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

    if (invoiceDetails.cisApplied) {
        addNotification('CIS has already been applied to this invoice', 'info');
        return;
    }

    // Capture the original gross amount
    const originalGrossAmount = invoiceDetails.amount || 0;

    if (originalGrossAmount <= 0) {
        addNotification('Invoice amount must be greater than zero to apply CIS.', 'warning');
        return;
    }

    try {
        // --- STEP 1: Find all labor items in the connected quote ---
        let laborItems = [];
        let totalLaborAmount = 0;
        let quoteData = null;

        if (invoiceDetails.quoteId) {
            // Fetch the quote to analyze items
            quoteData = await api.quotes.getById(invoiceDetails.quoteId);
            console.log("Quote data for CIS analysis:", quoteData);

            if (quoteData) {
                // Get items from the quote (use selectedItems if available, otherwise lineItems)
                const quoteItems = quoteData.selectedItems || quoteData.lineItems || [];
                
                // First pass - look for items explicitly marked as labor
                laborItems = quoteItems.filter(item => 
                    item.category === 'labour' || 
                    item.isLabour === true ||
                    (item.type && item.type.toLowerCase() === 'labour')
                );
                
                // If no explicit labor items, check descriptions for labor-related terms
                if (laborItems.length === 0) {
                    laborItems = quoteItems.filter(item => 
                        (item.description && (
                            item.description.toLowerCase().includes('labour') ||
                            item.description.toLowerCase().includes('labor')
                        )) ||
                        (item.name && (
                            item.name.toLowerCase().includes('labour') ||
                            item.name.toLowerCase().includes('labor')
                        ))
                    );
                }
                
                // If still no labor items, check for installation terms (like in the HTML version)
                if (laborItems.length === 0) {
                    laborItems = quoteItems.filter(item => 
                        (item.description && (
                            item.description.toLowerCase().includes('install') ||
                            item.description.toLowerCase().includes('fitting') ||
                            item.description.toLowerCase().includes('fitter')
                        )) ||
                        (item.name && (
                            item.name.toLowerCase().includes('install') ||
                            item.name.toLowerCase().includes('fitting') ||
                            item.name.toLowerCase().includes('fitter')
                        ))
                    );
                }
                
                console.log("Labor items found:", laborItems);
                
                // Calculate total labor amount
                totalLaborAmount = laborItems.reduce((sum, item) => {
                    const itemAmount = parseFloat(item.cost || item.amount || 0);
                    const itemQuantity = parseFloat(item.quantity || 1);
                    return sum + (itemAmount * itemQuantity);
                }, 0);
                
                console.log("Total labor amount:", totalLaborAmount);
            }
        }
        
        // --- STEP 2: If no labor found, ask user for confirmation ---
        if (laborItems.length === 0 || totalLaborAmount <= 0) {
            console.log("No labor items found. Asking user for confirmation.");
            
            if (window.confirm('No labour items were found. Do you want to treat the entire invoice amount as labor for CIS calculation?')) {
                // User confirmed to treat everything as labor
                totalLaborAmount = originalGrossAmount;
                console.log("User confirmed treating entire amount as labor:", totalLaborAmount);
            } else {
                // User declined - allow manual labor entry via a prompt
                const manualLabor = window.prompt('Enter the labour portion of the invoice amount:', `${(originalGrossAmount * 0.5).toFixed(2)}`);
                if (manualLabor === null) {
                    // User cancelled the prompt
                    return;
                }
                totalLaborAmount = parseFloat(manualLabor) || 0;
                
                if (totalLaborAmount <= 0) {
                    addNotification('Invalid labour amount. CIS not applied.', 'error');
                    return;
                }
                
                console.log("User entered manual labour amount:", totalLaborAmount);
            }
        }
        
        // Sanity check: labor amount cannot exceed the original gross amount
        if (totalLaborAmount > originalGrossAmount) {
            console.warn(`Labour amount (£${totalLaborAmount.toFixed(2)}) exceeds invoice gross amount (£${originalGrossAmount.toFixed(2)}). Clamping to gross amount.`);
            totalLaborAmount = originalGrossAmount;
        }
        
        // --- STEP 3: Calculate CIS deduction (exactly like in HTML version) ---
        const nonLaborAmount = originalGrossAmount - totalLaborAmount;
        const cisRate = 0.20; // 20% like in the HTML version
        const cisDeduction = totalLaborAmount * cisRate;
        const netAmount = originalGrossAmount - cisDeduction;
        
        console.log(`
            Original Gross: £${originalGrossAmount.toFixed(2)}
            Labour Amount: £${totalLaborAmount.toFixed(2)}
            Non-Labor Amount: £${nonLaborAmount.toFixed(2)}
            CIS Rate: ${(cisRate * 100).toFixed(0)}%
            CIS Deduction: £${cisDeduction.toFixed(2)}
            Net Amount: £${netAmount.toFixed(2)}
        `);
        
        // --- STEP 4: Create new line items with labor, non-labor and CIS deduction ---
        const newLineItems = [];
        
        // Add non-labor item if applicable
        if (nonLaborAmount > 0.01) { // Use a small threshold for floating-point comparison
            newLineItems.push({
                id: `nonlabor-${Date.now()}`,
                description: "Balance on completion",
                amount: nonLaborAmount,
                quantity: 1
            });
        }
        
        // Add labor item
        if (totalLaborAmount > 0.01) {
            newLineItems.push({
                id: `labour-${Date.now()}`,
                description: "Labour Charges",
                amount: totalLaborAmount,
                quantity: 1,
                isLabour: true,
                category: 'labour'
            });
        }
        
        // Add CIS deduction line
        newLineItems.push({
            id: `cis-${Date.now()}`,
            description: `CIS Deduction (${(cisRate * 100).toFixed(0)}%)`,
            amount: -cisDeduction, // Negative to show as a deduction
            quantity: 1,
            type: 'cis'
        });
        
        // --- STEP 5: Update invoice state with new details ---
        setInvoiceDetails(prev => ({
            ...prev,
            lineItems: newLineItems,
            amount: netAmount,
            cisApplied: true,
            cisDeduction: cisDeduction,
            laborTotal: totalLaborAmount,
            originalGrossAmount: originalGrossAmount // Store the original amount
        }));
        
        addNotification(`CIS deduction of £${cisDeduction.toFixed(2)} applied. Net amount is now £${netAmount.toFixed(2)}.`, 'success');
    } catch (error) {
        console.error('Error applying CIS:', error);
        addNotification(`Error applying CIS: ${error.message}`, 'error');
    }
  };

  // Add this function to open email client
  const handleOpenEmailClient = () => {
    const subject = `${invoiceDetails.client.address}`;
    const body = `Hi ${invoiceDetails.clientName},\n\nPlease find attached your invoice (${invoiceDetails.invoiceNumber}) for ${invoiceDetails.description || 'your project'}.\n\nThe invoice is due by ${
      invoiceDetails.dueDate ? new Date(invoiceDetails.dueDate).toLocaleDateString('en-GB') : 'the date specified'
    }.\n\nIf you have any questions, please don't hesitate to contact me.\n\nBest regards,\n${settings.company?.name || 'Your Company'}`;
    
    // Open the mailto link
    window.location.href = `mailto:${invoiceDetails.clientEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    // Close the dialog
    setShowEmailDialog(false);
  };

  // Create a safer export PDF function that ensures preview is visible
  const safeExportPDF = async () => {
    try {
      // First save the invoice
      await handleSaveInvoice();
      
      // Get the invoice preview element
      const invoicePreviewElement = document.querySelector('.invoice-preview');
      
      if (!invoicePreviewElement) {
        throw new Error('Invoice preview element not found');
      }
      
      // Add notification
      addNotification('Invoice saved. Generating PDF...', 'info');
      
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
            addNotification('PDF exported successfully!', 'success');
            resolve(true);
          })
          .catch(err => {
            console.error('PDF generation error in promise:', err);
            addNotification(`Error generating PDF: ${err.message}`, 'error');
            reject(err);
          });
      });
    } catch (error) {
      console.error('Error in safe PDF export:', error);
      addNotification(`Error exporting PDF: ${error.message}`, 'error');
      return false;
    }
  };

  // Add handleDeleteInvoice function after handleApplyCIS
  const handleDeleteInvoice = async () => {
    // Show confirmation dialog before deletion
    if (window.confirm(`Are you sure you want to delete invoice ${invoiceDetails.invoiceNumber}? This action cannot be undone.`)) {
      try {
        if (id) {
          // Delete the invoice if it exists in the database
          await api.invoices.delete(id);
          addNotification('Invoice deleted successfully', 'success');
        } else {
          // For new invoices just reset the form
          addNotification('Invoice draft discarded', 'info');
        }
        // Navigate back to the invoices list
        navigate('/invoices');
      } catch (error) {
        console.error('Error deleting invoice:', error);
        addNotification(`Error deleting invoice: ${error.message}`, 'error');
      }
    }
  };

  // Add function to export PDF and open email client
  const handleExportAndOpenEmail = async () => {
    try {
      // First save the invoice
      await handleSaveInvoice();
      
      // Then export PDF and open email client
      const exported = await safeExportPDF();
      
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
      client: {
        ...prev.client,
        [field]: value
      }
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

  if (isLoadingInvoice || (quoteId && isLoadingQuote)) {
    return <Loading message="Loading data..." />;
  }
  
  return (
    <PageLayout title={id ? 'Edit Invoice' : 'Create Invoice'}>
      {/* Add ActionButtonContainer below the header */}
      <div className="action-button-container">
        <div className="action-buttons">
          <Link to="/quotes" className="btn btn-primary">
            <span className="btn-icon">←</span>
            Quotes
          </Link>
          
          <Button
            variant="primary"
            onClick={handleSaveInvoice}
          >
            <span className="btn-icon">💾</span>
            Save Invoice
          </Button>
          
          <Button
            variant="primary"
            onClick={handleExportPDF}
          >
            <span className="btn-icon">📄</span>
            Export PDF
          </Button>
          
          <Button
            variant="primary"
            onClick={handleEmailInvoice}
          >
            <span className="btn-icon">✉️</span>
            Email Invoice
          </Button>
          
          <Button
            variant="primary"
            onClick={handleMarkAsPaid}
            disabled={invoiceDetails.status === 'paid'}
          >
            <span className="btn-icon">✓</span>
            Paid
          </Button>
          
          <Button
            variant="primary"
            onClick={handleApplyCIS}
            disabled={invoiceDetails.cisApplied}
          >
            <span className="btn-icon">🔧</span>
            Apply CIS
          </Button>
          
          <Button
            variant="danger"
            onClick={handleDeleteInvoice}
          >
            <span className="btn-icon">🗑</span>
            Delete Invoice
          </Button>
          
          <Button
            variant="primary"
            onClick={() => navigate('/settings')}
          >
            <span className="btn-icon">⚙️</span>
            Settings
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
      
      <div className="invoice-layout">
        {/* Left column - Form */}
        <div className="invoice-form-panel">
          <div className="card">
            <div className="card-body">
              <form onSubmit={handleSubmit}>
                {/* Client Details Section */}
                <div className="card mb-4">
                  <div className="card-body">
                    <h3 className="card-subtitle">Client Details</h3><br></br>
                    <div className="form-row client-name-row">
                      <div className="client-name-field">
                        <FormField
                          label="Client Name"
                          value={invoiceDetails.clientName}
                          onChange={(e) => setInvoiceDetails({...invoiceDetails, clientName: e.target.value})}
                          required
                        />
                      </div>
                      <Button 
                        variant="primary"
                        type="button"
                        size="sm"
                        onClick={() => setShowContactSelector(true)}
                        className="select-contact-btn"
                      >
                        Select Contact
                      </Button>
                    </div>
                    
                    <div className="form-row">
                      <FormField
                        label="Company"
                        value={invoiceDetails.clientCompany}
                        onChange={(e) => setInvoiceDetails({...invoiceDetails, clientCompany: e.target.value})}
                      />
                    </div>
                    
                    <div className="form-row">
                      <FormField
                        label="Email"
                        type="email"
                        value={invoiceDetails.clientEmail}
                        onChange={(e) => setInvoiceDetails({...invoiceDetails, clientEmail: e.target.value})}
                      />
                      <FormField
                        label="Phone"
                        value={invoiceDetails.clientPhone}
                        onChange={(e) => setInvoiceDetails({...invoiceDetails, clientPhone: e.target.value})}
                      />
                    </div>
                    
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
                  <label className="form-label">Invoice Type</label>
                  <select
                    className="form-select"
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
                
                {/* Invoice/Due Date */}
                <div className="form-row">
                  <div className="form-field">
                    <label className="form-label">Invoice Date</label>
                    <input
                      type="date"
                      className="form-input"
                      value={invoiceDetails.invoiceDate || ''}
                      onChange={(e) => setInvoiceDetails({...invoiceDetails, invoiceDate: e.target.value})}
                      required
                    />
                  </div>
                  
                  <div className="form-field">
                    <label className="form-label">Due Date</label>
                    <input
                      type="date"
                      className="form-input"
                      value={invoiceDetails.dueDate || ''}
                      onChange={(e) => setInvoiceDetails({...invoiceDetails, dueDate: e.target.value})}
                      required
                    />
                  </div>
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
              
              {/* Quick Add Item */}
              <div className="quick-add-item">
                <h3 className="quick-add-title">Quick Add Item</h3>
                <div className="form-field">
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Item Name"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                  />
                </div>
                <div className="form-row">
                  <div className="form-field">
                    <input
                      type="number"
                      className="form-input"
                      placeholder="Amount (£)"
                      step="0.01"
                      min="0"
                      value={newItemAmount}
                      onChange={(e) => setNewItemAmount(e.target.value)}
                    />
                  </div>
                  <div className="form-field">
                    <input
                      type="number"
                      className="form-input"
                      placeholder="Quantity"
                      min="1"
                      value={newItemQuantity}
                      onChange={(e) => setNewItemQuantity(e.target.value)}
                    />
                  </div>
                </div>
                <Button
                  variant="primary"
                  onClick={handleAddItem}
                >
                  Add Item
                </Button>
              </div>
              
              {/* Line Items Table */}
              {invoiceDetails.lineItems && invoiceDetails.lineItems.length > 0 && (
                <div className="line-items-table-container">
                  <h3 className="quick-add-title">Invoice Items</h3>
                  <table className="line-items-table">
                    <thead>
                      <tr>
                        <th>Description</th>
                        <th>Qty</th>
                        <th>Amount</th>
                        <th>Total</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoiceDetails.lineItems.map((item) => (
                        <tr key={item.id} className={item.type === 'cis' ? 'cis-deduction-row' : (item.isLabour ? 'labour-row' : '')}>
                          <td>{item.description}</td>
                          <td>{item.quantity || 1}</td>
                          <td>£{Math.abs(parseFloat(item.amount) || 0).toFixed(2)}</td>
                          <td>£{Math.abs((parseFloat(item.amount) || 0) * (parseFloat(item.quantity) || 1)).toFixed(2)}</td>
                          <td>
                            {item.type !== 'cis' && (
                              <button 
                                className="remove-item-btn"
                                onClick={() => handleRemoveItem(item.id)}
                                type="button"
                              >
                                ✕
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                      <tr className="total-row">
                        <td colSpan="3" className="text-right"><strong>Total</strong></td>
                        <td colSpan="2"><strong>£{invoiceDetails.amount.toFixed(2)}</strong></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Right column - Preview */}
        <div className="invoice-preview-panel">
          {/* Invoice Preview */}
          <div className="card">
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
          <div className="card">
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
      </div>

      {/* Email Instructions Dialog */}
      <Dialog
        isOpen={showEmailDialog}
        onClose={() => setShowEmailDialog(false)}
        title="Email Invoice"
        className="email-dialog"
      >
        <div className="email-dialog-content">
          <div className="email-instructions">
            <p className="email-description">How would you like to proceed?</p>
            
            <div className="email-actions-container">
              <Button
                variant="primary"
                onClick={handleExportAndOpenEmail}
                className="email-action-button-primary"
              >
                Export PDF and Open Email
              </Button>
              
              <div className="email-actions-row">
                <Button
                  variant="secondary"
                  onClick={() => setShowEmailDialog(false)}
                >
                  Cancel
                </Button>
                <div className="email-actions-group">
                  <Button
                    variant="secondary"
                    onClick={safeExportPDF}
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
    </PageLayout>
  );
};

export default InvoiceBuilder;