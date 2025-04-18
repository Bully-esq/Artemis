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
import Tabs, { TabPanel } from '../common/Tabs'; // Assumed Tailwind
import Dialog from '../common/Dialog'; // Assumed Tailwind (Headless UI)
import FormField from '../common/FormField'; // Assumed Tailwind
import ContactSelector from '../contacts/ContactSelector'; // Assumed Tailwind
import ActionButtonContainer from '../common/ActionButtonContainer'; // Assumed Tailwind
import QuotePreview from './QuotePreview'; // NEW - Extracted PDF Preview Logic
import ItemSelector from './ItemSelector'; // Corrected import name

// CSS Imports (Keep PDF styles for now, remove others if fully converted)
// import '../../styles/components/quotes.css'; 

// Helper function for currency formatting (if not already in utils)
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount || 0);
};

// Helper function for date formatting (if not already in utils)
const formatDateForInput = (dateString) => {
  if (!dateString) return '';
  try {
    return new Date(dateString).toISOString().split('T')[0];
  } catch (e) {
    return '';
  }
};

const QuoteBuilder = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { addNotification, settings } = useAppContext();
  const queryClient = useQueryClient();
  
  // === STATE MANAGEMENT ===
  const [activeTab, setActiveTab] = useState('details');
  const [quoteDetails, setQuoteDetails] = useState({
    id: id || null,
    clientName: '',
    clientCompany: '',
    clientEmail: '',
    clientPhone: '',
    clientAddress: '',
    date: new Date().toISOString().split('T')[0],
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    paymentTerms: settings?.quote?.defaultPaymentTerms || '1',
    customTerms: '',
    notes: '',
    includeDrawingOption: false,
    exclusions: settings?.quote?.defaultExclusions || [
      'Boarding or fixing the underside of the new staircase.',
      'Forming any under-stair cupboard or paneling.',
      'Making good to any plastered walls or ceilings.',
      'All components will arrive in their natural state, ready for fine sanding and finishing by others.'
    ],
    client: {
      name: '',
      company: '',
      email: '',
      phone: '',
      address: ''
    }
  });
  const [selectedItems, setSelectedItems] = useState([]);
  const [hiddenCosts, setHiddenCosts] = useState([]);
  const [globalMarkup, setGlobalMarkup] = useState(settings?.quote?.defaultMarkup ?? 30);
  const [distributionMethod, setDistributionMethod] = useState(settings?.quote?.defaultDistribution || 'even');
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  
  // Dialog States
  const [showItemDialog, setShowItemDialog] = useState(false);
  const [showHiddenCostDialog, setShowHiddenCostDialog] = useState(false);
  const [showContactSelector, setShowContactSelector] = useState(false);
  const [showCustomItemForm, setShowCustomItemForm] = useState(false);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [showMissingCompanyInfoDialog, setShowMissingCompanyInfoDialog] = useState(false);
  
  // Data for Dialogs
  const [newHiddenCost, setNewHiddenCost] = useState({ name: '', amount: '' });
  const [customItem, setCustomItem] = useState({ name: '', cost: '', quantity: 1, category: '', description: '', markup: 0 });
  const [contactSearchTerm, setContactSearchTerm] = useState('');
  const [itemSearchTerm, setItemSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  
  // Debugging and alternative dialog handling
  const [useAlternativeDialog, setUseAlternativeDialog] = useState(false);
  
  // Handle opening the item dialog with debugging
  const handleOpenItemDialog = () => {
    console.log("Opening item dialog, current state:", showItemDialog);
    setShowItemDialog(true);
    
    // If dialog doesn't open after a short delay, switch to alternative
    setTimeout(() => {
      if (!document.querySelector('.dialog-overlay')) {
        console.log("Dialog component might be failing, switching to alternative");
        // setUseAlternativeDialog(true); // Avoid enabling alternative for now
      }
    }, 300);
  };
  
  // Tracking user's choice to bypass company info check
  const [bypassCompanyInfoCheck, setBypassCompanyInfoCheck] = useState(false);
  
  // Save as Contact state
  const [saveAsContact, setSaveAsContact] = useState(false);
  
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
            id: data.id || id,
            clientName: data.client?.name || data.clientName || '',
            clientCompany: data.client?.company || data.clientCompany || '',
            clientEmail: data.client?.email || '',
            clientPhone: data.client?.phone || '',
            clientAddress: data.client?.address || '',
            date: data.date || new Date().toISOString().split('T')[0],
            validUntil: data.validUntil || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            paymentTerms: data.paymentTerms || settings?.quote?.defaultPaymentTerms || '1',
            customTerms: data.customTerms || '',
            notes: data.notes || '',
            includeDrawingOption: !!data.includeDrawingOption,
            exclusions: Array.isArray(data.exclusions) ? data.exclusions : settings?.quote?.defaultExclusions || [],
            client: {
              name: data.client?.name || data.clientName || '',
              company: data.client?.company || data.clientCompany || '',
              email: data.client?.email || '',
              phone: data.client?.phone || '',
              address: data.client?.address || ''
            }
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
          } else {
             setGlobalMarkup(settings?.quote?.defaultMarkup ?? 30); // Fallback
          }
          
          // Set distribution method
          if (data.distributionMethod && ['even', 'proportional'].includes(data.distributionMethod)) {
            setDistributionMethod(data.distributionMethod);
          } else {
             setDistributionMethod(settings?.quote?.defaultDistribution || 'even'); // Fallback
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
    
    // Category filter - Ensure selectedCategory is defined
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
    setQuoteDetails(prev => ({
      ...prev,
      [field]: value,
      client: {
        ...prev.client,
        [field]: value
      }
    }));
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
  
  // Add new exclusion
  const handleAddExclusion = () => {
    setQuoteDetails(prev => ({
      ...prev,
      exclusions: [...prev.exclusions, ''] // Add empty exclusion string
    }));
  };

  // Remove exclusion
  const handleRemoveExclusion = (index) => {
    const newExclusions = [...quoteDetails.exclusions];
    newExclusions.splice(index, 1);
    setQuoteDetails(prev => ({
      ...prev,
      exclusions: newExclusions
    }));
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
    <PageLayout title={id ? 'Edit Quote' : 'Create Quote'} subtitle={id ? `Ref: ${id}` : 'Create a new quote'}>
      {isLoadingQuote ? (
        <Loading message="Loading quote details..." />
      ) : (
        <>
          <div className="mb-6">
            <Tabs
              tabs={[
                { id: 'details', label: 'Client & Details' },
                { id: 'items', label: 'Items & Costs' },
                { id: 'exclusions', label: 'Exclusions & Notes' },
                { id: 'preview', label: 'Preview' },
              ]}
              activeTab={activeTab}
              onChange={setActiveTab}
              variant="underline" // Or 'pills' or 'default' based on your preference
            />
          </div>

          {/* Client & Details Tab */}
          <TabPanel id="details" activeTab={activeTab}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Client Details Card */}
              <div className="bg-card-background shadow-sm sm:rounded-lg p-6 border border-card-border transition-colors duration-300 ease-linear">
                <h3 className="text-lg font-medium leading-6 text-text-primary mb-4">Client Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    label="Client Name"
                    id="clientName"
                    value={quoteDetails.clientName}
                    onChange={(e) => handleClientChange('clientName', e.target.value)}
                    placeholder="e.g., John Doe"
                    required
                  />
                  <FormField
                    label="Company Name (Optional)"
                    id="clientCompany"
                    value={quoteDetails.clientCompany}
                    onChange={(e) => handleClientChange('clientCompany', e.target.value)}
                    placeholder="e.g., Acme Corp"
                  />
                  <FormField
                    label="Email Address"
                    id="clientEmail"
                    type="email"
                    value={quoteDetails.clientEmail}
                    onChange={(e) => handleClientChange('clientEmail', e.target.value)}
                    placeholder="e.g., john.doe@example.com"
                  />
                  <FormField
                    label="Phone Number"
                    id="clientPhone"
                    type="tel"
                    value={quoteDetails.clientPhone}
                    onChange={(e) => handleClientChange('clientPhone', e.target.value)}
                    placeholder="e.g., 01234 567890"
                  />
                  <FormField
                    label="Address (Optional)"
                    id="clientAddress"
                    type="textarea"
                    rows={3}
                    value={quoteDetails.clientAddress}
                    onChange={(e) => handleClientChange('clientAddress', e.target.value)}
                    className="sm:col-span-2"
                    placeholder="e.g., 123 Main Street, Anytown, AT1 2BT"
                  />
                </div>
                <div className="mt-4 flex justify-end items-center space-x-3">
                   <FormField
                      label="Save as New Contact?"
                      id="saveAsContact"
                      type="checkbox"
                      checked={saveAsContact}
                      onChange={(e) => setSaveAsContact(e.target.checked)}
                      labelClassName="text-sm"
                    />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowContactSelector(true)}
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>}
                  >
                    Load Contact
                  </Button>
                </div>
              </div>

              {/* Quote Details Card */}
              <div className="bg-card-background shadow-sm sm:rounded-lg p-6 border border-card-border transition-colors duration-300 ease-linear">
                <h3 className="text-lg font-medium leading-6 text-text-primary mb-4">Quote Details</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    label="Quote Date"
                    id="quoteDate"
                    type="date"
                    value={formatDateForInput(quoteDetails.date)}
                    onChange={(e) => handleQuoteChange('date', e.target.value)}
                    required
                  />
                  <FormField
                    label="Valid Until"
                    id="validUntil"
                    type="date"
                    value={formatDateForInput(quoteDetails.validUntil)}
                    onChange={(e) => handleQuoteChange('validUntil', e.target.value)}
                    required
                  />
                  <FormField
                    label="Payment Terms"
                    id="paymentTerms"
                    type="select"
                    value={quoteDetails.paymentTerms}
                    onChange={(e) => handleQuoteChange('paymentTerms', e.target.value)}
                    options={[
                      { value: '1', label: 'On Completion' },
                      { value: '2', label: 'Net 7 Days' },
                      { value: '3', label: 'Net 14 Days' },
                      { value: '4', label: 'Net 30 Days' },
                      { value: '5', label: '50% Deposit, 50% Completion' },
                      { value: 'custom', label: 'Custom (Specify Below)' },
                    ]}
                    className="sm:col-span-2"
                  />
                  {quoteDetails.paymentTerms === 'custom' && (
                    <FormField
                      label="Custom Payment Terms"
                      id="customTerms"
                      type="textarea"
                      rows={2}
                      value={quoteDetails.customTerms}
                      onChange={(e) => handleQuoteChange('customTerms', e.target.value)}
                      className="sm:col-span-2"
                      placeholder="Specify custom payment terms here..."
                    />
                  )}
                   <FormField
                      label="Include Drawing Option?"
                      id="includeDrawingOption"
                      type="checkbox"
                      checked={quoteDetails.includeDrawingOption}
                      onChange={(e) => handleQuoteChange('includeDrawingOption', e.target.checked)}
                      helpText="Adds an optional line item for drawings/plans."
                      className="sm:col-span-2"
                    />
                </div>
              </div>
            </div>
          </TabPanel>

          {/* Items & Costs Tab */}
          <TabPanel id="items" activeTab={activeTab}>
            <div className="space-y-6">
              {/* Global Settings Card */}
              <div className="bg-card-background shadow-sm sm:rounded-lg p-6 border border-card-border transition-colors duration-300 ease-linear">
                <h3 className="text-lg font-medium leading-6 text-text-primary mb-4">Costing & Markup</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                  <FormField
                    label="Global Markup %"
                    id="globalMarkup"
                    type="number"
                    value={globalMarkup}
                    onChange={(e) => setGlobalMarkup(parseFloat(e.target.value) || 0)}
                    min={0}
                    helpText="Applied to items without a specific markup."
                    required
                    inputClassName="text-right"
                  />
                  <FormField
                    label="Distribute Hidden Costs"
                    id="distributionMethod"
                    type="select"
                    value={distributionMethod}
                    onChange={(e) => setDistributionMethod(e.target.value)}
                    options={[
                      { value: 'even', label: 'Evenly' },
                      { value: 'proportional', label: 'Proportionally' },
                    ]}
                    helpText="How to spread hidden costs across visible items."
                  />
                   {/* Placeholder for potential future global settings */}
                   <div></div>
                </div>
              </div>

              {/* Selected Items Card */}
              <div className="bg-card-background shadow-sm sm:rounded-lg border border-card-border transition-colors duration-300 ease-linear">
                <div className="px-6 py-4 border-b border-card-border flex justify-between items-center">
                  <h3 className="text-lg font-medium leading-6 text-text-primary">Selected Items</h3>
                  <div className="space-x-2">
                     <Button variant="outline" size="sm" onClick={handleOpenItemDialog}>
                       Add Catalog Item
                     </Button>
                     <Button variant="outline" size="sm" onClick={() => setShowCustomItemForm(true)}>
                      Add Custom Item
                     </Button>
                   </div>
                </div>
                <div className="p-6">
                  {selectedItems.length === 0 ? (
                    <p className="text-center text-gray-500 py-4">No items added yet.</p>
                  ) : (
                    <ul className="divide-y divide-gray-200">
                      {selectedItems.map((item, index) => (
                        <li key={item.id || index} className="py-4">
                          {/* Replicated QuoteItemCard structure with Tailwind */}
                          <div className="flex flex-col md:flex-row md:items-start md:justify-between space-y-3 md:space-y-0 md:space-x-4">
                            <div className="flex-grow min-w-0">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="text-base font-semibold text-gray-800 truncate mr-2">
                                  {item.name || 'Unnamed Item'}
                                  {item.category && <span className="ml-2 text-xs font-medium text-gray-500">({item.category})</span>}
                                </h4>
                                 {/* Item Actions (Move, Delete) */}
                                <div className="flex items-center space-x-1 flex-shrink-0">
                                  {/* Reorder Buttons */} 
                                  <div className="flex flex-col">
                                    <button
                                      onClick={() => handleMoveItemUp(index)}
                                      disabled={index === 0}
                                      className="p-0.5 rounded text-gray-400 hover:text-indigo-600 disabled:opacity-30 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500"
                                      aria-label="Move item up"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7"></path></svg>
                                    </button>
                                    <button
                                      onClick={() => handleMoveItemDown(index)}
                                      disabled={index === selectedItems.length - 1}
                                      className="p-0.5 rounded text-gray-400 hover:text-indigo-600 disabled:opacity-30 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500"
                                      aria-label="Move item down"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                    </button>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    onClick={() => handleRemoveItem(index)}
                                    className="text-red-500 hover:bg-red-100"
                                    aria-label="Remove item"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                  </Button>
                                </div>
                              </div>
                              {item.description && (
                                <p className="text-sm text-gray-600 mb-2 line-clamp-2">{item.description}</p>
                              )}
                               {item.supplier && (
                                  <p className="text-xs text-gray-500 mb-3">Supplier: {item.supplier || 'N/A'}</p>
                               )}
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <FormField
                                  label="Cost Price"
                                  id={`item-cost-${index}`}
                                  type="number"
                                  value={item.cost}
                                  onChange={(e) => handleUpdateItem(index, { ...item, cost: parseFloat(e.target.value) || 0 })}
                                  prefix="£"
                                  step="0.01"
                                  min={0}
                                  required
                                  labelSrOnly
                                  placeholder="Cost"
                                />
                                <FormField
                                  label="Quantity"
                                  id={`item-quantity-${index}`}
                                  type="number"
                                  value={item.quantity}
                                  onChange={(e) => handleUpdateItem(index, { ...item, quantity: parseFloat(e.target.value) || 0 })}
                                  min={0}
                                  step="any"
                                  required
                                  labelSrOnly
                                  placeholder="Quantity"
                                />
                                <FormField
                                  label="Markup %"
                                  id={`item-markup-${index}`}
                                  type="number"
                                  value={item.markup}
                                  onChange={(e) => handleUpdateItem(index, { ...item, markup: parseInt(e.target.value) || 0 })}
                                  suffix="%"
                                  min={0}
                                  placeholder="Global"
                                  helpText="Overrides global markup."
                                  labelSrOnly
                                />
                                <FormField
                                  label="Hide in Quote"
                                  id={`item-hide-${index}`}
                                  type="checkbox"
                                  checked={item.hideInQuote}
                                  onChange={(e) => handleUpdateItem(index, { ...item, hideInQuote: e.target.checked })}
                                  labelSrOnly
                                  labelText="Hide"
                                  className="flex items-center justify-end pt-1"
                                  labelClassName="text-sm ml-2"
                                />
                              </div>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {/* Hidden Costs Card */}
              <div className="bg-card-background shadow-sm sm:rounded-lg border border-card-border transition-colors duration-300 ease-linear">
                 <div className="px-6 py-4 border-b border-card-border flex justify-between items-center">
                   <h3 className="text-lg font-medium leading-6 text-text-primary">Additional Costs (Hidden)</h3>
                   <Button variant="outline" size="sm" onClick={handleAddHiddenCost}>
                     Add Hidden Cost
                   </Button>
                 </div>
                 <div className="p-6">
                    {hiddenCosts.length === 0 ? (
                     <p className="text-center text-gray-500 py-4">No hidden costs added yet.</p>
                   ) : (
                     <ul className="divide-y divide-gray-200">
                       {hiddenCosts.map((cost, index) => (
                         <li key={cost.id || index} className="py-3 flex items-center justify-between space-x-4">
                           {/* Replicated HiddenCostItem structure with Tailwind */}
                           <div className="flex-grow grid grid-cols-2 gap-4 items-center">
                             <FormField
                               label="Cost Name"
                               id={`hidden-cost-name-${index}`}
                               value={cost.name}
                               onChange={(e) => {
                                 const updatedCosts = [...hiddenCosts];
                                 updatedCosts[index].name = e.target.value;
                                 setHiddenCosts(updatedCosts);
                               }}
                               placeholder="e.g., Labour, Travel"
                               required
                               labelSrOnly
                             />
                             <FormField
                               label="Amount"
                               id={`hidden-cost-amount-${index}`}
                               type="number"
                               value={cost.amount}
                               onChange={(e) => {
                                 const updatedCosts = [...hiddenCosts];
                                 updatedCosts[index].amount = parseFloat(e.target.value) || 0;
                                 setHiddenCosts(updatedCosts);
                               }}
                               prefix="£"
                               step="0.01"
                               min={0}
                               required
                               labelSrOnly
                             />
                           </div>
                           <Button
                             variant="ghost"
                             size="icon-sm"
                             onClick={() => handleRemoveHiddenCost(index)}
                             className="text-red-500 hover:bg-red-100 flex-shrink-0"
                             aria-label="Remove hidden cost"
                           >
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                           </Button>
                         </li>
                       ))}
                     </ul>
                   )}
                 </div>
              </div>

               {/* Calculated Totals (Read Only) */}
               <div className="bg-background-secondary shadow-sm sm:rounded-lg p-6 border border-card-border transition-colors duration-300 ease-linear">
                 <h3 className="text-lg font-medium leading-6 text-text-primary mb-4">Calculated Totals</h3>
                 <dl className="grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-2 text-sm">
                   <div className="sm:col-span-1">
                     <dt className="font-medium text-gray-500">Subtotal (Visible Items)</dt>
                     <dd className="mt-1 text-gray-900 font-semibold">{formatCurrency(quoteData.subtotalVisible)}</dd>
                   </div>
                   <div className="sm:col-span-1">
                     <dt className="font-medium text-gray-500">Total Hidden Costs</dt>
                     <dd className="mt-1 text-gray-900">{formatCurrency(quoteData.totalHiddenCosts)}</dd>
                   </div>
                   <div className="sm:col-span-1">
                     <dt className="font-medium text-gray-500">Total Markup Added</dt>
                     <dd className="mt-1 text-gray-900">{formatCurrency(quoteData.totalMarkup)}</dd>
                   </div>
                   <div className="sm:col-span-1">
                      <dt className="font-medium text-gray-500">Total Base Cost</dt>
                      <dd className="mt-1 text-gray-900">{formatCurrency(quoteData.totalBaseCost)}</dd>
                    </div>
                   <div className="sm:col-span-2">
                     <dt className="font-medium text-gray-500">Final Quote Total</dt>
                     <dd className="mt-1 text-xl text-indigo-700 font-bold">{formatCurrency(quoteData.finalTotal)}</dd>
                   </div>
                 </dl>
              </div>
            </div>
          </TabPanel>

          {/* Exclusions & Notes Tab */}
          <TabPanel id="exclusions" activeTab={activeTab}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Exclusions Card */}
              <div className="bg-card-background shadow-sm sm:rounded-lg p-6 border border-card-border transition-colors duration-300 ease-linear">
                <h3 className="text-lg font-medium leading-6 text-text-primary mb-4">Exclusions</h3>
                <p className="text-sm text-gray-500 mb-4">Items or services explicitly not included in the quote.</p>
                <div className="space-y-3">
                  {quoteDetails.exclusions.map((exclusion, index) => (
                    <div key={index} className="flex items-start space-x-2">
                      <FormField
                        label={`Exclusion ${index + 1}`}
                        id={`exclusion-${index}`}
                        type="textarea"
                        rows={2}
                        value={exclusion}
                        onChange={(e) => handleExclusionsChange(index, e.target.value)}
                        className="flex-grow"
                        labelSrOnly
                        placeholder="e.g., Removal of old materials"
                      />
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleRemoveExclusion(index)}
                        className="text-red-500 hover:bg-red-100 mt-1"
                        aria-label="Remove exclusion"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </Button>
                    </div>
                  ))}
                </div>
                <Button
                  variant="link"
                  size="sm"
                  onClick={handleAddExclusion}
                  className="mt-3"
                >
                  + Add Exclusion
                </Button>
              </div>

              {/* Notes Card */}
              <div className="bg-card-background shadow-sm sm:rounded-lg p-6 border border-card-border transition-colors duration-300 ease-linear">
                <h3 className="text-lg font-medium leading-6 text-text-primary mb-4">Internal Notes</h3>
                 <FormField
                   label="Notes"
                   id="notes"
                   type="textarea"
                   rows={8} // Increased rows for better usability
                   value={quoteDetails.notes}
                   onChange={(e) => handleQuoteChange('notes', e.target.value)}
                   helpText="Internal notes for your reference, not shown to the client."
                   placeholder="Add any internal notes about this quote..."
                   labelSrOnly
                 />
              </div>
            </div>
          </TabPanel>

          {/* Preview Tab */} 
          <TabPanel id="preview" activeTab={activeTab}>
             {/* Apply Tailwind classes to QuotePreview - Needs separate refactoring step if it's complex */}
             <QuotePreview 
               quoteDetails={quoteDetails} 
               selectedItems={selectedItems} 
               hiddenCosts={hiddenCosts} 
               globalMarkup={globalMarkup}
               distributionMethod={distributionMethod}
               quoteData={quoteData}
               settings={settings}
               formatCurrency={formatCurrency} // Pass helper
             />
           </TabPanel>

          {/* Action Buttons */}
          <ActionButtonContainer>
              <Button
                  variant="secondary"
                  onClick={() => navigate('/quotes')}
              >
                  Cancel
              </Button>
              <Button
                  variant="primary"
                  onClick={handleSaveQuote}
                  isLoading={isSaving}
                  disabled={isSaving}
              >
                  {id ? 'Update Quote' : 'Save Quote'}
              </Button>
              {id && (
                <>
                  <Button
                    variant="outline"
                    onClick={safeExportPDF} // Use the safe version
                    isLoading={isGeneratingPdf}
                    disabled={isGeneratingPdf || isSaving}
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>}
                  >
                    Export PDF
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleExportAndOpenEmail}
                    isLoading={isGeneratingPdf} // Assuming export happens first
                    disabled={isGeneratingPdf || isSaving}
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>}
                   >
                     Email Quote
                   </Button>
                   <Button
                      variant="outline"
                      onClick={handleGenerateInvoice}
                      // Add loading/disabled states if needed
                   >
                      Generate Invoice
                   </Button>
                </>
              )}
          </ActionButtonContainer>

          {/* Dialogs */}
          {/* Ensure Dialog component uses Tailwind internally */}
          <Dialog isOpen={showContactSelector} onClose={() => setShowContactSelector(false)} title="Select Contact">
            <FormField
              label="Search Contacts"
              id="contactSearch"
              value={contactSearchTerm}
              onChange={(e) => setContactSearchTerm(e.target.value)}
              placeholder="Search by name, company, email..."
              className="mb-4"
              labelSrOnly
            />
            <ContactSelector searchTerm={contactSearchTerm} onContactSelect={(contact) => {
                handleClientChange('name', `${contact.firstName || ''} ${contact.lastName || ''}`.trim());
                handleClientChange('company', contact.company || '');
                handleClientChange('email', contact.email || '');
                handleClientChange('phone', contact.phone || '');
                handleClientChange('address', contact.address || '');
                setShowContactSelector(false);
                setContactSearchTerm('');
              }} />
          </Dialog>

           {/* Catalog Item Selector Dialog */}
           <Dialog isOpen={showItemDialog} onClose={() => setShowItemDialog(false)} title="Add Item from Catalog" size="3xl"> 
              <p className="text-sm text-gray-600 mb-4">Select items from your catalog to add to the quote.</p>
              {/* Needs CatalogItemSelector component refactored or implemented with Tailwind */}
              {/* <CatalogItemSelector 
                onItemSelected={(item) => {
                  handleAddItem({ ...item, quantity: 1, markup: 0 }); // Add default quantity/markup
                  setShowItemDialog(false);
                }}
                currentItems={selectedItems} // Pass current items to potentially disable already added ones
              /> */}
              <p className="p-4 text-center text-orange-600 bg-orange-100 border border-orange-200 rounded-md">
                Catalog Item Selector component needs to be created/refactored with Tailwind.
              </p>
           </Dialog>

           {/* Custom Item Form Dialog */}
            <Dialog isOpen={showCustomItemForm} onClose={() => setShowCustomItemForm(false)} title="Add Custom Item">
              <form onSubmit={(e) => { e.preventDefault(); handleAddCustomItem(); }} className="space-y-4">
                 <FormField
                   label="Item Name"
                   id="customItemName"
                   value={customItem.name}
                   onChange={(e) => setCustomItem({ ...customItem, name: e.target.value })}
                   required
                 />
                  <FormField
                   label="Category (Optional)"
                   id="customItemCategory"
                   value={customItem.category}
                   onChange={(e) => setCustomItem({ ...customItem, category: e.target.value })}
                 />
                 <FormField
                   label="Description (Optional)"
                   id="customItemDesc"
                   type="textarea"
                   rows={3}
                   value={customItem.description}
                   onChange={(e) => setCustomItem({ ...customItem, description: e.target.value })}
                 />
                 <div className="grid grid-cols-2 gap-4">
                   <FormField
                     label="Cost Price"
                     id="customItemCost"
                     type="number"
                     prefix="£"
                     step="0.01"
                     min={0}
                     value={customItem.cost}
                     onChange={(e) => setCustomItem({ ...customItem, cost: e.target.value })}
                     required
                   />
                   <FormField
                     label="Quantity"
                     id="customItemQuantity"
                     type="number"
                     step="any"
                     min={0}
                     value={customItem.quantity}
                     onChange={(e) => setCustomItem({ ...customItem, quantity: e.target.value })}
                     required
                   />
                 </div>
                 <FormField
                   label="Markup % (Optional)"
                   id="customItemMarkup"
                   type="number"
                   suffix="%"
                   min={0}
                   value={customItem.markup}
                   onChange={(e) => setCustomItem({ ...customItem, markup: parseInt(e.target.value) || 0 })}
                   helpText="Leave at 0 to use global markup."
                 />

                 <div className="flex justify-end space-x-3 pt-4">
                   <Button variant="secondary" onClick={() => setShowCustomItemForm(false)} type="button">
                     Cancel
                   </Button>
                   <Button variant="primary" type="submit">
                     Add Item
                   </Button>
                 </div>
               </form>
             </Dialog>
             
            {/* Hidden Cost Dialog (If needed, currently inline) */}
            {/* ... */}

            {/* Email Dialog (If needed) */}
            <Dialog isOpen={showEmailDialog} onClose={() => setShowEmailDialog(false)} title="Email Quote">
              {/* Content for emailing - potentially preview, recipients, message */}
              <p className="mb-4">Configure email options here (Not fully implemented).</p>
               <div className="flex justify-end space-x-3">
                   <Button variant="secondary" onClick={() => setShowEmailDialog(false)}>
                     Cancel
                   </Button>
                   <Button variant="primary" onClick={handleOpenEmailClient} >
                     Open Email Client
                   </Button>
                 </div>
            </Dialog>

           {/* Missing Company Info Dialog */}
            <Dialog isOpen={showMissingCompanyInfoDialog} onClose={() => setShowMissingCompanyInfoDialog(false)} title="Missing Company Information">
              <p className="mb-4 text-sm text-gray-700">
                Your company details (name, address, etc.) are needed for the PDF header.
                Please update them in <Link to="/settings/company" className="text-indigo-600 hover:underline font-medium">Company Settings</Link>.
              </p>
              <p className="mb-6 text-sm text-gray-600">
                Alternatively, you can export the PDF without the company header information for now.
              </p>
               <div className="flex justify-end space-x-3">
                   <Button variant="secondary" onClick={() => setShowMissingCompanyInfoDialog(false)}>
                     Cancel Export
                   </Button>
                   <Button variant="outline" onClick={exportPDFWithoutCompanyCheck} >
                     Export Anyway
                   </Button>
                   <Button variant="primary" onClick={() => { setShowMissingCompanyInfoDialog(false); navigate('/settings/company'); }}>
                     Go to Settings
                   </Button>
                 </div>
            </Dialog>

        </>
      )}
    </PageLayout>
  );
}

export default QuoteBuilder;