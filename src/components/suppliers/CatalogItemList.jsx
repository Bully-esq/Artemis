import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useAppContext } from '../../context/AppContext';
import api from '../../services/api';
import Button from '../common/Button';
import FormField from '../common/FormField';
import Loading from '../common/Loading';
import Dialog from '../common/Dialog';

/**
 * Clean trailing zeros from item names
 * @param {string} name The item name to clean
 * @returns {string} Clean name without trailing zeros
 */
const cleanItemName = (name) => {
  if (!name) return '';
  // Trim whitespace and then remove trailing zeros
  return String(name).trim().replace(/0+$/, '');
};

/**
 * Catalog Item List component
 * Displays the catalog items with filtering and management options
 */
const CatalogItemList = ({ onAddItem, onSelectItem }) => {
  const { addNotification } = useAppContext();
  const queryClient = useQueryClient();
  
  // Local state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [showHidden, setShowHidden] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [itemToEdit, setItemToEdit] = useState(null);
  
  // Fetch catalog items
  const { 
    data: items, 
    isLoading: isLoadingItems,
    isError: isErrorItems,
    error: errorItems
  } = useQuery('catalog', api.catalog.getAll);
  
  // Fetch suppliers
  const { 
    data: suppliers, 
    isLoading: isLoadingSuppliers 
  } = useQuery('suppliers', api.suppliers.getAll);
  
  // Delete item mutation
  const deleteItemMutation = useMutation(
    (id) => api.catalog.delete(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('catalog');
        addNotification('Item deleted successfully', 'success');
        setItemToDelete(null);
      },
      onError: (error) => {
        addNotification(`Error deleting item: ${error.message}`, 'error');
      }
    }
  );
  
  // Category options
  const categories = [
    { id: 'timber', name: 'Timber' },
    { id: 'hardware', name: 'Hardware' },
    { id: 'fixtures', name: 'Fixtures' },
    { id: 'glass', name: 'Glass' },
    { id: 'labour', name: 'Labour' },
    { id: 'other', name: 'Other' }
  ];
  
  // Add this effect to debug and log item names
  useEffect(() => {
    if (items && items.length > 0) {
      console.log('Checking item names:');
      items.forEach(item => {
        const before = item.name;
        const after = cleanItemName(item.name);
        if (before !== after) {
          console.log(`Found item with trailing zeros: "${before}" -> "${after}"`);
        }
      });
    }
  }, [items]);
  
  // Filter items based on search and filters
  const filteredItems = React.useMemo(() => {
    if (!items) return [];
    
    return items.filter(item => {
      // Filter by search term
      const matchesSearch = searchTerm === '' ||
        (item.name && cleanItemName(item.name).toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()));
      
      // Filter by category
      const matchesCategory = selectedCategory === '' || item.category === selectedCategory;
      
      // Filter by supplier
      const matchesSupplier = selectedSupplier === '' || item.supplier === selectedSupplier;
      
      // Filter by hidden status
      const matchesHidden = showHidden || !item.hidden;
      
      return matchesSearch && matchesCategory && matchesSupplier && matchesHidden;
    });
  }, [items, searchTerm, selectedCategory, selectedSupplier, showHidden]);
  
  // Handle confirm delete
  const handleConfirmDelete = () => {
    if (itemToDelete) {
      deleteItemMutation.mutate(itemToDelete.id);
    }
  };
  
  // Loading state
  if (isLoadingItems || isLoadingSuppliers) {
    return <Loading message="Loading catalog items..." />;
  }
  
  // Error state
  if (isErrorItems) {
    return (
      <div className="error-container">
        <div className="error-content">
          <div className="error-icon">
            <svg className="icon-error" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="error-message">
            <h3 className="error-title">Error loading catalog items</h3>
            <div className="error-details">
              <p>{errorItems?.message || 'Unknown error'}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="catalog-container">
      {/* Filters */}
      <div className="filter-panel">
        <div className="filter-row">
          <div className="search-field">
            <FormField
              name="search"
              type="text"
              placeholder="Search items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="filter-selects">
            <select
              className="category-select"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="">All Categories</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
            
            <select
              className="supplier-select"
              value={selectedSupplier}
              onChange={(e) => setSelectedSupplier(e.target.value)}
            >
              <option value="">All Suppliers</option>
              {suppliers?.map(supplier => (
                <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="filter-actions">
          <div className="show-hidden-option">
            <input
              id="show-hidden"
              type="checkbox"
              className="checkbox"
              checked={showHidden}
              onChange={(e) => setShowHidden(e.target.checked)}
            />
            <label htmlFor="show-hidden" className="checkbox-label">
              Show hidden items
            </label>
          </div>
          
          <div className="action-buttons">
            <span className="item-count">
              {filteredItems.length} items
            </span>
            
            <Button
              variant="primary"
              size="sm"
              onClick={onAddItem}
            >
              Add Item
            </Button>
          </div>
        </div>
      </div>
      
      {/* Items list */}
      {filteredItems.length === 0 ? (
        <div className="empty-state">
          <svg className="empty-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
          <h3 className="empty-title">No items found</h3>
          <p className="empty-description">
            {searchTerm || selectedCategory || selectedSupplier ? 
              'Try adjusting your filters' : 
              'Get started by adding a new catalog item'}
          </p>
          <div className="empty-action">
            <Button variant="primary" onClick={onAddItem}>
              Add New Item
            </Button>
          </div>
        </div>
      ) : (
        <div className="table-container">
          <table className="catalog-table">
            <thead className="table-header">
              <tr>
                <th scope="col" className="column-header" style={{ width: '40%', textAlign: 'left', borderBottom: '1px solid #e0e0e0' }}>
                  Name
                </th>
                <th scope="col" className="column-header" style={{ width: '15%', textAlign: 'left', borderBottom: '1px solid #e0e0e0' }}>
                  Category
                </th>
                <th scope="col" className="column-header" style={{ width: '20%', textAlign: 'left', borderBottom: '1px solid #e0e0e0' }}>
                  Supplier
                </th>
                <th scope="col" className="column-header" style={{ width: '10%', textAlign: 'left', borderBottom: '1px solid #e0e0e0' }}>
                  Cost
                </th>
                <th scope="col" className="column-header column-actions" style={{ width: '15%', textAlign: 'left', borderBottom: '1px solid #e0e0e0' }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="table-body">
              {filteredItems.map((item) => {
                // Find the category object based on item.category ID
                const category = categories.find(cat => cat.id === item.category);
                // Find the supplier object based on item.supplier ID
                const supplier = suppliers?.find(sup => sup.id === item.supplier);

                return (
                  <tr key={item.id} className={item.hidden ? 'row-hidden' : ''}>
                    <td className="table-cell">
                      <div className="item-name-container">
                        <div>
                          <div className="item-name">
                            {cleanItemName(item.name)}
                            {item.hidden && (
                              <span className="hidden-badge">
                                Hidden
                              </span>
                            )}
                          </div>
                          {item.description && (
                            <div className="item-description">
                              {item.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="item-cell item-category">
                      {category ? (
                        <span className="category-badge" style={{ 
                          display: 'inline-block',
                          padding: '3px 8px', 
                          backgroundColor: '#e3f2fd', 
                          color: '#0d47a1', 
                          borderRadius: '4px',
                          fontSize: '0.85rem'
                        }}>
                          {category.name} {/* Use found category name */}
                        </span>
                      ) : (
                        <span className="category-badge-missing">Unknown</span>
                      )}
                    </td>
                    <td className="item-cell item-supplier">
                      {supplier ? supplier.name : 'Unknown'} {/* Use found supplier name */}
                    </td>
                    <td className="item-cell item-cost">
                      £{item.cost?.toFixed(2) || '0.00'}
                    </td>
                    <td className="item-cell item-actions">
                      <div className="action-buttons-container" style={{ display: 'flex', gap: '4px' }}>
                        <button
                          type="button"
                          className="btn-select"
                          style={{ 
                            padding: '4px 8px', 
                            background: '#e6f7ff', 
                            color: '#0073cf',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.85rem'
                          }}
                          onClick={(e) => { // Prevent row click if button is clicked
                            e.stopPropagation(); 
                            onSelectItem && onSelectItem({
                              ...item,
                              name: cleanItemName(item.name)
                            });
                          }}
                        >
                          Select
                        </button>
                        <button
                          type="button"
                          className="btn-edit"
                          style={{ 
                            padding: '4px 8px', 
                            background: '#e6f7ff', 
                            color: '#0073cf',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.85rem'
                          }}
                          onClick={() => {
                            // Directly call the parent component's onAddItem with the item to edit
                            // Make sure to clean the name before editing
                            if (onAddItem) {
                              onAddItem({
                                ...item,
                                name: cleanItemName(item.name)
                              });
                            }
                          }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn-delete"
                          style={{ 
                            padding: '4px 8px', 
                            background: '#ffebeb', 
                            color: '#d9363e',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.85rem'
                          }}
                          onClick={() => setItemToDelete(item)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      
      {/* Delete confirmation dialog */}
      {itemToDelete && (
        <Dialog
          isOpen={!!itemToDelete}
          onClose={() => setItemToDelete(null)}
          title="Delete Item"
          size="sm"
        >
          <div className="dialog-content">
            <p className="dialog-message">
              Are you sure you want to delete the item "{cleanItemName(itemToDelete.name)}"? This action cannot be undone.
            </p>
            
            <div className="dialog-actions">
              <Button
                variant="secondary"
                onClick={() => setItemToDelete(null)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleConfirmDelete}
                isLoading={deleteItemMutation.isLoading}
              >
                Delete
              </Button>
            </div>
          </div>
        </Dialog>
      )}
      
      {/* Edit item dialog handled by parent component */}
      {itemToEdit && onAddItem && (
        <Dialog
          isOpen={!!itemToEdit}
          onClose={() => setItemToEdit(null)}
          title="Edit Item"
        >
          {/* This is just a placeholder. The actual editing form would be implemented by the parent component */}
          <div className="dialog-content">
            <p className="dialog-message">
              Edit form for "{cleanItemName(itemToEdit.name)}" would be displayed here.
            </p>
            
            <div className="dialog-actions">
              <Button
                variant="secondary"
                onClick={() => setItemToEdit(null)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  onAddItem(itemToEdit);
                  setItemToEdit(null);
                }}
              >
                Save Changes
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
};

export default CatalogItemList;