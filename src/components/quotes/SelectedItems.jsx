import React, { useState, useRef } from 'react';
import FormField from '../common/FormField';
import Button from '../common/Button';

/**
 * Component to display and manage selected items in a quote
 * 
 * @param {Object} props - Component props
 * @param {Array} props.items - Array of selected items
 * @param {number} props.globalMarkup - Global markup percentage
 * @param {Array} props.suppliers - Array of suppliers for displaying names
 * @param {Object} props.quoteData - Calculated quote data 
 * @param {Function} props.onRemoveItem - Callback when an item is removed
 * @param {Function} props.onUpdateItem - Callback when an item is updated
 * @param {Function} props.onMarkupChange - Callback when global markup changes
 */
const SelectedItems = ({
  items = [],
  globalMarkup = 20,
  suppliers = [],
  quoteData = {},
  onRemoveItem,
  onUpdateItem,
  onMarkupChange
}) => {
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const dragNode = useRef(null);
  
  // If no items, show empty message
  if (items.length === 0) {
    return (
      <div className="p-4 border border-gray-200 rounded-md bg-gray-50 text-center text-gray-500">
        No items selected yet
      </div>
    );
  }
  
  // Get calculated items with totals from quoteData
  const calculatedItems = new Map();
  if (quoteData.itemTotals && Array.isArray(quoteData.itemTotals)) {
    quoteData.itemTotals.forEach(item => {
      calculatedItems.set(item.id, item);
    });
  }
  
  // Helper to get supplier name by ID
  const getSupplierName = (supplierId) => {
    const supplier = suppliers.find(s => s.id === supplierId);
    return supplier ? supplier.name : 'Unknown Supplier';
  };
  
  // Category name mapping
  const categoryLabels = {
    'timber': 'Timber',
    'hardware': 'Hardware',
    'fixtures': 'Fixtures',
    'glass': 'Glass',
    'labour': 'Labour',
    'other': 'Other'
  };
  
  // Drag start handler
  const handleDragStart = (e, index) => {
    setDraggedItem(items[index]);
    dragNode.current = e.currentTarget;
    
    // After a short delay to ensure the drag ghost is created
    setTimeout(() => {
      dragNode.current.classList.add('opacity-50', 'border-dashed', 'border-blue-400');
    }, 0);
    
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index);
  };
  
  // Drag end handler
  const handleDragEnd = () => {
    setDraggedItem(null);
    setDragOverIndex(null);
    
    if (dragNode.current) {
      dragNode.current.classList.remove('opacity-50', 'border-dashed', 'border-blue-400');
      dragNode.current = null;
    }
  };
  
  // Drag over handler
  const handleDragOver = (e, index) => {
    e.preventDefault();
    
    if (draggedItem === null) return;
    
    // Only update UI if we're hovering over a different item
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };
  
  // Drop handler
  const handleDrop = (e, targetIndex) => {
    e.preventDefault();
    
    if (draggedItem === null) return;
    
    // Find the source index
    const sourceIndex = items.findIndex(item => item.id === draggedItem.id);
    
    // Don't do anything if source and target are the same
    if (sourceIndex === targetIndex) {
      handleDragEnd();
      return;
    }
    
    // Create a new array with the items reordered
    const newItems = [...items];
    newItems.splice(sourceIndex, 1);
    newItems.splice(targetIndex, 0, draggedItem);
    
    // Update the items array via callback
    if (onUpdateItem) {
      for (let i = 0; i < newItems.length; i++) {
        onUpdateItem(i, newItems[i]);
      }
    }
    
    // Reset drag state
    handleDragEnd();
  };
  
  return (
    <div className="space-y-4">
      {/* Global markup control */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Global Markup: <span className="font-semibold">{globalMarkup}%</span>
        </label>
        <input
          type="range"
          min="0"
          max="100"
          value={globalMarkup}
          onChange={(e) => onMarkupChange(parseInt(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
        />
      </div>
      
      {/* Selected items list */}
      <div className="space-y-4">
        {items.map((item, index) => {
          // Get calculated data for this item
          const calculatedItem = calculatedItems.get(item.id);
          const baseCost = (item.cost || 0) * (item.quantity || 1);
          
          let hiddenCostShare = 0;
          let costWithHidden = baseCost;
          let markupAmount = 0;
          let finalTotal = baseCost;
          
          if (calculatedItem && !item.hideInQuote) {
            hiddenCostShare = calculatedItem.hiddenCostShare || 0;
            costWithHidden = calculatedItem.costWithHidden || baseCost;
            markupAmount = calculatedItem.markupAmount || 0;
            finalTotal = calculatedItem.finalTotal || baseCost;
          }
          
          return (
            <div
              key={item.id}
              className={`relative border rounded-md p-4 bg-white ${
                item.hideInQuote 
                  ? 'border-dashed border-gray-300 bg-gray-50' 
                  : 'border-gray-200'
              }`}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={(e) => handleDrop(e, index)}
              data-index={index}
            >
              {/* Drag handle */}
              <div className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 cursor-move">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 3a1 1 0 01.707.293l3 3a1 1 0 01-1.414 1.414L10 5.414 7.707 7.707a1 1 0 01-1.414-1.414l3-3A1 1 0 0110 3zm-3.707 9.293a1 1 0 011.414 0L10 14.586l2.293-2.293a1 1 0 011.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
              
              <div className="pl-5">
                {/* Item header with name and remove button */}
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-lg font-medium">{item.name}</h4>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => onRemoveItem(index)}
                    className="!p-1 !rounded-full"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </Button>
                </div>
                
                {/* Item description */}
                <p className="text-sm text-gray-600 mb-2">
                  {item.description || ''}
                </p>
                
                {/* Item metadata */}
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                    {getSupplierName(item.supplier)}
                  </span>
                  
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                    {categoryLabels[item.category] || 'Other'}
                  </span>
                  
                  <label className="ml-auto inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="form-checkbox h-4 w-4 text-blue-600 transition duration-150 ease-in-out"
                      checked={item.hideInQuote}
                      onChange={(e) => onUpdateItem(index, { ...item, hideInQuote: e.target.checked })}
                    />
                    <span className="ml-2 text-sm text-gray-600">Hide in quote</span>
                  </label>
                </div>
                
                {/* Controls for quantity and markup */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 mt-3">
                  <div className="sm:col-span-3">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Quantity</label>
                    <input
                      type="number"
                      min="0.1"
                      step="0.1"
                      value={item.quantity}
                      onChange={(e) => onUpdateItem(index, { ...item, quantity: parseFloat(e.target.value) || 0.1 })}
                      className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div className="sm:col-span-3">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Unit Cost</label>
                    <div className="p-2 bg-gray-100 border border-gray-300 rounded-md text-gray-700">
                      £{(item.cost || 0).toFixed(2)}
                    </div>
                  </div>
                  
                  <div className="sm:col-span-3">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Markup %</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={item.markup}
                      onChange={(e) => onUpdateItem(index, { ...item, markup: parseInt(e.target.value) || 0 })}
                      className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div className="sm:col-span-3">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Total</label>
                    <div className="p-2 bg-gray-100 border border-gray-300 rounded-md text-gray-700 font-medium">
                      {item.hideInQuote ? 
                        'Hidden from quote' : 
                        `£${finalTotal.toFixed(2)}`}
                    </div>
                  </div>
                </div>
                
                {/* Breakdown tooltip when not hidden */}
                {!item.hideInQuote && (
                  <div className="mt-2 text-xs text-gray-500">
                    Breakdown: Base (£{baseCost.toFixed(2)}) + 
                    Hidden (£{hiddenCostShare.toFixed(2)}) + 
                    Markup {item.markup}% (£{markupAmount.toFixed(2)})
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SelectedItems;