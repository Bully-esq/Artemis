import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useAppContext } from '../../context/AppContext';
import api from '../../services/api';
import Button from '../common/Button';
import FormField from '../common/FormField';
import Loading from '../common/Loading';
import Dialog from '../common/Dialog';

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
  
  // Filter items based on search and filters
  const filteredItems = React.useMemo(() => {
    if (!items) return [];
    
    return items.filter(item => {
      // Filter by search term
      const matchesSearch = searchTerm === '' ||
        (item.name && item.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
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
      <div className="bg-red-50 p-4 rounded-md">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error loading catalog items</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{errorItems?.message || 'Unknown error'}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white p-4 rounded-md shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-grow">
            <FormField
              name="search"
              type="text"
              placeholder="Search items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2">
            <select
              className="form-select rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="">All Categories</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
            
            <select
              className="form-select rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
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
        
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <input
              id="show-hidden"
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              checked={showHidden}
              onChange={(e) => setShowHidden(e.target.checked)}
            />
            <label htmlFor="show-hidden" className="ml-2 text-sm text-gray-700">
              Show hidden items
            </label>
          </div>
          
          <div className="flex space-x-2">
            <span className="text-sm text-gray-600">
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
        <div className="bg-white p-8 rounded-md shadow-sm text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No items found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm || selectedCategory || selectedSupplier ? 
              'Try adjusting your filters' : 
              'Get started by adding a new catalog item'}
          </p>
          <div className="mt-6">
            <Button variant="primary" onClick={onAddItem}>
              Add New Item
            </Button>
          </div>
        </div>
      ) : (
        <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Supplier
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cost
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Lead Time
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredItems.map((item) => {
                const supplier = suppliers?.find(s => s.id === item.supplier) || { name: 'Unknown' };
                const category = categories.find(c => c.id === item.category) || { name: 'Other' };
                
                return (
                  <tr key={item.id} className={item.hidden ? 'bg-gray-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {item.name}
                            {item.hidden && (
                              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                Hidden
                              </span>
                            )}
                          </div>
                          {item.description && (
                            <div className="text-sm text-gray-500">
                              {item.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {category.name}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {supplier.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      £{item.cost?.toFixed(2) || '0.00'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.leadTime || 0} days
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          type="button"
                          className="text-blue-600 hover:text-blue-900"
                          onClick={() => onSelectItem && onSelectItem(item)}
                        >
                          Select
                        </button>
                        <button
                          type="button"
                          className="text-indigo-600 hover:text-indigo-900"
                          onClick={() => setItemToEdit(item)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="text-red-600 hover:text-red-900"
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
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              Are you sure you want to delete the item "{itemToDelete.name}"? This action cannot be undone.
            </p>
            
            <div className="flex justify-end space-x-3">
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
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              Edit form for "{itemToEdit.name}" would be displayed here.
            </p>
            
            <div className="flex justify-end space-x-3">
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