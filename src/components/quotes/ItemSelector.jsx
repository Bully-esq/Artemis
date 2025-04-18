import React, { useState, useEffect } from 'react';
import FormField from '../common/FormField';
import Button from '../common/Button';

/**
 * ItemSelector component for browsing and selecting catalog items
 * 
 * @param {Object} props
 * @param {Array} props.items - List of all catalog items
 * @param {Array} props.suppliers - List of all suppliers
 * @param {Function} props.onSelectItem - Callback when an item is selected
 * @param {Array} props.selectedItems - Currently selected items (optional)
 */
const ItemSelector = ({ 
  items = [], 
  suppliers = [], 
  onSelectItem,
  selectedItems = []
}) => {
  // State for filters
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategories, setActiveCategories] = useState([]);
  const [activeSuppliers, setActiveSuppliers] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  // State for tracking items selected within this dialog instance
  const [pendingSelection, setPendingSelection] = useState([]);
  
  // Category definitions
  const categories = [
    { id: 'timber', label: 'Timber' },
    { id: 'hardware', label: 'Hardware' },
    { id: 'fixtures', label: 'Fixtures' },
    { id: 'glass', label: 'Glass' },
    { id: 'labour', label: 'Labour' },
    { id: 'other', label: 'Other' }
  ];
  
  // Filter items when filters change
  useEffect(() => {
    let result = [...items];
    
    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(item => 
        (item.name && item.name.toLowerCase().includes(term)) || 
        (item.description && item.description.toLowerCase().includes(term))
      );
    }
    
    // Apply category filter
    if (activeCategories.length > 0) {
      result = result.filter(item => activeCategories.includes(item.category));
    }
    
    // Apply supplier filter
    if (activeSuppliers.length > 0) {
      result = result.filter(item => activeSuppliers.includes(item.supplier));
    }
    
    // Hide hidden items
    result = result.filter(item => !item.hidden);
    
    setFilteredItems(result);
  }, [items, searchTerm, activeCategories, activeSuppliers]);
  
  // Toggle category filter
  const toggleCategory = (categoryId) => {
    if (activeCategories.includes(categoryId)) {
      setActiveCategories(activeCategories.filter(id => id !== categoryId));
    } else {
      setActiveCategories([...activeCategories, categoryId]);
    }
  };
  
  // Toggle supplier filter
  const toggleSupplier = (supplierId) => {
    if (activeSuppliers.includes(supplierId)) {
      setActiveSuppliers(activeSuppliers.filter(id => id !== supplierId));
    } else {
      setActiveSuppliers([...activeSuppliers, supplierId]);
    }
  };
  
  // Clear all filters
  const clearFilters = () => {
    setSearchTerm('');
    setActiveCategories([]);
    setActiveSuppliers([]);
  };
  
  // Find supplier name by ID
  const getSupplierName = (supplierId) => {
    const supplier = suppliers.find(s => s.id === supplierId);
    return supplier ? supplier.name : 'Unknown Supplier';
  };
  
  // Render supplier badge with appropriate color
  const renderCategoryBadge = (category) => {
    const badgeColors = {
      timber: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300',
      hardware: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
      fixtures: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300',
      glass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300',
      labour: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
      other: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    };
    
    const color = badgeColors[category] || badgeColors.other;
    const label = categories.find(c => c.id === category)?.label || 'Other';
    
    return (
      <span className={`text-xs px-2 py-1 rounded-full ${color}`}>
        {label}
      </span>
    );
  };
  
  // === NEW: Toggle selection for a single item ===
  const handleToggleItemSelection = (itemId) => {
    setPendingSelection(prev => 
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId) // Remove if already selected
        : [...prev, itemId] // Add if not selected
    );
  };
  
  // === NEW: Handle adding all selected items ===
  const handleAddSelectedItems = () => {
    // Find the full item objects based on the selected IDs
    const itemsToAdd = items.filter(item => pendingSelection.includes(item.id));
    
    if (itemsToAdd.length > 0) {
      onSelectItem(itemsToAdd); // Pass the array of items back
    }
    // Clear selection after adding (or if none selected)
    setPendingSelection([]); 
    // NOTE: Dialog closing is handled by the parent component
  };
  
  // === NEW: Handle category change from dropdown ===
  const handleCategoryChange = (event) => {
    const value = event.target.value;
    setActiveCategories(value === 'all' ? [] : [value]);
  };
  
  // === NEW: Handle supplier change from dropdown ===
  const handleSupplierChange = (event) => {
    const value = event.target.value;
    setActiveSuppliers(value === 'all' ? [] : [value]);
  };
  
  return (
    <div className="space-y-4">
      {/* Search */}
      <FormField
        type="text"
        placeholder="Search items..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        inputClassName="dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
      />
      
      {/* Category filters */}
      <div className="space-y-2">
        <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Categories</div>
        
        {/* Category Dropdown (Always visible) */}
        <FormField 
          type="select"
          id="category-filter-dropdown"
          label="Category Filter"
          labelSrOnly
          value={activeCategories.length === 1 ? activeCategories[0] : 'all'}
          onChange={handleCategoryChange}
          options={[
            { value: 'all', label: 'All Categories' },
            ...categories.map(c => ({ value: c.id, label: c.label }))
          ]}
          className="w-full" // Make dropdown full width
          inputClassName="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        />
      </div>
      
      {/* Supplier filters */}
      {suppliers.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Suppliers</div>
          
          {/* Supplier Dropdown (Always visible) */}
          <FormField 
            type="select"
            id="supplier-filter-dropdown"
            label="Supplier Filter"
            labelSrOnly
            value={activeSuppliers.length === 1 ? activeSuppliers[0] : 'all'}
            onChange={handleSupplierChange}
            options={[
              { value: 'all', label: 'All Suppliers' },
              ...suppliers.map(s => ({ value: s.id, label: s.name }))
            ]}
            className="w-full" // Make dropdown full width
            inputClassName="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
        </div>
      )}
      
      {/* Filter actions */}
      <div className="flex justify-between">
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {filteredItems.length} item{filteredItems.length !== 1 ? 's' : ''} found
        </div>
        {(activeCategories.length > 0 || activeSuppliers.length > 0 || searchTerm) && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={clearFilters}
            className="dark:text-indigo-400 dark:hover:bg-gray-700"
          >
            Clear filters
          </Button>
        )}
      </div>
      
      {/* Item list */}
      <div className="space-y-2 overflow-y-auto" style={{ maxHeight: '400px' }}>
        {filteredItems.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <p>No items match your filters</p>
            <Button 
              variant="primary" 
              size="sm" 
              className="mt-2 dark:bg-indigo-500 dark:hover:bg-indigo-400 dark:text-white"
              onClick={clearFilters}
            >
              Clear filters
            </Button>
          </div>
        ) : (
          filteredItems.map(item => {
            const isSelected = pendingSelection.includes(item.id);
            return (
              <div 
                key={item.id}
                className={`
                  p-4 rounded-lg border transition-all cursor-pointer flex items-center justify-between
                  ${isSelected
                    ? 'bg-blue-50 dark:bg-blue-900/50 border-blue-400 dark:border-blue-600 ring-1 ring-blue-400' // Selected style
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-500 hover:shadow-sm' // Default style
                  }
                `}
                onClick={() => handleToggleItemSelection(item.id)}
              >
                {/* Item Details */}
                <div className="flex-grow mr-4">
                  <div className="flex justify-between items-baseline">
                    <h3 className="font-medium text-gray-900 dark:text-white">{item.name}</h3>
                    <span className="font-bold text-gray-900 dark:text-gray-100 ml-2">£{item.cost.toFixed(2)}</span>
                  </div>
                  
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">{item.description}</p>
                  
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    {renderCategoryBadge(item.category)}
                    <span className="text-xs px-2 py-1 rounded-full bg-indigo-50 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300">
                      {getSupplierName(item.supplier)}
                    </span>
                    {item.leadTime > 0 && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        Lead time: {item.leadTime} days
                      </span>
                    )}
                  </div>
                </div>

                {/* Selection Indicator (Checkbox) */}
                <div className="flex-shrink-0">
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center 
                    ${isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300 dark:border-gray-500'}`}
                  >
                    {isSelected && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
      
      {/* Action Buttons Footer */}
      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
        {/* Add New Item button (optional, maybe move outside dialog?) */}
        <Button 
          variant="secondary"
          className="dark:bg-gray-600 dark:hover:bg-gray-500 dark:border-gray-600 dark:text-gray-100"
          onClick={() => {
            // This would typically open a dialog to add a new item
            // For now, we'll just pass a message through to the parent
            onSelectItem({ isAddNew: true }); // Still sends a single object for this case
          }}
        >
          Add New Item
        </Button>
        
        {/* Add Selected Items Button */}
        <Button 
          variant="primary"
          className="dark:bg-indigo-500 dark:hover:bg-indigo-400 dark:text-white"
          onClick={handleAddSelectedItems}
          disabled={pendingSelection.length === 0} // Disable if nothing is selected
        >
          Add {pendingSelection.length > 0 ? `${pendingSelection.length} Selected` : 'Selected'} Item{pendingSelection.length !== 1 ? 's' : ''}
        </Button>
      </div>
    </div>
  );
};

export default ItemSelector;