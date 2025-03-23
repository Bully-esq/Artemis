import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import api from '../../services/api';
import { calculateQuoteData } from '../../utils/calculations';

// Components
import PageLayout from '../common/PageLayout';
import Tabs from '../common/Tabs';
import Button from '../common/Button';
import ItemSelector from './ItemSelector';
import SelectedItems from './SelectedItems';
import HiddenCosts from './HiddenCosts';
import QuotePreview from './QuotePreview';
import Loading from '../common/Loading';
import Dialog from '../common/Dialog';

const QuoteBuilder = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { addNotification, settings } = useAppContext();
  
  // Local state
  const [activeTab, setActiveTab] = useState('catalog');
  const [quoteDetails, setQuoteDetails] = useState({
    client: {
      name: '',
      company: '',
      email: '',
      phone: '',
      address: ''
    },
    date: new Date().toISOString().split('T')[0],
    validUntil: new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0],
    paymentTerms: settings.quote.defaultTerms || '1',
    customTerms: '',
    exclusions: [],
    notes: '',
    includeDrawingOption: false
  });
  const [selectedItems, setSelectedItems] = useState([]);
  const [hiddenCosts, setHiddenCosts] = useState([]);
  const [globalMarkup, setGlobalMarkup] = useState(settings.quote.defaultMarkup || 20);
  const [distributionMethod, setDistributionMethod] = useState('even');
  const [showContactDialog, setShowContactDialog] = useState(false);
  
  // Fetch data
  const { data: catalogItems, isLoading: isLoadingCatalog } = useQuery('catalog', api.catalog.getAll);
  const { data: suppliers, isLoading: isLoadingSuppliers } = useQuery('suppliers', api.suppliers.getAll);
  const { data: contacts, isLoading: isLoadingContacts } = useQuery('contacts', api.contacts.getAll);
  
  // Fetch quote if id is provided
  const { 
    data: quote, 
    isLoading: isLoadingQuote,
    isError: isQuoteError
  } = useQuery(
    ['quote', id], 
    () => api.quotes.getById(id),
    { 
      enabled: !!id,
      onError: (error) => {
        addNotification(`Error loading quote: ${error.message}`, 'error');
        navigate('/quotes');
      }
    }
  );
  
  // Save quote mutation
  const saveQuoteMutation = useMutation(
    (quoteData) => api.quotes.save(quoteData),
    {
      onSuccess: (data) => {
        queryClient.invalidateQueries('quotes');
        addNotification('Quote saved successfully', 'success');
        
        // If this is a new quote, navigate to the edit page
        if (!id) {
          navigate(`/quotes/${data.id}`);
        }
      },
      onError: (error) => {
        addNotification(`Error saving quote: ${error.message}`, 'error');
      }
    }
  );
  
  // Handle quote loading
  useEffect(() => {
    if (quote && !isLoadingQuote) {
      setQuoteDetails({
        client: {
          name: quote.clientName || '',
          company: quote.clientCompany || '',
          email: quote.clientEmail || '',
          phone: quote.clientPhone || '',
          address: quote.clientAddress || ''
        },
        date: quote.date || new Date().toISOString().split('T')[0],
        validUntil: quote.validUntil || new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0],
        paymentTerms: quote.paymentTerms || '1',
        customTerms: quote.customTerms || '',
        exclusions: Array.isArray(quote.exclusions) ? quote.exclusions : [],
        notes: quote.notes || '',
        includeDrawingOption: Boolean(quote.includeDrawingOption)
      });
      
      setSelectedItems(Array.isArray(quote.selectedItems) ? quote.selectedItems : []);
      setHiddenCosts(Array.isArray(quote.hiddenCosts) ? quote.hiddenCosts : []);
      setGlobalMarkup(quote.globalMarkup || settings.quote.defaultMarkup);
      setDistributionMethod(quote.distributionMethod || 'even');
    }
  }, [quote, isLoadingQuote, settings.quote.defaultMarkup]);
  
  // Loading state
  if (
    isLoadingCatalog || 
    isLoadingSuppliers || 
    isLoadingContacts || 
    (id && isLoadingQuote)
  ) {
    return <Loading message="Loading quote data..." />;
  }
  
  // Handle adding item to quote
  const handleAddItem = (item) => {
    const existingItem = selectedItems.find(i => i.id === item.id);
    
    if (existingItem) {
      setSelectedItems(selectedItems.map(i => 
        i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
      ));
    } else {
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
  };
  
  // Handle removing item from quote
  const handleRemoveItem = (index) => {
    setSelectedItems(selectedItems.filter((_, i) => i !== index));
  };
  
  // Handle updating item
  const handleUpdateItem = (index, changes) => {
    setSelectedItems(selectedItems.map((item, i) => 
      i === index ? { ...item, ...changes } : item
    ));
  };
  
  // Handle adding hidden cost
  const handleAddHiddenCost = (cost) => {
    setHiddenCosts([...hiddenCosts, { id: Date.now().toString(), ...cost }]);
  };
  
  // Handle removing hidden cost
  const handleRemoveHiddenCost = (index) => {
    setHiddenCosts(hiddenCosts.filter((_, i) => i !== index));
  };
  
  // Handle updating hidden cost
  const handleUpdateHiddenCost = (index, changes) => {
    setHiddenCosts(hiddenCosts.map((cost, i) => 
      i === index ? { ...cost, ...changes } : cost
    ));
  };
  
  // Handle global markup change
  const handleMarkupChange = (value) => {
    setGlobalMarkup(value);
    
    // Apply to all selected items if needed
    setSelectedItems(selectedItems.map(item => ({
      ...item,
      markup: value
    })));
  };
  
  // Handle exclusion change
  const handleExclusionChange = (exclusion, checked) => {
    if (checked) {
      setQuoteDetails({
        ...quoteDetails,
        exclusions: [...quoteDetails.exclusions, exclusion]
      });
    } else {
      setQuoteDetails({
        ...quoteDetails,
        exclusions: quoteDetails.exclusions.filter(e => e !== exclusion)
      });
    }
  };
  
  // Handle saving quote
  const saveQuote = () => {
    // Create quote reference
    const clientName = quoteDetails.client.name || 'Unknown Client';
    const date = new Date().toLocaleDateString('en-GB');
    const quoteName = `Quote for ${clientName} - ${date}`;
    
    // Format the quote data
    const quoteData = {
      id: id || Date.now().toString(),
      name: quoteName,
      clientName: quoteDetails.client.name,
      clientCompany: quoteDetails.client.company,
      clientEmail: quoteDetails.client.email,
      clientPhone: quoteDetails.client.phone,
      clientAddress: quoteDetails.client.address,
      date: quoteDetails.date,
      validUntil: quoteDetails.validUntil,
      paymentTerms: quoteDetails.paymentTerms,
      customTerms: quoteDetails.customTerms,
      exclusions: quoteDetails.exclusions,
      notes: quoteDetails.notes,
      includeDrawingOption: quoteDetails.includeDrawingOption,
      selectedItems,
      hiddenCosts,
      globalMarkup,
      distributionMethod,
      savedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Save quote
    saveQuoteMutation.mutate(quoteData);
  };
  
  // Get calculated data for the quote
  const quoteData = calculateQuoteData(selectedItems, hiddenCosts, globalMarkup, distributionMethod);
  
  return (
    <PageLayout title="Quote Builder">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="md:col-span-1">
          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Catalog Items</h2>
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate('/suppliers')}
              >
                Manage
              </Button>
            </div>
            
            <Tabs
              tabs={[
                { id: 'catalog', label: 'Catalog' },
                { id: 'selected', label: 'Selected Items' },
                { id: 'hidden', label: 'Hidden Costs' }
              ]}
              activeTab={activeTab}
              onChange={setActiveTab}
            />
            
            {activeTab === 'catalog' && (
              <ItemSelector
                items={catalogItems || []}
                suppliers={suppliers || []}
                onSelectItem={handleAddItem}
              />
            )}
            
            {activeTab === 'selected' && (
              <SelectedItems
                items={selectedItems}
                globalMarkup={globalMarkup}
                suppliers={suppliers || []}
                quoteData={quoteData}
                onRemoveItem={handleRemoveItem}
                onUpdateItem={handleUpdateItem}
                onMarkupChange={handleMarkupChange}
              />
            )}
            
            {activeTab === 'hidden' && (
              <HiddenCosts
                hiddenCosts={hiddenCosts}
                onAddCost={handleAddHiddenCost}
                onRemoveCost={handleRemoveHiddenCost}
                onUpdateCost={handleUpdateHiddenCost}
                distributionMethod={distributionMethod}
                onDistributionMethodChange={setDistributionMethod}
              />
            )}
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4">Summary</h2>
            <div className="space-y-2">
              <p><strong>Items:</strong> {quoteData.visibleItemsCount}</p>
              <p><strong>Base Cost:</strong> £{quoteData.visibleBaseCost.toFixed(2)}</p>
              <p><strong>Hidden Costs:</strong> £{quoteData.totalHiddenCost.toFixed(2)}</p>
              <p><strong>Markup:</strong> £{quoteData.totalMarkup.toFixed(2)} ({quoteData.profitPercentage.toFixed(1)}%)</p>
              <p className="text-lg font-bold">
                <strong>Total:</strong> £{quoteData.grandTotal.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
        
        {/* Right column (2/3 width) */}
        <div className="md:col-span-2">
          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Quote Details</h2>
              <div className="flex items-center">
                <Button
                  variant="primary"
                  onClick={saveQuote}
                  isLoading={saveQuoteMutation.isLoading}
                  className="mr-3"
                >
                  Save Quote
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => navigate('/quotes')}
                >
                  Back to Quotes
                </Button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Client
                </label>
                <div className="flex gap-2">
                  <select
                    className="form-select w-full rounded-md border-gray-300"
                    value={quoteDetails.client.contactId || ''}
                    onChange={(e) => {
                      const contactId = e.target.value;
                      if (contactId) {
                        const contact = contacts.find(c => c.id === contactId);
                        if (contact) {
                          setQuoteDetails({
                            ...quoteDetails,
                            client: {
                              contactId,
                              name: contact.customerType === 'individual' 
                                ? `${contact.firstName || ''} ${contact.lastName || ''}`.trim() 
                                : contact.firstName || '',
                              company: contact.company || '',
                              email: contact.email || '',
                              phone: contact.phone || '',
                              address: contact.address || ''
                            }
                          });
                        }
                      }
                    }}
                  >
                    <option value="">-- Select a contact --</option>
                    {(contacts || []).map(contact => (
                      <option key={contact.id} value={contact.id}>
                        {contact.customerType === 'individual' 
                          ? `${contact.firstName || ''} ${contact.lastName || ''}`.trim() 
                          : contact.company || 'Unnamed Company'}
                      </option>
                    ))}
                  </select>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setShowContactDialog(true)}
                  >
                    New
                  </Button>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company
                </label>
                <input
                  type="text"
                  className="form-input w-full rounded-md border-gray-300"
                  value={quoteDetails.client.company || ''}
                  onChange={(e) => setQuoteDetails({
                    ...quoteDetails,
                    client: {
                      ...quoteDetails.client,
                      company: e.target.value
                    }
                  })}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Name
                </label>
                <input
                  type="text"
                  className="form-input w-full rounded-md border-gray-300"
                  value={quoteDetails.client.name || ''}
                  onChange={(e) => setQuoteDetails({
                    ...quoteDetails,
                    client: {
                      ...quoteDetails.client,
                      name: e.target.value
                    }
                  })}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  className="form-input w-full rounded-md border-gray-300"
                  value={quoteDetails.client.email || ''}
                  onChange={(e) => setQuoteDetails({
                    ...quoteDetails,
                    client: {
                      ...quoteDetails.client,
                      email: e.target.value
                    }
                  })}
                />
              </div>
              
              {/* Additional form fields for contact details, dates, and quote options */}
              {/* ... */}
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4">Quote Preview</h2>
            <QuotePreview
              quoteDetails={quoteDetails}
              quoteData={quoteData}
              settings={settings}
            />
            
            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="secondary"
                onClick={() => {/* Export to PDF */}}
              >
                Export PDF
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  // First save the quote, then redirect to invoice creation
                  saveQuoteMutation.mutate(
                    {
                      id: id || Date.now().toString(),
                      name: `Quote for ${quoteDetails.client.name || 'Unknown Client'}`,
                      clientName: quoteDetails.client.name,
                      clientCompany: quoteDetails.client.company,
                      clientEmail: quoteDetails.client.email,
                      clientPhone: quoteDetails.client.phone,
                      clientAddress: quoteDetails.client.address,
                      date: quoteDetails.date,
                      validUntil: quoteDetails.validUntil,
                      paymentTerms: quoteDetails.paymentTerms,
                      customTerms: quoteDetails.customTerms,
                      exclusions: quoteDetails.exclusions,
                      notes: quoteDetails.notes,
                      includeDrawingOption: quoteDetails.includeDrawingOption,
                      selectedItems,
                      hiddenCosts,
                      globalMarkup,
                      distributionMethod,
                      savedAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString()
                    },
                    {
                      onSuccess: (data) => {
                        // Navigate to invoice creation with this quote ID
                        navigate(`/invoices/new?quoteId=${data.id || id}`);
                      }
                    }
                  );
                }}
              >
                Create Invoice
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Contact Dialog */}
      {showContactDialog && (
        <Dialog
          title="Add New Contact"
          onClose={() => setShowContactDialog(false)}
        >
          {/* Contact form would go here */}
          {/* ... */}
        </Dialog>
      )}
    </PageLayout>
  );
};

export default QuoteBuilder;