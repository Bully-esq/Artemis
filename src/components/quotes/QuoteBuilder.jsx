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
    <div className="action-buttons">
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
      <div className="tabs-container">
        <div className="card">
          <div className="card-body">
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
      
      {/* Details Tab */}
      {activeTab === 'details' && (
        <div className="quote-details-grid">
          {/* Client Information Card */}
          <div className="card">
            <div className="card-body">
              <h2 className="card-title">Client Information</h2>
              
              <div className="form-row">
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
          </div>
          
          {/* Quote Settings Card */}
          <div className="card">
            <div className="card-body">
              <h2 className="card-title">Quote Settings</h2>
              
              <div className="form-row">
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
              {quoteDetails.exclusions.map((exclusion, index) => (
                <div key={index} className="form-field">
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
              >
                Add Exclusion
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
                  onClick={() => setShowItemDialog(true)}
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
                    
                    return (
                      <div
                        key={index}
                        className={`item-card ${item.hideInQuote ? 'item-card-hidden' : ''}`}
                      >
                        <div className="item-card-header">
                          <div>
                            <h3 className="item-name">{item.name}</h3>
                            <p className="item-supplier">{getSupplierName(item.supplier)}</p>
                          </div>
                          <button
                            className="delete-button"
                            onClick={() => handleRemoveItem(index)}
                          >
                            <svg className="delete-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                        
                        <div className="item-fields-grid">
                          <div className="form-field">
                            <label className="field-label">Quantity</label>
                            <input
                              type="number"
                              min="0.1"
                              step="0.1"
                              value={item.quantity}
                              onChange={(e) => handleUpdateItem(index, { ...item, quantity: parseFloat(e.target.value) || 0.1 })}
                              className="form-input"
                            />
                          </div>
                          <div className="form-field">
                            <label className="field-label">Markup %</label>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={item.markup}
                              onChange={(e) => handleUpdateItem(index, { ...item, markup: parseInt(e.target.value) || 0 })}
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
                        
                        <div className="form-field">
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
                    variant="secondary"
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
                <div>
                  {settings.company.logo && (
                    <img src={settings.company.logo} alt="Company Logo" className="quote-logo" />
                  )}
                  <h1 className="quote-title">QUOTATION</h1>
                  <p className="quote-reference">Reference: Q-{new Date().getFullYear()}-{Math.floor(Math.random() * 1000).toString().padStart(3, '0')}</p>
                </div>
                
                <div className="company-details">
                  <p className="company-name">{settings.company.name}</p>
                  <div className="company-address">{settings.company.address}</div>
                  <p className="company-contact">{settings.company.email}</p>
                  <p className="company-contact">{settings.company.phone}</p>
                  <p className="company-contact">{settings.company.website}</p>
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
              
              {/* Items table */}
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
                  <p>{settings.company.name} | {settings.company.address}</p>
                  <p>{settings.company.phone} | {settings.company.email} | {settings.company.website}</p>
                  {settings.company.registration && (
                    <p>Company Registration: {settings.company.registration}</p>
                  )}
                  {settings.company.vat && (
                    <p>VAT Registration: {settings.company.vat}</p>
                  )}
                </div>
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
            {/* Create unique list of categories */}
            {Array.from(new Set(catalogItems.map(item => item.category)))
              .filter(Boolean)
              .sort()
              .map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
          </select>
        </div>
        
        <div className="catalog-items-list">
          {filteredCatalogItems.length === 0 ? (
            <div className="empty-message">
              No items match your search criteria
            </div>
          ) : (
            <div className="catalog-items">
              {filteredCatalogItems.map(item => (
                <div
                  key={item.id}
                  className="catalog-item"
                  onClick={() => handleAddItem(item)}
                >
                  <div className="catalog-item-content">
                    <div>
                      <h3 className="catalog-item-name">{item.name}</h3>
                      <p className="catalog-item-supplier">{getSupplierName(item.supplier)}</p>
                      {item.description && (
                        <p className="catalog-item-description">{item.description}</p>
                      )}
                    </div>
                    <div className="catalog-item-price">
                      <p className="price-value">{formatCurrency(item.cost)}</p>
                      {item.category && (
                        <p className="category-label">{item.category}</p>
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
            value={newHiddenCost.amount}
            onChange={(e) => setNewHiddenCost({ ...newHiddenCost, amount: e.target.value })}
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
    </PageLayout>
  );
};

export default QuoteBuilder;