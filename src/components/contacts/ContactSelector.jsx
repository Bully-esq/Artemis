import React from 'react';
import { useQuery } from 'react-query';
import api from '../../services/api';
import Loading from '../common/Loading';
import Button from '../common/Button';

const ContactSelector = ({ searchTerm = '', onContactSelect }) => {
  // Fetch contacts
  const { data: contacts = [], isLoading, isError, error } = useQuery(
    'contacts',
    api.contacts.getAll,
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );

  // Filter contacts based on search term
  const filteredContacts = searchTerm
    ? contacts.filter(contact => {
        const searchLower = searchTerm.toLowerCase();
        return (
          (contact.firstName && contact.firstName.toLowerCase().includes(searchLower)) ||
          (contact.lastName && contact.lastName.toLowerCase().includes(searchLower)) ||
          (contact.company && contact.company.toLowerCase().includes(searchLower)) ||
          (contact.email && contact.email.toLowerCase().includes(searchLower)) ||
          (contact.phone && contact.phone.toLowerCase().includes(searchLower))
        );
      })
    : contacts;

  // Sort contacts by name (lastName, firstName) or company
  const sortedContacts = [...filteredContacts].sort((a, b) => {
    if (a.customerType === 'company' && b.customerType !== 'company') return -1;
    if (a.customerType !== 'company' && b.customerType === 'company') return 1;
    
    if (a.customerType === 'company') {
      return a.company.localeCompare(b.company);
    } else {
      // Compare by lastName, then firstName
      const lastNameCompare = (a.lastName || '').localeCompare(b.lastName || '');
      if (lastNameCompare !== 0) return lastNameCompare;
      return (a.firstName || '').localeCompare(b.firstName || '');
    }
  });

  // Display name helper function
  const getDisplayName = (contact) => {
    if (contact.customerType === 'company') {
      return contact.company || 'Unnamed Company';
    } else {
      return `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || 'Unnamed Contact';
    }
  };

  // Loading state
  if (isLoading) return <Loading message="Loading contacts..." size="sm" />;

  // Error state
  if (isError) {
    return (
      <div className="error-message">
        <p>Error loading contacts: {error?.message || 'Unknown error'}</p>
      </div>
    );
  }

  return (
    <div className="contact-selector-list">
      {sortedContacts.length === 0 ? (
        <div className="empty-list-message">
          {searchTerm 
            ? `No contacts match "${searchTerm}"`
            : 'No contacts found'
          }
        </div>
      ) : (
        <div className="contacts-list">
          {sortedContacts.map(contact => (
            <div key={contact.id} className="contact-item">
              <div className="contact-info">
                <div className="contact-name">
                  <span className={`contact-badge ${contact.customerType === 'company' ? 'badge-indigo' : 'badge-blue'}`}>
                    {contact.customerType === 'company' ? 'Company' : 'Individual'}
                  </span>
                  <h3>{getDisplayName(contact)}</h3>
                </div>
                <div className="contact-details">
                  {contact.email && <p className="contact-email">{contact.email}</p>}
                  {contact.phone && <p className="contact-phone">{contact.phone}</p>}
                </div>
              </div>
              <Button 
                variant="primary" 
                size="sm" 
                onClick={() => onContactSelect(contact)}
                className="select-contact-btn"
              >
                Select
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ContactSelector;