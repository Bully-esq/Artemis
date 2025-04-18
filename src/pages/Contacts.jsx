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
import ActionButtonContainer from '../components/common/ActionButtonContainer';

// CSS Import (can be removed later if not needed by other parts)
// import '../styles/components/lists.css'; // Aiming to remove

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
      >
        <ActionButtonContainer>
          {actionButtons}
        </ActionButtonContainer>
        <Loading message="Loading contacts..." />
      </PageLayout>
    );
  }
  
  // Show error state
  if (isError) {
    return (
      <PageLayout 
        title="Contacts"
      >
        <ActionButtonContainer>
          {actionButtons}
        </ActionButtonContainer>
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
    >
      {/* Add ActionButtonContainer below the header */}
      <ActionButtonContainer>
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
      </ActionButtonContainer>

      {/* Page Header - Styled like Dashboard */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2 text-text-primary">Contact Management</h1>
        <p className="text-sm text-text-secondary">Manage your clients and business relationships</p>
      </div>

      {/* Search and Filters - Converted to Tailwind card and inputs */}
      <div className="bg-card-background border border-card-border rounded-lg shadow-sm p-4 md:p-6 mb-6 transition-colors duration-300 ease-linear">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="w-full md:w-1/2 lg:w-1/3">
            <input
              type="text"
              className="w-full px-3 py-2 border border-input-border rounded-md bg-input-background text-sm text-input-text placeholder:text-text-muted focus:outline-none focus:border-primary-accent focus:ring-2 focus:ring-primary-accent/20 shadow-sm"
              placeholder="Search contacts by name, company, email..."
              value={searchTerm}
              onChange={handleSearchChange}
            />
          </div>
          
          <div className="flex items-center space-x-4 md:flex-shrink-0">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-input-border text-primary bg-input-background focus:ring-primary focus:ring-offset-0 focus:ring-2 transition duration-150 ease-in-out shadow-sm"
                checked={filterOptions.showCompanies}
                onChange={(e) => setFilterOptions({
                  ...filterOptions,
                  showCompanies: e.target.checked
                })}
              />
              <span className="ml-2 text-sm text-text-secondary">Companies</span>
            </label>
            
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-input-border text-primary bg-input-background focus:ring-primary focus:ring-offset-0 focus:ring-2 transition duration-150 ease-in-out shadow-sm"
                checked={filterOptions.showIndividuals}
                onChange={(e) => setFilterOptions({
                  ...filterOptions,
                  showIndividuals: e.target.checked
                })}
              />
              <span className="ml-2 text-sm text-text-secondary">Individuals</span>
            </label>
          </div>
        </div>
      </div>
      
      {/* Contacts List - Converted to Tailwind card and list */}
      {filteredContacts.length === 0 ? (
        <div className="bg-card-background border border-card-border rounded-lg shadow-sm text-center py-12 px-6">
          <svg className="mx-auto h-12 w-12 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-text-primary">
            {searchTerm || !filterOptions.showCompanies || !filterOptions.showIndividuals
              ? 'No contacts match your search/filter'
              : 'No contacts found'}
          </h3>
          <p className="mt-1 text-sm text-text-secondary">
            {searchTerm || !filterOptions.showCompanies || !filterOptions.showIndividuals
              ? 'Try adjusting your search or filters.'
              : 'Get started by creating a new contact.'}
          </p>
          {!searchTerm && filterOptions.showCompanies && filterOptions.showIndividuals && (
            <div className="mt-6">
              <Button
                variant="primary"
                onClick={() => setShowCreateDialog(true)}
              >
                <span className="flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  New Contact
                </span>
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-card-background border border-card-border rounded-lg shadow-sm overflow-hidden transition-colors duration-300 ease-linear">
          <div className="hidden sm:flex justify-between items-center px-4 py-3 sm:px-6 border-b border-border-color bg-background-secondary">
            <h2 className="text-sm font-semibold text-text-primary tracking-wide uppercase">Contact</h2>
            <h2 className="text-sm font-semibold text-text-primary tracking-wide uppercase text-right">Actions</h2>
          </div>
          <ul className="divide-y divide-border-color">
            {filteredContacts.map(contact => {
              const isCompany = contact.customerType === 'company';
              const contactName = isCompany ? contact.company : `${contact.firstName || ''} ${contact.lastName || ''}`.trim();
              const contactDetail = isCompany 
                ? `${contact.firstName || ''} ${contact.lastName || ''}`.trim() 
                : contact.email || contact.phone;
              const avatarText = isCompany 
                ? contact.company?.charAt(0).toUpperCase() 
                : `${contact.firstName?.charAt(0)}${contact.lastName?.charAt(0)}`.toUpperCase();
              
              return (
                <li 
                  key={contact.id} 
                  className="px-4 py-3 sm:px-6 transition-colors duration-200 hover:bg-background-tertiary cursor-pointer flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3"
                  onClick={() => handleViewContact(contact.id)}
                >
                  <div className="flex items-center gap-3 flex-grow min-w-0">
                    <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary-accent-light flex items-center justify-center">
                      <span className="text-sm font-medium text-primary-accent-dark">{avatarText || '?'}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-text-primary truncate">
                        {contactName || 'Unnamed Contact'}
                      </p>
                      {contactDetail && (
                        <p className="text-xs text-text-secondary truncate mt-1">
                          {contactDetail}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0 w-full sm:w-auto mt-2 sm:mt-0 justify-end">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      isCompany 
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-700 dark:text-blue-100'
                        : 'bg-green-100 text-green-800 dark:bg-green-700 dark:text-green-100'
                    }`}>
                      {isCompany ? 'Company' : 'Individual'}
                    </span>
                    
                    <div className="flex items-center space-x-2">
                      <Button 
                        variant="secondary"
                        size="xs"
                        onClick={(e) => { e.stopPropagation(); handleEditContact(contact.id); }}
                        tooltip="Edit Contact"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                      </Button>
                      <Button 
                        variant="danger"
                        size="xs"
                        onClick={(e) => { e.stopPropagation(); handleDeleteContact(contact); }}
                        tooltip="Delete Contact"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </Button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      
      {/* Create Contact Dialog */}
      {showCreateDialog && (
        <Dialog
          title="Create New Contact"
          isOpen={showCreateDialog}
          onClose={() => setShowCreateDialog(false)}
          size="xl"
        >
          <ContactForm
            onClose={() => setShowCreateDialog(false)}
            onSuccess={() => {
              setShowCreateDialog(false);
              queryClient.invalidateQueries('contacts');
              addNotification('Contact created successfully', 'success');
            }}
            onCancel={() => setShowCreateDialog(false)}
          />
        </Dialog>
      )}
      
      {/* Delete Confirmation Dialog */}
      <Dialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        title="Delete Contact"
        size="sm"
      >
        <p className="text-sm text-text-secondary mb-4">
          Are you sure you want to delete the contact 
          <strong className="font-medium text-text-primary">
            {contactToDelete?.customerType === 'company' 
              ? ` ${contactToDelete?.company}` 
              : ` ${contactToDelete?.firstName} ${contactToDelete?.lastName}`}
          </strong>?
          This action cannot be undone.
        </p>
        
        <div className="bg-warning-bg-light border-l-4 border-warning-border p-4 my-4 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-warning-icon" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-warning-text-dark">GDPR Compliance</h3>
              <div className="mt-2 text-sm text-warning-text">
                <p>
                  Under GDPR regulations, you may need to maintain certain contact information for legitimate business purposes (such as completed project records, financial transactions, etc.) even after deletion.
                </p>
                <p className="mt-2">
                  This action will remove the contact from your active contacts list, but necessary records may be maintained for legal compliance.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-2 mt-6">
          <Button variant="secondary" onClick={() => setShowDeleteDialog(false)}>
            Cancel
          </Button>
          <Button 
            variant="danger" 
            onClick={confirmDeleteContact}
            isLoading={deleteContactMutation.isLoading}
          >
            {deleteContactMutation.isLoading ? 'Deleting...' : 'Delete'}
          </Button>
        </div>
      </Dialog>
    </PageLayout>
  );
};

export default Contacts;