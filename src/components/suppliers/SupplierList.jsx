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
  
  // Form state for add/edit
  const [supplierForm, setSupplierForm] = useState({
    name: '',
    contact: '',
    email: '',
    phone: '',
    notes: ''
  });
  
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
  
  // Render loading state
  if (isLoading) {
    return (
      <PageLayout 
        title="Suppliers & Catalog" 
        actions={
          <Button variant="primary" onClick={handleAddSupplier}>
            <svg className="icon-small" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Supplier
          </Button>
        }
      >
        <Loading message="Loading suppliers..." />
      </PageLayout>
    );
  }
  
  // Render error state
  if (isError) {
    return (
      <PageLayout 
        title="Suppliers & Catalog"
        actions={
          <Button variant="primary" onClick={handleAddSupplier}>
            <svg className="icon-small" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Supplier
          </Button>
        }
      >
        <div className="error-message">
          <p>Error loading suppliers: {error?.message || 'Unknown error'}</p>
          <Button 
            className="mt-3" 
            variant="secondary" 
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
        <Button variant="primary" onClick={handleAddSupplier}>
          <svg className="icon-small" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          
          <div onClick={() => navigate('/suppliers/catalog')} className="quick-action-btn">
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
                            className="action-button edit"
                            onClick={() => handleEditSupplier(supplier)}
                          >
                            Edit
                          </button>
                          <button
                            className="action-button delete"
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
            <div className="empty-state">
              <svg className="empty-state-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <h3 className="empty-state-title">Catalog Items Management</h3>
              <p className="empty-state-description">
                Click below to manage your product catalog
              </p>
              <Button onClick={() => navigate('/suppliers/catalog')}>
                Manage Catalog
              </Button>
            </div>
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
    </PageLayout>
  );
};

export default SupplierList;