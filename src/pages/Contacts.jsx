import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';

// API and hooks
import { contactsApi } from '../services/api';
import { useAppContext } from '../context/AppContext';

// Components
import PageLayout from '../components/common/PageLayout';
import Button from '../components/common/Button';
import Loading from '../components/common/Loading';
import Dialog from '../components/common/Dialog';
import FormField from '../components/common/FormField';
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
  const filteredContacts = React.useMemo(() => {
    if (!contacts) return [];
    
    return contacts.filter(contact => {
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
  }, [contacts, searchTerm, filterOptions]);
  
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
      {/* Page Header - Styled like Dashboard */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Contact Management</h1>
        <p className="text-gray-600">Manage your clients and business relationships</p>
      </div>

      {/* Quick Actions - Same styling as Dashboard */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="quick-actions">
          <div onClick={() => setShowCreateDialog(true)} className="quick-action-btn">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span>New Contact</span>
          </div>
          
          <div onClick={() => navigate('/invoices/new')} className="quick-action-btn">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <span>Create Invoice</span>
          </div>
          
          <div onClick={() => navigate('/quotes/new')} className="quick-action-btn">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Create Quote</span>
          </div>
        </div>
      </div>

      {/* Search and Filters - in a card like Dashboard */}
      <div className="card mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="w-full md:w-1/3">
            <input
              type="text"
              className="search-input w-full"
              placeholder="Search contacts by name, company, email..."
              value={searchTerm}
              onChange={handleSearchChange}
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
      </div>
      
      {/* Contacts list - in a card with header like Dashboard */}
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Contacts</h2>
          <div>
            <span className="text-sm text-gray-600">
              {filteredContacts.length} contacts found
            </span>
          </div>
        </div>

        {filteredContacts.length === 0 ? (
          <div className="empty-state">
            <svg className="empty-state-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
            </svg>
            <h3 className="empty-state-title">
              {searchTerm || !filterOptions.showCompanies || !filterOptions.showIndividuals ? 
                'No contacts match your search criteria' : 
                'You haven\'t added any contacts yet'}
            </h3>
            <p className="empty-state-description">
              {searchTerm || !filterOptions.showCompanies || !filterOptions.showIndividuals ? 
                'Try adjusting your search or filters to find what you\'re looking for.' : 
                'Get started by adding your first contact.'}
            </p>
            {!searchTerm && filterOptions.showCompanies && filterOptions.showIndividuals && (
              <Button variant="primary" onClick={() => setShowCreateDialog(true)}>
                Add Your First Contact
              </Button>
            )}
          </div>
        ) : (
          <div className="recent-items">
            {filteredContacts.map((contact) => (
              <div 
                key={contact.id} 
                className="recent-item"
                onClick={() => handleViewContact(contact.id)}
              >
                <div className="flex justify-between items-center">
                  <div>
                    {contact.customerType === 'company' ? (
                      <>
                        <p className="font-medium text-gray-900">{contact.company}</p>
                        <p className="text-sm text-gray-500">
                          {contact.firstName} {contact.lastName}
                          {(contact.firstName || contact.lastName) && contact.email && ' • '}
                          {contact.email}
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="font-medium text-gray-900">
                          {contact.firstName} {contact.lastName}
                        </p>
                        <p className="text-sm text-gray-500">
                          {contact.company}
                          {contact.company && contact.email && ' • '}
                          {contact.email}
                        </p>
                      </>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-medium">
                      {contact.phone || 'No phone'}
                    </p>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className={`status-badge ${contact.customerType === 'company' ? 'status-badge-info' : 'status-badge-success'}`}>
                        {contact.customerType === 'company' ? 'Company' : 'Individual'}
                      </span>
                      <div className="flex space-x-1">
                        <button
                          className="text-blue-600 hover:text-blue-800"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditContact(contact.id);
                          }}
                        >
                          Edit
                        </button>
                        <button
                          className="text-red-600 hover:text-red-800"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteContact(contact);
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
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