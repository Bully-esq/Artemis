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
    return <Loading fullScreen message="Loading suppliers..." />;
  }
  
  // Render error state
  if (isError) {
    return (
      <PageLayout title="Suppliers">
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">
                Error loading suppliers: {error?.message || 'Unknown error'}
              </p>
            </div>
          </div>
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
          onClick={handleAddSupplier}
        >
          Add Supplier
        </Button>
      }
    >
      <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
        <div className="px-4 py-5 sm:px-6">
          <Tabs
            tabs={[
              { id: 'suppliers', label: 'Suppliers' },
              { id: 'catalog', label: 'Catalog Items' }
            ]}
            activeTab={activeTab}
            onChange={setActiveTab}
            variant="underline"
          />
          
          {activeTab === 'suppliers' && (
            <div className="mt-4">
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Search suppliers..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  value={searchTerm}
                  onChange={handleSearchChange}
                />
              </div>
              
              {filteredSuppliers.length === 0 ? (
                <div className="text-center py-10">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No suppliers found</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {searchTerm ? 'Try adjusting your search.' : 'Get started by adding a new supplier.'}
                  </p>
                  <div className="mt-6">
                    <Button onClick={handleAddSupplier}>
                      <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                      </svg>
                      Add Supplier
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Name
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Contact
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Email/Phone
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredSuppliers.map((supplier) => (
                        <tr key={supplier.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="font-medium text-gray-900">{supplier.name}</div>
                            {supplier.notes && (
                              <div className="text-sm text-gray-500">{supplier.notes}</div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{supplier.contact || '-'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{supplier.email || '-'}</div>
                            <div className="text-sm text-gray-500">{supplier.phone || '-'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <Button
                              variant="secondary"
                              size="sm"
                              className="mr-2"
                              onClick={() => handleEditSupplier(supplier)}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => handleDeleteClick(supplier)}
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
          )}
          
          {activeTab === 'catalog' && (
            <div className="mt-4">
              <div className="text-center py-10">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">Catalog Items Management</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Click below to manage catalog items
                </p>
                <div className="mt-6">
                  <Button onClick={() => navigate('/suppliers/catalog')}>
                    Manage Catalog
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Add Supplier Dialog */}
      {showAddSupplierDialog && (
        <Dialog
          title="Add Supplier"
          onClose={() => setShowAddSupplierDialog(false)}
          footer={
            <div className="flex space-x-3 justify-end">
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
          <div className="space-y-4">
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
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <div className="flex space-x-3 justify-end">
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
          <div className="space-y-4">
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
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <div className="flex space-x-3 justify-end">
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
          <p>Are you sure you want to delete {currentSupplier?.name}?</p>
          <p className="text-sm text-gray-500 mt-2">
            This action cannot be undone. This will permanently delete the supplier and remove it from all associated catalog items.
          </p>
        </Dialog>
      )}
    </PageLayout>
  );
};

export default SupplierList;