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
      timber: 'bg-amber-100 text-amber-800',
      hardware: 'bg-blue-100 text-blue-800',
      fixtures: 'bg-purple-100 text-purple-800',
      glass: 'bg-emerald-100 text-emerald-800',
      labour: 'bg-red-100 text-red-800',
      other: 'bg-gray-100 text-gray-800'
    };
    
    const color = badgeColors[category] || badgeColors.other;
    const label = categories.find(c => c.id === category)?.label || 'Other';
    
    return (
      <span className={`text-xs px-2 py-1 rounded-full ${color}`}>
        {label}
      </span>
    );
  };
  
  return (
    <div className="space-y-4">
      {/* Search */}
      <FormField
        type="text"
        placeholder="Search items..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
      
      {/* Category filters */}
      <div className="space-y-2">
        <div className="text-sm font-medium text-gray-700">Categories</div>
        <div className="flex flex-wrap gap-2">
          {categories.map(category => (
            <button
              key={category.id}
              className={`
                px-3 py-1 rounded-md text-sm font-medium transition-colors
                ${activeCategories.includes(category.id)
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}
              `}
              onClick={() => toggleCategory(category.id)}
            >
              {category.label}
            </button>
          ))}
        </div>
      </div>
      
      {/* Supplier filters */}
      {suppliers.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-medium text-gray-700">Suppliers</div>
          <div className="flex flex-wrap gap-2">
            {suppliers.map(supplier => (
              <button
                key={supplier.id}
                className={`
                  px-3 py-1 rounded-md text-sm font-medium transition-colors
                  ${activeSuppliers.includes(supplier.id)
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}
                `}
                onClick={() => toggleSupplier(supplier.id)}
              >
                {supplier.name}
              </button>
            ))}
          </div>
        </div>
      )}
      
      {/* Filter actions */}
      <div className="flex justify-between">
        <div className="text-sm text-gray-500">
          {filteredItems.length} item{filteredItems.length !== 1 ? 's' : ''} found
        </div>
        {(activeCategories.length > 0 || activeSuppliers.length > 0 || searchTerm) && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={clearFilters}
          >
            Clear filters
          </Button>
        )}
      </div>
      
      {/* Item list */}
      <div className="space-y-2 overflow-y-auto" style={{ maxHeight: '400px' }}>
        {filteredItems.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No items match your filters</p>
            <Button 
              variant="primary" 
              size="sm" 
              className="mt-2"
              onClick={clearFilters}
            >
              Clear filters
            </Button>
          </div>
        ) : (
          filteredItems.map(item => (
            <div 
              key={item.id}
              className="p-4 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer"
              onClick={() => onSelectItem(item)}
            >
              <div className="flex justify-between">
                <h3 className="font-medium text-gray-900">{item.name}</h3>
                <span className="font-bold text-gray-900">£{item.cost.toFixed(2)}</span>
              </div>
              
              <p className="text-sm text-gray-500 mt-1">{item.description}</p>
              
              <div className="flex flex-wrap items-center gap-2 mt-2">
                {renderCategoryBadge(item.category)}
                
                <span className="text-xs px-2 py-1 rounded-full bg-indigo-50 text-indigo-700">
                  {getSupplierName(item.supplier)}
                </span>
                
                {item.leadTime > 0 && (
                  <span className="text-xs text-gray-500">
                    Lead time: {item.leadTime} days
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
      
      {/* Add New Item button */}
      <div className="text-center mt-4">
        <Button 
          variant="secondary"
          onClick={() => {
            // This would typically open a dialog to add a new item
            // For now, we'll just pass a message through to the parent
            onSelectItem({ isAddNew: true });
          }}
        >
          Add New Item
        </Button>
      </div>
    </div>
  );
};

export default ItemSelector;