import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';

// API and Hooks
import { contactsApi } from '../../services/api';
import { useAppContext } from '../../context/AppContext';

// Styles
// import '../../styles/components/lists.css'; // Removed - Using Tailwind
// import '../../styles/mobile.css'; // Removed - Assume mobile handled by Tailwind responsive prefixes

// Components
import PageLayout from '../common/PageLayout';
import Button from '../common/Button';
import Dialog from '../common/Dialog';
import FormField from '../common/FormField';
import Loading from '../common/Loading';
import ContactForm from '../contacts/ContactForm';
import ActionButtonContainer from '../common/ActionButtonContainer';

const ContactList = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { addNotification } = useAppContext();
  
  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [showContactFormDialog, setShowContactFormDialog] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);
  const [alphabetFilter, setAlphabetFilter] = useState('All');
  
  // Fetch contacts
  const { 
    data: contacts, 
    isLoading, 
    isError, 
    error 
  } = useQuery('contacts', contactsApi.getAll, {
    refetchOnMount: true,
    staleTime: 5 * 60 * 1000,
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
  }, [contacts, searchTerm]);
  
  // Helper to format contact display name
  const getContactDisplayName = (contact) => {
    if (!contact) return '';
    if (contact.customerType === 'company' && contact.company) {
      return contact.company;
    } else if (contact.firstName || contact.lastName) {
      return `${contact.firstName || ''} ${contact.lastName || ''}`.trim();
    } else {
      return contact.email || contact.phone || 'Unnamed Contact';
    }
  };
  
  // Sort contacts alphabetically by display name
  const sortedContacts = React.useMemo(() => {
    if (!contacts) return [];
    
    // Filter first based on search and alphabet
    let filtered = contacts.filter(contact => {
      const term = searchTerm.toLowerCase();
      const displayName = getContactDisplayName(contact).toLowerCase();
      const email = (contact.email || '').toLowerCase();
      const phone = (contact.phone || '').toLowerCase();
      const companyName = (contact.company || '').toLowerCase();
      
      const searchMatch = !searchTerm || 
                          displayName.includes(term) || 
                          email.includes(term) || 
                          phone.includes(term) ||
                          companyName.includes(term);
                          
      const alphabetMatch = alphabetFilter === 'All' || 
                            getContactDisplayName(contact).toUpperCase().startsWith(alphabetFilter);
                            
      return searchMatch && alphabetMatch;
    });

    // Finally, sort alphabetically
    return [...filtered].sort((a, b) => {
      return getContactDisplayName(a).localeCompare(getContactDisplayName(b));
    });
  }, [contacts, searchTerm, alphabetFilter]);
  
  // Handle contact click
  const handleContactClick = (contactId) => {
    navigate(`/contacts/${contactId}`);
  };
  
  // Handle contact delete
  const handleDeleteContact = (contact) => {
    const displayName = getContactDisplayName(contact);
    const confirmDelete = window.confirm(
      `Are you sure you want to delete ${displayName}? This action cannot be undone.`
    );
    
    if (confirmDelete) {
      deleteMutation.mutate(contact.id);
    }
  };
  
  // Handle contact edit
  const handleEditContact = (contact) => {
    setSelectedContact(contact);
    setShowContactFormDialog(true);
  };
  
  // Handle dialog close
  const handleDialogClose = () => {
    setShowContactFormDialog(false);
    setSelectedContact(null);
  };
  
  // Handle navigating to create invoice or quote
  const handleCreateInvoice = () => {
    navigate('/invoices/new');
  };
  
  const handleCreateQuote = () => {
    navigate('/quotes/new');
  };
  
  // Actions for page header
  const pageActions = (
    <Button 
      variant="primary" 
      size="sm"
      onClick={() => {
        setSelectedContact(null);
        setShowContactFormDialog(true);
      }}
      icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 -ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>}
    >
      Add Contact
    </Button>
  );
  
  // Generate alphabet array
  const alphabet = ['All', ...Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i))];
  
  // Loading state
  if (isLoading) {
    return (
      <PageLayout title="Contacts">
        <ActionButtonContainer className="sticky top-[64px] z-10 bg-gray-50/95 backdrop-blur-sm px-4 py-3 border-b border-gray-200 -mx-4 md:-mx-6 lg:-mx-8 mb-6">
          {pageActions}
        </ActionButtonContainer>
        <Loading message="Loading contacts..." />
      </PageLayout>
    );
  }
  
  // Error state
  if (isError) {
    return (
      <PageLayout title="Contacts">
        <ActionButtonContainer className="sticky top-[64px] z-10 bg-gray-50/95 backdrop-blur-sm px-4 py-3 border-b border-gray-200 -mx-4 md:-mx-6 lg:-mx-8 mb-6">
          {pageActions}
        </ActionButtonContainer>
        <div className="mt-6 p-6 bg-red-50 border border-red-200 rounded-md text-center">
          <p className="text-red-700 font-medium mb-4">Error loading contacts: {error.message}</p>
          <Button 
            variant="primary" 
            onClick={() => queryClient.invalidateQueries('contacts')}
          >
            Retry
          </Button>
        </div>
      </PageLayout>
    );
  }
  
  return (
    <PageLayout title="Contacts" subtitle="Manage your clients and business relationships">
      <ActionButtonContainer className="sticky top-[64px] z-10 bg-gray-50/95 backdrop-blur-sm px-4 py-3 border-b border-gray-200 -mx-4 md:-mx-6 lg:-mx-8 mb-6">
        {pageActions}
      </ActionButtonContainer>

      <div className="mb-6 bg-card-background border border-card-border p-4 shadow rounded-lg">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex-grow sm:max-w-md">
            <FormField
               id="search-contacts"
               placeholder="Search name, company, email, phone..."
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               label="Search Contacts"
               labelSrOnly
            />
          </div>
          
          <div className="flex items-center gap-1 flex-wrap justify-center sm:justify-end">
             {alphabet.map(letter => (
               <Button
                 key={letter}
                 variant={alphabetFilter === letter ? 'solid' : 'outline'}
                 colorScheme={alphabetFilter === letter ? 'indigo' : 'gray'}
                 onClick={() => setAlphabetFilter(letter)}
                 className="w-6 h-6 text-xs p-0"
               >
                 {letter}
               </Button>
             ))}
           </div>
        </div>
      </div>

      <div className="bg-card-background shadow rounded-lg border border-card-border overflow-hidden">
        <div className="px-4 py-3 sm:px-6 border-b border-card-border flex justify-between items-center">
          <h2 className="text-lg font-medium text-text-primary">Contacts</h2>
          <span className="text-sm text-text-secondary">
            {sortedContacts.length} contact{sortedContacts.length !== 1 ? 's' : ''} found
          </span>
        </div>
        
        {sortedContacts.length === 0 ? (
          <div className="text-center p-12 text-text-secondary">
            <svg className="mx-auto h-12 w-12 text-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-text-primary">
              {searchTerm || alphabetFilter !== 'All' ? 
                'No contacts match your search criteria' : 
                'No contacts found'}
            </h3>
            <p className="mt-1 text-sm text-text-secondary">
              {searchTerm || alphabetFilter !== 'All' ? 
                'Try adjusting your search or filter.' : 
                'Get started by adding a new contact.'}
            </p>
            {!searchTerm && alphabetFilter === 'All' && (
              <div className="mt-6">
                  <Button variant="primary" onClick={() => setShowContactFormDialog(true)}>
                    <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                    Add New Contact
                  </Button>
              </div>
            )}
          </div>
        ) : (
          <ul role="list" className="divide-y divide-card-border">
            {sortedContacts.map((contact) => (
              <li 
                key={contact.id} 
                className="px-4 py-4 sm:px-6 hover:bg-background-tertiary cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <div 
                    className="flex-1 min-w-0 mr-4" 
                    onClick={() => handleContactClick(contact.id)}
                  >
                    <p className="text-sm font-medium text-primary-600 truncate">
                      {getContactDisplayName(contact)}
                    </p>
                    <p className="text-sm text-text-secondary truncate">
                      {contact.customerType !== 'company' && contact.company ? contact.company : contact.email || contact.phone}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                    <Button
                      variant="secondary"
                      size="xs"
                      onClick={(e) => {
                          e.stopPropagation();
                          handleEditContact(contact);
                      }}
                      aria-label={`Edit ${getContactDisplayName(contact)}`}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="danger"
                      size="xs"
                      onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteContact(contact);
                      }}
                      aria-label={`Delete ${getContactDisplayName(contact)}`}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Dialog
        isOpen={showContactFormDialog}
        onClose={handleDialogClose}
        title={selectedContact ? 'Edit Contact' : 'Add New Contact'}
        size="lg"
      >
        <ContactForm 
          initialData={selectedContact}
          onSuccess={handleDialogClose}
          onCancel={handleDialogClose}
        />
      </Dialog>
    </PageLayout>
  );
};

export default ContactList;