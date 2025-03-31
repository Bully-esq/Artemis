import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';

// API and Hooks
import { contactsApi } from '../../services/api';
import { useAppContext } from '../../context/AppContext';

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
      onClick={() => {
        setSelectedContact(null);
        setShowAddContactDialog(true);
      }}
    >
      <svg className="icon-small" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
      </svg>
      Add Contact
    </Button>
  );
  
  // Loading state
  if (isLoading) {
    return (
      <PageLayout title="Contacts">
        <ActionButtonContainer>
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
        <ActionButtonContainer>
          {pageActions}
        </ActionButtonContainer>
        <div className="error-message">
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
    <PageLayout title="Contacts">
      <ActionButtonContainer>
        {pageActions}
      </ActionButtonContainer>

      {/* Page Header - Styled like Dashboard */}
      <div className="page-header">
        <h1 className="page-title">Contact Management</h1>
        <p className="page-description">Manage your clients and business relationships</p>
      </div>

      {/* Quick Actions - Same styling as Dashboard */}
      <div className="quick-actions-section">
        <h2 className="section-title">Quick Actions</h2>
        <div className="quick-actions">
          <div onClick={() => setShowAddContactDialog(true)} className="quick-action-btn">
            <svg className="icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span>New Contact</span>
          </div>
          
          <div onClick={handleCreateInvoice} className="quick-action-btn">
            <svg className="icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <span>Create Invoice</span>
          </div>
          
          <div onClick={handleCreateQuote} className="quick-action-btn">
            <svg className="icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Create Quote</span>
          </div>
        </div>
      </div>

      {/* Search and Filters - in a card like Dashboard */}
      <div className="card mb-6">
        <div className="filter-container">
          <div className="search-container">
            <input
              type="text"
              className="search-input"
              placeholder="Search contacts by name, company, email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="checkbox-filters">
            <label className="checkbox-label">
              <input
                type="checkbox"
                className="checkbox-input"
                checked={filterCompanies}
                onChange={() => setFilterCompanies(!filterCompanies)}
              />
              <span className="checkbox-text">Companies</span>
            </label>
            
            <label className="checkbox-label">
              <input
                type="checkbox"
                className="checkbox-input"
                checked={filterIndividuals}
                onChange={() => setFilterIndividuals(!filterIndividuals)}
              />
              <span className="checkbox-text">Individuals</span>
            </label>
          </div>
        </div>
      </div>
      
      {/* Full-width Contact List */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">All Contacts</h2>
          <div>
            <span className="item-count">
              {sortedContacts.length} contacts
            </span>
          </div>
        </div>
        
        {/* Contact List styled like Dashboard's recent-items */}
        {sortedContacts.length === 0 ? (
          <div className="empty-state">
            <svg className="empty-state-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
            </svg>
            <h3 className="empty-state-title">
              {searchTerm || !filterCompanies || !filterIndividuals ? 
                'No contacts match your search criteria' : 
                'You haven\'t added any contacts yet'}
            </h3>
            <p className="empty-state-description">
              {searchTerm || !filterCompanies || !filterIndividuals ? 
                'Try adjusting your search or filters to find what you\'re looking for.' : 
                'Get started by adding your first contact.'}
            </p>
            {!searchTerm && filterCompanies && filterIndividuals && (
              <Button variant="primary" onClick={() => setShowAddContactDialog(true)}>
                Add Your First Contact
              </Button>
            )}
          </div>
        ) : (
          <div className="recent-items">
            {sortedContacts.map((contact) => (
              <div
                key={contact.id}
                className="recent-item"
                onClick={() => handleContactClick(contact)}
              >
                <div className="item-content">
                  <div>
                    <p className="item-title">
                      {getContactDisplayName(contact)}
                    </p>
                    <p className="item-subtitle">
                      {contact.customerType === 'individual' && contact.company ? contact.company : ''}
                      {contact.customerType === 'individual' && contact.company && contact.email && ' • '}
                      {contact.email || ''}
                    </p>
                  </div>
                  <div className="item-actions">
                    <p className="item-detail">
                      {contact.phone || ''}
                    </p>
                    <div className="item-badges">
                      <span className={`status-badge ${
                        contact.customerType === 'company' 
                          ? 'status-badge-info' 
                          : 'status-badge-success'
                      }`}>
                        {contact.customerType === 'company' ? 'Company' : 'Individual'}
                      </span>
                      <ActionButtonContainer>
                        <button
                          className="btn btn-list-item btn-list-item--secondary"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditContact(contact);
                          }}
                        >
                          Edit
                        </button>
                        <button
                          className="btn btn-list-item btn-list-item--danger"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteContact(contact);
                          }}
                        >
                          Delete
                        </button>
                      </ActionButtonContainer>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
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