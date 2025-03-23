import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';

// API and Hooks
import { contactsApi } from '../services/api';
import { useAppContext } from '../context/AppContext';

// Components
import PageLayout from '../components/common/PageLayout';
import Button from '../components/common/Button';
import Dialog from '../components/common/Dialog';
import FormField from '../components/common/FormField';
import Loading from '../components/common/Loading';
import ContactForm from '../components/contacts/ContactForm';

const ContactList = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { addNotification } = useAppContext();
  
  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCompanies, setFilterCompanies] = useState(true);
  const [filterIndividuals, setFilterIndividuals] = useState(true);
  const [showAddContactDialog, setShowAddContactDialog] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);
  
  // Fetch contacts
  const { 
    data: contacts, 
    isLoading, 
    isError, 
    error 
  } = useQuery('contacts', contactsApi.getAll, {
    onError: (err) => {
      addNotification(`Error loading contacts: ${err.message}`, 'error');
    }
  });
  
  // Delete mutation
  const deleteMutation = useMutation(
    (id) => contactsApi.delete(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('contacts');
        addNotification('Contact deleted successfully', 'success');
      },
      onError: (err) => {
        addNotification(`Error deleting contact: ${err.message}`, 'error');
      }
    }
  );
  
  // Filter contacts based on search and type filters
  const filteredContacts = React.useMemo(() => {
    if (!contacts) return [];
    
    return contacts.filter(contact => {
      // Apply type filter
      if (contact.customerType === 'company' && !filterCompanies) return false;
      if (contact.customerType === 'individual' && !filterIndividuals) return false;
      
      // Apply search filter
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const fullName = `${contact.firstName || ''} ${contact.lastName || ''}`.toLowerCase();
        const companyName = (contact.company || '').toLowerCase();
        const email = (contact.email || '').toLowerCase();
        const phone = (contact.phone || '').toLowerCase();
        
        return (
          fullName.includes(term) ||
          companyName.includes(term) ||
          email.includes(term) ||
          phone.includes(term)
        );
      }
      
      return true;
    });
  }, [contacts, searchTerm, filterCompanies, filterIndividuals]);
  
  // Handle contact click
  const handleContactClick = (contact) => {
    navigate(`/contacts/${contact.id}`);
  };
  
  // Handle contact delete
  const handleDeleteContact = (contact) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete ${
        contact.customerType === 'company'
          ? contact.company
          : `${contact.firstName} ${contact.lastName}`
      }? This action cannot be undone.`
    );
    
    if (confirmDelete) {
      deleteMutation.mutate(contact.id);
    }
  };
  
  // Handle contact edit
  const handleEditContact = (contact) => {
    setSelectedContact(contact);
    setShowAddContactDialog(true);
  };
  
  // Helper to format contact display name
  const getContactDisplayName = (contact) => {
    if (contact.customerType === 'company') {
      return contact.company || 'Unnamed Company';
    } else {
      return `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || 'Unnamed Contact';
    }
  };
  
  // Sort contacts: companies first, then individuals by last name
  const sortedContacts = React.useMemo(() => {
    return [...filteredContacts].sort((a, b) => {
      if (a.customerType === 'company' && b.customerType !== 'company') {
        return -1;
      } else if (a.customerType !== 'company' && b.customerType === 'company') {
        return 1;
      } else if (a.customerType === 'company' && b.customerType === 'company') {
        return (a.company || '').localeCompare(b.company || '');
      } else {
        return `${a.lastName || ''}, ${a.firstName || ''}`.localeCompare(
          `${b.lastName || ''}, ${b.firstName || ''}`
        );
      }
    });
  }, [filteredContacts]);
  
  // Handle dialog close
  const handleDialogClose = () => {
    setShowAddContactDialog(false);
    setSelectedContact(null);
  };
  
  // Actions for page header
  const pageActions = (
    <Button 
      variant="primary" 
      onClick={() => {
        setSelectedContact(null);
        setShowAddContactDialog(true);
      }}
    >
      Add Contact
    </Button>
  );
  
  // Loading state
  if (isLoading) {
    return <Loading fullScreen message="Loading contacts..." />;
  }
  
  // Error state
  if (isError) {
    return (
      <PageLayout title="Contacts">
        <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p>Error loading contacts: {error.message}</p>
          <Button 
            className="mt-3" 
            variant="secondary" 
            onClick={() => queryClient.invalidateQueries('contacts')}
          >
            Retry
          </Button>
        </div>
      </PageLayout>
    );
  }
  
  return (
    <PageLayout title="Contact Management" actions={pageActions}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Contact List Panel */}
        <div className="md:col-span-1">
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4">All Contacts</h2>
            
            {/* Search Box */}
            <div className="mb-4">
              <input
                type="text"
                placeholder="Search contacts..."
                className="w-full p-2 border border-gray-300 rounded-md"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            {/* Filter Controls */}
            <div className="mb-4 flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="form-checkbox h-4 w-4 text-blue-600"
                  checked={filterCompanies}
                  onChange={() => setFilterCompanies(!filterCompanies)}
                />
                <span className="ml-2 text-sm">Companies</span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="form-checkbox h-4 w-4 text-blue-600"
                  checked={filterIndividuals}
                  onChange={() => setFilterIndividuals(!filterIndividuals)}
                />
                <span className="ml-2 text-sm">Individuals</span>
              </label>
            </div>
            
            {/* Contact List */}
            <div className="border border-gray-200 rounded-md overflow-hidden">
              {sortedContacts.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  {searchTerm || !filterCompanies || !filterIndividuals
                    ? 'No contacts match your filters'
                    : 'No contacts found. Add your first contact.'}
                </div>
              ) : (
                <div className="max-h-[600px] overflow-y-auto">
                  {sortedContacts.map((contact) => (
                    <div
                      key={contact.id}
                      className="border-b border-gray-200 last:border-b-0 hover:bg-gray-50 transition-colors"
                    >
                      <div 
                        className="p-4 cursor-pointer"
                        onClick={() => handleContactClick(contact)}
                      >
                        <div className="flex justify-between mb-1">
                          <div className="font-medium">{getContactDisplayName(contact)}</div>
                          <div className="flex space-x-2">
                            <button
                              className="text-gray-500 hover:text-blue-600"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditContact(contact);
                              }}
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                            </button>
                            <button
                              className="text-gray-500 hover:text-red-600"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteContact(contact);
                              }}
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>
                        
                        <div className="text-sm text-gray-500">
                          {contact.customerType === 'individual' && contact.company && (
                            <div>{contact.company}</div>
                          )}
                          {contact.email && <div>{contact.email}</div>}
                          {contact.phone && <div>{contact.phone}</div>}
                        </div>
                        
                        <div className="mt-2 flex items-center space-x-2">
                          <span className={`
                            inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                            ${contact.customerType === 'company' 
                              ? 'bg-indigo-100 text-indigo-800' 
                              : 'bg-blue-100 text-blue-800'}
                          `}>
                            {contact.customerType === 'company' ? 'Company' : 'Individual'}
                          </span>
                          
                          <span className={`
                            inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                            ${contact.gdprConsent 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'}
                          `}>
                            {contact.gdprConsent ? 'GDPR ✓' : 'No Consent'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Details Panel */}
        <div className="md:col-span-2">
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4">Contact Details</h2>
            
            <div className="text-center text-gray-500 py-8">
              Select a contact to view details or add a new contact.
            </div>
          </div>
          
          {/* Functionality Links */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-6 rounded-lg shadow text-center hover:shadow-md transition-shadow">
              <svg className="h-8 w-8 mx-auto text-blue-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="text-gray-900 font-medium">Create Quote</h3>
              <p className="text-gray-500 text-sm mt-1">Generate a new quote for a selected contact</p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow text-center hover:shadow-md transition-shadow">
              <svg className="h-8 w-8 mx-auto text-blue-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <h3 className="text-gray-900 font-medium">Create Invoice</h3>
              <p className="text-gray-500 text-sm mt-1">Generate a new invoice for a selected contact</p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow text-center hover:shadow-md transition-shadow">
              <svg className="h-8 w-8 mx-auto text-blue-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
              <h3 className="text-gray-900 font-medium">Export Data</h3>
              <p className="text-gray-500 text-sm mt-1">Export contact data for portability</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Add/Edit Contact Dialog */}
      {showAddContactDialog && (
        <Dialog
          title={selectedContact ? "Edit Contact" : "Add New Contact"}
          isOpen={showAddContactDialog}
          onClose={handleDialogClose}
          size="lg"
        >
          <ContactForm
            contact={selectedContact}
            onCancel={handleDialogClose}
            onSuccess={() => {
              handleDialogClose();
              queryClient.invalidateQueries('contacts');
            }}
          />
        </Dialog>
      )}
    </PageLayout>
  );
};

export default ContactList;