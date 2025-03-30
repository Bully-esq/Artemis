import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useAppContext } from '../../context/AppContext';

// Components
import PageLayout from '../common/PageLayout';
import Button from '../common/Button';
import Dialog from '../common/Dialog';
import FormField from '../common/FormField';
import Loading from '../common/Loading';
import Tabs from '../common/Tabs';
import CatalogItemList from './CatalogItemList'; // Import CatalogItemList

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
    (updatedSuppliers) => api.suppliers.update(updatedSuppliers),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('suppliers');
        addNotification('Suppliers updated successfully', 'success');
      },
      onError: (err) => {
        addNotification(`Error updating suppliers: ${err.message}`, 'error');
      }
    }
  );

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

  // Replace your saveCatalogItemMutation with this enhanced version
  const saveCatalogItemMutation = useMutation(
    (itemData) => {
      const items = queryClient.getQueryData('catalog') || [];
      
      // Apply name cleanup to ensure no trailing zeros
      const cleanedItemData = {
        ...itemData,
        name: cleanItemName(itemData.name) // Ensure cleaning happens here too
      };
      
      // If it's a new item, add it to the collection
      if (!cleanedItemData.id) {
        const newItem = {
          ...cleanedItemData,
          id: Date.now().toString(), // Generate a unique ID
        };
        return api.catalog.update([...items, newItem]);
      }
      
      // If it's an existing item, update it in the collection
      const updatedItems = items.map(item => 
        item.id === cleanedItemData.id ? { ...item, ...cleanedItemData } : item
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
    // Check if any catalog items use this supplier
    const { data: catalogItems = [] } = queryClient.getQueryData('catalog') || { data: [] };
    const itemsUsingSupplier = catalogItems.filter(item => item.supplier === currentSupplier.id);
    
    if (itemsUsingSupplier.length > 0) {
      if (!window.confirm(`This supplier is used by ${itemsUsingSupplier.length} catalog items. Deleting it will affect those items. Continue?`)) {
        setShowDeleteConfirmDialog(false);
        return;
      }
    }
    
    const updatedSuppliers = suppliers.filter(supplier => 
      supplier.id !== currentSupplier.id
    );
    
    updateSuppliersMutation.mutate(updatedSuppliers);
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
        name: cleanItemName(itemToEdit.name) || '', // Ensure cleaning happens here
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
    
    // Parse the cost to ensure it's a number and clean the name
    const formattedItem = {
      ...catalogItemForm,
      name: cleanItemName(catalogItemForm.name), // Ensure cleaning happens here
      cost: catalogItemForm.cost === '' ? 0 : parseFloat(catalogItemForm.cost),
      leadTime: catalogItemForm.leadTime === '' ? 0 : parseInt(catalogItemForm.leadTime, 10)
    };
    
    // Log the cleaned name for debugging
    console.log(`Saving catalog item with cleaned name: "${formattedItem.name}"`);
    
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
      actions={
        <Button 
          variant="primary" 
          size="sm" 
          onClick={handleAddSupplier} 
        >
          <svg className="icon-small" fill="none" stroke="currentColor" viewBox="0 0 24 24"> {/* Consider standardizing icon classes like w-4 h-4 */}
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Supplier
        </Button>
      }
    >
      {/* Page Header - Styled like Dashboard */}
      <div className="page-header">
        <h1 className="page-title">Supplier Management</h1>
        <p className="page-description">Manage your suppliers and product catalog</p>
      </div>

      {/* Quick Actions - Same styling as Dashboard */}
      <div className="quick-actions-section">
        <h2 className="section-title">Quick Actions</h2>
        <div className="quick-actions">
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
              <div className="recent-items">
                {filteredSuppliers.map((supplier) => (
                  <div key={supplier.id} className="recent-item">
                    <div className="item-content">
                      <div>
                        <p className="item-title">{supplier.name}</p>
                        <p className="item-subtitle">
                          {supplier.contact && `${supplier.contact}`}
                          {supplier.contact && supplier.email && ' • '}
                          {supplier.email}
                        </p>
                      </div>
                      <div className="item-actions">
                        <p className="item-detail">{supplier.phone || ''}</p>
                        <div className="action-buttons">
                          <button
                            className="btn btn-list-item btn-list-item--secondary"
                            onClick={() => handleEditSupplier(supplier)}
                          >
                            Edit
                          </button>
                          <button
                            className="btn btn-list-item btn-list-item--danger"
                            onClick={() => handleDeleteClick(supplier)}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                    {supplier.notes && (
                      <div className="item-notes">
                        <p>{supplier.notes}</p>
                      </div>
                    )}
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
      
      {/* Add Supplier Dialog */}
      {showAddSupplierDialog && (
        <Dialog
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
            
            <div className="form-row">
              <FormField
                label="Email"
                name="email"
                type="email"
                value={supplierForm.email}
                onChange={handleFormChange}
                placeholder="Enter email address"
              />
              
              <FormField
                label="Phone"
                name="phone"
                value={supplierForm.phone}
                onChange={handleFormChange}
                placeholder="Enter phone number"
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
      
      {/* Edit Supplier Dialog */}
      {showEditSupplierDialog && (
        <Dialog
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
            
            <div className="form-row">
              <FormField
                label="Email"
                name="email"
                type="email"
                value={supplierForm.email}
                onChange={handleFormChange}
                placeholder="Enter email address"
              />
              
              <FormField
                label="Phone"
                name="phone"
                value={supplierForm.phone}
                onChange={handleFormChange}
                placeholder="Enter phone number"
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
      
      {/* Delete Confirmation Dialog */}
      {showDeleteConfirmDialog && (
        <Dialog
          title="Delete Supplier"
          onClose={() => setShowDeleteConfirmDialog(false)}
          footer={
            <div className="dialog-footer">
              <Button 
                variant="secondary" 
                onClick={() => setShowDeleteConfirmDialog(false)}
              >
                Cancel
              </Button>
              <Button 
                variant="danger" 
                onClick={handleDeleteSupplier}
                isLoading={updateSuppliersMutation.isLoading}
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

      {/* Add this catalog item dialog */}
      {showCatalogItemDialog && (
        <Dialog
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
            
            <div className="form-row">
              <div className="form-column">
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
              
              <div className="form-column">
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
            
            <div className="form-row">
              <FormField
                label="Cost (£)"
                name="cost"
                type="number"
                step="0.01"
                min="0"
                value={catalogItemForm.cost}
                onChange={handleCatalogItemFormChange}
                placeholder="0.00"
              />
              
              <FormField
                label="Lead Time (days)"
                name="leadTime"
                type="number"
                min="0"
                value={catalogItemForm.leadTime}
                onChange={handleCatalogItemFormChange}
                placeholder="0"
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
      )}
    </PageLayout>
  );
};

export default SupplierList;