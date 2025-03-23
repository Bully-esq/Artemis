import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from 'react-query';
import { useAppContext } from '../../context/AppContext';
import FormField from '../common/FormField';
import Button from '../common/Button';
import api from '../../services/api';

/**
 * Form component for creating and editing suppliers
 * 
 * @param {Object} props - Component props
 * @param {Object} props.supplier - Supplier object for editing (null for new supplier)
 * @param {Function} props.onSubmit - Function to call on successful submission
 * @param {Function} props.onCancel - Function to call when cancel button is clicked
 */
const SupplierForm = ({ supplier = null, onSubmit, onCancel }) => {
  const { addNotification } = useAppContext();
  const queryClient = useQueryClient();
  const isEditing = Boolean(supplier);
  
  // Form state
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    contact: '',
    email: '',
    phone: '',
    notes: '',
  });
  
  // Form validation state
  const [errors, setErrors] = useState({});
  
  // Populate form when editing existing supplier
  useEffect(() => {
    if (supplier) {
      setFormData({
        id: supplier.id || '',
        name: supplier.name || '',
        contact: supplier.contact || '',
        email: supplier.email || '',
        phone: supplier.phone || '',
        notes: supplier.notes || '',
      });
    }
  }, [supplier]);
  
  // Save supplier mutation
  const saveSupplierMutation = useMutation(
    (supplierData) => {
      // Get all current suppliers
      return queryClient.fetchQuery('suppliers')
        .then(currentSuppliers => {
          // Find existing supplier if editing
          const existingIndex = currentSuppliers.findIndex(s => s.id === supplierData.id);
          let updatedSuppliers;
          
          if (existingIndex !== -1) {
            // Update existing supplier
            updatedSuppliers = [...currentSuppliers];
            updatedSuppliers[existingIndex] = {
              ...updatedSuppliers[existingIndex],
              ...supplierData,
              updatedAt: new Date().toISOString()
            };
          } else {
            // Add new supplier
            updatedSuppliers = [
              ...currentSuppliers,
              {
                ...supplierData,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              }
            ];
          }
          
          // Save updated suppliers to server
          return api.suppliers.update(updatedSuppliers);
        });
    },
    {
      onSuccess: () => {
        // Invalidate suppliers query to refresh data
        queryClient.invalidateQueries('suppliers');
        
        // Show success notification
        addNotification(
          isEditing ? 'Supplier updated successfully' : 'Supplier added successfully',
          'success'
        );
        
        // Call onSubmit callback
        if (onSubmit) {
          onSubmit();
        }
      },
      onError: (error) => {
        addNotification(`Error saving supplier: ${error.message}`, 'error');
      }
    }
  );
  
  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    
    // Clear validation error when field is updated
    if (errors[name]) {
      setErrors({ ...errors, [name]: null });
    }
  };
  
  // Validate form before submission
  const validateForm = () => {
    const newErrors = {};
    
    // Name is required
    if (!formData.name.trim()) {
      newErrors.name = 'Supplier name is required';
    }
    
    // Email validation if provided
    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate form
    if (!validateForm()) {
      addNotification('Please correct the errors in the form', 'error');
      return;
    }
    
    // Prepare supplier data
    const supplierData = {
      ...formData,
      // Generate new ID if creating new supplier
      id: formData.id || Date.now().toString()
    };
    
    // Save supplier
    saveSupplierMutation.mutate(supplierData);
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField
        label="Supplier Name"
        name="name"
        value={formData.name}
        onChange={handleChange}
        placeholder="Enter supplier name"
        error={errors.name}
        required
      />
      
      <FormField
        label="Contact Person"
        name="contact"
        value={formData.contact}
        onChange={handleChange}
        placeholder="Enter contact person name"
      />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          label="Email"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="Enter email address"
          error={errors.email}
        />
        
        <FormField
          label="Phone"
          name="phone"
          value={formData.phone}
          onChange={handleChange}
          placeholder="Enter phone number"
        />
      </div>
      
      <FormField
        label="Notes"
        name="notes"
        type="textarea"
        value={formData.notes}
        onChange={handleChange}
        placeholder="Enter additional notes about this supplier"
      />
      
      <div className="flex justify-end space-x-3 pt-4">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
        >
          Cancel
        </Button>
        
        <Button
          type="submit"
          variant="primary"
          isLoading={saveSupplierMutation.isLoading}
        >
          {isEditing ? 'Update Supplier' : 'Add Supplier'}
        </Button>
      </div>
    </form>
  );
};

export default SupplierForm;