import React, { useState, useReducer, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from 'react-query';
import { useAppContext } from '../../context/AppContext';
import api from '../../services/api';
import { calculateQuoteData } from '../../utils/calculations';
import html2pdf from 'html2pdf.js';

// Components
import PageLayout from '../common/PageLayout';
import Button from '../common/Button';
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

const generateId = () => Date.now().toString() + Math.random().toString(36).substr(2, 9);

// --- State Management (Reducer) ---
const initialState = {
  id: null,
  client: { name: '', company: '', email: '', phone: '', address: '' },
  date: new Date().toISOString().split('T')[0],
  validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  paymentTerms: '1', // Default value, will be overridden by settings/fetched data
  customTerms: '',
  notes: '',
  includeDrawingOption: false,
  exclusions: [], // Default value, will be overridden by settings/fetched data
  selectedItems: [],
  hiddenCosts: [],
  globalMarkup: 30, // Default value, will be overridden by settings/fetched data
  distributionMethod: 'even', // Default value, will be overridden by settings/fetched data
};

function quoteReducer(state, action) {
  switch (action.type) {
    case 'INITIALIZE_QUOTE':
      return { ...state, ...action.payload };
    case 'UPDATE_FIELD':
      return { ...state, [action.payload.field]: action.payload.value };
    case 'UPDATE_CLIENT_FIELD':
      return { ...state, client: { ...state.client, [action.payload.field]: action.payload.value } };
    case 'SET_CLIENT':
      return { ...state, client: action.payload };
    case 'UPDATE_EXCLUSION': {
      const newExclusions = [...state.exclusions];
      newExclusions[action.payload.index] = action.payload.value;
      return { ...state, exclusions: newExclusions };
    }
    case 'ADD_EXCLUSION':
      return { ...state, exclusions: [...state.exclusions, ''] };
    case 'REMOVE_EXCLUSION': {
      const newExclusions = [...state.exclusions];
      newExclusions.splice(action.payload.index, 1);
      return { ...state, exclusions: newExclusions };
    }
    case 'ADD_ITEM': {
       const existingItemIndex = state.selectedItems.findIndex(i => i.id === action.payload.item.id);
       if (existingItemIndex > -1) {
         // Update quantity if item exists
         const updatedItems = state.selectedItems.map((item, index) =>
           index === existingItemIndex ? { ...item, quantity: item.quantity + action.payload.item.quantity } : item
         );
         return { ...state, selectedItems: updatedItems };
       } else {
         // Add new item
         return { ...state, selectedItems: [...state.selectedItems, action.payload.item] };
       }
    }
    case 'ADD_ITEMS': { // Handle adding multiple items (from ItemSelector)
        let updatedItems = [...state.selectedItems];
        action.payload.items.forEach(itemToAdd => {
            const existingItemIndex = updatedItems.findIndex(i => i.id === itemToAdd.id);
            if (existingItemIndex > -1) {
                const newItems = [...updatedItems];
                newItems[existingItemIndex] = {
                    ...newItems[existingItemIndex],
                    quantity: newItems[existingItemIndex].quantity + (itemToAdd.quantity || 1) // Ensure quantity is added
                };
                updatedItems = newItems;
            } else {
                updatedItems.push({
                    ...itemToAdd,
                    quantity: itemToAdd.quantity || 1,
                    markup: itemToAdd.markup ?? state.globalMarkup, // Use item markup or global
                    hideInQuote: false,
                    id: itemToAdd.id || generateId() // Ensure ID exists
                });
            }
        });
        return { ...state, selectedItems: updatedItems };
    }
    case 'UPDATE_ITEM': {
      const newItems = [...state.selectedItems];
      const updatedItem = action.payload.item;
       // Ensure numeric conversion happens correctly, handling empty strings
       const quantity = updatedItem.quantity === '' ? '' : (parseFloat(updatedItem.quantity) || 1);
       const markup = updatedItem.markup === '' ? '' : (parseInt(updatedItem.markup) || 0);
       newItems[action.payload.index] = {
          ...updatedItem,
          quantity: quantity,
          markup: markup
       };
      return { ...state, selectedItems: newItems };
    }
    case 'REMOVE_ITEM': {
      const newItems = [...state.selectedItems];
      newItems.splice(action.payload.index, 1);
      return { ...state, selectedItems: newItems };
    }
    case 'MOVE_ITEM': {
        const newItems = [...state.selectedItems];
        const { index, direction } = action.payload;
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= newItems.length) return state; // Boundary check
        [newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]]; // Swap
        return { ...state, selectedItems: newItems };
    }
    case 'ADD_HIDDEN_COST':
      return { ...state, hiddenCosts: [...state.hiddenCosts, action.payload.cost] };
    case 'UPDATE_HIDDEN_COST': {
        const newCosts = [...state.hiddenCosts];
        newCosts[action.payload.index] = {
            ...newCosts[action.payload.index],
            ...action.payload.updates // Apply updates (e.g., { name: 'New Name' } or { amount: 100 })
        };
        return { ...state, hiddenCosts: newCosts };
    }
    case 'REMOVE_HIDDEN_COST': {
      const newCosts = [...state.hiddenCosts];
      newCosts.splice(action.payload.index, 1);
      return { ...state, hiddenCosts: newCosts };
    }
    case 'SET_GLOBAL_MARKUP':
      return { ...state, globalMarkup: action.payload.markup };
    case 'SET_DISTRIBUTION_METHOD':
      return { ...state, distributionMethod: action.payload.method };
    default:
      return state;
  }
}

// --- Data Transformation ---
function transformFetchedQuoteData(data, defaultSettings) {
  if (!data) {
    console.error("Quote data is null or undefined in transformation");
    return null; // Or throw an error
  }
  
  // Process selected items
  const items = Array.isArray(data.selectedItems) ? data.selectedItems : [];
  const selectedItems = items.map(item => ({
    id: item.id || generateId(),
    name: item.name || 'Unnamed Item',
    cost: parseFloat(item.cost) || 0,
    supplier: item.supplier || '',
    quantity: parseFloat(item.quantity) || 1,
    markup: parseInt(item.markup), // Keep potentially undefined to use global later if needed
    hideInQuote: !!item.hideInQuote,
    description: item.description || '',
    category: item.category || ''
  }));
  
  // Process hidden costs
  const costs = Array.isArray(data.hiddenCosts) ? data.hiddenCosts : [];
  const hiddenCosts = costs.map(cost => ({
    id: cost.id || generateId(),
    name: cost.name || 'Unnamed Cost',
    amount: parseFloat(cost.amount) || 0
  }));
  
  // Determine global markup
  let globalMarkup = defaultSettings.defaultMarkup ?? 30;
  if (typeof data.globalMarkup === 'number' && !isNaN(data.globalMarkup)) {
    globalMarkup = data.globalMarkup;
  }

  // Determine distribution method
  let distributionMethod = defaultSettings.defaultDistribution || 'even';
  if (data.distributionMethod && ['even', 'proportional'].includes(data.distributionMethod)) {
      distributionMethod = data.distributionMethod;
  }
  
  return {
    id: data.id,
    client: {
      name: data.client?.name || data.clientName || '',
      company: data.client?.company || data.clientCompany || '',
      email: data.client?.email || '',
      phone: data.client?.phone || '',
      address: data.client?.address || ''
    },
    date: data.date || new Date().toISOString().split('T')[0],
    validUntil: data.validUntil || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    paymentTerms: data.paymentTerms || defaultSettings.defaultPaymentTerms || '1',
    customTerms: data.customTerms || '',
    notes: data.notes || '',
    includeDrawingOption: !!data.includeDrawingOption,
    exclusions: Array.isArray(data.exclusions) ? data.exclusions : defaultSettings.defaultExclusions || [],
    selectedItems,
    hiddenCosts,
    globalMarkup,
    distributionMethod
  };
}

// --- Child Components ---

// Client & Details Form
const ClientDetailsForm = React.memo(({ client, dispatch, onShowContactSelector, saveAsContact, onSaveAsContactChange }) => {
  const handleClientChange = useCallback((field, value) => {
    dispatch({ type: 'UPDATE_CLIENT_FIELD', payload: { field, value } });
  }, [dispatch]);

  return (
    <div className="bg-card-background shadow-sm sm:rounded-lg p-4 sm:p-6 border border-card-border transition-colors duration-300 ease-linear">
      <h3 className="text-lg font-medium leading-6 text-text-primary mb-4">Client Information</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField
          label="Client Name"
          id="clientName"
          value={client.name}
          onChange={(e) => handleClientChange('name', e.target.value)}
          placeholder="e.g., John Doe"
          required
        />
        <FormField
          label="Company Name (Optional)"
          id="clientCompany"
          value={client.company}
          onChange={(e) => handleClientChange('company', e.target.value)}
          placeholder="e.g., Acme Corp"
        />
        <FormField
          label="Email Address"
          id="clientEmail"
          type="email"
          value={client.email}
          onChange={(e) => handleClientChange('email', e.target.value)}
          placeholder="e.g., john.doe@example.com"
        />
        <FormField
          label="Phone Number"
          id="clientPhone"
          type="tel"
          value={client.phone}
          onChange={(e) => handleClientChange('phone', e.target.value)}
          placeholder="e.g., 01234 567890"
        />
        <FormField
          label="Address (Optional)"
          id="clientAddress"
          type="textarea"
          rows={3}
          value={client.address}
          onChange={(e) => handleClientChange('address', e.target.value)}
          className="sm:col-span-2"
          placeholder="e.g., 123 Main Street, Anytown, AT1 2BT"
        />
      </div>
      <div className="mt-4 flex flex-col sm:flex-row sm:justify-end items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
        <FormField
          label="Save as New Contact?"
          id="saveAsContact"
          type="checkbox"
          checked={saveAsContact}
          onChange={(e) => onSaveAsContactChange(e.target.checked)}
          labelClassName="text-sm sm:order-first"
          className="flex items-center sm:justify-end"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={onShowContactSelector}
          icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>}
          className="sm:w-auto dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white"
        >
          Load Contact
        </Button>
      </div>
    </div>
  );
});

const QuoteMetaDetailsForm = React.memo(({ details, dispatch }) => {
   const handleQuoteChange = useCallback((field, value) => {
     dispatch({ type: 'UPDATE_FIELD', payload: { field, value } });
   }, [dispatch]);

   return (
     <div className="bg-card-background shadow-sm sm:rounded-lg p-4 sm:p-6 border border-card-border transition-colors duration-300 ease-linear">
       <h3 className="text-lg font-medium leading-6 text-text-primary mb-4">Quote Details</h3>
       <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
         <FormField
           label="Quote Date"
           id="quoteDate"
           type="date"
           value={formatDateForInput(details.date)}
           onChange={(e) => handleQuoteChange('date', e.target.value)}
           required
         />
         <FormField
           label="Valid Until"
           id="validUntil"
           type="date"
           value={formatDateForInput(details.validUntil)}
           onChange={(e) => handleQuoteChange('validUntil', e.target.value)}
           required
         />
         <FormField
           label="Payment Terms"
           id="paymentTerms"
           type="select"
           value={details.paymentTerms}
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
         {details.paymentTerms === 'custom' && (
           <FormField
             label="Custom Payment Terms"
             id="customTerms"
             type="textarea"
             rows={2}
             value={details.customTerms}
             onChange={(e) => handleQuoteChange('customTerms', e.target.value)}
             className="sm:col-span-2"
             placeholder="Specify custom payment terms here..."
           />
         )}
          <FormField
             label="Include Drawing Option?"
             id="includeDrawingOption"
             type="checkbox"
             checked={details.includeDrawingOption}
             onChange={(e) => handleQuoteChange('includeDrawingOption', e.target.checked)}
             helpText="Adds an optional line item for drawings/plans."
             className="sm:col-span-2"
           />
       </div>
     </div>
   );
});

const CostingSettings = React.memo(({ globalMarkup, distributionMethod, dispatch }) => {
  const handleMarkupChange = useCallback((e) => {
      dispatch({ type: 'SET_GLOBAL_MARKUP', payload: { markup: parseFloat(e.target.value) || 0 } });
  }, [dispatch]);

  const handleDistributionChange = useCallback((e) => {
      dispatch({ type: 'SET_DISTRIBUTION_METHOD', payload: { method: e.target.value } });
  }, [dispatch]);

  return (
    <div className="bg-card-background shadow-sm sm:rounded-lg p-4 sm:p-6 border border-card-border transition-colors duration-300 ease-linear">
      <h3 className="text-lg font-medium leading-6 text-text-primary mb-4">Costing & Markup</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
        <FormField
          label="Global Markup %"
          id="globalMarkup"
          type="number"
          value={globalMarkup}
          onChange={handleMarkupChange}
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
          onChange={handleDistributionChange}
          options={[
            { value: 'even', label: 'Evenly' },
            { value: 'proportional', label: 'Proportionally' },
          ]}
          helpText="How to spread hidden costs across visible items."
        />
         <div></div> {/* Placeholder */}
      </div>
    </div>
  );
});

const SelectedItemsList = React.memo(({ items, dispatch }) => {
  const handleUpdateItem = useCallback((index, updatedItem) => {
    dispatch({ type: 'UPDATE_ITEM', payload: { index, item: updatedItem } });
  }, [dispatch]);

  const handleRemoveItem = useCallback((index) => {
    dispatch({ type: 'REMOVE_ITEM', payload: { index } });
  }, [dispatch]);

  const handleMoveItem = useCallback((index, direction) => {
    dispatch({ type: 'MOVE_ITEM', payload: { index, direction } });
  }, [dispatch]);

  if (items.length === 0) {
      return <p className="text-center text-gray-500 py-4">No items added yet.</p>;
  }

  return (
      <ul className="divide-y divide-gray-200">
          {items.map((item, index) => (
              <li key={item.id || `item-${index}`} className="py-4">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between space-y-3 lg:space-y-0 lg:space-x-4">
                      <div className="flex-grow min-w-0">
                          {/* Item Header */}
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2">
                              <h4 className="text-base font-semibold text-gray-800 dark:text-white truncate mr-2 mb-1 sm:mb-0">
                                  {item.name || 'Unnamed Item'}
                                  {item.category && <span className="ml-2 text-xs font-medium text-gray-500 dark:text-gray-400">({item.category})</span>}
                              </h4>
                              {/* Item Actions (Move, Delete) */}
                              <div className="flex items-center space-x-1 flex-shrink-0">
                                <div className="flex flex-col">
                                    <button
                                        onClick={() => handleMoveItem(index, 'up')}
                                        disabled={index === 0}
                                        className="p-0.5 rounded text-gray-400 hover:text-indigo-600 dark:text-gray-500 dark:hover:text-indigo-400 disabled:opacity-30 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500 dark:focus-visible:ring-indigo-400"
                                        aria-label="Move item up"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7"></path></svg>
                                    </button>
                                    <button
                                        onClick={() => handleMoveItem(index, 'down')}
                                        disabled={index === items.length - 1}
                                        className="p-0.5 rounded text-gray-400 hover:text-indigo-600 dark:text-gray-500 dark:hover:text-indigo-400 disabled:opacity-30 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500 dark:focus-visible:ring-indigo-400"
                                        aria-label="Move item down"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                    </button>
                                </div>
                                  <Button
                                      variant="ghost"
                                      size="icon-sm"
                                      onClick={() => handleRemoveItem(index)}
                                      className="text-red-500 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-900/30"
                                      aria-label="Remove item"
                                  >
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                  </Button>
                              </div>
                          </div>
                          {/* Item Description & Supplier */}
                          {item.description && (
                              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">{item.description}</p>
                          )}
                          {item.supplier && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Supplier: {item.supplier || 'N/A'}</p>
                          )}
                          {/* Item Fields */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                              <FormField
                                  label="Cost Price"
                                  id={`item-cost-${index}`}
                                  type="number"
                                  value={item.cost}
                                  onChange={(e) => handleUpdateItem(index, { ...item, cost: e.target.value })}
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
                                  onChange={(e) => handleUpdateItem(index, { ...item, quantity: e.target.value })}
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
                                  onChange={(e) => handleUpdateItem(index, { ...item, markup: e.target.value })}
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
                                  labelText="Hide in Quote"
                                  className="flex items-center pt-1 sm:justify-self-end"
                                  inputClassName="h-4 w-4"
                                  labelClassName="text-sm ml-2 dark:text-gray-300"
                              />
                          </div>
                      </div>
                  </div>
              </li>
          ))}
      </ul>
  );
});

const HiddenCostsList = React.memo(({ costs, dispatch, onShowAddDialog }) => {
  const handleUpdateCost = useCallback((index, updates) => {
      dispatch({ type: 'UPDATE_HIDDEN_COST', payload: { index, updates } });
  }, [dispatch]);

  const handleRemoveCost = useCallback((index) => {
    dispatch({ type: 'REMOVE_HIDDEN_COST', payload: { index } });
  }, [dispatch]);

  return (
    <div className="bg-card-background shadow-sm sm:rounded-lg border border-card-border transition-colors duration-300 ease-linear">
      <div className="px-4 sm:px-6 py-4 border-b border-card-border flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2 dark:border-gray-700">
        <h3 className="text-lg font-medium leading-6 text-text-primary">Additional Costs (Hidden)</h3>
        <Button variant="outline" size="sm" onClick={onShowAddDialog} className="dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white">
          Add Hidden Cost
        </Button>
      </div>
      <div className="p-4 sm:p-6">
        {costs.length === 0 ? (
          <p className="text-center text-gray-500 py-4">No hidden costs added yet.</p>
        ) : (
          <ul className="divide-y divide-gray-200">
            {costs.map((cost, index) => (
              <li key={cost.id || `cost-${index}`} className="py-3 flex items-center justify-between space-x-4">
                <div className="flex-grow grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                  <FormField
                    label="Cost Name"
                    id={`hidden-cost-name-${index}`}
                    value={cost.name}
                    onChange={(e) => handleUpdateCost(index, { name: e.target.value })}
                    placeholder="e.g., Labour, Travel"
                    required
                    labelSrOnly
                  />
                  <FormField
                    label="Amount"
                    id={`hidden-cost-amount-${index}`}
                    type="number"
                    value={cost.amount}
                    onChange={(e) => handleUpdateCost(index, { amount: parseFloat(e.target.value) || 0 })}
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
                  onClick={() => handleRemoveCost(index)}
                  className="text-red-500 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-900/30 flex-shrink-0"
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
  );
});

const TotalsDisplay = React.memo(({ quoteData }) => (
  <div className="bg-background-secondary shadow-sm sm:rounded-lg p-4 sm:p-6 border border-card-border transition-colors duration-300 ease-linear">
    <h3 className="text-lg font-medium leading-6 text-text-primary mb-4">Calculated Totals</h3>
    <dl className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-3 text-sm">
      <div className="sm:col-span-1">
        <dt className="font-medium text-gray-500">Subtotal (Visible Items)</dt>
        <dd className="mt-1 text-gray-900 font-semibold">{formatCurrency(quoteData.subtotalVisible)}</dd>
      </div>
      <div className="sm:col-span-1">
        <dt className="font-medium text-gray-500">Total Hidden Costs</dt>
        <dd className="mt-1 text-gray-900">{formatCurrency(quoteData.totalHiddenCost)}</dd>
      </div>
      <div className="sm:col-span-1">
        <dt className="font-medium text-gray-500">Total Markup Added</dt>
        <dd className="mt-1 text-gray-900">{formatCurrency(quoteData.totalMarkup)}</dd>
      </div>
      <div className="sm:col-span-1">
        <dt className="font-medium text-gray-500">Total Base Cost</dt>
        <dd className="mt-1 text-gray-900">{formatCurrency(quoteData.totalBaseCost)}</dd>
      </div>
      {/* VAT Display (Conditional) */}
       {quoteData.vatEnabled && (
          <>
             <div className="sm:col-span-1">
                <dt className="font-medium text-gray-500">Total Before VAT</dt>
                <dd className="mt-1 text-gray-900">{formatCurrency(quoteData.finalTotalBeforeVAT)}</dd>
             </div>
             <div className="sm:col-span-1">
                <dt className="font-medium text-gray-500">VAT ({quoteData.vatRate}%)</dt>
                <dd className="mt-1 text-gray-900">{formatCurrency(quoteData.vatAmount)}</dd>
             </div>
          </>
       )}
      <div className="col-span-2 md:col-span-2">
        <dt className="font-medium text-gray-500">{quoteData.vatEnabled ? "Grand Total (Inc. VAT)" : "Final Quote Total"}</dt>
        <dd className="mt-1 text-xl text-indigo-700 font-bold">{formatCurrency(quoteData.grandTotal)}</dd>
      </div>
    </dl>
  </div>
));

const ExclusionsNotesSection = React.memo(({ exclusions, notes, dispatch }) => {
  const handleExclusionsChange = useCallback((index, value) => {
      dispatch({ type: 'UPDATE_EXCLUSION', payload: { index, value } });
  }, [dispatch]);

  const handleAddExclusion = useCallback(() => {
      dispatch({ type: 'ADD_EXCLUSION' });
  }, [dispatch]);

  const handleRemoveExclusion = useCallback((index) => {
      dispatch({ type: 'REMOVE_EXCLUSION', payload: { index } });
  }, [dispatch]);

  const handleNotesChange = useCallback((e) => {
      dispatch({ type: 'UPDATE_FIELD', payload: { field: 'notes', value: e.target.value } });
  }, [dispatch]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Exclusions Card */}
      <div className="bg-card-background shadow-sm sm:rounded-lg p-4 sm:p-6 border border-card-border transition-colors duration-300 ease-linear">
        <h3 className="text-lg font-medium leading-6 text-text-primary mb-4">Exclusions</h3>
        <p className="text-sm text-gray-500 mb-4">Items or services explicitly not included in the quote.</p>
        <div className="space-y-3">
          {exclusions.map((exclusion, index) => (
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
                className="text-red-500 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-900/30 mt-1"
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
          className="mt-3 text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300"
        >
          + Add Exclusion
        </Button>
      </div>

      {/* Notes Card */}
      <div className="bg-card-background shadow-sm sm:rounded-lg p-4 sm:p-6 border border-card-border transition-colors duration-300 ease-linear">
        <h3 className="text-lg font-medium leading-6 text-text-primary mb-4">Internal Notes</h3>
         <FormField
           label="Notes"
           id="notes"
           type="textarea"
           rows={8}
           value={notes}
           onChange={handleNotesChange}
           helpText="Internal notes for your reference, not shown to the client."
           placeholder="Add any internal notes about this quote..."
           labelSrOnly
         />
      </div>
    </div>
  );
});

// --- Main QuoteBuilder Component ---
const QuoteBuilder = () => {
  const { id: quoteIdFromUrl } = useParams();
  const navigate = useNavigate();
  const { addNotification, settings } = useAppContext();
  const queryClient = useQueryClient();

  // Initialize state with defaults from settings
  const [state, dispatch] = useReducer(quoteReducer, {
      ...initialState,
      paymentTerms: settings?.quote?.defaultPaymentTerms || '1',
      exclusions: settings?.quote?.defaultExclusions || initialState.exclusions,
      globalMarkup: settings?.quote?.defaultMarkup ?? initialState.globalMarkup,
      distributionMethod: settings?.quote?.defaultDistribution || initialState.distributionMethod,
      id: quoteIdFromUrl || null,
  });

  const [activeTab, setActiveTab] = useState('details');
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false); // Keep for PDF button state

  // Dialog States
  const [dialogs, setDialogs] = useState({
      itemSelector: false,
      hiddenCost: false,
      contactSelector: false,
      customItemForm: false,
      emailOptions: false,
      missingCompanyInfo: false,
  });

  // Data for Dialogs
  const [newHiddenCost, setNewHiddenCost] = useState({ name: '', amount: '' });
  const [customItem, setCustomItem] = useState({ name: '', cost: '', quantity: 1, category: '', description: '', markup: undefined }); // Use undefined for markup to default to global
  const [contactSearchTerm, setContactSearchTerm] = useState('');
  // bypassCompanyInfoCheck state is removed, handled directly in dialog interaction
  const [saveAsContact, setSaveAsContact] = useState(false); // State for the checkbox

  // --- Data Fetching ---
  // Fetch quote if we have an ID
  const { isLoading: isLoadingQuote, refetch: refetchQuote } = useQuery(
    ['quote', quoteIdFromUrl],
    () => api.quotes.getById(quoteIdFromUrl),
    {
      enabled: !!quoteIdFromUrl,
      retry: 1,
      refetchOnMount: true,
      staleTime: 0,
      onSuccess: (data) => {
        try {
          console.log("API returned quote data:", data);
          const transformedData = transformFetchedQuoteData(data, settings?.quote || {});
          if (transformedData) {
             dispatch({ type: 'INITIALIZE_QUOTE', payload: transformedData });
             console.log("Quote data successfully processed and dispatched");
          } else {
             addNotification("Error processing quote: transformed data is invalid", "error");
          }
        } catch (error) {
          console.error("Error processing quote data:", error);
          addNotification(`Error processing quote data: ${error.message}`, 'error');
        }
      },
      onError: (error) => {
        console.error("Error loading quote:", error);
        addNotification(`Error loading quote: ${error.message}`, 'error');
        // Consider navigating away or showing a more permanent error state
        // navigate('/quotes');
      }
    }
  );

  // Fetch catalog items
  const { data: catalogItems = [], isLoading: isLoadingCatalog } = useQuery(
    'catalog',
    api.catalog.getAll,
    { onError: (err) => addNotification(`Error loading catalog: ${err.message}`, 'error') }
  );

  // Fetch suppliers
  const { data: suppliers = [], isLoading: isLoadingSuppliers } = useQuery(
    'suppliers',
    api.suppliers.getAll,
    { onError: (err) => addNotification(`Error loading suppliers: ${err.message}`, 'error') }
  );

  // --- Memoized Calculations ---
  const quoteData = useMemo(() => calculateQuoteData(
    state.selectedItems,
    state.hiddenCosts,
    state.globalMarkup,
    state.distributionMethod,
    settings?.vat?.enabled,
    settings?.vat?.rate
  ), [state.selectedItems, state.hiddenCosts, state.globalMarkup, state.distributionMethod, settings?.vat]);

  // --- Dialog Management ---
  const showDialog = useCallback((dialogName, show = true) => {
      setDialogs(prev => ({ ...prev, [dialogName]: show }));
  }, []);

  // --- Event Handlers ---
  const handleSelectContact = useCallback((contact) => {
      dispatch({
          type: 'SET_CLIENT',
          payload: {
              name: `${contact.firstName || ''} ${contact.lastName || ''}`.trim(),
              company: contact.company || '',
              email: contact.email || '',
              phone: contact.phone || '',
              address: contact.address || '',
          }
      });
      showDialog('contactSelector', false);
      setContactSearchTerm('');
  }, [showDialog, dispatch]);

  const handleAddItemFromCatalog = useCallback((itemsToAdd) => {
       if (Array.isArray(itemsToAdd) && itemsToAdd.length > 0) {
           dispatch({ type: 'ADD_ITEMS', payload: { items: itemsToAdd } });
           addNotification(`Added ${itemsToAdd.length} item(s)`, 'success');
       } else if (itemsToAdd && typeof itemsToAdd === 'object' && itemsToAdd.id) {
            // Handle single item selection case if necessary
            dispatch({ type: 'ADD_ITEM', payload: { item: { ...itemsToAdd, quantity: 1, markup: state.globalMarkup, hideInQuote: false, id: itemsToAdd.id || generateId() } } });
            addNotification(`Added 1 item`, 'success');
       }
       showDialog('itemSelector', false);
   }, [dispatch, addNotification, showDialog, state.globalMarkup]);


  const handleAddCustomItem = useCallback(() => {
      if (!customItem.name.trim()) {
          addNotification('Item name is required', 'error');
          return;
      }
      const newItem = {
          ...customItem,
          id: generateId(),
          cost: parseFloat(customItem.cost) || 0,
          quantity: parseFloat(customItem.quantity) || 1,
          markup: customItem.markup ?? state.globalMarkup, // Use explicit markup or global
          supplier: 'custom',
          hideInQuote: false
      };
      dispatch({ type: 'ADD_ITEM', payload: { item: newItem } });
      addNotification(`Added custom item: ${newItem.name}`, 'success');
      setCustomItem({ name: '', cost: '', quantity: 1, category: '', description: '', markup: undefined }); // Reset form
      showDialog('customItemForm', false);
  }, [customItem, state.globalMarkup, dispatch, addNotification, showDialog]);

  const handleAddHiddenCost = useCallback(() => {
      if (!newHiddenCost.name.trim()) {
          addNotification('Name is required for hidden cost', 'error');
          return;
      }
      dispatch({
          type: 'ADD_HIDDEN_COST',
          payload: {
              cost: {
                  id: generateId(),
                  name: newHiddenCost.name,
                  amount: parseFloat(newHiddenCost.amount) || 0
              }
          }
      });
      setNewHiddenCost({ name: '', amount: '' }); // Reset form
      showDialog('hiddenCost', false);
  }, [newHiddenCost, dispatch, addNotification, showDialog]);

  // --- Save Logic ---
  const sanitizeDataForSave = useCallback(() => {
    const sanitizedItems = Array.isArray(state.selectedItems) ? state.selectedItems.map(item => ({
        ...item,
        id: item.id || generateId(),
        quantity: parseFloat(item.quantity) || 1, // Ensure quantity is a number
        markup: item.markup === '' || item.markup === undefined || item.markup === null ? state.globalMarkup : parseInt(item.markup) || 0, // Use global if empty/undefined, parse if exists
        hideInQuote: !!item.hideInQuote
    })) : [];

    const sanitizedCosts = Array.isArray(state.hiddenCosts) ? state.hiddenCosts.map(cost => ({
        ...cost,
        id: cost.id || generateId(),
        amount: parseFloat(cost.amount) || 0
    })) : [];

    // Use current state ID if available, otherwise generate one for new quotes
    const quoteId = state.id || generateId();

    return {
        ...state,
        id: quoteId,
        client: { // Ensure client data defaults if empty
            name: state.client.name || '',
            company: state.client.company || '',
            email: state.client.email || '',
            phone: state.client.phone || '',
            address: state.client.address || ''
        },
        selectedItems: sanitizedItems,
        hiddenCosts: sanitizedCosts,
        savedAt: new Date().toISOString(),
        // Add flat clientName/Company for list display compatibility
        clientName: state.client.name || '',
        clientCompany: state.client.company || ''
    };
  }, [state]);

  const saveClientAsContactIfNeeded = useCallback(async (quoteToSave) => {
      if (saveAsContact && quoteToSave.client.name) {
          try {
              console.log("Saving client as contact...");
              const nameParts = quoteToSave.client.name.split(' ');
              const contactData = {
                  id: generateId(),
                  customerType: quoteToSave.client.company ? 'business' : 'individual',
                  firstName: nameParts[0] || '',
                  lastName: nameParts.slice(1).join(' ') || '',
                  company: quoteToSave.client.company || '',
                  email: quoteToSave.client.email || '',
                  phone: quoteToSave.client.phone || '',
                  address: quoteToSave.client.address || '',
                  notes: `Added from Quote ${quoteToSave.id} on ${new Date().toLocaleDateString()}`,
                  createdAt: new Date().toISOString()
              };
              await api.contacts.save(contactData);
              addNotification(`Saved ${contactData.firstName} ${contactData.lastName} as a contact`, 'success');
              queryClient.invalidateQueries('contacts');
              setSaveAsContact(false); // Reset checkbox after successful save
          } catch (contactError) {
              console.error("Error saving contact:", contactError);
              addNotification(`Error saving contact: ${contactError.message}`, 'error');
              // Decide if quote save should continue or stop
              throw contactError; // Re-throw to potentially stop quote save
          }
      }
  }, [saveAsContact, addNotification, queryClient]);

  const handleSaveQuote = useCallback(async () => {
      setIsSaving(true);
      addNotification('Saving quote...', 'info');
      const quoteToSave = sanitizeDataForSave();
      console.log("Saving quote data:", quoteToSave);

      try {
          await saveClientAsContactIfNeeded(quoteToSave); // Attempt to save contact first
          const savedQuote = await api.quotes.save(quoteToSave); // Save the quote
          console.log("Quote saved successfully:", savedQuote);

          addNotification(
              `Quote for ${quoteToSave.clientName || 'client'} saved successfully ✓`,
              'success',
              5000
          );

          // Navigate to the saved quote's page if it was a new quote
          if (!quoteIdFromUrl) {
              navigate(`/quotes/${quoteToSave.id}`, { replace: true }); // Use replace to avoid back button going to /new
          } else {
              refetchQuote(); // Refetch data for the existing quote
          }
      } catch (error) {
          console.error("Error during save process:", error);
          // Notification for contact or quote save error would have been shown already
          if (! (error.message.includes("saving contact"))) { // Avoid duplicate notification if contact save failed
             addNotification(`Error saving quote: ${error.message}`, 'error');
          }
      } finally {
          setIsSaving(false);
      }
  }, [state, sanitizeDataForSave, saveClientAsContactIfNeeded, addNotification, quoteIdFromUrl, navigate, refetchQuote]);


  // --- PDF Export Logic ---
   const exportPDF = useCallback(async (bypassCompanyCheck = false) => {
      if (!bypassCompanyCheck && (!settings?.company?.name || !settings?.company?.address)) {
          showDialog('missingCompanyInfo', true);
          return;
      }

      if (activeTab !== 'preview') {
          setActiveTab('preview');
          // Wait briefly for preview tab to render
          await new Promise(resolve => setTimeout(resolve, 300));
      }

      const quotePreviewElement = document.querySelector('.quote-preview');
      if (!quotePreviewElement) {
          addNotification('Quote preview element not found for PDF export.', 'error');
          return;
      }

      setIsGeneratingPdf(true);
      addNotification('Generating PDF...', 'info');
      quotePreviewElement.classList.add('pdf-export-mode', 'pdf-a4-format');

      const options = {
          filename: `Quote_${state.client.name || 'Untitled'}_${formatDateForInput(state.date)}.pdf`,
          margin: [10, 10, 10, 10],
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, logging: false }, // Disable logging unless debugging
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      try {
          await html2pdf().from(quotePreviewElement).set(options).save();
          addNotification('PDF exported successfully!', 'success');
      } catch (error) {
          console.error('PDF generation error:', error);
          addNotification(`Error generating PDF: ${error.message}`, 'error');
      } finally {
          quotePreviewElement.classList.remove('pdf-export-mode', 'pdf-a4-format');
          setIsGeneratingPdf(false);
          // Close the company info dialog if it was open and export was triggered from there
          showDialog('missingCompanyInfo', false);
      }
   }, [activeTab, settings?.company, state.client.name, state.date, addNotification, showDialog]);


  // --- Email Logic ---
  const handleEmailQuote = useCallback(() => {
      if (!settings?.company?.name || !settings?.company?.address) {
          showDialog('missingCompanyInfo', true); // Show warning if company info missing
      } else {
          showDialog('emailOptions', true); // Show email options if info is present
      }
  }, [settings?.company, showDialog]);

  const handleOpenEmailClient = useCallback(() => {
      try {
          const subject = encodeURIComponent(`Quotation for ${state.client.company || state.client.name}`);
          const body = encodeURIComponent(`Dear ${state.client.name},

Please find attached our quotation as discussed.

If you have any questions, please do not hesitate to contact us.

Kind regards,
${settings?.company?.name || 'Your Company'}`);
          const mailtoLink = `mailto:${state.client.email || ''}?subject=${subject}&body=${body}`;
          window.location.href = mailtoLink;
          showDialog('emailOptions', false);
          addNotification('Email client opened', 'success');
      } catch (error) {
          console.error('Error opening email client:', error);
          addNotification(`Error opening email client: ${error.message}`, 'error');
      }
  }, [state.client, settings?.company?.name, showDialog, addNotification]);

  const handleExportAndOpenEmail = useCallback(async () => {
       // Company info checked by handleEmailQuote before showing the dialog
      try {
          await exportPDF(); // Generate PDF first (uses safe export logic internally)
          handleOpenEmailClient(); // Then open email
      } catch (error) {
          // Error notification handled within exportPDF or handleOpenEmailClient
          console.error('Error in export and email:', error);
      } finally {
          showDialog('emailOptions', false);
      }
  }, [exportPDF, handleOpenEmailClient, showDialog]);

  // --- Invoice Generation Logic ---
   const handleGenerateInvoice = useCallback(async () => {
       if (!state.id) {
           addNotification('Please save the quote before generating an invoice.', 'warning');
           // Optionally trigger save: await handleSaveQuote(); if(!state.id) return; // Re-check ID after save attempt
           return;
       }

       try {
           // Ensure the latest version is saved before navigating
           // Optional: Could add a check here if there are unsaved changes
           addNotification('Preparing invoice...', 'info');
           // await handleSaveQuote(); // Can uncomment if strict save-before-invoice is needed

           const { paymentTerms } = state;
           const { grandTotal, vatEnabled, vatRate, vatAmount } = quoteData; // Get calculated totals

           let amounts = [grandTotal];
           let types = ['Full Amount']; // Default

           // Determine invoice stages based on payment terms
           if (paymentTerms === '5') { // 50% Deposit, 50% Completion (Example mapping)
               amounts = [grandTotal * 0.5, grandTotal * 0.5];
               types = ['Deposit (50%)', 'Final Payment (50%)'];
           } else if (paymentTerms === 'custom') {
               types = ['Custom Terms'];
           }
           // Add more conditions for other payment terms (1, 2, 3, 4) if needed

           // Navigate to invoice builder with details for the *first* invoice stage
           const params = new URLSearchParams({
               quoteId: state.id,
               amount: amounts[0].toFixed(2),
               type: types[0],
               total: grandTotal.toFixed(2),
               vatEnabled: String(vatEnabled),
               vatRate: String(vatRate),
               vatAmount: vatAmount.toFixed(2)
           });
           navigate(`/invoices/new?${params.toString()}`);

       } catch (error) {
           console.error('Error preparing invoice navigation:', error);
           addNotification(`Error preparing invoice: ${error.message}`, 'error');
       }
   }, [state.id, state.paymentTerms, quoteData, navigate, addNotification /*, handleSaveQuote*/]);


  // --- Render Logic ---
  if (isLoadingQuote || isLoadingCatalog || isLoadingSuppliers) {
    return <Loading message="Loading quote builder..." />;
  }

  return (
    <PageLayout title={quoteIdFromUrl ? 'Edit Quote' : 'Create Quote'} subtitle={quoteIdFromUrl ? `Ref: ${state.id}` : 'Create a new quote'}>
      {/* Tabs */}
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
          variant="underline"
        />
      </div>

      {/* Tab Panels */}
      <TabPanel id="details" activeTab={activeTab}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <ClientDetailsForm
              client={state.client}
              dispatch={dispatch}
              onShowContactSelector={() => showDialog('contactSelector')}
              saveAsContact={saveAsContact}
              onSaveAsContactChange={setSaveAsContact}
          />
          <QuoteMetaDetailsForm details={state} dispatch={dispatch} />
        </div>
      </TabPanel>

      <TabPanel id="items" activeTab={activeTab}>
         <div className="space-y-6">
             <CostingSettings
                 globalMarkup={state.globalMarkup}
                 distributionMethod={state.distributionMethod}
                 dispatch={dispatch}
             />
             {/* Selected Items Card */}
             <div className="bg-card-background shadow-sm sm:rounded-lg border border-card-border transition-colors duration-300 ease-linear">
                  <div className="px-4 sm:px-6 py-4 border-b border-card-border flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2 dark:border-gray-700">
                      <h3 className="text-lg font-medium leading-6 text-text-primary mb-2 sm:mb-0">Selected Items</h3>
                      {/* Ensure buttons are always in a row */}
                      <div className="flex flex-row gap-2">
                          <Button variant="outline" size="sm" onClick={() => showDialog('itemSelector')} className="dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white">
                              Add Catalog Item
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => showDialog('customItemForm')} className="dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white">
                              Add Custom Item
                          </Button>
                      </div>
                  </div>
                  <div className="p-4 sm:p-6">
                      <SelectedItemsList items={state.selectedItems} dispatch={dispatch} />
                  </div>
              </div>
              <HiddenCostsList
                  costs={state.hiddenCosts}
                  dispatch={dispatch}
                  onShowAddDialog={() => showDialog('hiddenCost')}
              />
              <TotalsDisplay quoteData={quoteData} />
         </div>
      </TabPanel>

      <TabPanel id="exclusions" activeTab={activeTab}>
          <ExclusionsNotesSection
              exclusions={state.exclusions}
              notes={state.notes}
              dispatch={dispatch}
          />
      </TabPanel>

      <TabPanel id="preview" activeTab={activeTab}>
           <QuotePreview
               // Pass necessary props derived from state and calculations
               quoteDetails={{
                   ...state, // Pass all details managed by reducer
                   clientName: state.client.name, // Ensure flat names are passed if needed by preview
                   clientCompany: state.client.company,
               }}
               selectedItems={state.selectedItems} // Already sanitized? Check calculateQuoteData input needs
               hiddenCosts={state.hiddenCosts}
               globalMarkup={state.globalMarkup}
               distributionMethod={state.distributionMethod}
               quoteData={quoteData} // Pass calculated data
               settings={settings}
               formatCurrency={formatCurrency} // Pass helper
             />
      </TabPanel>

      {/* --- Action Buttons --- */}
      <ActionButtonContainer>
          <Button
              variant="secondary"
              onClick={() => navigate('/quotes')}
              className="dark:bg-gray-600 dark:hover:bg-gray-500 dark:border-gray-600 dark:text-gray-100"
          >
              Cancel
          </Button>
          <Button
              variant="primary"
              onClick={handleSaveQuote}
              isLoading={isSaving}
              disabled={isSaving || isGeneratingPdf} // Disable save if saving or generating PDF
              className="dark:bg-indigo-500 dark:hover:bg-indigo-400 dark:text-white"
          >
              {quoteIdFromUrl ? 'Update Quote' : 'Save Quote'}
          </Button>
          {/* Actions available only when editing an existing quote */}
          {quoteIdFromUrl && (
            <>
              <Button
                variant="outline"
                onClick={() => exportPDF()} // Use the main export function
                isLoading={isGeneratingPdf}
                disabled={isGeneratingPdf || isSaving}
                icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>}
                className="dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white"
              >
                Export PDF
              </Button>
              <Button
                variant="outline"
                onClick={handleEmailQuote}
                disabled={isGeneratingPdf || isSaving}
                icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>}
                className="dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white"
               >
                 Email Quote
               </Button>
               <Button
                  variant="outline"
                  onClick={handleGenerateInvoice}
                  disabled={isSaving || isGeneratingPdf} // Disable if saving or generating PDF
                  className="dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white"
               >
                  Generate Invoice
               </Button>
            </>
          )}
      </ActionButtonContainer>

      {/* --- Dialogs --- */}
       <Dialog isOpen={dialogs.contactSelector} onClose={() => showDialog('contactSelector', false)} title="Select Contact">
          <FormField
              label="Search Contacts"
              id="contactSearch"
              value={contactSearchTerm}
              onChange={(e) => setContactSearchTerm(e.target.value)}
              placeholder="Search by name, company, email..."
              className="mb-4"
              labelSrOnly
          />
          <ContactSelector searchTerm={contactSearchTerm} onContactSelect={handleSelectContact} />
       </Dialog>

       <Dialog isOpen={dialogs.itemSelector} onClose={() => showDialog('itemSelector', false)} title="Add Item from Catalog" size="3xl">
           <p className="text-sm text-gray-600 mb-4">Select items from your catalog to add to the quote.</p>
           <ItemSelector
               onSelectItem={handleAddItemFromCatalog}
               currentItems={state.selectedItems} // Pass current items
               items={catalogItems} // Pass fetched catalog items
               suppliers={suppliers} // Pass fetched suppliers
               // Pass multiSelect prop if ItemSelector supports it
               // multiSelect={true}
           />
       </Dialog>

       <Dialog isOpen={dialogs.customItemForm} onClose={() => showDialog('customItemForm', false)} title="Add Custom Item">
            <form onSubmit={(e) => { e.preventDefault(); handleAddCustomItem(); }} className="space-y-4 p-1">
                <FormField
                    label="Item Name" id="customItemName" required
                    value={customItem.name} onChange={(e) => setCustomItem(prev => ({ ...prev, name: e.target.value }))}
                />
                <FormField
                    label="Category (Optional)" id="customItemCategory"
                    value={customItem.category} onChange={(e) => setCustomItem(prev => ({ ...prev, category: e.target.value }))}
                />
                <FormField
                    label="Description (Optional)" id="customItemDesc" type="textarea" rows={3}
                    value={customItem.description} onChange={(e) => setCustomItem(prev => ({ ...prev, description: e.target.value }))}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                        label="Cost Price" id="customItemCost" type="number" prefix="£" step="0.01" min={0} required
                        value={customItem.cost} onChange={(e) => setCustomItem(prev => ({ ...prev, cost: e.target.value }))}
                    />
                    <FormField
                        label="Quantity" id="customItemQuantity" type="number" step="any" min={1} required // Min 1 quantity usually makes sense
                        value={customItem.quantity} onChange={(e) => setCustomItem(prev => ({ ...prev, quantity: e.target.value }))}
                    />
                </div>
                <FormField
                    label="Markup % (Optional)" id="customItemMarkup" type="number" suffix="%" min={0}
                    value={customItem.markup} onChange={(e) => setCustomItem(prev => ({ ...prev, markup: e.target.value }))}
                    helpText="Leave blank or 0 to use global markup."
                />
                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <Button variant="secondary" onClick={() => showDialog('customItemForm', false)} type="button">Cancel</Button>
                    <Button variant="primary" type="submit">Add Item</Button>
                </div>
            </form>
       </Dialog>

       <Dialog isOpen={dialogs.hiddenCost} onClose={() => showDialog('hiddenCost', false)} title="Add Hidden Cost">
            <form onSubmit={(e) => { e.preventDefault(); handleAddHiddenCost(); }} className="space-y-4 p-1">
                <FormField
                    label="Cost Name" id="newHiddenCostName" required
                    value={newHiddenCost.name} onChange={(e) => setNewHiddenCost(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Labour, Site Visit"
                />
                <FormField
                    label="Amount" id="newHiddenCostAmount" type="number" prefix="£" step="0.01" min={0} required
                    value={newHiddenCost.amount} onChange={(e) => setNewHiddenCost(prev => ({ ...prev, amount: e.target.value }))}
                />
                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <Button variant="secondary" onClick={() => showDialog('hiddenCost', false)} type="button">Cancel</Button>
                    <Button variant="primary" type="submit">Add Cost</Button>
                </div>
            </form>
       </Dialog>

       <Dialog isOpen={dialogs.emailOptions} onClose={() => showDialog('emailOptions', false)} title="Email Quote">
            <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">How would you like to proceed?</p>
            <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <Button variant="secondary" onClick={() => showDialog('emailOptions', false)}>Cancel</Button>
                <Button variant="outline" onClick={handleExportAndOpenEmail} disabled={isGeneratingPdf}>
                    {isGeneratingPdf ? 'Generating...' : 'Export PDF & Email'}
                </Button>
                <Button variant="primary" onClick={handleOpenEmailClient}>Open Email Client</Button>
            </div>
       </Dialog>

       <Dialog isOpen={dialogs.missingCompanyInfo} onClose={() => showDialog('missingCompanyInfo', false)} title="Missing Company Information">
            <p className="mb-6 text-sm text-gray-600 dark:text-gray-400">
                Alternatively, you can export the PDF without the company header information for now.
            </p>
            <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <Button variant="secondary" onClick={() => showDialog('missingCompanyInfo', false)}>Cancel Export</Button>
                <Button variant="outline" onClick={() => exportPDF(true)} disabled={isGeneratingPdf}>
                    {isGeneratingPdf ? 'Generating...' : 'Export Anyway'}
                </Button>
                <Button variant="primary" onClick={() => { showDialog('missingCompanyInfo', false); navigate('/settings/company'); }}>Go to Settings</Button>
            </div>
       </Dialog>

    </PageLayout>
  );
}

export default QuoteBuilder;