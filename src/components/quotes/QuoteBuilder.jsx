import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from 'react-query';
import { useAppContext } from '../../context/AppContext';
import api from '../../services/api';
import pdfGenerator from '../../services/pdfGenerator';
import { calculateQuoteData } from '../../utils/calculations';
import html2pdf from 'html2pdf.js';

// Components
import PageLayout from '../common/PageLayout';
import Button, { ActionButtons } from '../common/Button';
import Loading from '../common/Loading';
import Tabs from '../common/Tabs';
import Dialog from '../common/Dialog';
import FormField from '../common/FormField';
import ContactSelector from '../contacts/ContactSelector';
import ActionButtonContainer from '../common/ActionButtonContainer';

// Add this near the top of your file with the other imports
import '../../styles/components/quotes.css';

const QuoteBuilder = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { addNotification, settings } = useAppContext();
  const queryClient = useQueryClient(); // Add QueryClient
  
  // Local state
  const [activeTab, setActiveTab] = useState('details');
  const [itemSearchTerm, setItemSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedItems, setSelectedItems] = useState([]);
  const [hiddenCosts, setHiddenCosts] = useState([]);
  const [globalMarkup, setGlobalMarkup] = useState(settings?.quote?.defaultMarkup !== undefined ? settings?.quote?.defaultMarkup : 30);
  const [distributionMethod, setDistributionMethod] = useState('even');
  const [showItemDialog, setShowItemDialog] = useState(false);
  const [showHiddenCostDialog, setShowHiddenCostDialog] = useState(false);
  const [newHiddenCost, setNewHiddenCost] = useState({ name: '', amount: 0 });
  const [editingItem, setEditingItem] = useState(null);
  
  // Add these new state variables for contact selection
  const [showContactSelector, setShowContactSelector] = useState(false);
  const [contactSearchTerm, setContactSearchTerm] = useState('');
  
  // Add these new state variables for the custom item feature
  const [showCustomItemForm, setShowCustomItemForm] = useState(false);
  const [customItem, setCustomItem] = useState({
    name: '',
    cost: '',
    quantity: 1,
    category: '',
    description: '',
    markup: 0
  });
  
  // Add debugging and more reliable dialog handling
  const [useAlternativeDialog, setUseAlternativeDialog] = useState(false);
  
  // Handle opening the item dialog with debugging
  const handleOpenItemDialog = () => {
    console.log("Opening item dialog, current state:", showItemDialog);
    setShowItemDialog(true);
    
    // If dialog doesn't open after a short delay, switch to alternative
    setTimeout(() => {
      if (!document.querySelector('.dialog-overlay')) {
        console.log("Dialog component might be failing, switching to alternative");
        setUseAlternativeDialog(true);
      }
    }, 300);
  };
  
  // Add this state near your other dialog states
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [showMissingCompanyInfoDialog, setShowMissingCompanyInfoDialog] = useState(false);
  
  // Add this state variable for tracking user's choice to bypass company info check
  const [bypassCompanyInfoCheck, setBypassCompanyInfoCheck] = useState(false);
  
  // Add these new state variables near the other state variables
  const [saveAsContact, setSaveAsContact] = useState(false);
  
  // Quote details
  const [quoteDetails, setQuoteDetails] = useState({
    id: id || Date.now().toString(),
    client: {
      name: '',
      company: '',
      email: '',
      phone: '',
      address: ''
    },
    date: new Date().toISOString().split('T')[0],
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    paymentTerms: '1',
    customTerms: '',
    notes: '',
    includeDrawingOption: false,
    exclusions: [
      'Boarding or fixing the underside of the new staircase.',
      'Forming any under-stair cupboard or paneling.',
      'Making good to any plastered walls or ceilings.',
      'All components will arrive in their natural state, ready for fine sanding and finishing by others.'
    ]
  });
  
  // Fetch quote if we have an ID
  const { data: quote, isLoading: isLoadingQuote, refetch: refetchQuote } = useQuery(
    ['quote', id],
    () => {
      console.log("Fetching quote with ID:", id);
      return api.quotes.getById(id);
    },
    {
      enabled: !!id,
      retry: 1,
      refetchOnMount: true,     // Add this to always refetch when component mounts
      staleTime: 0,             // Add this to consider data always stale
      onSuccess: (data) => {
        try {
          console.log("API returned quote data:", data);
          
          if (!data) {
            console.error("Quote data is null or undefined");
            addNotification("Error loading quote: data is missing", "error");
            return;
          }
          
          // Set quote details from the data
          setQuoteDetails({
            id: id,
            client: {
              name: data.client?.name || data.clientName || '',
              company: data.client?.company || data.clientCompany || '',
              email: data.client?.email || '',
              phone: data.client?.phone || '',
              address: data.client?.address || ''
            },
            date: data.date || new Date().toISOString().split('T')[0],
            validUntil: data.validUntil || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            paymentTerms: data.paymentTerms || '1',
            customTerms: data.customTerms || '',
            notes: data.notes || '',
            includeDrawingOption: !!data.includeDrawingOption,
            exclusions: Array.isArray(data.exclusions) ? data.exclusions : [
              'Boarding or fixing the underside of the new staircase.',
              'Forming any under-stair cupboard or paneling.',
              'Making good to any plastered walls or ceilings.',
              'All components will arrive in their natural state, ready for fine sanding and finishing by others.'
            ]
          });
          
          // Process selected items
          const items = Array.isArray(data.selectedItems) ? data.selectedItems : [];
          console.log("Processing selected items:", items.length > 0 ? items : "Empty array");
          setSelectedItems(items.map(item => ({
            id: item.id || Date.now().toString() + Math.random().toString(36).substr(2, 9),
            name: item.name || 'Unnamed Item',
            cost: parseFloat(item.cost) || 0,
            supplier: item.supplier || '',
            quantity: parseFloat(item.quantity) || 1,
            markup: parseInt(item.markup) || 0,
            hideInQuote: !!item.hideInQuote,
            description: item.description || '',
            category: item.category || ''
          })));
          
          // Process hidden costs
          const costs = Array.isArray(data.hiddenCosts) ? data.hiddenCosts : [];
          console.log("Processing hidden costs:", costs.length > 0 ? costs : "Empty array");
          setHiddenCosts(costs.map(cost => ({
            id: cost.id || Date.now().toString() + Math.random().toString(36).substr(2, 9),
            name: cost.name || 'Unnamed Cost',
            amount: parseFloat(cost.amount) || 0
          })));
          
          // Set global markup
          if (typeof data.globalMarkup === 'number' && !isNaN(data.globalMarkup)) {
            setGlobalMarkup(data.globalMarkup);
          }
          
          // Set distribution method
          if (data.distributionMethod && ['even', 'proportional'].includes(data.distributionMethod)) {
            setDistributionMethod(data.distributionMethod);
          }
          
          console.log("Quote data successfully processed");
        } catch (error) {
          console.error("Error processing quote data:", error);
          addNotification(`Error processing quote data: ${error.message}`, 'error');
        }
      },
      onError: (error) => {
        console.error("Error loading quote:", error);
        addNotification(`Error loading quote: ${error.message}`, 'error');
      }
    }
  );
  
  // Fetch catalog items
  const { data: catalogItems = [], isLoading: isLoadingCatalog } = useQuery(
    'catalog',
    api.catalog.getAll
  );
  
  // Fetch suppliers
  const { data: suppliers = [], isLoading: isLoadingSuppliers } = useQuery(
    'suppliers',
    api.suppliers.getAll
  );
  
  // Calculate quote data (totals, etc.)
  const quoteData = calculateQuoteData(
    selectedItems, 
    hiddenCosts, 
    globalMarkup, 
    distributionMethod,
    settings?.vat?.enabled, // Pass VAT enabled status
    settings?.vat?.rate     // Pass VAT rate
  );
  
  // Filter catalog items based on search and category
  const filteredCatalogItems = catalogItems.filter(item => {
    // Search filter
    const matchesSearch = !itemSearchTerm || 
      (item.name && item.name.toLowerCase().includes(itemSearchTerm.toLowerCase())) ||
      (item.description && item.description.toLowerCase().includes(itemSearchTerm.toLowerCase()));
    
    // Category filter
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });
  
  // Handle adding an item to the quote
  const handleAddItem = (item) => {
    // Check if item is already in the list
    const existingItem = selectedItems.find(i => i.id === item.id);
    
    if (existingItem) {
      // Update quantity if already exists
      const updatedItems = selectedItems.map(i => 
        i.id === item.id 
          ? { ...i, quantity: i.quantity + 1 }
          : i
      );
      setSelectedItems(updatedItems);
    } else {
      // Add new item with default properties
      setSelectedItems([
        ...selectedItems,
        {
          ...item,
          quantity: 1,
          markup: globalMarkup,
          hideInQuote: false
        }
      ]);
    }
    
    // Close dialog if open
    setShowItemDialog(false);
  };
  
  // Handle removing an item from the quote
  const handleRemoveItem = (index) => {
    const newItems = [...selectedItems];
    newItems.splice(index, 1);
    setSelectedItems(newItems);
  };
  
  // Fix the item fields to allow empty values during input
  const handleUpdateItem = (index, updatedItem) => {
    const newItems = [...selectedItems];
    
    // Allow empty string values for quantity and markup during input
    // Only parse to numbers when the value isn't an empty string
    newItems[index] = {
      ...updatedItem,
      quantity: updatedItem.quantity === '' ? '' : parseFloat(updatedItem.quantity) || 0.1,
      markup: updatedItem.markup === '' ? '' : parseInt(updatedItem.markup) || 0
    };
    
    setSelectedItems(newItems);
  };
  
  // Handle client details change
  const handleClientChange = (field, value) => {
    setQuoteDetails({
      ...quoteDetails,
      client: {
        ...quoteDetails.client,
        [field]: value
      }
    });
  };
  
  // Handle quote details change
  const handleQuoteChange = (field, value) => {
    setQuoteDetails({
      ...quoteDetails,
      [field]: value
    });
  };
  
  // Handle exclusions change
  const handleExclusionsChange = (index, value) => {
    const newExclusions = [...quoteDetails.exclusions];
    newExclusions[index] = value;
    setQuoteDetails({
      ...quoteDetails,
      exclusions: newExclusions
    });
  };
  
  // Add hidden cost
  const handleAddHiddenCost = () => {
    if (!newHiddenCost.name.trim()) {
      addNotification('Name is required for hidden cost', 'error');
      return;
    }
    
    setHiddenCosts([
      ...hiddenCosts,
      {
        id: Date.now().toString(),
        name: newHiddenCost.name,
        amount: parseFloat(newHiddenCost.amount) || 0
      }
    ]);
    
    setNewHiddenCost({ name: '', amount: 0 });
    setShowHiddenCostDialog(false);
  };
  
  // Remove hidden cost
  const handleRemoveHiddenCost = (index) => {
    const newCosts = [...hiddenCosts];
    newCosts.splice(index, 1);
    setHiddenCosts(newCosts);
  };
  
  // Add this new handler function for adding custom items
  const handleAddCustomItem = () => {
    if (!customItem.name.trim()) {
      addNotification('Item name is required', 'error');
      return;
    }
    
    // Create new item with a unique ID
    const newItem = {
      ...customItem,
      id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      cost: parseFloat(customItem.cost) || 0,
      quantity: parseFloat(customItem.quantity) || 1,
      markup: customItem.markup !== undefined ? customItem.markup : globalMarkup,
      supplier: 'custom',
      hideInQuote: false
    };
    
    // Add to selected items
    setSelectedItems([...selectedItems, newItem]);
    
    // Reset form for next use
    setCustomItem({
      name: '',
      cost: '',
      quantity: 1,
      category: '',
      description: '',
      markup: globalMarkup
    });
    
    // Show success notification
    addNotification(`Added custom item: ${newItem.name}`, 'success');
  };
  
  // Save quote function with additional debugging and error handling
  const handleSaveQuote = async () => {
    try {
      console.log("Save quote button clicked - starting save process");
      
      // Show a saving notification
      addNotification('Saving quote...', 'info');
      
      // Ensure the ID is retained or generated correctly
      const quoteId = quoteDetails.id || Date.now().toString();
      console.log("Using quote ID:", quoteId);
      
      // Save client as contact if checkbox is checked
      if (saveAsContact && quoteDetails.client.name) {
        try {
          // Check if client has minimum required information
          if (quoteDetails.client.name) {
            console.log("Saving client as contact...");
            
            // Split the name into first and last name
            const nameParts = quoteDetails.client.name.split(' ');
            const firstName = nameParts[0] || '';
            const lastName = nameParts.slice(1).join(' ') || '';
            
            // Prepare contact data
            const contactData = {
              id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
              customerType: quoteDetails.client.company ? 'business' : 'individual',
              firstName,
              lastName,
              company: quoteDetails.client.company || '',
              email: quoteDetails.client.email || '',
              phone: quoteDetails.client.phone || '',
              address: quoteDetails.client.address || '',
              notes: `Added from Quote ${quoteId} on ${new Date().toLocaleDateString()}`,
              createdAt: new Date().toISOString()
            };
            
            // Save contact
            await api.contacts.save(contactData);
            addNotification(`Saved ${contactData.firstName} ${contactData.lastName} as a contact`, 'success');
            
            // Invalidate contacts query to refresh contact list
            queryClient.invalidateQueries('contacts');
            
            // Reset the checkbox
            setSaveAsContact(false);
          }
        } catch (contactError) {
          console.error("Error saving contact:", contactError);
          addNotification(`Error saving contact: ${contactError.message}`, 'error');
          // Continue with quote save even if contact save fails
        }
      }
      
      // Fix potential issues with quantity values
      const sanitizedItems = Array.isArray(selectedItems) ? selectedItems.map(item => {
        // Make sure quantity is converted to a number properly
        let quantity = item.quantity;
        if (quantity === '' || quantity === undefined || quantity === null) {
          quantity = 1; // Default to 1 if empty
        } else {
          quantity = parseFloat(quantity) || 1; // Convert to float, default to 1 if NaN
        }
        
        // Make sure markup is converted to a number properly
        let markup = item.markup;
        if (markup === '' || markup === undefined || markup === null) {
          markup = 0; // Default to 0 if empty
        } else {
          markup = parseInt(markup) || 0; // Convert to int, default to 0 if NaN
        }
        
        return {
          ...item,
          id: item.id || Date.now().toString() + Math.random().toString(36).substring(2, 9),
          quantity: quantity,
          markup: markup,
          hideInQuote: !!item.hideInQuote
        };
      }) : [];
      
      // Sanitize hidden costs similarly
      const sanitizedCosts = Array.isArray(hiddenCosts) ? hiddenCosts.map(cost => ({
        ...cost,
        id: cost.id || Date.now().toString() + Math.random().toString(36).substring(2, 9),
        amount: parseFloat(cost.amount) || 0
      })) : [];
      
      // Sanitize and prepare data for saving
      const quoteToSave = {
        ...quoteDetails,
        id: quoteId,
        // Client data with defaults
        client: {
          name: quoteDetails.client.name || '',
          company: quoteDetails.client.company || '',
          email: quoteDetails.client.email || '',
          phone: quoteDetails.client.phone || '',
          address: quoteDetails.client.address || ''
        },
        selectedItems: sanitizedItems,
        hiddenCosts: sanitizedCosts,
        globalMarkup,
        distributionMethod,
        savedAt: new Date().toISOString(),
        // Add clientName and clientCompany for compatibility with quotes list
        clientName: quoteDetails.client.name || '',
        clientCompany: quoteDetails.client.company || ''
      };
      
      console.log("Saving quote data:", quoteToSave);
      
      // Call the API save function with more detailed error handling
      try {
        const savedQuote = await api.quotes.save(quoteToSave);
        console.log("Quote saved successfully:", savedQuote);
        
        // Show success notification with more details
        addNotification(
          `Quote for ${quoteDetails.client.name || 'client'} saved successfully ✓`,
          'success',
          5000 // 5 seconds duration
        );
        
        // Navigate or refetch - DO NOT CHANGE THIS PART
        if (!id) {
          console.log("Navigating to new quote:", quoteId);
          navigate(`/quotes/${quoteId}`);
        } else {
          console.log("Refetching existing quote");
          refetchQuote();
        }
      } catch (apiError) {
        console.error("API error during save:", apiError);
        throw new Error(`API Error: ${apiError.message || 'Unknown API error'}`);
      }
    } catch (error) {
      console.error("Error saving quote:", error);
      
      // Error notification
      addNotification(`Error saving quote: ${error.message}`, 'error');
    }
  };
  
  // Update the handleExportPDF function
  const handleExportPDF = async () => {
    try {
      // Get the quote preview element
      const quotePreviewElement = document.querySelector('.quote-preview');
      
      if (!quotePreviewElement) {
        throw new Error('Quote preview element not found');
      }
      
      // Add notification
      addNotification('Generating PDF...', 'info');
      
      // Add PDF export classes
      quotePreviewElement.classList.add('pdf-export-mode');
      // Add a new class specifically for ensuring A4 sizing
      quotePreviewElement.classList.add('pdf-a4-format');
      
      // Configure options
      const options = {
        filename: `Quote_${quoteDetails.client.name || 'Untitled'}_${new Date().toISOString().split('T')[0]}.pdf`,
        margin: [10, 10, 10, 10], // Reduced margins [top, right, bottom, left]
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
          scale: 2,
          useCORS: true,
          logging: true
        },
        jsPDF: { 
          unit: 'mm', 
          format: 'a4', 
          orientation: 'portrait'
        }
      };
      
      // Generate PDF
      try {
        await html2pdf()
          .from(quotePreviewElement)
          .set(options)
          .save();
        
        addNotification('PDF exported successfully!', 'success');
      } finally {
        // Always remove the PDF export classes, even if there's an error
        quotePreviewElement.classList.remove('pdf-export-mode');
        quotePreviewElement.classList.remove('pdf-a4-format');
      }
      
    } catch (error) {
      console.error('PDF generation error:', error);
      addNotification(`Error generating PDF: ${error.message}`, 'error');
      
      // Make sure we remove the classes if there's an error
      const quotePreviewElement = document.querySelector('.quote-preview');
      if (quotePreviewElement) {
        quotePreviewElement.classList.remove('pdf-export-mode');
        quotePreviewElement.classList.remove('pdf-a4-format');
      }
    }
  };

  // Function to validate company information before email or export
  const validateCompanyInfo = () => {
    // If user has chosen to bypass company info check, return true
    if (bypassCompanyInfoCheck) {
      return true;
    }
    
    if (!settings?.company?.name || !settings?.company?.address) {
      setShowMissingCompanyInfoDialog(true);
      return false;
    }
    return true;
  };

  // Create a safer export PDF function that ensures preview is visible
  const safeExportPDF = async () => {
    try {
      // Check for missing company information before proceeding
      // Skip this check if bypassCompanyInfoCheck is true
      if (!bypassCompanyInfoCheck && (!settings?.company?.name || !settings?.company?.address)) {
        setShowMissingCompanyInfoDialog(true);
        return;
      }
      
      // First, make sure we're on the preview tab
      if (activeTab !== 'preview') {
        setActiveTab('preview');
        
        // Wait for the tab change to take effect and DOM to update
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      // Now execute the normal PDF export
      return handleExportPDF();
    } catch (error) {
      console.error('Error in safe PDF export:', error);
      addNotification(`Error exporting PDF: ${error.message}`, 'error');
      return Promise.reject(error);
    }
  };

  // Add a new function to export PDF without company info check
  const exportPDFWithoutCompanyCheck = async () => {
    try {
      // First, make sure we're on the preview tab
      if (activeTab !== 'preview') {
        setActiveTab('preview');
        
        // Wait for the tab change to take effect and DOM to update
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      // Now execute the normal PDF export
      return handleExportPDF();
    } catch (error) {
      console.error('Error in export without company check:', error);
      addNotification(`Error exporting PDF: ${error.message}`, 'error');
      return Promise.reject(error);
    }
  };

  // Modify handleEmailQuote to check company info first
  const handleEmailQuote = () => {
    if (validateCompanyInfo()) {
      setShowEmailDialog(true);
    }
  };

  // Add these functions before the return statement in your component

  // Add this function for opening email client
  const handleOpenEmailClient = () => {
    try {
      // Get client details
      const subject = encodeURIComponent(`Quotation for ${quoteDetails.client.company || quoteDetails.client.name}`);
      const body = encodeURIComponent(`Dear ${quoteDetails.client.name},\n\nPlease find attached our quotation as discussed.\n\nIf you have any questions, please do not hesitate to contact us.\n\nKind regards,\n${settings?.company?.name || 'Your Company'}`);
      const clientEmail = quoteDetails.client.email || '';
      
      // Create mailto link and open it
      const mailtoLink = `mailto:${clientEmail}?subject=${subject}&body=${body}`;
      window.location.href = mailtoLink;
      
      // Close dialog
      setShowEmailDialog(false);
      
      // Show success notification
      addNotification('Email client opened', 'success');
    } catch (error) {
      console.error('Error opening email client:', error);
      addNotification(`Error opening email client: ${error.message}`, 'error');
    }
  };

  // Add this function for exporting PDF and opening email
  const handleExportAndOpenEmail = async () => {
    try {
      // First export the PDF
      await safeExportPDF();
      
      // Then open email client
      handleOpenEmailClient();
      
      // Close dialog
      setShowEmailDialog(false);
    } catch (error) {
      console.error('Error in export and email:', error);
      addNotification(`Error: ${error.message}`, 'error');
    }
  };

  // Debug company logo
  useEffect(() => {
    if (settings?.company?.logo) {
      console.log('Company logo is available:', settings.company.logo.substring(0, 50) + '...');
    } else {
      console.log('Company logo is not available in settings');
    }
  }, [settings]);

  // Loading state
  if (isLoadingQuote || isLoadingCatalog || isLoadingSuppliers) {
    return <Loading message="Loading quote builder..." />;
  }
  
  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount);
  };
  
  // Get supplier name by ID
  const getSupplierName = (supplierId) => {
    const supplier = suppliers.find(s => s.id === supplierId);
    return supplier ? supplier.name : 'Unknown Supplier';
  };
  
  // Create invoice helper function inside component
  const createInvoiceFromQuote = (quote, quoteData, amount, description, type) => {
    // Generate invoice number with current year and random number
    const invoiceNumber = `INV-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
    
    // Set due date (14 days from now for deposit, 30 days for others)
    const today = new Date();
    const dueDate = new Date(today);
    dueDate.setDate(dueDate.getDate() + (type === 'deposit' ? 14 : 30));
    
    // Get client details
    const clientName = quote.client.name || '';
    const clientCompany = quote.client.company || '';
    
    return {
      id: Date.now().toString() + Math.floor(Math.random() * 1000),
      invoiceNumber,
      status: 'pending',
      quoteId: quote.id,
      invoiceDate: today.toISOString().split('T')[0],
      dueDate: dueDate.toISOString().split('T')[0],
      
      // Client details
      clientName,
      clientCompany,
      clientEmail: quote.client.email || '',
      clientPhone: quote.client.phone || '',
      clientAddress: quote.client.address || '',
      
      // Invoice details
      amount: amount,
      description: `${description} for ${clientCompany ? clientCompany : 'project'}`,
      
      // Notes
      notes: `This invoice represents the ${description.toLowerCase()} as outlined in Quote Reference: ${quote.id || 'N/A'}.`,
      
      // Metadata
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      
      // Type of invoice (useful for filtering)
      invoiceType: type
    };
  };

  // Replace the existing handleGenerateInvoice function with this one
  const handleGenerateInvoice = async () => {
    try {
      // First, ensure the quote is saved
      await handleSaveQuote();
      
      // Show a notification
      addNotification('Navigating to invoice builder...', 'info');
      
      // Get the payment term type
      const paymentTerms = quoteDetails.paymentTerms;
      
      // Calculate amounts based on payment terms
      let amounts = [];
      let types = [];
      
      if (paymentTerms === '1') {
        // 50% deposit, 50% on completion
        amounts = [quoteData.grandTotal * 0.5, quoteData.grandTotal * 0.5];
        types = ['Deposit (50%)', 'Final Payment (50%)'];
      } else if (paymentTerms === '2') {
        // 50% deposit, 25% on joinery completion, 25% final
        amounts = [
          quoteData.grandTotal * 0.5, 
          quoteData.grandTotal * 0.25, 
          quoteData.grandTotal * 0.25
        ];
        types = ['Deposit (50%)', 'Interim Payment (25%)', 'Final Payment (25%)'];
      } else if (paymentTerms === '4') {
        // Full payment before delivery
        amounts = [quoteData.grandTotal];
        types = ['Full Payment'];
      } else {
        // Custom terms - create single invoice
        amounts = [quoteData.grandTotal];
        types = ['Custom'];
      }
      
      // Navigate to invoice builder with the first invoice details
      // Also pass VAT information so we don't double-apply VAT
      navigate(`/invoices/new?quoteId=${quoteDetails.id}&amount=${amounts[0]}&type=${encodeURIComponent(types[0])}&total=${quoteData.grandTotal}&vatEnabled=${quoteData.vatEnabled}&vatRate=${quoteData.vatRate}&vatAmount=${quoteData.vatAmount}`);
      
    } catch (error) {
      console.error('Error navigating to invoice builder:', error);
      addNotification(`Error: ${error.message}`, 'error');
    }
  };

  // Define the actions for the ActionButtons component
  const headerActions = (
    <ActionButtons 
      actions={[
        {
          label: "Back to Quotes",
          onClick: () => navigate('/quotes')
        },
        {
          label: "Save Quote",
          onClick: () => {
            console.log("Save button clicked");
            handleSaveQuote();
          },
          type: "button" // Explicitly set button type
        },
        {
          label: "Email Quote",
          onClick: handleEmailQuote
        },
        {
          label: "Export PDF",
          onClick: safeExportPDF
        },
        {
          label: "Generate Invoice",
          onClick: handleGenerateInvoice
        }
      ]}
    />
  );

  // Add these new handler functions for moving items
  const handleMoveItemUp = (index) => {
    if (index === 0) return; // Already at the top
    
    const newItems = [...selectedItems];
    // Swap with the item above
    [newItems[index-1], newItems[index]] = [newItems[index], newItems[index-1]];
    setSelectedItems(newItems);
  };

  const handleMoveItemDown = (index) => {
    if (index === selectedItems.length - 1) return; // Already at the bottom
    
    const newItems = [...selectedItems];
    // Swap with the item below
    [newItems[index], newItems[index+1]] = [newItems[index+1], newItems[index]];
    setSelectedItems(newItems);
  };

  return (
    <PageLayout title={id ? 'Edit Quote' : 'Create Quote'}>
      {/* Add ActionButtonContainer below the header */}
      <ActionButtonContainer>
        <Button
          variant="primary"
          onClick={() => navigate('/quotes')}
        >
          Back to Quotes
        </Button>
        <Button
          variant="primary"
          onClick={handleSaveQuote}
        >
          Save Quote
        </Button>
        <Button
          variant="primary"
          onClick={handleEmailQuote}
        >
          Email Quote
        </Button>
        <Button
          variant="primary"
          onClick={safeExportPDF}
        >
          Export PDF
        </Button>
        <Button
          variant="primary"
          onClick={handleGenerateInvoice}
        >
          Generate Invoice
        </Button>
      </ActionButtonContainer>
      
      <div className="tabs-container">
        <div className="card">
          <div className="card-body">
            <div className="tabs-with-actions">
              <Tabs
                tabs={[
                  { id: 'details', label: 'Quote Details' },
                  { id: 'items', label: 'Items & Costs' },
                  { id: 'preview', label: 'Preview' }
                ]}
                activeTab={activeTab}
                onChange={setActiveTab}
                variant="underline"
              />
            </div>
          </div>
        </div>
      </div>
      
      {/* Details Tab */}
      {activeTab === 'details' && (
        <div className="quote-details-grid">
          {/* Client Information Card */}
          <div className="card">
            <div className="card-body">
              <h2 className="card-title">Client Information</h2><br></br>
              
              <div className="form-row" style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', 
                gap: '1.5rem',
                alignItems: 'start' 
              }}>
                <FormField
                  label="Contact Name"
                  value={quoteDetails.client.name}
                  onChange={(e) => handleClientChange('name', e.target.value)}
                />
                
                <Button 
                  variant="primary"
                  size="sm"
                  onClick={() => setShowContactSelector(true)}
                  style={{ marginBottom: '12px' }}
                >
                  Select Existing Contact
                </Button>
                
                <FormField
                  label="Company Name"
                  value={quoteDetails.client.company}
                  onChange={(e) => handleClientChange('company', e.target.value)}
                />
                
                <FormField
                  label="Email"
                  type="email"
                  value={quoteDetails.client.email}
                  onChange={(e) => handleClientChange('email', e.target.value)}
                />
                
                <FormField
                  label="Phone"
                  value={quoteDetails.client.phone}
                  onChange={(e) => handleClientChange('phone', e.target.value)}
                />
              </div>
              
              <FormField
                label="Address"
                type="textarea"
                value={quoteDetails.client.address}
                onChange={(e) => handleClientChange('address', e.target.value)}
                rows={3}
              />
              
              {/* Add Save as Contact checkbox */}
              <div className="form-field" style={{ marginTop: '10px' }}>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={saveAsContact}
                    onChange={(e) => setSaveAsContact(e.target.checked)}
                    className="form-checkbox"
                  />
                  <span className="checkbox-text">Save as contact when quote is saved</span>
                </label>
              </div>
            </div>
          </div>
          
          {/* Quote Settings Card */}
          <div className="card">
            <div className="card-body">
              <h2 className="card-title">Quote Settings</h2><br></br>              
              <div className="form-row" style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', 
                gap: '1.5rem',
                alignItems: 'start' 
              }}>
                <FormField
                  label="Quote Date"
                  type="date"
                  value={quoteDetails.date}
                  onChange={(e) => handleQuoteChange('date', e.target.value)}
                />
                
                <FormField
                  label="Valid Until"
                  type="date"
                  value={quoteDetails.validUntil}
                  onChange={(e) => handleQuoteChange('validUntil', e.target.value)}
                />
              </div>
              
              <FormField
                label="Payment Terms"
                type="select"
                value={quoteDetails.paymentTerms}
                onChange={(e) => handleQuoteChange('paymentTerms', e.target.value)}
              >
                <option value="1">50% deposit, 50% on completion</option>
                <option value="2">50% deposit, 25% on joinery completion, 25% final</option>
                <option value="4">Full payment before delivery</option>
                <option value="3">Custom terms</option>
              </FormField>
              
              {quoteDetails.paymentTerms === '3' && (
                <FormField
                  label="Custom Terms"
                  type="textarea"
                  value={quoteDetails.customTerms}
                  onChange={(e) => handleQuoteChange('customTerms', e.target.value)}
                  rows={2}
                />
              )}
              
              <div className="form-field">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={quoteDetails.includeDrawingOption}
                    onChange={(e) => handleQuoteChange('includeDrawingOption', e.target.checked)}
                    className="form-checkbox"
                  />
                  <span className="checkbox-text">Include drawing option (£150, deducted from project total if order proceeds)</span>
                </label>
              </div>
            </div>
          </div>
          
          {/* Additional Details Card */}
          <div className="card full-width">
            <div className="card-body">
              <h2 className="card-title">Additional Details</h2>
              
              <FormField
                label="Notes"
                type="textarea"
                value={quoteDetails.notes}
                onChange={(e) => handleQuoteChange('notes', e.target.value)}
                rows={3}
              />
              
              <h3 className="section-title">Exclusions</h3>

              {/* Predefined exclusions with checkboxes */}
              <div className="exclusions-list">
                {[
                  'Boarding or fixing the underside of the new staircase.',
                  'Forming any under-stair cupboard or paneling.',
                  'Making good to any plastered walls or ceilings.',
                  'All components will arrive in their natural state, ready for fine sanding and finishing by others.'
                ].map((exclusion, index) => (
                  <div key={index} className="form-field">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={quoteDetails.exclusions.includes(exclusion)}
                        onChange={(e) => {
                          const newExclusions = e.target.checked
                            ? [...quoteDetails.exclusions, exclusion]
                            : quoteDetails.exclusions.filter(item => item !== exclusion);
                          setQuoteDetails({
                            ...quoteDetails,
                            exclusions: newExclusions
                          });
                        }}
                        className="form-checkbox"
                      />
                      <span className="checkbox-text">{exclusion}</span>
                    </label>
                  </div>
                ))}
              </div>

              {/* Custom exclusions */}
              {quoteDetails.exclusions
                .filter(item => ![
                  'Boarding or fixing the underside of the new staircase.',
                  'Forming any under-stair cupboard or paneling.',
                  'Making good to any plastered walls or ceilings.',
                  'All components will arrive in their natural state, ready for fine sanding and finishing by others.'
                ].includes(item))
                .map((exclusion, index) => (
                  <div key={`custom-${index}`} className="form-field custom-exclusion">
                    <FormField
                      value={exclusion}
                      onChange={(e) => {
                        const customExclusions = quoteDetails.exclusions.filter(item => ![
                          'Boarding or fixing the underside of the new staircase.',
                          'Forming any under-stair cupboard or paneling.',
                          'Making good to any plastered walls or ceilings.',
                          'All components will arrive in their natural state, ready for fine sanding and finishing by others.'
                        ].includes(item));
                        
                        customExclusions[index] = e.target.value;
                        
                        setQuoteDetails({
                          ...quoteDetails,
                          exclusions: [
                            ...quoteDetails.exclusions.filter(item => [
                              'Boarding or fixing the underside of the new staircase.',
                              'Forming any under-stair cupboard or paneling.',
                              'Making good to any plastered walls or ceilings.',
                              'All components will arrive in their natural state, ready for fine sanding and finishing by others.'
                            ].includes(item)),
                            ...customExclusions
                          ]
                        });
                      }}
                    />
                    <button
                      className="delete-button-small"
                      style={{ marginLeft: '8px' }}
                      onClick={() => {
                        const newExclusions = [...quoteDetails.exclusions];
                        const customIndex = newExclusions.findIndex(item => item === exclusion);
                        if (customIndex !== -1) {
                          newExclusions.splice(customIndex, 1);
                          setQuoteDetails({
                            ...quoteDetails,
                            exclusions: newExclusions
                          });
                        }
                      }}
                    >
                      <svg className="delete-icon-small" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}

              <Button
                variant="primary"  // Changed from "secondary" to "primary" to make it blue
                size="sm"
                onClick={() => setQuoteDetails({
                  ...quoteDetails,
                  exclusions: [...quoteDetails.exclusions, '']
                })}
              >
                Add Custom Exclusion
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Items Tab */}
      {activeTab === 'items' && (
        <div className="quote-items-grid">
          {/* Selected Items Card */}
          <div className="card items-card">
            <div className="card-body">
              <div className="card-header-flex">
                <h2 className="card-title">Selected Items</h2>
                <Button
                  variant="primary"
                  onClick={handleOpenItemDialog}
                >
                  Add Item
                </Button>
              </div>
              
              <div className="form-field">
                <label className="form-label">Global Markup: {globalMarkup}%</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={globalMarkup}
                  onChange={(e) => setGlobalMarkup(parseInt(e.target.value))}
                  className="form-range"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  style={{ marginTop: '5px' }}
                  onClick={() => {
                    const updatedItems = selectedItems.map(item => ({
                      ...item,
                      markup: globalMarkup
                    }));
                    setSelectedItems(updatedItems);
                    addNotification(`Applied ${globalMarkup}% markup to all items`, 'success');
                  }}
                >
                  Apply to All Items
                </Button>
              </div>
              
              {/* Add Custom Item Section */}
              <div className="custom-item-form">
                <div className="form-field">
                  <Button 
                    variant="primary"
                    size="sm"
                    onClick={() => setShowCustomItemForm(!showCustomItemForm)}
                    style={{ marginBottom: '10px' }}
                  >
                    {showCustomItemForm ? 'Hide Quick Add Form' : 'Quick Add Item'}
                  </Button>
                </div>
                
                {showCustomItemForm && (
                  <div className="card" style={{ padding: '15px', marginBottom: '20px' }}>
                    <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <FormField
                        label="Item Name"
                        value={customItem.name}
                        onChange={(e) => setCustomItem({...customItem, name: e.target.value})}
                        className="form-input"
                      />
                      <FormField
                        label="Cost (£)"
                        type="number"
                        min="0"
                        step="0.01"
                        value={customItem.cost}
                        onChange={(e) => setCustomItem({...customItem, cost: e.target.value === '' ? '' : parseFloat(e.target.value) || 0})}
                        className="form-input"
                      />
                      <FormField
                        label="Quantity"
                        type="number"
                        min="0.1"
                        step="0.1"
                        value={customItem.quantity}
                        onChange={(e) => setCustomItem({...customItem, quantity: e.target.value === '' ? '' : parseFloat(e.target.value) || 1})}
                        className="form-input"
                      />
                      <FormField
                        label="Category (optional)"
                        value={customItem.category}
                        onChange={(e) => setCustomItem({...customItem, category: e.target.value})}
                        className="form-input"
                      />
                      <div className="form-field" style={{ gridColumn: 'span 2' }}>
                        <label className="form-label">Description (optional)</label>
                        <textarea
                          value={customItem.description}
                          onChange={(e) => setCustomItem({...customItem, description: e.target.value})}
                          className="form-textarea"
                          rows="2"
                        />
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                      <Button
                        variant="primary"
                        onClick={handleAddCustomItem}
                        disabled={!customItem.name || customItem.cost === ''}
                      >
                        Add to Quote
                      </Button>
                    </div>
                  </div>
                )}
              </div>
              
              {selectedItems.length === 0 ? (
                <div className="empty-message">
                  No items selected yet. Click "Add Item" to add an item to this quote.
                </div>
              ) : (
                <div className="items-container">
                  {selectedItems.map((item, index) => {
                    const itemTotal = quoteData.itemTotals.find(i => i.id === item.id) || {
                      finalTotal: (item.cost || 0) * (item.quantity || 1)
                    };
                    
                    // Don't apply defaults in safeItem if we have empty string values
                    const safeItem = {
                      ...item,
                      name: item.name || 'Unnamed Item',
                      // Don't use parseFloat here if we want to preserve empty string
                      quantity: item.quantity,
                      markup: item.markup,
                      hideInQuote: !!item.hideInQuote // Convert to boolean
                    };
                    
                    return (
                      <div
                        key={index}
                        className={`item-card ${safeItem.hideInQuote ? 'item-card-hidden' : ''}`}
                      >
                        <div className="item-card-header">
                          <div>
                            <h3 className="item-name">{item.name}</h3>
                            <p className="item-supplier">{getSupplierName(item.supplier)}</p>
                          </div>
                          <div className="item-actions">
                            {/* Add reorder buttons */}
                            <div className="reorder-buttons">
                              <button
                                className="reorder-button"
                                onClick={(e) => {
                                  e.stopPropagation(); // Prevent triggering item click
                                  handleMoveItemUp(index);
                                }}
                                disabled={index === 0}
                                aria-label="Move item up"
                              >
                                <svg className="reorder-icon" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                </svg>
                              </button>
                              <button
                                className="reorder-button"
                                onClick={(e) => {
                                  e.stopPropagation(); // Prevent triggering item click
                                  handleMoveItemDown(index);
                                }}
                                disabled={index === selectedItems.length - 1}
                                aria-label="Move item down"
                              >
                                <svg className="reorder-icon" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </button>
                            </div>
                            <button
                              className="delete-button"
                              onClick={() => handleRemoveItem(index)}
                              aria-label="Remove item"
                            >
                              <svg className="delete-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        </div>
                        
                        {/* Rest of the form fields */}
                        <div className="item-fields-grid">
                          <div className="form-field">
                            <label className="field-label">Quantity</label>
                            <input
                              type="text" // Changed from number to text to allow empty values
                              value={safeItem.quantity} // Use safeItem to preserve empty string
                              onChange={(e) => {
                                const value = e.target.value;
                                // Allow empty string or valid numbers
                                if (value === '' || (!isNaN(value) && value.trim() !== '')) {
                                  handleUpdateItem(index, { ...item, quantity: value });
                                }
                              }}
                              onBlur={(e) => {
                                // Only convert to default on blur if still empty
                                if (e.target.value === '') {
                                  handleUpdateItem(index, { ...item, quantity: 0.1 });
                                }
                              }}
                              className="form-input"
                            />
                          </div>
                          <div className="form-field">
                            <label className="field-label">Markup %</label>
                            <input
                              type="text" // Changed from number to text to allow empty values
                              value={safeItem.markup} // Use safeItem to preserve empty string
                              onChange={(e) => {
                                const value = e.target.value;
                                // Allow empty string or valid numbers
                                if (value === '' || (!isNaN(value) && value.trim() !== '')) {
                                  handleUpdateItem(index, { ...item, markup: value });
                                }
                              }}
                              onBlur={(e) => {
                                // Only convert to default on blur if still empty
                                if (e.target.value === '') {
                                  handleUpdateItem(index, { ...item, markup: 0 });
                                }
                              }}
                              className="form-input"
                            />
                          </div>
                          <div className="form-field">
                            <label className="field-label">Total</label>
                            <div className="total-display">
                              {formatCurrency(itemTotal.finalTotal)}
                            </div>
                          </div>
                        </div>
                        
                        <div className="form-field" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
                          <label className="checkbox-label">
                            <input
                              type="checkbox"
                              checked={item.hideInQuote}
                              onChange={(e) => handleUpdateItem(index, { ...item, hideInQuote: e.target.checked })}
                              className="form-checkbox"
                            />
                            <span className="checkbox-text">
                              Hide in quote
                            </span>
                          </label>
                          
                          <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => setEditingItem({ ...item, index })}
                              style={{ marginLeft: 'auto' }}
                            >
                              Edit Item
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => handleRemoveItem(index)}
                            >
                              Remove Item
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          
          {/* Hidden Costs & Summary Card */}
          <div className="quote-sidebar">
            <div className="card">
              <div className="card-body">
                <div className="card-header-flex">
                  <h2 className="card-title">Hidden Costs</h2>
                  <Button
                    variant="primary"  // Changed from "secondary" to "primary" to make it blue
                    size="sm"
                    onClick={() => setShowHiddenCostDialog(true)}
                  >
                    Add Cost
                  </Button>
                </div>
                
                <div className="form-field">
                  <label className="form-label">Distribution Method</label>
                  <select
                    className="form-select"
                    value={distributionMethod}
                    onChange={(e) => setDistributionMethod(e.target.value)}
                  >
                    <option value="even">Distribute Evenly</option>
                    <option value="proportional">Distribute Proportionally</option>
                  </select>
                  <p className="helper-text">
                    {distributionMethod === 'even'
                      ? 'Costs will be divided equally among all visible items.'
                      : 'Costs will be distributed in proportion to each item\'s base cost.'}
                  </p>
                </div>
                
                {hiddenCosts.length === 0 ? (
                  <div className="empty-message small">
                    No hidden costs added
                  </div>
                ) : (
                  <div className="hidden-costs-list">
                    {hiddenCosts.map((cost, index) => (
                      <div key={index} className="hidden-cost-item">
                        <span className="cost-name">{cost.name}</span>
                        <div className="cost-actions">
                          <span className="cost-amount">{formatCurrency(cost.amount)}</span>
                          <button
                            className="delete-button-small"
                            onClick={() => handleRemoveHiddenCost(index)}
                          >
                            <svg className="delete-icon-small" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            {/* Quote Summary */}
            <div className="card">
              <div className="card-body">
                <h2 className="card-title">Quote Summary</h2>
                
                <div className="summary-items">
                  <div className="summary-item">
                    <span className="summary-label">Base Cost:</span>
                    <span className="summary-value">{formatCurrency(quoteData.visibleBaseCost)}</span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">Hidden Costs:</span>
                    <span className="summary-value">{formatCurrency(quoteData.totalHiddenCost)}</span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">Markup ({globalMarkup}%):</span>
                    <span className="summary-value">{formatCurrency(quoteData.totalMarkup)}</span>
                  </div>
                  <div className="summary-total">
                    <span className="summary-label">Total:</span>
                    <span className="summary-value">{formatCurrency(quoteData.grandTotal)}</span>
                  </div>
                </div>
                
                <div className="summary-stats">
                  <div className="summary-stat">
                    <span className="stat-label">Visible Items:</span>
                    <span className="stat-value">{quoteData.visibleItemsCount}</span>
                  </div>
                  <div className="summary-stat">
                    <span className="stat-label">Hidden Items:</span>
                    <span className="stat-value">{quoteData.hiddenItems.length}</span>
                  </div>
                  <div className="summary-stat">
                    <span className="stat-label">Profit Margin:</span>
                    <span className="stat-value">{quoteData.profitPercentage.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Preview Tab */}
      {activeTab === 'preview' && (
        <div className="card">
          <div className="card-body">
            <div className="quote-preview">
              {/* Company header */}
              <div className="quote-preview-header">
                <div className="quote-branding">
                  {settings?.company?.logo ? (
                    <div className="logo-container" style={{ maxWidth: '330px', marginBottom: '15px' }}>
                      <img 
                        src={settings.company.logo} 
                        alt={settings.company?.name || 'Company Logo'} 
                        className="quote-logo" 
                        style={{ 
                          width: '100%', 
                          maxHeight: '133px', 
                          objectFit: 'contain',
                          display: 'block'
                        }} 
                      />
                    </div>
                  ) : (
                    <div className="logo-placeholder" style={{ 
                      height: '60px', 
                      width: '180px', 
                      backgroundColor: '#f3f4f6', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      marginBottom: '15px',
                      color: '#9ca3af',
                      fontSize: '14px',
                      borderRadius: '4px'
                    }}>
                      No logo available
                    </div>
                  )}
                  <h1 className="quote-title" style={{ marginTop: '5px' }}>QUOTATION</h1>
                  <p className="quote-reference">Reference: Q-{new Date().getFullYear()}-{Math.floor(Math.random() * 1000).toString().padStart(3, '0')}</p>
                </div>
                
                <div className="company-details">
                  <p className="company-name" style={{ fontWeight: 'bold', fontSize: '16px' }}>{settings.company?.name || 'Your Company Name'}</p>
                  <div className="company-address">{settings.company?.address || 'Company Address'}</div>
                  <p className="company-contact">{settings.company?.email || 'company@example.com'}</p>
                  <p className="company-contact">{settings.company?.phone || 'Phone Number'}</p>
                  <p className="company-contact">{settings.company?.website || 'www.company.com'}</p>
                </div>
              </div>
              
              {/* Client section */}
              <div className="client-section">
                <h2 className="section-header">Client:</h2>
                <p><span className="detail-label">Name:</span> {quoteDetails.client.name || '[Contact Name]'}</p>
                {quoteDetails.client.company && (
                  <p><span className="detail-label">Company:</span> {quoteDetails.client.company}</p>
                )}
                <p><span className="detail-label">Email:</span> {quoteDetails.client.email || '[Email]'}</p>
                <p><span className="detail-label">Phone:</span> {quoteDetails.client.phone || '[Phone]'}</p>
                {quoteDetails.client.address && (
                  <>
                    <p className="detail-label">Address:</p>
                    <p className="detail-address">{quoteDetails.client.address}</p>
                  </>
                )}
              </div>
              
              {/* Date section */}
              <div className="date-section">
                <p><span className="detail-label">Date:</span> {quoteDetails.date ? new Date(quoteDetails.date).toLocaleDateString('en-GB') : 'N/A'}</p>
                <p><span className="detail-label">Valid Until:</span> {quoteDetails.validUntil ? new Date(quoteDetails.validUntil).toLocaleDateString('en-GB') : 'N/A'}</p>
              </div>
              
              {/* Items table with wrapper */}
              <div className="quote-table-wrapper">
                <table className="quote-table">
                  <thead>
                    <tr>
                      <th>Item Description</th>
                      <th className="text-right">Qty</th>
                      <th className="text-right">Unit Price</th>
                      <th className="text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quoteData.itemTotals.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="empty-table-message">
                          No items added to quote yet
                        </td>
                      </tr>
                    ) : (
                      quoteData.itemTotals.map((item, index) => (
                        <tr key={index}>
                          <td>
                            {item.description || item.name}
                          </td>
                          <td className="text-right">
                            {item.quantity}
                          </td>
                          <td className="text-right">
                            {formatCurrency(item.unitPrice)}
                          </td>
                          <td className="text-right">
                            {formatCurrency(item.finalTotal)}
                          </td>
                        </tr>
                      ))
                    )}
                    
                    {/* Subtotal row - only show when VAT is enabled */}
                    {quoteData.vatEnabled && (
                      <tr className="quote-table-subtotal">
                        <td colSpan="3" className="text-right">
                          Subtotal
                        </td>
                        <td className="text-right">
                          {formatCurrency(quoteData.visibleTotal)}
                        </td>
                      </tr>
                    )}
                    
                    {/* VAT row - only show when VAT is enabled */}
                    {quoteData.vatEnabled && (
                      <tr className="quote-table-vat">
                        <td colSpan="3" className="text-right">
                          VAT ({quoteData.vatRate}%)
                        </td>
                        <td className="text-right">
                          {formatCurrency(quoteData.vatAmount)}
                        </td>
                      </tr>
                    )}
                    
                    {/* Total row */}
                    <tr className="quote-table-total">
                      <td colSpan="3" className="text-right">
                        Total
                      </td>
                      <td className="text-right">
                        {formatCurrency(quoteData.grandTotal)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              
              {/* Terms section */}
              <div className="terms-section">
                <h2 className="terms-heading">Terms and Conditions:</h2>
                
                <h3 className="terms-subheading">Payment Terms:</h3>
                <p>
                  {quoteDetails.paymentTerms === '1'
                    ? '50% deposit required, remainder due on completion.'
                    : quoteDetails.paymentTerms === '2'
                    ? '50% deposit required, 25% on completion of joinery, final 25% on completion.'
                    : quoteDetails.paymentTerms === '4'
                    ? 'Full amount to be paid before delivery.'
                    : quoteDetails.customTerms || 'Custom payment terms'}
                </p>
                <p>This quote is valid for the period specified above.</p>
                
                {/* Exclusions */}
                {quoteDetails.exclusions.length > 0 && (
                  <>
                    <h3 className="terms-subheading">Exclusions:</h3>
                    <ul className="terms-list">
                      {quoteDetails.exclusions.map((exclusion, index) => (
                        <li key={index}>{exclusion}</li>
                      ))}
                    </ul>
                  </>
                )}
                
                {/* Drawing option */}
                {quoteDetails.includeDrawingOption && (
                  <>
                    <h3 className="terms-subheading">Drawings:</h3>
                    <p>Drawings are available before accepting the quote at a cost of £150, which will be deducted from the project total if the order proceeds.</p>
                  </>
                )}
                
                {/* Notes */}
                {quoteDetails.notes && (
                  <>
                    <h3 className="terms-subheading">Additional Notes:</h3>
                    <p className="terms-notes">{quoteDetails.notes}</p>
                  </>
                )}
                
                {/* Add company footer */}
                <div className="quote-footer">
                  <p>{settings?.company?.name || 'Your Company'} {settings?.company?.address ? `| ${settings.company.address}` : ''}</p>
                  <p>
                    {settings?.company?.phone ? `${settings.company.phone} | ` : ''}
                    {settings?.company?.email ? `${settings.company.email} | ` : ''}
                    {settings?.company?.website || 'www.example.com'}
                  </p>
                  {settings?.company?.registration && (
                    <p>Company Registration: {settings.company.registration}</p>
                  )}
                  {settings?.company?.vat && (
                    <p>VAT Registration: {settings.company.vat}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Add Item Dialog */}
      {!useAlternativeDialog && (
        <Dialog
          isOpen={showItemDialog}
          onClose={() => setShowItemDialog(false)}
          title="Add Item to Quote"
        >
          <div style={{ 
            width: '100%',
            maxWidth: '800px',
            padding: '0 16px',
            boxSizing: 'border-box'
          }}>
            <div className="form-field">
              <label className="form-label">
                Search
              </label>
              <input
                type="text"
                value={itemSearchTerm}
                onChange={(e) => setItemSearchTerm(e.target.value)}
                placeholder="Search by name or description..."
                className="form-input"
              />
            </div>
            
            <div className="form-field">
              <label className="form-label">
                Category
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="form-select"
              >
                <option value="all">All Categories</option>
                {Array.from(new Set(catalogItems.map(item => item.category)))
                  .filter(Boolean)
                  .sort()
                  .map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
              </select>
            </div>
            
            <div className="catalog-items-list" style={{ maxHeight: '50vh', overflow: 'auto' }}>
              {filteredCatalogItems.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
                  No items match your search criteria
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '10px' }}>
                  {filteredCatalogItems.map(item => (
                    <div
                      key={item.id}
                      style={{ 
                        padding: '10px', 
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        overflow: 'hidden'
                      }}
                      onClick={() => {
                        handleAddItem(item);
                        setShowItemDialog(false);
                      }}
                    >
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        width: '100%'
                      }}>
                        <div style={{ flexGrow: 1, minWidth: 0, paddingRight: '10px', maxWidth: '70%' }}>
                          <h3 style={{ margin: '0 0 5px 0', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</h3>
                          <p style={{ margin: '0 0 5px 0', color: '#666' }}>{getSupplierName(item.supplier)}</p>
                          {item.description && (
                            <p style={{ margin: '0', fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.description}</p>
                          )}
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0, minWidth: '80px' }}>
                          <p style={{ margin: '0 0 5px 0', fontWeight: 'bold', whiteSpace: 'nowrap' }}>{formatCurrency(item.cost)}</p>
                          {item.category && (
                            <p style={{ margin: '0', fontSize: '12px', color: '#666' }}>{item.category}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div style={{ marginTop: '20px', textAlign: 'right' }}>
              <Button
                variant="secondary"
                onClick={() => setShowItemDialog(false)}
                style={{ marginRight: '10px' }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </Dialog>
      )}
      
      {/* Alternative Dialog Implementation */}
      {useAlternativeDialog && showItemDialog && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 1000,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowItemDialog(false);
          }}
        >
          <div 
            style={{
              backgroundColor: 'white',
              padding: '20px',
              borderRadius: '5px',
              width: '90%',
              maxWidth: '800px',
              maxHeight: '80vh',
              overflow: 'auto'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h2 style={{ margin: 0 }}>Add Item to Quote</h2>
              <button 
                style={{ 
                  background: 'none', 
                  border: 'none',
                  cursor: 'pointer', 
                  fontSize: '20px'
                }}
                onClick={() => setShowItemDialog(false)}
              >
                ×
              </button>
            </div>
            
            <div className="form-field">
              <label className="form-label">
                Search
              </label>
              <input
                type="text"
                value={itemSearchTerm}
                onChange={(e) => setItemSearchTerm(e.target.value)}
                placeholder="Search by name or description..."
                className="form-input"
              />
            </div>
            
            <div className="form-field">
              <label className="form-label">
                Category
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="form-select"
              >
                <option value="all">All Categories</option>
                {Array.from(new Set(catalogItems.map(item => item.category)))
                  .filter(Boolean)
                  .sort()
                  .map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
              </select>
            </div>
            
            <div className="catalog-items-list" style={{ maxHeight: '50vh', overflow: 'auto' }}>
              {filteredCatalogItems.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
                  No items match your search criteria
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '10px' }}>
                  {filteredCatalogItems.map(item => (
                    <div
                      key={item.id}
                      style={{ 
                        padding: '10px', 
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        overflow: 'hidden'
                      }}
                      onClick={() => {
                        handleAddItem(item);
                        setShowItemDialog(false);
                      }}
                    >
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        width: '100%'
                      }}>
                        <div style={{ flexGrow: 1, minWidth: 0, paddingRight: '10px', maxWidth: '70%' }}>
                          <h3 style={{ margin: '0 0 5px 0', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</h3>
                          <p style={{ margin: '0 0 5px 0', color: '#666' }}>{getSupplierName(item.supplier)}</p>
                          {item.description && (
                            <p style={{ margin: '0', fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.description}</p>
                          )}
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0, minWidth: '80px' }}>
                          <p style={{ margin: '0 0 5px 0', fontWeight: 'bold', whiteSpace: 'nowrap' }}>{formatCurrency(item.cost)}</p>
                          {item.category && (
                            <p style={{ margin: '0', fontSize: '12px', color: '#666' }}>{item.category}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div style={{ marginTop: '20px', textAlign: 'right' }}>
              <Button
                variant="secondary"
                onClick={() => setShowItemDialog(false)}
                style={{ marginRight: '10px' }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Hidden Cost Dialog */}
      <Dialog
        isOpen={showHiddenCostDialog}
        onClose={() => setShowHiddenCostDialog(false)}
        title="Add Hidden Cost"
      >
        <div className="form-field">
          <label className="form-label">
            Name
          </label>
          <input
            type="text"
            value={newHiddenCost.name}
            onChange={(e) => setNewHiddenCost({ ...newHiddenCost, name: e.target.value })}
            placeholder="e.g., Delivery, Installation, etc."
            className="form-input"
          />
        </div>
        
        <div className="form-field">
          <label className="form-label">
            Amount (£)
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={newHiddenCost.amount || 0} // Add fallback for undefined
            onChange={(e) => setNewHiddenCost({ 
              ...newHiddenCost, 
              amount: e.target.value === '' ? '' : parseFloat(e.target.value) || 0 
            })}
            className="form-input"
          />
        </div>
        
        <div className="dialog-actions">
          <Button
            variant="secondary"
            onClick={() => setShowHiddenCostDialog(false)}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleAddHiddenCost}
          >
            Add Cost
          </Button>
        </div>
      </Dialog>
      
      {/* Email Instructions Dialog */}
      <Dialog
        isOpen={showEmailDialog}
        onClose={() => setShowEmailDialog(false)}
        title="Email Quote"
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
               
                <div className="email-actions-group">
                  <Button
                    variant="primary"
                    onClick={safeExportPDF}
                  >
                    Export PDF Only
                  </Button>
                  <Button
                    variant="primary"
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

      {/* Edit Item Dialog */}
      <Dialog
        isOpen={!!editingItem}
        onClose={() => setEditingItem(null)}
        title="Edit Item"
      >
        {editingItem && (
          <>
            <div className="form-field">
              <label className="form-label">
                Item Name
              </label>
              <input
                type="text"
                value={editingItem.name}
                onChange={(e) => setEditingItem({...editingItem, name: e.target.value})}
                className="form-input"
              />
            </div>
            
            <div className="form-field">
              <label className="form-label">
                Description
              </label>
              <textarea
                value={editingItem.description || ''}
                onChange={(e) => setEditingItem({...editingItem, description: e.target.value})}
                rows="3"
                className="form-textarea"
              />
            </div>
            
                                  <div className="form-row" style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(2, 1fr)', 
              gap: '1rem' 
            }}>
              <div className="form-field">
                <label className="form-label">
                  Cost (£)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editingItem.cost}
                  onChange={(e) => setEditingItem({
                    ...editingItem, 
                    cost: e.target.value === '' ? '' : parseFloat(e.target.value) || 0
                  })}
                  className="form-input"
                />
              </div>
              
              <div className="form-field">
                <label className="form-label">
                  Category
                </label>
                <input
                  type="text"
                  value={editingItem.category || ''}
                  onChange={(e) => setEditingItem({...editingItem, category: e.target.value})}
                  className="form-input"
                />
              </div>
            </div>
            
            <div className="dialog-actions">
              <Button
                variant="secondary"
                onClick={() => setEditingItem(null)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  if (editingItem.index !== undefined) {
                    const newItems = [...selectedItems];
                    const { index, ...itemWithoutIndex } = editingItem;
                    newItems[index] = itemWithoutIndex;
                    setSelectedItems(newItems);
                    setEditingItem(null);
                    addNotification("Item updated successfully", "success");
                  }
                }}
              >
                Save Changes
              </Button>
            </div>
          </>
        )}
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
            setQuoteDetails(prev => ({
              ...prev,
              clientName: contact.customerType === 'individual' 
                ? `${contact.firstName} ${contact.lastName}`.trim()
                : `${contact.firstName || ''} ${contact.lastName || ''}`.trim(),
              clientCompany: contact.company || '',
              clientEmail: contact.email || '',
              clientPhone: contact.phone || '',
              clientAddress: contact.address || ''
            }));
            setShowContactSelector(false);
            addNotification(`Contact selected: ${contact.firstName} ${contact.lastName}`, 'success');
          }}
        />
      </Dialog>
      
      {/* Missing Company Information Dialog */}
      <Dialog
        isOpen={showMissingCompanyInfoDialog}
        onClose={() => setShowMissingCompanyInfoDialog(false)}
        title="Missing Company Information"
      >
        <div style={{ maxWidth: '500px' }}>
          <div style={{ 
                       backgroundColor: '#fff3cd', 
            color: '#856404', 
            padding: '12px 16px', 
            borderRadius: '4px',
            marginBottom: '16px'
          }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '16px' }}>Company information is incomplete</h3>
            <p style={{ margin: '0', fontSize: '14px' }}>
              To create professional quotes, please update your company information in the settings.
              {!settings?.company?.name && <strong>Yourcompany name is missing.</strong>}
              {!settings?.company?.address && <strong> Your company address is missing.</strong>}
            </p>
          </div>
          
          <p>
            You can continue without company information, but your quotes will look incomplete
            and may appear unprofessional to clients.
          </p>
          
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            marginTop: '20px'
          }}>
            <Button
              variant="secondary"
              onClick={() => {
                // Set the bypass flag to true when user chooses to continue without company info
                setBypassCompanyInfoCheck(true);
                setShowMissingCompanyInfoDialog(false);
                
                // Continue with PDF export
                if (activeTab !== 'preview') {
                  setActiveTab('preview');
                  // Wait for tab change and then export
                  setTimeout(() => handleExportPDF(), 300);
                } else {
                  handleExportPDF();
                }
              }}
            >
              Continue without company information
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setShowMissingCompanyInfoDialog(false);
                navigate('/settings');
              }}
            >
              Go to Settings
            </Button>
          </div>
        </div>
      </Dialog>
    </PageLayout>
  );
};

export default QuoteBuilder;