import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useQuery } from 'react-query';
import { useAppContext } from '../../context/AppContext';
import api from '../../services/api';
import pdfGenerator from '../../services/pdfGenerator';
import { calculateQuoteData } from '../../utils/calculations';

// Components
import PageLayout from '../common/PageLayout';
import Button from '../common/Button';
import Loading from '../common/Loading';
import FormField from '../common/FormField';
import Tabs from '../common/Tabs';
import Dialog from '../common/Dialog';

const QuoteBuilder = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { addNotification, settings } = useAppContext();
  
  // Local state
  const [activeTab, setActiveTab] = useState('details');
  const [itemSearchTerm, setItemSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedItems, setSelectedItems] = useState([]);
  const [hiddenCosts, setHiddenCosts] = useState([]);
  const [globalMarkup, setGlobalMarkup] = useState(20);
  const [distributionMethod, setDistributionMethod] = useState('even');
  const [showItemDialog, setShowItemDialog] = useState(false);
  const [showHiddenCostDialog, setShowHiddenCostDialog] = useState(false);
  const [newHiddenCost, setNewHiddenCost] = useState({ name: '', amount: 0 });
  
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
  const { data: quote, isLoading: isLoadingQuote } = useQuery(
    ['quote', id],
    () => api.quotes.getById(id),
    {
      enabled: !!id,
      onSuccess: (data) => {
        if (data) {
          // Fill in quote details from data
          setQuoteDetails({
            ...quoteDetails,
            ...data,
            client: data.client || quoteDetails.client
          });
          
          // Set other quote properties if available
          if (data.selectedItems) setSelectedItems(data.selectedItems);
          if (data.hiddenCosts) setHiddenCosts(data.hiddenCosts);
          if (data.globalMarkup) setGlobalMarkup(data.globalMarkup);
          if (data.distributionMethod) setDistributionMethod(data.distributionMethod);
        }
      },
      onError: (error) => {
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
  const quoteData = calculateQuoteData(selectedItems, hiddenCosts, globalMarkup, distributionMethod);
  
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
  
  // Handle updating an item in the quote
  const handleUpdateItem = (index, updatedItem) => {
    const newItems = [...selectedItems];
    newItems[index] = updatedItem;
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
  
  // Save quote
  const handleSaveQuote = async () => {
    try {
      const quoteToSave = {
        ...quoteDetails,
        selectedItems,
        hiddenCosts,
        globalMarkup,
        distributionMethod,
        savedAt: new Date().toISOString()
      };
      
      await api.quotes.save(quoteToSave);
      addNotification('Quote saved successfully', 'success');
    } catch (error) {
      addNotification(`Error saving quote: ${error.message}`, 'error');
    }
  };
  
  // Export PDF
  const handleExportPDF = async () => {
    try {
      await pdfGenerator.generateQuotePDF(
        quoteDetails,
        quoteData,
        settings
      );
      addNotification('Quote PDF generated successfully', 'success');
    } catch (error) {
      addNotification(`Error generating PDF: ${error.message}`, 'error');
    }
  };
  
  // Handle emails
  const handleEmailQuote = () => {
    // Email logic would go here
    addNotification('Email functionality coming soon!', 'info');
  };
  
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
  
  // Header action buttons
  const headerActions = (
    <div className="flex space-x-2">
      <Button variant="primary" onClick={handleSaveQuote}>
        Save Quote
      </Button>
      <Button variant="secondary" onClick={handleExportPDF}>
        Export PDF
      </Button>
      <Button variant="secondary" onClick={handleEmailQuote}>
        Email Quote
      </Button>
      <Button variant="secondary" onClick={() => navigate('/quotes')}>
        Back to Quotes
      </Button>
    </div>
  );
  
  return (
    <PageLayout title={id ? 'Edit Quote' : 'Create Quote'} actions={headerActions}>
      <div className="mb-6">
        <div className="bg-white rounded-lg shadow-sm p-4">
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
      
      {/* Details Tab */}
      {activeTab === 'details' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Client Information Card */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-bold mb-4">Client Information</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <FormField
                label="Contact Name"
                value={quoteDetails.client.name}
                onChange={(e) => handleClientChange('name', e.target.value)}
              />
              
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
          </div>
          
          {/* Quote Settings Card */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-bold mb-4">Quote Settings</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
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
            
            <div className="mt-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={quoteDetails.includeDrawingOption}
                  onChange={(e) => handleQuoteChange('includeDrawingOption', e.target.checked)}
                  className="mr-2 h-4 w-4 text-blue-600 rounded"
                />
                <span className="text-sm">Include drawing option (£150, deducted from project total if order proceeds)</span>
              </label>
            </div>
          </div>
          
          {/* Additional Details Card */}
          <div className="bg-white rounded-lg shadow-sm p-6 lg:col-span-2">
            <h2 className="text-xl font-bold mb-4">Additional Details</h2>
            
            <FormField
              label="Notes"
              type="textarea"
              value={quoteDetails.notes}
              onChange={(e) => handleQuoteChange('notes', e.target.value)}
              rows={3}
            />
            
            <h3 className="font-semibold text-lg mt-4 mb-2">Exclusions</h3>
            {quoteDetails.exclusions.map((exclusion, index) => (
              <div key={index} className="mb-2">
                <FormField
                  value={exclusion}
                  onChange={(e) => handleExclusionsChange(index, e.target.value)}
                />
              </div>
            ))}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setQuoteDetails({
                ...quoteDetails,
                exclusions: [...quoteDetails.exclusions, '']
              })}
              className="mt-2"
            >
              Add Exclusion
            </Button>
          </div>
        </div>
      )}
      
      {/* Items Tab */}
      {activeTab === 'items' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Selected Items Card */}
          <div className="bg-white rounded-lg shadow-sm p-6 lg:col-span-2">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Selected Items</h2>
              <Button
                variant="primary"
                onClick={() => setShowItemDialog(true)}
              >
                Add Item
              </Button>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Global Markup: {globalMarkup}%</label>
              <input
                type="range"
                min="0"
                max="100"
                value={globalMarkup}
                onChange={(e) => setGlobalMarkup(parseInt(e.target.value))}
                className="w-full"
              />
            </div>
            
            {selectedItems.length === 0 ? (
              <div className="border border-gray-200 rounded-md p-6 text-center text-gray-500">
                No items selected yet. Click "Add Item" to add an item to this quote.
              </div>
            ) : (
              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                {selectedItems.map((item, index) => {
                  const itemTotal = quoteData.itemTotals.find(i => i.id === item.id) || {
                    finalTotal: (item.cost || 0) * (item.quantity || 1)
                  };
                  
                  return (
                    <div
                      key={index}
                      className={`p-4 rounded-md border ${item.hideInQuote ? 'border-dashed border-gray-300 bg-gray-50' : 'border-gray-200'}`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium">{item.name}</h3>
                          <p className="text-sm text-gray-500">{getSupplierName(item.supplier)}</p>
                        </div>
                        <button
                          className="text-red-500 hover:text-red-700"
                          onClick={() => handleRemoveItem(index)}
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-3 mt-3">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Quantity</label>
                          <input
                            type="number"
                            min="0.1"
                            step="0.1"
                            value={item.quantity}
                            onChange={(e) => handleUpdateItem(index, { ...item, quantity: parseFloat(e.target.value) || 0.1 })}
                            className="w-full p-2 border border-gray-300 rounded-md text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Markup %</label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={item.markup}
                            onChange={(e) => handleUpdateItem(index, { ...item, markup: parseInt(e.target.value) || 0 })}
                            className="w-full p-2 border border-gray-300 rounded-md text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Total</label>
                          <div className="p-2 bg-gray-100 border border-gray-300 rounded-md text-sm font-medium">
                            {formatCurrency(itemTotal.finalTotal)}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center mt-2">
                        <input
                          type="checkbox"
                          checked={item.hideInQuote}
                          onChange={(e) => handleUpdateItem(index, { ...item, hideInQuote: e.target.checked })}
                          className="h-4 w-4 text-blue-600 rounded border-gray-300"
                        />
                        <label className="ml-2 text-xs text-gray-500">
                          Hide in quote
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          
          {/* Hidden Costs & Summary Card */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Hidden Costs</h2>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowHiddenCostDialog(true)}
                >
                  Add Cost
                </Button>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Distribution Method</label>
                <select
                  className="w-full p-2 border border-gray-300 rounded-md"
                  value={distributionMethod}
                  onChange={(e) => setDistributionMethod(e.target.value)}
                >
                  <option value="even">Distribute Evenly</option>
                  <option value="proportional">Distribute Proportionally</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  {distributionMethod === 'even'
                    ? 'Costs will be divided equally among all visible items.'
                    : 'Costs will be distributed in proportion to each item\'s base cost.'}
                </p>
              </div>
              
              {hiddenCosts.length === 0 ? (
                <div className="border border-gray-200 rounded-md p-4 text-center text-gray-500 text-sm">
                  No hidden costs added
                </div>
              ) : (
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {hiddenCosts.map((cost, index) => (
                    <div key={index} className="flex justify-between items-center p-3 border border-gray-200 rounded-md">
                      <span className="font-medium">{cost.name}</span>
                      <div className="flex items-center">
                        <span className="mr-3">{formatCurrency(cost.amount)}</span>
                        <button
                          className="text-red-500 hover:text-red-700"
                          onClick={() => handleRemoveHiddenCost(index)}
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Quote Summary */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-bold mb-4">Quote Summary</h2>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Base Cost:</span>
                  <span>{formatCurrency(quoteData.visibleBaseCost)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Hidden Costs:</span>
                  <span>{formatCurrency(quoteData.totalHiddenCost)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Markup ({globalMarkup}%):</span>
                  <span>{formatCurrency(quoteData.totalMarkup)}</span>
                </div>
                <div className="flex justify-between font-bold pt-2 border-t border-gray-200 mt-2">
                  <span>Total:</span>
                  <span>{formatCurrency(quoteData.grandTotal)}</span>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Visible Items:</span>
                  <span>{quoteData.visibleItemsCount}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Hidden Items:</span>
                  <span>{quoteData.hiddenItems.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Profit Margin:</span>
                  <span>{quoteData.profitPercentage.toFixed(1)}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Preview Tab */}
      {activeTab === 'preview' && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="border border-gray-200 rounded-lg p-6">
            {/* Company header */}
            <div className="flex justify-between mb-8">
              <div>
                {settings.company.logo && (
                  <img src={settings.company.logo} alt="Company Logo" className="h-16 mb-2" />
                )}
                <h1 className="text-2xl font-bold">QUOTATION</h1>
                <p className="text-gray-600">Reference: Q-{new Date().getFullYear()}-{Math.floor(Math.random() * 1000).toString().padStart(3, '0')}</p>
              </div>
              
              <div className="text-right">
                <p className="font-semibold">{settings.company.name}</p>
                <div className="whitespace-pre-line">{settings.company.address}</div>
                <p>{settings.company.email}</p>
                <p>{settings.company.phone}</p>
                <p>{settings.company.website}</p>
              </div>
            </div>
            
            {/* Client section */}
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-2">Client:</h2>
              <p><span className="font-medium">Name:</span> {quoteDetails.client.name || '[Contact Name]'}</p>
              {quoteDetails.client.company && (
                <p><span className="font-medium">Company:</span> {quoteDetails.client.company}</p>
              )}
              <p><span className="font-medium">Email:</span> {quoteDetails.client.email || '[Email]'}</p>
              <p><span className="font-medium">Phone:</span> {quoteDetails.client.phone || '[Phone]'}</p>
              {quoteDetails.client.address && (
                <>
                  <p className="font-medium">Address:</p>
                  <p className="ml-4 whitespace-pre-line">{quoteDetails.client.address}</p>
                </>
              )}
            </div>
            
            {/* Date section */}
            <div className="mb-6">
              <p><span className="font-medium">Date:</span> {quoteDetails.date ? new Date(quoteDetails.date).toLocaleDateString('en-GB') : 'N/A'}</p>
              <p><span className="font-medium">Valid Until:</span> {quoteDetails.validUntil ? new Date(quoteDetails.validUntil).toLocaleDateString('en-GB') : 'N/A'}</p>
            </div>
            
            {/* Items table */}
            <table className="w-full border-collapse mb-6">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border border-gray-300 px-4 py-2 text-left">Item Description</th>
                  <th className="border border-gray-300 px-4 py-2 text-right">Qty</th>
                  <th className="border border-gray-300 px-4 py-2 text-right">Unit Price</th>
                  <th className="border border-gray-300 px-4 py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {quoteData.itemTotals.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="border border-gray-300 px-4 py-2 text-center text-gray-500">
                      No items added to quote yet
                    </td>
                  </tr>
                ) : (
                  quoteData.itemTotals.map((item, index) => (
                    <tr key={index} className="border-b border-gray-200">
                      <td className="border border-gray-300 px-4 py-2">
                        {item.description || item.name}
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-right">
                        {item.quantity}
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-right">
                        {formatCurrency(item.unitPrice)}
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-right">
                        {formatCurrency(item.finalTotal)}
                      </td>
                    </tr>
                  ))
                )}
                
                {/* Total row */}
                <tr className="bg-gray-100 font-semibold">
                  <td colSpan="3" className="border border-gray-300 px-4 py-2 text-right">
                    Total
                  </td>
                  <td className="border border-gray-300 px-4 py-2 text-right">
                    {formatCurrency(quoteData.grandTotal)}
                  </td>
                </tr>
              </tbody>
            </table>
            
            {/* Terms section */}
            <div className="mt-8">
              <h2 className="text-lg font-semibold mb-2">Terms and Conditions:</h2>
              
              <h3 className="font-semibold text-gray-800 mt-4">Payment Terms:</h3>
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
                  <h3 className="font-semibold text-gray-800 mt-4">Exclusions:</h3>
                  <ul className="list-disc pl-5">
                    {quoteDetails.exclusions.map((exclusion, index) => (
                      <li key={index}>{exclusion}</li>
                    ))}
                  </ul>
                </>
              )}
              
              {/* Drawing option */}
              {quoteDetails.includeDrawingOption && (
                <>
                  <h3 className="font-semibold text-gray-800 mt-4">Drawings:</h3>
                  <p>Drawings are available before accepting the quote at a cost of £150, which will be deducted from the project total if the order proceeds.</p>
                </>
              )}
              
              {/* Notes */}
              {quoteDetails.notes && (
                <>
                  <h3 className="font-semibold text-gray-800 mt-4">Additional Notes:</h3>
                  <p className="whitespace-pre-line">{quoteDetails.notes}</p>
                </>
              )}
              
              {/* Add company footer */}
              <div className="mt-8 pt-4 border-t border-gray-200 text-sm text-gray-600">
                <p className="mb-1">{settings.company.name} | {settings.company.address}</p>
                <p>{settings.company.phone} | {settings.company.email} | {settings.company.website}</p>
                {settings.company.registration && (
                  <p className="mt-1">Company Registration: {settings.company.registration}</p>
                )}
                {settings.company.vat && (
                  <p>VAT Registration: {settings.company.vat}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Add Item Dialog */}
      <Dialog
        isOpen={showItemDialog}
        onClose={() => setShowItemDialog(false)}
        title="Add Item to Quote"
      >
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Search
          </label>
          <input
            type="text"
            value={itemSearchTerm}
            onChange={(e) => setItemSearchTerm(e.target.value)}
            placeholder="Search by name or description..."
            className="w-full p-2 border border-gray-300 rounded-md"
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Category
          </label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md"
          >
            <option value="all">All Categories</option>
            {/* Create unique list of categories */}
            {Array.from(new Set(catalogItems.map(item => item.category)))
              .filter(Boolean)
              .sort()
              .map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
          </select>
        </div>
        
        <div className="max-h-96 overflow-y-auto mt-4">
          {filteredCatalogItems.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              No items match your search criteria
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredCatalogItems.map(item => (
                <div
                  key={item.id}
                  className="py-3 hover:bg-gray-50 cursor-pointer"
                  onClick={() => handleAddItem(item)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium">{item.name}</h3>
                      <p className="text-sm text-gray-500">{getSupplierName(item.supplier)}</p>
                      {item.description && (
                        <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(item.cost)}</p>
                      {item.category && (
                        <p className="text-xs text-gray-500">{item.category}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Dialog>
      
      {/* Hidden Cost Dialog */}
      <Dialog
        isOpen={showHiddenCostDialog}
        onClose={() => setShowHiddenCostDialog(false)}
        title="Add Hidden Cost"
      >
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Name
          </label>
          <input
            type="text"
            value={newHiddenCost.name}
            onChange={(e) => setNewHiddenCost({ ...newHiddenCost, name: e.target.value })}
            placeholder="e.g., Delivery, Installation, etc."
            className="w-full p-2 border border-gray-300 rounded-md"
          />
        </div>
        
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Amount (£)
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={newHiddenCost.amount}
            onChange={(e) => setNewHiddenCost({ ...newHiddenCost, amount: e.target.value })}
            className="w-full p-2 border border-gray-300 rounded-md"
          />
        </div>
        
        <div className="flex justify-end space-x-2">
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
    </PageLayout>
  );
};

export default QuoteBuilder;