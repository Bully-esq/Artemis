import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useQuery } from 'react-query';
import { useAppContext } from '../../context/AppContext';
import api from '../../services/api';
import pdfGenerator from '../../services/pdfGenerator';
import { calculateQuoteData } from '../../utils/calculations';

// Components
import Button from '../common/Button';
import Loading from '../common/Loading';
import FormField from '../common/FormField';

const QuoteBuilder = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { addNotification, settings } = useAppContext();
  
  // Local state
  const [activeTab, setActiveTab] = useState('catalog');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedItems, setSelectedItems] = useState([]);
  const [hiddenCosts, setHiddenCosts] = useState([]);
  const [globalMarkup, setGlobalMarkup] = useState(20);
  const [distributionMethod, setDistributionMethod] = useState('even');
  const [showForm, setShowForm] = useState(true);
  
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
  const calculateQuoteTotal = () => {
    // Base calculation logic (simplified)
    // In a real implementation, you'd have more detailed calculations
    const baseTotal = selectedItems.reduce((sum, item) => sum + ((item.cost || 0) * (item.quantity || 1)), 0);
    const hiddenCostsTotal = hiddenCosts.reduce((sum, cost) => sum + (parseFloat(cost.amount) || 0), 0);
    const markupAmount = baseTotal * (globalMarkup / 100);
    
    return {
      items: selectedItems.length,
      baseTotal,
      hiddenCosts: hiddenCostsTotal,
      markup: markupAmount,
      markupPercentage: `${globalMarkup}%`,
      total: baseTotal + hiddenCostsTotal + markupAmount
    };
  };
  
  const quoteData = calculateQuoteTotal();
  
  // Filter catalog items based on search and category
  const filteredCatalogItems = catalogItems.filter(item => {
    // Search filter
    const matchesSearch = !searchTerm || 
      (item.name && item.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
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
  
  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-72 bg-white border-r border-gray-200 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-medium">Supplier Items</h2>
          
          {/* Sidebar tabs */}
          <div className="flex mt-2 border-b border-gray-200">
            <button
              className={`py-2 px-4 ${activeTab === 'catalog' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
              onClick={() => setActiveTab('catalog')}
            >
              Catalog
            </button>
            <button
              className={`py-2 px-4 ${activeTab === 'selected' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
              onClick={() => setActiveTab('selected')}
            >
              Selected Items
            </button>
            <button
              className={`py-2 px-4 ${activeTab === 'hidden' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
              onClick={() => setActiveTab('hidden')}
            >
              Hidden Costs
            </button>
          </div>
        </div>
        
        {/* Sidebar content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'catalog' && (
            <div className="space-y-4">
              {/* Search box */}
              <input
                type="text"
                className="w-full p-2 border border-gray-300 rounded-md"
                placeholder="Search items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              
              {/* Categories */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Categories:</label>
                <div className="flex flex-wrap gap-2">
                  <button
                    className={`px-2 py-1 text-xs rounded-md ${
                      selectedCategory === 'all' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'
                    }`}
                    onClick={() => setSelectedCategory('all')}
                  >
                    All
                  </button>
                  <button
                    className={`px-2 py-1 text-xs rounded-md ${
                      selectedCategory === 'timber' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'
                    }`}
                    onClick={() => setSelectedCategory('timber')}
                  >
                    Timber
                  </button>
                  <button
                    className={`px-2 py-1 text-xs rounded-md ${
                      selectedCategory === 'hardware' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'
                    }`}
                    onClick={() => setSelectedCategory('hardware')}
                  >
                    Hardware
                  </button>
                  <button
                    className={`px-2 py-1 text-xs rounded-md ${
                      selectedCategory === 'glass' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'
                    }`}
                    onClick={() => setSelectedCategory('glass')}
                  >
                    Glass
                  </button>
                  <button
                    className={`px-2 py-1 text-xs rounded-md ${
                      selectedCategory === 'labour' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'
                    }`}
                    onClick={() => setSelectedCategory('labour')}
                  >
                    Labour
                  </button>
                  <button
                    className={`px-2 py-1 text-xs rounded-md ${
                      selectedCategory === 'other' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'
                    }`}
                    onClick={() => setSelectedCategory('other')}
                  >
                    Other
                  </button>
                </div>
              </div>
              
              {/* Catalog items */}
              <div className="mt-4">
                <div className="text-sm text-gray-500 mb-2">
                  {filteredCatalogItems.length} items found
                </div>
                <div className="space-y-2">
                  {filteredCatalogItems.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 border border-gray-200 rounded-md bg-white cursor-pointer hover:border-blue-500"
                      onClick={() => handleAddItem(item)}
                    >
                      <div className="flex justify-between">
                        <div className="font-medium">{item.name}</div>
                        <div>£{(item.cost || 0).toFixed(2)}</div>
                      </div>
                      {item.description && (
                        <div className="text-sm text-gray-500 mt-1">{item.description}</div>
                      )}
                      <div className="mt-1 flex items-center text-xs">
                        <span
                          className={`px-1.5 py-0.5 rounded-full ${
                            item.category === 'timber' ? 'bg-amber-100 text-amber-800' :
                            item.category === 'hardware' ? 'bg-blue-100 text-blue-800' :
                            item.category === 'glass' ? 'bg-green-100 text-green-800' :
                            item.category === 'labour' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {item.category}
                        </span>
                        {suppliers.find(s => s.id === item.supplier)?.name && (
                          <span className="ml-2 text-gray-500">
                            {suppliers.find(s => s.id === item.supplier)?.name}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'selected' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Global Markup: {globalMarkup}%
                </label>
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
                <div className="p-4 bg-gray-50 rounded-md text-gray-500 text-center">
                  No items selected yet
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedItems.map((item, index) => (
                    <div
                      key={item.id}
                      className={`p-3 rounded-md border ${item.hideInQuote ? 'border-dashed border-gray-300 bg-gray-50' : 'border-gray-200 bg-white'}`}
                    >
                      <div className="flex justify-between items-start">
                        <h4 className="font-medium">{item.name}</h4>
                        <button
                          className="text-red-500 hover:text-red-700"
                          onClick={() => handleRemoveItem(index)}
                        >
                          <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <div>
                          <label className="block text-xs text-gray-500">Quantity</label>
                          <input
                            type="number"
                            min="0.1"
                            step="0.1"
                            className="w-full p-1 border border-gray-300 rounded text-sm"
                            value={item.quantity}
                            onChange={(e) => handleUpdateItem(index, { ...item, quantity: parseFloat(e.target.value) || 0.1 })}
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500">Markup %</label>
                          <input
                            type="number"
                            min="0"
                            className="w-full p-1 border border-gray-300 rounded text-sm"
                            value={item.markup}
                            onChange={(e) => handleUpdateItem(index, { ...item, markup: parseInt(e.target.value) || 0 })}
                          />
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
                  ))}
                </div>
              )}
            </div>
          )}
          
          {activeTab === 'hidden' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Distribution Method
                </label>
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
              
              <button
                className="w-full py-2 px-4 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                onClick={() => {
                  setHiddenCosts([
                    ...hiddenCosts,
                    { id: Date.now().toString(), name: '', amount: 0 }
                  ]);
                }}
              >
                Add Hidden Cost
              </button>
              
              {hiddenCosts.length === 0 ? (
                <div className="p-4 bg-gray-50 rounded-md text-gray-500 text-center">
                  No hidden costs added yet
                </div>
              ) : (
                <div className="space-y-2">
                  {hiddenCosts.map((cost, index) => (
                    <div
                      key={cost.id}
                      className="p-3 rounded-md border border-gray-200 bg-white"
                    >
                      <div className="flex justify-between items-start">
                        <input
                          type="text"
                          className="border-none bg-transparent p-0 font-medium w-3/4"
                          value={cost.name}
                          onChange={(e) => {
                            const newCosts = [...hiddenCosts];
                            newCosts[index].name = e.target.value;
                            setHiddenCosts(newCosts);
                          }}
                          placeholder="Cost name"
                        />
                        <button
                          className="text-red-500 hover:text-red-700"
                          onClick={() => {
                            const newCosts = [...hiddenCosts];
                            newCosts.splice(index, 1);
                            setHiddenCosts(newCosts);
                          }}
                        >
                          <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                      
                      <div className="mt-2">
                        <label className="block text-xs text-gray-500">Amount</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className="w-full p-1 border border-gray-300 rounded text-sm"
                          value={cost.amount}
                          onChange={(e) => {
                            const newCosts = [...hiddenCosts];
                            newCosts[index].amount = parseFloat(e.target.value) || 0;
                            setHiddenCosts(newCosts);
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Summary */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <h3 className="font-medium mb-2">Summary</h3>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Items:</span>
              <span>{quoteData.items}</span>
            </div>
            <div className="flex justify-between">
              <span>Base Cost:</span>
              <span>£{quoteData.baseTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Hidden Costs:</span>
              <span>£{quoteData.hiddenCosts.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Markup:</span>
              <span>£{quoteData.markup.toFixed(2)} ({quoteData.markupPercentage})</span>
            </div>
            <div className="flex justify-between font-medium">
              <span>Total:</span>
              <span>£{quoteData.total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white p-4 shadow flex justify-between items-center">
          <h1 className="text-xl font-bold">Quote Builder</h1>
          
          <div className="flex gap-2">
            <button
              className="px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 flex items-center"
              onClick={handleSaveQuote}
            >
              <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
              Save Quote
            </button>
            <button
              className="px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 flex items-center"
              onClick={handleExportPDF}
            >
              <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export PDF
            </button>
            <button
              className="px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 flex items-center"
              onClick={handleEmailQuote}
            >
              <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Email Quote
            </button>
            <button
              className="px-3 py-1 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 flex items-center"
              onClick={() => navigate('/quotes')}
            >
              <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Quotes
            </button>
          </div>
        </div>
        
        {/* Main content */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="max-w-5xl mx-auto">
            {/* Quote details form */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-medium">Quote Details</h2>
                <div className="flex items-center">
                  <input 
                    type="checkbox"
                    id="show-form"
                    checked={showForm}
                    onChange={() => setShowForm(!showForm)}
                    className="mr-2 h-4 w-4 text-blue-600 rounded border-gray-300"
                  />
                  <label htmlFor="show-form" className="text-sm">Show Form</label>
                </div>
              </div>
              
              {showForm && (
                <>
                  {/* Select Contact */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Select Contact
                    </label>
                    <div className="flex">
                      <select 
                        className="w-full rounded-l-md border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                        defaultValue=""
                      >
                        <option value="" disabled>-- Select existing contact --</option>
                        {/* Contact options would go here */}
                      </select>
                      <button
                        className="px-4 py-2 bg-blue-500 text-white rounded-r-md hover:bg-blue-600"
                      >
                        New Contact
                      </button>
                    </div>
                  </div>
                  
                  {/* Client details */}
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
                    
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Address
                      </label>
                      <textarea
                        className="w-full p-2 border border-gray-300 rounded-md focus:border-blue-500 focus:ring-blue-500"
                        rows="3"
                        value={quoteDetails.client.address}
                        onChange={(e) => handleClientChange('address', e.target.value)}
                      ></textarea>
                    </div>
                  </div>
                  
                  {/* Quote dates */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Quote Date
                      </label>
                      <input
                        type="date"
                        className="w-full p-2 border border-gray-300 rounded-md focus:border-blue-500 focus:ring-blue-500"
                        value={quoteDetails.date}
                        onChange={(e) => handleQuoteChange('date', e.target.value)}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Valid Until
                      </label>
                      <input
                        type="date"
                        className="w-full p-2 border border-gray-300 rounded-md focus:border-blue-500 focus:ring-blue-500"
                        value={quoteDetails.validUntil}
                        onChange={(e) => handleQuoteChange('validUntil', e.target.value)}
                      />
                    </div>
                  </div>
                  
                  {/* Payment terms */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Payment Terms
                    </label>
                    <select
                      className="w-full p-2 border border-gray-300 rounded-md focus:border-blue-500 focus:ring-blue-500"
                      value={quoteDetails.paymentTerms}
                      onChange={(e) => handleQuoteChange('paymentTerms', e.target.value)}
                    >
                      <option value="1">50% deposit required, remainder due on completion.</option>
                      <option value="2">50% deposit required, 25% on joinery completion, final 25% on completion.</option>
                      <option value="4">Full payment before delivery.</option>
                      <option value="3">Custom terms</option>
                    </select>
                  </div>
                  
                  {/* Custom terms (if selected) */}
                  {quoteDetails.paymentTerms === '3' && (
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Custom Terms
                      </label>
                      <textarea
                        className="w-full p-2 border border-gray-300 rounded-md focus:border-blue-500 focus:ring-blue-500"
                        rows="2"
                        value={quoteDetails.customTerms}
                        onChange={(e) => handleQuoteChange('customTerms', e.target.value)}
                      ></textarea>
                    </div>
                  )}
                  
                  {/* Exclusions */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Exclusions
                    </label>
                    {quoteDetails.exclusions.map((exclusion, index) => (
                      <div key={index} className="flex mb-2 items-center">
                        <input
                          type="checkbox"
                          checked={true}
                          className="mr-2 h-4 w-4 text-blue-600 border-gray-300 rounded"
                        />
                        <input
                          type="text"
                          className="flex-1 p-2 border border-gray-300 rounded-md focus:border-blue-500 focus:ring-blue-500"
                          value={exclusion}
                          onChange={(e) => handleExclusionsChange(index, e.target.value)}
                        />
                      </div>
                    ))}
                  </div>
                  
                  {/* Additional notes */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Additional Notes
                    </label>
                    <textarea
                      className="w-full p-2 border border-gray-300 rounded-md focus:border-blue-500 focus:ring-blue-500"
                      rows="3"
                      value={quoteDetails.notes}
                      onChange={(e) => handleQuoteChange('notes', e.target.value)}
                    ></textarea>
                  </div>
                  
                  {/* Drawing option */}
                  <div className="flex items-center mb-4">
                    <input
                      type="checkbox"
                      id="drawing-option"
                      checked={quoteDetails.includeDrawingOption}
                      onChange={(e) => handleQuoteChange('includeDrawingOption', e.target.checked)}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                    />
                    <label htmlFor="drawing-option" className="ml-2 text-sm text-gray-700">
                      Include drawing option (£150, deducted from project total if order proceeds)
                    </label>
                  </div>
                </>
              )}
            </div>
            
            {/* Quote Preview */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-medium mb-4">Quote Preview</h2>
              
              <div className="border border-gray-200 rounded-lg p-6">
                {/* Company header */}
                <div className="flex justify-between mb-8">
                  <div>
                    <img src="/logo.svg" alt="Axton's Staircases" className="h-16 mb-2" />
                    <h1 className="text-2xl font-bold">QUOTATION</h1>
                    <p className="text-gray-600">Reference: Q-2025-{Math.floor(Math.random() * 1000).toString().padStart(3, '0')}</p>
                  </div>
                  
                  <div className="text-right">
                    <p className="font-semibold">Axton's Staircases</p>
                    <p>29 Park Avenue,</p>
                    <p>Northfleet</p>
                    <p>Kent,</p>
                    <p>DA11 8DW</p>
                    <p>steve@axtons-staircases.co.uk</p>
                    <p>07889476954</p>
                    <p>axtons-staircases.co.uk</p>
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
                    {selectedItems.filter(item => !item.hideInQuote).length === 0 ? (
                      <tr>
                        <td colSpan="4" className="border border-gray-300 px-4 py-2 text-center text-gray-500">
                          No items added to quote yet
                        </td>
                      </tr>
                    ) : (
                      selectedItems
                        .filter(item => !item.hideInQuote)
                        .map((item, index) => {
                          const quantity = item.quantity || 1;
                          const cost = item.cost || 0;
                          const markupPercent = item.markup || globalMarkup;
                          const baseCost = cost * quantity;
                          const markupAmount = baseCost * (markupPercent / 100);
                          const total = baseCost + markupAmount;
                          const unitPrice = quantity > 0 ? total / quantity : 0;
                          
                          return (
                            <tr key={index} className="border-b border-gray-200">
                              <td className="border border-gray-300 px-4 py-2">
                                {item.description || item.name}
                              </td>
                              <td className="border border-gray-300 px-4 py-2 text-right">
                                {quantity}
                              </td>
                              <td className="border border-gray-300 px-4 py-2 text-right">
                                £{unitPrice.toFixed(2)}
                              </td>
                              <td className="border border-gray-300 px-4 py-2 text-right">
                                £{total.toFixed(2)}
                              </td>
                            </tr>
                          );
                        })
                    )}
                    
                    {/* Total row */}
                    <tr className="bg-gray-100 font-semibold">
                      <td colSpan="3" className="border border-gray-300 px-4 py-2 text-right">
                        Total
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-right">
                        £{quoteData.total.toFixed(2)}
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
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuoteBuilder;