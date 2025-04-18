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
        if (before !== after && before && after) {
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
  
  // Helper for currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount || 0);
  };
  
  // Loading state
  if (isLoadingItems || isLoadingSuppliers) {
    return <Loading message="Loading catalog items..." />;
  }
  
  // Error state
  if (isErrorItems) {
    return (
      <div className="mt-6 p-6 bg-red-50 border border-red-200 rounded-md text-center dark:bg-red-900/20 dark:border-red-700">
        <div className="flex justify-center items-center mb-4">
          <svg className="h-8 w-8 text-red-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <h3 className="text-lg font-medium text-red-800 dark:text-red-200">Error loading catalog items</h3>
        </div>
        <p className="text-red-700 mb-4 dark:text-red-300">{errorItems?.message || 'Unknown error'}</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Filters Card - Use theme variables like InvoiceList */}
      <div className="bg-card-background p-4 shadow rounded-lg border border-card-border">
        <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4">
          {/* Search Input - Assuming FormField uses theme variables */}
          <div className="flex-grow md:max-w-xs">
            <FormField
              id="search-catalog"
              label="Search Catalog"
              labelSrOnly
              name="search"
              type="text"
              placeholder="Search items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          {/* Filter Selects */}
          <div className="flex flex-col sm:flex-row gap-4 flex-grow md:flex-grow-0">
             {/* Basic Tailwind styled select, consider replacing with common Select component */}
             <div className="flex-grow">
                <label htmlFor="category-select" className="sr-only">Category</label>
                <select
                  id="category-select"
                  name="category"
                  className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-gray-500 focus:border-gray-500 sm:text-sm rounded-md shadow-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:focus:ring-gray-400 dark:focus:border-gray-400"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  <option value="">All Categories</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
             </div>
             
             {/* Basic Tailwind styled select */}
             <div className="flex-grow">
                <label htmlFor="supplier-select" className="sr-only">Supplier</label>
                <select
                  id="supplier-select"
                  name="supplier"
                  className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-gray-500 focus:border-gray-500 sm:text-sm rounded-md shadow-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:focus:ring-gray-400 dark:focus:border-gray-400"
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
        </div>
        
        {/* Actions Row */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* Show Hidden Checkbox */}
          <div className="relative flex items-start">
             {/* Basic Tailwind styled checkbox, consider replacing with common Checkbox component */}
            <div className="flex items-center h-5">
              <input
                id="show-hidden"
                name="show-hidden"
                type="checkbox"
                className="focus:ring-gray-500 h-4 w-4 text-gray-600 border-gray-300 rounded dark:focus:ring-gray-400 dark:text-gray-400 dark:bg-gray-600 dark:border-gray-500"
                checked={showHidden}
                onChange={(e) => setShowHidden(e.target.checked)}
              />
            </div>
            <div className="ml-3 text-sm">
              <label htmlFor="show-hidden" className="font-medium text-gray-700 cursor-pointer dark:text-gray-300">
                Show hidden items
              </label>
            </div>
          </div>
          
          {/* Item Count and Add Button */}
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {filteredItems.length} items found
            </span>
            <Button
              variant="primary"
              size="sm"
              onClick={onAddItem}
              icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 -ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>}
            >
              Add Item
            </Button>
          </div>
        </div>
      </div>
      
      {/* Items list Card - Use theme variables like InvoiceList */}
      <div className="bg-card-background shadow overflow-hidden sm:rounded-lg border border-card-border">
        {filteredItems.length === 0 ? (
          <div className="text-center py-12 px-6">
            <svg className="mx-auto h-12 w-12 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
               <path vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-text-primary">
              {searchTerm || selectedCategory || selectedSupplier ? 
                'No items match your filters' : 
                'No catalog items yet'}
            </h3>
            <p className="mt-1 text-sm text-text-secondary">
              {searchTerm || selectedCategory || selectedSupplier ? 
                'Try adjusting your search or filter criteria.' : 
                'Get started by adding a new catalog item.'}
            </p>
            {!searchTerm && !selectedCategory && !selectedSupplier && (
              <div className="mt-6">
                <Button variant="primary" onClick={onAddItem}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 -ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                     <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  Add New Item
                </Button>
              </div>
            )}
          </div>
        ) : (
           <div className="overflow-x-auto">
             <table className="min-w-full divide-y divide-card-border">
               <thead className="bg-background-secondary">
                 <tr>
                   <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider w-2/5">
                     Name
                   </th>
                   <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider w-1/6">
                     Category
                   </th>
                   <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider w-1/5">
                     Supplier
                   </th>
                   <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider w-1/12">
                     Cost
                   </th>
                   <th scope="col" className="relative px-6 py-3 w-1/6">
                     <span className="sr-only">Actions</span>
                   </th>
                 </tr>
               </thead>
               <tbody className="bg-card-background divide-y divide-card-border">
                 {filteredItems.map((item) => (
                   <tr key={item.id} className={`${item.hidden ? 'bg-background-secondary opacity-70' : 'hover:bg-background-tertiary'}`}>
                     <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-text-primary">
                       {cleanItemName(item.name)}
                       {item.description && (
                         <p className="text-xs text-text-secondary mt-1 truncate">{item.description}</p>
                       )}
                       {item.hidden && <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-badge-neutral-background text-badge-neutral-text">Hidden</span>}
                     </td>
                     <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                       {categories.find(c => c.id === item.category)?.name || item.category}
                     </td>
                     <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                       {suppliers?.find(s => s.id === item.supplier)?.name || item.supplier}
                     </td>
                     <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                       {formatCurrency(item.cost)}
                     </td>
                     <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                       <Button 
                         size="xs"
                         variant="outline" 
                         colorScheme="gray"
                         onClick={(e) => { 
                           e.stopPropagation();
                           if (onAddItem) onAddItem(item); 
                         }}
                       >
                         Edit
                       </Button>
                       <Button
                         size="xs"
                         variant="outline"
                         colorScheme="red"
                         onClick={(e) => {
                           e.stopPropagation();
                           setItemToDelete(item);
                         }}
                       >
                         Delete
                       </Button>
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>
        )}
      </div>
      
      {/* Delete Confirmation Dialog */}
      <Dialog
        isOpen={!!itemToDelete}
        onClose={() => setItemToDelete(null)}
        title="Delete Catalog Item"
        description={`Are you sure you want to delete the item "${itemToDelete?.name}"? This action cannot be undone.`}
      >
        <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
          <Button
            variant="danger"
            onClick={handleConfirmDelete}
            disabled={deleteItemMutation.isLoading}
            className="w-full sm:col-start-2"
          >
            {deleteItemMutation.isLoading ? 'Deleting...' : 'Delete'}
          </Button>
          <Button
            variant="secondary"
            onClick={() => setItemToDelete(null)}
            disabled={deleteItemMutation.isLoading}
            className="mt-3 w-full sm:mt-0 sm:col-start-1"
          >
            Cancel
          </Button>
        </div>
      </Dialog>
    </div>
  );
};

export default CatalogItemList;