import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useAppContext } from '../../context/AppContext';
// CSS imports removed - styling handled by Tailwind
// import '../../styles/pages/suppliers.css';
// import '../../styles/components/lists.css';
// import '../../styles/components/common/buttons.css';

// Components
import PageLayout from '../common/PageLayout';
import Button from '../common/Button';
import Dialog from '../common/Dialog';
import FormField from '../common/FormField';
import Loading from '../common/Loading';
import Tabs from '../common/Tabs';
import CatalogItemList from './CatalogItemList';
import ActionButtonContainer from '../common/ActionButtonContainer';

const SupplierList = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { addNotification } = useAppContext();
  
  // Local state
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddSupplierDialog, setShowAddSupplierDialog] = useState(false);
  const [showEditSupplierDialog, setShowEditSupplierDialog] = useState(false);
  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);
  const [currentSupplier, setCurrentSupplier] = useState(null);
  const [activeTab, setActiveTab] = useState('suppliers');
  const [showCatalogItemDialog, setShowCatalogItemDialog] = useState(false);
  const [showPriceUpdateDialog, setShowPriceUpdateDialog] = useState(false);
  const [priceUpdatePercentage, setPriceUpdatePercentage] = useState('');
  const [showSupplierDetailsDialog, setShowSupplierDetailsDialog] = useState(false);
  const [catalogItemForm, setCatalogItemForm] = useState({
    id: '',
    name: '',
    description: '',
    category: '',
    supplier: '',
    cost: '',
    leadTime: '',
    unit: '',
    hidden: false
  });
  
  // Form state for add/edit
  const [supplierForm, setSupplierForm] = useState({
    name: '',
    contact: '',
    email: '',
    phone: '',
    notes: ''
  });

  // Define categories for catalog items
  const categories = [
    { id: 'timber', name: 'Timber' },
    { id: 'hardware', name: 'Hardware' },
    { id: 'fixtures', name: 'Fixtures' },
    { id: 'glass', name: 'Glass' },
    { id: 'labour', name: 'Labour' },
    { id: 'other', name: 'Other' }
  ];

  // Add a simple handleSelectItem function
  const handleSelectItem = (item) => {
    // You can implement selection behavior here if needed
    console.log('Item selected:', item);
    // For now, we'll just show a notification
    addNotification(`Selected item: ${item.name}`, 'info');
  };
  
  // Query suppliers data
  const { 
    data: suppliers = [], 
    isLoading, 
    isError, 
    error 
  } = useQuery(
    'suppliers', 
    api.suppliers.getAll, 
    {
      refetchOnWindowFocus: false,
      onError: (err) => {
        addNotification(`Error loading suppliers: ${err.message}`, 'error');
      }
    }
  );
  
  // Mutation for updating suppliers
  const updateSuppliersMutation = useMutation(
    (updatedSuppliers) => {
      console.log('Mutation triggered with suppliers:', updatedSuppliers);
      return api.suppliers.update(updatedSuppliers);
    },
    {
      onSuccess: (data) => {
        console.log('Mutation successful, response:', data);
        queryClient.invalidateQueries('suppliers');
        addNotification('Suppliers updated successfully', 'success');
      },
      onError: (err) => {
        console.error('Mutation error:', err);
        addNotification(`Error updating suppliers: ${err.message}`, 'error');
      }
    }
  );

  // Add this new mutation for saving catalog items
  const saveCatalogItemMutation = useMutation(
    (itemData) => {
      const items = queryClient.getQueryData('catalog') || [];
      
      // If it's a new item, add it to the collection
      if (!itemData.id) {
        const newItem = {
          ...itemData,
          id: Date.now().toString(), // Generate a unique ID
        };
        return api.catalog.update([...items, newItem]);
      }
      
      // If it's an existing item, update it in the collection
      const updatedItems = items.map(item => 
        item.id === itemData.id ? { ...item, ...itemData } : item
      );
      return api.catalog.update(updatedItems);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('catalog');
        setShowCatalogItemDialog(false);
        addNotification('Catalog item saved successfully', 'success');
      },
      onError: (error) => {
        addNotification(`Error saving catalog item: ${error.message}`, 'error');
      }
    }
  );
  
  // Add a delete supplier mutation
  const deleteSupplierMutation = useMutation(
    (id) => api.suppliers.delete(id),
    {
      onSuccess: () => {
        console.log('Supplier deleted successfully');
        queryClient.invalidateQueries('suppliers');
        addNotification('Supplier deleted successfully', 'success');
        
        // Also refresh catalog items as they may reference this supplier
        queryClient.invalidateQueries('catalog');
      },
      onError: (err) => {
        console.error('Error deleting supplier:', err);
        addNotification(`Error deleting supplier: ${err.message}`, 'error');
      }
    }
  );
  
  // Handle search input change
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value.toLowerCase());
  };
  
  // Handle opening the add supplier dialog
  const handleAddSupplier = () => {
    setSupplierForm({
      name: '',
      contact: '',
      email: '',
      phone: '',
      notes: ''
    });
    setShowAddSupplierDialog(true);
  };
  
  // Handle opening the edit supplier dialog
  const handleEditSupplier = (supplier) => {
    setCurrentSupplier(supplier);
    setSupplierForm({
      name: supplier.name || '',
      contact: supplier.contact || '',
      email: supplier.email || '',
      phone: supplier.phone || '',
      notes: supplier.notes || ''
    });
    setShowEditSupplierDialog(true);
  };
  
  // Handle opening the delete confirmation dialog
  const handleDeleteClick = (supplier) => {
    setCurrentSupplier(supplier);
    setShowDeleteConfirmDialog(true);
  };
  
  // Handle form input changes
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setSupplierForm({
      ...supplierForm,
      [name]: value
    });
  };
  
  // Save a new supplier
  const handleSaveSupplier = () => {
    if (!supplierForm.name.trim()) {
      addNotification('Supplier name is required', 'error');
      return;
    }
    
    const newSupplier = {
      id: Date.now().toString(),
      ...supplierForm,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    const updatedSuppliers = [...suppliers, newSupplier];
    
    updateSuppliersMutation.mutate(updatedSuppliers);
    setShowAddSupplierDialog(false);
  };
  
  // Update an existing supplier
  const handleUpdateSupplier = () => {
    if (!supplierForm.name.trim()) {
      addNotification('Supplier name is required', 'error');
      return;
    }
    
    const updatedSuppliers = suppliers.map(supplier => 
      supplier.id === currentSupplier.id
        ? { 
            ...supplier, 
            ...supplierForm,
            updatedAt: new Date().toISOString()
          }
        : supplier
    );
    
    updateSuppliersMutation.mutate(updatedSuppliers);
    setShowEditSupplierDialog(false);
  };
  
  // Delete a supplier
  const handleDeleteSupplier = () => {
    if (!currentSupplier || !currentSupplier.id) {
      console.error('No supplier selected for deletion or supplier has no ID');
      addNotification('Error: No supplier selected for deletion', 'error');
      setShowDeleteConfirmDialog(false);
      return;
    }

    console.log('Attempting to delete supplier:', currentSupplier);
    
    // Check if any catalog items use this supplier
    const catalogItems = queryClient.getQueryData('catalog') || [];
    console.log('Catalog items:', catalogItems);
    const itemsUsingSupplier = catalogItems.filter(item => item.supplier === currentSupplier.id);
    console.log('Items using this supplier:', itemsUsingSupplier);
    
    if (itemsUsingSupplier.length > 0) {
      if (!window.confirm(`This supplier is used by ${itemsUsingSupplier.length} catalog items. Deleting it will affect those items. Continue?`)) {
        setShowDeleteConfirmDialog(false);
        return;
      }
    }
    
    // Use the new direct delete method instead of update
    deleteSupplierMutation.mutate(currentSupplier.id);
    setShowDeleteConfirmDialog(false);
  };
  
  // Filter suppliers based on search term
  const filteredSuppliers = searchTerm
    ? suppliers.filter(supplier => 
        supplier.name?.toLowerCase().includes(searchTerm) ||
        supplier.contact?.toLowerCase().includes(searchTerm) ||
        supplier.email?.toLowerCase().includes(searchTerm) ||
        supplier.phone?.toLowerCase().includes(searchTerm) ||
        supplier.notes?.toLowerCase().includes(searchTerm)
      )
    : suppliers;
  
  // Handle navigation for adding/editing catalog items
  const handleManageCatalogItem = (itemToEdit = null) => {
    if (itemToEdit) {
      // If editing existing item, populate the form
      setCatalogItemForm({
        id: itemToEdit.id || '',
        name: itemToEdit.name || '',
        description: itemToEdit.description || '',
        category: itemToEdit.category || '',
        supplier: itemToEdit.supplier || '',
        cost: itemToEdit.cost || '',
        leadTime: itemToEdit.leadTime || '',
        unit: itemToEdit.unit || '',
        hidden: itemToEdit.hidden || false
      });
    } else {
      // If adding new item, reset the form
      setCatalogItemForm({
        id: '',
        name: '',
        description: '',
        category: '',
        supplier: '',
        cost: '',
        leadTime: '',
        unit: '',
        hidden: false
      });
    }
    setShowCatalogItemDialog(true);
  };

  // Add this function to handle the form submission
  const handleSaveCatalogItem = () => {
    // Validation
    if (!catalogItemForm.name.trim()) {
      addNotification('Item name is required', 'error');
      return;
    }
    
    if (!catalogItemForm.category) {
      addNotification('Category is required', 'error');
      return;
    }
    
    // Parse the cost to ensure it's a number
    const formattedItem = {
      ...catalogItemForm,
      cost: catalogItemForm.cost === '' ? 0 : parseFloat(catalogItemForm.cost),
      leadTime: catalogItemForm.leadTime === '' ? 0 : parseInt(catalogItemForm.leadTime, 10)
    };
    
    saveCatalogItemMutation.mutate(formattedItem);
  };

  // Handle form input changes
  const handleCatalogItemFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setCatalogItemForm({
      ...catalogItemForm,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  // Add mutation for updating catalog items
  const updateCatalogItemsMutation = useMutation(
    (updatedItems) => api.catalog.update(updatedItems),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('catalog');
        addNotification('Prices updated successfully', 'success');
        setShowPriceUpdateDialog(false);
      },
      onError: (error) => {
        addNotification(`Error updating prices: ${error.message}`, 'error');
      }
    }
  );

  // Handle opening the price update dialog
  const handleUpdatePrices = (supplier) => {
    setCurrentSupplier(supplier);
    setPriceUpdatePercentage('');
    setShowPriceUpdateDialog(true);
  };

  // Handle applying the price update
  const handleApplyPriceUpdate = async () => {
    if (!currentSupplier) {
      addNotification('No supplier selected', 'error');
      return;
    }

    // Validate percentage input
    const percentage = parseFloat(priceUpdatePercentage);
    if (isNaN(percentage)) {
      addNotification('Please enter a valid percentage', 'error');
      return;
    }

    try {
      // Get catalog items
      const catalogItems = await queryClient.fetchQuery('catalog', api.catalog.getAll);
      
      // Find items for this supplier
      const supplierItems = catalogItems.filter(item => item.supplier === currentSupplier.id);
      
      if (supplierItems.length === 0) {
        addNotification(`No catalog items found for ${currentSupplier.name}`, 'warning');
        setShowPriceUpdateDialog(false);
        return;
      }
      
      // Calculate the multiplier (e.g., 5% increase = 1.05, -5% decrease = 0.95)
      const multiplier = 1 + (percentage / 100);
      
      // Update prices
      const updatedCatalogItems = catalogItems.map(item => {
        if (item.supplier === currentSupplier.id) {
          // Apply percentage increase/decrease
          const newCost = item.cost * multiplier;
          return {
            ...item,
            cost: parseFloat(newCost.toFixed(2)) // Round to 2 decimal places
          };
        }
        return item;
      });
      
      // Save updated items
      updateCatalogItemsMutation.mutate(updatedCatalogItems);
      
    } catch (error) {
      addNotification(`Error updating prices: ${error.message}`, 'error');
    }
  };

  // Add a function to handle supplier item click
  const handleSupplierClick = (supplier) => {
    setCurrentSupplier(supplier);
    setShowSupplierDetailsDialog(true);
  };

  if (isLoading) {
    return (
      <PageLayout title="Suppliers & Catalog">
        <Loading />
      </PageLayout>
    );
  }
  
  if (isError) {
    return (
      <PageLayout title="Suppliers & Catalog">
        <div className="error-state">
          <h3>Error loading suppliers</h3>
          <p>{error.message}</p>
          <Button 
            variant="primary" 
            onClick={() => queryClient.invalidateQueries('suppliers')}
          >
            Retry
          </Button>
        </div>
      </PageLayout>
    );
  }
  
  return (
    <PageLayout 
      title="Suppliers & Catalog" 
    >
      <ActionButtonContainer>
        <Button 
          variant="primary" 
          onClick={handleAddSupplier} 
          className="px-4 py-2 text-sm inline-flex items-center"
        >
          <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Supplier
        </Button>
      </ActionButtonContainer>
      
      {/* Page Header - Styled like Dashboard */}
      <div className="page-header">
        <h1 className="page-title">Supplier Management</h1>
        <p className="page-description">Manage your suppliers and product catalog</p>
      </div>

      {/* Quick Actions - Same styling as Dashboard */}
      <div className="quick-actions-section">
        <h2 className="section-title">Quick Actions</h2>
        <div className="quick-actions flex flex-wrap gap-4">
          <div onClick={handleAddSupplier} className="quick-action-btn">
            <svg className="icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <span>Add Supplier</span>
          </div>
          
          <div onClick={() => setActiveTab('catalog')} className="quick-action-btn">
            <svg className="icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
            </svg>
            <span>View Catalog</span>
          </div>
          
          <div onClick={() => handleManageCatalogItem()} className="quick-action-btn">
            <svg className="icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span>Add Catalog Item</span>
          </div>
        </div>
      </div>

      {/* Main content with tabs */}
      <div className="card">
        <div className="tabs-container">
          <Tabs
            tabs={[
              { id: 'suppliers', label: 'Suppliers' },
              { id: 'catalog', label: 'Catalog Items' }
            ]}
            activeTab={activeTab}
            onChange={setActiveTab}
            variant="underline"
          />
        </div>

        {/* Suppliers Tab Content */}
        {activeTab === 'suppliers' && (
          <div className="tab-content">
            <div className="search-container">
              <input
                type="text"
                placeholder="Search suppliers..."
                className="search-input"
                value={searchTerm}
                onChange={handleSearchChange}
              />
            </div>
            
            {filteredSuppliers.length === 0 ? (
              <div className="empty-state">
                <svg className="empty-state-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <h3 className="empty-state-title">
                  {searchTerm ? 'No suppliers match your search' : 'No suppliers found'}
                </h3>
                <p className="empty-state-description">
                  {searchTerm ? 'Try adjusting your search.' : 'Get started by adding a new supplier.'}
                </p>
                {!searchTerm && (
                  <Button onClick={handleAddSupplier}>
                    Add Your First Supplier
                  </Button>
                )}
              </div>
            ) : (
              <div className="recent-items grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredSuppliers.map((supplier) => (
                  <div 
                    key={supplier.id} 
                    className="bg-card-background border border-card-border rounded-lg shadow-sm p-4 flex flex-col justify-between hover:bg-background-tertiary cursor-pointer transition-shadow duration-200 ease-in-out"
                    onClick={() => handleSupplierClick(supplier)}
                  >
                    <div className="mb-3">
                      <p className="font-medium text-text-primary truncate">
                        {supplier.name}
                      </p>
                      <p className="text-sm text-text-secondary mt-1 truncate">
                        {supplier.contact && `${supplier.contact}`}
                        {supplier.contact && supplier.email && ' • '}
                        {supplier.email || 'No contact info'}
                      </p>
                      {supplier.notes && (
                        <p className="text-xs text-text-secondary mt-1 truncate italic">
                          Notes: {supplier.notes}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-auto">
                      <p className="text-sm text-text-secondary">
                        {supplier.phone || 'No phone'}
                      </p>
                      <div 
                         className="flex items-center space-x-2" 
                         onClick={(e) => e.stopPropagation()}
                      >
                         <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditSupplier(supplier)}
                         >
                            Edit
                         </Button>
                         <Button
                            size="sm"
                            variant="danger"
                            onClick={() => handleDeleteClick(supplier)}
                         >
                            Delete
                         </Button>
                         <Button
                            size="sm"
                            variant="outline"
                            className="whitespace-nowrap"
                            onClick={() => handleUpdatePrices(supplier)}
                         >
                            Update Prices
                         </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        {/* Catalog Tab Content */}
        {activeTab === 'catalog' && (
          <div className="tab-content">
            {/* Render CatalogItemList directly */}
            <CatalogItemList
              onAddItem={handleManageCatalogItem}
              onSelectItem={handleSelectItem}
            />
          </div>
        )}
      </div>
      
      {/* Add Supplier Dialog - Pass state to isOpen prop */}
      {/* {console.log('Rendering Add Supplier Dialog? State:', showAddSupplierDialog) /* Remove log */} 
      {/* {showAddSupplierDialog && ( */} // Remove conditional rendering here
        <Dialog
          isOpen={showAddSupplierDialog} // Pass state to isOpen prop
          title="Add Supplier"
          onClose={() => setShowAddSupplierDialog(false)}
          footer={
            <div className="dialog-footer">
              <Button 
                variant="secondary" 
                onClick={() => setShowAddSupplierDialog(false)}
              >
                Cancel
              </Button>
              <Button 
                variant="primary" 
                onClick={handleSaveSupplier}
                isLoading={updateSuppliersMutation.isLoading}
              >
                Save Supplier
              </Button>
            </div>
          }
        >
          <div className="form-container">
            <FormField
              label="Supplier Name"
              name="name"
              value={supplierForm.name}
              onChange={handleFormChange}
              required
              placeholder="Enter supplier name"
            />
            
            <FormField
              label="Contact Person"
              name="contact"
              value={supplierForm.contact}
              onChange={handleFormChange}
              placeholder="Enter contact person name"
            />
            
            <div className="form-row flex flex-col sm:flex-row gap-4">
              <FormField
                label="Email"
                name="email"
                type="email"
                value={supplierForm.email}
                onChange={handleFormChange}
                placeholder="Enter email address"
                className="w-full"
              />
              
              <FormField
                label="Phone"
                name="phone"
                value={supplierForm.phone}
                onChange={handleFormChange}
                placeholder="Enter phone number"
                className="w-full"
              />
            </div>
            
            <FormField
              label="Notes"
              name="notes"
              type="textarea"
              value={supplierForm.notes}
              onChange={handleFormChange}
              placeholder="Enter any additional notes"
            />
          </div>
        </Dialog>
      {/* )} */} // Remove conditional rendering here
      
      {/* Edit Supplier Dialog - Already correctly passing isOpen prop? Let's check. Seems missing! Add it. */}
      {showEditSupplierDialog && (
        <Dialog
          isOpen={showEditSupplierDialog} // Pass state to isOpen prop - This was missing!
          title="Edit Supplier"
          onClose={() => setShowEditSupplierDialog(false)}
          footer={
            <div className="dialog-footer">
              <Button 
                variant="secondary" 
                onClick={() => setShowEditSupplierDialog(false)}
              >
                Cancel
              </Button>
              <Button 
                variant="primary" 
                onClick={handleUpdateSupplier}
                isLoading={updateSuppliersMutation.isLoading}
              >
                Update Supplier
              </Button>
            </div>
          }
        >
          <div className="form-container">
            <FormField
              label="Supplier Name"
              name="name"
              value={supplierForm.name}
              onChange={handleFormChange}
              required
              placeholder="Enter supplier name"
            />
            
            <FormField
              label="Contact Person"
              name="contact"
              value={supplierForm.contact}
              onChange={handleFormChange}
              placeholder="Enter contact person name"
            />
            
            <div className="form-row flex flex-col sm:flex-row gap-4">
              <FormField
                label="Email"
                name="email"
                type="email"
                value={supplierForm.email}
                onChange={handleFormChange}
                placeholder="Enter email address"
                className="w-full"
              />
              
              <FormField
                label="Phone"
                name="phone"
                value={supplierForm.phone}
                onChange={handleFormChange}
                placeholder="Enter phone number"
                className="w-full"
              />
            </div>
            
            <FormField
              label="Notes"
              name="notes"
              type="textarea"
              value={supplierForm.notes}
              onChange={handleFormChange}
              placeholder="Enter any additional notes"
            />
          </div>
        </Dialog>
      )}
      
      {/* Delete Confirmation Dialog - Add isOpen prop */}
      {showDeleteConfirmDialog && (
        <Dialog
          isOpen={showDeleteConfirmDialog} // Pass state to isOpen prop
          title="Delete Supplier"
          onClose={() => setShowDeleteConfirmDialog(false)}
          footer={
            <div className="dialog-footer">
              <Button 
                variant="secondary" 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowDeleteConfirmDialog(false);
                }}
              >
                Cancel
              </Button>
              <Button 
                variant="danger" 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log("Delete button clicked");
                  handleDeleteSupplier();
                }}
                isLoading={deleteSupplierMutation.isLoading}
              >
                Delete Supplier
              </Button>
            </div>
          }
        >
          <div className="confirm-delete">
            <p className="confirm-message">Are you sure you want to delete {currentSupplier?.name}?</p>
            <p className="confirm-warning">
              This action cannot be undone. This will permanently delete the supplier and remove it from all associated catalog items.
            </p>
          </div>
        </Dialog>
      )}

      {/* Add this price update dialog - Add isOpen prop */}
      {showPriceUpdateDialog && (
        <Dialog
          isOpen={showPriceUpdateDialog} // Pass state to isOpen prop
          title="Update Prices"
          onClose={() => setShowPriceUpdateDialog(false)}
          footer={
            <div className="dialog-footer">
              <Button 
                variant="secondary" 
                onClick={() => setShowPriceUpdateDialog(false)}
                className="dialog-btn"
              >
                Cancel
              </Button>
              <Button 
                variant="primary" 
                onClick={handleApplyPriceUpdate}
                isLoading={updateCatalogItemsMutation.isLoading}
                className="dialog-btn"
              >
                Apply Update
              </Button>
            </div>
          }
        >
          <div className="form-container">
            <p className="price-update-info">
              This will update the prices of all catalog items from <strong>{currentSupplier?.name}</strong>.
            </p>
            
            <FormField
              label="Percentage Change"
              name="percentage"
              type="number"
              step="0.1"
              value={priceUpdatePercentage}
              onChange={(e) => setPriceUpdatePercentage(e.target.value)}
              placeholder="Enter percentage (e.g., 5 for 5% increase, -5 for 5% decrease)"
            />
            
            <div className="price-update-preview">
              <p>
                {parseFloat(priceUpdatePercentage) > 0 
                  ? `Prices will increase by ${parseFloat(priceUpdatePercentage)}%` 
                  : parseFloat(priceUpdatePercentage) < 0 
                    ? `Prices will decrease by ${Math.abs(parseFloat(priceUpdatePercentage))}%` 
                    : priceUpdatePercentage === '' 
                      ? 'Enter a percentage to see preview' 
                      : 'No change to prices'}
              </p>
              {priceUpdatePercentage !== '' && (
                <p className="price-update-example">
                  Example: £100.00 → £{(100 * (1 + (parseFloat(priceUpdatePercentage) / 100))).toFixed(2)}
                </p>
              )}
            </div>
          </div>
        </Dialog>
      )}

      {/* Add this catalog item dialog - Pass state to isOpen prop */}
      {/* {console.log('Rendering Catalog Item Dialog? State:', showCatalogItemDialog) /* Remove log */} 
      {/* {showCatalogItemDialog && ( */} // Remove conditional rendering here
        <Dialog
          isOpen={showCatalogItemDialog} // Pass state to isOpen prop
          title={catalogItemForm.id ? "Edit Catalog Item" : "Add Catalog Item"}
          onClose={() => setShowCatalogItemDialog(false)}
          footer={
            <div className="dialog-footer">
              <Button 
                variant="secondary" 
                onClick={() => setShowCatalogItemDialog(false)}
              >
                Cancel
              </Button>
              <Button 
                variant="primary" 
                onClick={handleSaveCatalogItem}
                isLoading={saveCatalogItemMutation.isLoading}
              >
                {catalogItemForm.id ? "Update Item" : "Save Item"}
              </Button>
            </div>
          }
        >
          <div className="form-container">
            <FormField
              label="Item Name"
              name="name"
              value={catalogItemForm.name}
              onChange={handleCatalogItemFormChange}
              required
              placeholder="Enter item name"
            />
            
            <FormField
              label="Description"
              name="description"
              type="textarea"
              value={catalogItemForm.description}
              onChange={handleCatalogItemFormChange}
              placeholder="Enter item description"
            />
            
            <div className="form-row flex flex-col sm:flex-row gap-4">
              <div className="form-column w-full">
                <label className="form-label">Category</label>
                <select 
                  name="category"
                  value={catalogItemForm.category}
                  onChange={handleCatalogItemFormChange}
                  className="form-select"
                >
                  <option value="">Select a category</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="form-column w-full">
                <label className="form-label">Supplier</label>
                <select 
                  name="supplier"
                  value={catalogItemForm.supplier}
                  onChange={handleCatalogItemFormChange}
                  className="form-select"
                >
                  <option value="">Select a supplier</option>
                  {suppliers?.map(supplier => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="form-row flex flex-col sm:flex-row gap-4">
              <FormField
                label="Cost (£)"
                name="cost"
                type="number"
                step="0.01"
                min="0"
                value={catalogItemForm.cost}
                onChange={handleCatalogItemFormChange}
                placeholder="0.00"
                className="w-full"
              />
              
              <FormField
                label="Lead Time (days)"
                name="leadTime"
                type="number"
                min="0"
                value={catalogItemForm.leadTime}
                onChange={handleCatalogItemFormChange}
                placeholder="0"
                className="w-full"
              />
            </div>
            
            <FormField
              label="Unit"
              name="unit"
              value={catalogItemForm.unit}
              onChange={handleCatalogItemFormChange}
              placeholder="e.g. each, meter, hour"
            />
            
            <div className="form-checkbox">
              <input
                type="checkbox"
                id="hidden"
                name="hidden"
                checked={catalogItemForm.hidden}
                onChange={handleCatalogItemFormChange}
                className="checkbox"
              />
              <label htmlFor="hidden" className="checkbox-label">
                Hide this item from lists and quotes
              </label>
            </div>
          </div>
        </Dialog>
      {/* )} */} // Remove conditional rendering here

      {/* Add Supplier Details Dialog - Add isOpen prop */}
      {showSupplierDetailsDialog && (
        <Dialog
          isOpen={showSupplierDetailsDialog} // Pass state to isOpen prop
          title="Supplier Details"
          onClose={() => setShowSupplierDetailsDialog(false)}
          footer={
            <div className="dialog-footer flex flex-wrap justify-end gap-2">
              <Button
                variant="danger"
                onClick={() => {
                  setShowSupplierDetailsDialog(false);
                  handleDeleteClick(currentSupplier);
                }}
                className="dialog-btn"
              >
                Delete
              </Button>
              <Button
                variant="success"
                onClick={() => {
                  setShowSupplierDetailsDialog(false);
                  handleUpdatePrices(currentSupplier);
                }}
                className="dialog-btn"
              >
                Update Prices
              </Button>
              <Button 
                variant="secondary" 
                onClick={() => setShowSupplierDetailsDialog(false)}
                className="dialog-btn"
              >
                Close
              </Button>
              <Button 
                variant="primary" 
                onClick={() => {
                  setShowSupplierDetailsDialog(false);
                  handleEditSupplier(currentSupplier);
                }}
                className="dialog-btn"
              >
                Edit Supplier
              </Button>
            </div>
          }
        >
          <div className="supplier-details">
            <h2 className="supplier-detail-name">{currentSupplier.name}</h2>
            
            {currentSupplier.contact && (
              <div className="detail-row flex flex-col sm:flex-row mb-2">
                <span className="detail-label w-full sm:w-auto mb-1 sm:mb-0 sm:mr-2 font-semibold">Contact:</span>
                <span className="detail-value flex-grow">{currentSupplier.contact}</span>
              </div>
            )}
            
            {currentSupplier.email && (
              <div className="detail-row flex flex-col sm:flex-row mb-2">
                <span className="detail-label w-full sm:w-auto mb-1 sm:mb-0 sm:mr-2 font-semibold">Email:</span>
                <span className="detail-value flex-grow">{currentSupplier.email}</span>
              </div>
            )}
            
            {currentSupplier.phone && (
              <div className="detail-row flex flex-col sm:flex-row mb-2">
                <span className="detail-label w-full sm:w-auto mb-1 sm:mb-0 sm:mr-2 font-semibold">Phone:</span>
                <span className="detail-value flex-grow">{currentSupplier.phone}</span>
              </div>
            )}
            
            {currentSupplier.notes && (
              <div className="detail-notes mt-3">
                <span className="detail-label font-semibold block mb-1">Notes:</span>
                <p className="detail-value notes text-sm text-gray-700">{currentSupplier.notes}</p>
              </div>
            )}
          </div>
        </Dialog>
      )}
    </PageLayout>
  );
};

export default SupplierList;