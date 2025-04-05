import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from 'react-query';
import { useAppContext } from '../../context/AppContext';
import FormField from '../common/FormField';
import Button from '../common/Button';
import api from '../../services/api';

/**
 * Contact form component for adding and editing contacts
 * 
 * @param {Object} props - Component props
 * @param {Object} props.contact - Contact data when editing (null for new contacts)
 * @param {Function} props.onSuccess - Callback function after successful save
 * @param {Function} props.onCancel - Callback function when cancel is clicked
 */
const ContactForm = ({ contact = null, onSuccess, onCancel }) => {
  const { addNotification } = useAppContext();
  const queryClient = useQueryClient();
  const isEditing = !!contact;
  
  // Form state
  const [formData, setFormData] = useState({
    customerType: 'individual',
    firstName: '',
    lastName: '',
    company: '',
    email: '',
    phone: '',
    address: '',
    notes: ''
  });
  
  // Load contact data when editing
  useEffect(() => {
    if (contact) {
      setFormData({
        customerType: contact.customerType || 'individual',
        firstName: contact.firstName || '',
        lastName: contact.lastName || '',
        company: contact.company || '',
        email: contact.email || '',
        phone: contact.phone || '',
        address: contact.address || '',
        notes: contact.notes || ''
      });
    }
  }, [contact]);
  
  // Form validation state
  const [errors, setErrors] = useState({});
  
  // Save contact mutation
  const saveContactMutation = useMutation(
    (contactData) => api.contacts.save(contactData),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('contacts');
        addNotification(
          `Contact ${isEditing ? 'updated' : 'added'} successfully`, 
          'success'
        );
        
        if (onSuccess) {
          onSuccess();
        }
      },
      onError: (error) => {
        addNotification(`Error ${isEditing ? 'updating' : 'adding'} contact: ${error.message}`, 'error');
      }
    }
  );
  
  // Handle form field changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Clear error when field is edited
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };
  
  // Validate form
  const validateForm = () => {
    const newErrors = {};
    
    // Basic validation
    if (formData.customerType === 'individual' && !formData.firstName.trim()) {
      newErrors.firstName = 'First name is required for individual contacts';
    }
    
    if (formData.customerType === 'company' && !formData.company.trim()) {
      newErrors.company = 'Company name is required for company contacts';
    }
    
    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      addNotification('Please fix the errors in the form', 'error');
      return;
    }
    
    // Prepare contact data
    const contactData = {
      id: contact?.id || Date.now().toString(),
      ...formData
    };
    
    // Add creation and update timestamps
    if (!isEditing) {
      contactData.createdAt = new Date().toISOString();
    } else {
      // Preserve creation date when editing
      contactData.createdAt = contact.createdAt || new Date().toISOString();
    }
    
    contactData.updatedAt = new Date().toISOString();
    contactData.lastContactDate = new Date().toISOString();
    
    // Save contact
    saveContactMutation.mutate(contactData);
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Contact type selection */}
      <FormField
        label="Contact Type"
        name="customerType"
        type="select"
        value={formData.customerType}
        onChange={handleChange}
      >
        <option value="individual">Individual</option>
        <option value="company">Company</option>
      </FormField>
      
      {/* Name fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          label={formData.customerType === 'company' ? 'Primary Contact First Name' : 'First Name'}
          name="firstName"
          type="text"
          value={formData.firstName}
          onChange={handleChange}
          error={errors.firstName}
          required={formData.customerType === 'individual'}
        />
        <FormField
          label={formData.customerType === 'company' ? 'Primary Contact Last Name' : 'Last Name'}
          name="lastName"
          type="text"
          value={formData.lastName}
          onChange={handleChange}
        />
      </div>
      
      {/* Company name */}
      <FormField
        label="Company Name"
        name="company"
        type="text"
        value={formData.company}
        onChange={handleChange}
        error={errors.company}
        required={formData.customerType === 'company'}
      />
      
      {/* Contact details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          label="Email"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          error={errors.email}
        />
        <FormField
          label="Phone"
          name="phone"
          type="text"
          value={formData.phone}
          onChange={handleChange}
        />
      </div>
      
      {/* Address */}
      <FormField
        label="Address"
        name="address"
        type="textarea"
        value={formData.address}
        onChange={handleChange}
        rows="3"
      />
      
      {/* Notes */}
      <FormField
        label="Notes"
        name="notes"
        type="textarea"
        value={formData.notes}
        onChange={handleChange}
        rows="3"
      />
      
      {/* Form buttons */}
      <div className="flex justify-end space-x-3">
        <Button
          variant="secondary"
          onClick={onCancel}
          type="button"
        >
          Cancel
        </Button>
        <Button
          variant="primary"
          type="submit"
          isLoading={saveContactMutation.isLoading}
        >
          {isEditing ? 'Update Contact' : 'Save Contact'}
        </Button>
      </div>
    </form>
  );
};

export default ContactForm;