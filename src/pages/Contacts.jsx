import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';

// API and hooks
import { contactsApi } from '../services/api';
import { useAppContext } from '../../context/AppContext';

// Components
import PageLayout from '../components/common/PageLayout';
import Button from '../components/common/Button';
import Loading from '../components/common/Loading';
import Dialog from '../components/common/Dialog';
import FormField from '../components/common/FormField';
import ContactList from '../components/contacts/ContactList';
import ContactForm from '../components/contacts/ContactForm';

const Contacts = () => {
  const navigate = useNavigate();
  const { addNotification } = useAppContext();
  const queryClient = useQueryClient();
  
  // Local state
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [contactToDelete, setContactToDelete] = useState(null);
  const [filterOptions, setFilterOptions] = useState({
    showCompanies: true,
    showIndividuals: true
  });
  
  // Fetch contacts
  const {
    data: contacts = [],
    isLoading,
    isError,
    error
  } = useQuery('contacts', contactsApi.getAll, {
    onError: (err) => {
      addNotification(`Error loading contacts: ${err.message}`, 'error');
    }
  });
  
  // Delete contact mutation
  const deleteContactMutation = useMutation(
    (id) => contactsApi.delete(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('contacts');
        addNotification('Contact deleted successfully', 'success');
        setShowDeleteDialog(false);
        setContactToDelete(null);
      },
      onError: (err) => {
        addNotification(`Error deleting contact: ${err.message}`, 'error');
      }
    }
  );
  
  // Handle contact edit
  const handleEditContact = (id) => {
    navigate(`/contacts/${id}`);
  };
  
  // Handle contact view
  const handleViewContact = (id) => {
    navigate(`/contacts/${id}`);
  };
  
  // Handle contact delete
  const handleDeleteContact = (contact) => {
    setContactToDelete(contact);
    setShowDeleteDialog(true);
  };
  
  // Confirm delete
  const confirmDeleteContact = () => {
    if (contactToDelete) {
      deleteContactMutation.mutate(contactToDelete.id);
    }
  };
  
  // Handle search
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };
  
  // Filter contacts based on search and filter options
  const filteredContacts = contacts
    .filter(contact => {
      // Filter by type
      if (contact.customerType === 'company' && !filterOptions.showCompanies) {
        return false;
      }
      if (contact.customerType === 'individual' && !filterOptions.showIndividuals) {
        return false;
      }
      
      // Filter by search term
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const nameMatch = `${contact.firstName} ${contact.lastName}`.toLowerCase().includes(searchLower);
        const companyMatch = contact.company ? contact.company.toLowerCase().includes(searchLower) : false;
        const emailMatch = contact.email ? contact.email.toLowerCase().includes(searchLower) : false;
        const phoneMatch = contact.phone ? contact.phone.toLowerCase().includes(searchLower) : false;
        
        return nameMatch || companyMatch || emailMatch || phoneMatch;
      }
      
      return true;
    });
  
  // Action buttons for header
  const actionButtons = (
    <Button
      variant="primary"
      onClick={() => setShowCreateDialog(true)}
    >
      <span className="flex items-center">
        <svg 
          className="w-5 h-5 mr-2" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M12 6v6m0 0v6m0-6h6m-6 0H6" 
          />
        </svg>
        New Contact
      </span>
    </Button>
  );
  
  // Show loading state
  if (isLoading) {
    return (
      <PageLayout 
        title="Contacts"
        actions={actionButtons}
      >
        <Loading message="Loading contacts..." />
      </PageLayout>
    );
  }
  
  // Show error state
  if (isError) {
    return (
      <PageLayout 
        title="Contacts"
        actions={actionButtons}
      >
        <div className="bg-red-50 p-4 rounded-md">
          <h3 className="text-red-800 font-medium">Error loading contacts</h3>
          <p className="text-red-700">{error?.message || 'Unknown error'}</p>
          <Button
            variant="primary"
            className="mt-4"
            onClick={() => queryClient.invalidateQueries('contacts')}
          >
            Retry
          </Button>
        </div>
      </PageLayout>
    );
  }
  
  return (
    <PageLayout 
      title="Contacts"
      actions={actionButtons}
    >
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="w-full md:w-96">
          <FormField
            type="text"
            name="search"
            placeholder="Search contacts..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="mb-0"
          />
        </div>
        
        <div className="flex items-center space-x-4">
          <label className="inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              checked={filterOptions.showCompanies}
              onChange={(e) => setFilterOptions({
                ...filterOptions,
                showCompanies: e.target.checked
              })}
            />
            <span className="ml-2 text-sm">Companies</span>
          </label>
          
          <label className="inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              checked={filterOptions.showIndividuals}
              onChange={(e) => setFilterOptions({
                ...filterOptions,
                showIndividuals: e.target.checked
              })}
            />
            <span className="ml-2 text-sm">Individuals</span>
          </label>
        </div>
      </div>
      
      <ContactList
        contacts={filteredContacts}
        onEdit={handleEditContact}
        onView={handleViewContact}
        onDelete={handleDeleteContact}
      />
      
      {/* Create Contact Dialog */}
      {showCreateDialog && (
        <Dialog
          title="Add New Contact"
          onClose={() => setShowCreateDialog(false)}
          size="lg"
        >
          <ContactForm
            onSuccess={() => {
              setShowCreateDialog(false);
              addNotification('Contact created successfully', 'success');
              queryClient.invalidateQueries('contacts');
            }}
            onCancel={() => setShowCreateDialog(false)}
          />
        </Dialog>
      )}
      
      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && contactToDelete && (
        <Dialog
          title="Confirm Deletion"
          onClose={() => {
            setShowDeleteDialog(false);
            setContactToDelete(null);
          }}
        >
          <div className="space-y-4">
            <p>
              Are you sure you want to delete this contact?
              <strong className="block mt-2">
                {contactToDelete.customerType === 'company' 
                  ? contactToDelete.company 
                  : `${contactToDelete.firstName} ${contactToDelete.lastName}`}
              </strong>
            </p>
            
            <div className="bg-amber-50 border-l-4 border-amber-400 p-4 my-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-amber-800">GDPR Compliance</h3>
                  <div className="mt-2 text-sm text-amber-700">
                    <p>
                      Under GDPR regulations, you may need to maintain certain contact information for legitimate business purposes (such as completed project records, financial transactions, etc.) even after deletion.
                    </p>
                    <p className="mt-2">
                      This action will remove the contact from your active contacts list, but maintain necessary records for legal compliance.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowDeleteDialog(false);
                  setContactToDelete(null);
                }}
              >
                Cancel
              </Button>
              
              <Button
                variant="danger"
                onClick={confirmDeleteContact}
                isLoading={deleteContactMutation.isLoading}
              >
                Delete Contact
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </PageLayout>
  );
};

export default Contacts;